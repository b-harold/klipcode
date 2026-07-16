import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import {
  base64ToBytes,
  bytesToBase64,
  decryptString,
  DEK_BYTES,
  encryptString,
  generateDekBytes,
  importAesKey,
} from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Hands the signed-in user their data-encryption key (DEK).
 *
 * The DEK is stored in `public.user_keys` ONLY wrapped (encrypted) by the
 * master key (KEK), which lives exclusively as the `ENCRYPTION_MASTER_KEY`
 * Worker secret — so the database alone can never decrypt anything, and this
 * route is the only place the two ever meet. On a user's first call the DEK is
 * generated here; losing a race against another device is resolved by reading
 * back the row that won.
 *
 * A 503 means "encryption not configured" and tells the client to sync in
 * plaintext; any other failure is transient and the client must retry rather
 * than downgrade.
 */

function getMasterKeyBase64(): string | null {
  let secret: string | undefined;
  try {
    // Cast because the secret isn't in wrangler.jsonc (it's set with
    // `wrangler secret put`), so `wrangler types` can't know about it.
    secret = (getCloudflareContext().env as unknown as Record<string, string | undefined>)
      .ENCRYPTION_MASTER_KEY;
  } catch {
    // Outside the Workers runtime (plain `next dev`, tests): fall through.
  }
  return secret ?? process.env.ENCRYPTION_MASTER_KEY ?? null;
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return json({ error: "encryption not configured" }, 503);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return json({ error: "unauthorized" }, 401);
  }

  const masterKeyBase64 = getMasterKeyBase64();
  if (!masterKeyBase64) {
    return json({ error: "encryption not configured" }, 503);
  }

  let kek: CryptoKey;
  try {
    const kekBytes = base64ToBytes(masterKeyBase64.trim());
    if (kekBytes.length !== DEK_BYTES) {
      throw new Error("master key must decode to 32 bytes");
    }
    kek = await importAesKey(kekBytes);
  } catch {
    // A present-but-broken secret is a deployment mistake; surface it as
    // "not configured" so clients keep working (in plaintext) instead of
    // erroring forever.
    return json({ error: "encryption not configured" }, 503);
  }

  // The user's own JWT drives every query, so RLS scopes access to their row —
  // this route needs no service-role key.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: "unauthorized" }, 401);
  }
  const userId = userData.user.id;

  const readWrappedDek = async () => {
    const { data, error } = await supabase
      .from("user_keys")
      .select("wrapped_dek")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data?.wrapped_dek ?? null;
  };

  try {
    const existing = await readWrappedDek();
    if (existing !== null) {
      return json({ dek: await decryptString(kek, existing) });
    }

    const dek = bytesToBase64(generateDekBytes());
    const wrapped = await encryptString(kek, dek);
    const { error: insertError } = await supabase
      .from("user_keys")
      .insert({ user_id: userId, wrapped_dek: wrapped });

    if (!insertError) {
      return json({ dek });
    }

    // Another device inserted its DEK between our read and insert; the row is
    // immutable once created, so the winner's key is the account's key.
    const raced = await readWrappedDek();
    if (raced !== null) {
      return json({ dek: await decryptString(kek, raced) });
    }
    throw insertError;
  } catch {
    return json({ error: "key retrieval failed" }, 500);
  }
}
