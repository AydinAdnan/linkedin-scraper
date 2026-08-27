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

export function voyagerClient() {
  if (!config.liAt || !config.jsessionid) {
    throw new CookiesExpiredError();
  }

  const client = axios.create({
    baseURL: "https://www.linkedin.com/voyager/api",
    headers: {
      cookie: `li_at=${config.liAt}; JSESSIONID="${config.jsessionid}"`,
      "csrf-token": config.jsessionid,
      "x-restli-protocol-version": "2.0.0",
      "x-li-lang": "en_US",
      accept: "application/vnd.linkedin.normalized+json+2.1",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
    },
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401 || err.response?.status === 999) {
        throw new CookiesExpiredError();
      }
      throw err;
    }
  );

  return client;
}
