# LinkedIn Profile API

Turns a LinkedIn profile URL into structured JSON: name, headline, location,
about, experience, education, skills, certifications, languages, and images.

## Approach

Instead of scraping rendered HTML, the backend talks directly to LinkedIn's
own internal **Voyager API** (`/voyager/api/identity/profiles/{id}/profileView`)
— the same endpoint linkedin.com's frontend calls. Authentication is just the
`li_at` + `JSESSIONID` session cookies from a normal logged-in browser.

A one-time interactive script (`backend/scripts/login.js`) opens a real
Chrome window via Playwright, you log in manually, and it lifts those two
cookies into `backend/.env`. From then on, the API server makes plain HTTPS
requests with those cookies — no headless browser per request, no HTML
parsing, just JSON straight from LinkedIn's own backend.

Voyager's response shape is a flat `included` array of typed entities
(`com.linkedin.voyager.identity.profile.Position`, `...Education`, etc.)
linked by URN rather than nested objects — `backend/src/services/linkedin.js`
groups them by `$type` and reshapes them into the response schema below.

## Project structure

```
backend/   Fastify API — Voyager client, parsing, rate limiting, Docker
frontend/  React UI — chatbar hero, skeleton loading, passport-style results
```

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run login     # opens a browser, log into LinkedIn once
npm run dev        # http://localhost:4000, docs at /docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL if not localhost:4000
npm run dev
```

## API

| Method | Path                | Body                                              | Notes                                    |
|--------|---------------------|----------------------------------------------------|--------------------------------------------|
| GET    | `/health`           | —                                                    |                                              |
| GET    | `/auth/status`      | —                                                    | `{ loggedIn: boolean }`                      |
| POST   | `/api/profile`      | `{ "url": "..." }`                                  | Single profile, JSON response                |
| POST   | `/api/profile/batch`| `{ "urls": [...] }` **or** multipart file upload    | Streams NDJSON, one row per line, in order   |

Full OpenAPI docs served at `/docs` when the backend is running.

### URL validation

Only public profile URLs are accepted: `https://[locale.]linkedin.com/in/{id}`
(e.g. `www.linkedin.com`, `linkedin.com`, `in.linkedin.com`, `uk.linkedin.com`,
...). Anything else — company pages, `/pub/`, feed links, extra path segments
— is rejected. Accepted URLs are canonicalized (host, case, trailing slash,
query params) before dedup/caching, so `in.linkedin.com/in/Foo/?trk=x` and
`www.linkedin.com/in/foo` are treated as the same profile.

### Batch input (`/api/profile/batch`)

- Accepts a JSON `{ "urls": [...] }` body, or a multipart file upload
  (`text/plain` or `text/csv` only, max **1 MB**, max **50 rows**).
- **TXT**: one URL per line.
- **CSV**: looks for a `url`, `profile_url`, or `linkedin_url` column
  (case-insensitive); otherwise falls back to the first column, parsed
  safely including quoted cells.
- Submitted order is preserved. Each row streams back as soon as it's fetched
  (newline-delimited JSON — `Content-Type: application/x-ndjson`), rather
  than waiting for the whole batch.
- Row-level errors, instead of failing the batch: `INVALID_PROFILE_URL`
  (doesn't match the LinkedIn profile pattern) and `DUPLICATE_URL` (same
  canonical profile already seen earlier in the batch — only fetched once).

Rate limited per IP (`RATE_LIMIT_MAX`, default 20/min) and internally queued
with a randomized delay between LinkedIn requests to stay under LinkedIn's
own abuse thresholds. Successful lookups are cached in memory for 1 hour.

## Deployment

- **Backend**: `backend/Dockerfile` — build and deploy to any container host
  (Railway, Fly.io, Render). Set `FRONTEND_URL`, `LI_AT`, `LI_JSESSIONID` as
  env vars in production (never commit `.env`).
- **Frontend**: deploy `frontend/` to Vercel as a static Vite build. Set
  `VITE_API_URL` to the deployed backend URL.

## Known limitations

- Depends on undocumented, unstable LinkedIn internals. Profile data comes
  from `/voyager/api/identity/dash/profiles`, which is versioned server-side
  by a `decorationId` (`PROFILE_DECORATION_ID` env var, default
  `...FullProfileWithEntities-93`) — LinkedIn bumps this periodically, and
  when it changes the endpoint starts rejecting requests. If profile fetches
  start failing, capture the current `decorationId` from a real browser's
  network tab (DevTools → Network → visit any profile → find the
  `identity/dash/profiles` request) and update the env var.
- Field names inside the response can also shift between LinkedIn's rollouts.
  `linkedin.js` matches entity `$type` by substring rather than exact string
  to tolerate renames, and in non-production mode dumps the raw response to
  `backend/debug-last-profile.json` (gitignored) so a broken mapping can be
  diagnosed by diffing the actual payload rather than guessing.
- LinkedIn can redirect a request to a login/checkpoint page even with valid
  cookies if it flags the traffic as automated (repeated calls in a short
  window, headers that don't fully match a real browser, etc). The client
  treats any redirect as a dead session (`COOKIES_EXPIRED`, fails fast)
  instead of looping until "Maximum number of redirects exceeded" — if this
  fires often, space out requests more or re-login.

### Why sessions expire fast, and how to slow that down

A `li_at` cookie is normally long-lived (LinkedIn issues it for ~1 year under
normal browser use). If it's dying within minutes/hours here, that's not
natural expiry — LinkedIn's security system is actively flagging and
revoking the session because the traffic looks automated. This is
fundamentally a cat-and-mouse problem with no permanent fix, but a few things
meaningfully reduce how often it happens:

1. **Client fingerprint must match.** `npm run login` now captures the exact
   `User-Agent` of the browser that created the session (`LI_USER_AGENT` in
   `.env`) and every API request reuses it. Presenting the same cookie from a
   *different-looking* client than the one that logged in is one of the
   strongest bot signals — this was previously broken (hardcoded UA that
   didn't match Playwright's real browser), which likely caused fast
   revocations. Re-run `npm run login` to pick up the fix.
2. **Space requests out.** `REQUEST_DELAY_MS` (default 3000, plus random
   jitter on top) controls the gap between LinkedIn calls. Raise it if you're
   seeing frequent `COOKIES_EXPIRED`/redirect failures — a burst of requests,
   even a few seconds apart, reads as scripted.
3. **Don't run it from multiple places at once.** One login session hit from
   one IP/backend instance at a time; hitting the same cookie from different
   networks in parallel looks like session hijacking to LinkedIn.
4. **Cache does the rest.** Successful lookups are cached for an hour, so
   re-fetching the same profile doesn't cost another LinkedIn request at all.

If a session does get flagged, there's no recovery besides `npm run login`
again — there's no way to "unflag" it from the API side.
- The `li_at` cookie is tied to one LinkedIn account and expires periodically
  (LinkedIn also flags unusual usage patterns); re-run `npm run login` when
  `/auth/status` reports `loggedIn: false` or requests start 401ing.
- Only public-facing profile fields available to the logged-in account are
  returned — private/restricted sections LinkedIn hides from that account
  won't appear.
- Batch requests are capped at 50 URLs per call and processed sequentially
  (by design, to avoid tripping LinkedIn's rate limiting).
- This project accesses LinkedIn's non-public API surface using a personal
  account's session; it's built for this assignment/demo context, not
  large-scale or commercial scraping, and using it beyond that may violate
  LinkedIn's Terms of Service.
