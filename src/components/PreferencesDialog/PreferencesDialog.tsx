"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";

import type { Dictionary } from "@/i18n";
import type { FolderRecord } from "@/lib/types";
import type { Preferences } from "@/lib/preferences";
import type { Locale } from "@/lib/locale";
import { LANGUAGES, type LanguageId } from "@/lib/constants/languages";
import { LanguageSelect } from "@/ui/LanguageSelect";
import { FolderSelect } from "@/ui/FolderSelect";

interface PreferencesDialogProps {
  copy: Dictionary;
  locale: Locale;
  folders: FolderRecord[];
  preferences: Preferences;
  onChangePreferences: (patch: Partial<Preferences>) => void;
  onChangeLocale: (locale: Locale) => void;
  onClose: () => void;
}

/** A labelled preference row: title + helper text on the left, control on the right. */
function Row({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] text-foreground/90">{title}</p>
        <p className="mt-0.5 text-[12px] text-white/35">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

const LOCALE_OPTIONS: { value: Locale; key: "en" | "es" }[] = [
  { value: "en", key: "en" },
  { value: "es", key: "es" },
];

export function PreferencesDialog({
  copy,
  locale,
  folders,
  preferences,
  onChangePreferences,
  onChangeLocale,
  onClose,
}: PreferencesDialogProps) {
  const t = copy.preferences;

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

  // The snippet creator's default language is constrained to a known LanguageId;
  // fall back to the first language if a persisted value somehow drifts.
  const defaultLanguage: LanguageId = LANGUAGES.some((l) => l.id === preferences.defaultLanguage)
    ? preferences.defaultLanguage
    : (LANGUAGES[0].id as LanguageId);

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
        className="klipcode-menu-animate relative flex w-full max-w-md flex-col overflow-hidden rounded-xl"
        style={{
          background: "linear-gradient(180deg, #181818 0%, #111111 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.03) inset, 0 24px 64px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
          <Settings size={16} className="shrink-0 text-white/35" />
          <span className="text-sm font-medium text-foreground">{t.title}</span>
        </div>

        {/* Body */}
        <div className="divide-y divide-white/[0.05]">
          {/* Interface language */}
          <Row
            title={t.language.label}
            description={t.language.description}
            control={
              <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] p-0.5">
                {LOCALE_OPTIONS.map(({ value, key }) => {
                  const active = locale === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onChangeLocale(value)}
                      aria-pressed={active}
                      className={[
                        "rounded-md px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-white/50 hover:text-white/80",
                      ].join(" ")}
                    >
                      {t.language[key]}
                    </button>
                  );
                })}
              </div>
            }
          />

          {/* Default folder for new snippets */}
          <Row
            title={t.defaultFolder.label}
            description={t.defaultFolder.description}
            control={
              <FolderSelect
                value={preferences.defaultFolderId ?? ""}
                onChange={(value) => onChangePreferences({ defaultFolderId: value || null })}
                folders={folders}
                rootLabel={copy.workspace.rootOption}
                copy={copy.folderSelect}
              />
            }
          />

          {/* Default language for new snippets */}
          <Row
            title={t.defaultLanguage.label}
            description={t.defaultLanguage.description}
            control={
              <LanguageSelect
                value={defaultLanguage}
                onChange={(value) => onChangePreferences({ defaultLanguage: value })}
                copy={copy.languageSelect}
              />
            }
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
