export const SPACE_ROOT_ID = "__space_root__";

/** Sentinel `?folder=` value that opens the trash root view. */
export const TRASH_ROOT_ID = "__trash_root__";

/**
 * Open a snippet or folder in a new browser tab. Resolves against the current
 * pathname (/app or /es/app), which keeps the locale prefix intact.
 */
export function openItemInNewTab(param: "snippet" | "folder", id: string): void {
  window.open(`${window.location.pathname}?${param}=${id}`, "_blank", "noopener,noreferrer");
}
