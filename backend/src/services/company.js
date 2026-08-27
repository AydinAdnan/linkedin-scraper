import path from "path";
import { fileURLToPath } from "url";
import { voyagerClient } from "../lib/voyagerClient.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { enqueue } from "../lib/queue.js";
import { normalizeLinkedInUrl } from "../lib/validateUrl.js";
import { resolveImage, dumpDebug, classifyMissing } from "../lib/voyagerEntities.js";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function extractUniversalName(url) {
  const parsed = normalizeLinkedInUrl(url);
  if (!parsed || parsed.type !== "company") throw new Error("Not a valid LinkedIn company URL");
  return parsed.canonical.split("/company/")[1];
}

function findCompany(included) {
  return included.find((e) => typeof e.$type === "string" && e.$type.includes("Company") && e.name) || {};
}

function findFollowerCount(included) {
  // Follower count lives on a separate FollowingInfo entity, not the company itself.
  const info = included.find((e) => typeof e.$type === "string" && e.$type.includes("FollowingInfo"));
  return info?.followerCount ?? null;
}

// Company schema is genuinely different from a profile's — no positions,
// education, skills. Verified against a real response (LinkedIn's own
// company page) rather than guessed: `industries` is a plain string array,
// `headquarter` is a flat address, logos/cover photos use their own image
// shape (handled generically in resolveImage), and follower count comes
// from a sibling FollowingInfo entity.
function parseCompany(raw) {
  const included = raw.included || [];
  const company = findCompany(included);

  const headquarters = company.headquarter
    ? [company.headquarter.city, company.headquarter.geographicArea, company.headquarter.country]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    name: company.name || null,
    universalName: company.universalName || null,
    tagline: company.tagline || null,
    about: company.description || null,
    industry: company.industries?.[0] || null,
    staffCount: company.staffCount ?? null,
    headquarters,
    // No general "company website" field is exposed without a specific
    // (unverified) decorationId — this is LinkedIn's own "Learn more" call-
    // to-action link, the closest thing available in the default response.
    website: company.callToAction?.url || null,
    founded: company.foundedOn?.year || null,
    followerCount: findFollowerCount(included),
    specialties: company.specialities || [],
    logo: resolveImage(company.logo),
    coverImage: resolveImage(company.backgroundCoverPhoto),
  };
}

async function fetchCompanyUncached(url) {
  const universalName = extractUniversalName(url);
  const client = voyagerClient();
  const { data } = await client.get("/organization/companies", {
    params: {
      q: "universalName",
      universalName,
      // Omitting decorationId entirely gets a usable default company
      // decoration — a specific decorationId (COMPANY_DECORATION_ID env var)
      // could fetch richer data but hasn't been verified, so it's opt-in.
      ...(config.companyDecorationId ? { decorationId: config.companyDecorationId } : {}),
    },
    headers: {
      referer: `https://www.linkedin.com/company/${universalName}/`,
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-fetch-dest": "empty",
    },
  });

  await dumpDebug(path.join(__dirname, "..", "..", "debug-last-company.json"), data);

  const parsed = parseCompany(data);
  if (!parsed.name) throw classifyMissing(data);

  return { sourceUrl: url, type: "company", ...parsed };
}

export async function fetchCompany(url) {
  const parsed = normalizeLinkedInUrl(url);
  if (!parsed || parsed.type !== "company") throw new Error("Not a valid LinkedIn company URL");

  const cached = cacheGet(parsed.canonical);
  if (cached) return cached;

  const result = await enqueue(() => fetchCompanyUncached(parsed.canonical));
  cacheSet(parsed.canonical, result);
  return result;
}
