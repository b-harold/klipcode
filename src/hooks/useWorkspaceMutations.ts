import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import type {
  ClipboardEntry,
  CreateNoteInput,
  CreateSnippetInput,
  FolderRecord,
  NoteChanges,
  NoteRecord,
  SnippetChanges,
  SnippetRecord,
  SyncStatus,
} from "@/lib/types";
import { DEFAULT_LANGUAGE } from "@/lib/constants/languages";
import { DEBOUNCE_MS } from "@/lib/constants/timing";
import type { Dictionary } from "@/i18n";

interface UseWorkspaceMutationsOptions {
  copy: Dictionary;
  user: User | null;
  supabase: SupabaseClient | null;
  supabaseConfigured: boolean;
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  notes: NoteRecord[];
  clipboard: ClipboardEntry | null;
  setClipboard: (entry: ClipboardEntry | null) => void;
  selectedSnippetId: string | null;
  selectedNoteId: string | null;
  setSelectedSnippetId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  refreshWorkspace: () => void;
  scheduleCloudSync: () => void;
  settleLocally: (id: string) => void;
  setSnippetStatus: (snippetId: string, status: SyncStatus) => void;
  setNoteStatus: (noteId: string, status: SyncStatus) => void;
}

export function useWorkspaceMutations({
  copy,
  user,
  supabase,
  supabaseConfigured,
  folders,
  snippets,
  notes,
  clipboard,
  setClipboard,
  selectedSnippetId,
  selectedNoteId,
  setSelectedSnippetId,
  setSelectedNoteId,
  refreshWorkspace,
  scheduleCloudSync,
  settleLocally,
  setSnippetStatus,
  setNoteStatus,
}: UseWorkspaceMutationsOptions) {
  const updateTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingSnippetChangesRef = useRef<Map<string, SnippetChanges>>(new Map());
  const pendingNoteChangesRef = useRef<Map<string, NoteChanges>>(new Map());

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = updateTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  function syncAfterMutation(itemId: string) {
    if (user && supabaseConfigured) {
      scheduleCloudSync();
    } else {
      settleLocally(itemId);
    }
  }

  /* ── Snippet CRUD ─────────────────────────────────────────────────────── */

  async function handleCreateSnippet(data: CreateSnippetInput) {
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
      sourceUrl: data.sourceUrl,
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
      language: DEFAULT_LANGUAGE,
      code: "",
      sourceUrl: null,
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

  function handleUpdateSnippet(snippetId: string, changes: SnippetChanges) {
    setSnippetStatus(snippetId, "editing");

    // Supabase enforces btrim(title) <> '' on snippets — normalize before persisting
    // so cloud upserts don't fail with a check-constraint violation.
    const normalized: SnippetChanges = { ...changes };
    if (changes.title !== undefined) {
      normalized.title = changes.title.trim() || copy.snippetCard.untitled;
    }

    // Merge into any pending changes so quick consecutive edits across fields
    // (e.g. title then code) are not dropped when the timer is rescheduled.
    const merged: SnippetChanges = {
      ...pendingSnippetChangesRef.current.get(snippetId),
      ...normalized,
    };
    pendingSnippetChangesRef.current.set(snippetId, merged);

    const existing = updateTimersRef.current.get(snippetId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      updateTimersRef.current.delete(snippetId);
      const pending = pendingSnippetChangesRef.current.get(snippetId);
      pendingSnippetChangesRef.current.delete(snippetId);
      if (!pending) return;

      await db.snippets.update(snippetId, {
        ...pending,
        updatedAt: new Date().toISOString(),
        dirty: true,
      });

      refreshWorkspace();
      syncAfterMutation(snippetId);
    }, DEBOUNCE_MS);

    updateTimersRef.current.set(snippetId, timer);
  }

  async function handleDeleteSnippet(id: string) {
    await db.snippets.delete(id);

    if (user && supabaseConfigured && supabase) {
      try {
        await supabase.from("snippets").delete().eq("id", id);
      } catch (err) {
        console.error("Failed to delete snippet on cloud:", err);
      }
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

  /* ── Note CRUD ────────────────────────────────────────────────────────── */

  async function handleCreateNoteInline(folderId: string | null, title: string) {
    const noteId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await db.notes.put({
      id: noteId,
      ownerId: user?.id ?? null,
      folderId: folderId ?? null,
      title: title.trim() || copy.noteCard.untitled,
      markdown: "",
      isPinnedAside: false,
      isPinnedHome: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      dirty: true,
      lastSyncedAt: null,
    });

    setNoteStatus(noteId, "editing");
    refreshWorkspace();
    setSelectedNoteId(noteId);
    syncAfterMutation(noteId);
  }

  async function handleCreateNote(data: CreateNoteInput) {
    const noteId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await db.notes.put({
      id: noteId,
      ownerId: user?.id ?? null,
      folderId: data.folderId || null,
      title: data.title.trim() || copy.noteCard.untitled,
      markdown: data.markdown,
      isPinnedAside: false,
      isPinnedHome: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      dirty: true,
      lastSyncedAt: null,
    });

    setNoteStatus(noteId, "editing");
    refreshWorkspace();
    syncAfterMutation(noteId);
  }

  function handleUpdateNote(noteId: string, changes: NoteChanges) {
    setNoteStatus(noteId, "editing");

    // Supabase enforces btrim(title) <> '' on notes — normalize before persisting.
    const normalized: NoteChanges = { ...changes };
    if (changes.title !== undefined) {
      normalized.title = changes.title.trim() || copy.noteCard.untitled;
    }

    const merged: NoteChanges = {
      ...pendingNoteChangesRef.current.get(noteId),
      ...normalized,
    };
    pendingNoteChangesRef.current.set(noteId, merged);

    const existing = updateTimersRef.current.get(noteId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      updateTimersRef.current.delete(noteId);
      const pending = pendingNoteChangesRef.current.get(noteId);
      pendingNoteChangesRef.current.delete(noteId);
      if (!pending) return;

      await db.notes.update(noteId, {
        ...pending,
        updatedAt: new Date().toISOString(),
        dirty: true,
      });

      refreshWorkspace();
      syncAfterMutation(noteId);
    }, DEBOUNCE_MS);

    updateTimersRef.current.set(noteId, timer);
  }

  async function handleDeleteNote(id: string) {
    await db.notes.delete(id);

    if (user && supabaseConfigured && supabase) {
      try {
        await supabase.from("notes").delete().eq("id", id);
      } catch (err) {
        console.error("Failed to delete note on cloud:", err);
      }
    }

    if (selectedNoteId === id) setSelectedNoteId(null);
    refreshWorkspace();
  }

  async function handleRenameNote(id: string, title: string) {
    await db.notes.update(id, { title, updatedAt: new Date().toISOString(), dirty: true });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  async function handlePinNote(id: string, target: "aside" | "home", pinned: boolean) {
    const field = target === "aside" ? "isPinnedAside" : "isPinnedHome";
    await db.notes.update(id, { [field]: pinned, updatedAt: new Date().toISOString(), dirty: true });
    refreshWorkspace();
    if (user && supabaseConfigured) scheduleCloudSync();
  }

  async function handleMoveNote(id: string, newFolderId: string | null) {
    const note = notes.find((n) => n.id === id);
    if (!note || note.folderId === newFolderId) return;
    await db.notes.update(id, {
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
    const folderIds = [...toDelete];

    const [allSnippets, allNotes] = await Promise.all([
      db.snippets.toArray(),
      db.notes.toArray(),
    ]);
    const snippetIdsToDelete = allSnippets
      .filter((s) => s.folderId && toDelete.has(s.folderId))
      .map((s) => s.id);
    const noteIdsToDelete = allNotes
      .filter((n) => n.folderId && toDelete.has(n.folderId))
      .map((n) => n.id);

    await Promise.all([
      db.folders.bulkDelete(folderIds),
      db.snippets.bulkDelete(snippetIdsToDelete),
      db.notes.bulkDelete(noteIdsToDelete),
    ]);

    if (user && supabaseConfigured && supabase) {
      try {
        if (snippetIdsToDelete.length > 0) {
          await supabase.from("snippets").delete().in("id", snippetIdsToDelete);
        }
        if (noteIdsToDelete.length > 0) {
          await supabase.from("notes").delete().in("id", noteIdsToDelete);
        }
        if (folderIds.length > 0) {
          await supabase.from("folders").delete().in("id", folderIds);
        }
      } catch (err) {
        console.error("Failed to delete on cloud:", err);
      }
    }

    if (selectedSnippetId && snippetIdsToDelete.includes(selectedSnippetId)) {
      setSelectedSnippetId(null);
    }
    if (selectedNoteId && noteIdsToDelete.includes(selectedNoteId)) {
      setSelectedNoteId(null);
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
    } else if (clipboard.itemType === "note") {
      const note = await db.notes.get(clipboard.id);
      if (!note) return;

      if (clipboard.type === "cut") {
        await db.notes.update(clipboard.id, { folderId: targetFolderId, updatedAt: timestamp, dirty: true });
        setClipboard(null);
      } else {
        await db.notes.put({
          ...note,
          id: crypto.randomUUID(),
          folderId: targetFolderId,
          createdAt: timestamp,
          updatedAt: timestamp,
          dirty: true,
          lastSyncedAt: null,
        });
      }
    } else {
      if (clipboard.type === "cut") {
        await db.folders.update(clipboard.id, { parentId: targetFolderId, updatedAt: timestamp, dirty: true });
        setClipboard(null);
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
    handleCreateNoteInline,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handleRenameNote,
    handlePinNote,
    handleMoveNote,
    handleCreateFolder,
    handleDeleteFolder,
    handleRenameFolder,
    handlePinFolder,
    handleMoveFolder,
    handlePaste,
  };
}

export type WorkspaceMutations = ReturnType<typeof useWorkspaceMutations>;
