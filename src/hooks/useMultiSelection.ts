"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";

import type { FolderRecord, NoteRecord, SelectedItem, SnippetRecord } from "@/lib/types";

/**
 * Cancel a native dragstart that began with a selection modifier held. A
 * ⌘/Ctrl/Shift+click that drifts a few pixels between press and release
 * otherwise turns into a drag, and the browser then never fires the `click`
 * that would have toggled the selection. Returns true when suppressed —
 * callers should bail out of their drag setup.
 */
export function suppressModifierDragStart(e: ReactDragEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    e.preventDefault();
    return true;
  }
  return false;
}

interface UseMultiSelectionOptions {
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  notes?: NoteRecord[];
  /** Open a snippet in the main view (plain click). */
  selectSnippet: (id: string) => void;
  /** Open a folder in the main view (plain click). */
  selectFolder: (id: string) => void;
  /** Open a note in the main view (plain click). */
  selectNote?: (id: string) => void;
}

/**
 * VS Code–style multi-selection for a collection of selectable items — the
 * sidebar tree rows and the folder-view card grid both use it.
 *
 * A plain click selects a single item and opens it. ⌘/Ctrl+click toggles an item
 * in the selection without opening it; Shift+click selects the range between the
 * anchor and the clicked item; ⌘/Ctrl+A selects every visible item. The set of
 * selected ids drives the batch operations (delete / cut / copy / drag-move).
 *
 * Visible order (for Ctrl+A and Shift ranges) is read straight from the DOM via
 * the `data-selectable-id` attributes each item must carry, scoped to the
 * container behind `containerRef` — so it always reflects what's currently
 * rendered (expanded folders, current grid) without lifting that state up.
 */
export function useMultiSelection({
  folders,
  snippets,
  notes = [],
  selectSnippet,
  selectFolder,
  selectNote,
}: UseMultiSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  /** Last single-clicked/toggled item — the pivot for Shift range selection. */
  const anchorRef = useRef<string | null>(null);
  /** The scrollable container; queried for visible items in DOM order. */
  const containerRef = useRef<HTMLDivElement | null>(null);

  const resolveType = useCallback(
    (id: string): "folder" | "snippet" | "note" =>
      folders.some((f) => f.id === id)
        ? "folder"
        : notes.some((n) => n.id === id)
          ? "note"
          : "snippet",
    [folders, notes],
  );

  // Items can vanish out from under the selection — deleted on another device
  // and reconciled away, moved out by cut/paste, trashed via a single-item
  // menu… Prune stale ids so batch actions never operate on ghosts
  // (resolveType would misclassify a vanished folder as a snippet).
  useEffect(() => {
    const live = new Set<string>();
    for (const f of folders) live.add(f.id);
    for (const s of snippets) live.add(s.id);
    for (const n of notes) live.add(n.id);
    // Intentional synchronize-with-props effect; the no-op branch returns the
    // previous set so it re-renders only when something was actually pruned.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
    if (anchorRef.current && !live.has(anchorRef.current)) anchorRef.current = null;
  }, [folders, snippets, notes]);

  const getOrderedVisibleIds = useCallback((): string[] => {
    const root = containerRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("[data-selectable-id]"))
      .map((el) => el.dataset.selectableId)
      .filter((id): id is string => Boolean(id));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
    anchorRef.current = null;
  }, []);

  const selectAll = useCallback(() => {
    const ids = getOrderedVisibleIds();
    if (ids.length === 0) return;
    setSelectedIds(new Set(ids));
    if (!anchorRef.current) anchorRef.current = ids[0];
  }, [getOrderedVisibleIds]);

  const activateItem = useCallback(
    (e: ReactMouseEvent | ReactKeyboardEvent, item: SelectedItem) => {
      if (e.shiftKey) {
        e.preventDefault();
        const ids = getOrderedVisibleIds();
        const anchorId = anchorRef.current ?? item.id;
        const anchorIndex = ids.indexOf(anchorId);
        const targetIndex = ids.indexOf(item.id);
        if (anchorIndex === -1 || targetIndex === -1) {
          setSelectedIds(new Set([item.id]));
          anchorRef.current = item.id;
          return;
        }
        const [lo, hi] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        setSelectedIds(new Set(ids.slice(lo, hi + 1)));
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
        anchorRef.current = item.id;
        return;
      }

      // Plain click: single selection + open in the main view.
      setSelectedIds(new Set([item.id]));
      anchorRef.current = item.id;
      if (item.type === "folder") selectFolder(item.id);
      else if (item.type === "note") selectNote?.(item.id);
      else selectSnippet(item.id);
    },
    [getOrderedVisibleIds, selectFolder, selectSnippet, selectNote],
  );

  const isItemSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  /**
   * Prime the selection for a right-click / "more" menu on `id`. Right-clicking an
   * item that's already part of the multi-selection keeps the whole set (so the
   * menu's batch actions cover it); right-clicking outside the selection collapses
   * it to just that item, so the highlighted items always match what the menu acts on.
   */
  const selectForMenu = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.has(id) ? prev : new Set([id])));
    anchorRef.current = id;
  }, []);

  const getSelectedItems = useCallback(
    (): SelectedItem[] => [...selectedIds].map((id) => ({ id, type: resolveType(id) })),
    [selectedIds, resolveType],
  );

  /** Where a ⌘/Ctrl+V paste should land, relative to the anchor item. */
  const pasteTargetFolderId = useCallback((): string | null => {
    const anchor = anchorRef.current;
    if (!anchor) return null;
    if (folders.some((f) => f.id === anchor)) return anchor;
    const snippet = snippets.find((s) => s.id === anchor);
    if (snippet) return snippet.folderId;
    const note = notes.find((n) => n.id === anchor);
    return note ? note.folderId : null;
  }, [folders, snippets, notes]);

  return {
    selectedIds,
    containerRef,
    activateItem,
    selectAll,
    clear,
    isItemSelected,
    selectForMenu,
    getSelectedItems,
    pasteTargetFolderId,
  };
}
