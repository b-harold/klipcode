import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { db, readTrash } from "@/lib/db";
import { recordDeletions } from "@/lib/sync";
import type { ClipboardEntry, FolderRecord, SnippetRecord, SyncStatus } from "@/lib/types";
import { DEFAULT_LANGUAGE, detectLanguageFromTitle } from "@/lib/constants/languages";
import { DEBOUNCE_MS } from "@/lib/constants/timing";
import type { Dictionary } from "@/i18n";

interface UseWorkspaceMutationsOptions {
  copy: Dictionary;
  user: User | null;
  supabaseConfigured: boolean;
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  clipboard: ClipboardEntry | null;
  setClipboard: (entry: ClipboardEntry | null) => void;
  selectedSnippetId: string | null;
  setSelectedSnippetId: (id: string | null) => void;
  refreshWorkspace: () => void;
  patchSnippetInCache: (id: string, changes: Partial<SnippetRecord>) => void;
  scheduleCloudSync: () => void;
  settleLocally: (snippetId: string) => void;
  setSnippetStatus: (snippetId: string, status: SyncStatus) => void;
}

export function useWorkspaceMutations({
  copy,
  user,
  supabaseConfigured,
  folders,
  snippets,
  clipboard,
  setClipboard,
  selectedSnippetId,
  setSelectedSnippetId,
  refreshWorkspace,
  patchSnippetInCache,
  scheduleCloudSync,
  settleLocally,
  setSnippetStatus,
}: UseWorkspaceMutationsOptions) {
  const updateTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = updateTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  function syncAfterMutation(snippetId?: string) {
    if (user && supabaseConfigured) {
      scheduleCloudSync();
    } else if (snippetId) {
      settleLocally(snippetId);
    }
  }

  /* ── Snippet CRUD ─────────────────────────────────────────────────────── */

  async function handleCreateSnippet(data: {
    title: string;
    language: string;
    folderId: string;
    code: string;
  }) {
    if (!data.code.trim()) return;

    const snippetId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await db.snippets.put({
      id: snippetId,
      ownerId: user?.id ?? null,
      folderId: data.folderId || null,
      title: data.title.trim() || copy.snippetCard.untitled,
      language: data.language.trim(),
      code: data.code,
      isPinnedAside: false,
      isPinnedHome: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      dirty: true,
      lastSyncedAt: null,
      deletedAt: null,
    });

    setSnippetStatus(snippetId, "editing");
    refreshWorkspace();
    syncAfterMutation(snippetId);
  }

  async function handleCreateSnippetInline(folderId: string | null, title: string) {
    const snippetId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await db.snippets.put({
      id: snippetId,
      ownerId: user?.id ?? null,
      folderId: folderId ?? null,
      title: title.trim() || copy.snippetCard.untitled,
      // Infer the syntax from a filename-style title (e.g. `style.css`) so the
      // user doesn't have to pick a language manually; fall back to the default.
      language: detectLanguageFromTitle(title) ?? DEFAULT_LANGUAGE,
      code: "",
      isPinnedAside: false,
      isPinnedHome: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      dirty: true,
      lastSyncedAt: null,
      deletedAt: null,
    });

    setSnippetStatus(snippetId, "editing");
    refreshWorkspace();
    setSelectedSnippetId(snippetId);
    syncAfterMutation(snippetId);
  }

  async function handleUpdateSnippet(
    snippetId: string,
    changes: { title?: string; code?: string; language?: string }
  ) {
    setSnippetStatus(snippetId, "editing");

    const existing = updateTimersRef.current.get(snippetId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      updateTimersRef.current.delete(snippetId);

      const updatedAt = new Date().toISOString();
      await db.snippets.update(snippetId, {
        ...changes,
        updatedAt,
        dirty: true,
      });

      // Patch the single record in the cache instead of invalidating (and thus
      // re-reading the entire workspace) on every debounced keystroke.
      patchSnippetInCache(snippetId, { ...changes, updatedAt, dirty: true });

      if (user && supabaseConfigured) {
        scheduleCloudSync();
      } else {
        settleLocally(snippetId);
      }
    }, DEBOUNCE_MS);

    updateTimersRef.current.set(snippetId, timer);
  }

  async function handleDeleteSnippet(id: string) {
    // Cancel any pending debounced update so it can't write the row back after
    // we trash it (and trigger a pointless cloud sync).
    const pendingTimer = updateTimersRef.current.get(id);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      updateTimersRef.current.delete(id);
    }

    const existing = await db.snippets.get(id);
    if (!existing) return;

    // Soft delete: mark it deleted and dirty so the trash state uploads as a
    // normal field change (the cloud row is kept, with deleted_at set, so the
    // trash syncs to other devices). It's hidden from the workspace either way.
    const now = new Date().toISOString();
    await db.snippets.update(id, { deletedAt: now, updatedAt: now, dirty: true });

    if (selectedSnippetId === id) setSelectedSnippetId(null);
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  /** Restore a trashed snippet. With `targetFolderId` (a drag-and-drop drop), it
   *  lands in that folder; otherwise it returns to its original folder, or to the
   *  root if that folder is gone or still trashed. */
  async function handleRestoreSnippet(id: string, targetFolderId?: string | null) {
    const snippet = await db.snippets.get(id);
    if (!snippet) return;

    let folderId: string | null;
    if (targetFolderId !== undefined) {
      folderId = targetFolderId;
    } else {
      folderId = snippet.folderId;
      if (folderId) {
        const parent = await db.folders.get(folderId);
        if (!parent || parent.deletedAt) folderId = null;
      }
    }

    const now = new Date().toISOString();
    await db.snippets.update(id, { deletedAt: null, folderId, dirty: true, updatedAt: now });

    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  /** Permanently remove a trashed snippet: purge it locally and queue the cloud
   *  delete (with retry via the tombstone) for records that reached the cloud. */
  async function handlePermanentlyDeleteSnippet(id: string) {
    const existing = await db.snippets.get(id);
    await db.snippets.delete(id);

    if (user && supabaseConfigured && existing?.lastSyncedAt != null) {
      await recordDeletions(user.id, [{ id, kind: "snippet" }]);
      scheduleCloudSync();
    }

    if (selectedSnippetId === id) setSelectedSnippetId(null);
    refreshWorkspace();
  }

  async function handleRenameSnippet(id: string, title: string) {
    await db.snippets.update(id, { title, updatedAt: new Date().toISOString(), dirty: true });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  async function handlePinSnippet(id: string, target: "aside" | "home", pinned: boolean) {
    const field = target === "aside" ? "isPinnedAside" : "isPinnedHome";
    await db.snippets.update(id, { [field]: pinned, updatedAt: new Date().toISOString(), dirty: true });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  async function handleMoveSnippet(id: string, newFolderId: string | null) {
    const snippet = snippets.find((s) => s.id === id);
    if (!snippet || snippet.folderId === newFolderId) return;
    await db.snippets.update(id, {
      folderId: newFolderId,
      updatedAt: new Date().toISOString(),
      dirty: true,
    });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  /* ── Folder CRUD ──────────────────────────────────────────────────────── */

  async function handleCreateFolder(parentId: string | null, name: string) {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    await db.folders.put({
      id,
      ownerId: user?.id ?? null,
      name,
      parentId,
      isPinnedAside: false,
      isPinnedHome: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      dirty: true,
      lastSyncedAt: null,
      deletedAt: null,
    });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  /** Collect a folder id and all of its descendant folder ids. */
  function collectFolderSubtree(rootId: string, allFolders: FolderRecord[]): Set<string> {
    const subtree = new Set<string>([rootId]);
    const queue = [rootId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const f of allFolders) {
        if (f.parentId === cur && !subtree.has(f.id)) {
          subtree.add(f.id);
          queue.push(f.id);
        }
      }
    }
    return subtree;
  }

  async function handleDeleteFolder(id: string) {
    const [allFolders, allSnippets] = await Promise.all([
      db.folders.toArray(),
      db.snippets.toArray(),
    ]);
    const subtree = collectFolderSubtree(id, allFolders);
    const snippetsInSubtree = allSnippets.filter((s) => s.folderId && subtree.has(s.folderId));
    const foldersInSubtree = allFolders.filter((f) => subtree.has(f.id));

    // Soft delete the whole subtree at once, marking each row dirty so the trash
    // state syncs to the cloud. Already-trashed descendants keep their original
    // deletion time so they don't jump to the top of the trash.
    const now = new Date().toISOString();
    await db.transaction("rw", [db.folders, db.snippets], async () => {
      await db.folders.bulkPut(
        foldersInSubtree.map((f) => ({ ...f, deletedAt: f.deletedAt ?? now, updatedAt: now, dirty: true }))
      );
      await db.snippets.bulkPut(
        snippetsInSubtree.map((s) => ({ ...s, deletedAt: s.deletedAt ?? now, updatedAt: now, dirty: true }))
      );
    });

    if (selectedSnippetId && snippetsInSubtree.some((s) => s.id === selectedSnippetId)) {
      setSelectedSnippetId(null);
    }

    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  /** Restore a trashed folder and every trashed record beneath it. With
   *  `targetParentId` (a drag-and-drop drop) the folder lands under that parent;
   *  otherwise it keeps its parent, detaching to the root if that parent is gone
   *  or still trashed. */
  async function handleRestoreFolder(id: string, targetParentId?: string | null) {
    const [allFolders, allSnippets] = await Promise.all([
      db.folders.toArray(),
      db.snippets.toArray(),
    ]);
    const folder = allFolders.find((f) => f.id === id);
    if (!folder) return;

    const subtree = collectFolderSubtree(id, allFolders);

    let parentId: string | null;
    if (targetParentId !== undefined && !subtree.has(targetParentId ?? "")) {
      parentId = targetParentId;
    } else {
      parentId = folder.parentId;
      if (parentId && !subtree.has(parentId)) {
        const parent = allFolders.find((f) => f.id === parentId);
        if (!parent || parent.deletedAt) parentId = null;
      }
    }

    const foldersToRestore = allFolders.filter((f) => subtree.has(f.id) && f.deletedAt);
    const snippetsToRestore = allSnippets.filter((s) => s.folderId && subtree.has(s.folderId) && s.deletedAt);

    const now = new Date().toISOString();
    await db.transaction("rw", [db.folders, db.snippets], async () => {
      await db.folders.bulkPut(
        foldersToRestore.map((f) => ({
          ...f,
          deletedAt: null,
          dirty: true,
          updatedAt: now,
          parentId: f.id === id ? parentId : f.parentId,
        }))
      );
      await db.snippets.bulkPut(
        snippetsToRestore.map((s) => ({ ...s, deletedAt: null, dirty: true, updatedAt: now }))
      );
    });

    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  /** Permanently remove a trashed folder and its subtree: purge locally and queue
   *  the cloud delete for the rows that reached the cloud. */
  async function handlePermanentlyDeleteFolder(id: string) {
    const [allFolders, allSnippets] = await Promise.all([
      db.folders.toArray(),
      db.snippets.toArray(),
    ]);
    const subtree = collectFolderSubtree(id, allFolders);
    const foldersInSubtree = allFolders.filter((f) => subtree.has(f.id));
    const snippetsInSubtree = allSnippets.filter((s) => s.folderId && subtree.has(s.folderId));
    const snippetIds = snippetsInSubtree.map((s) => s.id);

    await db.transaction("rw", [db.folders, db.snippets], async () => {
      await db.folders.bulkDelete([...subtree]);
      await db.snippets.bulkDelete(snippetIds);
    });

    if (user && supabaseConfigured) {
      const tombstones = [
        ...foldersInSubtree
          .filter((f) => f.lastSyncedAt != null)
          .map((f) => ({ id: f.id, kind: "folder" as const })),
        ...snippetsInSubtree
          .filter((s) => s.lastSyncedAt != null)
          .map((s) => ({ id: s.id, kind: "snippet" as const })),
      ];
      if (tombstones.length > 0) {
        await recordDeletions(user.id, tombstones);
        scheduleCloudSync();
      }
    }

    if (selectedSnippetId && snippetIds.includes(selectedSnippetId)) {
      setSelectedSnippetId(null);
    }

    refreshWorkspace();
  }

  /* ── Trash (bulk) ─────────────────────────────────────────────────────── */

  /** Permanently purge the entire trash for the current owner: remove locally and
   *  queue the cloud delete for the rows that reached the cloud. */
  async function handleEmptyTrash() {
    const trash = await readTrash(user?.id ?? null);
    const folderIds = trash.folders.map((f) => f.id);
    const snippetIds = trash.snippets.map((s) => s.id);
    if (folderIds.length === 0 && snippetIds.length === 0) return;

    await db.transaction("rw", [db.folders, db.snippets], async () => {
      if (folderIds.length > 0) await db.folders.bulkDelete(folderIds);
      if (snippetIds.length > 0) await db.snippets.bulkDelete(snippetIds);
    });

    if (user && supabaseConfigured) {
      const tombstones = [
        ...trash.folders
          .filter((f) => f.lastSyncedAt != null)
          .map((f) => ({ id: f.id, kind: "folder" as const })),
        ...trash.snippets
          .filter((s) => s.lastSyncedAt != null)
          .map((s) => ({ id: s.id, kind: "snippet" as const })),
      ];
      if (tombstones.length > 0) {
        await recordDeletions(user.id, tombstones);
        scheduleCloudSync();
      }
    }

    if (selectedSnippetId && snippetIds.includes(selectedSnippetId)) {
      setSelectedSnippetId(null);
    }

    refreshWorkspace();
  }

  /** Restore everything in the trash. References among restored records stay
   *  valid; only references to a record that no longer exists are detached. */
  async function handleRestoreAll() {
    const trash = await readTrash(user?.id ?? null);
    if (trash.folders.length === 0 && trash.snippets.length === 0) return;

    const allFolderIds = new Set((await db.folders.toArray()).map((f) => f.id));
    const now = new Date().toISOString();

    await db.transaction("rw", [db.folders, db.snippets], async () => {
      await db.folders.bulkPut(
        trash.folders.map((f) => ({
          ...f,
          deletedAt: null,
          dirty: true,
          updatedAt: now,
          parentId: f.parentId && allFolderIds.has(f.parentId) ? f.parentId : null,
        }))
      );
      await db.snippets.bulkPut(
        trash.snippets.map((s) => ({
          ...s,
          deletedAt: null,
          dirty: true,
          updatedAt: now,
          folderId: s.folderId && allFolderIds.has(s.folderId) ? s.folderId : null,
        }))
      );
    });

    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  async function handleRenameFolder(id: string, name: string) {
    await db.folders.update(id, { name, updatedAt: new Date().toISOString(), dirty: true });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  async function handlePinFolder(id: string, target: "aside" | "home", pinned: boolean) {
    const field = target === "aside" ? "isPinnedAside" : "isPinnedHome";
    await db.folders.update(id, { [field]: pinned, updatedAt: new Date().toISOString(), dirty: true });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  async function handleMoveFolder(id: string, newParentId: string | null) {
    const folder = folders.find((f) => f.id === id);
    if (!folder || folder.parentId === newParentId) return;
    await db.folders.update(id, {
      parentId: newParentId,
      updatedAt: new Date().toISOString(),
      dirty: true,
    });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  /* ── Clipboard ────────────────────────────────────────────────────────── */

  /**
   * Deep-copies a folder and all of its descendant folders/snippets under a new
   * parent, assigning fresh ids and remapping the parent/folder references so
   * the duplicated subtree is fully independent of the original.
   */
  async function duplicateFolderTree(
    sourceFolderId: string,
    targetParentId: string | null,
    timestamp: string
  ) {
    const [allFolders, allSnippets] = await Promise.all([
      db.folders.toArray(),
      db.snippets.toArray(),
    ]);

    // Collect the source folder and every descendant folder.
    const subtreeIds = new Set<string>([sourceFolderId]);
    const queue = [sourceFolderId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const folder of allFolders) {
        if (folder.parentId === current && !subtreeIds.has(folder.id)) {
          subtreeIds.add(folder.id);
          queue.push(folder.id);
        }
      }
    }

    // Map every original folder id to its freshly generated copy id.
    const idMap = new Map<string, string>();
    for (const id of subtreeIds) idMap.set(id, crypto.randomUUID());

    const newFolders: FolderRecord[] = [];
    for (const folder of allFolders) {
      if (!subtreeIds.has(folder.id)) continue;
      const isRoot = folder.id === sourceFolderId;
      newFolders.push({
        ...folder,
        id: idMap.get(folder.id)!,
        ownerId: user?.id ?? null,
        parentId: isRoot ? targetParentId : idMap.get(folder.parentId!) ?? targetParentId,
        createdAt: timestamp,
        updatedAt: timestamp,
        dirty: true,
        lastSyncedAt: null,
      });
    }

    const newSnippets: SnippetRecord[] = [];
    for (const snippet of allSnippets) {
      if (!snippet.folderId || !subtreeIds.has(snippet.folderId)) continue;
      newSnippets.push({
        ...snippet,
        id: crypto.randomUUID(),
        ownerId: user?.id ?? null,
        folderId: idMap.get(snippet.folderId)!,
        createdAt: timestamp,
        updatedAt: timestamp,
        dirty: true,
        lastSyncedAt: null,
      });
    }

    await db.transaction("rw", [db.folders, db.snippets], async () => {
      if (newFolders.length > 0) await db.folders.bulkPut(newFolders);
      if (newSnippets.length > 0) await db.snippets.bulkPut(newSnippets);
    });
  }

  async function handlePaste(targetFolderId: string | null) {
    if (!clipboard) return;
    const timestamp = new Date().toISOString();

    if (clipboard.itemType === "snippet") {
      const snippet = await db.snippets.get(clipboard.id);
      if (!snippet) return;

      if (clipboard.type === "cut") {
        await db.snippets.update(clipboard.id, { folderId: targetFolderId, updatedAt: timestamp, dirty: true });
        setClipboard(null);
      } else {
        await db.snippets.put({
          ...snippet,
          id: crypto.randomUUID(),
          folderId: targetFolderId,
          createdAt: timestamp,
          updatedAt: timestamp,
          dirty: true,
          lastSyncedAt: null,
        });
      }
    } else {
      const folder = await db.folders.get(clipboard.id);
      if (!folder) return;

      if (clipboard.type === "cut") {
        await db.folders.update(clipboard.id, { parentId: targetFolderId, updatedAt: timestamp, dirty: true });
        setClipboard(null);
      } else {
        await duplicateFolderTree(clipboard.id, targetFolderId, timestamp);
      }
    }

    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  return {
    handleCreateSnippet,
    handleCreateSnippetInline,
    handleUpdateSnippet,
    handleDeleteSnippet,
    handleRestoreSnippet,
    handlePermanentlyDeleteSnippet,
    handleRenameSnippet,
    handlePinSnippet,
    handleMoveSnippet,
    handleCreateFolder,
    handleDeleteFolder,
    handleRestoreFolder,
    handlePermanentlyDeleteFolder,
    handleRenameFolder,
    handlePinFolder,
    handleMoveFolder,
    handlePaste,
    handleEmptyTrash,
    handleRestoreAll,
  };
}
