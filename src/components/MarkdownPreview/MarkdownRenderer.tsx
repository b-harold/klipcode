"use client";

import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// ──────────────────────────────────────────────────────────────────────────────
// Notion-like element styling
//
// Each Markdown element is mapped to a Tailwind-styled native element so the
// preview reads like a friendly document (Notion/Linear feel) rather than source
// code. Colors come from the theme tokens (foreground / ink) so it flips with the
// light/dark theme automatically. This module statically imports react-markdown +
// remark-gfm; it's loaded behind a lazy() boundary (see MarkdownPreview.tsx) so
// the parser stays out of the main bundle.
// ──────────────────────────────────────────────────────────────────────────────

type ElementProps<T extends keyof React.JSX.IntrinsicElements> =
  ComponentPropsWithoutRef<T> & { node?: unknown };

// Discard the `node` prop react-markdown injects before spreading onto the DOM.
function clean<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete (rest as { node?: unknown }).node;
  return rest;
}

const components: Components = {
  h1: ({ ...props }: ElementProps<"h1">) => (
    <h1
      className="mt-8 mb-3 text-[1.7rem] font-semibold leading-tight tracking-tight text-foreground first:mt-0"
      {...clean(props)}
    />
  ),
  h2: ({ ...props }: ElementProps<"h2">) => (
    <h2
      className="mt-7 mb-3 border-b border-ink/[0.08] pb-1.5 text-[1.35rem] font-semibold leading-tight tracking-tight text-foreground first:mt-0"
      {...clean(props)}
    />
  ),
  h3: ({ ...props }: ElementProps<"h3">) => (
    <h3
      className="mt-6 mb-2 text-[1.15rem] font-semibold leading-snug text-foreground first:mt-0"
      {...clean(props)}
    />
  ),
  h4: ({ ...props }: ElementProps<"h4">) => (
    <h4
      className="mt-5 mb-2 text-[1rem] font-semibold text-foreground first:mt-0"
      {...clean(props)}
    />
  ),
  h5: ({ ...props }: ElementProps<"h5">) => (
    <h5
      className="mt-4 mb-1.5 text-[0.9rem] font-semibold uppercase tracking-wide text-ink/70 first:mt-0"
      {...clean(props)}
    />
  ),
  h6: ({ ...props }: ElementProps<"h6">) => (
    <h6
      className="mt-4 mb-1.5 text-[0.85rem] font-semibold uppercase tracking-wide text-ink/50 first:mt-0"
      {...clean(props)}
    />
  ),
  p: ({ ...props }: ElementProps<"p">) => (
    <p className="my-3 text-[15px] leading-7 text-foreground/85" {...clean(props)} />
  ),
  a: ({ ...props }: ElementProps<"a">) => (
    <a
      className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 transition-colors hover:decoration-sky-400"
      target="_blank"
      rel="noopener noreferrer"
      {...clean(props)}
    />
  ),
  strong: ({ ...props }: ElementProps<"strong">) => (
    <strong className="font-semibold text-foreground" {...clean(props)} />
  ),
  em: ({ ...props }: ElementProps<"em">) => <em className="italic" {...clean(props)} />,
  del: ({ ...props }: ElementProps<"del">) => (
    <del className="text-ink/40 line-through" {...clean(props)} />
  ),
  ul: ({ ...props }: ElementProps<"ul">) => (
    <ul
      className="my-3 list-disc space-y-1 pl-6 text-[15px] leading-7 text-foreground/85 marker:text-ink/40"
      {...clean(props)}
    />
  ),
  ol: ({ ...props }: ElementProps<"ol">) => (
    <ol
      className="my-3 list-decimal space-y-1 pl-6 text-[15px] leading-7 text-foreground/85 marker:text-ink/40"
      {...clean(props)}
    />
  ),
  li: ({ ...props }: ElementProps<"li">) => <li className="pl-1" {...clean(props)} />,
  input: ({ ...props }: ElementProps<"input">) => (
    // GFM task-list checkboxes — rendered, non-interactive (preview is read-only).
    <input
      className="mr-1.5 -mt-0.5 align-middle accent-sky-500"
      disabled
      {...clean(props)}
    />
  ),
  blockquote: ({ ...props }: ElementProps<"blockquote">) => (
    <blockquote
      className="my-4 border-l-2 border-ink/20 pl-4 text-[15px] italic text-ink/60"
      {...clean(props)}
    />
  ),
  hr: ({ ...props }: ElementProps<"hr">) => (
    <hr className="my-6 border-0 border-t border-ink/[0.1]" {...clean(props)} />
  ),
  code: ({ className, ...props }: ElementProps<"code">) => {
    // Fenced blocks arrive wrapped in <pre>; react-markdown tags them with a
    // `language-*` class. Inline code has no such class — style it as a chip.
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code
          className="font-mono text-[13px] leading-6 text-foreground/90"
          {...clean(props)}
        />
      );
    }
    return (
      <code
        className="rounded bg-ink/[0.08] px-1.5 py-0.5 font-mono text-[0.85em] text-foreground/90"
        {...clean(props)}
      />
    );
  },
  pre: ({ ...props }: ElementProps<"pre">) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg border border-ink/[0.08] bg-[var(--code-surface)] p-4"
      {...clean(props)}
    />
  ),
  table: ({ ...props }: ElementProps<"table">) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-ink/[0.08]">
      <table className="w-full border-collapse text-[14px]" {...clean(props)} />
    </div>
  ),
  thead: ({ ...props }: ElementProps<"thead">) => (
    <thead className="bg-ink/[0.04]" {...clean(props)} />
  ),
  th: ({ ...props }: ElementProps<"th">) => (
    <th
      className="border-b border-ink/[0.08] px-3 py-2 text-left font-semibold text-foreground"
      {...clean(props)}
    />
  ),
  td: ({ ...props }: ElementProps<"td">) => (
    <td
      className="border-b border-ink/[0.06] px-3 py-2 text-foreground/80"
      {...clean(props)}
    />
  ),
  img: ({ alt, ...props }: ElementProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt ?? ""}
      className="my-4 max-w-full rounded-lg border border-ink/[0.08]"
      {...clean(props)}
    />
  ),
};

export default function MarkdownRenderer({ value }: { value: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {value}
    </ReactMarkdown>
  );
}
