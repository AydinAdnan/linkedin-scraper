import path from "path";
import { fileURLToPath } from "url";
import { voyagerClient } from "../lib/voyagerClient.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { enqueue } from "../lib/queue.js";
import { normalizeProfileUrl } from "../lib/validateUrl.js";
import { entitiesMatching, resolveImage, dateRange, dumpDebug, classifyMissing } from "../lib/voyagerEntities.js";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function extractPublicIdentifier(url) {
  const canonical = normalizeProfileUrl(url);
  if (!canonical) throw new Error("Not a valid LinkedIn profile URL");
  return canonical.split("/in/")[1];
}

function findProfile(included) {
  return (
    included.find((e) => typeof e.$type === "string" && e.$type.includes("Profile") && e.firstName) || {}
  );
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

  await dumpDebug(path.join(__dirname, "..", "..", "debug-last-profile.json"), data);

  const parsed = parseProfileView(data);
  if (!parsed.name) throw classifyMissing(data);

  return { sourceUrl: url, type: "profile", ...parsed };
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
