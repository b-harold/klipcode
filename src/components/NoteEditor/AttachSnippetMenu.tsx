"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileCode2, Search } from "lucide-react";

import type { SnippetRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import { LANGUAGES } from "@/lib/constants/languages";
import { getSnippetDisplayName } from "@/lib/utils";

interface AttachSnippetMenuProps {
  snippets: SnippetRecord[];
  copy: Dictionary;
  onPick: (snippetId: string) => void;
  onClose: () => void;
}

export function AttachSnippetMenu({ snippets, copy, onPick, onClose }: AttachSnippetMenuProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...snippets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!q) return sorted.slice(0, 30);
    return sorted
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.language.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [snippets, query]);

  return (
    <div
      role="dialog"
      aria-label={copy.noteEditor.attachSnippet}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="klipcode-dialog-animate w-full max-w-md overflow-hidden rounded-xl border border-foreground/[0.08] bg-background shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-foreground/[0.06] px-3 py-2">
          <Search size={14} className="shrink-0 text-foreground/30" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.noteEditor.attachSearchPlaceholder}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/25 focus:outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-foreground/30">
              {copy.noteEditor.attachNoResults}
            </p>
          ) : (
            results.map((snippet) => {
              const langConfig = LANGUAGES.find((l) => l.id === snippet.language);
              const name = getSnippetDisplayName(
                snippet.title,
                snippet.language,
                copy.snippetCard.untitled,
              );
              return (
                <button
                  key={snippet.id}
                  type="button"
                  onClick={() => onPick(snippet.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-foreground/[0.04]"
                >
                  <FileCode2 size={13} className="shrink-0 text-foreground/35" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{name}</span>
                  {langConfig?.label && (
                    <span className="shrink-0 rounded bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground/40">
                      {langConfig.label}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
