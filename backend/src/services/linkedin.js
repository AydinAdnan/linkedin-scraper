import { voyagerClient } from "../lib/voyagerClient.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { enqueue } from "../lib/queue.js";

export function extractPublicIdentifier(url) {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!match) throw new Error("Not a valid LinkedIn profile URL");
  return match[1];
}

// Voyager responses are a flat `included` array of typed entities linked by
// entityUrn — build a lookup by $type so we can pull out each section
// regardless of ordering.
function groupByType(included = []) {
  const byType = {};
  for (const entity of included) {
    const type = entity.$type;
    if (!type) continue;
    (byType[type] ||= []).push(entity);
  }
  return byType;
}

function resolveImage(picture) {
  const root = picture?.["com.linkedin.common.VectorImage"];
  const artifact = root?.artifacts?.at(-1);
  if (!root || !artifact) return null;
  return `${root.rootUrl}${artifact.fileIdentifyingUrlPathSegment}`;
}

function parseProfileView(raw) {
  const byType = groupByType(raw.included);
  const profile = byType["com.linkedin.voyager.identity.profile.Profile"]?.[0] || {};

  const positions = byType["com.linkedin.voyager.identity.profile.Position"] || [];
  const educations = byType["com.linkedin.voyager.identity.profile.Education"] || [];
  const skills = byType["com.linkedin.voyager.identity.profile.Skill"] || [];
  const certifications = byType["com.linkedin.voyager.identity.profile.Certification"] || [];
  const languages = byType["com.linkedin.voyager.identity.profile.Language"] || [];

  return {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    headline: profile.headline || null,
    location: profile.geoLocationName || profile.locationName || null,
    about: profile.summary || null,
    profileImage: resolveImage(profile.profilePicture),
    bannerImage: resolveImage(profile.backgroundPicture),
    experience: positions.map((p) => ({
      title: p.title || null,
      company: p.companyName || null,
      location: p.locationName || null,
      startDate: p.timePeriod?.startDate || null,
      endDate: p.timePeriod?.endDate || null,
      description: p.description || null,
    })),
    education: educations.map((e) => ({
      school: e.schoolName || null,
      degree: e.degreeName || null,
      field: e.fieldOfStudy || null,
      startDate: e.timePeriod?.startDate || null,
      endDate: e.timePeriod?.endDate || null,
    })),
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
  const { data } = await client.get(`/identity/profiles/${publicId}/profileView`);
  return { sourceUrl: url, ...parseProfileView(data) };
}

export async function fetchProfile(url) {
  const cached = cacheGet(url);
  if (cached) return cached;

  const result = await enqueue(() => fetchProfileUncached(url));
  cacheSet(url, result);
  return result;
}
