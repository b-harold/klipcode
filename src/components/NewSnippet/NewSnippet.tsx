"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Editor } from "@/components/Editor/Editor";
import { LanguageSelect } from "@/ui/LanguageSelect";
import { FolderSelect } from "@/ui/FolderSelect";
import { DEFAULT_LANGUAGE, detectLanguageFromTitle, type LanguageId } from "@/lib/constants/languages";
import type { FolderRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";

interface NewSnippetProps {
  copy: Dictionary;
  folders: FolderRecord[];
  defaultFolderId?: string | null;
  /** Bumped when a keyboard shortcut opens this form; focuses the title field. */
  focusNonce?: number;
  onCreateSnippet: (data: {
    title: string;
    language: string;
    folderId: string;
    code: string;
  }) => void;
}

export function NewSnippet({ copy, folders, defaultFolderId, focusNonce = 0, onCreateSnippet }: NewSnippetProps) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<LanguageId>(DEFAULT_LANGUAGE);
  const [folderId, setFolderId] = useState(defaultFolderId ?? "");
  const [code, setCode] = useState("");

  // Focus the title when a shortcut requests it (nonce > 0). Tracking the last
  // handled value covers both an in-place bump and a fresh mount after the app
  // navigated home from the editor/folder view.
  const titleRef = useRef<HTMLInputElement>(null);
  const handledFocusNonce = useRef(0);
  useEffect(() => {
    if (focusNonce > 0 && focusNonce !== handledFocusNonce.current) {
      handledFocusNonce.current = focusNonce;
      titleRef.current?.focus();
    }
  }, [focusNonce]);

  // Sync the pre-selected folder coming from the aside context menu by adjusting
  // state during render when the prop changes — no effect needed.
  const [prevDefaultFolderId, setPrevDefaultFolderId] = useState(defaultFolderId);
  if (defaultFolderId !== prevDefaultFolderId) {
    setPrevDefaultFolderId(defaultFolderId);
    if (defaultFolderId != null) setFolderId(defaultFolderId);
  }

  // Auto-select the language when the title carries a recognizable extension
  // (e.g. `index.html` → HTML). A manual dropdown choice still wins until the
  // user types another recognized extension.
  function handleTitleChange(value: string) {
    setTitle(value);
    const detected = detectLanguageFromTitle(value);
    if (detected) setLanguage(detected);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;

    onCreateSnippet({
      title: title.trim(),
      language,
      folderId,
      code,
    });

    setTitle("");
    setLanguage(DEFAULT_LANGUAGE);
    setFolderId(defaultFolderId ?? "");
    setCode("");
  }

  return (
    <section className="rounded-xl border border-white/[0.06] bg-surface">
      <form onSubmit={handleSubmit}>
        {/* Title + Language row */}
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={copy.forms.snippetTitlePlaceholder}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-white/30 outline-none"
          />
          <LanguageSelect
            value={language}
            onChange={setLanguage}
            copy={copy.languageSelect}
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
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
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
            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>{copy.forms.submitSnippet}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
