// fake-indexeddb/auto must be loaded via vitest setupFiles (vitest.config.ts)
// so that Dexie picks it up when the module is first imported.
import { describe, it, expect, beforeEach } from "vitest";
import { db, readWorkspace, readTrash, getDirtyWorkspace } from "@/lib/db";
import type { FolderRecord, NoteRecord, SnippetRecord } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

let counter = 0;
function uid() {
  return `test-id-${++counter}`;
}

function makeFolder(overrides: Partial<FolderRecord> = {}): FolderRecord {
  return {
    id: uid(),
    ownerId: null,
    name: "Test Folder",
    parentId: null,
    isPinnedAside: false,
    isPinnedHome: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    dirty: false,
    lastSyncedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function makeSnippet(overrides: Partial<SnippetRecord> = {}): SnippetRecord {
  return {
    id: uid(),
    ownerId: null,
    folderId: null,
    title: "Test Snippet",
    code: 'console.log("test")',
    language: "javascript",
    sourceUrl: null,
    isPinnedAside: false,
    isPinnedHome: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    dirty: false,
    lastSyncedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: uid(),
    ownerId: null,
    folderId: null,
    title: "Test Note",
    markdown: "Hello world",
    isPinnedAside: false,
    isPinnedHome: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    dirty: false,
    lastSyncedAt: null,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.folders.clear();
  await db.snippets.clear();
  await db.notes.clear();
});

// ── readWorkspace() ───────────────────────────────────────────────────────────

describe("readWorkspace()", () => {
  it("returns empty workspace when nothing is stored", async () => {
    const ws = await readWorkspace(null);
    expect(ws.folders).toHaveLength(0);
    expect(ws.snippets).toHaveLength(0);
    expect(ws.notes).toHaveLength(0);
  });

  it("returns only null-owner records when no user is logged in", async () => {
    await db.folders.bulkAdd([
      makeFolder({ ownerId: null }),
      makeFolder({ ownerId: "user-1" }),
    ]);

    const ws = await readWorkspace(null);
    expect(ws.folders).toHaveLength(1);
    expect(ws.folders[0].ownerId).toBeNull();
  });

  it("returns own records AND null-owner records when a user is logged in", async () => {
    await db.folders.bulkAdd([
      makeFolder({ ownerId: null }),
      makeFolder({ ownerId: "user-1" }),
      makeFolder({ ownerId: "user-2" }),
    ]);

    const ws = await readWorkspace("user-1");
    expect(ws.folders).toHaveLength(2);
    expect(ws.folders.map((f) => f.ownerId)).not.toContain("user-2");
  });

  it("excludes trashed (soft-deleted) records", async () => {
    await db.folders.bulkAdd([
      makeFolder({ name: "Live" }),
      makeFolder({ name: "Trashed", deletedAt: "2024-06-01T00:00:00.000Z" }),
    ]);
    await db.snippets.bulkAdd([
      makeSnippet({ title: "Live" }),
      makeSnippet({ title: "Trashed", deletedAt: "2024-06-01T00:00:00.000Z" }),
    ]);

    const ws = await readWorkspace(null);
    expect(ws.folders.map((f) => f.name)).toEqual(["Live"]);
    expect(ws.snippets.map((s) => s.title)).toEqual(["Live"]);
  });

  it("places pinned folders before unpinned regardless of updatedAt", async () => {
    await db.folders.bulkAdd([
      makeFolder({ name: "Unpinned New", isPinnedAside: false, updatedAt: "2024-06-01T00:00:00.000Z" }),
      makeFolder({ name: "Pinned Old", isPinnedAside: true, updatedAt: "2024-01-01T00:00:00.000Z" }),
    ]);

    const ws = await readWorkspace(null);
    expect(ws.folders[0].name).toBe("Pinned Old");
    expect(ws.folders[1].name).toBe("Unpinned New");
  });

  it("sorts unpinned folders by updatedAt descending (newest first)", async () => {
    await db.folders.bulkAdd([
      makeFolder({ name: "Older", updatedAt: "2024-01-01T00:00:00.000Z" }),
      makeFolder({ name: "Newer", updatedAt: "2024-06-01T00:00:00.000Z" }),
    ]);

    const ws = await readWorkspace(null);
    expect(ws.folders[0].name).toBe("Newer");
    expect(ws.folders[1].name).toBe("Older");
  });

  it("places pinned snippets before unpinned", async () => {
    await db.snippets.bulkAdd([
      makeSnippet({ title: "Unpinned", isPinnedAside: false, updatedAt: "2024-06-01T00:00:00.000Z" }),
      makeSnippet({ title: "Pinned", isPinnedAside: true, updatedAt: "2024-01-01T00:00:00.000Z" }),
    ]);

    const ws = await readWorkspace(null);
    expect(ws.snippets[0].title).toBe("Pinned");
  });

  it("returns notes filtered by ownership and sorted with pinned first", async () => {
    await db.notes.bulkAdd([
      makeNote({ ownerId: null, title: "Guest" }),
      makeNote({ ownerId: "user-1", title: "User Newer", updatedAt: "2024-06-01T00:00:00.000Z" }),
      makeNote({ ownerId: "user-1", title: "User Pinned", isPinnedAside: true, updatedAt: "2024-01-01T00:00:00.000Z" }),
      makeNote({ ownerId: "user-2", title: "Other user" }),
    ]);

    const ws = await readWorkspace("user-1");
    const titles = ws.notes.map((n) => n.title);
    expect(titles).toEqual(["User Pinned", "User Newer", "Guest"]);
  });
});

// ── getDirtyWorkspace() ───────────────────────────────────────────────────────

describe("readTrash()", () => {
  it("returns only trashed records, newest deletion first", async () => {
    await db.folders.bulkAdd([
      makeFolder({ name: "Live" }),
      makeFolder({ name: "Older", deletedAt: "2024-01-01T00:00:00.000Z" }),
      makeFolder({ name: "Newer", deletedAt: "2024-06-01T00:00:00.000Z" }),
    ]);

    const trash = await readTrash(null);
    expect(trash.folders.map((f) => f.name)).toEqual(["Newer", "Older"]);
  });

  it("respects ownership like readWorkspace", async () => {
    await db.snippets.bulkAdd([
      makeSnippet({ ownerId: "user-1", deletedAt: "2024-01-01T00:00:00.000Z" }),
      makeSnippet({ ownerId: "user-2", deletedAt: "2024-01-01T00:00:00.000Z" }),
      makeSnippet({ ownerId: null, deletedAt: "2024-01-01T00:00:00.000Z" }),
    ]);

    const trash = await readTrash("user-1");
    expect(trash.snippets.map((s) => s.ownerId).sort()).toEqual([null, "user-1"]);
  });
});

describe("getDirtyWorkspace()", () => {
  const userId = "user-sync";

  it("returns only dirty records for the given user", async () => {
    await db.folders.bulkAdd([
      makeFolder({ ownerId: userId, dirty: true }),
      makeFolder({ ownerId: userId, dirty: false }),
    ]);
    await db.snippets.bulkAdd([
      makeSnippet({ ownerId: userId, dirty: true }),
      makeSnippet({ ownerId: userId, dirty: false }),
    ]);
    await db.notes.bulkAdd([
      makeNote({ ownerId: userId, dirty: true }),
      makeNote({ ownerId: userId, dirty: false }),
    ]);

    const dirty = await getDirtyWorkspace(userId);
    expect(dirty.folders).toHaveLength(1);
    expect(dirty.folders[0].dirty).toBe(true);
    expect(dirty.snippets).toHaveLength(1);
    expect(dirty.snippets[0].dirty).toBe(true);
    expect(dirty.notes).toHaveLength(1);
    expect(dirty.notes[0].dirty).toBe(true);
  });

  it("returns empty when there are no dirty records", async () => {
    await db.folders.add(makeFolder({ ownerId: userId, dirty: false }));

    const dirty = await getDirtyWorkspace(userId);
    expect(dirty.folders).toHaveLength(0);
    expect(dirty.snippets).toHaveLength(0);
    expect(dirty.notes).toHaveLength(0);
  });

  it("does not return dirty records belonging to a different user", async () => {
    await db.folders.add(makeFolder({ ownerId: "other-user", dirty: true }));

    const dirty = await getDirtyWorkspace(userId);
    expect(dirty.folders).toHaveLength(0);
  });
});
