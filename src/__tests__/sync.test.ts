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
            // Thenable like the real PostgREST builder, with `.limit()` support.
            return Object.assign(Promise.resolve({ data, error: null }), {
              limit(count: number) {
                return Promise.resolve({ data: data.slice(0, count), error: null });
              },
            });
          },
        };
      },
      upsert(rowOrRows: CloudFolderRow | CloudSnippetRow | Array<CloudFolderRow | CloudSnippetRow>) {
        const rows = cloud[table] as Array<{ id: string }>;
        const incoming = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        for (const row of incoming) {
          const index = rows.findIndex((existing) => existing.id === row.id);
          if (index >= 0) rows[index] = row as never;
          else rows.push(row as never);
        }
        return Promise.resolve({ error: null });
      },
      delete() {
        const remove = (predicate: (row: { id: string }) => boolean) => {
          cloud[table] = (cloud[table] as Array<{ id: string }>).filter(
            (row) => !predicate(row)
          ) as never;
          return Promise.resolve({ error: null });
        };
        return {
          eq(_column: string, value: string) {
            return remove((row) => row.id === value);
          },
          in(_column: string, values: string[]) {
            return remove((row) => values.includes(row.id));
          },
        };
      },
    };
  },
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => fakeClient,
}));

import { db } from "@/lib/db";
import {
  fetchCloudWorkspace,
  recordDeletions,
  reconcileWorkspace,
  syncDirtyWorkspace,
  syncTombstones,
} from "@/lib/sync";

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
    deletedAt: null,
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
    deletedAt: null,
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
    deleted_at: folder.deletedAt,
  };
}

function cloudSnippet(snippet: SnippetRecord): CloudSnippetRow {
  return {
    id: snippet.id,
    owner_id: USER,
    folder_id: snippet.folderId,
    title: snippet.title,
    code: snippet.code,
    language: snippet.language,
    is_pinned_aside: snippet.isPinnedAside,
    is_pinned_home: snippet.isPinnedHome,
    created_at: snippet.createdAt,
    updated_at: snippet.updatedAt,
    deleted_at: snippet.deletedAt,
  };
}

beforeEach(async () => {
  await db.folders.clear();
  await db.snippets.clear();
  await db.tombstones.clear();
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

  it("propagates a permanent delete (cloud row absent) even for a trashed record", async () => {
    // Soft delete keeps the cloud row; an absent row means a permanent delete on
    // another device, which must be applied locally even if it's still trashed.
    const trashedFolder = makeFolder({ deletedAt: "2024-02-01T00:00:00.000Z" });
    const trashedSnippet = makeSnippet({ deletedAt: "2024-02-01T00:00:00.000Z" });
    await db.folders.add(trashedFolder);
    await db.snippets.add(trashedSnippet);

    cloud.folders = [];
    cloud.snippets = [];

    await fetchCloudWorkspace(USER);

    expect(await db.folders.get(trashedFolder.id)).toBeUndefined();
    expect(await db.snippets.get(trashedSnippet.id)).toBeUndefined();
  });

  it("syncs the trash state down: a cloud deleted_at marks the local record trashed", async () => {
    const live = makeSnippet({ deletedAt: null });
    await db.snippets.add(live);
    // Same row, now soft-deleted on another device (deleted_at set, newer).
    cloud.snippets = [cloudSnippet({ ...live, deletedAt: "2024-03-01T00:00:00.000Z", updatedAt: "2024-03-01T00:00:00.000Z" })];

    await fetchCloudWorkspace(USER);

    expect((await db.snippets.get(live.id))?.deletedAt).toBe("2024-03-01T00:00:00.000Z");
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

// ── Batched uploads ─────────────────────────────────────────────────────────────

describe("syncDirtyWorkspace() batching", () => {
  it("uploads every dirty snippet in one pass and clears their dirty flag", async () => {
    const a = makeSnippet({ dirty: true });
    const b = makeSnippet({ dirty: true });
    const c = makeSnippet({ dirty: true });
    await db.snippets.bulkAdd([a, b, c]);

    const result = await syncDirtyWorkspace(USER);

    expect(result.syncedSnippetIds).toEqual(expect.arrayContaining([a.id, b.id, c.id]));
    for (const id of [a.id, b.id, c.id]) {
      expect(cloud.snippets.find((row) => row.id === id)).toBeDefined();
      expect((await db.snippets.get(id))?.dirty).toBe(false);
    }
  });

  it("uploads nested folders parent-before-child across depth levels", async () => {
    const root = makeFolder({ dirty: true, parentId: null });
    const child = makeFolder({ dirty: true, parentId: root.id });
    const grandchild = makeFolder({ dirty: true, parentId: child.id });
    // Insert out of order to prove ordering comes from depth, not insertion.
    await db.folders.bulkAdd([grandchild, root, child]);

    const result = await syncDirtyWorkspace(USER);

    expect(result.syncedFolderIds).toEqual(expect.arrayContaining([root.id, child.id, grandchild.id]));
    const order = cloud.folders.map((row) => row.id);
    expect(order.indexOf(root.id)).toBeLessThan(order.indexOf(child.id));
    expect(order.indexOf(child.id)).toBeLessThan(order.indexOf(grandchild.id));
  });
});

// ── Tombstones (deletion queue) ─────────────────────────────────────────────────

describe("syncTombstones() + fetchCloudWorkspace()", () => {
  it("deletes the cloud row and clears the tombstone on success", async () => {
    const snippet = makeSnippet();
    cloud.snippets = [cloudSnippet(snippet)];
    await recordDeletions(USER, [{ id: snippet.id, kind: "snippet" }]);

    await syncTombstones(USER);

    expect(cloud.snippets.find((row) => row.id === snippet.id)).toBeUndefined();
    expect(await db.tombstones.get(snippet.id)).toBeUndefined();
  });

  it("does not resurrect a tombstoned row while its delete is still pending", async () => {
    // The cloud delete failed earlier, so the row is still in the cloud and a
    // tombstone is queued. A pull must not re-download it.
    const snippet = makeSnippet();
    cloud.snippets = [cloudSnippet(snippet)];
    await recordDeletions(USER, [{ id: snippet.id, kind: "snippet" }]);

    await fetchCloudWorkspace(USER);

    expect(await db.snippets.get(snippet.id)).toBeUndefined();
    expect(await db.tombstones.get(snippet.id)).toBeDefined();
  });
});

// ── Claiming anonymous/seed content on sign-in ──────────────────────────────────

describe("reconcileWorkspace() anonymous claim", () => {
  it("uploads seed (ownerId null, clean) records and assigns them to the account", async () => {
    const seedFolder = makeFolder({ ownerId: null, dirty: false, lastSyncedAt: null });
    const seedSnippet = makeSnippet({
      ownerId: null,
      dirty: false,
      lastSyncedAt: null,
      folderId: seedFolder.id,
    });
    await db.folders.add(seedFolder);
    await db.snippets.add(seedSnippet);

    await reconcileWorkspace(USER);

    expect(cloud.folders.find((row) => row.id === seedFolder.id)?.owner_id).toBe(USER);
    expect(cloud.snippets.find((row) => row.id === seedSnippet.id)?.owner_id).toBe(USER);

    const localSnippet = await db.snippets.get(seedSnippet.id);
    expect(localSnippet?.ownerId).toBe(USER);
    expect(localSnippet?.dirty).toBe(false);
    expect(localSnippet?.lastSyncedAt).not.toBeNull();
  });

  it("discards an untouched seed instead of claiming it when the account already has cloud content", async () => {
    // The account was used before: a returning sign-in, not a new user.
    const existing = makeSnippet();
    cloud.snippets = [cloudSnippet(existing)];

    const seedFolder = makeFolder({ ownerId: null, dirty: false, lastSyncedAt: null });
    const seedSnippet = makeSnippet({
      ownerId: null,
      dirty: false,
      lastSyncedAt: null,
      folderId: seedFolder.id,
    });
    await db.folders.add(seedFolder);
    await db.snippets.add(seedSnippet);

    await reconcileWorkspace(USER);

    // The seed never reaches the cloud and is gone locally too.
    expect(cloud.folders.find((row) => row.id === seedFolder.id)).toBeUndefined();
    expect(cloud.snippets.find((row) => row.id === seedSnippet.id)).toBeUndefined();
    expect(await db.folders.get(seedFolder.id)).toBeUndefined();
    expect(await db.snippets.get(seedSnippet.id)).toBeUndefined();

    // The existing cloud content is pulled down as usual.
    expect(await db.snippets.get(existing.id)).toBeDefined();
  });

  it("keeps the seed folder when it holds real anonymous work, discarding only pristine records", async () => {
    const existing = makeSnippet();
    cloud.snippets = [cloudSnippet(existing)];

    const seedFolder = makeFolder({ ownerId: null, dirty: false, lastSyncedAt: null });
    const seedSnippet = makeSnippet({
      ownerId: null,
      dirty: false,
      lastSyncedAt: null,
      folderId: seedFolder.id,
    });
    // The user edited/created this one while anonymous, so it is dirty.
    const editedSnippet = makeSnippet({
      ownerId: null,
      dirty: true,
      lastSyncedAt: null,
      folderId: seedFolder.id,
    });
    await db.folders.add(seedFolder);
    await db.snippets.bulkAdd([seedSnippet, editedSnippet]);

    await reconcileWorkspace(USER);

    // The pristine seed snippet is dropped, but the folder survives (it still
    // holds real work) and is claimed together with the edited snippet.
    expect(await db.snippets.get(seedSnippet.id)).toBeUndefined();
    expect(cloud.snippets.find((row) => row.id === seedSnippet.id)).toBeUndefined();

    expect(cloud.folders.find((row) => row.id === seedFolder.id)?.owner_id).toBe(USER);
    expect(cloud.snippets.find((row) => row.id === editedSnippet.id)?.owner_id).toBe(USER);
    expect((await db.snippets.get(editedSnippet.id))?.ownerId).toBe(USER);
  });
});
