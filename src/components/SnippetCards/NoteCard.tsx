"use client";

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  Clipboard,
  Copy,
  ExternalLink,
  FileText,
  MoreHorizontal,
  PenLine,
  Pin,
  PinOff,
  Scissors,
  Trash2,
} from "lucide-react";

import type { Dictionary } from "@/i18n";
import type { NoteRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContextMenu, type ContextMenuGroup } from "@/components/ContextMenu/ContextMenu";
import { useDragCtx } from "@/components/DragContext";
import { Tooltip, TruncateTooltip } from "@/ui/Tooltip";

interface NoteCardProps {
  note: NoteRecord;
  copy: Dictionary;
  onSelect: () => void;
  onOpenInNewTab?: () => void;
  onUnpinHome?: () => void;
  onUnpinAside?: () => void;
  onPinAside?: (pinned: boolean) => void;
  onPinHome?: (pinned: boolean) => void;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  hasPaste?: boolean;
  className?: string;
  enableDrag?: boolean;
}

const PREVIEW_LIMIT = 240;

function plainPreview(markdown: string): string {
  return markdown
    .replace(/\[\[snippet:[0-9a-fA-F-]+\]\]/g, "[snippet]")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`~-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PREVIEW_LIMIT);
}

export function NoteCard({
  note,
  copy,
  onSelect,
  onOpenInNewTab,
  onUnpinHome,
  onUnpinAside,
  onPinAside,
  onPinHome,
  onRename,
  onDelete,
  onCut,
  onCopy,
  onPaste,
  hasPaste,
  className,
  enableDrag,
}: NoteCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const drag = useDragCtx();

  const displayName = note.title || copy.noteCard.untitled;
  const preview = plainPreview(note.markdown ?? "");

  function commitRename(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === note.title) {
      setRenaming(false);
      return;
    }
    onRename?.(trimmed);
    setRenaming(false);
  }

  function openMenuAt(x: number, y: number) {
    setMenu({ x, y });
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    openMenuAt(e.clientX, e.clientY);
  }

  function handleMoreClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (rect) openMenuAt(rect.right - 200, rect.bottom + 4);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  const groups: ContextMenuGroup[] = [
    {
      items: [
        ...(onOpenInNewTab
          ? [{ id: "open-new-tab", label: copy.contextMenu.openInNewTab, Icon: ExternalLink, onClick: onOpenInNewTab }]
          : []),
      ],
    },
    {
      items: [
        ...(onUnpinAside
          ? [{ id: "unpin-aside", label: copy.contextMenu.unpinAside, Icon: PinOff, onClick: onUnpinAside }]
          : onPinAside
            ? [{ id: "pin-aside", label: note.isPinnedAside ? copy.contextMenu.unpinAside : copy.contextMenu.pinAside, Icon: note.isPinnedAside ? PinOff : Pin, onClick: () => onPinAside(!note.isPinnedAside) }]
            : []),
        ...(onUnpinHome
          ? [{ id: "unpin-home", label: copy.contextMenu.unpinHome, Icon: PinOff, onClick: onUnpinHome }]
          : onPinHome
            ? [{ id: "pin-home", label: note.isPinnedHome ? copy.contextMenu.unpinHome : copy.contextMenu.pinHome, Icon: note.isPinnedHome ? PinOff : Pin, onClick: () => onPinHome(!note.isPinnedHome) }]
            : []),
        ...(onRename
          ? [{ id: "rename", label: copy.contextMenu.rename, Icon: PenLine, onClick: () => setRenaming(true) }]
          : []),
      ],
    },
    {
      items: [
        ...(onCut ? [{ id: "cut", label: copy.contextMenu.cut, Icon: Scissors, onClick: onCut }] : []),
        ...(onCopy ? [{ id: "copy", label: copy.contextMenu.copy, Icon: Copy, onClick: onCopy }] : []),
        ...(onPaste && hasPaste
          ? [{ id: "paste", label: copy.contextMenu.paste, Icon: Clipboard, onClick: onPaste }]
          : []),
      ],
    },
    {
      items: [
        ...(onDelete
          ? [{ id: "delete", label: copy.contextMenu.delete, Icon: Trash2, variant: "destructive" as const, onClick: onDelete }]
          : []),
      ],
    },
  ].filter((g) => g.items.length > 0);

  const isDraggingThis = drag.dragging?.id === note.id;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        draggable={!!enableDrag}
        onDragStart={
          enableDrag
            ? (e) => {
                e.stopPropagation();
                drag.startDrag("note", note.id);
                e.dataTransfer.effectAllowed = "move";
              }
            : undefined
        }
        onDragEnd={enableDrag ? () => drag.endDrag() : undefined}
        className={cn(
          "group flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]",
          isDraggingThis ? "opacity-40" : "",
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <FileText size={14} className="mt-0.5 shrink-0 text-white/35" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                autoFocus
                defaultValue={note.title ?? ""}
                onBlur={(e) => commitRename(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") commitRename((e.target as HTMLInputElement).value);
                  if (e.key === "Escape") setRenaming(false);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded bg-white/[0.07] px-2 py-0.5 text-[14px] text-foreground outline-none ring-1 ring-white/15 focus:ring-white/35"
              />
            ) : (
              <TruncateTooltip
                text={displayName}
                className="block truncate text-[14px] font-medium text-foreground"
              />
            )}
          </div>
          <Tooltip content={copy.contextMenu.moreOptions} placement="bottom">
            <button
              ref={moreBtnRef}
              type="button"
              aria-label={copy.contextMenu.moreOptions}
              onClick={handleMoreClick}
              className="opacity-0 transition-opacity group-hover:opacity-100 rounded p-1 text-white/40 hover:bg-white/[0.06] hover:text-foreground"
            >
              <MoreHorizontal size={14} />
            </button>
          </Tooltip>
        </div>

        <p className="line-clamp-4 min-h-[3em] text-[12px] leading-relaxed text-white/45">
          {preview || <span className="italic text-white/25">{copy.noteCard.empty}</span>}
        </p>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          groups={groups}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
