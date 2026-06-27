import { Extension, type Editor } from "@tiptap/react";

// TipTap's stock ListItem/TaskItem only bind Enter/Tab/Shift-Tab — Backspace on an
// empty list item falls through to ProseMirror's `joinBackward`, which merges the
// empty paragraph *back into the preceding item* inside the list. The caret stays
// wrapped by `<ul>/<ol>` so it keeps the list's left padding with no bullet — the
// "viñeta quitada pero el margen sigue" bug. Instead, Backspace at the start of an
// empty list item should *exit* the list (lift the item to a sibling paragraph at
// the default margin), matching Notion/Linear editors.
const ITEM_TYPES = new Set(["listItem", "taskItem"]);

export const ListExitShortcut = Extension.create({
  name: "listExitShortcut",

  addKeyboardShortcuts() {
    const handle = ({ editor }: { editor: Editor }) => {
      const { state } = editor;
      const { selection } = state;
      if (!selection.empty) return false;

      const $from = selection.$from;
      // Only act when the caret is at the start of an empty list item's first
      // text block — otherwise normal backspace should delete the char before it.
      if ($from.depth < 2 || selection.from !== $from.start($from.depth)) return false;

      let itemDepth = -1;
      for (let depth = $from.depth - 1; depth > 0; depth--) {
        if (ITEM_TYPES.has($from.node(depth).type.name)) {
          itemDepth = depth;
          break;
        }
      }
      if (itemDepth === -1) return false;

      const item = $from.node(itemDepth);
      if (item.textContent.length > 0) return false;
      // The block the caret sits in must be the item's first child, so backspace
      // at the start of a later (still-empty) paragraph inside the item doesn't
      // unexpectedly lift the whole item.
      if ($from.index(itemDepth) !== 0) return false;

      return editor.commands.liftListItem(item.type.name);
    };

    return {
      Backspace: handle,
    };
  },
});