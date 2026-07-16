export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/** English is the default and is served WITHOUT a URL prefix. */
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that stores an explicit language choice; it wins over Accept-Language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

/** URL path prefix for a locale: "" for the default (en), "/es" otherwise. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/**
 * Build a locale-aware path. The default locale is prefix-less:
 *   localeHref("en")        -> "/"
 *   localeHref("en", "/app")-> "/app"
 *   localeHref("es")        -> "/es"
 *   localeHref("es", "/app")-> "/es/app"
 */
export function localeHref(locale: Locale, path = ""): string {
  const href = `${localePrefix(locale)}${path}`;
  return href === "" ? "/" : href;
}
