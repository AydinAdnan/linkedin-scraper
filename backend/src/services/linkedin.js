import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { voyagerClient, ProfileRestrictedError } from "../lib/voyagerClient.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { enqueue } from "../lib/queue.js";
import { normalizeProfileUrl } from "../lib/validateUrl.js";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function extractPublicIdentifier(url) {
  const canonical = normalizeProfileUrl(url);
  if (!canonical) throw new Error("Not a valid LinkedIn profile URL");
  return canonical.split("/in/")[1];
}

// LinkedIn's `included` array is a flat, normalized list of entities linked
// by entityUrn. Match $type by substring (not exact string) because the
// same section (Position, Education, ...) shows up under different fully
// qualified type names depending on which Voyager endpoint served it
// (classic "identity.profile.X" vs newer "dash.identity.profile.X").
function entitiesMatching(included, keyword) {
  return included.filter((e) => typeof e.$type === "string" && e.$type.includes(keyword));
}

function findProfile(included) {
  return (
    included.find((e) => typeof e.$type === "string" && e.$type.includes("Profile") && e.firstName) || {}
  );
}

function resolveImage(picture) {
  // Newer dash endpoint nests it under displayImageReference.vectorImage;
  // classic profileView embedded it directly — accept either.
  const root = picture?.displayImageReference?.vectorImage || picture?.["com.linkedin.common.VectorImage"];
  const artifacts = root?.artifacts || [];
  // Artifacts aren't sorted by size — pick the largest so we don't grab a thumbnail.
  const biggest = artifacts.reduce((a, b) => ((b.width || 0) > (a?.width || 0) ? b : a), null);
  if (!root || !biggest) return null;
  return `${root.rootUrl}${biggest.fileIdentifyingUrlPathSegment}`;
}

// Old profileView used `timePeriod: { startDate, endDate }`, the newer dash
// endpoint uses `dateRange: { start, end }` — accept either.
function dateRange(entity) {
  const range = entity.timePeriod || entity.dateRange;
  return { start: range?.startDate || range?.start || null, end: range?.endDate || range?.end || null };
}

function parseProfileView(raw) {
  const included = raw.included || [];
  const profile = findProfile(included);

  const positions = entitiesMatching(included, "Position");
  const educations = entitiesMatching(included, "Education");
  const skills = entitiesMatching(included, "Skill");
  const certifications = entitiesMatching(included, "Certification");
  const languages = entitiesMatching(included, "Language");

  return {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
    headline: profile.headline || null,
    location: profile.geoLocationName || profile.locationName || null,
    about: profile.summary || null,
    profileImage: resolveImage(profile.profilePicture),
    bannerImage: resolveImage(profile.backgroundPicture),
    experience: positions.map((p) => {
      const { start, end } = dateRange(p);
      return {
        title: p.title || null,
        company: p.companyName || null,
        location: p.locationName || null,
        startDate: start,
        endDate: end,
        description: p.description || null,
      };
    }),
    education: educations.map((e) => {
      const { start, end } = dateRange(e);
      return {
        school: e.schoolName || null,
        degree: e.degreeName || null,
        field: e.fieldOfStudy || null,
        startDate: start,
        endDate: end,
      };
    }),
    skills: skills.map((s) => s.name).filter(Boolean),
    certifications: certifications.map((c) => ({
      name: c.name || null,
      authority: c.authority || null,
      url: c.url || null,
    })),
    languages: languages.map((l) => ({
      name: l.name || null,
      proficiency: l.proficiency || null,
    })),
  };
}

async function fetchProfileUncached(url) {
  const publicId = extractPublicIdentifier(url);
  const client = voyagerClient();
  const { data } = await client.get("/identity/dash/profiles", {
    params: {
      q: "memberIdentity",
      memberIdentity: publicId,
      decorationId: config.profileDecorationId,
    },
    headers: {
      referer: `https://www.linkedin.com/in/${publicId}/`,
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-fetch-dest": "empty",
    },
  });

  // LinkedIn's exact field/entity names drift over time (see README "known
  // limitations"). Dumping the raw response makes it easy to diff against
  // when a field silently starts coming back null instead of crashing blind.
  if (process.env.NODE_ENV !== "production") {
    await writeFile(path.join(__dirname, "..", "..", "debug-last-profile.json"), JSON.stringify(data, null, 2)).catch(
      () => {}
    );
  }

  const parsed = parseProfileView(data);
  // LinkedIn doesn't always 403 a restricted profile — a private/out-of-network
  // profile can come back as a 200 with no usable profile entity at all.
  // Treat "no name" the same as an explicit restriction rather than returning
  // an empty-looking success.
  if (!parsed.name) throw new ProfileRestrictedError();

  return { sourceUrl: url, ...parsed };
}

export async function fetchProfile(url) {
  const canonical = normalizeProfileUrl(url);
  if (!canonical) throw new Error("Not a valid LinkedIn profile URL");

  const cached = cacheGet(canonical);
  if (cached) return cached;

  const result = await enqueue(() => fetchProfileUncached(canonical));
  cacheSet(canonical, result);
  return result;
}
