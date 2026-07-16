"use client";

import { Clock, Pin } from "lucide-react";
import type { ReactNode } from "react";

import type { Dictionary } from "@/i18n";
import type { ClipboardEntry, FolderRecord, NoteRecord, SnippetRecord } from "@/lib/types";
import { buildAppHref, openItemInNewTab } from "@/lib/navigation";

import { SnippetCard } from "./SnippetCard";
import { NoteCard } from "./NoteCard";

function getFolderName(folderId: string | null, folders: FolderRecord[]): string | null {
  if (!folderId) return null;
  return folders.find((f) => f.id === folderId)?.name ?? null;
}

function sortByUpdatedAtDesc(snippets: SnippetRecord[]) {
  return [...snippets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Pinned-to-home snippets and notes, interleaved by recency. */
type PinnedItem =
  | { kind: "snippet"; record: SnippetRecord }
  | { kind: "note"; record: NoteRecord };

function buildPinnedItems(snippets: SnippetRecord[], notes: NoteRecord[]): PinnedItem[] {
  return [
    ...snippets.filter((s) => s.isPinnedHome).map((record) => ({ kind: "snippet" as const, record })),
    ...notes.filter((n) => n.isPinnedHome).map((record) => ({ kind: "note" as const, record })),
  ].sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt));
}

/**
 * Roving focus across the card grid: arrow keys move DOM focus to the previous/
 * next card (Enter/Space are handled per-card to open). Cards are already
 * `role="button" tabIndex={0}`, so this only needs to relocate focus.
 */
function handleGridArrowNav(e: React.KeyboardEvent<HTMLDivElement>) {
  if (
    e.key !== "ArrowDown" &&
    e.key !== "ArrowUp" &&
    e.key !== "ArrowLeft" &&
    e.key !== "ArrowRight"
  ) {
    return;
  }
  const cards = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("[data-snippet-card]"),
  );
  const current = cards.indexOf(document.activeElement as HTMLElement);
  if (current === -1) return;
  e.preventDefault();
  const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
  cards[current + delta]?.focus();
}

export interface SnippetCardsProps {
  snippets: SnippetRecord[];
  notes?: NoteRecord[];
  folders: FolderRecord[];
  copy: Dictionary;
  clipboard?: ClipboardEntry | null;
  onSelectSnippet: (snippetId: string) => void;
  onSelectNote?: (noteId: string) => void;
  onNavigateFolder?: (folderId: string) => void;
  onPinSnippet?: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  onPinNote?: (id: string, target: "aside" | "home", pinned: boolean) => Promise<void>;
  onDeleteSnippet?: (id: string) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onRenameSnippet?: (id: string, title: string) => Promise<void>;
  onRenameNote?: (id: string, title: string) => Promise<void>;
  onCutSnippet?: (id: string) => void;
  onCopySnippet?: (id: string) => void;
  onCutNote?: (id: string) => void;
  onCopyNote?: (id: string) => void;
  onPaste?: (targetFolderId: string | null) => Promise<void>;
}

export function SnippetCards(props: SnippetCardsProps) {
  const { snippets, notes = [], copy } = props;

  const pinnedItems = buildPinnedItems(snippets, notes);
  const recentSnippets = sortByUpdatedAtDesc(snippets).slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      {pinnedItems.length > 0 && (
        <SnippetCardsSection
          {...props}
          title={copy.pinnedToHome.title}
          icon={<Pin size={16} className="text-muted" />}
          snippets={[]}
          pinnedItems={pinnedItems}
        />
      )}

      <SnippetCardsSection
        {...props}
        title={copy.recentSnippets.title}
        icon={<Clock size={16} className="text-muted" />}
        snippets={recentSnippets}
        emptyMessage={copy.recentSnippets.empty}
      />
    </div>
  );
}

interface SnippetCardsSectionProps extends SnippetCardsProps {
  title: string;
  icon: ReactNode;
  emptyMessage?: string;
  /** When set, the section renders this snippet/note mix instead of `snippets`. */
  pinnedItems?: PinnedItem[];
}

function SnippetCardsSection({
  title,
  icon,
  snippets,
  folders,
  copy,
  clipboard,
  emptyMessage,
  pinnedItems,
  onSelectSnippet,
  onSelectNote,
  onNavigateFolder,
  onPinSnippet,
  onPinNote,
  onDeleteSnippet,
  onDeleteNote,
  onRenameSnippet,
  onRenameNote,
  onCutSnippet,
  onCopySnippet,
  onCutNote,
  onCopyNote,
  onPaste,
}: SnippetCardsSectionProps) {
  const items: PinnedItem[] =
    pinnedItems ?? snippets.map((record) => ({ kind: "snippet" as const, record }));

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-medium text-muted">{title}</h2>
      </div>

      {items.length === 0 ? (
        emptyMessage ? <p className="text-sm text-ink/30">{emptyMessage}</p> : null
      ) : (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          onKeyDown={handleGridArrowNav}
        >
          {items.map((item) =>
            item.kind === "note" ? (
              <NoteCard
                key={`n-${item.record.id}`}
                note={item.record}
                folderName={getFolderName(item.record.folderId, folders)}
                copy={copy}
                onSelect={() => onSelectNote?.(item.record.id)}
                onOpenInNewTab={() =>
                  window.open(buildAppHref(`note=${item.record.id}`), "_blank", "noopener,noreferrer")
                }
                onNavigateFolder={
                  item.record.folderId && onNavigateFolder
                    ? () => onNavigateFolder(item.record.folderId!)
                    : undefined
                }
                onUnpinHome={
                  item.record.isPinnedHome && onPinNote
                    ? () => void onPinNote(item.record.id, "home", false)
                    : undefined
                }
                onPinAside={
                  onPinNote ? (pinned) => void onPinNote(item.record.id, "aside", pinned) : undefined
                }
                onPinHome={
                  onPinNote ? (pinned) => void onPinNote(item.record.id, "home", pinned) : undefined
                }
                onRename={
                  onRenameNote ? (title) => void onRenameNote(item.record.id, title) : undefined
                }
                onDelete={onDeleteNote ? () => void onDeleteNote(item.record.id) : undefined}
                onCut={onCutNote ? () => onCutNote(item.record.id) : undefined}
                onCopy={onCopyNote ? () => onCopyNote(item.record.id) : undefined}
                onPaste={onPaste ? () => void onPaste(item.record.folderId) : undefined}
                hasPaste={!!clipboard}
                enableDrag
                className="w-full shrink"
              />
            ) : (
              renderSnippetCard(item.record)
            ),
          )}
        </div>
      )}
    </section>
  );

  function renderSnippetCard(snippet: SnippetRecord) {
    return (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              folderName={getFolderName(snippet.folderId, folders)}
              copy={copy}
              onSelect={() => onSelectSnippet(snippet.id)}
              onOpenInNewTab={() => openItemInNewTab("snippet", snippet.id)}
              onNavigateFolder={
                snippet.folderId && onNavigateFolder
                  ? () => onNavigateFolder(snippet.folderId!)
                  : undefined
              }
              onUnpinHome={
                snippet.isPinnedHome && onPinSnippet
                  ? () => void onPinSnippet(snippet.id, "home", false)
                  : undefined
              }
              onPinAside={
                onPinSnippet
                  ? (pinned) => void onPinSnippet(snippet.id, "aside", pinned)
                  : undefined
              }
              onPinHome={
                onPinSnippet
                  ? (pinned) => void onPinSnippet(snippet.id, "home", pinned)
                  : undefined
              }
              onRename={
                onRenameSnippet
                  ? (title) => void onRenameSnippet(snippet.id, title)
                  : undefined
              }
              onDelete={onDeleteSnippet ? () => void onDeleteSnippet(snippet.id) : undefined}
              onCut={onCutSnippet ? () => onCutSnippet(snippet.id) : undefined}
              onCopy={onCopySnippet ? () => onCopySnippet(snippet.id) : undefined}
              onPaste={onPaste ? () => void onPaste(snippet.folderId) : undefined}
              hasPaste={!!clipboard}
              enableDrag
              className="w-full shrink"
            />
    );
  }
}