import type { DragEvent as ReactDragEvent } from "react";

import type { FolderRecord } from "@/lib/types";
import { suppressModifierDragStart } from "@/hooks/useMultiSelection";

export const STEP = 14;

/**
 * Whether a row's dragstart should be cancelled: it began with a selection
 * modifier held (the click must reach the multi-selection), or on one of the
 * row's small `[data-no-drag]` controls (chevron / pin / "…"), where a
 * slightly-sloppy press must stay a click.
 */
export function suppressRowDragStart(e: ReactDragEvent): boolean {
  if (suppressModifierDragStart(e)) return true;
  if (e.target instanceof Element && e.target.closest("[data-no-drag]")) {
    e.preventDefault();
    return true;
  }
  return false;
}

export function sortByPinThenAlpha<T extends { isPinnedAside: boolean }>(
  items: T[],
  key: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    if (a.isPinnedAside !== b.isPinnedAside) return a.isPinnedAside ? -1 : 1;
    return key(a).localeCompare(key(b));
  });
}

/** Returns true if `targetId` is `ancestorId` itself or a descendant of it. */
export function isDescendantOrSelf(
  folders: FolderRecord[],
  ancestorId: string,
  targetId: string,
): boolean {
  if (targetId === ancestorId) return true;
  let current = folders.find((f) => f.id === targetId);
  while (current && current.parentId) {
    if (current.parentId === ancestorId) return true;
    current = folders.find((f) => f.id === current!.parentId);
  }
  return false;
}
