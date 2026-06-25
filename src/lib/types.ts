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
  /**
   * When set, the record lives in the local trash (soft-deleted) and is hidden
   * from the normal workspace. The cloud has no `deleted_at` column, so trash is
   * device-local: a trashed record's cloud row is removed like a hard delete, and
   * `deletedAt` keeps a local copy that can be restored or purged. `null` means
   * the record is live.
   */
  deletedAt: string | null;
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
  /** See {@link FolderRecord.deletedAt}. */
  deletedAt: string | null;
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
  deleted_at: string | null;
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
  deleted_at: string | null;
}

/** A workspace item identified by its kind. Shared by multi-selection, batch
 *  mutations and multi-item drag. */
export interface SelectedItem {
  type: "folder" | "snippet";
  id: string;
}

export interface ClipboardItem {
  itemType: "folder" | "snippet";
  id: string;
}

/** The internal cut/copy buffer. Carries one or more items so a multi-selection
 *  can be cut/copied and pasted as a batch. */
export interface ClipboardEntry {
  type: "cut" | "copy";
  items: ClipboardItem[];
}