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

/** Viewport point from which an explicit theme change should spread. */
export interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

/** Centre of a theme control in viewport coordinates, including keyboard clicks. */
export function getThemeTransitionOrigin(element: Element): ThemeTransitionOrigin {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

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
const THEME_TRANSITION_CLASS = "klipcode-theme-transition";
let activeThemeTransitions = 0;

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
 * Persists a theme change and, where supported, reveals the new palette from
 * the control that triggered it. The View Transitions API only supplies the
 * old/new page snapshots; the expanding circle itself is a CSS clip-path
 * animation on the new root snapshot.
 *
 * Reduced-motion preferences and browsers without same-document view
 * transitions keep the normal immediate switch.
 */
export function transitionToTheme(
  theme: Theme,
  origin?: ThemeTransitionOrigin,
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    commitTheme(theme);
    return;
  }

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || typeof document.startViewTransition !== "function") {
    commitTheme(theme);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  activeThemeTransitions += 1;
  document.documentElement.classList.add(THEME_TRANSITION_CLASS);
  const transition = document.startViewTransition(() => commitTheme(theme));
  const releaseTransitionStyles = () => {
    activeThemeTransitions -= 1;
    if (activeThemeTransitions === 0) {
      document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
    }
  };

  void transition.finished.then(releaseTransitionStyles, releaseTransitionStyles);

  void transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 560,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    // A newer transition can supersede one already in flight. The theme has
    // still been committed, so there is nothing to recover in that case.
    .catch(() => undefined);
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
