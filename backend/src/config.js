import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 4000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  liAt: process.env.LI_AT || "",
  jsessionid: process.env.LI_JSESSIONID || "",
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 20,
  // LinkedIn versions this decoration on the server side and bumps the
  // suffix periodically — if profile fetches start 400ing, capture the
  // current value from a real browser session's network tab and update here.
  profileDecorationId:
    process.env.PROFILE_DECORATION_ID ||
    "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93",
};
