"use client";

import { useState } from "react";
import { Globe, Plus } from "lucide-react";
import { Editor } from "@/components/Editor/Editor";
import { LanguageSelect } from "@/ui/LanguageSelect";
import { FolderSelect } from "@/ui/FolderSelect";
import { DEFAULT_LANGUAGE, type LanguageId } from "@/lib/constants/languages";
import type { CreateSnippetInput, FolderRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";

interface NewSnippetProps {
  copy: Dictionary;
  folders: FolderRecord[];
  defaultFolderId?: string | null;
  onCreateSnippet: (data: CreateSnippetInput) => void;
}

export function NewSnippet({ copy, folders, defaultFolderId, onCreateSnippet }: NewSnippetProps) {
  const initialFolderId = defaultFolderId ?? "";
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<LanguageId>(DEFAULT_LANGUAGE);
  const [folderId, setFolderId] = useState(initialFolderId);
  const [code, setCode] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  function submit() {
    if (!code.trim()) return;

    const trimmedSourceUrl = sourceUrl.trim();

    onCreateSnippet({
      title: title.trim(),
      language,
      folderId,
      code,
      sourceUrl: trimmedSourceUrl ? trimmedSourceUrl : null,
    });

    setTitle("");
    setLanguage(DEFAULT_LANGUAGE);
    setFolderId(initialFolderId);
    setCode("");
    setSourceUrl("");
  }

  return (
    <section className="rounded-xl border border-border bg-surface">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {/* Title + Language row */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.forms.snippetTitlePlaceholder}
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted/60 outline-none"
          />
          <LanguageSelect
            value={language}
            onChange={setLanguage}
            copy={copy.languageSelect}
          />
        </div>

        {/* Source URL row */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-1.5 text-[12px]">
          <Globe size={12} className="shrink-0 text-muted/60" aria-hidden="true" />
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder={copy.snippetEditor.sourceUrlPlaceholder}
            spellCheck={false}
            aria-label={copy.snippetEditor.sourceUrl}
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-foreground placeholder:text-muted/60 outline-none"
          />
        </div>

        {/* Editor */}
        <div className="min-h-[200px]">
          <Editor
            value={code}
            onChange={setCode}
            language={language}
            placeholder={copy.forms.snippetCodePlaceholder}
            height="200px"
            fontSize={13}
            gutterBackground="var(--surface)"
          />
        </div>

        {/* Footer: folder selector + create button */}
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
            disabled={!code.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:hover:bg-accent"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>{copy.forms.submitSnippet}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
