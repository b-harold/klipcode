"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FolderSelect } from "@/ui/FolderSelect";
import type { CreateNoteInput, FolderRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";

interface NewNoteProps {
  copy: Dictionary;
  folders: FolderRecord[];
  defaultFolderId?: string | null;
  onCreateNote: (data: CreateNoteInput) => void;
}

export function NewNote({ copy, folders, defaultFolderId, onCreateNote }: NewNoteProps) {
  const initialFolderId = defaultFolderId ?? "";
  const [title, setTitle] = useState("");
  const [folderId, setFolderId] = useState(initialFolderId);
  const [markdown, setMarkdown] = useState("");

  function submit() {
    if (!markdown.trim() && !title.trim()) return;

    onCreateNote({
      title: title.trim(),
      folderId,
      markdown,
    });

    setTitle("");
    setFolderId(initialFolderId);
    setMarkdown("");
  }

  const canSubmit = markdown.trim().length > 0 || title.trim().length > 0;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="border-b border-border px-4 py-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.forms.noteTitlePlaceholder}
            className="w-full bg-transparent text-base text-foreground placeholder:text-muted/60 outline-none"
          />
        </div>

        <div className="min-h-[200px] px-4 py-3">
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder={copy.forms.noteBodyPlaceholder}
            rows={9}
            className="w-full resize-none bg-transparent font-mono text-[13px] leading-6 text-foreground placeholder:text-muted/60 outline-none"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <FolderSelect
            value={folderId}
            onChange={setFolderId}
            folders={folders}
            rootLabel={copy.workspace.rootOption}
            copy={copy.folderSelect}
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:hover:bg-accent"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>{copy.forms.submitNote}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
