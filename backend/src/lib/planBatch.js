import { normalizeLinkedInUrl } from "./validateUrl.js";

// Validates + dedupes a raw list of URL strings while preserving submitted
// order and row numbers, so the caller can report per-row errors instead of
// failing the whole batch. Rows carry `type` (profile/company) so the caller
// can dispatch each to the right fetcher.
export function planBatchRows(rawEntries) {
  const seen = new Set();

  return rawEntries.map((raw, i) => {
    const row = i + 1;
    const parsed = normalizeLinkedInUrl(raw);

    if (!parsed) return { row, raw, error: "INVALID_LINKEDIN_URL" };
    if (seen.has(parsed.canonical)) {
      return { row, raw, canonical: parsed.canonical, type: parsed.type, error: "DUPLICATE_URL" };
    }

    seen.add(parsed.canonical);
    return { row, raw, canonical: parsed.canonical, type: parsed.type };
  });
}
