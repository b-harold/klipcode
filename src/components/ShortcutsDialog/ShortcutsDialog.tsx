"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Keyboard } from "lucide-react";

import type { Dictionary } from "@/i18n";
import {
  SHORTCUTS,
  SHORTCUT_SECTION_ORDER,
  formatShortcutKeys,
  isMac,
} from "@/lib/constants/shortcuts";

interface ShortcutsDialogProps {
  copy: Dictionary;
  onClose: () => void;
}

export function ShortcutsDialog({ copy, onClose }: ShortcutsDialogProps) {
  const t = copy.shortcuts;
  const mac = isMac();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = SHORTCUT_SECTION_ORDER.map((section) => ({
    section,
    items: SHORTCUTS.filter((s) => s.section === section),
  })).filter((g) => g.items.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onMouseDown={(e) => e.stopPropagation()}
        className="klipcode-menu-animate relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl"
        style={{
          background: "linear-gradient(180deg, #181818 0%, #111111 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.03) inset, 0 24px 64px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
          <Keyboard size={16} className="shrink-0 text-white/35" />
          <span className="text-sm font-medium text-foreground">{t.title}</span>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {groups.map(({ section, items }) => (
            <div key={section} className="mb-1 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-white/30">
                {t.sections[section]}
              </p>
              {items.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                >
                  <span className="text-[13px] text-foreground/90">
                    {t.items[shortcut.id]}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {formatShortcutKeys(shortcut, mac).map((token, i) => (
                      <kbd
                        key={i}
                        className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-white/60"
                      >
                        {token}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
