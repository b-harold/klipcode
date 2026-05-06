"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { FolderRecord } from "@/lib/types";
import { isDescendantOrSelf } from "@/components/Aside/utils";

/* ─────────────────────────── Types ─────────────────────────────────────── */

export type DraggableType = "folder" | "snippet" | "note";

export interface DraggingItem {
  type: DraggableType;
  id: string;
}

interface DragCtxShape {
  dragging: DraggingItem | null;
  dragOverId: string | null;
  startDrag: (type: DraggableType, id: string) => void;
  endDrag: () => void;
  enterDropTarget: (id: string) => void;
  clearDropTarget: () => void;
  dropOnFolder: (targetFolderId: string | null) => void;
  canDropOnFolder: (folderId: string) => boolean;
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
  onMoveNote: (id: string, newFolderId: string | null) => Promise<void>;
  children: ReactNode;
}

export function DragProvider({
  folders,
  onMoveFolder,
  onMoveSnippet,
  onMoveNote,
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

  function canDropOnFolder(folderId: string): boolean {
    if (!dragging) return false;
    if (dragging.type === "folder") {
      return !isDescendantOrSelf(folders, dragging.id, folderId);
    }
    return true;
  }

  function dropOnFolder(targetFolderId: string | null) {
    if (!dragging) return;
    if (dragging.type === "folder") {
      if (targetFolderId !== null && !canDropOnFolder(targetFolderId)) return;
      void onMoveFolder(dragging.id, targetFolderId);
    } else if (dragging.type === "snippet") {
      void onMoveSnippet(dragging.id, targetFolderId);
    } else {
      void onMoveNote(dragging.id, targetFolderId);
    }
    setDragging(null);
    setDragOverId(null);
  }

  return (
    <DragCtx.Provider
      value={{
        dragging,
        dragOverId,
        startDrag: (type, id) => {
          setDragging({ type, id });
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
      }}
    >
      {children}
    </DragCtx.Provider>
  );
}
