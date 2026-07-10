/**
 * Returns the URL when the pasted plain text is exactly one http(s) URL
 * (surrounding whitespace ignored), otherwise null. Deliberately strict:
 * multi-word/multi-line pastes and other schemes fall through to the
 * normal paste path instead of being linkified.
 */
export function extractPastedUrl(text: string): string | null {
  const candidate = text.trim();
  if (!/^https?:\/\/\S+$/i.test(candidate)) return null;
  try {
    new URL(candidate);
  } catch {
    return null;
  }
  return candidate;
}
