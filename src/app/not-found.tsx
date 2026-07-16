import Link from "next/link";
import { getDictionary } from "@/i18n";

// Root not-found renders directly under app/layout.tsx, bypassing
// [locale]/layout.tsx (which supplies <html>/<body>) since no [locale]
// segment matches an unknown URL — so it must render its own document shell,
// same constraint as global-error.tsx. There's no [locale] param here and
// this must stay a static Server Component (a "use client" pathname check or
// headers()/cookies() read here forces the whole app to render dynamically,
// defeating the static generation of "/" and "/app"), so copy defaults to
// English like global-error.tsx does for the same reason.
export default function NotFound() {
  const copy = getDictionary("en").notFound;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>{copy.title}</h1>
        <p style={{ maxWidth: "28rem", fontSize: "0.875rem", color: "rgba(237,237,237,0.5)", margin: 0 }}>
          {copy.description}
        </p>
        <Link
          href="/"
          style={{
            borderRadius: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            background: "rgba(237,237,237,0.1)",
            color: "rgba(237,237,237,0.8)",
            textDecoration: "none",
          }}
        >
          {copy.backHome}
        </Link>
      </body>
    </html>
  );
}
