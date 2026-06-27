"use client";

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import { LanguageSelect } from "@/ui/LanguageSelect";
import type { LanguageId } from "@/lib/constants/languages";
import type { Dictionary } from "@/i18n";

/**
 * NodeView for fenced code blocks: keeps the highlighted `<pre><code>` content
 * editable and overlays the shared LanguageSelect so the block's language (the
 * Markdown fence info string) can be changed in place.
 */
export function CodeBlockComponent({
  node,
  updateAttributes,
  extension,
  editor,
}: NodeViewProps) {
  const language = (node.attrs.language as string) || "plaintext";
  const copy = extension.options.languageSelectCopy as Dictionary["languageSelect"];

  return (
    <NodeViewWrapper className="klipcode-md-codeblock">
      {editor.isEditable && (
        <div
          className="klipcode-md-codeblock-lang"
          contentEditable={false}
          // Keep clicks on the selector from moving the editor selection.
          onMouseDown={(e) => e.stopPropagation()}
        >
          <LanguageSelect
            value={language as LanguageId}
            onChange={(value) => updateAttributes({ language: value })}
            copy={copy}
          />
        </div>
      )}
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
