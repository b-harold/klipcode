import {
  Extension,
  ReactRenderer,
  type Editor,
  type Range,
} from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { ReactNode } from "react";

import { SlashCommandList, type SlashCommandListRef } from "./SlashCommandList";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: ReactNode;
  /** Extra terms matched against the typed query, on top of the title. */
  keywords?: string[];
  /** Replaces the typed "/query" with the chosen block. */
  run: (editor: Editor, range: Range) => void;
}

export interface SlashCommandOptions {
  items: SlashCommandItem[];
  emptyText: string;
  groupLabel: string;
}

/**
 * "/" block-inserter for the Markdown WYSIWYG. Built on @tiptap/suggestion; the
 * list UI lives in SlashCommandList and is mounted into a tippy popup. Items are
 * supplied (already localized) via `configure`.
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return { items: [], emptyText: "", groupLabel: "" };
  },

  addProseMirrorPlugins() {
    const { items, emptyText, groupLabel } = this.options;

    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        // Only trigger on a fresh "/" — not in the middle of a word/URL.
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const before = $from.nodeBefore;
          const textBefore = before?.text?.slice(-1) ?? "";
          return textBefore === "" || /\s/.test(textBefore);
        },
        command: ({ editor, range, props }) => {
          props.run(editor, range);
        },
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          if (!q) return items;
          return items.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.keywords?.some((k) => k.toLowerCase().includes(q)),
          );
        },
        render: () => {
          let component: ReactRenderer<SlashCommandListRef> | null = null;
          let popup: TippyInstance | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandList, {
                props: { ...props, emptyText, groupLabel },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy(document.body, {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                offset: [0, 8],
              });
            },
            onUpdate: (props) => {
              component?.updateProps({ ...props, emptyText, groupLabel });
              if (props.clientRect) {
                popup?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              }
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup?.hide();
                return true;
              }
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              popup?.destroy();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
