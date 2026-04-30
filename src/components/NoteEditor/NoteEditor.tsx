"use client";

import { useRef, useState } from "react";
import {
  Cloud,
  CloudOff,
  Eye,
  CircleCheck,
  FileText,
  Folder,
  Layers,
  Loader2,
  Paperclip,
  Pencil,
} from "lucide-react";

import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs/Breadcrumbs";
import { Tooltip } from "@/ui/Tooltip";
import { getFolderPath } from "@/components/FolderView/utils";
import type { FolderRecord, NoteRecord, SnippetRecord, SyncStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import { DEBOUNCE_MS } from "@/lib/constants/timing";

import { MarkdownView } from "./MarkdownView";
import { AttachSnippetMenu } from "./AttachSnippetMenu";
import { AttachmentsPanel } from "./AttachmentsPanel";

function SyncIndicator({
  status,
  copy,
}: {
  status: SyncStatus;
  copy: Dictionary["snippetEditor"];
}) {
  const shared = "flex items-center gap-1.5 text-[11px] font-medium";
  switch (status) {
    case "editing":
      return (
        <span className={`${shared} text-white/40`}>
          <Pencil size={11} />
          {copy.syncEditing}
        </span>
      );
    case "saving":
      return (
        <span className={`${shared} text-white/40`}>
          <Loader2 size={11} className="animate-spin" />
          {copy.syncSaving}
        </span>
      );
    case "saved-local":
      return (
        <span className={`${shared} text-white/40`}>
          <CloudOff size={11} />
          {copy.syncSavedLocal}
        </span>
      );
    case "saved-cloud":
      return (
        <span className={`${shared} text-emerald-500/80`}>
          <CircleCheck size={11} />
          {copy.syncSavedCloud}
        </span>
      );
    case "error":
      return (
        <span className={`${shared} text-red-400/80`}>
          <CloudOff size={11} />
          {copy.syncError}
        </span>
      );
    default:
      return (
        <span className={`${shared} text-white/20`}>
          <Cloud size={11} />
          {copy.syncIdle}
        </span>
      );
  }
}

export interface NoteEditorProps {
  note: NoteRecord;
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  copy: Dictionary;
  syncStatus: SyncStatus;
  splitPaneOpen: boolean;
  onClose: () => void;
  onNavigateFolder?: (folderId: string) => void;
  onNavigateHome?: () => void;
  onUpdate: (noteId: string, changes: { title?: string; markdown?: string }) => void;
  onOpenSnippet: (snippetId: string) => void;
  menuButton?: React.ReactNode;
}

export function NoteEditor({
  note,
  folders,
  snippets,
  copy,
  syncStatus,
  splitPaneOpen,
  onClose,
  onNavigateFolder,
  onNavigateHome,
  onUpdate,
  onOpenSnippet,
  menuButton,
}: NoteEditorProps) {
  const editorCopy = copy.noteEditor;

  const [title, setTitle] = useState(note.title);
  const [markdown, setMarkdown] = useState(note.markdown);
  // Empty notes start in edit mode so the user has somewhere to type.
  const [editMode, setEditMode] = useState(() => !note.markdown.trim());
  const [attaching, setAttaching] = useState(false);
  const [attachmentSelectionId, setAttachmentSelectionId] = useState<string | null>(null);

  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setTitle(next);
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      onUpdate(note.id, { title: next });
    }, DEBOUNCE_MS);
  }

  function handleMarkdownChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setMarkdown(next);
    if (markdownTimerRef.current) clearTimeout(markdownTimerRef.current);
    markdownTimerRef.current = setTimeout(() => {
      onUpdate(note.id, { markdown: next });
    }, DEBOUNCE_MS);
  }

  function insertSnippetReference(snippetId: string) {
    const textarea = textareaRef.current;
    const placeholder = `[[snippet:${snippetId}]]`;
    let next: string;
    let cursor: number;

    if (!textarea) {
      next = markdown ? `${markdown}\n\n${placeholder}\n` : `${placeholder}\n`;
      cursor = next.length;
    } else {
      const start = textarea.selectionStart ?? markdown.length;
      const end = textarea.selectionEnd ?? markdown.length;
      next = markdown.slice(0, start) + placeholder + markdown.slice(end);
      cursor = start + placeholder.length;
    }

    setMarkdown(next);
    if (markdownTimerRef.current) clearTimeout(markdownTimerRef.current);
    markdownTimerRef.current = setTimeout(() => {
      onUpdate(note.id, { markdown: next });
    }, 0);

    setAttaching(false);

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      }
    });
  }

  function handleInlineRefClick(snippetId: string) {
    if (splitPaneOpen) {
      // KlipCodeApp's URL-driven split-pane is already showing a SnippetEditor on the right;
      // navigate so it swaps to the clicked one.
      onOpenSnippet(snippetId);
      return;
    }
    setAttachmentSelectionId(snippetId);
  }

  const folderPath = note.folderId ? getFolderPath(note.folderId, folders) : [];

  const breadcrumbItems: BreadcrumbItem[] = [
    {
      id: "root",
      label: copy.aside.mySpace,
      icon: <Layers size={12} aria-hidden="true" />,
      onClick: onNavigateHome ?? onClose,
    },
    ...folderPath.map<BreadcrumbItem>((f) => ({
      id: f.id,
      label: f.name,
      icon: <Folder size={12} aria-hidden="true" />,
      onClick: onNavigateFolder ? () => onNavigateFolder(f.id) : onClose,
    })),
    {
      id: note.id,
      icon: <FileText size={12} className="shrink-0 text-white/40" aria-hidden="true" />,
      label: (
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder={editorCopy.titlePlaceholder}
          className="w-full max-w-[240px] bg-transparent font-medium text-foreground placeholder:text-white/25 focus:outline-none"
          spellCheck={false}
        />
      ),
    },
  ];

  const breadcrumbActions = (
    <>
      <Tooltip content={editorCopy.attachSnippet} placement="bottom">
        <button
          type="button"
          aria-label={editorCopy.attachSnippet}
          onClick={() => {
            // Auto-switch to edit mode so the new ref is inserted at the cursor position.
            setEditMode(true);
            setAttaching(true);
          }}
          className="flex items-center justify-center rounded p-1.5 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/70"
        >
          <Paperclip size={13} />
        </button>
      </Tooltip>
      <div className="h-4 w-px bg-white/[0.08]" />
      <Tooltip content={editMode ? editorCopy.viewMarkdown : editorCopy.editMarkdown} placement="bottom">
        <button
          type="button"
          aria-label={editMode ? editorCopy.viewMarkdown : editorCopy.editMarkdown}
          onClick={() => setEditMode((v) => !v)}
          className={`flex items-center justify-center rounded p-1.5 transition-colors ${
            editMode
              ? "bg-white/[0.06] text-white/80"
              : "text-white/35 hover:bg-white/[0.06] hover:text-white/70"
          }`}
        >
          {editMode ? <Eye size={13} /> : <Pencil size={13} />}
        </button>
      </Tooltip>
    </>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Breadcrumbs
        items={breadcrumbItems}
        leading={menuButton}
        actions={breadcrumbActions}
        defaultStuck
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          className={`flex min-h-0 ${
            splitPaneOpen ? "w-full" : "w-1/2 border-r border-white/[0.06]"
          } flex-col`}
        >
          {editMode ? (
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={handleMarkdownChange}
              placeholder={editorCopy.bodyPlaceholder}
              spellCheck={false}
              className="flex-1 resize-none bg-transparent px-6 py-4 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-white/20 focus:outline-none"
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              {markdown.trim() ? (
                <MarkdownView
                  markdown={markdown}
                  snippets={snippets}
                  copy={copy}
                  onOpenSnippet={handleInlineRefClick}
                />
              ) : (
                <p className="text-sm text-white/25">{editorCopy.previewEmpty}</p>
              )}
            </div>
          )}
        </div>

        {!splitPaneOpen && (
          <div className="flex w-1/2 min-h-0 flex-col">
            <AttachmentsPanel
              markdown={markdown}
              snippets={snippets}
              copy={copy}
              selectedSnippetId={attachmentSelectionId}
              onSelect={setAttachmentSelectionId}
              onOpenInEditor={onOpenSnippet}
            />
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4 z-40 rounded-full border border-white/[0.08] bg-[#0a0a0a]/80 px-3 py-1.5 backdrop-blur-sm">
        <SyncIndicator status={syncStatus} copy={copy.snippetEditor} />
      </div>

      {attaching && (
        <AttachSnippetMenu
          snippets={snippets}
          copy={copy}
          onPick={insertSnippetReference}
          onClose={() => setAttaching(false)}
        />
      )}
    </div>
  );
}
