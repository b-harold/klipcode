"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2, FolderOpen, FileCode2, FileText } from "lucide-react";

import type { Dictionary } from "@/i18n";

interface ConfirmDialogProps {
  copy: Dictionary["confirmDeleteFolder"];
  folderName: string;
  nestedFolderCount: number;
  snippetCount: number;
  noteCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  copy,
  folderName,
  nestedFolderCount,
  snippetCount,
  noteCount,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onCancel]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/70 backdrop-blur-[2px]"
        onMouseDown={onCancel}
      />

      {/* Dialog panel */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="klipcode-dialog-animate pointer-events-auto w-full max-w-[360px] rounded-xl border border-border bg-surface p-5 shadow-2xl"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className="mt-0.5 flex shrink-0 items-center justify-center rounded-lg w-8 h-8"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <Trash2 size={14} className="text-red-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="confirm-dialog-title"
                className="text-[13px] font-medium leading-snug text-foreground/90"
              >
                {copy.title}
              </h2>
              <p
                className="mt-0.5 max-w-[260px] truncate text-[12px] leading-snug text-muted"
                title={folderName}
              >
                {folderName}
              </p>
            </div>
          </div>

          {/* Content counts */}
          <div className="mb-4 space-y-1.5 rounded-lg border border-border bg-overlay-soft px-3 py-2.5">
            {nestedFolderCount > 0 && (
              <div className="flex items-center gap-2">
                <FolderOpen size={12} className="text-muted" />
                <span className="text-[12px] text-foreground/70">
                  {copy.containsFolders(nestedFolderCount)}
                </span>
              </div>
            )}
            {snippetCount > 0 && (
              <div className="flex items-center gap-2">
                <FileCode2 size={12} className="text-muted" />
                <span className="text-[12px] text-foreground/70">
                  {copy.containsSnippets(snippetCount)}
                </span>
              </div>
            )}
            {noteCount > 0 && (
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-muted" />
                <span className="text-[12px] text-foreground/70">
                  {copy.containsNotes(noteCount)}
                </span>
              </div>
            )}
          </div>

          {/* Warning */}
          <p className="mb-4 text-[12px] leading-relaxed text-muted">
            {copy.permanentWarning}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-[13px] font-medium text-muted transition-colors duration-75 hover:bg-overlay hover:text-foreground"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-75"
              style={{
                color: "rgba(239,68,68,0.9)",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.18)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgb(248,113,113)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(239,68,68,0.9)";
              }}
            >
              {copy.confirm}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
