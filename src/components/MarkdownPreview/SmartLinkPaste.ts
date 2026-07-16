import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { extractPastedUrl } from "./pastedUrl";

// Pasting a URL over selected text turns the selection into a link (the
// Notion/Google-Docs affordance) instead of replacing the text with the URL —
// no need to go through the bubble-menu link dialog.
export const SmartLinkPaste = Extension.create({
  name: "smartLinkPaste",
  // Must be consulted before `tiptap-markdown`'s paste transform (priority 50),
  // which would otherwise swallow the paste and replace the selection.
  priority: 1000,

  addProseMirrorPlugins() {
    const { editor } = this;
    return [
      new Plugin({
        key: new PluginKey("smartLinkPaste"),
        props: {
          handlePaste: (view, event) => {
            const url = extractPastedUrl(
              event.clipboardData?.getData("text/plain") ?? "",
            );
            if (!url) return false;
            // Only act on a real text selection; a collapsed caret keeps the
            // normal paste (autolink already covers typing a bare URL).
            if (view.state.selection.empty) return false;
            // Links don't apply in code contexts — paste the URL as text there.
            if (editor.isActive("codeBlock") || editor.isActive("code")) return false;
            // `run()` is false when the schema rejects the mark for this
            // selection (e.g. a selected horizontal rule) — fall through to a
            // normal paste rather than silently doing nothing.
            return editor.chain().setLink({ href: url }).run();
          },
        },
      }),
    ];
  },
});
