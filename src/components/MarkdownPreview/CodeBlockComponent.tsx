"use client";

import { useState } from "react";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Check, Copy } from "lucide-react";

import { LanguageSelect } from "@/ui/LanguageSelect";
import { Tooltip } from "@/ui/Tooltip";
import type { LanguageId } from "@/lib/constants/languages";
import type { Dictionary } from "@/i18n";
import type { MarkdownEditorCopy } from "./MarkdownEditor";

/**
 * NodeView for fenced code blocks: keeps the highlighted `<pre><code>` content
 * editable and overlays the shared LanguageSelect so the block's language (the
 * Markdown fence info string) can be changed in place, plus a hover-revealed
 * copy button (also available on read-only snippets, where the picker is not).
 */
export function CodeBlockComponent({
  node,
  updateAttributes,
  extension,
  editor,
}: NodeViewProps) {
  const language = (node.attrs.language as string) || "plaintext";
  const copy = extension.options.languageSelectCopy as Dictionary["languageSelect"];
  const copyLabels = extension.options.copyLabels as
    | MarkdownEditorCopy["codeBlock"]
    | null;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="klipcode-md-codeblock group">
      <div
        className="klipcode-md-codeblock-lang"
        contentEditable={false}
        // Keep clicks on the controls from moving the editor selection.
        onMouseDown={(e) => e.stopPropagation()}
      >
        {copyLabels && (
          <Tooltip content={copied ? copyLabels.copied : copyLabels.copy} placement="top">
            <button
              type="button"
              aria-label={copyLabels.copy}
              onClick={handleCopy}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink/45 opacity-0 transition-all hover:bg-ink/[0.08] hover:text-ink/90 focus-visible:opacity-100 group-hover:opacity-100"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </Tooltip>
        )}
        {editor.isEditable && (
          <LanguageSelect
            value={language as LanguageId}
            onChange={(value) => updateAttributes({ language: value })}
            copy={copy}
          />
        )}
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
