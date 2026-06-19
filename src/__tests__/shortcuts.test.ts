import { describe, it, expect } from "vitest";

import {
  SHORTCUTS,
  SHORTCUT_SECTION_ORDER,
  formatShortcutKeys,
  type ShortcutDescriptor,
} from "@/lib/constants/shortcuts";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";

describe("formatShortcutKeys", () => {
  const newSnippet = SHORTCUTS.find((s) => s.id === "newSnippet")!;

  it("uses ⌘/⌥ symbols on macOS", () => {
    expect(formatShortcutKeys(newSnippet, true)).toEqual(["⌘", "⌥", "N"]);
  });

  it("uses Ctrl/Alt words off macOS", () => {
    expect(formatShortcutKeys(newSnippet, false)).toEqual(["Ctrl", "Alt", "N"]);
  });

  it("renders modifier order mod → alt → shift before the key", () => {
    const d: ShortcutDescriptor = {
      id: "search",
      section: "general",
      mod: true,
      alt: true,
      shift: true,
      keys: ["X"],
    };
    expect(formatShortcutKeys(d, true)).toEqual(["⌘", "⌥", "⇧", "X"]);
  });

  it("leaves bare keys untouched when there is no modifier", () => {
    const closeEditor = SHORTCUTS.find((s) => s.id === "closeEditor")!;
    expect(formatShortcutKeys(closeEditor, true)).toEqual(["Esc"]);
    const navigate = SHORTCUTS.find((s) => s.id === "navigateList")!;
    expect(formatShortcutKeys(navigate, false)).toEqual(["↑", "↓"]);
  });
});

describe("SHORTCUTS registry", () => {
  it("has unique ids", () => {
    const ids = SHORTCUTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references known sections", () => {
    for (const s of SHORTCUTS) {
      expect(SHORTCUT_SECTION_ORDER).toContain(s.section);
    }
  });

  it("has a label for every shortcut in both locales", () => {
    for (const s of SHORTCUTS) {
      expect(en.shortcuts.items[s.id], `en label for ${s.id}`).toBeTruthy();
      expect(es.shortcuts.items[s.id], `es label for ${s.id}`).toBeTruthy();
    }
  });

  it("has a label for every section in both locales", () => {
    for (const section of SHORTCUT_SECTION_ORDER) {
      expect(en.shortcuts.sections[section], `en section ${section}`).toBeTruthy();
      expect(es.shortcuts.sections[section], `es section ${section}`).toBeTruthy();
    }
  });
});
