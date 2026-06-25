import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  detectLanguageFromTitle,
  normalizeTitleExtension,
  type LanguageId,
} from "@/lib/constants/languages";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSnippetDisplayName(title: string, language: string, untitledLabel: string): string {
  const extension = LANGUAGES.find((l) => l.id === language)?.extension ?? "";
  const baseName = title || untitledLabel;
  if (!extension || baseName.endsWith(extension)) return baseName;
  return `${baseName}${extension}`;
}

/**
 * The snippet's editable filename — its title with the language extension
 * appended (e.g. `index` + html → `index.html`). Unlike {@link getSnippetDisplayName}
 * it has no untitled fallback, so an empty title yields an empty string, which is
 * what a rename input should start from.
 */
export function getSnippetFileName(title: string, language: string): string {
  const baseName = title.trim();
  if (!baseName) return "";
  const extension = LANGUAGES.find((l) => l.id === language)?.extension ?? "";
  if (!extension || baseName.endsWith(extension)) return baseName;
  return `${baseName}${extension}`;
}

/**
 * Resolves a filename typed in a rename field into the stored `title` and
 * `language`. A recognized extension switches the language (e.g. `index.css`
 * makes it CSS); an unrecognized or missing one preserves the previous extension
 * by re-appending it (e.g. renaming `index.html` to `index.xxx` is stored as
 * `index.xxx.html`, keeping the HTML language).
 */
export function resolveSnippetRename(
  value: string,
  currentLanguage: string,
): { title: string; language: LanguageId } {
  const trimmed = value.trim();
  const detected = detectLanguageFromTitle(trimmed);
  if (detected) return { title: normalizeTitleExtension(trimmed), language: detected };

  const prevExt = LANGUAGES.find((l) => l.id === currentLanguage)?.extension ?? "";
  const title = prevExt && !trimmed.endsWith(prevExt) ? `${trimmed}${prevExt}` : trimmed;
  return {
    title,
    language: (LANGUAGES.find((l) => l.id === currentLanguage)?.id ?? DEFAULT_LANGUAGE) as LanguageId,
  };
}
