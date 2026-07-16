// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";

import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { MarkdownClipboardUnwrap } from "@/components/MarkdownPreview/MarkdownClipboardUnwrap";
import type { Slice } from "@tiptap/pm/model";

function makeEditor(initial: string) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return new Editor({
    element: el,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ html: false, tightLists: true, transformPastedText: true, transformCopiedText: true }),
      MarkdownClipboardUnwrap,
    ],
    content: initial,
  });
}

// Reproduces what the browser would actually place on the clipboard for a
// text selection `from`..`to`: the first truthy `clipboardTextSerializer`
// plugin prop wins (same lookup order ProseMirror uses internally).
function copyText(ed: Editor, from: number, to: number): string {
  const slice: Slice = ed.state.doc.slice(from, to);
  let out = "";
  ed.view.someProp("clipboardTextSerializer", (f) => {
    out = f(slice, ed.view);
    return out;
  });
  return out;
}

describe("MarkdownClipboardUnwrap", () => {
  it("removes the bullet marker when copying a whole bullet list (ctrl+a)", () => {
    const ed = makeEditor("- one\n- two\n- three\n");
    const size = ed.state.doc.content.size;
    expect(copyText(ed, 0, size)).toBe("one\ntwo\nthree");
  });

  it("copies a single item's text without the `-` marker", () => {
    const ed = makeEditor("- one\n- two\n");
    // whole first listItem
    expect(copyText(ed, 2, 8)).toBe("one");
  });

  it("copies two items together as plain lines, not as a markdown list", () => {
    const ed = makeEditor("- one\n- two\n");
    expect(copyText(ed, 2, 15)).toBe("one\ntwo");
  });

  it("strips the ordered-list marker `1.` on copy", () => {
    const ed = makeEditor("1. one\n2. two\n");
    expect(copyText(ed, 0, ed.state.doc.content.size)).toBe("one\ntwo");
  });

  it("strips the task-list checkbox marker `[ ]` on copy", () => {
    const ed = makeEditor("- [ ] foo\n- [x] bar\n");
    expect(copyText(ed, 0, ed.state.doc.content.size)).toBe("foo\nbar");
  });

  it("preserves embedded inline text when copying part of an item", () => {
    const ed = makeEditor("- hello world\n");
    // partial text "lo wo" inside the paragraph
    const from = 6;
    const to = 11;
    expect(copyText(ed, from, to)).toBe("lo wo");
  });

  it("keeps falling back to tiptap-markdown for prose paragraphs (inline bold)", () => {
    const ed = makeEditor("**bold** and plain\n");
    const size = ed.state.doc.content.size;
    // a bare paragraph is NOT listish → delegate → bold markers preserved
    expect(copyText(ed, 0, size)).toBe("**bold** and plain");
  });

  it("does not add a trailing newline", () => {
    const ed = makeEditor("- a\n- b\n");
    const out = copyText(ed, 0, ed.state.doc.content.size);
    expect(out.endsWith("\n")).toBe(false);
  });
});