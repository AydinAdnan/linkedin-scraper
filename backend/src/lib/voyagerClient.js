// Thin client for LinkedIn's internal Voyager API — the same endpoints
// linkedin.com's own frontend calls, authenticated via the li_at session
// cookie. This is the "reverse engineered API" the challenge asks for:
// no HTML scraping, just structured JSON straight from LinkedIn.
import axios from "axios";
import { config } from "../config.js";

export class CookiesExpiredError extends Error {
  constructor() {
    super("LinkedIn session expired — run `npm run login` to refresh cookies.");
    this.statusCode = 401;
  }
}

// Member genuinely doesn't exist / URL is dead — never worth retrying.
export class ProfileNotFoundError extends Error {
  constructor() {
    super("No LinkedIn profile exists at this URL.");
    this.statusCode = 404;
  }
}

// Profile exists but its data isn't visible to this account (private,
// out-of-network restricted, memorialized, etc) — also never worth retrying.
export class ProfileRestrictedError extends Error {
  constructor() {
    super("This profile's details aren't visible to the logged-in account.");
    this.statusCode = 403;
  }
}

export function voyagerClient() {
  if (!config.liAt || !config.jsessionid) {
    throw new CookiesExpiredError();
  }

  const client = axios.create({
    baseURL: "https://www.linkedin.com/voyager/api",
    // Don't blindly follow redirects — LinkedIn bounces flagged/expired
    // sessions to a login or checkpoint page, and axios would otherwise loop
    // until "Maximum number of redirects exceeded" burns 10+ seconds with no
    // useful error. Treat any redirect as a dead session instead.
    maxRedirects: 0,
    validateStatus: (status) => status < 300,
    // Don't hang a queued request (and everything behind it) forever if
    // LinkedIn stalls instead of responding or redirecting.
    timeout: 15000,
    headers: {
      cookie: `li_at=${config.liAt}; JSESSIONID="${config.jsessionid}"`,
      "csrf-token": config.jsessionid,
      "x-restli-protocol-version": "2.0.0",
      "x-li-lang": "en_US",
      accept: "application/vnd.linkedin.normalized+json+2.1",
      "user-agent": config.userAgent,
    },
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err.response?.status;
      if (status === 401 || status === 999 || (status >= 300 && status < 400)) {
        throw new CookiesExpiredError();
      }
      if (status === 404) throw new ProfileNotFoundError();
      if (status === 403) throw new ProfileRestrictedError();
      throw err;
    }
  );

  return client;
}
