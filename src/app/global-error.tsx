"use client";

import { useEffect } from "react";
import { getDictionary } from "@/i18n";

// global-error replaces the root layout when an error escapes it, so it must
// render its own <html>/<body> and cannot rely on globals.css — styles are
// inline. Locale isn't reliably available here, so copy defaults to English.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = getDictionary("en").error;

  useEffect(() => {
    console.error(error);
  }, [error]);

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
        <button
          type="button"
          onClick={reset}
          style={{
            cursor: "pointer",
            borderRadius: "0.375rem",
            border: "none",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          {copy.retry}
        </button>
      </body>
    </html>
  );
}
