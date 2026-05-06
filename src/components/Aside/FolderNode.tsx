"use client";

import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, Pin, PinOff } from "lucide-react";
import type { FolderRecord, NoteRecord, SnippetRecord } from "@/lib/types";
import { Tooltip, TruncateTooltip } from "@/ui/Tooltip";
import { useAsideCtx } from "./AsideContext";
import { ItemActions } from "./ItemActions";
import { NewFolderInput } from "./NewFolderInput";
import { NewSnippetInput } from "./NewSnippetInput";
import { NewNoteInput } from "./NewNoteInput";
import { SnippetNode } from "./SnippetNode";
import { NoteNode } from "./NoteNode";
import { STEP, sortByPinThenAlpha } from "./utils";

export function FolderNode({
  folder,
  folders,
  snippets,
  notes,
  depth,
}: {
  folder: FolderRecord;
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  notes: NoteRecord[];
  depth: number;
}) {
  const ctx = useAsideCtx();
  const [isOpen, setIsOpen] = useState(false);

  const isRenaming = ctx.renamingId === folder.id;
  const isCreatingHere = ctx.creatingFolderParentId === folder.id;
  const isCreatingSnippetHere = ctx.creatingSnippetFolderId === folder.id;
  const isCreatingNoteHere = ctx.creatingNoteFolderId === folder.id;

  const childFolders = sortByPinThenAlpha(
    folders.filter((f) => f.parentId === folder.id),
    (f) => f.name,
  );
  const childSnippets = sortByPinThenAlpha(
    snippets.filter((s) => s.folderId === folder.id),
    (s) => s.title ?? "",
  );
  const childNotes = sortByPinThenAlpha(
    notes.filter((n) => n.folderId === folder.id),
    (n) => n.title ?? "",
  );

  // Auto-open the folder the moment a "creating here" signal flips on, so the
  // new input is visible. Documented "adjust state when a prop changes" pattern:
  // store the previous value and update during render.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const anyCreating = isCreatingHere || isCreatingSnippetHere || isCreatingNoteHere;
  const [prevAnyCreating, setPrevAnyCreating] = useState(anyCreating);
  if (anyCreating !== prevAnyCreating) {
    setPrevAnyCreating(anyCreating);
    if (anyCreating) setIsOpen(true);
  }

  function openContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    ctx.openMenu({ type: "folder", id: folder.id, x: e.clientX, y: e.clientY });
  }

  function openMoreMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ctx.openMenu({ type: "folder", id: folder.id, x: rect.left, y: rect.bottom + 4 });
  }

  const paddingLeft = 10 + depth * STEP;
  const isDraggingThis = ctx.dragging?.id === folder.id;
  const isDropTarget = ctx.dragOverId === folder.id && ctx.canDropOnFolder(folder.id);
  const sharedRowClass = [
    "group flex w-full items-center gap-1.5 rounded-md py-[5px] pr-2 text-left text-sm text-muted transition-all duration-100 hover:bg-overlay-soft hover:text-foreground",
    isDraggingThis ? "opacity-40" : "",
    isDropTarget ? "bg-overlay text-foreground ring-1 ring-inset ring-accent/30" : "",
  ].filter(Boolean).join(" ");
  const hasChildren = childFolders.length > 0 || childSnippets.length > 0 || childNotes.length > 0;
  const isAnyCreatingHere = isCreatingHere || isCreatingSnippetHere || isCreatingNoteHere;

  return (
    <div>
      {isRenaming ? (
        <div
          className={sharedRowClass}
          style={{ paddingLeft }}
          onContextMenu={openContextMenu}
        >
          <ChevronRight
            size={13}
            className={`shrink-0 text-muted/70 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
          />
          {isOpen && hasChildren ? (
            <FolderOpen size={13} className="shrink-0 text-muted/70" />
          ) : (
            <Folder size={13} className="shrink-0 text-muted/70" />
          )}
          <input
            autoFocus
            defaultValue={folder.name}
            onBlur={(e) => ctx.submitFolderRename(folder.id, e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter")
                ctx.submitFolderRename(folder.id, (e.target as HTMLInputElement).value);
              if (e.key === "Escape") ctx.cancelRename();
            }}
            className="min-w-0 flex-1 rounded bg-overlay px-2 py-0.5 text-sm text-foreground outline-none ring-1 ring-overlay-strong focus:ring-accent/40 transition-shadow"
          />
        </div>
      ) : (
        <div
          className={sharedRowClass}
          style={{ paddingLeft }}
          role="button"
          tabIndex={0}
          onClick={() => ctx.selectFolder(folder.id)}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              ctx.selectFolder(folder.id);
            }
          }}
          onContextMenu={openContextMenu}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            ctx.enterDropTarget(folder.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = ctx.canDropOnFolder(folder.id) ? "move" : "none";
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            ctx.dropOnTarget(folder.id);
          }}
        >
          <Tooltip content={isOpen ? ctx.copy.aside.collapseFolder : ctx.copy.aside.expandFolder}>
            <button
              type="button"
              className="flex h-4 w-4 shrink-0 items-center justify-center text-muted/70 transition-colors hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen((value) => !value);
              }}
              aria-label={isOpen ? ctx.copy.aside.collapseFolder : ctx.copy.aside.expandFolder}
            >
              <ChevronRight
                size={13}
                className={`transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
              />
            </button>
          </Tooltip>

          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              ctx.startDrag("folder", folder.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => ctx.endDrag()}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left cursor-grab active:cursor-grabbing"
          >
            {isOpen && hasChildren ? (
              <FolderOpen size={13} className="shrink-0 text-muted/70" />
            ) : (
              <Folder size={13} className="shrink-0 text-muted/70" />
            )}
            <TruncateTooltip text={folder.name} className="flex-1 truncate leading-none" />
          </button>

          <ItemActions
            onMore={openMoreMenu}
            label={ctx.copy.contextMenu.moreOptions}
          />
          {folder.isPinnedAside && (
            <Tooltip content={ctx.copy.aside.unpin}>
              <button
                type="button"
                aria-label={ctx.copy.aside.unpin}
                className="group/pin shrink-0 rounded p-px text-muted/80 transition-colors hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  void ctx.pinFolder(folder.id, "aside", false);
                }}
              >
                <Pin size={10} className="block group-hover/pin:hidden" />
                <PinOff size={10} className="hidden group-hover/pin:block" />
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {(isOpen || isAnyCreatingHere) && (
        <div className="relative">
          {(hasChildren || isAnyCreatingHere) && (
            <div
              className="absolute bottom-1 top-0 w-px bg-border"
              style={{ left: `${paddingLeft + 6}px` }}
            />
          )}
          {isCreatingHere && (
            <NewFolderInput depth={depth + 1} parentId={folder.id} />
          )}
          {isCreatingSnippetHere && (
            <NewSnippetInput depth={depth + 1} folderId={folder.id} />
          )}
          {isCreatingNoteHere && (
            <NewNoteInput depth={depth + 1} folderId={folder.id} />
          )}
          {childFolders.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              folders={folders}
              snippets={snippets}
              notes={notes}
              depth={depth + 1}
            />
          ))}
          {childSnippets.map((snippet) => (
            <SnippetNode key={snippet.id} snippet={snippet} depth={depth + 1} />
          ))}
          {childNotes.map((note) => (
            <NoteNode key={note.id} note={note} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
