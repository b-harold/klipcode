import {
  CRYPTO_VERSION_PLAINTEXT,
  CURRENT_CRYPTO_VERSION,
  decryptString,
  encryptString,
} from "@/lib/crypto";
import { db, getDirtyWorkspace, getPendingTombstones } from "@/lib/db";
import { getWorkspaceEncryptionKey } from "@/lib/encryptionKey";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type {
  CloudFolderRow,
  CloudSnippetRow,
  FolderRecord,
  SnippetRecord,
  SyncResult,
} from "@/lib/types";

// ── Cloud encryption boundary ───────────────────────────────────────────────────
// IndexedDB stays plaintext (it's the local source of truth and must work
// offline); only what crosses to Supabase is encrypted. With a key, uploads
// write ciphertext + `crypto_version: 1`; without one (`null` = encryption not
// configured) they write plaintext + version 0, exactly the pre-encryption
// shape. Downloads decode per-row based on `crypto_version`, so plaintext
// legacy rows and encrypted rows coexist during the progressive migration.

/**
 * Whether a fetched row can be decoded here: plaintext always can; ciphertext
 * needs the key and a version this build understands. Undecodable rows are
 * skipped — never written locally as garbage, and never treated as deleted
 * (they stay in the cloud id sets used by `reconcileDeletions`).
 */
function canDecodeRow(cryptoVersion: number, key: CryptoKey | null): boolean {
  if (cryptoVersion === CRYPTO_VERSION_PLAINTEXT) return true;
  return cryptoVersion <= CURRENT_CRYPTO_VERSION && key !== null;
}

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

async function mapFolderToCloud(
  folder: FolderRecord,
  userId: string,
  key: CryptoKey | null
): Promise<CloudFolderRow> {
  return {
    id: folder.id,
    owner_id: userId,
    name: key ? await encryptString(key, folder.name) : folder.name,
    parent_id: folder.parentId,
    is_pinned_aside: folder.isPinnedAside,
    is_pinned_home: folder.isPinnedHome,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
    deleted_at: folder.deletedAt,
    crypto_version: key ? CURRENT_CRYPTO_VERSION : CRYPTO_VERSION_PLAINTEXT,
  };
}

async function mapSnippetToCloud(
  snippet: SnippetRecord,
  userId: string,
  key: CryptoKey | null
): Promise<CloudSnippetRow> {
  return {
    id: snippet.id,
    owner_id: userId,
    folder_id: snippet.folderId,
    title: key ? await encryptString(key, snippet.title) : snippet.title,
    code: key ? await encryptString(key, snippet.code) : snippet.code,
    language: snippet.language,
    is_pinned_aside: snippet.isPinnedAside,
    is_pinned_home: snippet.isPinnedHome,
    created_at: snippet.createdAt,
    updated_at: snippet.updatedAt,
    deleted_at: snippet.deletedAt,
    crypto_version: key ? CURRENT_CRYPTO_VERSION : CRYPTO_VERSION_PLAINTEXT,
  };
}

async function mapFolderToLocal(folder: CloudFolderRow, key: CryptoKey | null): Promise<FolderRecord> {
  const encrypted = folder.crypto_version !== CRYPTO_VERSION_PLAINTEXT;
  return {
    id: folder.id,
    ownerId: folder.owner_id,
    name: encrypted ? await decryptString(key!, folder.name) : folder.name,
    parentId: folder.parent_id,
    isPinnedAside: folder.is_pinned_aside,
    isPinnedHome: folder.is_pinned_home,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
    dirty: false,
    lastSyncedAt: folder.updated_at,
    deletedAt: folder.deleted_at,
  };
}

async function mapSnippetToLocal(snippet: CloudSnippetRow, key: CryptoKey | null): Promise<SnippetRecord> {
  const encrypted = snippet.crypto_version !== CRYPTO_VERSION_PLAINTEXT;
  return {
    id: snippet.id,
    ownerId: snippet.owner_id,
    folderId: snippet.folder_id,
    title: encrypted ? await decryptString(key!, snippet.title) : snippet.title,
    code: encrypted ? await decryptString(key!, snippet.code) : snippet.code,
    language: snippet.language,
    isPinnedAside: snippet.is_pinned_aside,
    isPinnedHome: snippet.is_pinned_home,
    createdAt: snippet.created_at,
    updatedAt: snippet.updated_at,
    dirty: false,
    lastSyncedAt: snippet.updated_at,
    deletedAt: snippet.deleted_at,
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

  // Resolved before anything is uploaded: a transient key failure throws here
  // and aborts the whole push (retried by the sync loop) — records are never
  // silently uploaded in plaintext because the key was momentarily unreachable.
  const encryptionKey =
    dirtyWorkspace.folders.length > 0 || dirtyWorkspace.snippets.length > 0
      ? await getWorkspaceEncryptionKey(userId)
      : null;

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
      .upsert(
        await Promise.all(levelFolders.map((folder) => mapFolderToCloud(folder, userId, encryptionKey))),
        { onConflict: "id" }
      );

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
      .upsert(
        await Promise.all(
          snippetsToUpload.map((snippet) => mapSnippetToCloud(snippet, userId, encryptionKey))
        ),
        { onConflict: "id" }
      );

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
        .select(
          "id, owner_id, name, parent_id, is_pinned_aside, is_pinned_home, created_at, updated_at, deleted_at, crypto_version"
        )
        .eq("owner_id", userId),
      supabase
        .from("snippets")
        .select(
          "id, owner_id, folder_id, title, code, language, is_pinned_aside, is_pinned_home, created_at, updated_at, deleted_at, crypto_version"
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

  const folderRows = folders as CloudFolderRow[];
  const snippetRows = snippets as CloudSnippetRow[];

  // The key is only fetched when some row actually needs decrypting, so
  // plaintext-only workspaces never hit the key endpoint on pull. A transient
  // key failure throws and fails the whole pull (retried later) rather than
  // partially applying it.
  const hasEncryptedRows =
    folderRows.some((row) => row.crypto_version !== CRYPTO_VERSION_PLAINTEXT) ||
    snippetRows.some((row) => row.crypto_version !== CRYPTO_VERSION_PLAINTEXT);
  const encryptionKey = hasEncryptedRows ? await getWorkspaceEncryptionKey(userId) : null;

  const foldersToPut: FolderRecord[] = [];
  for (const folderRow of folderRows) {
    if (!canDecodeRow(folderRow.crypto_version, encryptionKey)) {
      console.warn(`Skipping folder ${folderRow.id}: undecodable crypto_version ${folderRow.crypto_version}`);
      continue;
    }

    let incomingFolder: FolderRecord;
    try {
      incomingFolder = await mapFolderToLocal(folderRow, encryptionKey);
    } catch {
      console.warn(`Skipping folder ${folderRow.id}: decryption failed`);
      continue;
    }

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
  for (const snippetRow of snippetRows) {
    if (!canDecodeRow(snippetRow.crypto_version, encryptionKey)) {
      console.warn(`Skipping snippet ${snippetRow.id}: undecodable crypto_version ${snippetRow.crypto_version}`);
      continue;
    }

    let incomingSnippet: SnippetRecord;
    try {
      incomingSnippet = await mapSnippetToLocal(snippetRow, encryptionKey);
    } catch {
      console.warn(`Skipping snippet ${snippetRow.id}: decryption failed`);
      continue;
    }

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
 * Trashed records are NOT special-cased: a soft delete keeps the cloud row (with
 * `deleted_at` set), so it stays present here; only a permanent delete removes the
 * cloud row, and that deletion must propagate even if the record is in the trash.
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
 * Whether the signed-in account already has any cloud rows. Distinguishes a
 * brand-new account (the seeded welcome content should be claimed and uploaded)
 * from a returning one (an untouched seed must be discarded, not re-uploaded).
 * A query failure resolves to false so sign-in falls back to claiming — the
 * direction that never destroys data.
 */
async function accountHasCloudContent(userId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return false;
  }

  try {
    const [{ data: folderRows }, { data: snippetRows }] = await Promise.all([
      supabase.from("folders").select("id").eq("owner_id", userId).limit(1),
      supabase.from("snippets").select("id").eq("owner_id", userId).limit(1),
    ]);

    return (folderRows?.length ?? 0) > 0 || (snippetRows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * On sign-in, take over any anonymous (`ownerId === null`) local records by
 * assigning them to the account and marking them dirty so the next push uploads
 * them. Without this, anonymous work stays visible locally but never reaches
 * the cloud or other devices.
 *
 * The seeded welcome content is the exception: it is created `dirty: false`
 * with no `lastSyncedAt`, and since every user action marks a record dirty, a
 * still-pristine anonymous record can only be the untouched seed. For a
 * brand-new account (no cloud rows) the seed is claimed like everything else;
 * for a returning account it is deleted locally instead, so signing in from a
 * fresh device doesn't push yet another welcome folder into an existing
 * workspace.
 */
async function claimAnonymousRecords(userId: string): Promise<void> {
  const [folders, snippets] = await Promise.all([
    db.folders.toArray(),
    db.snippets.toArray(),
  ]);

  let anonymousFolders = folders.filter((folder) => folder.ownerId === null);
  let anonymousSnippets = snippets.filter((snippet) => snippet.ownerId === null);

  if (anonymousFolders.length === 0 && anonymousSnippets.length === 0) {
    return;
  }

  const isPristineSeed = (record: FolderRecord | SnippetRecord) =>
    !record.dirty && record.lastSyncedAt === null;

  const hasPristineSeed =
    anonymousFolders.some(isPristineSeed) || anonymousSnippets.some(isPristineSeed);

  if (hasPristineSeed && (await accountHasCloudContent(userId))) {
    const seedSnippetIds = new Set(
      anonymousSnippets.filter(isPristineSeed).map((snippet) => snippet.id)
    );

    // A pristine folder is only dropped when nothing kept (a dirty anonymous
    // record or an owned one) still lives inside it; iterate so parents
    // emptied by a dropped child fall too.
    const remainingSnippets = snippets.filter((snippet) => !seedSnippetIds.has(snippet.id));
    let remainingFolders = folders;
    const seedFolderIds = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const folder of remainingFolders) {
        if (folder.ownerId !== null || !isPristineSeed(folder)) continue;
        const hasChild =
          remainingFolders.some((other) => other.parentId === folder.id) ||
          remainingSnippets.some((snippet) => snippet.folderId === folder.id);
        if (!hasChild) {
          seedFolderIds.add(folder.id);
          remainingFolders = remainingFolders.filter((other) => other.id !== folder.id);
          changed = true;
        }
      }
    }

    if (seedSnippetIds.size > 0) {
      await db.snippets.bulkDelete([...seedSnippetIds]);
    }
    if (seedFolderIds.size > 0) {
      await db.folders.bulkDelete([...seedFolderIds]);
    }

    anonymousFolders = anonymousFolders.filter((folder) => !seedFolderIds.has(folder.id));
    anonymousSnippets = anonymousSnippets.filter((snippet) => !seedSnippetIds.has(snippet.id));
  }

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