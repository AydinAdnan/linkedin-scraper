// Shared plumbing for reading Voyager's normalized entity responses — used by
// both the profile and company services. Actual field mapping (what each
// entity's fields mean) stays separate per service since profiles and
// companies have genuinely different schemas.
import { writeFile } from "fs/promises";
import { ProfileNotFoundError, ProfileRestrictedError } from "./voyagerClient.js";

// The `included` array is a flat, normalized list of entities linked by
// entityUrn. Match $type by substring (not exact string) because the same
// entity kind shows up under different fully qualified type names depending
// on which endpoint/version served it.
export function entitiesMatching(included, keyword) {
  return included.filter((e) => typeof e.$type === "string" && e.$type.includes(keyword));
}

export function resolveImage(picture) {
  // Newer dash endpoints nest it under displayImageReference.vectorImage;
  // older ones embedded it directly — accept either.
  const root = picture?.displayImageReference?.vectorImage || picture?.["com.linkedin.common.VectorImage"];
  const artifacts = root?.artifacts || [];
  // Artifacts aren't sorted by size — pick the largest so we don't grab a thumbnail.
  const biggest = artifacts.reduce((a, b) => ((b.width || 0) > (a?.width || 0) ? b : a), null);
  if (!root || !biggest) return null;
  return `${root.rootUrl}${biggest.fileIdentifyingUrlPathSegment}`;
}

// Strip to just { month, year } — LinkedIn's raw date objects carry their own
// internal $type/$recipeTypes metadata we don't want leaking into our schema.
export function cleanDate(d) {
  return d?.year ? { month: d.month ?? null, year: d.year } : null;
}

export function dateRange(entity) {
  const range = entity.timePeriod || entity.dateRange;
  return { start: cleanDate(range?.startDate || range?.start), end: cleanDate(range?.endDate || range?.end) };
}

// LinkedIn's exact field/entity names drift over time. Dumping the raw
// response makes it easy to diff against when a field silently starts
// coming back null instead of crashing blind.
export async function dumpDebug(filePath, data) {
  if (process.env.NODE_ENV === "production") return;
  await writeFile(filePath, JSON.stringify(data, null, 2)).catch(() => {});
}

// The top-level response is a Rest.li CollectionResponse — `*elements` is
// the list of matched entity URNs. Empty means the lookup matched nothing at
// all (nonexistent). A non-empty list whose entity still didn't resolve to
// usable data means it exists but is private/restricted and LinkedIn just
// didn't 403 it outright.
export function classifyMissing(raw) {
  const elements = raw.data?.["*elements"] || raw.data?.elements || [];
  return elements.length === 0 ? new ProfileNotFoundError() : new ProfileRestrictedError();
}
