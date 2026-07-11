import { afterEach, describe, expect, it, vi } from "vitest";
import { openItemInNewTab } from "@/lib/navigation";

/**
 * openItemInNewTab must resolve against the current pathname instead of a
 * hardcoded route: the app once opened tabs at "/?snippet=" (the landing page)
 * after moving to /app, and the locale prefix (/es/app) must survive too.
 */
describe("openItemInNewTab", () => {
  function stubWindow(pathname: string) {
    const open = vi.fn();
    vi.stubGlobal("window", { location: { pathname }, open });
    return open;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the snippet on the current app path", () => {
    const open = stubWindow("/app");
    openItemInNewTab("snippet", "abc123");
    expect(open).toHaveBeenCalledWith("/app?snippet=abc123", "_blank", "noopener,noreferrer");
  });

  it("preserves the locale prefix", () => {
    const open = stubWindow("/es/app");
    openItemInNewTab("folder", "f-1");
    expect(open).toHaveBeenCalledWith("/es/app?folder=f-1", "_blank", "noopener,noreferrer");
  });
});
