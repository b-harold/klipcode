import { describe, expect, it } from "vitest";

import { extractPastedUrl } from "@/components/MarkdownPreview/pastedUrl";

describe("extractPastedUrl", () => {
  it("accepts a plain http(s) URL", () => {
    expect(extractPastedUrl("https://example.com")).toBe("https://example.com");
    expect(extractPastedUrl("http://example.com/a?b=c#d")).toBe(
      "http://example.com/a?b=c#d",
    );
    expect(extractPastedUrl("HTTPS://EXAMPLE.COM/PATH")).toBe(
      "HTTPS://EXAMPLE.COM/PATH",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(extractPastedUrl("  https://example.com \n")).toBe("https://example.com");
  });

  it("rejects text that is not exactly one URL", () => {
    expect(extractPastedUrl("see https://example.com")).toBeNull();
    expect(extractPastedUrl("https://a.com https://b.com")).toBeNull();
    expect(extractPastedUrl("https://a.com\nhttps://b.com")).toBeNull();
    expect(extractPastedUrl("plain text")).toBeNull();
    expect(extractPastedUrl("")).toBeNull();
  });

  it("rejects other schemes and scheme-less hosts", () => {
    expect(extractPastedUrl("ftp://example.com")).toBeNull();
    expect(extractPastedUrl("javascript:alert(1)")).toBeNull();
    expect(extractPastedUrl("www.example.com")).toBeNull();
    expect(extractPastedUrl("example.com")).toBeNull();
  });
});
