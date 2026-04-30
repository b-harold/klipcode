import { useMemo } from "react";

import type { FolderRecord, NoteRecord, SnippetRecord } from "@/lib/types";

export interface SnippetSearchHit {
  type: "snippet";
  snippet: SnippetRecord;
  matchedField: "title" | "code" | "language" | "sourceUrl";
  excerpt: string;
}

export interface NoteSearchHit {
  type: "note";
  note: NoteRecord;
  matchedField: "title" | "markdown";
  excerpt: string;
}

export interface FolderSearchHit {
  type: "folder";
  folder: FolderRecord;
  excerpt: string;
}

export type SearchHit = SnippetSearchHit | NoteSearchHit | FolderSearchHit;

const EXCERPT_PADDING = 24;

function makeExcerpt(haystack: string, needle: string): string {
  if (!haystack) return "";
  const idx = haystack.toLowerCase().indexOf(needle);
  if (idx === -1) return haystack.slice(0, 80);
  const start = Math.max(0, idx - EXCERPT_PADDING);
  const end = Math.min(haystack.length, idx + needle.length + EXCERPT_PADDING);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < haystack.length ? "…" : "";
  return `${prefix}${haystack.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

export interface SearchResult {
  snippets: SnippetSearchHit[];
  notes: NoteSearchHit[];
  folders: FolderSearchHit[];
  total: number;
}

export function searchWorkspace(
  query: string,
  workspace: { folders: FolderRecord[]; snippets: SnippetRecord[]; notes: NoteRecord[] },
): SearchResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { snippets: [], notes: [], folders: [], total: 0 };
  }

  const snippets: SnippetSearchHit[] = [];
  for (const snippet of workspace.snippets) {
    const title = (snippet.title ?? "").toLowerCase();
    const code = (snippet.code ?? "").toLowerCase();
    const lang = (snippet.language ?? "").toLowerCase();
    const url = (snippet.sourceUrl ?? "").toLowerCase();
    if (title.includes(q)) {
      snippets.push({ type: "snippet", snippet, matchedField: "title", excerpt: makeExcerpt(snippet.title ?? "", q) });
    } else if (code.includes(q)) {
      snippets.push({ type: "snippet", snippet, matchedField: "code", excerpt: makeExcerpt(snippet.code ?? "", q) });
    } else if (url.includes(q)) {
      snippets.push({ type: "snippet", snippet, matchedField: "sourceUrl", excerpt: makeExcerpt(snippet.sourceUrl ?? "", q) });
    } else if (lang.includes(q)) {
      snippets.push({ type: "snippet", snippet, matchedField: "language", excerpt: snippet.language });
    }
  }

  const notes: NoteSearchHit[] = [];
  for (const note of workspace.notes) {
    const title = (note.title ?? "").toLowerCase();
    const body = (note.markdown ?? "").toLowerCase();
    if (title.includes(q)) {
      notes.push({ type: "note", note, matchedField: "title", excerpt: makeExcerpt(note.title ?? "", q) });
    } else if (body.includes(q)) {
      notes.push({ type: "note", note, matchedField: "markdown", excerpt: makeExcerpt(note.markdown ?? "", q) });
    }
  }

  const folders: FolderSearchHit[] = [];
  for (const folder of workspace.folders) {
    if ((folder.name ?? "").toLowerCase().includes(q)) {
      folders.push({ type: "folder", folder, excerpt: folder.name });
    }
  }

  return {
    snippets: snippets.slice(0, 50),
    notes: notes.slice(0, 50),
    folders: folders.slice(0, 25),
    total: snippets.length + notes.length + folders.length,
  };
}

export function useSearch(
  query: string,
  workspace: { folders: FolderRecord[]; snippets: SnippetRecord[]; notes: NoteRecord[] },
): SearchResult {
  return useMemo(() => searchWorkspace(query, workspace), [query, workspace]);
}
