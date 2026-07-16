"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { NewSnippet } from "@/components/NewSnippet/NewSnippet";
import type { LanguageId } from "@/lib/constants/languages";
import type { FolderRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";

interface CreateSnippetModalProps {
  copy: Dictionary;
  folders: FolderRecord[];
  defaultFolderId: string | null;
  defaultLanguage?: LanguageId;
  codeWrap?: boolean;
  /** Bumped each time the modal opens so NewSnippet focuses its title field. */
  focusNonce: number;
  onCreateSnippet: (data: {
    title: string;
    language: string;
    folderId: string;
    code: string;
  }) => Promise<string | undefined>;
  onClose: () => void;
}

/**
 * Modal wrapper around the NewSnippet form, opened from the global shortcut and
 * the aside / folder-view "new snippet" buttons. Lets the user create a snippet
 * without leaving the current view (editor, folder, trash…). Esc and a backdrop
 * click discard any unsaved input without prompting — the user can always reopen.
 */
export function CreateSnippetModal({
  copy,
  folders,
  defaultFolderId,
  defaultLanguage,
  codeWrap,
  focusNonce,
  onCreateSnippet,
  onClose,
}: CreateSnippetModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-dialog)] bg-[var(--scrim)] backdrop-blur-[2px]"
        onMouseDown={onClose}
      />

      {/* Dialog panel */}
      <div className="fixed inset-0 z-[var(--z-dialog-sticky)] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="klipcode-dialog-animate pointer-events-auto w-full max-w-2xl rounded-xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-snippet-modal-title"
          style={{
            background: "var(--panel-bg)",
            border: "1px solid rgba(var(--ink-rgb),0.09)",
            boxShadow: "var(--panel-shadow)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink/[0.06] px-4 py-3">
            <h2
              id="create-snippet-modal-title"
              className="text-[13px] font-medium text-ink/90"
            >
              {copy.forms.snippetTitle}
            </h2>
            <button
              type="button"
              aria-label={copy.common.close}
              onClick={onClose}
              className="rounded-md p-1 text-ink/40 transition-colors hover:bg-ink/6 hover:text-ink/80"
            >
              <X size={15} />
            </button>
          </div>

          <NewSnippet
            copy={copy}
            folders={folders}
            defaultFolderId={defaultFolderId}
            defaultLanguage={defaultLanguage}
            codeWrap={codeWrap}
            focusNonce={focusNonce}
            embedded
            onCreateSnippet={onCreateSnippet}
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
