import { describe, it, expect } from "vitest";

import { searchWorkspace } from "@/hooks/useSearch";
import type { FolderRecord, NoteRecord, SnippetRecord } from "@/lib/types";

function snippet(over: Partial<SnippetRecord> = {}): SnippetRecord {
  return {
    id: over.id ?? "s",
    ownerId: null,
    folderId: null,
    title: "Snippet title",
    code: "console.log('hi')",
    language: "javascript",
    sourceUrl: null,
    isPinnedAside: false,
    isPinnedHome: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    dirty: false,
    lastSyncedAt: null,
    ...over,
  };
}

function note(over: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: over.id ?? "n",
    ownerId: null,
    folderId: null,
    title: "Note title",
    markdown: "Body text here.",
    isPinnedAside: false,
    isPinnedHome: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    dirty: false,
    lastSyncedAt: null,
    ...over,
  };
}

function folder(over: Partial<FolderRecord> = {}): FolderRecord {
  return {
    id: over.id ?? "f",
    ownerId: null,
    name: "Folder name",
    parentId: null,
    isPinnedAside: false,
    isPinnedHome: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    dirty: false,
    lastSyncedAt: null,
    ...over,
  };
}

describe("searchWorkspace()", () => {
  it("returns empty result for an empty query", () => {
    const r = searchWorkspace("", {
      snippets: [snippet()],
      notes: [note()],
      folders: [folder()],
    });
    expect(r.total).toBe(0);
  });

  it("matches snippet title case-insensitively", () => {
    const r = searchWorkspace("title", {
      snippets: [snippet({ title: "My Cool Title" })],
      notes: [],
      folders: [],
    });
    expect(r.snippets).toHaveLength(1);
    expect(r.snippets[0].matchedField).toBe("title");
  });

  it("matches snippet code body when title doesn't match", () => {
    const r = searchWorkspace("hello", {
      snippets: [snippet({ title: "x", code: "function hello() {}" })],
      notes: [],
      folders: [],
    });
    expect(r.snippets).toHaveLength(1);
    expect(r.snippets[0].matchedField).toBe("code");
    expect(r.snippets[0].excerpt).toContain("hello");
  });

  it("matches note title and markdown", () => {
    const r = searchWorkspace("alpha", {
      snippets: [],
      notes: [
        note({ id: "n1", title: "alpha title", markdown: "" }),
        note({ id: "n2", title: "x", markdown: "the alpha appears here" }),
      ],
      folders: [],
    });
    expect(r.notes).toHaveLength(2);
    const fields = r.notes.map((h) => h.matchedField).sort();
    expect(fields).toEqual(["markdown", "title"]);
  });

  it("matches folder names", () => {
    const r = searchWorkspace("docs", {
      snippets: [],
      notes: [],
      folders: [folder({ name: "My Docs" }), folder({ id: "f2", name: "Other" })],
    });
    expect(r.folders).toHaveLength(1);
    expect(r.folders[0].folder.name).toBe("My Docs");
  });

  it("returns nothing when nothing matches", () => {
    const r = searchWorkspace("zzz", {
      snippets: [snippet()],
      notes: [note()],
      folders: [folder()],
    });
    expect(r.total).toBe(0);
  });
});
