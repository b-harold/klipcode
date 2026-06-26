"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { getDictionary } from "@/i18n";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = params?.locale === "es" ? "es" : "en";
  const copy = getDictionary(locale).error;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="text-lg font-semibold">{copy.title}</h1>
      <p className="max-w-md text-sm text-ink/50">{copy.description}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-ink/10 px-4 py-2 text-sm text-ink/80 transition-colors hover:bg-ink/15"
      >
        {copy.retry}
      </button>
    </div>
  );
}
