"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, BubbleMenu, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  Quote,
  Link as LinkIcon,
} from "lucide-react";

import type { MarkdownEditorCopy } from "./MarkdownEditor";
import { LinkDialog } from "./LinkDialog";

// Syntax highlighting inside fenced code blocks. `common` bundles ~35 popular
// grammars (js, ts, python, css, html, json, bash, …) — enough for snippets,
// without pulling in every highlight.js language.
const lowlight = createLowlight(common);

// ──────────────────────────────────────────────────────────────────────────────
// Floating formatting toolbar (Notion-style) shown over a text selection.
// ──────────────────────────────────────────────────────────────────────────────

function BubbleButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active ? "bg-ink/[0.12] text-foreground" : "text-ink/55 hover:bg-ink/[0.08] hover:text-ink/90",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FormattingMenu({ editor, copy }: { editor: Editor; copy: MarkdownEditorCopy }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState<string | undefined>();

  const openLink = () => {
    // Capture the current link href *before* focus leaves the editor, so the
    // dialog can pre-fill it and decide between "insert" / "edit" wording.
    setLinkHref((editor.getAttributes("link").href as string | undefined) ?? undefined);
    setLinkOpen(true);
  };

  const applyLink = (url: string) => {
    setLinkOpen(false);
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const removeLink = () => {
    setLinkOpen(false);
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  };

  return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 120 }}
        className="klipcode-bubble-menu flex items-center gap-0.5 rounded-lg border border-ink/[0.1] p-1 shadow-[var(--popover-shadow)]"
      >
        <BubbleButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </BubbleButton>
        <BubbleButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </BubbleButton>
        <BubbleButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </BubbleButton>
        <BubbleButton label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={14} />
        </BubbleButton>
        <div className="mx-0.5 h-5 w-px bg-ink/[0.1]" />
        <BubbleButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={14} />
        </BubbleButton>
        <BubbleButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} />
        </BubbleButton>
        <BubbleButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </BubbleButton>
        <BubbleButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </BubbleButton>
        <BubbleButton label="Link" active={editor.isActive("link")} onClick={openLink}>
          <LinkIcon size={14} />
        </BubbleButton>
      </BubbleMenu>

      {linkOpen && (
        <LinkDialog
          initialHref={linkHref}
          copy={copy.linkDialog}
          onCancel={() => setLinkOpen(false)}
          onSubmit={applyLink}
          onRemove={removeLink}
        />
      )}
    </>
  );
}

// Clicking the empty space below the content gives a fresh line to type in:
// append an empty paragraph at the end (unless the last block is already an empty
// paragraph) and place the caret there.
function focusWithTrailingLine(editor: Editor) {
  const last = editor.state.doc.lastChild;
  const lastIsEmptyParagraph =
    last?.type.name === "paragraph" && last.content.size === 0;

  if (lastIsEmptyParagraph) {
    editor.chain().focus("end").run();
    return;
  }

  editor
    .chain()
    .command(({ tr, dispatch }) => {
      if (dispatch) tr.insert(tr.doc.content.size, editor.schema.nodes.paragraph.create());
      return true;
    })
    .focus("end")
    .run();
}

// ──────────────────────────────────────────────────────────────────────────────
// Editor
// ──────────────────────────────────────────────────────────────────────────────

export interface MarkdownEditorInnerProps {
  value: string;
  onChange: (markdown: string) => void;
  editable: boolean;
  copy: MarkdownEditorCopy;
}

export default function MarkdownEditorInner({
  value,
  onChange,
  editable,
  copy,
}: MarkdownEditorInnerProps) {
  // Keep the latest onChange without re-creating the editor instance.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    // The editor renders only on the client (lazy boundary) — avoid SSR markup.
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "plaintext" }),
      Link.configure({ openOnClick: true, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: copy.placeholder }),
      Markdown.configure({ html: false, tightLists: true, transformPastedText: true, transformCopiedText: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "klipcode-md focus:outline-none",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.storage.markdown.getMarkdown());
    },
  });

  // Reflect read-only state (e.g. a trashed snippet) without rebuilding the doc.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return (
    <div
      className="h-full overflow-y-auto"
      // Clicking the blank area below the content drops a fresh line and focuses
      // it — a Notion-like affordance so the whole pane feels writable.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && editor && editable) {
          e.preventDefault();
          focusWithTrailingLine(editor);
        }
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-8 pr-10">
        {editor && editable && <FormattingMenu editor={editor} copy={copy} />}
        <EditorContent editor={editor} />
        {editor && editable && (
          <div
            aria-hidden
            className="cursor-text"
            style={{ minHeight: "clamp(6rem, 30vh, 18rem)" }}
            onMouseDown={(e) => {
              e.preventDefault();
              focusWithTrailingLine(editor);
            }}
          />
        )}
      </div>
    </div>
  );
}
