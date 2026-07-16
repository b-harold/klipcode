"use client";

import { FileText } from "lucide-react";
import type { NoteRecord } from "@/lib/types";
import { TruncateTooltip } from "@/ui/Tooltip";
import { useAsideCtx } from "./AsideContext";
import { ItemActions } from "./ItemActions";
import { PinnedIcon } from "./PinnedIcon";
import { STEP, suppressRowDragStart } from "./utils";

export function NoteNode({ note, depth }: { note: NoteRecord; depth: number }) {
  const ctx = useAsideCtx();
  const isRenaming = ctx.renamingId === note.id;

  const displayName = note.title || ctx.copy.noteCard.untitled;

  const paddingLeft = 10 + depth * STEP + 19;
  const isDraggingThis = ctx.isDraggingItem(note.id);
  const isMultiSelected = ctx.isItemSelected(note.id);
  const sharedRowClass = [
    "group relative mr-1 flex items-center gap-1.5 rounded-md py-[5px] pr-2 text-left text-[13px] transition-all duration-100",
    isMultiSelected
      ? "bg-ink/[0.08] text-foreground"
      : "text-muted hover:bg-ink/[0.04] hover:text-foreground",
    isDraggingThis ? "opacity-40" : "",
  ].filter(Boolean).join(" ");

  function openContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    ctx.selectForMenu(note.id);
    ctx.openMenu({ type: "note", id: note.id, x: e.clientX, y: e.clientY });
  }

  function openMoreMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    ctx.selectForMenu(note.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ctx.openMenu({ type: "note", id: note.id, x: rect.left, y: rect.bottom + 4 });
  }

  return isRenaming ? (
    <div className={sharedRowClass} style={{ paddingLeft }} onContextMenu={openContextMenu}>
      <FileText size={13} className="shrink-0 text-ink/25" />
      <input
        autoFocus
        defaultValue={note.title ?? ""}
        onBlur={(e) => ctx.submitNoteRename(note.id, e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter")
            ctx.submitNoteRename(note.id, (e.target as HTMLInputElement).value);
          if (e.key === "Escape") ctx.cancelRename();
        }}
        className="min-w-0 flex-1 rounded bg-ink/[0.07] px-2 py-0.5 text-[13px] text-foreground outline-none ring-1 ring-ink/15 focus:ring-ink/35 transition-shadow"
      />
    </div>
  ) : (
    <div
      role="button"
      tabIndex={0}
      data-selectable-id={note.id}
      data-selectable-type="note"
      draggable
      onDragStart={(e) => {
        if (suppressRowDragStart(e)) return;
        ctx.startDrag("note", note.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => ctx.endDrag()}
      onClick={(e) => ctx.activateItem(e, { id: note.id, type: "note" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.activateItem(e, { id: note.id, type: "note" });
        }
      }}
      onContextMenu={openContextMenu}
      className={`${sharedRowClass} cursor-pointer select-none active:cursor-grabbing`}
      style={{ paddingLeft }}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <PinnedIcon pinned={!!note.isPinnedAside} label={ctx.copy.aside.pinned}>
          <FileText size={13} className="shrink-0 text-ink/25" />
        </PinnedIcon>
        <TruncateTooltip text={displayName} className="flex-1 truncate leading-none" />
      </span>
      <ItemActions onMore={openMoreMenu} label={ctx.copy.contextMenu.moreOptions} />
    </div>
  );
}
