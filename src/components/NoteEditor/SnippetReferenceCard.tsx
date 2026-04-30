"use client";

import { FileCode2, FileX2 } from "lucide-react";

import type { SnippetRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import { LANGUAGES } from "@/lib/constants/languages";
import { getSnippetDisplayName } from "@/lib/utils";

interface SnippetReferenceCardProps {
  snippet: SnippetRecord | null;
  copy: Dictionary;
  onOpen: () => void;
}

export function SnippetReferenceCard({ snippet, copy, onOpen }: SnippetReferenceCardProps) {
  if (!snippet) {
    return (
      <span className="my-1 inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[12px] text-white/30">
        <FileX2 size={12} aria-hidden="true" />
        {copy.noteEditor.deletedReference}
      </span>
    );
  }

  const langConfig = LANGUAGES.find((l) => l.id === snippet.language);
  const displayName = getSnippetDisplayName(
    snippet.title,
    snippet.language,
    copy.snippetCard.untitled,
  );
  const firstLine = (snippet.code ?? "").split("\n").find((line) => line.trim() !== "")?.trim() ?? "";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="my-1 inline-flex max-w-full items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-left transition-colors hover:border-white/[0.15] hover:bg-white/[0.06]"
    >
      <FileCode2 size={13} className="shrink-0 text-white/45" aria-hidden="true" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[12px] font-medium text-foreground">{displayName}</span>
        {firstLine && (
          <span className="truncate font-mono text-[11px] text-white/35">{firstLine}</span>
        )}
      </span>
      {langConfig?.label && (
        <span className="shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
          {langConfig.label}
        </span>
      )}
    </button>
  );
}
