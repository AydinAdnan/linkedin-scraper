import { normalizeProfileUrl } from "./validateUrl.js";

// Validates + dedupes a raw list of URL strings while preserving submitted
// order and row numbers, so the caller can report per-row errors instead of
// failing the whole batch.
export function planBatchRows(rawEntries) {
  const seen = new Set();

  return rawEntries.map((raw, i) => {
    const row = i + 1;
    const canonical = normalizeProfileUrl(raw);

    if (!canonical) return { row, raw, error: "INVALID_PROFILE_URL" };
    if (seen.has(canonical)) return { row, raw, canonical, error: "DUPLICATE_URL" };

    seen.add(canonical);
    return { row, raw, canonical };
  });
}
