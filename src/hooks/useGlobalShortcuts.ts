import { useEffect, useRef } from "react";

import { isEditableTarget, isMac } from "@/lib/constants/shortcuts";

export interface GlobalShortcutHandlers {
  onToggleSearch: () => void;
  onToggleHelp: () => void;
  onNewSnippet: () => void;
  onCopyCurrent: () => void;
  onToggleSidebar: () => void;
  onCloseEditor: () => void;
  /** Whether a snippet editor is currently open (gates copy/close). */
  hasOpenSnippet: boolean;
  /** Whether a modal overlay (search/help/confirm) is open (gates Esc). */
  overlayOpen: boolean;
}

/**
 * Installs the single window-level `keydown` listener that drives every global
 * shortcut. Handlers are read through a ref so the listener is attached once and
 * always sees the latest callbacks/flags without re-subscribing.
 */
export function useGlobalShortcuts(handlers: GlobalShortcutHandlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const mac = isMac();

    const onKey = (e: KeyboardEvent) => {
      const h = ref.current;
      const mod = mac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // ── Modifier combos: fire in every context, including while typing ──
      if (mod && !e.altKey && !e.shiftKey) {
        if (key === "k") {
          e.preventDefault();
          h.onToggleSearch();
          return;
        }
        if (key === "b") {
          e.preventDefault();
          h.onToggleSidebar();
          return;
        }
        if (key === "/") {
          e.preventDefault();
          h.onToggleHelp();
          return;
        }
      }

      if (mod && e.altKey && !e.shiftKey) {
        if (key === "n") {
          e.preventDefault();
          h.onNewSnippet();
          return;
        }
        if (key === "c") {
          e.preventDefault();
          if (h.hasOpenSnippet) h.onCopyCurrent();
          return;
        }
      }

      // ── Escape closes the open editor (works from the title/code field) ──
      // Skipped while an overlay is open so its own Esc handler wins.
      if (e.key === "Escape" && h.hasOpenSnippet && !h.overlayOpen) {
        e.preventDefault();
        h.onCloseEditor();
        return;
      }

      // ── Bare-key shortcuts: never hijack a focused text field ──
      if (isEditableTarget(e.target)) return;
      if (e.key === "?") {
        e.preventDefault();
        h.onToggleHelp();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
