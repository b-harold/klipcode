"use client";

import { useMemo, type ReactNode } from "react";
import { FolderOpen, RotateCcw, Trash2 } from "lucide-react";

import type { Dictionary } from "@/i18n";
import type { FolderRecord, SnippetRecord } from "@/lib/types";
import { TRASH_ROOT_ID } from "@/lib/navigation";
import { SnippetCard } from "@/components/SnippetCards/SnippetCard";
import { FolderCard } from "@/components/FolderView/FolderCard";
import { getFolderPath, buildSnippetCountMap, buildSubFolderCountMap } from "@/components/FolderView/utils";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs/Breadcrumbs";

export interface TrashViewProps {
  /** `TRASH_ROOT_ID` for the trash root, or a trashed folder id when drilling in. */
  folderId: string;
  /** Trashed (soft-deleted) folders for the current owner. */
  folders: FolderRecord[];
  /** Trashed (soft-deleted) snippets for the current owner. */
  snippets: SnippetRecord[];
  copy: Dictionary;
  onNavigateFolder: (folderId: string) => void;
  onNavigateTrashRoot: () => void;
  onSelectSnippet: (id: string) => void;
  onRestoreSnippet: (id: string) => void;
  onPermanentlyDeleteSnippet: (id: string) => void;
  onRestoreFolder: (id: string) => void;
  onPermanentlyDeleteFolder: (id: string) => void;
  onRestoreAll: () => void;
  onEmptyTrash: () => void;
  menuButton?: ReactNode;
}

export function TrashView({
  folderId,
  folders,
  snippets,
  copy,
  onNavigateFolder,
  onNavigateTrashRoot,
  onSelectSnippet,
  onRestoreSnippet,
  onPermanentlyDeleteSnippet,
  onRestoreFolder,
  onPermanentlyDeleteFolder,
  onRestoreAll,
  onEmptyTrash,
  menuButton,
}: TrashViewProps) {
  const isRoot = folderId === TRASH_ROOT_ID;
  const trashedFolderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);

  // The current folder must itself be trashed; otherwise fall back to the root.
  const currentFolder = isRoot ? null : folders.find((f) => f.id === folderId);

  // At the root we surface the "tops" of each trashed subtree: items whose parent
  // is no longer in the trash (live, gone, or never trashed). Inside a trashed
  // folder we show its direct trashed children, exactly like the folder view.
  const childFolders = useMemo(() => {
    const list = isRoot
      ? folders.filter((f) => !f.parentId || !trashedFolderIds.has(f.parentId))
      : folders.filter((f) => f.parentId === folderId);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, trashedFolderIds, isRoot, folderId]);

  const folderSnippets = useMemo(() => {
    const list = isRoot
      ? snippets.filter((s) => !s.folderId || !trashedFolderIds.has(s.folderId))
      : snippets.filter((s) => s.folderId === folderId);
    return [...list].sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
  }, [snippets, trashedFolderIds, isRoot, folderId]);

  const snippetCountMap = useMemo(() => buildSnippetCountMap(snippets), [snippets]);
  const subFolderCountMap = useMemo(() => buildSubFolderCountMap(folders), [folders]);

  // A drilled-in folder that is no longer trashed (e.g. just restored) → go home.
  if (!isRoot && !currentFolder) {
    return null;
  }

  const isEmpty = childFolders.length === 0 && folderSnippets.length === 0;
  const isTrashEmpty = folders.length === 0 && snippets.length === 0;
  const title = isRoot ? copy.trash.title : currentFolder!.name;

  const metaParts = [
    childFolders.length > 0 ? copy.trash.folderCount(childFolders.length) : null,
    folderSnippets.length > 0 ? copy.trash.snippetCount(folderSnippets.length) : null,
  ].filter(Boolean);

  // Breadcrumbs: Trash → …trashed ancestors… → current.
  const path = isRoot ? [] : getFolderPath(folderId, folders);
  const breadcrumbItems: BreadcrumbItem[] = isRoot
    ? [{ id: "trash", label: copy.trash.title, icon: <Trash2 size={12} aria-hidden="true" /> }]
    : [
        {
          id: "trash",
          label: copy.trash.title,
          icon: <Trash2 size={12} aria-hidden="true" />,
          onClick: onNavigateTrashRoot,
        },
        ...path.slice(0, -1).map<BreadcrumbItem>((f) => ({
          id: f.id,
          label: f.name,
          icon: <FolderOpen size={12} aria-hidden="true" />,
          onClick: () => onNavigateFolder(f.id),
        })),
        {
          id: path[path.length - 1].id,
          label: path[path.length - 1].name,
          icon: <FolderOpen size={12} aria-hidden="true" />,
        },
      ];

  return (
    <main className="flex-1 overflow-y-auto">
      <Breadcrumbs items={breadcrumbItems} leading={menuButton} />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-8 pt-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink/[0.08] bg-ink/[0.04]">
              {isRoot ? (
                <Trash2 size={20} className="text-ink/40" />
              ) : (
                <FolderOpen size={20} className="text-ink/40" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {metaParts.length > 0 && (
                <p className="mt-0.5 text-sm text-muted">{metaParts.join(" · ")}</p>
              )}
            </div>
          </div>

          {/* Bulk actions live at the trash root only. */}
          {isRoot && !isTrashEmpty && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRestoreAll}
                className="flex items-center gap-1.5 rounded-lg border border-ink/[0.08] bg-ink/[0.03] px-3 py-1.5 text-[13px] font-medium text-ink/70 transition-colors hover:bg-ink/[0.07] hover:text-foreground"
              >
                <RotateCcw size={14} />
                {copy.trash.restoreAll}
              </button>
              <button
                type="button"
                onClick={onEmptyTrash}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-1.5 text-[13px] font-medium text-red-400/90 transition-colors hover:bg-red-500/15 hover:text-red-300"
              >
                <Trash2 size={14} />
                {copy.trash.emptyTrash}
              </button>
            </div>
          )}
        </div>

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink/[0.07] py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-ink/[0.08] bg-ink/[0.03]">
              <Trash2 size={22} className="text-ink/20" />
            </div>
            <p className="text-sm text-ink/30">{copy.trash.empty}</p>
          </div>
        )}

        {/* ── Sub-folders ─────────────────────────────────────────────────── */}
        {childFolders.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/30">
              {copy.folderView.subFolders}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {childFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  snippetCount={snippetCountMap.get(folder.id) ?? 0}
                  subFolderCount={subFolderCountMap.get(folder.id) ?? 0}
                  copy={copy}
                  onClick={() => onNavigateFolder(folder.id)}
                  trashActions={{
                    onRestore: () => onRestoreFolder(folder.id),
                    onDeletePermanently: () => onPermanentlyDeleteFolder(folder.id),
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Snippets ────────────────────────────────────────────────────── */}
        {folderSnippets.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/30">
              {copy.folderView.snippets}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {folderSnippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  folderName={null}
                  copy={copy}
                  onSelect={() => onSelectSnippet(snippet.id)}
                  trashActions={{
                    onRestore: () => onRestoreSnippet(snippet.id),
                    onDeletePermanently: () => onPermanentlyDeleteSnippet(snippet.id),
                  }}
                  className="w-full shrink"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
