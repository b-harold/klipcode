export const SPACE_ROOT_ID = "__space_root__";

/** Sentinel `?folder=` value that opens the trash root view. */
export const TRASH_ROOT_ID = "__trash_root__";

const SUPPORTED_LOCALES = new Set(["en", "es"]);

/**
 * Build an absolute href for the locale-prefixed app route.
 *
 * Open-in-new-tab handlers cannot use the App Router (`router.push`), so we
 * derive the `/${locale}/app` base from `window.location.pathname` at click
 * time instead of hard-coding "/" — otherwise the new tab lands on the
 * locale-redirector and loses any `?folder=` / `?snippet=` / `?note=` query.
 */
export function buildAppHref(query: string): string {
  const fallback = `/en/app${query ? `?${query}` : ""}`;
  if (typeof window === "undefined") return fallback;

  const segments = window.location.pathname.split("/").filter(Boolean);
  const locale = segments[0] && SUPPORTED_LOCALES.has(segments[0]) ? segments[0] : "en";
  return `/${locale}/app${query ? `?${query}` : ""}`;
}

/**
 * Open a snippet or folder in a new browser tab. Resolves against the current
 * pathname (/app or /es/app), which keeps the locale prefix intact.
 */
export function openItemInNewTab(param: "snippet" | "folder", id: string): void {
  window.open(`${window.location.pathname}?${param}=${id}`, "_blank", "noopener,noreferrer");
}
