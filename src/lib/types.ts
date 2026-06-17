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
  isPinnedAside: boolean;
  isPinnedHome: boolean;
  createdAt: string;
  updatedAt: string;
  dirty: boolean;
  lastSyncedAt: string | null;
}

/**
 * A pending cloud deletion. Created when an owned, previously-synced record is
 * deleted locally; removed once the matching cloud row is deleted. While it
 * exists, `fetchCloudWorkspace` won't re-download the row (no resurrection) and
 * the sync loop keeps retrying the cloud delete.
 */
export interface TombstoneRecord {
  id: string;
  kind: "folder" | "snippet";
  ownerId: string;
  deletedAt: string;
}

export interface WorkspaceSnapshot {
  folders: FolderRecord[];
  snippets: SnippetRecord[];
}

export interface SyncResult {
  syncedFolderIds: string[];
  syncedSnippetIds: string[];
  localSnippetIds: string[];
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
  is_pinned_aside: boolean;
  is_pinned_home: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClipboardEntry {
  type: "cut" | "copy";
  itemType: "folder" | "snippet";
  id: string;
}