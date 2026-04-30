/**
 * Safely normalizes an optional URL string.
 * Returns null if the URL is invalid, empty, or not a string.
 * This version uses a robust check and never throws.
 */
export function normalizeOptionalUrl(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;

  let clean = value.trim();
  if (!clean) return null;

  // Add protocol if missing (case insensitive check)
  if (!/^https?:\/\//i.test(clean)) {
    clean = "https://" + clean;
  }

  try {
    // If new URL succeeds, it's a valid pattern
    const url = new URL(clean);
    return url.toString();
  } catch (error) {
    // Return null instead of throwing "The string did not match the expected pattern"
    return null;
  }
}
