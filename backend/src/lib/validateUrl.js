// Accepts public profile (/in/{id}) and company (/company/{id}) URLs.
// Rejects everything else (/pub/, feed links, search URLs, jobs, etc).
const HOST_RE = /^(?:[a-z]{2}\.)?(?:www\.)?linkedin\.com$/i;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,99}$/i;

// Returns { type: 'profile' | 'company', canonical } or null. Company URLs
// often have trailing sections (`/company/acme/about/`, `/jobs/`) — only the
// `/company/{id}` prefix matters, the rest is discarded during canonicalization.
export function normalizeLinkedInUrl(input) {
  let parsed;
  try {
    parsed = new URL(String(input).trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!HOST_RE.test(parsed.hostname)) return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [kind, id] = segments;
  if (!ID_RE.test(id)) return null;

  if (kind.toLowerCase() === "in" && segments.length === 2) {
    return { type: "profile", canonical: `https://www.linkedin.com/in/${id.toLowerCase()}` };
  }
  if (kind.toLowerCase() === "company") {
    return { type: "company", canonical: `https://www.linkedin.com/company/${id.toLowerCase()}` };
  }
  return null;
}

// Kept for call sites that only ever deal with profiles.
export function normalizeProfileUrl(input) {
  const result = normalizeLinkedInUrl(input);
  return result?.type === "profile" ? result.canonical : null;
}
