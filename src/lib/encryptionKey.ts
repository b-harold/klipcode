import { base64ToBytes, importAesKey } from "@/lib/crypto";
import { getSupabaseBrowserClient } from "@/lib/supabase";

/**
 * Client-side retrieval of the signed-in user's data-encryption key (DEK).
 *
 * The raw DEK never persists anywhere on the client: it is fetched from
 * `/api/crypto/dek` (which unwraps it with the server-held master key) and kept
 * only in memory, keyed by user. The sync engine calls this lazily, so the
 * three outcomes map onto sync behavior:
 *
 * - a `CryptoKey`  → uploads are encrypted (`crypto_version` 1) and encrypted
 *   cloud rows can be decrypted;
 * - `null`         → encryption is unavailable (no Supabase, or the server has
 *   no master key configured); sync degrades to plaintext (`crypto_version` 0)
 *   exactly like before encryption existed;
 * - a thrown error → a transient failure (network, expired token, 5xx); the
 *   caller must NOT downgrade to plaintext — sync fails and the existing
 *   retry/backoff loop tries again.
 */

let cached: { userId: string; key: CryptoKey | null } | null = null;
let inflight: { userId: string; promise: Promise<CryptoKey | null> } | null = null;

export async function getWorkspaceEncryptionKey(userId: string): Promise<CryptoKey | null> {
  if (cached?.userId === userId) {
    return cached.key;
  }

  if (inflight?.userId === userId) {
    return inflight.promise;
  }

  const promise = fetchWorkspaceEncryptionKey(userId).finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { userId, promise };
  return promise;
}

/** Drop the in-memory key, e.g. on sign-out on a shared machine. */
export function clearWorkspaceEncryptionKey(): void {
  cached = null;
  inflight = null;
}

async function fetchWorkspaceEncryptionKey(userId: string): Promise<CryptoKey | null> {
  const supabase = getSupabaseBrowserClient();

  // No client (Supabase unset) or no auth API (test doubles): plaintext mode.
  // Not cached, so a later call re-evaluates.
  if (!supabase?.auth?.getSession) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token || session.user.id !== userId) {
    // Sync is running for a user we hold no session for (sign-out race, token
    // refresh in flight). Treat as transient so nothing is uploaded plaintext.
    throw new Error("No active session for encryption key fetch");
  }

  const response = await fetch("/api/crypto/dek", {
    headers: { authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });

  // 404 (route not deployed) / 503 (master key not configured): encryption is
  // deliberately unavailable. Cache it so every sync cycle doesn't re-probe;
  // a page reload picks up a newly configured server.
  if (response.status === 404 || response.status === 503) {
    cached = { userId, key: null };
    return null;
  }

  if (!response.ok) {
    throw new Error(`Encryption key fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as { dek?: unknown };
  if (typeof body.dek !== "string" || !body.dek) {
    throw new Error("Malformed encryption key response");
  }

  const key = await importAesKey(base64ToBytes(body.dek));
  cached = { userId, key };
  return key;
}
