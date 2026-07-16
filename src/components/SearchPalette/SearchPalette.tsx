"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft, FileText, Search } from "lucide-react";

import type { FolderRecord, NoteRecord, SnippetRecord } from "@/lib/types";
import { getSnippetDisplayName } from "@/lib/utils";
import { LanguageIcon } from "@/ui/LanguageIcon";
import type { Dictionary } from "@/i18n";

interface SearchPaletteProps {
  snippets: SnippetRecord[];
  notes: NoteRecord[];
  folders: FolderRecord[];
  copy: Dictionary;
  onSelectSnippet: (id: string) => void;
  onSelectNote: (id: string) => void;
  onClose: () => void;
}

type SearchResult = {
  id: string;
  displayName: string;
  folderPath: string;
  /** A single representative line (the first match, or the first non-empty line). */
  preview: string;
} & ({ kind: "snippet"; language: string } | { kind: "note" });

const MAX_RESULTS = 40;

export function SearchPalette({
  snippets,
  notes,
  folders,
  copy,
  onSelectSnippet,
  onSelectNote,
  onClose,
}: SearchPaletteProps) {
  const t = copy.search;
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const foldersById = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );

  function folderPathFor(folderId: string | null): string {
    if (!folderId) return t.rootFolder;
    const parts: string[] = [];
    let current = foldersById.get(folderId);
    let guard = 0;
    while (current && guard++ < 50) {
      parts.unshift(current.name);
      current = current.parentId ? foldersById.get(current.parentId) : undefined;
    }
    return parts.length > 0 ? parts.join(" / ") : t.rootFolder;
  }

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: SearchResult[] = [];
    for (const snippet of snippets) {
      const title = (snippet.title ?? "").toLowerCase();
      const code = snippet.code ?? "";
      const titleHit = title.includes(q);
      const codeLineHit = code
        .split("\n")
        .find((line) => line.toLowerCase().includes(q));

      if (!titleHit && !codeLineHit) continue;

      const previewLine =
        codeLineHit ?? code.split("\n").find((line) => line.trim().length > 0) ?? "";

      matches.push({
        kind: "snippet",
        id: snippet.id,
        language: snippet.language,
        displayName: getSnippetDisplayName(
          snippet.title ?? "",
          snippet.language,
          copy.snippetCard.untitled,
        ),
        folderPath: folderPathFor(snippet.folderId),
        preview: previewLine.trim().slice(0, 120),
      });

      if (matches.length >= MAX_RESULTS) break;
    }

    for (const note of notes) {
      if (matches.length >= MAX_RESULTS) break;
      const title = (note.title ?? "").toLowerCase();
      const markdown = note.markdown ?? "";
      const titleHit = title.includes(q);
      const bodyLineHit = markdown
        .split("\n")
        .find((line) => line.toLowerCase().includes(q));

      if (!titleHit && !bodyLineHit) continue;

      const previewLine =
        bodyLineHit ?? markdown.split("\n").find((line) => line.trim().length > 0) ?? "";

      matches.push({
        kind: "note",
        id: note.id,
        displayName: note.title || copy.noteCard.untitled,
        folderPath: folderPathFor(note.folderId),
        preview: previewLine.trim().slice(0, 120),
      });
    }
    return matches;
    // foldersById is derived from folders; folderPathFor closes over it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, snippets, notes, foldersById, copy.snippetCard.untitled, copy.noteCard.untitled]);

  // Keep the active row in range and visible as results change.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function choose(index: number) {
    const result = results[index];
    if (!result) return;
    if (result.kind === "note") onSelectNote(result.id);
    else onSelectSnippet(result.id);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(activeIndex);
    }
  }

  // Scroll the active row into view on keyboard navigation.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-dialog)] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm" aria-hidden="true" />

      {/* Palette */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.placeholder}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="klipcode-menu-animate relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl"
        style={{
          background: "var(--panel-bg)",
          border: "1px solid rgba(var(--ink-rgb),0.08)",
          boxShadow:
            "var(--panel-shadow)",
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 border-b border-ink/[0.07] px-4 py-3">
          <Search size={16} className="shrink-0 text-ink/35" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.placeholder}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-ink/30 outline-none"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {query.trim() === "" ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink/30">{t.empty}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink/30">{t.noResults}</p>
          ) : (
            results.map((result, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={`${result.kind}-${result.id}`}
                  type="button"
                  data-index={index}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={[
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    isActive ? "bg-ink/[0.08]" : "hover:bg-ink/[0.04]",
                  ].join(" ")}
                >
                  {result.kind === "note" ? (
                    <FileText
                      size={15}
                      className={`shrink-0 text-ink/45 transition-opacity ${isActive ? "opacity-100" : "opacity-70"}`}
                    />
                  ) : (
                    <LanguageIcon
                      language={result.language}
                      size={15}
                      className={`shrink-0 transition-opacity ${isActive ? "opacity-100" : "opacity-70"}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[13px] text-foreground">
                        {result.displayName}
                      </span>
                      <span className="shrink-0 truncate text-[11px] text-ink/30">
                        {result.folderPath}
                      </span>
                    </div>
                    {result.preview && (
                      <p className="truncate font-mono text-[11px] text-ink/35">
                        {result.preview}
                      </p>
                    )}
                  </div>
                  {isActive && (
                    <CornerDownLeft size={13} className="shrink-0 text-ink/35" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-ink/[0.07] px-4 py-2 text-[11px] text-ink/30">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-ink/[0.07] px-1.5 py-0.5 font-mono">↑↓</kbd>
            {t.navigateHint}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-ink/[0.07] px-1.5 py-0.5 font-mono">↵</kbd>
            {t.selectHint}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-ink/[0.07] px-1.5 py-0.5 font-mono">esc</kbd>
            {t.closeHint}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
