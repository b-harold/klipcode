"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Eye, FileCode2, FileX2, Globe, Pencil } from "lucide-react";

import { Editor } from "@/components/Editor/Editor";
import { Tooltip } from "@/ui/Tooltip";
import { LANGUAGES } from "@/lib/constants/languages";
import { getSnippetDisplayName } from "@/lib/utils";
import { DEBOUNCE_MS } from "@/lib/constants/timing";
import type { Dictionary } from "@/i18n";
import type { SnippetRecord } from "@/lib/types";

import { extractSnippetIds } from "./markdownPlugin";

interface AttachmentsPanelProps {
  markdown: string;
  snippets: SnippetRecord[];
  copy: Dictionary;
  selectedSnippetId: string | null;
  onSelect: (snippetId: string | null) => void;
  onUpdateSnippet?: (
    snippetId: string,
    changes: { title?: string; code?: string; language?: string; sourceUrl?: string | null },
  ) => void;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Tooltip content={label} placement="bottom">
      <button
        type="button"
        aria-label={label}
        onClick={handleCopy}
        className="shrink-0 rounded p-1 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/70"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </Tooltip>
  );
}

export function AttachmentsPanel({
  markdown,
  snippets,
  copy,
  selectedSnippetId,
  onSelect,
  onUpdateSnippet,
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
    return (
      <SelectedSnippetView
        key={selected.id}
        snippet={selected}
        copy={copy}
        onBack={() => onSelect(null)}
        onUpdateSnippet={onUpdateSnippet}
      />
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
            <div
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(id);
                }
              }}
              className="group flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
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
              <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                <CopyButton value={snippet.code} label={copy.snippetEditor.copyCode} />
              </span>
              {lang?.label && (
                <span className="mt-0.5 shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                  {lang.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SelectedSnippetViewProps {
  snippet: SnippetRecord;
  copy: Dictionary;
  onBack: () => void;
  onUpdateSnippet?: (
    snippetId: string,
    changes: { title?: string; code?: string; language?: string; sourceUrl?: string | null },
  ) => void;
}

function SelectedSnippetView({ snippet, copy, onBack, onUpdateSnippet }: SelectedSnippetViewProps) {
  const editorCopy = copy.snippetEditor;
  const lang = LANGUAGES.find((l) => l.id === snippet.language);
  const name = getSnippetDisplayName(snippet.title, snippet.language, copy.snippetCard.untitled);

  const canEdit = !!onUpdateSnippet;
  const [editMode, setEditMode] = useState(false);
  const [code, setCode] = useState(snippet.code);
  const [sourceUrl, setSourceUrl] = useState(snippet.sourceUrl ?? "");
  const [editingSourceUrl, setEditingSourceUrl] = useState(false);

  const codeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceUrlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCodeChange(next: string) {
    setCode(next);
    if (!onUpdateSnippet) return;
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
    codeTimerRef.current = setTimeout(() => {
      onUpdateSnippet(snippet.id, { code: next });
    }, DEBOUNCE_MS);
  }

  function handleSourceUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setSourceUrl(next);
    if (!onUpdateSnippet) return;
    if (sourceUrlTimerRef.current) clearTimeout(sourceUrlTimerRef.current);
    sourceUrlTimerRef.current = setTimeout(() => {
      onUpdateSnippet(snippet.id, { sourceUrl: next.trim() ? next.trim() : null });
    }, DEBOUNCE_MS);
  }

  const trimmedSourceUrl = sourceUrl.trim();
  const isValidSourceUrl =
    trimmedSourceUrl.length > 0 &&
    (trimmedSourceUrl.startsWith("http://") || trimmedSourceUrl.startsWith("https://"));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <button
          type="button"
          onClick={onBack}
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
        <CopyButton value={code} label={editorCopy.copyCode} />
        {canEdit && (
          <Tooltip
            content={editMode ? copy.noteEditor.viewSnippet : copy.noteEditor.editSnippet}
            placement="bottom"
          >
            <button
              type="button"
              aria-label={editMode ? copy.noteEditor.viewSnippet : copy.noteEditor.editSnippet}
              onClick={() => setEditMode((v) => !v)}
              className={`shrink-0 rounded p-1 transition-colors ${
                editMode
                  ? "bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
                  : "text-white/35 hover:bg-white/[0.06] hover:text-white/70"
              }`}
            >
              {editMode ? <Eye size={12} /> : <Pencil size={12} />}
            </button>
          </Tooltip>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] px-3 py-1.5 text-[12px]">
        <Globe size={12} className="shrink-0 text-white/30" aria-hidden="true" />
        {canEdit && (editingSourceUrl || !trimmedSourceUrl) ? (
          <input
            type="url"
            value={sourceUrl}
            onChange={handleSourceUrlChange}
            onFocus={() => setEditingSourceUrl(true)}
            onBlur={() => setEditingSourceUrl(false)}
            placeholder={editorCopy.sourceUrlPlaceholder}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-white/55 placeholder:text-white/20 focus:outline-none"
          />
        ) : isValidSourceUrl ? (
          <>
            <a
              href={trimmedSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate font-mono text-[12px] text-white/55 underline decoration-white/15 underline-offset-2 hover:text-white/80"
              title={trimmedSourceUrl}
            >
              {trimmedSourceUrl}
            </a>
            <CopyButton value={trimmedSourceUrl} label={copy.noteEditor.copySourceUrl} />
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditingSourceUrl(true)}
                aria-label={editorCopy.sourceUrl}
                className="shrink-0 rounded p-1 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              >
                <Pencil size={11} />
              </button>
            )}
          </>
        ) : trimmedSourceUrl ? (
          <>
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-white/55" title={trimmedSourceUrl}>
              {trimmedSourceUrl}
            </span>
            <CopyButton value={trimmedSourceUrl} label={copy.noteEditor.copySourceUrl} />
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-white/20">
            {editorCopy.sourceUrlPlaceholder}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden [&>div]:h-full">
        <Editor
          value={code}
          onChange={canEdit && editMode ? handleCodeChange : () => {}}
          language={snippet.language}
          readOnly={!canEdit || !editMode}
          height="100%"
          fontSize={13}
          gutterBackground="var(--background)"
        />
      </div>
    </div>
  );
}
