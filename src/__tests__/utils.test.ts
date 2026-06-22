import { describe, it, expect } from "vitest";
import { cn, getSnippetDisplayName, getSnippetFileName, resolveSnippetRename } from "@/lib/utils";
import { LANGUAGES } from "@/lib/constants/languages";

// ── cn() ──────────────────────────────────────────────────────────────────────

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes (false is omitted)", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("resolves Tailwind conflicts (last class wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});

// ── getSnippetDisplayName() ───────────────────────────────────────────────────

describe("getSnippetDisplayName()", () => {
  it("appends extension when title has none", () => {
    expect(getSnippetDisplayName("myFile", "typescript", "Untitled")).toBe("myFile.ts");
  });

  it("does not double-add an extension that already matches", () => {
    expect(getSnippetDisplayName("myFile.ts", "typescript", "Untitled")).toBe("myFile.ts");
  });

  it("uses untitled label + extension when title is empty", () => {
    expect(getSnippetDisplayName("", "typescript", "Untitled")).toBe("Untitled.ts");
  });

  it("returns base name only when language is unknown (no extension)", () => {
    expect(getSnippetDisplayName("myFile", "unknownlang", "Untitled")).toBe("myFile");
  });

  it("returns untitled label only when both title and language are unknown", () => {
    expect(getSnippetDisplayName("", "unknownlang", "Sin título")).toBe("Sin título");
  });

  it("handles plaintext language", () => {
    expect(getSnippetDisplayName("notes", "plaintext", "Sin título")).toBe("notes.txt");
  });

  it("handles markdown language", () => {
    expect(getSnippetDisplayName("readme", "markdown", "Sin título")).toBe("readme.md");
  });

  it("handles all known languages without throwing", () => {
    for (const lang of LANGUAGES) {
      expect(() =>
        getSnippetDisplayName("test", lang.id, "Untitled")
      ).not.toThrow();
    }
  });
});

// ── getSnippetFileName() ──────────────────────────────────────────────────────

describe("getSnippetFileName()", () => {
  it("appends the language extension when missing", () => {
    expect(getSnippetFileName("index", "html")).toBe("index.html");
  });

  it("does not double-add an extension already present", () => {
    expect(getSnippetFileName("index.html", "html")).toBe("index.html");
  });

  it("returns an empty string for an empty title (no untitled fallback)", () => {
    expect(getSnippetFileName("", "html")).toBe("");
    expect(getSnippetFileName("   ", "typescript")).toBe("");
  });
});

// ── resolveSnippetRename() ────────────────────────────────────────────────────

describe("resolveSnippetRename()", () => {
  it("switches language when a recognized extension is typed", () => {
    expect(resolveSnippetRename("index.css", "html")).toEqual({
      title: "index.css",
      language: "css",
    });
  });

  it("preserves the previous extension when an unknown one is typed", () => {
    expect(resolveSnippetRename("index.xxx", "html")).toEqual({
      title: "index.xxx.html",
      language: "html",
    });
  });

  it("re-appends the extension when the user removes it entirely", () => {
    expect(resolveSnippetRename("index", "html")).toEqual({
      title: "index.html",
      language: "html",
    });
  });

  it("keeps a matching extension without duplicating it", () => {
    expect(resolveSnippetRename("index.html", "html")).toEqual({
      title: "index.html",
      language: "html",
    });
  });

  it("recognizes alternate extensions and maps them to a language", () => {
    expect(resolveSnippetRename("config.yml", "json")).toEqual({
      title: "config.yml",
      language: "yaml",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(resolveSnippetRename("  notes.txt  ", "markdown")).toEqual({
      title: "notes.txt",
      language: "plaintext",
    });
  });
});
