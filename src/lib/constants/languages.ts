export interface LanguageConfig {
  id: string;
  label: string;
  extension: string;
}

export const LANGUAGES = [
  { id: "typescript",  label: "TypeScript",  extension: ".ts"    },
  { id: "tsx",         label: "TSX",         extension: ".tsx"   },
  { id: "javascript",  label: "JavaScript",  extension: ".js"    },
  { id: "jsx",         label: "JSX",         extension: ".jsx"   },
  { id: "html",        label: "HTML",        extension: ".html"  },
  { id: "css",         label: "CSS",         extension: ".css"   },
  { id: "python",      label: "Python",      extension: ".py"    },
  { id: "json",        label: "JSON",        extension: ".json"  },
  { id: "markdown",    label: "Markdown",    extension: ".md"    },
  { id: "sql",         label: "SQL",         extension: ".sql"   },
  { id: "bash",        label: "Bash",        extension: ".sh"    },
  { id: "go",          label: "Go",          extension: ".go"    },
  { id: "rust",        label: "Rust",        extension: ".rs"    },
  { id: "java",        label: "Java",        extension: ".java"  },
  { id: "cpp",         label: "C++",         extension: ".cpp"   },
  { id: "c",           label: "C",           extension: ".c"     },
  { id: "csharp",      label: "C#",          extension: ".cs"    },
  { id: "php",         label: "PHP",         extension: ".php"   },
  { id: "ruby",        label: "Ruby",        extension: ".rb"    },
  { id: "swift",       label: "Swift",       extension: ".swift" },
  { id: "kotlin",      label: "Kotlin",      extension: ".kt"    },
  { id: "yaml",        label: "YAML",        extension: ".yaml"  },
  { id: "toml",        label: "TOML",        extension: ".toml"  },
  { id: "xml",         label: "XML",         extension: ".xml"   },
  { id: "scss",        label: "SCSS",        extension: ".scss"  },
  { id: "dart",        label: "Dart",        extension: ".dart"  },
  { id: "scala",       label: "Scala",       extension: ".scala" },
  { id: "groovy",      label: "Groovy",      extension: ".groovy"},
  { id: "lua",         label: "Lua",         extension: ".lua"   },
  { id: "haskell",     label: "Haskell",     extension: ".hs"    },
  { id: "erlang",      label: "Erlang",      extension: ".erl"   },
  { id: "r",           label: "R",           extension: ".r"     },
  { id: "powershell",  label: "PowerShell",  extension: ".ps1"   },
  { id: "dockerfile",  label: "Dockerfile",  extension: ".dockerfile" },
  { id: "plaintext",   label: "Plain Text",  extension: ".txt"   },
] as const satisfies readonly LanguageConfig[];

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const DEFAULT_LANGUAGE: LanguageId = "javascript";

/**
 * Maps a file extension (including the leading dot, lowercased) to a language id.
 * Built from the canonical `LANGUAGES` extensions plus common alternate spellings
 * that don't have their own entry (e.g. `.yml` → YAML, `.mjs` → JavaScript).
 */
const EXTENSION_TO_LANGUAGE: Record<string, LanguageId> = {
  ...Object.fromEntries(LANGUAGES.map((l) => [l.extension, l.id] as const)),
  ".htm": "html",
  ".yml": "yaml",
  ".bash": "bash",
  ".zsh": "bash",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".h": "c",
  ".kts": "kotlin",
  ".pyw": "python",
  ".markdown": "markdown",
};

/**
 * Infers a language id from a snippet title that looks like a filename
 * (e.g. `script.js`, `style.css`, `Dockerfile`). Returns `null` when the title
 * has no recognizable extension, so callers can fall back to a default.
 */
export function detectLanguageFromTitle(title: string): LanguageId | null {
  const name = title.trim().toLowerCase();
  if (!name) return null;

  // Conventional extension-less filenames.
  if (name === "dockerfile") return "dockerfile";

  const dot = name.lastIndexOf(".");
  // No dot, a leading-dot dotfile (e.g. `.env`), or a trailing dot: no extension.
  if (dot <= 0 || dot === name.length - 1) return null;

  return EXTENSION_TO_LANGUAGE[name.slice(dot)] ?? null;
}
