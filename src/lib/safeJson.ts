/**
 * Parse JSON that may be corrupt (e.g. localStorage tampered with, a browser
 * crash mid-write, or a partial quota-exceeded write). A raw `JSON.parse` on
 * such data throws, and when that happens on the app boot path it takes the
 * whole app down with a white screen. This never throws: on failure it runs the
 * optional `onError` hook (typically to clear the corrupt key) and returns the
 * caller-provided fallback.
 */
export const safeParseJson = <T>(
  raw: string | null | undefined,
  fallback: T,
  onError?: (err: unknown) => void
): T => {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    try {
      onError?.(err);
    } catch {
      // Never let cleanup failures escape the safe parser.
    }
    return fallback;
  }
};
