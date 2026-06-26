"use client";

import { lazy, Suspense } from "react";

// react-markdown + remark-gfm are sizeable; keep them out of the main bundle by
// only loading the renderer when a Markdown snippet is actually previewed.
const MarkdownRenderer = lazy(() => import("./MarkdownRenderer"));

export interface MarkdownPreviewProps {
  /** The raw Markdown source to render. */
  value: string;
  /** Shown when the snippet is empty so the preview pane isn't blank. */
  emptyLabel: string;
}

/**
 * Notion-like read-only rendering of a Markdown snippet. Drops in where the code
 * Editor would go; it re-renders live as `value` changes. Breadcrumbs and the
 * aside stay untouched — only the editing surface is swapped.
 */
export function MarkdownPreview({ value, emptyLabel }: MarkdownPreviewProps) {
  const isEmpty = !value.trim();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8 pr-10">
        {isEmpty ? (
          <p className="text-[15px] italic text-ink/30">{emptyLabel}</p>
        ) : (
          <Suspense fallback={<div className="h-4 w-24 animate-pulse rounded bg-ink/[0.06]" />}>
            <MarkdownRenderer value={value} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
