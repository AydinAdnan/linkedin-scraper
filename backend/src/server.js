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
await app.register(swagger, { openapi: { info: { title: "LinkedIn Profile API", version: "1.0.0" } } });
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

app.get("/health", async () => ({ ok: true }));
await app.register(authRoutes);
await app.register(profileRoutes);

app.listen({ port: config.port, host: "0.0.0.0" });
