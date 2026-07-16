import { describe, it, expect } from "vitest";
import { LANGUAGES, DEFAULT_LANGUAGE, detectLanguageFromTitle } from "@/lib/constants/languages";

describe("LANGUAGES constant", () => {
  it("is non-empty", () => {
    expect(LANGUAGES.length).toBeGreaterThan(0);
  });

  it("has no duplicate IDs", () => {
    const ids = LANGUAGES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate extensions", () => {
    const extensions = LANGUAGES.map((l) => l.extension);
    expect(new Set(extensions).size).toBe(extensions.length);
  });

  it("all IDs are non-empty strings", () => {
    for (const lang of LANGUAGES) {
      expect(lang.id.trim().length).toBeGreaterThan(0);
    }
  });

  it("all labels are non-empty strings", () => {
    for (const lang of LANGUAGES) {
      expect(lang.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("all extensions start with a dot", () => {
    for (const lang of LANGUAGES) {
      expect(lang.extension).toMatch(/^\./);
    }
  });

  it("DEFAULT_LANGUAGE exists in LANGUAGES", () => {
    const ids = LANGUAGES.map((l) => l.id);
    expect(ids).toContain(DEFAULT_LANGUAGE);
  });
});

describe("detectLanguageFromTitle", () => {
  it("detects the language from a canonical extension", () => {
    expect(detectLanguageFromTitle("script.js")).toBe("javascript");
    expect(detectLanguageFromTitle("style.css")).toBe("css");
    expect(detectLanguageFromTitle("index.html")).toBe("html");
    expect(detectLanguageFromTitle("main.py")).toBe("python");
    expect(detectLanguageFromTitle("Component.tsx")).toBe("tsx");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(detectLanguageFromTitle("  README.MD  ")).toBe("markdown");
    expect(detectLanguageFromTitle("APP.TS")).toBe("typescript");
  });

  it("recognizes common alternate extensions", () => {
    expect(detectLanguageFromTitle("config.yml")).toBe("yaml");
    expect(detectLanguageFromTitle("page.htm")).toBe("html");
    expect(detectLanguageFromTitle("server.mjs")).toBe("javascript");
    expect(detectLanguageFromTitle("vector.hpp")).toBe("cpp");
  });

  it("recognizes extension-less Dockerfile", () => {
    expect(detectLanguageFromTitle("Dockerfile")).toBe("dockerfile");
  });

  it("uses the last extension for multi-dotted names", () => {
    expect(detectLanguageFromTitle("styles.module.css")).toBe("css");
  });

  it("returns null when there is no recognizable extension", () => {
    expect(detectLanguageFromTitle("notes")).toBeNull();
    expect(detectLanguageFromTitle("")).toBeNull();
    expect(detectLanguageFromTitle("archive.unknownext")).toBeNull();
    expect(detectLanguageFromTitle("version.")).toBeNull();
  });

  it("ignores leading-dot dotfiles", () => {
    expect(detectLanguageFromTitle(".env")).toBeNull();
  });
});
