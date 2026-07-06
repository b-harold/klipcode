/**
 * Client-only color theme (light / dark), persisted in localStorage and applied
 * as a `data-theme` attribute on <html>. Like the snippet-creator preferences it
 * is a device-local convenience, not synced to the cloud.
 *
 * Until the user makes an explicit choice, the interface follows the browser's
 * `prefers-color-scheme` preference (falling back to dark — KlipCode's brand
 * surface — when it can't be read). The first manual toggle persists a choice,
 * which from then on overrides the OS preference.
 *
 * To avoid a flash of the wrong theme, the attribute is set by a tiny blocking
 * script in the document <head> (see `ThemeScript`) before first paint; this
 * module is the source of truth that script mirrors.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "klipcode:theme";

/** Ultimate fallback when no stored choice exists and the OS can't be queried. */
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** The browser/OS color-scheme preference, defaulting to dark when unknown. */
export function getSystemTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return DEFAULT_THEME;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** The explicit choice the user has saved, or `null` when they haven't chosen one. */
export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Effective theme: the saved choice if any, otherwise the browser preference. */
export function readTheme(): Theme {
  return readStoredTheme() ?? getSystemTheme();
}

export function writeTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode, quota) — degrade silently.
  }
}

/** Reflects the theme onto <html> so the CSS variables in globals.css apply. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

/**
 * Same-tab broadcast so every `useTheme` instance (the editor, every language
 * icon, the toggle, the preferences control) re-renders together when the theme
 * changes — the `storage` event only fires in *other* tabs, not the one that
 * made the change.
 */
export const THEME_CHANGE_EVENT = "klipcode:themechange";

/**
 * Reflects a theme onto <html> and notifies all listeners *without* persisting
 * it — used when the app is following the browser preference (no explicit
 * choice) so a live OS change repaints without silently becoming a stored pick.
 */
export function broadcastTheme(theme: Theme): void {
  applyTheme(theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: theme }));
  }
}

/** Persists the theme, reflects it onto <html>, and notifies all listeners. */
export function commitTheme(theme: Theme): void {
  writeTheme(theme);
  broadcastTheme(theme);
}

/**
 * The blocking snippet injected in <head>. Mirrors `readTheme`/`applyTheme` but
 * runs synchronously before paint so the first frame already has the right
 * surface — no wrong-theme flash. Falls back to the OS `prefers-color-scheme`
 * when the user hasn't stored an explicit choice.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark")t=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches)?"light":${JSON.stringify(
  DEFAULT_THEME,
)};document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme=${JSON.stringify(
  DEFAULT_THEME,
)};}})();`;
