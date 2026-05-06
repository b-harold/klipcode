import { describe, it, expect } from "vitest";
import { extractSnippetIds, SNIPPET_REF_RE } from "@/components/NoteEditor/markdownPlugin";

describe("extractSnippetIds()", () => {
  it("returns an empty array for plain markdown", () => {
    expect(extractSnippetIds("# Hello world\n\nNo refs here.")).toEqual([]);
  });

  it("extracts a single UUID reference", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    expect(extractSnippetIds(`See [[snippet:${id}]] above.`)).toEqual([id]);
  });

  it("extracts multiple references in order", () => {
    const a = "11111111-2222-3333-4444-555555555555";
    const b = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    expect(extractSnippetIds(`[[snippet:${a}]] and [[snippet:${b}]]`)).toEqual([a, b]);
  });

  it("ignores malformed markers", () => {
    expect(extractSnippetIds("[[snippet:not-a-uuid]] and [[snippet]]")).toEqual([]);
    // The first form has a too-short id (< 8 chars), the second has no colon.
  });

  it("accepts shorter ids of >= 8 hex chars (covers fake-indexeddb test ids too)", () => {
    expect(extractSnippetIds("[[snippet:abcdef12]]")).toEqual(["abcdef12"]);
  });

  it("does not consume surrounding text", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    const text = `before [[snippet:${id}]] after`;
    SNIPPET_REF_RE.lastIndex = 0;
    const match = SNIPPET_REF_RE.exec(text);
    expect(match).not.toBeNull();
    expect(match![0]).toBe(`[[snippet:${id}]]`);
  });
});
