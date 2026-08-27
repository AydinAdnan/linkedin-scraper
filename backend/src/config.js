import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 4000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  liAt: process.env.LI_AT || "",
  jsessionid: process.env.LI_JSESSIONID || "",
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 20,
};
