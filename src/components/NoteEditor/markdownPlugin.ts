import type { Plugin } from "unified";
import type { Root, Text } from "mdast";
import { visit, SKIP } from "unist-util-visit";

export const SNIPPET_REF_RE = /\[\[snippet:([0-9a-fA-F-]{8,})\]\]/g;

/**
 * Walk text nodes and split [[snippet:<id>]] markers into placeholder nodes
 * that react-markdown will render as <span data-snippet-ref="<id>" />, which
 * the host component remaps to a SnippetReferenceCard.
 */
export const remarkSnippetRefs: Plugin<[], Root> = () => (tree) => {
  visit(tree, "text", (node: Text, index, parent) => {
    if (!parent || index === undefined) return;
    const value = node.value;
    if (!value) return;
    SNIPPET_REF_RE.lastIndex = 0;
    if (!SNIPPET_REF_RE.test(value)) return;
    SNIPPET_REF_RE.lastIndex = 0;

    const newChildren: Array<Text | { type: "snippetRef"; data: object }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SNIPPET_REF_RE.exec(value)) !== null) {
      if (match.index > lastIndex) {
        newChildren.push({ type: "text", value: value.slice(lastIndex, match.index) });
      }
      newChildren.push({
        type: "snippetRef",
        data: {
          hName: "span",
          hProperties: { "data-snippet-ref": match[1] },
        },
      });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < value.length) {
      newChildren.push({ type: "text", value: value.slice(lastIndex) });
    }

    parent.children.splice(index, 1, ...(newChildren as Text[]));
    return [SKIP, index + newChildren.length];
  });
};

/** Extract snippet ids referenced in a markdown body, in order of appearance. */
export function extractSnippetIds(markdown: string): string[] {
  if (!markdown) return [];
  const ids: string[] = [];
  SNIPPET_REF_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SNIPPET_REF_RE.exec(markdown)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}
