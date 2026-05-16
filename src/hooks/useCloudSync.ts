import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getDirtyWorkspace } from "@/lib/db";
import { fetchCloudWorkspace, syncDirtyWorkspace } from "@/lib/sync";
import type { Dictionary } from "@/i18n";
import type { SyncResult, SyncStatus } from "@/lib/types";
import { DEBOUNCE_MS } from "@/lib/constants/timing";

const MAX_SYNC_ERRORS = 5;

interface UseCloudSyncOptions {
  user: User | null;
  supabaseConfigured: boolean;
  copy: Dictionary;
  refreshWorkspace: () => void;
  setAccountMessage: (msg: string) => void;
}

export function useCloudSync({
  user,
  supabaseConfigured,
  copy,
  refreshWorkspace,
  setAccountMessage,
}: UseCloudSyncOptions) {
  const [snippetStatuses, setSnippetStatuses] = useState<Record<string, SyncStatus>>({});

  const localStatusTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cloudSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSyncInFlightRef = useRef(false);
  const syncErrorCountRef = useRef(0);

  // Refs for stable access inside async callbacks
  const userRef = useRef(user);
  userRef.current = user;
  const refreshRef = useRef(refreshWorkspace);
  refreshRef.current = refreshWorkspace;
  const setAccountMessageRef = useRef(setAccountMessage);
  setAccountMessageRef.current = setAccountMessage;
  const copyRef = useRef(copy);
  copyRef.current = copy;

  function setSnippetStatus(snippetId: string, status: SyncStatus) {
    setSnippetStatuses((prev) => ({ ...prev, [snippetId]: status }));
  }

  function settleLocally(snippetId: string) {
    const currentTimer = localStatusTimersRef.current.get(snippetId);
    if (currentTimer) clearTimeout(currentTimer);

    const nextTimer = setTimeout(() => {
      setSnippetStatus(snippetId, "saved-local");
      localStatusTimersRef.current.delete(snippetId);
    }, DEBOUNCE_MS);

    localStatusTimersRef.current.set(snippetId, nextTimer);
  }

  async function runCloudSync() {
    const currentUser = userRef.current;
    if (!currentUser || !supabaseConfigured || cloudSyncInFlightRef.current) return;

    cloudSyncInFlightRef.current = true;
    let syncSucceeded = false;
    let syncResult: SyncResult | null = null;

    try {
      const dirtyWorkspace = await getDirtyWorkspace(currentUser.id);

      if (dirtyWorkspace.folders.length === 0 && dirtyWorkspace.snippets.length === 0) {
        syncSucceeded = true;
        return;
      }

      for (const snippet of dirtyWorkspace.snippets) {
        setSnippetStatus(snippet.id, "saving");
      }

      setAccountMessageRef.current(copyRef.current.auth.cloudSyncRunning);
      syncResult = await syncDirtyWorkspace(currentUser.id);
      await fetchCloudWorkspace(currentUser.id);
      refreshRef.current();

      for (const snippetId of syncResult.syncedSnippetIds) {
        setSnippetStatus(snippetId, "saved-cloud");
      }

      setAccountMessageRef.current(copyRef.current.auth.syncedSession);
      syncSucceeded = true;
      syncErrorCountRef.current = 0;
    } catch {
      syncErrorCountRef.current++;

      // If syncDirtyWorkspace succeeded before the error, mark those snippets as saved.
      if (syncResult) {
        for (const snippetId of syncResult.syncedSnippetIds) {
          setSnippetStatus(snippetId, "saved-cloud");
        }
      }

      const dirtyUser = userRef.current;
      if (dirtyUser) {
        const dirtyWorkspace = await getDirtyWorkspace(dirtyUser.id);
        for (const snippet of dirtyWorkspace.snippets) {
          setSnippetStatus(snippet.id, "error");
        }
      }

      setAccountMessageRef.current(copyRef.current.auth.syncFailed);
    } finally {
      cloudSyncInFlightRef.current = false;

      // Stop automatic retries after too many consecutive errors to prevent
      // an infinite save loop when Supabase is unreachable or auth has expired.
      if (!syncSucceeded && syncErrorCountRef.current >= MAX_SYNC_ERRORS) return;

      const finalUser = userRef.current;
      if (finalUser) {
        const dirtyWorkspace = await getDirtyWorkspace(finalUser.id);

        if (dirtyWorkspace.folders.length > 0 || dirtyWorkspace.snippets.length > 0) {
          if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
          cloudSyncTimerRef.current = setTimeout(() => {
            void runCloudSync();
          }, DEBOUNCE_MS);
        }
      }
    }
  }

  function scheduleCloudSync() {
    if (!userRef.current || !supabaseConfigured) return;

    // Reset error count so a new user edit always triggers a fresh sync attempt.
    syncErrorCountRef.current = 0;

    if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);

    cloudSyncTimerRef.current = setTimeout(() => {
      void runCloudSync();
    }, DEBOUNCE_MS);
  }

  // Cleanup sync timers on unmount
  useEffect(() => {
    const localTimers = localStatusTimersRef.current;
    return () => {
      if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
      for (const timer of localTimers.values()) clearTimeout(timer);
    };
  }, []);

  return { snippetStatuses, setSnippetStatus, settleLocally, scheduleCloudSync };
}
