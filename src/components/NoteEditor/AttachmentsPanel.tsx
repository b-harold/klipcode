"use client";

import { useEffect, useMemo } from "react";
import { ArrowLeft, ExternalLink, FileCode2, FileX2 } from "lucide-react";

import { Editor } from "@/components/Editor/Editor";
import { Tooltip } from "@/ui/Tooltip";
import { LANGUAGES } from "@/lib/constants/languages";
import { getSnippetDisplayName } from "@/lib/utils";
import type { Dictionary } from "@/i18n";
import type { SnippetRecord } from "@/lib/types";

import { extractSnippetIds } from "./markdownPlugin";

interface AttachmentsPanelProps {
  markdown: string;
  snippets: SnippetRecord[];
  copy: Dictionary;
  selectedSnippetId: string | null;
  onSelect: (snippetId: string | null) => void;
  onOpenInEditor?: (snippetId: string) => void;
}

export function AttachmentsPanel({
  markdown,
  snippets,
  copy,
  selectedSnippetId,
  onSelect,
  onOpenInEditor,
}: AttachmentsPanelProps) {
  const attachedIds = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const id of extractSnippetIds(markdown)) {
      if (!seen.has(id)) {
        seen.add(id);
        ordered.push(id);
      }
    }
    return ordered;
  }, [markdown]);

  // Reset selection if the chosen snippet is no longer referenced.
  useEffect(() => {
    if (selectedSnippetId && !attachedIds.includes(selectedSnippetId)) {
      onSelect(null);
    }
  }, [selectedSnippetId, attachedIds, onSelect]);

  const selected = selectedSnippetId
    ? (snippets.find((s) => s.id === selectedSnippetId) ?? null)
    : null;

  if (selectedSnippetId && selected) {
    const lang = LANGUAGES.find((l) => l.id === selected.language);
    const name = getSnippetDisplayName(
      selected.title,
      selected.language,
      copy.snippetCard.untitled,
    );
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-white/55 transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            <ArrowLeft size={12} />
            {copy.noteEditor.backToAttachments}
          </button>
          <FileCode2 size={12} className="ml-1 shrink-0 text-white/35" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            {name}
          </span>
          {lang?.label && (
            <span className="shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
              {lang.label}
            </span>
          )}
          {onOpenInEditor && (
            <Tooltip content={copy.noteEditor.openInEditor} placement="bottom">
              <button
                type="button"
                aria-label={copy.noteEditor.openInEditor}
                onClick={() => onOpenInEditor(selected.id)}
                className="shrink-0 rounded p-1 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/70"
              >
                <ExternalLink size={12} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden [&>div]:h-full">
          <Editor
            value={selected.code}
            onChange={() => {}}
            language={selected.language}
            readOnly
            height="100%"
            fontSize={13}
            gutterBackground="var(--background)"
          />
        </div>
      </div>
    );
  }

  if (attachedIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="max-w-xs text-xs leading-relaxed text-white/30">
          {copy.noteEditor.noAttachments}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/[0.06] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {copy.noteEditor.attachments} · {attachedIds.length}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {attachedIds.map((id) => {
          const snippet = snippets.find((s) => s.id === id) ?? null;
          if (!snippet) {
            return (
              <div
                key={id}
                className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/30"
              >
                <FileX2 size={13} className="shrink-0" aria-hidden="true" />
                <span className="truncate font-mono text-[11px]">{id.slice(0, 8)}…</span>
                <span className="ml-auto">{copy.noteEditor.deletedReference}</span>
              </div>
            );
          }
          const lang = LANGUAGES.find((l) => l.id === snippet.language);
          const name = getSnippetDisplayName(
            snippet.title,
            snippet.language,
            copy.snippetCard.untitled,
          );
          const firstLine =
            (snippet.code ?? "").split("\n").find((line) => line.trim() !== "")?.trim() ?? "";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
            >
              <FileCode2 size={13} className="mt-0.5 shrink-0 text-white/40" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground">{name}</span>
                {firstLine && (
                  <span className="block truncate font-mono text-[11px] text-white/35">
                    {firstLine}
                  </span>
                )}
              </span>
              {lang?.label && (
                <span className="mt-0.5 shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                  {lang.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
