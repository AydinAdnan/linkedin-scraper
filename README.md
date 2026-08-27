# LinkedIn Profile API

Turns a LinkedIn profile URL into structured JSON (name, headline, location,
about, experience, education, skills, certifications, languages, images).

- `backend/` — Fastify API
- `frontend/` — React UI

## Setup

**Backend**
- `cd backend && npm install`
- `cp .env.example .env`
- `npm run login` — opens a Chrome window, log into LinkedIn once, cookies get saved to `.env`
- `npm run dev` — runs on `http://localhost:4000`

**Frontend**
- `cd frontend && npm install`
- `cp .env.example .env`
- `npm run dev` — runs on `http://localhost:5173`

**Getting/refreshing login credentials**
- Run `npm run login` any time `/auth/status` reports `loggedIn: false`, or requests start returning `COOKIES_EXPIRED`.
- It writes `LI_AT`, `LI_JSESSIONID`, `LI_USER_AGENT` into `backend/.env`.
- **Restart the backend afterward** — env vars only load at process start, `npm run dev`'s file-watcher does not pick up `.env` changes.

## API

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/health` | — | liveness check |
| GET | `/openapi.json` | — | raw OpenAPI 3 spec |
| GET | `/docs` | — | Swagger UI |
| GET | `/auth/status` | — | `{ loggedIn: boolean }` |
| POST | `/api/profile` | `{ "url": "..." }` | single profile |
| POST | `/api/profile/batch` | `{ "urls": [...] }` **or** multipart file | streams NDJSON, one row per line |

- Accepted URLs: `https://[locale.]linkedin.com/in/{id}` only (e.g. `www.`, `in.`, `uk.` — company pages/other paths rejected).
- Batch file: `.txt` (one URL/line) or `.csv` (`url`/`profile_url`/`linkedin_url` column, or first column) — max 1 MB, max 50 rows.
- Row-level errors instead of failing the batch: `INVALID_PROFILE_URL`, `DUPLICATE_URL`, `COOKIES_EXPIRED`, `FETCH_FAILED`.
- All `/api/*` routes require an `x-api-key` header if `API_KEY` is set.

## Approach

- No HTML scraping — calls LinkedIn's own internal Voyager API (`/voyager/api/identity/dash/profiles`) with the session cookies a normal browser login produces.
- One-time Playwright login script lifts `li_at`/`JSESSIONID`/User-Agent from a real browser session into `.env`.
- Requests are queued one-at-a-time with randomized delay, and cached for an hour, to reduce load on LinkedIn and avoid tripping its bot detection.
- Entity parsing matches LinkedIn's response `$type` fields by substring (not exact match) so it tolerates LinkedIn renaming fields between rollouts.

## Deployment

**Railway (backend) env vars**
- `LI_AT`, `LI_JSESSIONID`, `LI_USER_AGENT` — from `npm run login` (run locally, see below)
- `API_KEY` — see "Generating a secret key"
- `FRONTEND_URL` — your deployed Vercel URL
- `PORT` — Railway sets this automatically, no action needed
- Optional: `RATE_LIMIT_MAX`, `REQUEST_DELAY_MS`, `PROFILE_DECORATION_ID`

**Vercel (frontend) env vars**
- `VITE_API_URL` — your deployed Railway URL
- `VITE_API_KEY` — must match backend's `API_KEY`

**Generating a secret key for `API_KEY`**
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the output into both Railway's `API_KEY` and Vercel's `VITE_API_KEY`.

**Using your own LinkedIn login in production**
- `npm run login` opens a real browser window — it can't run inside Railway's container (no display, and LinkedIn would likely challenge a headless/server login anyway).
- Run it **locally** instead, then copy the three values it writes (`LI_AT`, `LI_JSESSIONID`, `LI_USER_AGENT`) into Railway's env vars by hand.
- From then on, every API call — from anyone hitting the deployed URL — is made using your LinkedIn account's session. There's no per-user login; it's one shared account behind the API.
- When that session gets flagged/expires, repeat: log in locally again, update the three Railway env vars, redeploy/restart.

## Known limitations

- LinkedIn session (`li_at`) can get flagged and expire well before its normal ~1yr lifetime if traffic looks automated — expect to re-run `npm run login` periodically.
- Rate limited by design (`RATE_LIMIT_MAX`/min per IP, 1 request in flight to LinkedIn at a time, max 3 concurrent batch uploads) — this is intentional, not a bug, to avoid getting the account banned.
- Depends on undocumented LinkedIn internals (`decorationId`, entity field names) that can change without notice.
- One shared LinkedIn account behind the API — no per-user LinkedIn login, no multi-account support.
- `API_KEY` shipped to a public frontend bundle deters casual abuse but isn't a true secret against someone inspecting the frontend's network calls.
- Only fields visible to the logged-in account are returned; private/restricted profile sections are omitted.
- Batch capped at 50 rows / 1 MB per request.
