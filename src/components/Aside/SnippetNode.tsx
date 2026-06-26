"use client";

import { useState } from "react";
import { Pin, PinOff } from "lucide-react";
import type { SnippetRecord } from "@/lib/types";
import { getSnippetDisplayName, getSnippetFileName, resolveSnippetRename } from "@/lib/utils";
import { LanguageIcon } from "@/ui/LanguageIcon";
import { Tooltip, TruncateTooltip } from "@/ui/Tooltip";
import { useAsideCtx } from "./AsideContext";
import { ItemActions } from "./ItemActions";
import { STEP } from "./utils";

/**
 * The inline rename input for a snippet row. Controlled so the filename's
 * extension can be resolved to a language on every keystroke — mirroring
 * {@link resolveSnippetRename}'s logic — and the leading icon updates live as
 * the user types (e.g. typing `.css` flips it to the CSS glyph immediately).
 */
function RenameRow({
  snippet,
  className,
  paddingLeft,
  onContextMenu,
  onSubmit,
  onCancel,
}: {
  snippet: SnippetRecord;
  className: string;
  paddingLeft: number;
  onContextMenu: (e: React.MouseEvent) => void;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(() => getSnippetFileName(snippet.title, snippet.language));
  const previewLanguage = resolveSnippetRename(value, snippet.language).language;

  return (
    <div className={className} style={{ paddingLeft }} onContextMenu={onContextMenu}>
      <LanguageIcon language={previewLanguage} size={13} className="shrink-0" />
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => onSubmit(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") onSubmit((e.target as HTMLInputElement).value);
          if (e.key === "Escape") onCancel();
        }}
        className="min-w-0 flex-1 rounded bg-ink/[0.07] px-2 py-0.5 text-[13px] text-foreground outline-none ring-1 ring-ink/15 focus:ring-ink/35 transition-shadow"
      />
    </div>
  );
}

export function SnippetNode({ snippet, depth }: { snippet: SnippetRecord; depth: number }) {
  const ctx = useAsideCtx();
  const isRenaming = ctx.renamingId === snippet.id;

  const displayName = getSnippetDisplayName(snippet.title, snippet.language, ctx.copy.snippetCard.untitled);

  const paddingLeft = 10 + depth * STEP + 19;
  const isDraggingThis = ctx.isDraggingItem(snippet.id);
  // The active row (open in the main view) gets a bordered highlight; rows that
  // are only part of a multi-selection get a borderless fill.
  const isActive = ctx.selectedSnippetId === snippet.id;
  const isMultiSelected = ctx.isItemSelected(snippet.id) && !isActive;
  const sharedRowClass = [
    "group relative mr-1 flex items-center gap-1.5 rounded-md py-[5px] pr-2 text-left text-[13px] transition-all duration-100",
    isActive
      ? "bg-ink/[0.08] text-foreground ring-1 ring-inset ring-ink/25"
      : isMultiSelected
        ? "bg-ink/[0.08] text-foreground"
        : "text-muted hover:bg-ink/[0.04] hover:text-foreground",
    isDraggingThis ? "opacity-40" : "",
  ].filter(Boolean).join(" ");

  function openContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    ctx.selectForMenu(snippet.id);
    ctx.openMenu({ type: "snippet", id: snippet.id, x: e.clientX, y: e.clientY });
  }

  function openMoreMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    ctx.selectForMenu(snippet.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ctx.openMenu({ type: "snippet", id: snippet.id, x: rect.left, y: rect.bottom + 4 });
  }

  return isRenaming ? (
    <RenameRow
      snippet={snippet}
      className={sharedRowClass}
      paddingLeft={paddingLeft}
      onContextMenu={openContextMenu}
      onSubmit={(value) => ctx.submitSnippetRename(snippet.id, value)}
      onCancel={ctx.cancelRename}
    />
  ) : (
    <div
      role="button"
      tabIndex={0}
      data-tree-id={snippet.id}
      data-tree-type="snippet"
      onClick={(e) => ctx.activateItem(e, { id: snippet.id, type: "snippet" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.activateItem(e, { id: snippet.id, type: "snippet" });
        }
      }}
      onContextMenu={openContextMenu}
      className={`${sharedRowClass} cursor-pointer`}
      style={{ paddingLeft }}
    >
      <span
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          ctx.startDrag("snippet", snippet.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => ctx.endDrag()}
        className="flex min-w-0 flex-1 items-center gap-1.5 active:cursor-grabbing"
      >
        <LanguageIcon language={snippet.language} size={13} className="shrink-0" />
        <TruncateTooltip text={displayName} className="flex-1 truncate leading-none" />
      </span>
      <ItemActions onMore={openMoreMenu} label={ctx.copy.contextMenu.moreOptions} />
      {snippet.isPinnedAside && (
        <Tooltip content={ctx.copy.aside.unpin}>
          <span
            role="button"
            aria-label={ctx.copy.aside.unpin}
            className="group/pin shrink-0 rounded p-px text-ink/30 transition-colors hover:text-ink/70"
            onClick={(e) => {
              e.stopPropagation();
              void ctx.pinSnippet(snippet.id, "aside", false);
            }}
          >
            <Pin size={10} className="block group-hover/pin:hidden" />
            <PinOff size={10} className="hidden group-hover/pin:block" />
          </span>
        </Tooltip>
      )}
    </div>
  );
}
