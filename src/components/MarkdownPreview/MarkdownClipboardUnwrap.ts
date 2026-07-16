import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Slice } from "@tiptap/pm/model";

// Node types that constitute "list content". When a clipboard slice's
// top-level fragment is made up entirely of these, the stock
// `tiptap-markdown` text serializer emits the markdown list markers
// (`-`, `1.`, `[ ]` …) even when the user only dragged over the *visible*
// text of list items. The browser would otherwise have produced clean
// plain text. Here we intercept that single case and return the raw text
// of the fragment — one line per item, no markers — so a copy of a
// snippet's list reads naturally when pasted into chat, notes, etc.
//
// Every other shape (prose with inline marks, code blocks, tables, mixed
// list + paragraph selections …) is left to `tiptap-markdown` so rich
// formatting is still preserved on copy.
const LISTISH_NODE = new Set([
  "listItem",
  "taskItem",
  "bulletList",
  "orderedList",
  "taskList",
]);

export const MarkdownClipboardUnwrap = Extension.create({
  name: "markdownClipboardUnwrap",
  // Higher than `tiptap-markdown`'s `markdown` extension (priority 50) so
  // our `clipboardTextSerializer` prop is consulted first; we return null
  // to fall through to it for anything we don't handle.
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("markdownClipboardUnwrap"),
        props: {
          // Returning "" lets ProseMirror fall through to the next
          // `clipboardTextSerializer` (tiptap-markdown): `someProp` only
          // accepts truthy values, so an empty string is treated as "no
          // opinion" — exactly what we want for non-list selections.
          clipboardTextSerializer: (slice: Slice): string => {
            const { content } = slice;
            if (content.childCount === 0) return "";

            let listish = true;
            for (let i = 0; i < content.childCount; i++) {
              if (!LISTISH_NODE.has(content.child(i).type.name)) {
                listish = false;
                break;
              }
            }
            if (!listish) return "";

            return content.textBetween(0, content.size, "\n");
          },
        },
      }),
    ];
  },
});