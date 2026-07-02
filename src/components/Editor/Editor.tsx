"use client";

import { useState, useEffect, type CSSProperties } from "react";
import CodeMirror, {
  EditorView,
  type ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import {
  foldGutter,
  LanguageSupport,
  LanguageDescription,
  type Language,
} from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { useTheme } from "@/hooks/useTheme";
import {
  vscodeDarkMarkdown,
  vscodeLightMarkdown,
  markdownMarkTags,
} from "./markdownTheme";

// Custom fold gutter with VS Code-style SVG markers (our own classes so CSS can target them)
const customFoldGutter = foldGutter({
  markerDOM: (open) => {
    const el = document.createElement("span");
    el.className = open ? "cm-fold-open" : "cm-fold-closed";
    return el;
  },
});

// Clicking the empty space below the last line gives a fresh line to type in:
// append a newline at the end of the document (unless the last line is already
// empty) and drop the caret there.
const appendLineOnClickBelow = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 0) return false;
    const bottom = view.coordsAtPos(view.state.doc.length)?.bottom;
    if (bottom == null || event.clientY <= bottom) return false; // clicked on text, not below it

    const end = view.state.doc.length;
    const lastLineEmpty = view.state.doc.lineAt(end).length === 0;
    view.dispatch(
      lastLineEmpty
        ? { selection: { anchor: end }, scrollIntoView: true }
        : {
            changes: { from: end, insert: "\n" },
            selection: { anchor: end + 1 },
            scrollIntoView: true,
          },
    );
    view.focus();
    event.preventDefault();
    return true;
  },
});

// Module-level cache so repeated language loads are instant
const extensionCache = new Map<string, Extension[]>();

async function loadExtension(language: string): Promise<Extension[]> {
  const cached = extensionCache.get(language);
  if (cached) return cached;

  let extensions: Extension[] = [];

  switch (language) {
    case "javascript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      extensions = [javascript()];
      break;
    }
    case "typescript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      extensions = [javascript({ typescript: true })];
      break;
    }
    case "tsx": {
      const { javascript } = await import("@codemirror/lang-javascript");
      extensions = [javascript({ jsx: true, typescript: true })];
      break;
    }
    case "jsx": {
      const { javascript } = await import("@codemirror/lang-javascript");
      extensions = [javascript({ jsx: true })];
      break;
    }
    case "svelte": {
      const { svelte } = await import("@replit/codemirror-lang-svelte");
      extensions = [svelte()];
      break;
    }
    case "vue": {
      const { vue } = await import("@codemirror/lang-vue");
      extensions = [vue()];
      break;
    }
    case "astro": {
      // No maintained CodeMirror 6 grammar for Astro; HTML covers the markup and
      // embedded <script>/<style>. The TS frontmatter (between ---) isn't parsed
      // as TypeScript, which is an accepted limitation.
      const { html } = await import("@codemirror/lang-html");
      extensions = [html()];
      break;
    }
    case "html": {
      const { html } = await import("@codemirror/lang-html");
      extensions = [html()];
      break;
    }
    case "css": {
      const { css } = await import("@codemirror/lang-css");
      extensions = [css()];
      break;
    }
    case "python": {
      const { python } = await import("@codemirror/lang-python");
      extensions = [python()];
      break;
    }
    case "json": {
      const { json } = await import("@codemirror/lang-json");
      extensions = [json()];
      break;
    }
    case "markdown": {
      const { markdown, markdownLanguage } = await import(
        "@codemirror/lang-markdown"
      );
      // GFM base (strikethrough, tables, task lists), our per-mark re-tagging,
      // and per-language highlighting inside fenced code blocks.
      extensions = [
        markdown({
          base: markdownLanguage,
          extensions: markdownMarkTags,
          codeLanguages: markdownCodeLanguages,
        }),
      ];
      break;
    }
    case "sql": {
      const { sql } = await import("@codemirror/lang-sql");
      extensions = [sql()];
      break;
    }
    case "java": {
      const { java } = await import("@codemirror/lang-java");
      extensions = [java()];
      break;
    }
    case "c":
    case "cpp": {
      const { cpp } = await import("@codemirror/lang-cpp");
      extensions = [cpp()];
      break;
    }
    case "php": {
      const { php } = await import("@codemirror/lang-php");
      extensions = [php()];
      break;
    }
    case "xml": {
      const { xml } = await import("@codemirror/lang-xml");
      extensions = [xml()];
      break;
    }
    case "bash": {
      const [{ StreamLanguage }, { shell }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/shell"),
      ]);
      extensions = [StreamLanguage.define(shell)];
      break;
    }
    case "yaml": {
      const [{ StreamLanguage }, { yaml }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/yaml"),
      ]);
      extensions = [StreamLanguage.define(yaml)];
      break;
    }
    case "go": {
      const [{ StreamLanguage }, { go }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/go"),
      ]);
      extensions = [StreamLanguage.define(go)];
      break;
    }
    case "rust": {
      const [{ StreamLanguage }, { rust }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/rust"),
      ]);
      extensions = [StreamLanguage.define(rust)];
      break;
    }
    case "csharp": {
      const [{ StreamLanguage }, { csharp }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/clike"),
      ]);
      extensions = [StreamLanguage.define(csharp)];
      break;
    }
    case "ruby": {
      const [{ StreamLanguage }, { ruby }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/ruby"),
      ]);
      extensions = [StreamLanguage.define(ruby)];
      break;
    }
    case "swift": {
      const [{ StreamLanguage }, { swift }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/swift"),
      ]);
      extensions = [StreamLanguage.define(swift)];
      break;
    }
    case "kotlin": {
      const [{ StreamLanguage }, { kotlin }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/clike"),
      ]);
      extensions = [StreamLanguage.define(kotlin)];
      break;
    }
    case "dart": {
      const [{ StreamLanguage }, { dart }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/clike"),
      ]);
      extensions = [StreamLanguage.define(dart)];
      break;
    }
    case "scala": {
      const [{ StreamLanguage }, { scala }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/clike"),
      ]);
      extensions = [StreamLanguage.define(scala)];
      break;
    }
    case "groovy": {
      const [{ StreamLanguage }, { groovy }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/groovy"),
      ]);
      extensions = [StreamLanguage.define(groovy)];
      break;
    }
    case "lua": {
      const [{ StreamLanguage }, { lua }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/lua"),
      ]);
      extensions = [StreamLanguage.define(lua)];
      break;
    }
    case "haskell": {
      const [{ StreamLanguage }, { haskell }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/haskell"),
      ]);
      extensions = [StreamLanguage.define(haskell)];
      break;
    }
    case "erlang": {
      const [{ StreamLanguage }, { erlang }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/erlang"),
      ]);
      extensions = [StreamLanguage.define(erlang)];
      break;
    }
    case "r": {
      const [{ StreamLanguage }, { r }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/r"),
      ]);
      extensions = [StreamLanguage.define(r)];
      break;
    }
    case "powershell": {
      const [{ StreamLanguage }, { powerShell }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/powershell"),
      ]);
      extensions = [StreamLanguage.define(powerShell)];
      break;
    }
    case "toml": {
      const [{ StreamLanguage }, { toml }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/toml"),
      ]);
      extensions = [StreamLanguage.define(toml)];
      break;
    }
    case "scss": {
      const [{ StreamLanguage }, { sass }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/sass"),
      ]);
      extensions = [StreamLanguage.define(sass)];
      break;
    }
    case "dockerfile": {
      const [{ StreamLanguage }, { dockerFile }] = await Promise.all([
        import("@codemirror/language"),
        import("@codemirror/legacy-modes/mode/dockerfile"),
      ]);
      extensions = [StreamLanguage.define(dockerFile)];
      break;
    }
    default:
      extensions = [];
  }

  extensionCache.set(language, extensions);
  return extensions;
}

// Languages offered for syntax highlighting inside Markdown fenced code blocks,
// mapped to the loaders above. `name`/`alias` are matched against the fence info
// string (```ts, ```py, ```sh …); only grammars we actually bundle are listed,
// so nothing references an uninstalled package. Markdown itself is omitted to
// avoid Markdown-in-Markdown recursion.
const FENCE_LANGUAGES: ReadonlyArray<{
  name: string;
  alias: readonly string[];
  key: string;
}> = [
  { name: "JavaScript", alias: ["js", "node", "cjs", "mjs"], key: "javascript" },
  { name: "TypeScript", alias: ["ts"], key: "typescript" },
  { name: "JSX", alias: [], key: "jsx" },
  { name: "TSX", alias: [], key: "tsx" },
  { name: "Svelte", alias: [], key: "svelte" },
  { name: "Vue", alias: [], key: "vue" },
  { name: "Astro", alias: [], key: "astro" },
  { name: "HTML", alias: ["htm"], key: "html" },
  { name: "CSS", alias: [], key: "css" },
  { name: "SCSS", alias: ["sass"], key: "scss" },
  { name: "Python", alias: ["py"], key: "python" },
  { name: "JSON", alias: ["jsonc"], key: "json" },
  { name: "SQL", alias: [], key: "sql" },
  { name: "Java", alias: [], key: "java" },
  { name: "C", alias: [], key: "c" },
  { name: "C++", alias: ["cpp"], key: "cpp" },
  { name: "C#", alias: ["csharp", "cs"], key: "csharp" },
  { name: "PHP", alias: [], key: "php" },
  { name: "XML", alias: [], key: "xml" },
  { name: "Bash", alias: ["sh", "shell", "zsh"], key: "bash" },
  { name: "YAML", alias: ["yml"], key: "yaml" },
  { name: "Go", alias: ["golang"], key: "go" },
  { name: "Rust", alias: ["rs"], key: "rust" },
  { name: "Ruby", alias: ["rb"], key: "ruby" },
  { name: "Swift", alias: [], key: "swift" },
  { name: "Kotlin", alias: ["kt"], key: "kotlin" },
  { name: "Dart", alias: [], key: "dart" },
  { name: "Scala", alias: [], key: "scala" },
  { name: "Groovy", alias: [], key: "groovy" },
  { name: "Lua", alias: [], key: "lua" },
  { name: "Haskell", alias: ["hs"], key: "haskell" },
  { name: "Erlang", alias: [], key: "erlang" },
  { name: "R", alias: [], key: "r" },
  { name: "PowerShell", alias: ["ps1", "pwsh"], key: "powershell" },
  { name: "TOML", alias: [], key: "toml" },
  { name: "Dockerfile", alias: ["docker"], key: "dockerfile" },
];

// loadExtension returns the language as either a LanguageSupport (lang-* packages)
// or a bare Language (StreamLanguage legacy modes); the nested code parser needs a
// LanguageSupport, so wrap the latter.
function toLanguageSupport(exts: Extension[]): LanguageSupport {
  const lang = exts[0];
  return lang instanceof LanguageSupport
    ? lang
    : new LanguageSupport(lang as Language);
}

const markdownCodeLanguages = FENCE_LANGUAGES.map(({ name, alias, key }) =>
  LanguageDescription.of({
    name,
    alias: [...alias],
    load: async () => toLanguageSupport(await loadExtension(key)),
  }),
);

const EDIT_SETUP = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightActiveLine: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: false,
  foldGutter: false, // handled manually via customFoldGutter extension
  indentOnInput: true,
  tabSize: 2,
} as const;

const PREVIEW_SETUP = {
  lineNumbers: true,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  foldGutter: false,
  dropCursor: false,
  allowMultipleSelections: false,
  indentOnInput: false,
  bracketMatching: false,
  closeBrackets: false,
  autocompletion: false,
  rectangularSelection: false,
  crosshairCursor: false,
  highlightSelectionMatches: false,
  searchKeymap: false,
} as const;

export interface EditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: string;
  readOnly?: boolean;
  height?: string;
  placeholder?: string;
  fontSize?: number;
  gutterBackground?: string;
  /** Soft-wrap long lines instead of scrolling horizontally. */
  lineWrapping?: boolean;
  /** Exposes the underlying CodeMirror instance (e.g. to imperatively focus it). */
  editorRef?: React.Ref<ReactCodeMirrorRef>;
}

export function Editor({
  value,
  onChange,
  language,
  readOnly = false,
  height = "200px",
  placeholder,
  fontSize = 13,
  gutterBackground,
  lineWrapping = false,
  editorRef,
}: EditorProps) {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const { theme } = useTheme();
  const isLight = theme === "light";
  const cmTheme =
    language === "markdown"
      ? isLight
        ? vscodeLightMarkdown
        : vscodeDarkMarkdown
      : isLight
        ? vscodeLight
        : vscodeDark;

  const editorStyle = {
    fontSize: `${fontSize}px`,
    ...(gutterBackground
      ? { "--klipcode-editor-gutter-background": gutterBackground }
      : {}),
  } as CSSProperties;

  useEffect(() => {
    let cancelled = false;

    loadExtension(language).then((exts) => {
      if (!cancelled) setExtensions(exts);
    });

    return () => {
      cancelled = true;
    };
  }, [language]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      onChange={onChange}
      theme={cmTheme}
      extensions={[
        ...(readOnly
          ? extensions
          : [...extensions, customFoldGutter, appendLineOnClickBelow]),
        ...(lineWrapping ? [EditorView.lineWrapping] : []),
      ]}
      editable={!readOnly}
      readOnly={readOnly}
      placeholder={placeholder}
      basicSetup={readOnly ? PREVIEW_SETUP : EDIT_SETUP}
      height={height}
      style={editorStyle}
    />
  );
}
