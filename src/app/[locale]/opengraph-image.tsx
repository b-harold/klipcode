import { ImageResponse } from "next/og";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/lib/locale";

export const alt = "KlipCode — Code Snippet Manager with Cloud Sync";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  const headline = dict.meta.home.title.replace(/^KlipCode\s*—\s*/, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#ededed",
              fontSize: 26,
              fontWeight: 700,
              color: "#0a0a0a",
            }}
          >
            {"</>"}
          </div>
          <span style={{ fontSize: 40, fontWeight: 600, color: "#ededed" }}>
            KlipCode
          </span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 44,
            maxWidth: 880,
            textAlign: "center",
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.25,
            color: "#ededed",
          }}
        >
          {headline}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 24,
            maxWidth: 760,
            textAlign: "center",
            fontSize: 26,
            color: "rgba(237,237,237,0.6)",
          }}
        >
          {dict.landing.hero.subtitle}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            width: 240,
            height: 4,
            borderRadius: 2,
            background: "linear-gradient(90deg, #8400FF 0%, #00A3FF 50%, #8400FF 100%)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
