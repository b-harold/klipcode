"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";

import type { Dictionary } from "@/i18n";
import type { FolderRecord } from "@/lib/types";
import type { Preferences } from "@/lib/preferences";
import type { Locale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";
import { LANGUAGES, type LanguageId } from "@/lib/constants/languages";
import { LanguageSelect } from "@/ui/LanguageSelect";
import { FolderSelect } from "@/ui/FolderSelect";

interface PreferencesDialogProps {
  copy: Dictionary;
  locale: Locale;
  theme: Theme;
  folders: FolderRecord[];
  preferences: Preferences;
  onChangePreferences: (patch: Partial<Preferences>) => void;
  onChangeLocale: (locale: Locale) => void;
  onChangeTheme: (theme: Theme) => void;
  onClose: () => void;
}

/** Pill segmented control used for the locale and theme rows. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-ink/[0.08] p-0.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={[
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              active ? "bg-ink/[0.08] text-ink" : "text-ink/50 hover:text-ink/80",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
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
        <p className="mt-0.5 text-[12px] text-ink/35">{description}</p>
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
  theme,
  folders,
  preferences,
  onChangePreferences,
  onChangeLocale,
  onChangeTheme,
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
      className="fixed inset-0 z-[var(--z-dialog)] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm" aria-hidden="true" />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onMouseDown={(e) => e.stopPropagation()}
        className="klipcode-menu-animate relative flex w-full max-w-md flex-col overflow-hidden rounded-xl"
        style={{
          background: "var(--panel-bg)",
          border: "1px solid rgba(var(--ink-rgb),0.08)",
          boxShadow:
            "var(--panel-shadow)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-ink/[0.07] px-4 py-3">
          <Settings size={16} className="shrink-0 text-ink/35" />
          <span className="text-sm font-medium text-foreground">{t.title}</span>
        </div>

        {/* Body */}
        <div className="divide-y divide-ink/[0.05]">
          {/* Appearance (theme) */}
          <Row
            title={t.appearance.label}
            description={t.appearance.description}
            control={
              <Segmented<Theme>
                value={theme}
                onChange={onChangeTheme}
                options={[
                  { value: "light", label: t.appearance.light },
                  { value: "dark", label: t.appearance.dark },
                ]}
              />
            }
          />

          {/* Interface language */}
          <Row
            title={t.language.label}
            description={t.language.description}
            control={
              <Segmented<Locale>
                value={locale}
                onChange={onChangeLocale}
                options={LOCALE_OPTIONS.map(({ value, key }) => ({
                  value,
                  label: t.language[key],
                }))}
              />
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

          {/* Markdown preview by default */}
          <Row
            title={t.markdownPreview.label}
            description={t.markdownPreview.description}
            control={
              <Segmented<"on" | "off">
                value={preferences.markdownPreviewByDefault ? "on" : "off"}
                onChange={(value) =>
                  onChangePreferences({ markdownPreviewByDefault: value === "on" })
                }
                options={[
                  { value: "on", label: t.markdownPreview.on },
                  { value: "off", label: t.markdownPreview.off },
                ]}
              />
            }
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
