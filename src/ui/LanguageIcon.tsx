import { Database, FileCode2, FileText, Hash, TerminalSquare, type LucideIcon } from "lucide-react";
import {
  DEFAULT_LANGUAGE_COLOR,
  LANGUAGE_COLORS,
  LANGUAGE_ICON_PATHS,
  LANGUAGE_ICON_VIEWBOX,
} from "@/lib/constants/languageIcons";

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
  const color = LANGUAGE_COLORS[language] ?? DEFAULT_LANGUAGE_COLOR;
  const path = LANGUAGE_ICON_PATHS[language];

  if (!path) {
    const Fallback = LUCIDE_FALLBACKS[language] ?? FileCode2;
    return <Fallback size={size} className={className} style={{ color }} aria-hidden />;
  }

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
      <path d={path} />
    </svg>
  );
}
