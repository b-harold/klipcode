"use client";

import { useState } from "react";
import { FilePlus, FolderPlus, Home, Keyboard, Layers, RotateCcw, Search, Trash2 } from "lucide-react";

import { ContextMenu } from "@/components/ContextMenu/ContextMenu";
import { useDragCtx } from "@/components/DragContext";
import { Tooltip } from "@/ui/Tooltip";
import { ShortcutHint } from "@/ui/ShortcutHint";

import type { AsideProps, AsideCtxShape, MenuTarget } from "./types";
import { sortByPinThenAlpha } from "./utils";
import { AsideCtx } from "./AsideContext";
import { AsideHeader } from "./AsideHeader";
import { FolderNode } from "./FolderNode";
import { SnippetNode } from "./SnippetNode";
import { NewFolderInput } from "./NewFolderInput";
import { NewSnippetInput } from "./NewSnippetInput";
import { useContextMenuGroups } from "./useContextMenuGroups";
import { GitHubIcon } from "./GitHubIcon";

export type { AsideProps } from "./types";

export function Aside({
  user,
  folders,
  snippets,
  copy,
  clipboard,
  onSelectSnippet,
  onGoHome,
  onOpenSearch,
  onOpenShortcuts,
  onGoSpace,
  onNewSnippetAt,
  onCreateSnippetInline,
  onCreateFolder,
  onDeleteFolder,
  onDeleteSnippet,
  onRenameFolder,
  onRenameSnippet,
  onPinFolder,
  onPinSnippet,
  onCut,
  onCopy,
  onPaste,
  onMoveFolder,
  onMoveSnippet,
  onSelectFolder,
  onSignIn,
  onSignOut,
  onOpenTrash,
  onRestoreAll,
  onEmptyTrash,
  trashCount,
  isOpen,
  isMobile,
  onSetOpen,
}: AsideProps) {
  /* ── State ─────────────────────────────────────────────────────────────── */

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<
    string | null | undefined
  >(undefined);
  const [creatingSnippetFolderId, setCreatingSnippetFolderId] = useState<
    string | null | undefined
  >(undefined);
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [trashMenu, setTrashMenu] = useState<{ x: number; y: number } | null>(null);
  const drag = useDragCtx();

  /* ── Context menu groups ────────────────────────────────────────────────── */

  const buildMenuGroups = useContextMenuGroups({
    copy,
    clipboard,
    folders,
    snippets,
    onGoHome,
    onNewSnippetAt,
    onPaste,
    onPinFolder,
    onPinSnippet,
    onDeleteFolder,
    onDeleteSnippet,
    onCut,
    onCopy,
    setRenamingId,
    setCreatingFolderParentId,
    setCreatingSnippetFolderId,
  });

  /* ── Context value ──────────────────────────────────────────────────────── */

  const ctxValue: AsideCtxShape = {
    copy,
    renamingId,
    creatingFolderParentId,
    creatingSnippetFolderId,
    openMenu: (target) => setMenuTarget(target),
    beginRename: (id) => setRenamingId(id),
    submitFolderRename: (id, value) => {
      const name = value.trim();
      if (name) void onRenameFolder(id, name);
      setRenamingId(null);
    },
    submitSnippetRename: (id, value) => {
      const title = value.trim();
      if (title) void onRenameSnippet(id, title);
      setRenamingId(null);
    },
    cancelRename: () => setRenamingId(null),
    beginCreateFolder: (parentId) => setCreatingFolderParentId(parentId),
    cancelCreateFolder: () => setCreatingFolderParentId(undefined),
    submitCreateFolder: (parentId, name) => {
      void onCreateFolder(parentId, name);
      setCreatingFolderParentId(undefined);
    },
    beginCreateSnippet: (folderId) => setCreatingSnippetFolderId(folderId),
    cancelCreateSnippet: () => setCreatingSnippetFolderId(undefined),
    submitCreateSnippet: (folderId, title) => {
      void onCreateSnippetInline(folderId, title);
      setCreatingSnippetFolderId(undefined);
    },
    selectSnippet: onSelectSnippet,
    selectFolder: (id: string) => onSelectFolder?.(id),
    pinFolder: onPinFolder,
    pinSnippet: onPinSnippet,
    dragging: drag.dragging,
    dragOverId: drag.dragOverId,
    startDrag: drag.startDrag,
    endDrag: drag.endDrag,
    enterDropTarget: drag.enterDropTarget,
    dropOnTarget: drag.dropOnFolder,
    canDropOnFolder: drag.canDropOnFolder,
    folders,
  };

  /* ── Tree data ─────────────────────────────────────────────────────────── */

  const rootFolders    = folders.filter((f) => f.parentId === null);
  const rootSnippets   = snippets.filter((s) => s.folderId === null);
  const pinnedFolders  = sortByPinThenAlpha(rootFolders.filter((f) =>  f.isPinnedAside), (f) => f.name);
  const pinnedSnippets = sortByPinThenAlpha(rootSnippets.filter((s) =>  s.isPinnedAside), (s) => s.title ?? "");
  const unpinnedFolders  = sortByPinThenAlpha(rootFolders.filter((f) => !f.isPinnedAside), (f) => f.name);
  const unpinnedSnippets = sortByPinThenAlpha(rootSnippets.filter((s) => !s.isPinnedAside), (s) => s.title ?? "");
  const isEmpty = rootFolders.length === 0 && rootSnippets.length === 0;

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <AsideCtx.Provider value={ctxValue}>
      {menuTarget && (
        <ContextMenu
          x={menuTarget.x}
          y={menuTarget.y}
          groups={buildMenuGroups(menuTarget)}
          onClose={() => setMenuTarget(null)}
        />
      )}

      {trashMenu && (
        <ContextMenu
          x={trashMenu.x}
          y={trashMenu.y}
          groups={[
            {
              items: [
                {
                  id: "restore-all",
                  label: copy.trash.restoreAll,
                  Icon: RotateCcw,
                  onClick: onRestoreAll,
                },
              ],
            },
            {
              items: [
                {
                  id: "empty-trash",
                  label: copy.trash.emptyTrash,
                  Icon: Trash2,
                  variant: "destructive" as const,
                  onClick: onEmptyTrash,
                },
              ],
            },
          ]}
          onClose={() => setTrashMenu(null)}
        />
      )}

      {/* Mobile backdrop */}
      <div
        aria-hidden="true"
        onClick={() => onSetOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-in-out${
          isOpen && isMobile ? " opacity-100" : " pointer-events-none opacity-0"
        }`}
      />

      {/* Desktop: width-animating wrapper | Mobile: display:contents passthrough */}
      <div
        className={
          isMobile
            ? "contents"
            : `overflow-hidden transition-[width] duration-300 ease-in-out${
                isOpen ? " w-60" : " w-0"
              }`
        }
      >
        <aside
          className={[
            "flex h-screen w-60 shrink-0 flex-col border-r border-white/6 bg-surface",
            isMobile
              ? `fixed inset-y-0 left-0 z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
                  isOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <AsideHeader
            user={user}
            copy={copy}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
            onCollapse={() => onSetOpen(false)}
          />

          <div className="mx-4 mb-2 border-t border-white/5" />

          {/* Home + Search */}
          <div className="px-2">
            <button
              type="button"
              onClick={onGoHome}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-white/4 hover:text-foreground"
            >
              <Home size={14} className="shrink-0" />
              <span>{copy.aside.home}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-white/4 hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Search size={14} className="shrink-0" />
                <span>{copy.aside.search}</span>
              </span>
              <ShortcutHint id="search" />
            </button>
          </div>

          <div className="mx-4 my-3 border-t border-white/5" />

          {/* My Space */}
          <div className="flex flex-1 flex-col overflow-hidden px-2">
            <div className="mb-2 flex items-center justify-between px-2">
              <button
                type="button"
                onClick={onGoSpace}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-white/4 hover:text-foreground"
              >
                <Layers size={12} className="text-white/25" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">
                  {copy.aside.mySpace}
                </span>
              </button>
              <div className="flex items-center gap-0.5">
                <Tooltip content={copy.aside.addSnippet} placement="bottom">
                  <button
                    type="button"
                    aria-label={copy.aside.addSnippet}
                    onClick={() => setCreatingSnippetFolderId(null)}
                    className="rounded p-1 text-white/30 transition-colors hover:bg-white/6 hover:text-muted"
                  >
                    <FilePlus size={13} />
                  </button>
                </Tooltip>
                <Tooltip content={copy.aside.addFolder} placement="bottom">
                  <button
                    type="button"
                    aria-label={copy.aside.addFolder}
                    onClick={() => setCreatingFolderParentId(null)}
                    className="rounded p-1 text-white/30 transition-colors hover:bg-white/6 hover:text-muted"
                  >
                    <FolderPlus size={13} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Tree */}
            <div
              className="flex-1 overflow-y-auto pb-4"
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuTarget({ type: "root", x: e.clientX, y: e.clientY });
              }}
            >
              {isEmpty && creatingFolderParentId === undefined && creatingSnippetFolderId === undefined ? (
                <p className="px-3 pt-1 text-xs text-white/20">{copy.aside.emptySpace}</p>
              ) : (
                <div>
                  {creatingFolderParentId === null && (
                    <NewFolderInput depth={0} parentId={null} />
                  )}
                  {creatingSnippetFolderId === null && (
                    <NewSnippetInput depth={0} folderId={null} />
                  )}
                  {pinnedFolders.map((folder) => (
                    <FolderNode key={folder.id} folder={folder} folders={folders} snippets={snippets} depth={0} />
                  ))}
                  {pinnedSnippets.map((snippet) => (
                    <SnippetNode key={snippet.id} snippet={snippet} depth={0} />
                  ))}
                  {unpinnedFolders.map((folder) => (
                    <FolderNode key={folder.id} folder={folder} folders={folders} snippets={snippets} depth={0} />
                  ))}
                  {unpinnedSnippets.map((snippet) => (
                    <SnippetNode key={snippet.id} snippet={snippet} depth={0} />
                  ))}
                </div>
              )}

              {/* Root drop zone */}
              {drag.dragging && (
                <div
                  onDragEnter={(e) => { e.preventDefault(); drag.enterDropTarget("root"); }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => { e.preventDefault(); drag.dropOnFolder(null); }}
                  className={[
                    "mx-1 mt-1.5 flex items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-[11px] transition-all duration-150 select-none",
                    drag.dragOverId === "root"
                      ? "border-white/30 bg-white/5 text-white/55"
                      : "border-white/8 text-white/20",
                  ].join(" ")}
                >
                  <Layers size={11} />
                  {copy.aside.dropToRoot}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 px-2 pb-4 pt-2">
            <button
              type="button"
              onClick={onOpenTrash}
              onContextMenu={(e) => {
                e.preventDefault();
                setTrashMenu({ x: e.clientX, y: e.clientY });
              }}
              onDragOver={(e) => {
                // dragover fires continuously while the cursor is over the button,
                // so it's the source of truth for the hover state — no child
                // enter/leave flicker (children are pointer-events-none anyway).
                if (drag.dragging?.origin !== "workspace") return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (drag.dragOverId !== "trash-button") drag.enterDropTarget("trash-button");
              }}
              onDragLeave={(e) => {
                // Only clear when the cursor truly leaves the button (relatedTarget
                // outside it), and only if we're still the active target so we don't
                // clobber a sibling target that just took over.
                if (
                  drag.dragOverId === "trash-button" &&
                  !e.currentTarget.contains(e.relatedTarget as Node | null)
                ) {
                  drag.clearDropTarget();
                }
              }}
              onDrop={(e) => {
                if (drag.dragging?.origin !== "workspace") return;
                e.preventDefault();
                drag.dropOnTrash();
              }}
              className={[
                // Always carry a 1px (transparent) border so toggling to the
                // dashed drop-zone border only changes color, never width — an
                // animated 0→1px width renders dashes as a solid line mid-tween.
                "flex w-full items-center rounded-md border border-transparent px-3 py-2 transition-colors duration-150",
                drag.dragging?.origin === "workspace"
                  ? "justify-center gap-1.5 border-dashed text-[11px] select-none " +
                    (drag.dragOverId === "trash-button"
                      ? "border-red-500/50 bg-red-500/10 text-red-300"
                      : "border-white/10 text-white/30")
                  : "gap-2 text-[13px] text-muted hover:bg-white/4 hover:text-foreground",
              ].join(" ")}
            >
              {drag.dragging?.origin === "workspace" ? (
                <>
                  <Trash2 size={12} className="pointer-events-none shrink-0" />
                  <span className="pointer-events-none">{copy.aside.dropToTrash}</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} className="pointer-events-none shrink-0" />
                  <span className="pointer-events-none flex-1 text-left">{copy.aside.trash}</span>
                  {trashCount > 0 && (
                    <span className="pointer-events-none shrink-0 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/45">
                      {trashCount}
                    </span>
                  )}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="mb-2 flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-white/4 hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Keyboard size={14} className="shrink-0" />
                <span>{copy.aside.shortcuts}</span>
              </span>
              <ShortcutHint id="help" />
            </button>
            <a
              href="https://github.com/martinezharo/klipcode"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-center py-2 px-3 gap-2 rounded-md border border-white/4 bg-white/1 text-[12px] font-medium text-white/40 shadow-sm transition-all duration-300 hover:border-white/10 hover:bg-white/4 hover:text-white"
            >
              <GitHubIcon
                size={14}
                className="shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-white"
              />
              <span className="truncate tracking-wide">martinezharo/klipcode</span>
            </a>
          </div>
        </aside>
      </div>
    </AsideCtx.Provider>
  );
}
