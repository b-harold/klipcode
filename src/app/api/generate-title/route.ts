import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase";
import { truncateCodeForTitlePrompt } from "@/lib/utils";

// Small, fast, multilingual instruct model — a title is a handful of words,
// so there's no reason to reach for a bigger (slower, costlier) one.
const TITLE_MODEL = "@cf/meta/llama-3.2-3b-instruct";

const SYSTEM_PROMPT = `You are a title generator embedded in a code-snippet manager. You will be shown the language and the first lines of a code snippet. Reply with ONLY a short, descriptive title for it: 2 to 6 words, Title Case, no surrounding quotes, no trailing punctuation, no markdown, no filler words like "Snippet", "Code", "Untitled", or the language name by itself. Infer the purpose from function/class/variable names, comments, imports, or overall structure — name what the code DOES, not what it IS. If the snippet is too short or generic to name meaningfully, reply with exactly: Untitled. Output the title text and absolutely nothing else — no explanation, no reasoning.`;

const MAX_TITLE_CHARS = 80;

function sanitizeTitle(raw: string): string {
  return raw
    .replace(/^["'`*_\s]+|["'`*_\s]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.:;,]+$/g, "")
    .slice(0, MAX_TITLE_CHARS)
    .trim();
}

async function isAuthenticated(request: Request): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return false;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { code, language } = (body ?? {}) as { code?: unknown; language?: unknown };
  if (typeof code !== "string" || !code.trim()) {
    return Response.json({ error: "code is required" }, { status: 400 });
  }

  const truncatedCode = truncateCodeForTitlePrompt(code);
  const languageLabel = typeof language === "string" && language.trim() ? language.trim() : "unknown";

  let ai: Ai;
  try {
    ai = getCloudflareContext().env.AI;
  } catch {
    return Response.json({ error: "AI unavailable" }, { status: 503 });
  }
  if (!ai) {
    return Response.json({ error: "AI unavailable" }, { status: 503 });
  }

  try {
    const result = await ai.run(TITLE_MODEL, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Language: ${languageLabel}\n\nCode:\n${truncatedCode}` },
      ],
      max_tokens: 24,
      temperature: 0.3,
    });

    const title = sanitizeTitle(result.response ?? "");
    if (!title || /^untitled$/i.test(title)) {
      return Response.json({ error: "no title" }, { status: 422 });
    }

    return Response.json({ title });
  } catch {
    return Response.json({ error: "generation failed" }, { status: 502 });
  }
}
