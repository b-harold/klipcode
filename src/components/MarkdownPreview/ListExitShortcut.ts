import { Extension, type Editor } from "@tiptap/react";
import { Selection, TextSelection } from "@tiptap/pm/state";

// TipTap's stock ListItem/TaskItem only bind Enter/Tab/Shift-Tab — Backspace on an
// empty list item falls through to ProseMirror's `joinBackward`, which merges the
// empty paragraph *back into the preceding item* inside the list. The caret stays
// wrapped by `<ul>/<ol>` so it keeps the list's left padding with no bullet — the
// "viñeta quitada pero el margen sigue" bug. Instead, Backspace at the start of an
// empty list item should *exit* the list (lift the item to a sibling paragraph at
// the default margin), matching Notion/Linear editors.
const ITEM_TYPES = new Set(["listItem", "taskItem"]);
const LIST_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

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

    // After exiting a list (above), the caret sits in a trailing top-level
    // paragraph immediately following the list. Pressing Backspace there falls
    // through to ProseMirror's `joinBackward`, which re-wraps the paragraph as a
    // *new list item* — visually "regenerating the bullet" instead of deleting
    // upward. Detect that exact case and instead merge the paragraph into the end
    // of the list's last item (caret lands at the end of its text).
    const joinIntoList = ({ editor }: { editor: Editor }) => {
      const { state } = editor;
      const { selection } = state;
      if (!selection.empty) return false;

      const $from = selection.$from;
      // Caret must be at the very start of a top-level paragraph…
      if ($from.depth !== 1 || !$from.parent.isTextblock) return false;
      if (selection.from !== $from.start(1)) return false;
      // …whose immediately preceding sibling (at doc level) is a list.
      const index = $from.index(0);
      if (index === 0) return false;
      const before = $from.node(0).child(index - 1);
      if (!LIST_TYPES.has(before.type.name)) return false;

      const para = $from.parent;
      const paraStart = $from.before(1);
      const paraEnd = $from.after(1);
      // End of the list's last textblock (just inside the list's closing token).
      const target = Selection.near(state.doc.resolve(paraStart - 1), -1).from;

      const tr = state.tr;
      tr.delete(paraStart, paraEnd); // target < paraStart, so it stays valid
      if (para.content.size > 0) tr.insert(target, para.content);
      tr.setSelection(TextSelection.create(tr.doc, target));
      editor.view.dispatch(tr.scrollIntoView());
      return true;
    };

    return {
      Backspace: ({ editor }) => handle({ editor }) || joinIntoList({ editor }),
    };
  },
});