import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { getDictionary } from "@/i18n";
import { isLocale, localeHref } from "@/lib/locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klipcode.com";

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "es" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  const canonical = `${siteUrl}${localeHref(loc)}`;

  return {
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}${localeHref("en")}`,
        es: `${siteUrl}${localeHref("es")}`,
        "x-default": `${siteUrl}${localeHref("en")}`,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: `KlipCode — ${dict.app.subtitle}`,
      description: dict.landing.hero.subtitle,
      siteName: "KlipCode",
      locale: loc === "es" ? "es_ES" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `KlipCode — ${dict.app.subtitle}`,
      description: dict.landing.hero.subtitle,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
