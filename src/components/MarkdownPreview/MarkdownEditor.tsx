"use client";

import { lazy, Suspense } from "react";

// TipTap + ProseMirror + lowlight are sizeable; only load the editor when a
// Markdown snippet is actually opened in the WYSIWYG view.
const MarkdownEditorInner = lazy(() => import("./MarkdownEditorInner"));

export interface MarkdownEditorCopy {
  /** Shown in the empty editor before the user types. */
  placeholder: string;
}

export interface MarkdownEditorProps {
  /** The Markdown source. Consumed once on mount; the editor owns it afterwards. */
  value: string;
  /** Called with the serialized Markdown on every edit. */
  onChange: (markdown: string) => void;
  /** When false the document is read-only (e.g. a trashed snippet). */
  editable: boolean;
  copy: MarkdownEditorCopy;
}

/**
 * Notion-like WYSIWYG editing of a Markdown snippet. Drops in where the code
 * Editor would go; the breadcrumbs and aside stay untouched — only the editing
 * surface is swapped. Edits serialize back to Markdown so the snippet stays a
 * plain `.md` document.
 */
export function MarkdownEditor(props: MarkdownEditorProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <div className="h-4 w-32 animate-pulse rounded bg-ink/[0.06]" />
        </div>
      }
    >
      <MarkdownEditorInner {...props} />
    </Suspense>
  );
}
