"use client";

import { Pin } from "lucide-react";

import type { Dictionary } from "@/i18n";
import type { ClipboardEntry, FolderRecord, NoteRecord, SnippetRecord } from "@/lib/types";

import { SnippetCard } from "./SnippetCard";
import { NoteCard } from "./NoteCard";

function getFolderName(folderId: string | null, folders: FolderRecord[]): string | null {
  if (!folderId) return null;
  return folders.find((f) => f.id === folderId)?.name ?? null;
}

type PinnedItem =
  | { kind: "snippet"; record: SnippetRecord }
  | { kind: "note"; record: NoteRecord };

function buildPinnedItems(snippets: SnippetRecord[], notes: NoteRecord[]): PinnedItem[] {
  const items: PinnedItem[] = [
    ...snippets.filter((s) => s.isPinnedHome).map((record) => ({ kind: "snippet" as const, record })),
    ...notes.filter((n) => n.isPinnedHome).map((record) => ({ kind: "note" as const, record })),
  ];
  return items.sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt));
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

export function SnippetCards({
  snippets,
  notes = [],
  folders,
  copy,
  clipboard,
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
}: SnippetCardsProps) {
  const pinned = buildPinnedItems(snippets, notes);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Pin size={16} className="text-accent" />
        <h2 className="text-base font-semibold text-foreground">{copy.pinnedToHome.title}</h2>
      </div>

      {pinned.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-overlay-soft px-4 py-6 text-sm text-muted">
          {copy.pinnedToHome.emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pinned.map((item) =>
            item.kind === "snippet" ? (
              <SnippetCard
                key={`s-${item.record.id}`}
                snippet={item.record}
                folderName={getFolderName(item.record.folderId, folders)}
                copy={copy}
                onSelect={() => onSelectSnippet(item.record.id)}
                onOpenInNewTab={() => window.open(`/?snippet=${item.record.id}`, "_blank", "noopener,noreferrer")}
                onNavigateFolder={
                  item.record.folderId && onNavigateFolder
                    ? () => onNavigateFolder(item.record.folderId!)
                    : undefined
                }
                onUnpinHome={
                  onPinSnippet ? () => void onPinSnippet(item.record.id, "home", false) : undefined
                }
                onPinAside={
                  onPinSnippet ? (pinned) => void onPinSnippet(item.record.id, "aside", pinned) : undefined
                }
                onPinHome={
                  onPinSnippet ? (pinned) => void onPinSnippet(item.record.id, "home", pinned) : undefined
                }
                onRename={
                  onRenameSnippet ? (title) => void onRenameSnippet(item.record.id, title) : undefined
                }
                onDelete={onDeleteSnippet ? () => void onDeleteSnippet(item.record.id) : undefined}
                onCut={onCutSnippet ? () => onCutSnippet(item.record.id) : undefined}
                onCopy={onCopySnippet ? () => onCopySnippet(item.record.id) : undefined}
                onPaste={onPaste ? () => void onPaste(item.record.folderId) : undefined}
                hasPaste={!!clipboard}
                enableDrag
                className="w-full shrink"
              />
            ) : (
              <NoteCard
                key={`n-${item.record.id}`}
                note={item.record}
                folderName={getFolderName(item.record.folderId, folders)}
                copy={copy}
                onSelect={() => onSelectNote?.(item.record.id)}
                onNavigateFolder={
                  item.record.folderId && onNavigateFolder
                    ? () => onNavigateFolder(item.record.folderId!)
                    : undefined
                }
                onUnpinHome={
                  onPinNote ? () => void onPinNote(item.record.id, "home", false) : undefined
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
            ),
          )}
        </div>
      )}
    </section>
  );
}
