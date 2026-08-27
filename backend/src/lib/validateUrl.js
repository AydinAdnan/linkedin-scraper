// Only accept public profile URLs: https://<optional 2-letter locale>.linkedin.com/in/{id}
// Rejects everything else (company pages, /pub/, feed links, search URLs, etc).
const HOST_RE = /^(?:[a-z]{2}\.)?(?:www\.)?linkedin\.com$/i;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,99}$/i;

export function normalizeProfileUrl(input) {
  let parsed;
  try {
    parsed = new URL(String(input).trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!HOST_RE.test(parsed.hostname)) return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0].toLowerCase() !== "in") return null;

  const id = segments[1];
  if (!ID_RE.test(id)) return null;

  return `https://www.linkedin.com/in/${id.toLowerCase()}`;
}
