import type { FolderRecord, NoteRecord, SnippetRecord, ClipboardEntry } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { User } from "@supabase/supabase-js";

/* ─────────────────────────── Props ─────────────────────────────────────── */

export interface AsideProps {
  user: User | null;
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  notes: NoteRecord[];
  copy: Dictionary;
  clipboard: ClipboardEntry | null;
  onSelectSnippet: (snippetId: string) => void;
  onSelectNote: (noteId: string) => void;
  onGoHome: () => void;
  onGoSpace: () => void;
  onOpenSearch: () => void;
  onCreateSnippetInline: (folderId: string | null, title: string) => Promise<void>;
  onCreateNoteInline: (folderId: string | null, title: string) => Promise<void>;
  onCreateFolder: (parentId: string | null, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onDeleteSnippet: (id: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onRenameSnippet: (id: string, title: string) => Promise<void>;
  onRenameNote: (id: string, title: string) => Promise<void>;
  onPinFolder: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  onPinSnippet: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  onPinNote: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  onCut: (entry: ClipboardEntry) => void;
  onCopy: (entry: ClipboardEntry) => void;
  onPaste: (targetFolderId: string | null) => Promise<void>;
  onMoveFolder: (id: string, newParentId: string | null) => Promise<void>;
  onMoveSnippet: (id: string, newFolderId: string | null) => Promise<void>;
  onMoveNote: (id: string, newFolderId: string | null) => Promise<void>;
  onSelectFolder?: (folderId: string) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  isOpen: boolean;
  isMobile: boolean;
  onSetOpen: (open: boolean) => void;
}

/* ─────────────────────────── Internal types ─────────────────────────────── */

export interface MenuTarget {
  type: "folder" | "snippet" | "note" | "root";
  id?: string;
  x: number;
  y: number;
}

export interface AsideCtxShape {
  copy: Dictionary;
  renamingId: string | null;
  /** undefined = inactive, null = creating at root, string = inside that folder id */
  creatingFolderParentId: string | null | undefined;
  /** undefined = inactive, null = creating at root, string = inside that folder id */
  creatingSnippetFolderId: string | null | undefined;
  /** undefined = inactive, null = creating at root, string = inside that folder id */
  creatingNoteFolderId: string | null | undefined;
  openMenu: (target: MenuTarget) => void;
  beginRename: (id: string) => void;
  submitFolderRename: (id: string, value: string) => void;
  submitSnippetRename: (id: string, value: string) => void;
  submitNoteRename: (id: string, value: string) => void;
  cancelRename: () => void;
  beginCreateFolder: (parentId: string | null) => void;
  cancelCreateFolder: () => void;
  submitCreateFolder: (parentId: string | null, name: string) => void;
  beginCreateSnippet: (folderId: string | null) => void;
  cancelCreateSnippet: () => void;
  submitCreateSnippet: (folderId: string | null, title: string) => void;
  beginCreateNote: (folderId: string | null) => void;
  cancelCreateNote: () => void;
  submitCreateNote: (folderId: string | null, title: string) => void;
  selectSnippet: (id: string) => void;
  selectNote: (id: string) => void;
  selectFolder: (id: string) => void;
  pinFolder: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  pinSnippet: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  pinNote: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  /* ── Drag & Drop ── */
  dragging: { type: "folder" | "snippet" | "note"; id: string } | null;
  dragOverId: string | null;
  startDrag: (type: "folder" | "snippet" | "note", id: string) => void;
  endDrag: () => void;
  enterDropTarget: (id: string) => void;
  dropOnTarget: (targetFolderId: string | null) => void;
  canDropOnFolder: (folderId: string) => boolean;
  folders: FolderRecord[];
}
