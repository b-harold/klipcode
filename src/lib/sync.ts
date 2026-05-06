import { db, getDirtyWorkspace } from "@/lib/db";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type {
  CloudFolderRow,
  CloudNoteRow,
  CloudSnippetRow,
  FolderRecord,
  NoteRecord,
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
    source_url: snippet.sourceUrl,
    is_pinned_aside: snippet.isPinnedAside,
    is_pinned_home: snippet.isPinnedHome,
    created_at: snippet.createdAt,
    updated_at: snippet.updatedAt,
  };
}

function mapNoteToCloud(note: NoteRecord, userId: string) {
  return {
    id: note.id,
    owner_id: userId,
    folder_id: note.folderId,
    title: note.title,
    markdown: note.markdown,
    is_pinned_aside: note.isPinnedAside,
    is_pinned_home: note.isPinnedHome,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
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
    sourceUrl: snippet.source_url ?? null,
    isPinnedAside: snippet.is_pinned_aside,
    isPinnedHome: snippet.is_pinned_home,
    createdAt: snippet.created_at,
    updatedAt: snippet.updated_at,
    dirty: false,
    lastSyncedAt: snippet.updated_at,
  };
}

function mapNoteToLocal(note: CloudNoteRow): NoteRecord {
  return {
    id: note.id,
    ownerId: note.owner_id,
    folderId: note.folder_id,
    title: note.title,
    markdown: note.markdown,
    isPinnedAside: note.is_pinned_aside,
    isPinnedHome: note.is_pinned_home,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    dirty: false,
    lastSyncedAt: note.updated_at,
  };
}

async function markFolderAsSynced(folder: FolderRecord, userId: string, syncedAt: string) {
  const currentFolder = await db.folders.get(folder.id);

  if (!currentFolder || currentFolder.updatedAt !== folder.updatedAt) {
    return;
  }

  await db.folders.put({
    ...currentFolder,
    ownerId: userId,
    dirty: false,
    lastSyncedAt: syncedAt,
  });
}

async function markSnippetAsSynced(
  snippet: SnippetRecord,
  userId: string,
  syncedAt: string
) {
  const currentSnippet = await db.snippets.get(snippet.id);

  if (!currentSnippet || currentSnippet.updatedAt !== snippet.updatedAt) {
    return;
  }

  await db.snippets.put({
    ...currentSnippet,
    ownerId: userId,
    dirty: false,
    lastSyncedAt: syncedAt,
  });
}

async function markNoteAsSynced(note: NoteRecord, userId: string, syncedAt: string) {
  const currentNote = await db.notes.get(note.id);

  if (!currentNote || currentNote.updatedAt !== note.updatedAt) {
    return;
  }

  await db.notes.put({
    ...currentNote,
    ownerId: userId,
    dirty: false,
    lastSyncedAt: syncedAt,
  });
}

export async function syncDirtyWorkspace(userId: string): Promise<SyncResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { syncedFolderIds: [], syncedSnippetIds: [], syncedNoteIds: [] };
  }

  const dirtyWorkspace = await getDirtyWorkspace(userId);
  const folderMap = new Map(dirtyWorkspace.folders.map((folder) => [folder.id, folder]));
  const folders = [...dirtyWorkspace.folders].sort(
    (left, right) => folderDepth(left, folderMap) - folderDepth(right, folderMap)
  );
  const snippets = [...dirtyWorkspace.snippets].sort((left, right) =>
    left.updatedAt.localeCompare(right.updatedAt)
  );
  const notes = [...dirtyWorkspace.notes].sort((left, right) =>
    left.updatedAt.localeCompare(right.updatedAt)
  );
  const syncedFolderIds: string[] = [];
  const syncedSnippetIds: string[] = [];
  const syncedNoteIds: string[] = [];

  for (const folder of folders) {
    const { error } = await supabase
      .from("folders")
      .upsert(mapFolderToCloud(folder, userId), { onConflict: "id" });

    if (error) {
      throw error;
    }

    const syncedAt = new Date().toISOString();
    await markFolderAsSynced(folder, userId, syncedAt);
    syncedFolderIds.push(folder.id);
  }

  for (const snippet of snippets) {
    const { error } = await supabase
      .from("snippets")
      .upsert(mapSnippetToCloud(snippet, userId), { onConflict: "id" });

    if (error) {
      throw error;
    }

    const syncedAt = new Date().toISOString();
    await markSnippetAsSynced(snippet, userId, syncedAt);
    syncedSnippetIds.push(snippet.id);
  }

  for (const note of notes) {
    const { error } = await supabase
      .from("notes")
      .upsert(mapNoteToCloud(note, userId), { onConflict: "id" });

    if (error) {
      throw error;
    }

    const syncedAt = new Date().toISOString();
    await markNoteAsSynced(note, userId, syncedAt);
    syncedNoteIds.push(note.id);
  }

  return { syncedFolderIds, syncedSnippetIds, syncedNoteIds };
}

export async function fetchCloudWorkspace(userId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const [
    { data: folders, error: foldersError },
    { data: snippets, error: snippetsError },
    { data: notes, error: notesError },
  ] = await Promise.all([
    supabase
      .from("folders")
      .select("id, owner_id, name, parent_id, is_pinned_aside, is_pinned_home, created_at, updated_at")
      .eq("owner_id", userId),
    supabase
      .from("snippets")
      .select(
        "id, owner_id, folder_id, title, code, language, source_url, is_pinned_aside, is_pinned_home, created_at, updated_at"
      )
      .eq("owner_id", userId),
    supabase
      .from("notes")
      .select(
        "id, owner_id, folder_id, title, markdown, is_pinned_aside, is_pinned_home, created_at, updated_at"
      )
      .eq("owner_id", userId),
  ]);

  if (foldersError) {
    throw foldersError;
  }

  if (snippetsError) {
    throw snippetsError;
  }

  if (notesError) {
    throw notesError;
  }

  for (const folderRow of folders as CloudFolderRow[]) {
    const incomingFolder = mapFolderToLocal(folderRow);
    const currentFolder = await db.folders.get(incomingFolder.id);

    if (currentFolder?.dirty && currentFolder.updatedAt >= incomingFolder.updatedAt) {
      continue;
    }

    await db.folders.put(incomingFolder);
  }

  for (const snippetRow of snippets as CloudSnippetRow[]) {
    const incomingSnippet = mapSnippetToLocal(snippetRow);
    const currentSnippet = await db.snippets.get(incomingSnippet.id);

    if (currentSnippet?.dirty && currentSnippet.updatedAt >= incomingSnippet.updatedAt) {
      continue;
    }

    await db.snippets.put(incomingSnippet);
  }

  for (const noteRow of notes as CloudNoteRow[]) {
    const incomingNote = mapNoteToLocal(noteRow);
    const currentNote = await db.notes.get(incomingNote.id);

    if (currentNote?.dirty && currentNote.updatedAt >= incomingNote.updatedAt) {
      continue;
    }

    await db.notes.put(incomingNote);
  }
}

export async function reconcileWorkspace(userId: string) {
  const result = await syncDirtyWorkspace(userId);
  await fetchCloudWorkspace(userId);
  return result;
}
