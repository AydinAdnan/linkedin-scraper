import "dotenv/config";

export const config = {
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 4000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  // If set, every /api/* request must send this in x-api-key. Without it the
  // API is open to the internet and anyone can burn your LinkedIn session —
  // set this before deploying anywhere public.
  apiKey: process.env.API_KEY || "",
  liAt: process.env.LI_AT || "",
  jsessionid: process.env.LI_JSESSIONID || "",
  // Must match the browser `npm run login` actually used — LinkedIn treats a
  // session cookie presented by a different-looking client as a bot signal.
  userAgent:
    process.env.LI_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  // Base delay between LinkedIn requests, in ms — spacing calls out further
  // makes the traffic look less scripted. Random jitter is added on top.
  requestDelayMs: Number(process.env.REQUEST_DELAY_MS) || 3000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 20,
  // LinkedIn versions this decoration on the server side and bumps the
  // suffix periodically — if profile fetches start 400ing, capture the
  // current value from a real browser session's network tab and update here.
  profileDecorationId:
    process.env.PROFILE_DECORATION_ID ||
    "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93",
};
