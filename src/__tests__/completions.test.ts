import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import {
  CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";

import {
  LANGUAGE_KEYWORDS,
  wordAndKeywordCompletion,
} from "@/components/Editor/completions";

/** Runs the fallback source over a plain-text doc at `pos`. */
function complete(
  doc: string,
  pos: number,
  keywords: readonly string[] = [],
  explicit = false,
): CompletionResult | null {
  const source = wordAndKeywordCompletion(keywords);
  const context = new CompletionContext(
    EditorState.create({ doc }),
    pos,
    explicit,
  );
  return source(context) as CompletionResult | null;
}

function labels(result: CompletionResult | null): string[] {
  return result?.options.map((o) => o.label) ?? [];
}

describe("wordAndKeywordCompletion", () => {
  it("suggests words already present in the document", () => {
    const doc = "const saludo = 1\nsal";
    const result = complete(doc, doc.length);
    expect(labels(result)).toContain("saludo");
    expect(labels(result)).toContain("const");
  });

  it("merges keywords into the suggestions, typed as keywords", () => {
    const result = complete("fu", 2, ["func", "return"]);
    const func = result?.options.find((o) => o.label === "func");
    expect(func).toBeDefined();
    expect(func?.type).toBe("keyword");
  });

  it("does not duplicate a keyword that also appears as a document word", () => {
    const doc = "func main\nfu";
    const result = complete(doc, doc.length, ["func"]);
    const occurrences = labels(result).filter((l) => l === "func");
    expect(occurrences).toHaveLength(1);
    // The surviving entry is the keyword-typed one, not the plain word.
    expect(result?.options.find((o) => o.label === "func")?.type).toBe(
      "keyword",
    );
  });

  it("stays quiet when there is no word before the cursor", () => {
    expect(complete("a + ", 4, ["return"])).toBeNull();
  });

  it("offers keywords on explicit request even without a typed prefix", () => {
    const result = complete("x ", 2, ["return"], true);
    expect(labels(result)).toContain("return");
  });

  it("completes from the token start so the typed prefix is replaced", () => {
    const doc = "hello hel";
    const result = complete(doc, doc.length);
    expect(result?.from).toBe(doc.length - 3);
  });
});

describe("LANGUAGE_KEYWORDS", () => {
  it("covers a sensible sample of languages and words", () => {
    expect(LANGUAGE_KEYWORDS.go).toContain("func");
    expect(LANGUAGE_KEYWORDS.rust).toContain("fn");
    expect(LANGUAGE_KEYWORDS.dockerfile).toContain("FROM");
    expect(LANGUAGE_KEYWORDS.java).toContain("class");
  });

  it("has no duplicate entries within a language", () => {
    for (const [language, words] of Object.entries(LANGUAGE_KEYWORDS)) {
      expect(new Set(words).size, language).toBe(words!.length);
    }
  });
});
