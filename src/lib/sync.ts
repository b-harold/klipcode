import { db, getDirtyWorkspace, getPendingTombstones } from "@/lib/db";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type {
  CloudFolderRow,
  CloudSnippetRow,
  FolderRecord,
  SnippetRecord,
  SyncResult,
} from "@/lib/types";

function folderDepth(folder: FolderRecord, folderMap: Map<string, FolderRecord>): number {
  let depth = 0;
  let currentParentId = folder.parentId;

  while (currentParentId) {
    const parent = folderMap.get(currentParentId);

    if (!parent) {
      break;
    }

    depth += 1;
    currentParentId = parent.parentId;
  }

  return depth;
}

function mapFolderToCloud(folder: FolderRecord, userId: string) {
  return {
    id: folder.id,
    owner_id: userId,
    name: folder.name,
    parent_id: folder.parentId,
    is_pinned_aside: folder.isPinnedAside,
    is_pinned_home: folder.isPinnedHome,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
  };
}

function mapSnippetToCloud(snippet: SnippetRecord, userId: string) {
  return {
    id: snippet.id,
    owner_id: userId,
    folder_id: snippet.folderId,
    title: snippet.title,
    code: snippet.code,
    language: snippet.language,
    is_pinned_aside: snippet.isPinnedAside,
    is_pinned_home: snippet.isPinnedHome,
    created_at: snippet.createdAt,
    updated_at: snippet.updatedAt,
  };
}

function mapFolderToLocal(folder: CloudFolderRow): FolderRecord {
  return {
    id: folder.id,
    ownerId: folder.owner_id,
    name: folder.name,
    parentId: folder.parent_id,
    isPinnedAside: folder.is_pinned_aside,
    isPinnedHome: folder.is_pinned_home,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
    dirty: false,
    lastSyncedAt: folder.updated_at,
  };
}

function mapSnippetToLocal(snippet: CloudSnippetRow): SnippetRecord {
  return {
    id: snippet.id,
    ownerId: snippet.owner_id,
    folderId: snippet.folder_id,
    title: snippet.title,
    code: snippet.code,
    language: snippet.language,
    isPinnedAside: snippet.is_pinned_aside,
    isPinnedHome: snippet.is_pinned_home,
    createdAt: snippet.created_at,
    updatedAt: snippet.updated_at,
    dirty: false,
    lastSyncedAt: snippet.updated_at,
  };
}

async function markFolderAsSynced(folder: FolderRecord, userId: string, syncedAt: string): Promise<boolean> {
  const currentFolder = await db.folders.get(folder.id);

  if (!currentFolder || currentFolder.updatedAt !== folder.updatedAt) {
    return false;
  }

  await db.folders.put({
    ...currentFolder,
    ownerId: userId,
    dirty: false,
    lastSyncedAt: syncedAt,
  });
  return true;
}

async function markSnippetAsSynced(
  snippet: SnippetRecord,
  userId: string,
  syncedAt: string
): Promise<boolean> {
  const currentSnippet = await db.snippets.get(snippet.id);

  if (!currentSnippet || currentSnippet.updatedAt !== snippet.updatedAt) {
    return false;
  }

  await db.snippets.put({
    ...currentSnippet,
    ownerId: userId,
    dirty: false,
    lastSyncedAt: syncedAt,
  });
  return true;
}

/**
 * Settle a snippet that has no cloud counterpart (a brand-new, still-empty
 * placeholder) without claiming a cloud sync. Clearing `dirty` stops the retry
 * loop, while keeping `lastSyncedAt` null marks it as never-uploaded so the
 * deletion reconciliation in `fetchCloudWorkspace` won't mistake it for a row
 * that was deleted remotely.
 */
async function markSnippetSettledLocally(snippet: SnippetRecord): Promise<boolean> {
  const currentSnippet = await db.snippets.get(snippet.id);

  if (!currentSnippet || currentSnippet.updatedAt !== snippet.updatedAt) {
    return false;
  }

  await db.snippets.put({
    ...currentSnippet,
    dirty: false,
  });
  return true;
}

export async function syncDirtyWorkspace(userId: string): Promise<SyncResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { syncedFolderIds: [], syncedSnippetIds: [], localSnippetIds: [] };
  }

  const dirtyWorkspace = await getDirtyWorkspace(userId);
  const folderMap = new Map(dirtyWorkspace.folders.map((folder) => [folder.id, folder]));
  const syncedFolderIds: string[] = [];
  const syncedSnippetIds: string[] = [];
  const localSnippetIds: string[] = [];

  // Folders are upserted one depth level at a time (shallowest first). The cloud
  // FK `(owner_id, parent_id) → folders(owner_id, id)` means a child can't land
  // before its parent, but folders at the same depth are independent and go up in
  // a single batched upsert — so N folders become at most (max depth) round trips.
  const foldersByDepth = new Map<number, FolderRecord[]>();
  for (const folder of dirtyWorkspace.folders) {
    const depth = folderDepth(folder, folderMap);
    const bucket = foldersByDepth.get(depth);
    if (bucket) {
      bucket.push(folder);
    } else {
      foldersByDepth.set(depth, [folder]);
    }
  }

  for (const depth of [...foldersByDepth.keys()].sort((left, right) => left - right)) {
    const levelFolders = foldersByDepth.get(depth)!;

    const { error } = await supabase
      .from("folders")
      .upsert(levelFolders.map((folder) => mapFolderToCloud(folder, userId)), { onConflict: "id" });

    if (error) {
      throw error;
    }

    const syncedAt = new Date().toISOString();
    for (const folder of levelFolders) {
      const marked = await markFolderAsSynced(folder, userId, syncedAt);
      if (marked) syncedFolderIds.push(folder.id);
    }
  }

  // Snippets have no inter-snippet dependency, so the whole dirty set goes up in
  // one upsert. Still-empty, never-uploaded placeholders are settled locally
  // instead (no cloud row); once a snippet HAS been synced, an empty body is an
  // intentional clear and must be uploaded — otherwise the next fetch resurrects
  // the old content.
  const snippetsToUpload: SnippetRecord[] = [];
  for (const snippet of dirtyWorkspace.snippets) {
    if (!snippet.code.trim() && snippet.lastSyncedAt === null) {
      const marked = await markSnippetSettledLocally(snippet);
      if (marked) localSnippetIds.push(snippet.id);
    } else {
      snippetsToUpload.push(snippet);
    }
  }

  if (snippetsToUpload.length > 0) {
    const { error } = await supabase
      .from("snippets")
      .upsert(snippetsToUpload.map((snippet) => mapSnippetToCloud(snippet, userId)), {
        onConflict: "id",
      });

    if (error) {
      throw error;
    }

    const syncedAt = new Date().toISOString();
    for (const snippet of snippetsToUpload) {
      const marked = await markSnippetAsSynced(snippet, userId, syncedAt);
      if (marked) syncedSnippetIds.push(snippet.id);
    }
  }

  return { syncedFolderIds, syncedSnippetIds, localSnippetIds };
}

export async function fetchCloudWorkspace(userId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const [{ data: folders, error: foldersError }, { data: snippets, error: snippetsError }] =
    await Promise.all([
      supabase
        .from("folders")
        .select("id, owner_id, name, parent_id, is_pinned_aside, is_pinned_home, created_at, updated_at")
        .eq("owner_id", userId),
      supabase
        .from("snippets")
        .select(
          "id, owner_id, folder_id, title, code, language, is_pinned_aside, is_pinned_home, created_at, updated_at"
        )
        .eq("owner_id", userId),
    ]);

  if (foldersError) {
    throw foldersError;
  }

  if (snippetsError) {
    throw snippetsError;
  }

  // A record we deleted locally but whose cloud delete is still pending must not
  // be re-downloaded, or it would resurrect until the queued delete lands.
  const tombstonedIds = new Set((await getPendingTombstones(userId)).map((t) => t.id));

  // Read the local tables once, diff in memory, then write everything in a single
  // bulkPut per table — instead of a get + put round trip for every cloud row.
  const [localFolders, localSnippets] = await Promise.all([
    db.folders.toArray(),
    db.snippets.toArray(),
  ]);
  const localFolderMap = new Map(localFolders.map((folder) => [folder.id, folder]));
  const localSnippetMap = new Map(localSnippets.map((snippet) => [snippet.id, snippet]));

  const foldersToPut: FolderRecord[] = [];
  for (const folderRow of folders as CloudFolderRow[]) {
    const incomingFolder = mapFolderToLocal(folderRow);

    if (tombstonedIds.has(incomingFolder.id)) {
      continue;
    }

    const currentFolder = localFolderMap.get(incomingFolder.id);

    if (currentFolder?.dirty && currentFolder.updatedAt >= incomingFolder.updatedAt) {
      continue;
    }

    foldersToPut.push(incomingFolder);
  }

  const snippetsToPut: SnippetRecord[] = [];
  for (const snippetRow of snippets as CloudSnippetRow[]) {
    const incomingSnippet = mapSnippetToLocal(snippetRow);

    if (tombstonedIds.has(incomingSnippet.id)) {
      continue;
    }

    const currentSnippet = localSnippetMap.get(incomingSnippet.id);

    if (currentSnippet?.dirty && currentSnippet.updatedAt >= incomingSnippet.updatedAt) {
      continue;
    }

    snippetsToPut.push(incomingSnippet);
  }

  if (foldersToPut.length > 0) {
    await db.folders.bulkPut(foldersToPut);
  }

  if (snippetsToPut.length > 0) {
    await db.snippets.bulkPut(snippetsToPut);
  }

  // Reuse the snapshot read above for deletion reconciliation. A record absent
  // from the cloud is unaffected by the puts (which only touch cloud-present
  // rows), so the pre-put snapshot yields the correct deletion set.
  await reconcileDeletions(
    userId,
    new Set((folders as CloudFolderRow[]).map((folder) => folder.id)),
    new Set((snippets as CloudSnippetRow[]).map((snippet) => snippet.id)),
    localFolders,
    localSnippets
  );
}

/**
 * Propagate remote deletions to this device. A local record that we own, that
 * has no pending local changes, and that we have uploaded before (`lastSyncedAt`
 * is set) but is now absent from the cloud was deleted on another device, so we
 * remove it locally. Dirty records (unsynced local edits), never-uploaded
 * placeholders, and shared/seeded records (`ownerId === null`) are left intact.
 */
async function reconcileDeletions(
  userId: string,
  cloudFolderIds: Set<string>,
  cloudSnippetIds: Set<string>,
  localFoldersSnapshot?: FolderRecord[],
  localSnippetsSnapshot?: SnippetRecord[]
) {
  const [allFolders, allSnippets] = localFoldersSnapshot && localSnippetsSnapshot
    ? [localFoldersSnapshot, localSnippetsSnapshot]
    : await Promise.all([db.folders.toArray(), db.snippets.toArray()]);

  const localFolders = allFolders.filter((folder) => folder.ownerId === userId);
  const localSnippets = allSnippets.filter((snippet) => snippet.ownerId === userId);

  const foldersToDelete = localFolders
    .filter((folder) => !folder.dirty && folder.lastSyncedAt !== null && !cloudFolderIds.has(folder.id))
    .map((folder) => folder.id);

  const snippetsToDelete = localSnippets
    .filter((snippet) => !snippet.dirty && snippet.lastSyncedAt !== null && !cloudSnippetIds.has(snippet.id))
    .map((snippet) => snippet.id);

  if (foldersToDelete.length > 0) {
    await db.folders.bulkDelete(foldersToDelete);
  }

  if (snippetsToDelete.length > 0) {
    await db.snippets.bulkDelete(snippetsToDelete);
  }
}

/**
 * Queue cloud deletions for owned, previously-synced records that were just
 * removed locally. The tombstones are flushed by `syncTombstones` (immediately
 * via the sync loop, and retried if the cloud delete fails).
 */
export async function recordDeletions(
  ownerId: string,
  items: Array<{ id: string; kind: "folder" | "snippet" }>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const deletedAt = new Date().toISOString();
  await db.tombstones.bulkPut(
    items.map((item) => ({ id: item.id, kind: item.kind, ownerId, deletedAt }))
  );
}

/**
 * Flush queued deletions to the cloud. Snippets are removed before folders so a
 * folder removal never strands a child row. Each tombstone is cleared only once
 * its cloud delete succeeds; a failure leaves it queued for the next attempt.
 */
export async function syncTombstones(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const tombstones = await getPendingTombstones(userId);

  if (tombstones.length === 0) {
    return;
  }

  const snippetIds = tombstones.filter((t) => t.kind === "snippet").map((t) => t.id);
  const folderIds = tombstones.filter((t) => t.kind === "folder").map((t) => t.id);

  if (snippetIds.length > 0) {
    const { error } = await supabase.from("snippets").delete().in("id", snippetIds);
    if (error) {
      throw error;
    }
    await db.tombstones.bulkDelete(snippetIds);
  }

  if (folderIds.length > 0) {
    const { error } = await supabase.from("folders").delete().in("id", folderIds);
    if (error) {
      throw error;
    }
    await db.tombstones.bulkDelete(folderIds);
  }
}

/**
 * On sign-in, take over any anonymous (`ownerId === null`) local records —
 * including the seeded welcome content, which is created `dirty: false` — by
 * assigning them to the account and marking them dirty so the next push uploads
 * them. Without this the seed stays visible locally but never reaches the cloud
 * or other devices.
 */
async function claimAnonymousRecords(userId: string): Promise<void> {
  const [folders, snippets] = await Promise.all([
    db.folders.toArray(),
    db.snippets.toArray(),
  ]);

  const anonymousFolders = folders.filter((folder) => folder.ownerId === null);
  const anonymousSnippets = snippets.filter((snippet) => snippet.ownerId === null);

  if (anonymousFolders.length > 0) {
    await db.folders.bulkPut(
      anonymousFolders.map((folder) => ({ ...folder, ownerId: userId, dirty: true }))
    );
  }

  if (anonymousSnippets.length > 0) {
    await db.snippets.bulkPut(
      anonymousSnippets.map((snippet) => ({ ...snippet, ownerId: userId, dirty: true }))
    );
  }
}

export async function reconcileWorkspace(userId: string) {
  await claimAnonymousRecords(userId);
  const result = await syncDirtyWorkspace(userId);
  await syncTombstones(userId);
  await fetchCloudWorkspace(userId);
  return result;
}