export type SyncStatus =
  | "idle"
  | "editing"
  | "saving"
  | "saved-local"
  | "saved-cloud"
  | "error";

export interface FolderRecord {
  id: string;
  ownerId: string | null;
  name: string;
  parentId: string | null;
  isPinnedAside: boolean;
  isPinnedHome: boolean;
  createdAt: string;
  updatedAt: string;
  dirty: boolean;
  lastSyncedAt: string | null;
}

export interface SnippetRecord {
  id: string;
  ownerId: string | null;
  folderId: string | null;
  title: string;
  code: string;
  language: string;
  sourceUrl: string | null;
  isPinnedAside: boolean;
  isPinnedHome: boolean;
  createdAt: string;
  updatedAt: string;
  dirty: boolean;
  lastSyncedAt: string | null;
}

export interface NoteRecord {
  id: string;
  ownerId: string | null;
  folderId: string | null;
  title: string;
  markdown: string;
  isPinnedAside: boolean;
  isPinnedHome: boolean;
  createdAt: string;
  updatedAt: string;
  dirty: boolean;
  lastSyncedAt: string | null;
}

export interface WorkspaceSnapshot {
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  notes: NoteRecord[];
}

export interface SyncResult {
  syncedFolderIds: string[];
  syncedSnippetIds: string[];
  syncedNoteIds: string[];
}

export interface CloudFolderRow {
  id: string;
  owner_id: string;
  name: string;
  parent_id: string | null;
  is_pinned_aside: boolean;
  is_pinned_home: boolean;
  created_at: string;
  updated_at: string;
}

export interface CloudSnippetRow {
  id: string;
  owner_id: string;
  folder_id: string | null;
  title: string;
  code: string;
  language: string;
  source_url: string | null;
  is_pinned_aside: boolean;
  is_pinned_home: boolean;
  created_at: string;
  updated_at: string;
}

export interface CloudNoteRow {
  id: string;
  owner_id: string;
  folder_id: string | null;
  title: string;
  markdown: string;
  is_pinned_aside: boolean;
  is_pinned_home: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClipboardEntry {
  type: "cut" | "copy";
  itemType: "folder" | "snippet" | "note";
  id: string;
}
