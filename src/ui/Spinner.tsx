import type { CSSProperties } from "react";

interface SpinnerProps {
  /** Diameter in px. */
  size?: number;
  /** Stroke thickness in px. */
  strokeWidth?: number;
  className?: string;
  /** Accessible label; omit on purely decorative spinners next to visible text. */
  label?: string;
}

/**
 * Minimal, theme-agnostic loading spinner. Inherits `currentColor`, so it adopts
 * the text color of whatever it sits in (button, toast, empty state). Kept as an
 * SVG ring rather than a border trick so it stays crisp at any size and respects
 * the brand's thin-stroke aesthetic.
 */
export function Spinner({ size = 14, strokeWidth = 2, className = "", label }: SpinnerProps) {
  const style: CSSProperties = { width: size, height: size };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      className={`animate-spin ${className}`}
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth={strokeWidth} />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
