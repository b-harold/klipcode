import Dexie, { type Table } from "dexie";

import type { FolderRecord, NoteRecord, SnippetRecord, WorkspaceSnapshot } from "@/lib/types";

class KlipCodeDatabase extends Dexie {
  folders!: Table<FolderRecord, string>;
  snippets!: Table<SnippetRecord, string>;
  notes!: Table<NoteRecord, string>;

  constructor() {
    super("klipcode");

    this.version(1).stores({
      folders: "id, ownerId, parentId, dirty, updatedAt",
      snippets: "id, ownerId, folderId, dirty, updatedAt",
    });

    this.version(2)
      .stores({
        folders: "id, ownerId, parentId, dirty, updatedAt, isPinnedAside, isPinnedHome",
        snippets: "id, ownerId, folderId, dirty, updatedAt, isPinnedAside, isPinnedHome",
      })
      .upgrade((tx) => {
        return Promise.all([
          tx
            .table<FolderRecord & { isPinned?: boolean }>("folders")
            .toCollection()
            .modify((folder) => {
              folder.isPinnedAside = Boolean(folder.isPinned);
              folder.isPinnedHome = false;
              delete folder.isPinned;
            }),
          tx
            .table<SnippetRecord & { isPinned?: boolean }>("snippets")
            .toCollection()
            .modify((snippet) => {
              snippet.isPinnedAside = Boolean(snippet.isPinned);
              snippet.isPinnedHome = false;
              delete snippet.isPinned;
            }),
        ]);
      });

    this.version(3)
      .stores({
        folders: "id, ownerId, parentId, dirty, updatedAt, isPinnedAside, isPinnedHome",
        snippets: "id, ownerId, folderId, dirty, updatedAt, isPinnedAside, isPinnedHome",
      })
      .upgrade((tx) => {
        return Promise.all([
          tx
            .table<any>("folders")
            .toCollection()
            .modify((folder) => {
              folder.isPinnedAside = Boolean(folder.isPinnedAside || folder.isPinned || folder.pinType === "pinned");
              folder.isPinnedHome = Boolean(folder.isPinnedHome || folder.pinType === "home");
              delete folder.isPinned;
              delete folder.pinType;
            }),
          tx
            .table<any>("snippets")
            .toCollection()
            .modify((snippet) => {
              snippet.isPinnedAside = Boolean(snippet.isPinnedAside || snippet.isPinned || snippet.pinType === "pinned");
              snippet.isPinnedHome = Boolean(snippet.isPinnedHome || snippet.pinType === "home");
              delete snippet.isPinned;
              delete snippet.pinType;
            }),
        ]);
      });

    this.version(4)
      .stores({
        folders: "id, ownerId, parentId, dirty, updatedAt, isPinnedAside, isPinnedHome",
        snippets: "id, ownerId, folderId, dirty, updatedAt, isPinnedAside, isPinnedHome",
      })
      .upgrade((tx) => {
        return Promise.all([
          tx
            .table<any>("folders")
            .toCollection()
            .modify((folder) => {
              folder.isPinnedAside = Boolean(folder.isPinnedAside || folder.isPinned);
              folder.isPinnedHome = Boolean(folder.isPinnedHome);
              delete folder.isPinned;
            }),
          tx
            .table<any>("snippets")
            .toCollection()
            .modify((snippet) => {
              snippet.isPinnedAside = Boolean(snippet.isPinnedAside || snippet.isPinned);
              snippet.isPinnedHome = Boolean(snippet.isPinnedHome);
              delete snippet.isPinned;
            }),
        ]);
      });

    this.version(5)
      .stores({
        folders: "id, ownerId, parentId, dirty, updatedAt, isPinnedAside, isPinnedHome",
        snippets: "id, ownerId, folderId, dirty, updatedAt, isPinnedAside, isPinnedHome",
        notes: "id, ownerId, folderId, dirty, updatedAt, isPinnedAside, isPinnedHome",
      })
      .upgrade((tx) => {
        return tx
          .table<SnippetRecord & { sourceUrl?: string | null }>("snippets")
          .toCollection()
          .modify((snippet) => {
            if (snippet.sourceUrl === undefined) {
              snippet.sourceUrl = null;
            }
          });
      });
  }
}

export const db = new KlipCodeDatabase();

function matchesOwner(ownerId: string | null, currentUserId: string | null) {
  if (!currentUserId) {
    return ownerId === null;
  }

  return ownerId === null || ownerId === currentUserId;
}

function isPinned(record: { isPinnedAside: boolean }) {
  return record.isPinnedAside;
}

function sortFolders(left: FolderRecord, right: FolderRecord) {
  if (isPinned(left) !== isPinned(right)) {
    return isPinned(left) ? -1 : 1;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function sortSnippets(left: SnippetRecord, right: SnippetRecord) {
  if (isPinned(left) !== isPinned(right)) {
    return isPinned(left) ? -1 : 1;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function sortNotes(left: NoteRecord, right: NoteRecord) {
  if (isPinned(left) !== isPinned(right)) {
    return isPinned(left) ? -1 : 1;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

export async function readWorkspace(
  currentUserId: string | null
): Promise<WorkspaceSnapshot> {
  const [folders, snippets, notes] = await Promise.all([
    db.folders.toArray(),
    db.snippets.toArray(),
    db.notes.toArray(),
  ]);

  return {
    folders: folders.filter((folder) => matchesOwner(folder.ownerId, currentUserId)).sort(sortFolders),
    snippets: snippets
      .filter((snippet) => matchesOwner(snippet.ownerId, currentUserId))
      .sort(sortSnippets),
    notes: notes
      .filter((note) => matchesOwner(note.ownerId, currentUserId))
      .sort(sortNotes),
  };
}

export async function getDirtyWorkspace(
  currentUserId: string
): Promise<WorkspaceSnapshot> {
  const snapshot = await readWorkspace(currentUserId);

  return {
    folders: snapshot.folders.filter((folder) => folder.dirty),
    snippets: snapshot.snippets.filter((snippet) => snippet.dirty),
    notes: snapshot.notes.filter((note) => note.dirty),
  };
}
