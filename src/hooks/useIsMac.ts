import { useEffect, useState } from "react";

import { isMac } from "@/lib/constants/shortcuts";

/**
 * Platform check that is safe for server-rendered UI: returns `false` on the
 * first (server + hydration) render and the real value after mount, so a Mac's
 * ⌘ badge never mismatches the SSR'd Ctrl markup.
 */
export function useIsMac(): boolean {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    // One-time platform read after mount to avoid an SSR hydration mismatch;
    // this is a sync-to-external-environment effect, not a derivable value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMac(isMac());
  }, []);
  return mac;
}
