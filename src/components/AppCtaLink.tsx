"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { Spinner } from "@/ui/Spinner";

function ArrowRight() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

/**
 * Trailing icon that flips to a spinner while the parent <Link> is navigating.
 * `useLinkStatus` only reports pending state from inside a Link descendant, hence
 * the split component.
 */
function CtaIcon() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size={16} /> : <ArrowRight />;
}

/**
 * Landing-page call-to-action that links into the app shell. Navigating to `/app`
 * loads a fresh route (a real round-trip on first visit), so the button shows a
 * spinner the moment it's clicked instead of looking inert until the page swaps.
 */
export function AppCtaLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className}>
      {children}
      <CtaIcon />
    </Link>
  );
}
