"use client";

import { useRef, useState } from "react";
import { Check, Copy, FileCode2, FileX2, Globe } from "lucide-react";

import type { SnippetRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import { LANGUAGES } from "@/lib/constants/languages";
import { getSnippetDisplayName } from "@/lib/utils";
import { Tooltip } from "@/ui/Tooltip";

interface SnippetReferenceCardProps {
  snippet: SnippetRecord | null;
  copy: Dictionary;
  onOpen: () => void;
}

const PREVIEW_LINES = 6;
const MAX_LINE_LENGTH = 100;

function buildPreview(code: string): { text: string; truncated: boolean } {
  const lines = (code ?? "").split("\n");
  const sliced = lines.slice(0, PREVIEW_LINES).map((line) =>
    line.length > MAX_LINE_LENGTH ? `${line.slice(0, MAX_LINE_LENGTH)}…` : line,
  );
  return { text: sliced.join("\n"), truncated: lines.length > PREVIEW_LINES };
}

function InlineCopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Tooltip content={label} placement="bottom">
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
        className="inline-flex shrink-0 items-center justify-center rounded p-1 text-foreground/35 transition-colors hover:bg-foreground/[0.06] hover:text-foreground/70"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </span>
    </Tooltip>
  );
}

export function SnippetReferenceCard({ snippet, copy, onOpen }: SnippetReferenceCardProps) {
  if (!snippet) {
    return (
      <span className="my-1 inline-flex items-center gap-1.5 rounded-md border border-foreground/[0.06] bg-foreground/[0.02] px-2 py-1 text-[12px] text-foreground/30">
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
  const { text: previewText, truncated } = buildPreview(snippet.code ?? "");
  const sourceUrl = (snippet.sourceUrl ?? "").trim();
  const isValidSourceUrl =
    sourceUrl.length > 0 && (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://"));

  // We render block-styled <span>s (not <div>/<pre>) so this card stays valid
  // HTML inside the <p> that react-markdown wraps inline content in. We also use
  // role="button" instead of an actual <button> so we can nest other clickable
  // controls (copy / source-url) without invalid button-in-button nesting.
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="my-3 block w-full max-w-3xl cursor-pointer overflow-hidden rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] text-left align-middle transition-colors hover:border-foreground/[0.15] hover:bg-foreground/[0.04]"
    >
      <span className="flex items-center gap-2 border-b border-foreground/[0.06] px-3 py-2">
        <FileCode2 size={13} className="shrink-0 text-foreground/45" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
          {displayName}
        </span>
        <InlineCopyButton value={snippet.code ?? ""} label={copy.snippetEditor.copyCode} />
        {langConfig?.label && (
          <span className="shrink-0 rounded bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground/40">
            {langConfig.label}
          </span>
        )}
      </span>
      {sourceUrl && (
        <span className="flex items-center gap-2 border-b border-foreground/[0.04] px-3 py-1.5">
          <Globe size={11} className="shrink-0 text-foreground/30" aria-hidden="true" />
          {isValidSourceUrl ? (
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                window.open(sourceUrl, "_blank", "noopener,noreferrer");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  window.open(sourceUrl, "_blank", "noopener,noreferrer");
                }
              }}
              className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/55 underline decoration-foreground/15 underline-offset-2 hover:text-foreground/80"
              title={sourceUrl}
            >
              {sourceUrl}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/55" title={sourceUrl}>
              {sourceUrl}
            </span>
          )}
          <InlineCopyButton value={sourceUrl} label={copy.noteEditor.copySourceUrl} />
        </span>
      )}
      {previewText.trim() ? (
        <span className="block overflow-x-auto whitespace-pre px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground/55">
          {previewText}
          {truncated && (
            <>
              {"\n"}
              <span className="text-foreground/30">…</span>
            </>
          )}
        </span>
      ) : (
        <span className="block px-3 py-2 text-[11px] italic text-foreground/25">
          {copy.snippetCard.untitled}
        </span>
      )}
    </span>
  );
}
