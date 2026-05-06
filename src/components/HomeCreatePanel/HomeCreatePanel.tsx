"use client";

import type { ReactNode } from "react";
import { Code2, FileText } from "lucide-react";

import { NewSnippet } from "@/components/NewSnippet/NewSnippet";
import { NewNote } from "@/components/NewNote/NewNote";
import { NewFolder } from "@/components/NewFolder/NewFolder";
import type { CreateNoteInput, CreateSnippetInput, FolderRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";

interface HomeCreatePanelProps {
  copy: Dictionary;
  folders: FolderRecord[];
  defaultFolderId: string | null;
  onCreateSnippet: (data: CreateSnippetInput) => void;
  onCreateNote: (data: CreateNoteInput) => void;
  onCreateFolder: (parentId: string | null, name: string) => Promise<void>;
}

export function HomeCreatePanel({
  copy,
  folders,
  defaultFolderId,
  onCreateSnippet,
  onCreateNote,
  onCreateFolder,
}: HomeCreatePanelProps) {
  // Remount the forms when the pre-selected folder changes (e.g. user picks
  // "new at folder X" from the aside) so each form initialises with the new
  // default rather than syncing it via an effect.
  const formKey = defaultFolderId ?? "__root__";

  return (
    <div className="flex flex-col gap-3">
      <NewFolder
        key={`folder-${formKey}`}
        copy={copy}
        folders={folders}
        defaultParentId={defaultFolderId}
        onCreateFolder={onCreateFolder}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <SectionHeader icon={<FileText size={14} />} title={copy.homeCreate.noteTitle} subtitle={copy.homeCreate.noteSubtitle} />
          <NewNote
            key={`note-${formKey}`}
            copy={copy}
            folders={folders}
            defaultFolderId={defaultFolderId}
            onCreateNote={onCreateNote}
          />
        </div>

        <div className="flex flex-col gap-2">
          <SectionHeader icon={<Code2 size={14} />} title={copy.homeCreate.snippetTitle} subtitle={copy.homeCreate.snippetSubtitle} />
          <NewSnippet
            key={`snippet-${formKey}`}
            copy={copy}
            folders={folders}
            defaultFolderId={defaultFolderId}
            onCreateSnippet={onCreateSnippet}
          />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-accent">{icon}</span>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <span className="hidden text-xs text-muted sm:inline">— {subtitle}</span>
    </div>
  );
}
