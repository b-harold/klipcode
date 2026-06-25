"use client";

import { useCallback, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

import type { FolderRecord, SelectedItem, SnippetRecord } from "@/lib/types";

interface UseTreeSelectionOptions {
  folders: FolderRecord[];
  snippets: SnippetRecord[];
  /** Open a snippet in the main view (plain click). */
  selectSnippet: (id: string) => void;
  /** Open a folder in the main view (plain click). */
  selectFolder: (id: string) => void;
}

/**
 * VS Code–style multi-selection for the sidebar tree.
 *
 * A plain click selects a single item and opens it. ⌘/Ctrl+click toggles an item
 * in the selection without opening it; Shift+click selects the range between the
 * anchor and the clicked item; ⌘/Ctrl+A selects every visible item. The set of
 * selected ids drives the batch operations (delete / cut / copy / drag-move).
 *
 * Visible order (for Ctrl+A and Shift ranges) is read straight from the DOM via
 * the `data-tree-id` attributes on each row, so it always reflects which folders
 * are currently expanded without having to lift that local state up.
 */
export function useTreeSelection({
  folders,
  snippets,
  selectSnippet,
  selectFolder,
}: UseTreeSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  /** Last single-clicked/toggled item — the pivot for Shift range selection. */
  const anchorRef = useRef<string | null>(null);
  /** The scrollable tree container; queried for visible rows in DOM order. */
  const containerRef = useRef<HTMLDivElement | null>(null);

  const resolveType = useCallback(
    (id: string): "folder" | "snippet" => (folders.some((f) => f.id === id) ? "folder" : "snippet"),
    [folders],
  );

  const getOrderedVisibleIds = useCallback((): string[] => {
    const root = containerRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("[data-tree-id]"))
      .map((el) => el.dataset.treeId)
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
      else selectSnippet(item.id);
    },
    [getOrderedVisibleIds, selectFolder, selectSnippet],
  );

  const isItemSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

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
    return snippet ? snippet.folderId : null;
  }, [folders, snippets]);

  return {
    selectedIds,
    containerRef,
    activateItem,
    selectAll,
    clear,
    isItemSelected,
    getSelectedItems,
    pasteTargetFolderId,
  };
}
