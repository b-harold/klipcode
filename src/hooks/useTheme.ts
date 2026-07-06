"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_THEME,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  broadcastTheme,
  commitTheme,
  getSystemTheme,
  readStoredTheme,
  readTheme,
  type Theme,
} from "@/lib/theme";

/**
 * Reads the device-local color theme and persists changes. Starts from the
 * default (dark) so SSR markup and the first client render match, then hydrates
 * from storage in an effect — the same synchronize-on-mount pattern as
 * `usePreferences`. The `<html data-theme>` attribute is the visual source of
 * truth (set pre-paint by the layout script); this hook keeps every instance in
 * sync via a same-tab broadcast and the cross-tab `storage` event.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    // Mirror whatever the pre-paint script already applied to <html>.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readTheme());

    const onBroadcast = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setThemeState(readTheme());
    };

    // Follow the OS preference live, but only while the user hasn't made an
    // explicit choice — a stored theme always wins over the browser default.
    const mql =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: light)")
        : null;
    const onSystemChange = () => {
      if (readStoredTheme() === null) broadcastTheme(getSystemTheme());
    };

    window.addEventListener(THEME_CHANGE_EVENT, onBroadcast);
    window.addEventListener("storage", onStorage);
    mql?.addEventListener("change", onSystemChange);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onBroadcast);
      window.removeEventListener("storage", onStorage);
      mql?.removeEventListener("change", onSystemChange);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    commitTheme(next); // persist, apply to <html>, and notify other instances
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      commitTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
