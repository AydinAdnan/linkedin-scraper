import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: config.frontendUrl });
await app.register(rateLimit, { max: config.rateLimitMax, timeWindow: "1 minute" });
await app.register(swagger, { openapi: { info: { title: "LinkedIn Profile API", version: "1.0.0" } } });
await app.register(swaggerUi, { routePrefix: "/docs" });

app.get("/health", async () => ({ ok: true }));
await app.register(authRoutes);
await app.register(profileRoutes);

app.listen({ port: config.port, host: "0.0.0.0" });
