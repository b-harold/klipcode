import type { MetadataRoute } from "next";
import { localeHref } from "@/lib/locale";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klipcode.com";

const url = (path: string) => `${siteUrl}${path}`;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // English is prefix-less (localeHref("en", ...)); Spanish keeps /es.
  return [
    {
      url: url(localeHref("en")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
      alternates: {
        languages: { en: url(localeHref("en")), es: url(localeHref("es")) },
      },
    },
    {
      url: url(localeHref("es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
      alternates: {
        languages: { en: url(localeHref("en")), es: url(localeHref("es")) },
      },
    },
    {
      url: url(localeHref("en", "/app")),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: { en: url(localeHref("en", "/app")), es: url(localeHref("es", "/app")) },
      },
    },
    {
      url: url(localeHref("es", "/app")),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: { en: url(localeHref("en", "/app")), es: url(localeHref("es", "/app")) },
      },
    },
  ];
}
