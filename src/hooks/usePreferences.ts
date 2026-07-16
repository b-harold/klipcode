"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_PREFERENCES,
  readPreferences,
  writePreferences,
  type Preferences,
} from "@/lib/preferences";

/**
 * Reads device-local preferences from localStorage and persists updates. Starts
 * from defaults and hydrates from storage in an effect (not during render) so the
 * server-rendered markup and the first client render match — the snippet creator
 * just snaps to the stored values a tick after mount.
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    // Hydrate from localStorage after mount so SSR markup and the first client
    // render stay identical — a synchronize-on-mount, not derivable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferences(readPreferences());
  }, []);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      writePreferences(next);
      return next;
    });
  }, []);

  return { preferences, updatePreferences };
}
