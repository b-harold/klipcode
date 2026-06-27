// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";

import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { ListExitShortcut } from "@/components/MarkdownPreview/ListExitShortcut";

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
      ListExitShortcut,
    ],
    content: initial,
  });
}

function backspace(ed: Editor) {
  const ev = new KeyboardEvent("keydown", { key: "Backspace", bubbles: true });
  (ed.view as unknown as { dom: HTMLElement }).dom.dispatchEvent(ev);
}

function end(ed: Editor) {
  ed.commands.focus("end");
}

describe("ListExitShortcut", () => {
  it("bullet: backspace on empty last item exits list", () => {
    const ed = makeEditor("- one\n");
    end(ed);
    ed.commands.splitListItem("listItem"); // create empty 2nd item, caret inside it
    backspace(ed);
    expect(ed.getHTML()).toBe('<ul class="tight" data-tight="true"><li><p>one</p></li></ul><p></p>');
  });

  it("ordered: backspace on empty last item exits list", () => {
    const ed = makeEditor("1. one\n2. two\n");
    end(ed);
    ed.commands.splitListItem("listItem");
    backspace(ed);
    expect(ed.getHTML()).toBe('<ol class="tight" data-tight="true"><li><p>one</p></li><li><p>two</p></li></ol><p></p>');
  });

  it("task: backspace on empty last item exits list", () => {
    const ed = makeEditor("- [ ] one\n");
    end(ed);
    ed.commands.splitListItem("taskItem");
    backspace(ed);
    expect(ed.getHTML()).toContain('<p></p>');
    expect(ed.getHTML()).toContain('data-type="taskList"');
    // the trailing paragraph is OUTSIDE the taskList
    expect(ed.getHTML()).toMatch(/<\/ul><p><\/p>$/);
  });

  it("bullet: backspace inside non-empty item does NOT lift the item out", () => {
    const ed = makeEditor("- abc\n");
    end(ed); // caret after "abc"
    backspace(ed);
    // happy-dom has no real text-editing engine, so the char may not actually
    // be deleted — what matters here is that the item did NOT get lifted to a
    // trailing paragraph (i.e. no "<ul>...</ul><p></p>").
    expect(ed.getHTML()).not.toMatch(/<\/ul><p><\/p>/);
  });

  it("bullet: backspace at start of NON-empty item (caret before text) does NOT lift", () => {
    const ed = makeEditor("- one\n- two\n");
    // Caret at the start of the second item's paragraph (right after "<p>" open).
    ed.commands.setTextSelection(3);
    backspace(ed);
    expect(ed.getHTML()).not.toMatch(/<\/ul><p><\/p>$/);
  });

  it("bullet: empty FIRST (only) item — backspace exits to paragraph", () => {
    const ed = makeEditor("- \n");
    // caret at start of the empty item
    ed.commands.setTextSelection(3); // start of paragraph inside li
    backspace(ed);
    // expect a paragraph, no list
    expect(ed.getHTML()).toBe("<p></p>");
  });
});