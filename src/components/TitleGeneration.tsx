"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Which snippets currently have an AI title being generated in the background.
 * Owned by {@link KlipCodeApp}; written by `useWorkspaceMutations.generateAiTitle`
 * and read wherever a snippet's name is rendered (tree, cards, editor breadcrumb)
 * so the placeholder "Untitled" is swapped for a shimmer while we wait.
 */
const TitleGenerationContext = createContext<ReadonlySet<string>>(new Set());

export function TitleGenerationProvider({
  ids,
  children,
}: {
  ids: ReadonlySet<string>;
  children: ReactNode;
}) {
  return <TitleGenerationContext.Provider value={ids}>{children}</TitleGenerationContext.Provider>;
}

export function useIsGeneratingTitle(snippetId: string): boolean {
  return useContext(TitleGenerationContext).has(snippetId);
}

/**
 * The animated placeholder shown while Workers AI names a snippet: a small
 * pulsing sparkle plus a label whose text shimmers (see `.klipcode-title-shimmer`
 * in globals.css). Sized in `em` so it inherits the surrounding text scale.
 */
export function GeneratingTitle({ label, className }: { label: string; className?: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
    >
      <Sparkles size="1em" className="shrink-0 animate-pulse text-ink/45" aria-hidden="true" />
      <span className="klipcode-title-shimmer truncate">{label}</span>
    </span>
  );
}
