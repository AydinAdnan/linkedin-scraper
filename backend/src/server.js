import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import { MAX_FILE_BYTES } from "./lib/parseBatchInput.js";

// Deployed behind a reverse proxy (Railway/Fly/etc) — without this every
// request looks like it comes from the proxy's IP and per-IP rate limiting
// is meaningless.
const app = Fastify({ logger: true, trustProxy: true });

await app.register(helmet);
await app.register(cors, { origin: config.frontendUrl });
await app.register(multipart, { limits: { fileSize: MAX_FILE_BYTES } });
await app.register(rateLimit, { max: config.rateLimitMax, timeWindow: "1 minute" });
await app.register(swagger, {
  openapi: {
    info: { title: "LinkedIn Profile API", version: "1.0.0" },
    components: { securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "x-api-key" } } },
  },
});
await app.register(swaggerUi, { routePrefix: "/docs" });

// Gate the actual LinkedIn-fetching endpoints behind an API key when one is
// configured. Without this, anyone who finds the deployed URL can spend your
// LinkedIn session's request budget and accelerate it getting flagged.
app.addHook("onRequest", async (req, reply) => {
  if (!config.apiKey || !req.url.startsWith("/api/")) return;
  if (req.headers["x-api-key"] !== config.apiKey) {
    reply.code(401).send({ error: "Missing or invalid x-api-key" });
  }
});

app.get(
  "/health",
  { schema: { response: { 200: { type: "object", properties: { ok: { type: "boolean" } } } } } },
  async () => ({ ok: true })
);
app.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger());
await app.register(authRoutes);
await app.register(profileRoutes);

// Catches anything a route handler didn't (bad JSON, schema mismatches, an
// unhandled throw) instead of Fastify's default opaque 500 — logs the real
// error server-side and only echoes internals back when not in production.
app.setErrorHandler((err, req, reply) => {
  req.log.error({ err }, "unhandled route error");
  reply.code(err.statusCode || 500).send({
    error: "INTERNAL_ERROR",
    detail: config.isProd ? undefined : err.message,
  });
});

// Without these, a bug that throws outside a request handler (a stray
// promise rejection, a timer callback) crashes the process with just a raw
// stack trace on stderr — log it through the same structured logger first.
process.on("unhandledRejection", (err) => app.log.error({ err }, "unhandled promise rejection"));
process.on("uncaughtException", (err) => {
  app.log.fatal({ err }, "uncaught exception, shutting down");
  process.exit(1);
});

app.listen({ port: config.port, host: "0.0.0.0" });
