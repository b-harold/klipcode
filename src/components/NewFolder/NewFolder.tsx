"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";

import { FolderSelect } from "@/ui/FolderSelect";
import type { FolderRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";

interface NewFolderProps {
  copy: Dictionary;
  folders: FolderRecord[];
  defaultParentId?: string | null;
  onCreateFolder: (parentId: string | null, name: string) => Promise<void>;
}

export function NewFolder({ copy, folders, defaultParentId, onCreateFolder }: NewFolderProps) {
  const initialParentId = defaultParentId ?? "";
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(initialParentId);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    void onCreateFolder(parentId || null, trimmed);
    setName("");
    setParentId(initialParentId);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 sm:flex-row sm:items-center"
    >
      <FolderPlus size={15} className="hidden shrink-0 text-muted sm:block" />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={copy.forms.folderNamePlaceholder}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/60 outline-none"
      />
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <FolderSelect
          value={parentId}
          onChange={setParentId}
          folders={folders}
          rootLabel={copy.workspace.rootOption}
          copy={copy.folderSelect}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:hover:bg-accent"
        >
          {copy.forms.submitFolder}
        </button>
      </div>
    </form>
  );
}
