import {
  completeAnyWord,
  type Completion,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";

/**
 * VS Code-style fallback completion for languages whose grammar ships no
 * completion source of its own: the document's words ("word based
 * suggestions") merged with an optional curated keyword list. Words already
 * present as keywords are dropped so a keyword typed in the document doesn't
 * show up twice.
 */
export function wordAndKeywordCompletion(
  keywords: readonly string[] = [],
): CompletionSource {
  if (keywords.length === 0) return completeAnyWord;

  const keywordOptions: Completion[] = keywords.map((label) => ({
    label,
    type: "keyword",
  }));
  const keywordSet = new Set<string>(keywords);

  return (context) => {
    // completeAnyWord resolves the token to complete and already handles the
    // "no word before the cursor and not explicitly requested" case (null).
    // It is synchronous even though the CompletionSource type allows promises.
    const words = completeAnyWord(context) as CompletionResult | null;
    if (!words) return null;
    return {
      ...words,
      options: [
        ...keywordOptions,
        ...words.options.filter((option) => !keywordSet.has(option.label)),
      ],
    };
  };
}

/**
 * Curated keyword lists (reserved words plus a handful of ubiquitous builtins
 * and literals) for the languages that get the fallback source above. Keys are
 * `LanguageId`s from `src/lib/constants/languages.ts`; languages absent here
 * (YAML, TOML, JSON, XML, SCSS…) get word-based suggestions only.
 */
export const LANGUAGE_KEYWORDS: Partial<Record<string, readonly string[]>> = {
  java: [
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "record", "return", "sealed",
    "short", "static", "strictfp", "super", "switch", "synchronized", "this",
    "throw", "throws", "transient", "try", "var", "void", "volatile", "while",
    "yield", "true", "false", "null", "String", "System",
  ],
  c: [
    "auto", "break", "case", "char", "const", "continue", "default", "do",
    "double", "else", "enum", "extern", "float", "for", "goto", "if",
    "inline", "int", "long", "register", "restrict", "return", "short",
    "signed", "sizeof", "static", "struct", "switch", "typedef", "union",
    "unsigned", "void", "volatile", "while", "bool", "true", "false", "NULL",
    "include", "define", "printf", "malloc", "free", "size_t",
  ],
  cpp: [
    "alignas", "alignof", "auto", "bool", "break", "case", "catch", "char",
    "class", "concept", "const", "consteval", "constexpr", "const_cast",
    "continue", "co_await", "co_return", "co_yield", "decltype", "default",
    "delete", "do", "double", "dynamic_cast", "else", "enum", "explicit",
    "export", "extern", "false", "float", "for", "friend", "goto", "if",
    "inline", "int", "long", "mutable", "namespace", "new", "noexcept",
    "nullptr", "operator", "private", "protected", "public",
    "reinterpret_cast", "requires", "return", "short", "signed", "sizeof",
    "static", "static_cast", "struct", "switch", "template", "this", "throw",
    "true", "try", "typedef", "typeid", "typename", "union", "unsigned",
    "using", "virtual", "void", "volatile", "while", "include", "define",
    "std", "string", "vector", "cout", "cin", "endl", "size_t",
  ],
  php: [
    "abstract", "and", "array", "as", "break", "callable", "case", "catch",
    "class", "clone", "const", "continue", "declare", "default", "do", "echo",
    "else", "elseif", "empty", "enum", "extends", "final", "finally", "fn",
    "for", "foreach", "function", "global", "goto", "if", "implements",
    "include", "include_once", "instanceof", "insteadof", "interface",
    "isset", "list", "match", "namespace", "new", "or", "print", "private",
    "protected", "public", "readonly", "require", "require_once", "return",
    "static", "switch", "this", "throw", "trait", "try", "unset", "use",
    "var", "while", "xor", "yield", "true", "false", "null",
  ],
  bash: [
    "if", "then", "else", "elif", "fi", "for", "while", "until", "do",
    "done", "case", "esac", "in", "function", "select", "time", "coproc",
    "echo", "printf", "read", "cd", "pwd", "exit", "return", "export",
    "local", "declare", "unset", "shift", "source", "alias", "eval", "exec",
    "set", "test", "trap", "sudo", "grep", "sed", "awk", "curl",
  ],
  go: [
    "break", "case", "chan", "const", "continue", "default", "defer", "else",
    "fallthrough", "for", "func", "go", "goto", "if", "import", "interface",
    "map", "package", "range", "return", "select", "struct", "switch",
    "type", "var", "append", "cap", "close", "copy", "delete", "len", "make",
    "new", "panic", "recover", "true", "false", "nil", "iota", "int",
    "int64", "uint", "byte", "rune", "float64", "string", "bool", "error",
  ],
  rust: [
    "as", "async", "await", "break", "const", "continue", "crate", "dyn",
    "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
    "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
    "self", "Self", "static", "struct", "super", "trait", "true", "type",
    "unsafe", "use", "where", "while", "String", "Vec", "Option", "Some",
    "None", "Result", "Ok", "Err", "Box", "i32", "i64", "u32", "u64", "f64",
    "usize", "isize", "bool", "str", "println",
  ],
  csharp: [
    "abstract", "as", "async", "await", "base", "bool", "break", "byte",
    "case", "catch", "char", "checked", "class", "const", "continue",
    "decimal", "default", "delegate", "do", "double", "else", "enum",
    "event", "explicit", "extern", "false", "finally", "fixed", "float",
    "for", "foreach", "goto", "if", "implicit", "in", "int", "interface",
    "internal", "is", "lock", "long", "namespace", "new", "null", "object",
    "operator", "out", "override", "params", "private", "protected",
    "public", "readonly", "record", "ref", "return", "sbyte", "sealed",
    "short", "sizeof", "static", "string", "struct", "switch", "this",
    "throw", "true", "try", "typeof", "uint", "ulong", "unsafe", "ushort",
    "using", "var", "virtual", "void", "volatile", "while", "yield",
    "Console",
  ],
  ruby: [
    "alias", "and", "begin", "break", "case", "class", "def", "do", "else",
    "elsif", "end", "ensure", "false", "for", "if", "in", "module", "next",
    "nil", "not", "or", "redo", "rescue", "retry", "return", "self",
    "super", "then", "true", "undef", "unless", "until", "when", "while",
    "yield", "attr_accessor", "attr_reader", "attr_writer", "require",
    "require_relative", "puts", "print", "lambda", "proc", "new", "each",
  ],
  swift: [
    "actor", "any", "as", "associatedtype", "async", "await", "break",
    "case", "catch", "class", "continue", "default", "defer", "deinit",
    "do", "else", "enum", "extension", "fallthrough", "false", "fileprivate",
    "for", "func", "guard", "if", "import", "in", "init", "inout",
    "internal", "is", "let", "nil", "open", "operator", "private",
    "protocol", "public", "repeat", "rethrows", "return", "self", "Self",
    "some", "static", "struct", "subscript", "super", "switch", "throw",
    "throws", "true", "try", "typealias", "var", "where", "while", "String",
    "Int", "Double", "Bool", "print",
  ],
  kotlin: [
    "abstract", "annotation", "as", "break", "by", "catch", "class",
    "companion", "const", "constructor", "continue", "crossinline", "data",
    "do", "else", "enum", "expect", "external", "false", "final", "finally",
    "for", "fun", "get", "if", "import", "in", "infix", "init", "inline",
    "inner", "interface", "internal", "is", "lateinit", "null", "object",
    "open", "operator", "out", "override", "package", "private",
    "protected", "public", "reified", "return", "sealed", "set", "super",
    "suspend", "tailrec", "this", "throw", "true", "try", "typealias",
    "val", "var", "vararg", "when", "where", "while", "println",
  ],
  dart: [
    "abstract", "as", "assert", "async", "await", "base", "break", "case",
    "catch", "class", "const", "continue", "covariant", "default",
    "deferred", "do", "dynamic", "else", "enum", "export", "extends",
    "extension", "external", "factory", "false", "final", "finally", "for",
    "get", "hide", "if", "implements", "import", "in", "interface", "is",
    "late", "library", "mixin", "new", "null", "on", "operator", "part",
    "required", "rethrow", "return", "sealed", "set", "show", "static",
    "super", "switch", "sync", "this", "throw", "true", "try", "typedef",
    "var", "void", "when", "while", "with", "yield", "String", "int",
    "double", "bool", "List", "Map", "Future", "print",
  ],
  scala: [
    "abstract", "case", "catch", "class", "def", "do", "else", "enum",
    "extends", "false", "final", "finally", "for", "given", "if",
    "implicit", "import", "lazy", "match", "new", "null", "object",
    "override", "package", "private", "protected", "return", "sealed",
    "super", "then", "this", "throw", "trait", "true", "try", "type",
    "using", "val", "var", "while", "with", "yield", "String", "Int",
    "Boolean", "List", "Map", "Option", "Some", "None", "println",
  ],
  groovy: [
    "abstract", "as", "assert", "break", "case", "catch", "class", "const",
    "continue", "def", "default", "do", "else", "enum", "extends", "false",
    "final", "finally", "for", "goto", "if", "implements", "import", "in",
    "instanceof", "interface", "new", "null", "package", "private",
    "protected", "public", "return", "static", "super", "switch", "this",
    "throw", "throws", "trait", "true", "try", "var", "while", "println",
  ],
  lua: [
    "and", "break", "do", "else", "elseif", "end", "false", "for",
    "function", "goto", "if", "in", "local", "nil", "not", "or", "repeat",
    "return", "then", "true", "until", "while", "print", "pairs", "ipairs",
    "pcall", "require", "table", "string", "math", "type", "tostring",
    "tonumber", "self",
  ],
  haskell: [
    "case", "class", "data", "default", "deriving", "do", "else", "foreign",
    "if", "import", "in", "infix", "infixl", "infixr", "instance", "let",
    "module", "newtype", "of", "then", "type", "where", "map", "filter",
    "foldr", "foldl", "return", "pure", "fmap", "Maybe", "Just", "Nothing",
    "Either", "Left", "Right", "IO", "String", "Int", "Bool", "True",
    "False", "otherwise", "putStrLn",
  ],
  erlang: [
    "after", "and", "andalso", "band", "begin", "bnot", "bor", "bsl",
    "bsr", "bxor", "case", "catch", "cond", "div", "end", "fun", "if",
    "not", "of", "or", "orelse", "receive", "rem", "try", "when", "xor",
    "module", "export", "import", "spawn", "true", "false", "ok", "error",
  ],
  r: [
    "if", "else", "repeat", "while", "function", "for", "in", "next",
    "break", "TRUE", "FALSE", "NULL", "Inf", "NaN", "NA", "library",
    "require", "print", "paste", "vector", "list", "matrix", "return",
    "lapply", "sapply", "length", "names", "summary",
  ],
  powershell: [
    "begin", "break", "catch", "class", "continue", "do", "dynamicparam",
    "else", "elseif", "end", "enum", "exit", "filter", "finally", "for",
    "foreach", "function", "hidden", "if", "in", "param", "process",
    "return", "static", "switch", "throw", "trap", "try", "until", "using",
    "while", "Write-Host", "Write-Output", "Get-ChildItem", "Get-Item",
    "Set-Location", "ForEach-Object", "Where-Object", "Select-Object",
  ],
  dockerfile: [
    "FROM", "RUN", "CMD", "LABEL", "MAINTAINER", "EXPOSE", "ENV", "ADD",
    "COPY", "ENTRYPOINT", "VOLUME", "USER", "WORKDIR", "ARG", "ONBUILD",
    "STOPSIGNAL", "HEALTHCHECK", "SHELL", "AS",
  ],
};
