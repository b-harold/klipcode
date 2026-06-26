/**
 * Client-only color theme (light / dark), persisted in localStorage and applied
 * as a `data-theme` attribute on <html>. Like the snippet-creator preferences it
 * is a device-local convenience, not synced to the cloud. The interface defaults
 * to dark — KlipCode's brand surface — and only switches when explicitly chosen.
 *
 * To avoid a flash of the wrong theme, the attribute is set by a tiny blocking
 * script in the document <head> (see `ThemeScript`) before first paint; this
 * module is the source of truth that script mirrors.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "klipcode:theme";

export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function readTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
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

/** Persists the theme, reflects it onto <html>, and notifies all listeners. */
export function commitTheme(theme: Theme): void {
  writeTheme(theme);
  applyTheme(theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: theme }));
  }
}

/**
 * The blocking snippet injected in <head>. Mirrors `readTheme`/`applyTheme` but
 * runs synchronously before paint so the first frame already has the right
 * surface — no dark-to-light flash for light-mode users.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark")t=${JSON.stringify(
  DEFAULT_THEME,
)};document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme=${JSON.stringify(
  DEFAULT_THEME,
)};}})();`;
