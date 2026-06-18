import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/db";
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
    // we delete it (and trigger a pointless cloud sync).
    const pendingTimer = updateTimersRef.current.get(id);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      updateTimersRef.current.delete(id);
    }

    const existing = await db.snippets.get(id);
    await db.snippets.delete(id);

    // Only records that actually reached the cloud (`lastSyncedAt` set) need a
    // tombstone. Queueing one and scheduling a sync lets the delete retry if the
    // cloud call fails, instead of the row resurrecting on the next fetch.
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
    });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  async function handleDeleteFolder(id: string) {
    const allFolders = await db.folders.toArray();
    const toDelete = new Set<string>([id]);
    const queue = [id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const f of allFolders) {
        if (f.parentId === cur && !toDelete.has(f.id)) {
          toDelete.add(f.id);
          queue.push(f.id);
        }
      }
    }
    const allSnippets = await db.snippets.toArray();
    const snippetsToDelete = allSnippets.filter((s) => s.folderId && toDelete.has(s.folderId));
    const snippetIdsToDelete = snippetsToDelete.map((s) => s.id);

    const foldersToDelete = allFolders.filter((f) => toDelete.has(f.id));

    await Promise.all([...toDelete].map((fid) => db.folders.delete(fid)));
    await Promise.all(snippetIdsToDelete.map((sid) => db.snippets.delete(sid)));

    // Queue tombstones for the subtree records that exist in the cloud, then let
    // the sync loop flush (and retry) them so a failed delete can't resurrect.
    if (user && supabaseConfigured) {
      const tombstones = [
        ...foldersToDelete
          .filter((f) => f.lastSyncedAt != null)
          .map((f) => ({ id: f.id, kind: "folder" as const })),
        ...snippetsToDelete
          .filter((s) => s.lastSyncedAt != null)
          .map((s) => ({ id: s.id, kind: "snippet" as const })),
      ];
      if (tombstones.length > 0) {
        await recordDeletions(user.id, tombstones);
        scheduleCloudSync();
      }
    }

    if (selectedSnippetId && snippetIdsToDelete.includes(selectedSnippetId)) {
      setSelectedSnippetId(null);
    }

    refreshWorkspace();
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
    handleRenameSnippet,
    handlePinSnippet,
    handleMoveSnippet,
    handleCreateFolder,
    handleDeleteFolder,
    handleRenameFolder,
    handlePinFolder,
    handleMoveFolder,
    handlePaste,
  };
}
