import { useCallback } from "react";
import {
  Clipboard,
  Copy,
  ExternalLink,
  FilePlus,
  FilePlus2,
  FolderPlus,
  PenLine,
  Pin,
  PinOff,
  Scissors,
  Trash2,
} from "lucide-react";
import type { ContextMenuGroup } from "@/components/ContextMenu/ContextMenu";
import type {
  ClipboardEntry,
  FolderRecord,
  NoteRecord,
  SnippetRecord,
} from "@/lib/types";
import type { Dictionary } from "@/i18n";
import { buildAppHref } from "@/lib/navigation";
import type { MenuTarget } from "./types";

interface UseContextMenuGroupsArgs {
  copy: Dictionary;
  clipboard: ClipboardEntry | null;
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  notes: NoteRecord[];
  onGoHome: () => void;
  onNewSnippetAt: (folderId: string | null) => void;
  onPaste: (targetFolderId: string | null) => Promise<void>;
  onPinFolder: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  onPinSnippet: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  onPinNote: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onDeleteSnippet: (id: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onCut: (entry: ClipboardEntry) => void;
  onCopy: (entry: ClipboardEntry) => void;
  setRenamingId: (id: string | null) => void;
  setCreatingFolderParentId: (id: string | null | undefined) => void;
  setCreatingSnippetFolderId: (id: string | null | undefined) => void;
  setCreatingNoteFolderId: (id: string | null | undefined) => void;
}

export function useContextMenuGroups({
  copy,
  clipboard,
  folders,
  snippets,
  notes,
  onGoHome,
  onNewSnippetAt,
  onPaste,
  onPinFolder,
  onPinSnippet,
  onPinNote,
  onDeleteFolder,
  onDeleteSnippet,
  onDeleteNote,
  onCut,
  onCopy,
  setRenamingId,
  setCreatingFolderParentId,
  setCreatingSnippetFolderId,
  setCreatingNoteFolderId,
}: UseContextMenuGroupsArgs) {
  return useCallback(
    (target: MenuTarget): ContextMenuGroup[] => {
      const { type, id } = target;
      const cm = copy.contextMenu;

      if (type === "root") {
        return [
          {
            items: [
              {
                id: "new-folder",
                label: cm.newFolder,
                Icon: FolderPlus,
                onClick: () => setCreatingFolderParentId(null),
              },
              {
                id: "new-snippet",
                label: cm.newSnippet,
                Icon: FilePlus,
                onClick: () => setCreatingSnippetFolderId(null),
              },
              {
                id: "new-note",
                label: cm.newNote,
                Icon: FilePlus2,
                onClick: () => setCreatingNoteFolderId(null),
              },
            ],
          },
          ...(clipboard
            ? [{
                items: [{
                  id: "paste",
                  label: cm.paste,
                  Icon: Clipboard,
                  onClick: () => void onPaste(null),
                }],
              }]
            : []),
        ];
      }

      if (type === "folder" && id) {
        const folder = folders.find((f) => f.id === id);
        if (!folder) return [];
        return [
          {
            items: [
              {
                id: "open-in-new-tab",
                label: cm.openInNewTab,
                Icon: ExternalLink,
                onClick: () =>
                  window.open(buildAppHref(`folder=${id}`), "_blank", "noopener,noreferrer"),
              },
            ],
          },
          {
            items: [
              {
                id: "new-folder",
                label: cm.newFolder,
                Icon: FolderPlus,
                onClick: () => setCreatingFolderParentId(id),
              },
              {
                id: "new-snippet",
                label: cm.newSnippet,
                Icon: FilePlus,
                onClick: () => setCreatingSnippetFolderId(id),
              },
              {
                id: "new-note",
                label: cm.newNote,
                Icon: FilePlus2,
                onClick: () => setCreatingNoteFolderId(id),
              },
            ],
          },
          {
            items: [
              folder.isPinnedAside
                ? { id: "unpin", label: cm.unpin, Icon: PinOff, onClick: () => void onPinFolder(id, "aside", false) }
                : { id: "pin",   label: cm.pin,   Icon: Pin,    onClick: () => void onPinFolder(id, "aside", true)  },
              {
                id: "rename",
                label: cm.rename,
                Icon: PenLine,
                onClick: () => setRenamingId(id),
              },
            ],
          },
          {
            items: [
              { id: "cut",  label: cm.cut,  Icon: Scissors, onClick: () => onCut({ type: "cut",  itemType: "folder", id }) },
              { id: "copy", label: cm.copy, Icon: Copy,     onClick: () => onCopy({ type: "copy", itemType: "folder", id }) },
              ...(clipboard ? [{ id: "paste", label: cm.paste, Icon: Clipboard, onClick: () => void onPaste(id) }] : []),
            ],
          },
          {
            items: [{
              id: "delete",
              label: cm.delete,
              Icon: Trash2,
              variant: "destructive" as const,
              onClick: () => void onDeleteFolder(id),
            }],
          },
        ];
      }

      if (type === "snippet" && id) {
        const snippet = snippets.find((s) => s.id === id);
        if (!snippet) return [];
        return [
          {
            items: [
              {
                id: "open-in-new-tab",
                label: cm.openInNewTab,
                Icon: ExternalLink,
                onClick: () =>
                  window.open(buildAppHref(`snippet=${id}`), "_blank", "noopener,noreferrer"),
              },
            ],
          },
          {
            items: [{
              id: "copy-content",
              label: cm.copyContent,
              Icon: Copy,
              onClick: () => void navigator.clipboard.writeText(snippet.code ?? ""),
            }],
          },
          {
            items: [
              snippet.isPinnedAside
                ? { id: "unpin-aside", label: cm.unpinAside, Icon: PinOff, onClick: () => void onPinSnippet(id, "aside", false) }
                : { id: "pin-aside",   label: cm.pinAside,   Icon: Pin,    onClick: () => void onPinSnippet(id, "aside", true)  },
              snippet.isPinnedHome
                ? { id: "unpin-home", label: cm.unpinHome, Icon: PinOff, onClick: () => void onPinSnippet(id, "home", false) }
                : { id: "pin-home",   label: cm.pinHome,   Icon: Pin,    onClick: () => void onPinSnippet(id, "home", true)  },
              {
                id: "rename",
                label: cm.rename,
                Icon: PenLine,
                onClick: () => setRenamingId(id),
              },
            ],
          },
          {
            items: [
              { id: "cut",  label: cm.cut,  Icon: Scissors, onClick: () => onCut({ type: "cut",  itemType: "snippet", id }) },
              { id: "copy", label: cm.copy, Icon: Copy,     onClick: () => onCopy({ type: "copy", itemType: "snippet", id }) },
              ...(clipboard ? [{ id: "paste", label: cm.paste, Icon: Clipboard, onClick: () => void onPaste(snippet.folderId) }] : []),
            ],
          },
          {
            items: [{
              id: "delete",
              label: cm.delete,
              Icon: Trash2,
              variant: "destructive" as const,
              onClick: () => void onDeleteSnippet(id),
            }],
          },
        ];
      }

      if (type === "note" && id) {
        const note = notes.find((n) => n.id === id);
        if (!note) return [];
        return [
          {
            items: [
              {
                id: "open-in-new-tab",
                label: cm.openInNewTab,
                Icon: ExternalLink,
                onClick: () =>
                  window.open(buildAppHref(`note=${id}`), "_blank", "noopener,noreferrer"),
              },
            ],
          },
          {
            items: [
              note.isPinnedAside
                ? { id: "unpin-aside", label: cm.unpinAside, Icon: PinOff, onClick: () => void onPinNote(id, "aside", false) }
                : { id: "pin-aside",   label: cm.pinAside,   Icon: Pin,    onClick: () => void onPinNote(id, "aside", true)  },
              note.isPinnedHome
                ? { id: "unpin-home", label: cm.unpinHome, Icon: PinOff, onClick: () => void onPinNote(id, "home", false) }
                : { id: "pin-home",   label: cm.pinHome,   Icon: Pin,    onClick: () => void onPinNote(id, "home", true)  },
              {
                id: "rename",
                label: cm.rename,
                Icon: PenLine,
                onClick: () => setRenamingId(id),
              },
            ],
          },
          {
            items: [
              { id: "cut",  label: cm.cut,  Icon: Scissors, onClick: () => onCut({ type: "cut",  itemType: "note", id }) },
              { id: "copy", label: cm.copy, Icon: Copy,     onClick: () => onCopy({ type: "copy", itemType: "note", id }) },
              ...(clipboard ? [{ id: "paste", label: cm.paste, Icon: Clipboard, onClick: () => void onPaste(note.folderId) }] : []),
            ],
          },
          {
            items: [{
              id: "delete",
              label: cm.delete,
              Icon: Trash2,
              variant: "destructive" as const,
              onClick: () => void onDeleteNote(id),
            }],
          },
        ];
      }

      return [];
    },
    [
      clipboard,
      copy.contextMenu,
      folders,
      snippets,
      notes,
      onGoHome,
      onNewSnippetAt,
      onPaste,
      onPinFolder,
      onPinSnippet,
      onPinNote,
      onDeleteFolder,
      onDeleteSnippet,
      onDeleteNote,
      onCut,
      onCopy,
      setRenamingId,
      setCreatingFolderParentId,
      setCreatingSnippetFolderId,
      setCreatingNoteFolderId,
    ],
  );
}
