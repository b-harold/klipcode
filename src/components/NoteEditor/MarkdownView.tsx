"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { SnippetRecord } from "@/lib/types";
import type { Dictionary } from "@/i18n";

import { remarkSnippetRefs } from "./markdownPlugin";
import { SnippetReferenceCard } from "./SnippetReferenceCard";

interface MarkdownViewProps {
  markdown: string;
  snippets: SnippetRecord[];
  copy: Dictionary;
  onOpenSnippet: (snippetId: string) => void;
  className?: string;
}

export function MarkdownView({
  markdown,
  snippets,
  copy,
  onOpenSnippet,
  className,
}: MarkdownViewProps) {
  const components: Components = {
    span: ({ children, ...props }) => {
      const ref = (props as Record<string, unknown>)["data-snippet-ref"];
      if (typeof ref === "string") {
        const snippet = snippets.find((s) => s.id === ref) ?? null;
        return (
          <SnippetReferenceCard
            snippet={snippet}
            copy={copy}
            onOpen={() => onOpenSnippet(ref)}
          />
        );
      }
      return <span {...props}>{children}</span>;
    },
  };

  return (
    <div className={`markdown-body ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkSnippetRefs]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
