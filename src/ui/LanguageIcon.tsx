"use client";

import { Database, FileCode2, FileText, Hash, TerminalSquare, type LucideIcon } from "lucide-react";
import {
  languageColor,
  LANGUAGE_ICON_BACKING,
  LANGUAGE_ICON_PATHS,
  LANGUAGE_ICON_VIEWBOX,
} from "@/lib/constants/languageIcons";
import { useTheme } from "@/hooks/useTheme";

/**
 * Languages that have no brand glyph in our path data fall back to a
 * representative lucide icon so they still read as "their" language at a glance
 * (VS Code-style), rather than the generic file icon.
 */
const LUCIDE_FALLBACKS: Record<string, LucideIcon> = {
  sql: Database,
  powershell: TerminalSquare,
  csharp: Hash,
  plaintext: FileText,
};

interface LanguageIconProps {
  language: string;
  size?: number;
  className?: string;
}

/**
 * Renders the real, color-coded glyph for a language (the way VS Code shows a
 * per-language file icon). Uses the brand SVG path when one exists, a lucide
 * fallback for the few languages without a brand glyph, and a generic code icon
 * for anything unknown. Always tinted with the language's accent color.
 */
export function LanguageIcon({ language, size = 14, className }: LanguageIconProps) {
  const { theme } = useTheme();
  const color = languageColor(language, theme);
  const path = LANGUAGE_ICON_PATHS[language];

  if (!path) {
    const Fallback = LUCIDE_FALLBACKS[language] ?? FileCode2;
    return <Fallback size={size} className={className} style={{ color }} aria-hidden />;
  }

  // A few glyphs are a filled square with the letters cut out as holes; a solid
  // backing keeps those letters a fixed color instead of revealing the page
  // (white on light, dark on dark). See LANGUAGE_ICON_BACKING.
  const backing = LANGUAGE_ICON_BACKING[language];

  return (
    <svg
      width={size}
      height={size}
      viewBox={LANGUAGE_ICON_VIEWBOX[language] ?? "0 0 24 24"}
      fill={color}
      className={className}
      role="img"
      aria-hidden
    >
      {backing && <rect x="0" y="0" width="100%" height="100%" fill={backing} />}
      <path d={path} />
    </svg>
  );
}
