"use client";

import { useEffect, useRef, useState } from "react";
import { FileCode2, FileText, Folder, Search } from "lucide-react";

import type { Dictionary } from "@/i18n";
import type { FolderRecord, NoteRecord, SnippetRecord } from "@/lib/types";
import { useSearch } from "@/hooks/useSearch";
import { LANGUAGES } from "@/lib/constants/languages";
import { getSnippetDisplayName } from "@/lib/utils";

interface SearchOverlayProps {
  snippets: SnippetRecord[];
  notes: NoteRecord[];
  folders: FolderRecord[];
  copy: Dictionary;
  onClose: () => void;
  onSelectSnippet: (id: string) => void;
  onSelectNote: (id: string) => void;
  onSelectFolder: (id: string) => void;
}

export function SearchOverlay({
  snippets,
  notes,
  folders,
  copy,
  onClose,
  onSelectSnippet,
  onSelectNote,
  onSelectFolder,
}: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const result = useSearch(query, { folders, snippets, notes });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sectionLabel = "px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/30";
  const itemRow = "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-foreground/[0.04]";

  const totalShown = result.snippets.length + result.notes.length + result.folders.length;

  return (
    <div
      role="dialog"
      aria-label={copy.search.title}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="klipcode-dialog-animate w-full max-w-xl overflow-hidden rounded-xl border border-foreground/[0.08] bg-background shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-foreground/[0.06] px-3 py-2.5">
          <Search size={14} className="shrink-0 text-foreground/30" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.search.placeholder}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/25 focus:outline-none"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-1">
          {!query.trim() ? (
            <p className="px-4 py-6 text-center text-xs text-foreground/30">
              {copy.search.placeholder}
            </p>
          ) : totalShown === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-foreground/30">
              {copy.search.noResults}
            </p>
          ) : (
            <>
              {result.snippets.length > 0 && (
                <div>
                  <div className={sectionLabel}>{copy.search.snippets}</div>
                  {result.snippets.map((hit) => {
                    const lang = LANGUAGES.find((l) => l.id === hit.snippet.language);
                    const name = getSnippetDisplayName(
                      hit.snippet.title,
                      hit.snippet.language,
                      copy.snippetCard.untitled,
                    );
                    return (
                      <button
                        key={`s-${hit.snippet.id}`}
                        type="button"
                        onClick={() => onSelectSnippet(hit.snippet.id)}
                        className={itemRow}
                      >
                        <FileCode2 size={13} className="shrink-0 text-foreground/35" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-foreground">{name}</span>
                          <span className="block truncate font-mono text-[11px] text-foreground/35">
                            {hit.excerpt}
                          </span>
                        </span>
                        {lang?.label && (
                          <span className="shrink-0 rounded bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground/40">
                            {lang.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {result.notes.length > 0 && (
                <div>
                  <div className={sectionLabel}>{copy.search.notes}</div>
                  {result.notes.map((hit) => (
                    <button
                      key={`n-${hit.note.id}`}
                      type="button"
                      onClick={() => onSelectNote(hit.note.id)}
                      className={itemRow}
                    >
                      <FileText size={13} className="shrink-0 text-foreground/35" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground">
                          {hit.note.title || copy.noteCard.untitled}
                        </span>
                        <span className="block truncate text-[11px] text-foreground/35">
                          {hit.excerpt}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {result.folders.length > 0 && (
                <div>
                  <div className={sectionLabel}>{copy.search.folders}</div>
                  {result.folders.map((hit) => (
                    <button
                      key={`f-${hit.folder.id}`}
                      type="button"
                      onClick={() => onSelectFolder(hit.folder.id)}
                      className={itemRow}
                    >
                      <Folder size={13} className="shrink-0 text-foreground/35" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground">
                          {hit.folder.name}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
