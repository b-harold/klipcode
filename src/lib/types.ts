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
  sourceUrl: string | null;
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
 * Notes are markdown documents that can reference snippets as attachments.
 * They live alongside folders/snippets in the workspace but are not part of
 * the trash or encryption flows (they sync plaintext, hard-delete only).
 */
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
  notes: NoteRecord[];
}

export interface SyncResult {
  syncedFolderIds: string[];
  syncedSnippetIds: string[];
  syncedNoteIds: string[];
  localSnippetIds: string[];
}

export interface CloudFolderRow {
  id: string;
  owner_id: string;
  /** Ciphertext when `crypto_version` > 0; plaintext when 0. */
  name: string;
  parent_id: string | null;
  is_pinned_aside: boolean;
  is_pinned_home: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /**
   * Encryption scheme applied to this row's sensitive fields: 0 = plaintext
   * (legacy rows, or encryption unavailable), 1 = AES-256-GCM via the per-user
   * DEK (`src/lib/crypto.ts`). Rows migrate progressively: every upload writes
   * the current version, so a record is re-encoded when created or edited.
   */
  crypto_version: number;
}

export interface CloudSnippetRow {
  id: string;
  owner_id: string;
  folder_id: string | null;
  /** Ciphertext when `crypto_version` > 0; plaintext when 0. */
  title: string;
  /** Ciphertext when `crypto_version` > 0; plaintext when 0. */
  code: string;
  /** Always plaintext: indexed cloud-side and not sensitive. */
  language: string;
  source_url: string | null;
  is_pinned_aside: boolean;
  is_pinned_home: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** See {@link CloudFolderRow.crypto_version}. */
  crypto_version: number;
}

/** Notes sync plaintext (no `crypto_version` yet) and hard-delete cloud-side. */
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

/** A workspace item identified by its kind. Shared by multi-selection, batch
 *  mutations and multi-item drag. */
export interface SelectedItem {
  type: "folder" | "snippet" | "note";
  id: string;
}

export interface ClipboardItem {
  itemType: "folder" | "snippet" | "note";
  id: string;
}

/** The internal cut/copy buffer. Carries one or more items so a multi-selection
 *  can be cut/copied and pasted as a batch. */
export interface ClipboardEntry {
  type: "cut" | "copy";
  items: ClipboardItem[];
}

export interface CreateSnippetInput {
  title: string;
  language: string;
  folderId: string;
  code: string;
  sourceUrl: string | null;
}

export interface CreateNoteInput {
  title: string;
  folderId: string;
  markdown: string;
}

export interface SnippetChanges {
  title?: string;
  code?: string;
  language?: string;
  sourceUrl?: string | null;
}

export interface NoteChanges {
  title?: string;
  markdown?: string;
}
