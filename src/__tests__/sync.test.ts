// fake-indexeddb/auto is loaded via vitest setupFiles (vitest.config.ts).
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { CloudFolderRow, CloudSnippetRow, FolderRecord, SnippetRecord } from "@/lib/types";

// ── Mocked Supabase client ─────────────────────────────────────────────────────
// A tiny in-memory stand-in for the cloud tables. `select().eq()` resolves with
// `{ data, error }` and `upsert()` records the written row, mirroring the real
// PostgREST client closely enough to exercise the sync logic.

type Cloud = { folders: CloudFolderRow[]; snippets: CloudSnippetRow[] };
const cloud: Cloud = { folders: [], snippets: [] };

const fakeClient = {
  from(table: "folders" | "snippets") {
    return {
      select() {
        return {
          eq(_column: string, value: string) {
            const data = (cloud[table] as Array<{ owner_id: string }>).filter(
              (row) => row.owner_id === value
            );
            return Promise.resolve({ data, error: null });
          },
        };
      },
      upsert(row: CloudFolderRow | CloudSnippetRow) {
        const rows = cloud[table] as Array<{ id: string }>;
        const index = rows.findIndex((existing) => existing.id === row.id);
        if (index >= 0) rows[index] = row as never;
        else rows.push(row as never);
        return Promise.resolve({ error: null });
      },
    };
  },
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => fakeClient,
}));

import { db } from "@/lib/db";
import { fetchCloudWorkspace, syncDirtyWorkspace } from "@/lib/sync";

const USER = "user-1";

let counter = 0;
function uid() {
  return `id-${++counter}`;
}

function makeSnippet(overrides: Partial<SnippetRecord> = {}): SnippetRecord {
  return {
    id: uid(),
    ownerId: USER,
    folderId: null,
    title: "Snippet",
    code: 'console.log("hi")',
    language: "javascript",
    isPinnedAside: false,
    isPinnedHome: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    dirty: false,
    lastSyncedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeFolder(overrides: Partial<FolderRecord> = {}): FolderRecord {
  return {
    id: uid(),
    ownerId: USER,
    name: "Folder",
    parentId: null,
    isPinnedAside: false,
    isPinnedHome: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    dirty: false,
    lastSyncedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function cloudFolder(folder: FolderRecord): CloudFolderRow {
  return {
    id: folder.id,
    owner_id: USER,
    name: folder.name,
    parent_id: folder.parentId,
    is_pinned_aside: folder.isPinnedAside,
    is_pinned_home: folder.isPinnedHome,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
  };
}

beforeEach(async () => {
  await db.folders.clear();
  await db.snippets.clear();
  cloud.folders = [];
  cloud.snippets = [];
});

// ── Delete propagation (reconciliation) ─────────────────────────────────────────

describe("fetchCloudWorkspace() deletion reconciliation", () => {
  it("removes previously-synced local records that are absent from the cloud", async () => {
    const present = makeFolder();
    const deletedRemotely = makeFolder();
    await db.folders.bulkAdd([present, deletedRemotely]);

    const deletedSnippet = makeSnippet();
    await db.snippets.add(deletedSnippet);

    // Cloud still has `present`, but the other two were deleted on another device.
    cloud.folders = [cloudFolder(present)];
    cloud.snippets = [];

    await fetchCloudWorkspace(USER);

    expect(await db.folders.get(present.id)).toBeDefined();
    expect(await db.folders.get(deletedRemotely.id)).toBeUndefined();
    expect(await db.snippets.get(deletedSnippet.id)).toBeUndefined();
  });

  it("keeps dirty, never-synced, and shared records during reconciliation", async () => {
    const dirty = makeSnippet({ dirty: true });
    const neverSynced = makeSnippet({ dirty: false, lastSyncedAt: null });
    const seed = makeSnippet({ ownerId: null });
    await db.snippets.bulkAdd([dirty, neverSynced, seed]);

    cloud.folders = [];
    cloud.snippets = [];

    await fetchCloudWorkspace(USER);

    expect(await db.snippets.get(dirty.id)).toBeDefined();
    expect(await db.snippets.get(neverSynced.id)).toBeDefined();
    expect(await db.snippets.get(seed.id)).toBeDefined();
  });
});

// ── Clearing a snippet's code ───────────────────────────────────────────────────

describe("syncDirtyWorkspace() empty-code handling", () => {
  it("uploads an intentionally cleared body for a previously-synced snippet", async () => {
    const cleared = makeSnippet({ code: "", dirty: true, lastSyncedAt: "2024-01-01T00:00:00.000Z" });
    await db.snippets.add(cleared);

    const result = await syncDirtyWorkspace(USER);

    const uploaded = cloud.snippets.find((row) => row.id === cleared.id);
    expect(uploaded).toBeDefined();
    expect(uploaded?.code).toBe("");
    expect(result.syncedSnippetIds).toContain(cleared.id);
    expect((await db.snippets.get(cleared.id))?.dirty).toBe(false);
  });

  it("settles a brand-new empty placeholder locally without uploading it", async () => {
    const placeholder = makeSnippet({ code: "", dirty: true, lastSyncedAt: null });
    await db.snippets.add(placeholder);

    const result = await syncDirtyWorkspace(USER);

    expect(cloud.snippets.find((row) => row.id === placeholder.id)).toBeUndefined();
    expect(result.localSnippetIds).toContain(placeholder.id);

    const stored = await db.snippets.get(placeholder.id);
    expect(stored?.dirty).toBe(false);
    expect(stored?.lastSyncedAt).toBeNull();
  });
});
