import { DEFAULT_LANGUAGE, type LanguageId } from "@/lib/constants/languages";

/**
 * Client-only user preferences persisted in localStorage. These are device-local
 * conveniences (not synced to the cloud): the snippet creator's pre-selected
 * folder and language. The interface locale is NOT stored here — it lives in the
 * URL + NEXT_LOCALE cookie (see `src/lib/locale.ts`).
 */
export interface Preferences {
  /** Folder pre-selected in the snippet creator; `null` = root. */
  defaultFolderId: string | null;
  /** Language pre-selected in the snippet creator. */
  defaultLanguage: LanguageId;
  /** Render Markdown snippets as a Notion-like preview by default instead of source. */
  markdownPreviewByDefault: boolean;
  /** Soft-wrap long code lines in the editor instead of scrolling horizontally. */
  codeWrap: boolean;
  /** Ask Workers AI to name untitled snippets on creation. Requires being signed
   *  in (the generation endpoint is auth-gated); ignored while anonymous. */
  autoGenerateTitle: boolean;
}

const STORAGE_KEY = "klipcode:preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  defaultFolderId: null,
  defaultLanguage: DEFAULT_LANGUAGE,
  markdownPreviewByDefault: false,
  codeWrap: false,
  autoGenerateTitle: true,
};

export function readPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      defaultFolderId: parsed.defaultFolderId ?? null,
      defaultLanguage: parsed.defaultLanguage ?? DEFAULT_LANGUAGE,
      markdownPreviewByDefault: parsed.markdownPreviewByDefault ?? false,
      codeWrap: parsed.codeWrap ?? false,
      autoGenerateTitle: parsed.autoGenerateTitle ?? true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(prefs: Preferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable (private mode, quota) — degrade silently.
  }
}
