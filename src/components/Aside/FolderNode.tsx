"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Folder, FolderOpen, Pin, PinOff } from "lucide-react";
import type { FolderRecord, SnippetRecord } from "@/lib/types";
import { Tooltip, TruncateTooltip } from "@/ui/Tooltip";
import { useAsideCtx } from "./AsideContext";
import { ItemActions } from "./ItemActions";
import { NewFolderInput } from "./NewFolderInput";
import { NewSnippetInput } from "./NewSnippetInput";
import { SnippetNode } from "./SnippetNode";
import { STEP, sortByPinThenAlpha } from "./utils";

export function FolderNode({
  folder,
  folders,
  snippets,
  depth,
}: {
  folder: FolderRecord;
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  depth: number;
}) {
  const ctx = useAsideCtx();
  const [isOpen, setIsOpen] = useState(false);

  const isRenaming = ctx.renamingId === folder.id;
  const isCreatingHere = ctx.creatingFolderParentId === folder.id;
  const isCreatingSnippetHere = ctx.creatingSnippetFolderId === folder.id;

  const childFolders = sortByPinThenAlpha(
    folders.filter((f) => f.parentId === folder.id),
    (f) => f.name,
  );
  const childSnippets = sortByPinThenAlpha(
    snippets.filter((s) => s.folderId === folder.id),
    (s) => s.title ?? "",
  );

  const prevCreating = useRef(false);
  useEffect(() => {
    // Intentional: auto-expand this folder the moment inline creation starts
    // here. A synchronize-on-transition effect, guarded by the prev-state ref.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if ((isCreatingHere || isCreatingSnippetHere) && !prevCreating.current) setIsOpen(true);
    prevCreating.current = isCreatingHere || isCreatingSnippetHere;
  }, [isCreatingHere, isCreatingSnippetHere]);

  function openContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    ctx.selectForMenu(folder.id);
    ctx.openMenu({ type: "folder", id: folder.id, x: e.clientX, y: e.clientY });
  }

  function openMoreMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    ctx.selectForMenu(folder.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ctx.openMenu({ type: "folder", id: folder.id, x: rect.left, y: rect.bottom + 4 });
  }

  const paddingLeft = 10 + depth * STEP;
  const isDraggingThis = ctx.isDraggingItem(folder.id);
  const isDropTarget = ctx.dragOverId === folder.id && ctx.canDropOnFolder(folder.id);
  // The active row (open in the main view) gets a bordered highlight; rows that
  // are only part of a multi-selection get a borderless fill.
  const isActive = ctx.selectedFolderId === folder.id;
  const isMultiSelected = ctx.isItemSelected(folder.id) && !isActive;
  const sharedRowClass = [
    "group relative mr-1 flex items-center gap-1.5 rounded-md py-[5px] pr-2 text-left text-[13px] transition-all duration-100",
    isActive
      ? "bg-ink/[0.08] text-foreground ring-1 ring-inset ring-ink/25"
      : isMultiSelected
        ? "bg-ink/[0.08] text-foreground"
        : "text-muted hover:bg-ink/[0.04] hover:text-foreground",
    isDraggingThis ? "opacity-40" : "",
    isDropTarget ? "bg-ink/[0.07] text-foreground ring-1 ring-inset ring-ink/[0.18]" : "",
  ].filter(Boolean).join(" ");
  const hasChildren = childFolders.length > 0 || childSnippets.length > 0;
  const isAnyCreatingHere = isCreatingHere || isCreatingSnippetHere;

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
            className={`shrink-0 text-ink/25 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
          />
          {isOpen && hasChildren ? (
            <FolderOpen size={13} className="shrink-0 text-ink/25" />
          ) : (
            <Folder size={13} className="shrink-0 text-ink/25" />
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
            className="min-w-0 flex-1 rounded bg-ink/[0.07] px-2 py-0.5 text-[13px] text-foreground outline-none ring-1 ring-ink/15 focus:ring-ink/35 transition-shadow"
          />
        </div>
      ) : (
        <div
          className={`${sharedRowClass} cursor-pointer`}
          style={{ paddingLeft }}
          role="button"
          tabIndex={0}
          data-selectable-id={folder.id}
          data-selectable-type="folder"
          onClick={(e) => ctx.activateItem(e, { id: folder.id, type: "folder" })}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              ctx.activateItem(e, { id: folder.id, type: "folder" });
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
              className="flex h-4 w-4 shrink-0 items-center justify-center text-ink/25 transition-colors hover:text-ink/45"
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
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left active:cursor-grabbing"
          >
            {isOpen && hasChildren ? (
              <FolderOpen size={13} className="shrink-0 text-ink/25" />
            ) : (
              <Folder size={13} className="shrink-0 text-ink/25" />
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
                className="group/pin shrink-0 rounded p-px text-ink/30 transition-colors hover:text-ink/70"
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
              className="absolute bottom-1 top-0 w-px bg-ink/[0.05]"
              style={{ left: `${paddingLeft + 6}px` }}
            />
          )}
          {isCreatingHere && (
            <NewFolderInput depth={depth + 1} parentId={folder.id} />
          )}
          {isCreatingSnippetHere && (
            <NewSnippetInput depth={depth + 1} folderId={folder.id} />
          )}
          {childFolders.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              folders={folders}
              snippets={snippets}
              depth={depth + 1}
            />
          ))}
          {childSnippets.map((snippet) => (
            <SnippetNode key={snippet.id} snippet={snippet} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
