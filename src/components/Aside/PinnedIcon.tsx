import { Pin } from "lucide-react";

/**
 * Wraps a row's leading icon (language glyph / folder icon) and overlays a
 * small pin badge in the corner when the item is pinned to the aside. The pin
 * is a pure status indicator here — unpinning happens from the ⋮/context menu,
 * which keeps the row's trailing edge free for the actions button alone.
 */
export function PinnedIcon({
  pinned,
  label,
  children,
}: {
  pinned: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="relative flex shrink-0 items-center">
      {children}
      {pinned && (
        <span
          role="img"
          aria-label={label}
          className="absolute -bottom-0.5 -right-1 text-foreground"
        >
          <Pin size={8} className="fill-current" />
        </span>
      )}
    </span>
  );
}
