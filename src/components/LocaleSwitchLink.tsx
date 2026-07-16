"use client";

import Link from "next/link";
import { LOCALE_COOKIE, localeHref, type Locale } from "@/lib/locale";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Language switcher link. Persists the chosen locale in the NEXT_LOCALE cookie
 * before navigating so the explicit choice wins over Accept-Language — without
 * it, a Spanish-preferring browser would be bounced back to /es when switching
 * to the prefix-less English URL.
 *
 * Prefetch is disabled on purpose: the English target ("/") is prefetched while
 * the cookie still says "es", so middleware answers that prefetch with a 307
 * redirect to /es and Next caches it. The click would then reuse that stale
 * redirect and bounce straight back to Spanish. Skipping prefetch makes the
 * navigation request fire fresh, after persistChoice() has flipped the cookie.
 */
export function LocaleSwitchLink({
  to,
  className,
  "aria-label": ariaLabel,
  children,
}: {
  to: Locale;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  function persistChoice() {
    document.cookie = `${LOCALE_COOKIE}=${to}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  }

  return (
    <Link
      href={localeHref(to)}
      prefetch={false}
      onClick={persistChoice}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
