import type { Metadata } from "next";
import { localeHref, type Locale } from "@/lib/locale";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klipcode.com";

/**
 * Builds canonical/hreflang + Open Graph/Twitter metadata for a single page.
 * `path` must match the page this is called from (e.g. "" for the home page,
 * "/app" for the app) so the canonical points at that page, not the locale root.
 */
export function buildPageMetadata({
  locale,
  path = "",
  title,
  description,
}: {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
}): Metadata {
  const canonical = `${siteUrl}${localeHref(locale, path)}`;
  // Titles that are already fully branded (e.g. "KlipCode — ...") would
  // otherwise get "· KlipCode" appended twice via the root layout's
  // title.template; `absolute` opts out of the template for those.
  const pageTitle = title.startsWith("KlipCode") ? { absolute: title } : title;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}${localeHref("en", path)}`,
        es: `${siteUrl}${localeHref("es", path)}`,
        "x-default": `${siteUrl}${localeHref("en", path)}`,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: "KlipCode",
      locale: locale === "es" ? "es_ES" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
