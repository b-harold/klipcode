"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { FolderRecord, SelectedItem } from "@/lib/types";
import { isDescendantOrSelf } from "@/components/Aside/utils";

/* ─────────────────────────── Types ─────────────────────────────────────── */

export interface DraggingItem {
  type: "folder" | "snippet";
  id: string;
  /** Where the drag started: the live workspace, or the trash detail view. */
  origin: "workspace" | "trash";
  /** Present when a multi-selection is being dragged as a batch (always from the
   *  workspace). `id`/`type` mirror the grabbed row; `items` is the whole set. */
  items?: SelectedItem[];
}

interface DragCtxShape {
  dragging: DraggingItem | null;
  dragOverId: string | null;
  startDrag: (
    type: "folder" | "snippet",
    id: string,
    origin?: "workspace" | "trash",
    items?: SelectedItem[],
  ) => void;
  endDrag: () => void;
  enterDropTarget: (id: string) => void;
  clearDropTarget: () => void;
  /** Drop on a folder/root: moves a workspace item, or restores a trash item
   *  into that folder. */
  dropOnFolder: (targetFolderId: string | null) => void;
  canDropOnFolder: (folderId: string) => boolean;
  /** Drop on the trash button: sends a workspace item to the trash. No-op for
   *  items already in the trash. */
  dropOnTrash: () => void;
}

/* ─────────────────────────── Context ───────────────────────────────────── */

const DragCtx = createContext<DragCtxShape | null>(null);

export function useDragCtx(): DragCtxShape {
  const ctx = useContext(DragCtx);
  if (!ctx) throw new Error("useDragCtx must be used within DragProvider");
  return ctx;
}

/* ─────────────────────────── Provider ──────────────────────────────────── */

interface DragProviderProps {
  folders: FolderRecord[];
  onMoveFolder: (id: string, newParentId: string | null) => Promise<void>;
  onMoveSnippet: (id: string, newFolderId: string | null) => Promise<void>;
  /** Move a whole multi-selection into a folder (root = null). */
  onMoveMany: (items: SelectedItem[], targetFolderId: string | null) => Promise<void>;
  /** Send a workspace item to the trash (drag onto the trash button). */
  onTrashItem: (item: DraggingItem) => void;
  /** Send a whole multi-selection to the trash. */
  onTrashMany: (items: SelectedItem[]) => void;
  /** Restore a trashed item into a folder (drag from trash onto the tree). */
  onRestoreItem: (item: DraggingItem, targetFolderId: string | null) => void;
  children: ReactNode;
}

export function DragProvider({
  folders,
  onMoveFolder,
  onMoveSnippet,
  onMoveMany,
  onTrashItem,
  onTrashMany,
  onRestoreItem,
  children,
}: DragProviderProps) {
  const [dragging, setDragging] = useState<DraggingItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  /* Set grabbing cursor globally while dragging */
  useEffect(() => {
    document.body.style.cursor = dragging ? "grabbing" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [dragging]);

  /** A multi-selection drag (always from the workspace). */
  const draggingItems = dragging?.items && dragging.items.length > 1 ? dragging.items : null;

  function canDropOnFolder(folderId: string): boolean {
    if (!dragging) return false;
    // A trashed item can be restored into any live folder; cycle checks only
    // matter when moving a live folder within the live tree.
    if (dragging.origin === "trash") return true;
    // For a batch, every dragged folder must avoid dropping into its own subtree.
    if (draggingItems) {
      return draggingItems.every(
        (it) => it.type !== "folder" || !isDescendantOrSelf(folders, it.id, folderId),
      );
    }
    if (dragging.type === "folder") {
      return !isDescendantOrSelf(folders, dragging.id, folderId);
    }
    return true;
  }

  function dropOnFolder(targetFolderId: string | null) {
    if (!dragging) return;
    if (dragging.origin === "trash") {
      onRestoreItem(dragging, targetFolderId);
      setDragging(null);
      setDragOverId(null);
      return;
    }
    if (draggingItems) {
      if (targetFolderId !== null && !canDropOnFolder(targetFolderId)) return;
      void onMoveMany(draggingItems, targetFolderId);
    } else if (dragging.type === "folder") {
      if (targetFolderId !== null && !canDropOnFolder(targetFolderId)) return;
      void onMoveFolder(dragging.id, targetFolderId);
    } else {
      void onMoveSnippet(dragging.id, targetFolderId);
    }
    setDragging(null);
    setDragOverId(null);
  }

  function dropOnTrash() {
    if (!dragging || dragging.origin === "trash") return;
    if (draggingItems) onTrashMany(draggingItems);
    else onTrashItem(dragging);
    setDragging(null);
    setDragOverId(null);
  }

  return (
    <DragCtx.Provider
      value={{
        dragging,
        dragOverId,
        startDrag: (type, id, origin = "workspace", items) => {
          setDragging({ type, id, origin, items });
          setDragOverId(null);
        },
        endDrag: () => {
          setDragging(null);
          setDragOverId(null);
        },
        enterDropTarget: setDragOverId,
        clearDropTarget: () => setDragOverId(null),
        dropOnFolder,
        canDropOnFolder,
        dropOnTrash,
      }}
    >
      {children}
    </DragCtx.Provider>
  );
}
