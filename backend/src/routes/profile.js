import { fetchProfile } from "../services/linkedin.js";
import { CookiesExpiredError } from "../lib/voyagerClient.js";

const urlSchema = { type: "string", pattern: "linkedin\\.com/in/" };

export default async function profileRoutes(app) {
  app.post(
    "/api/profile",
    {
      schema: {
        description: "Fetch a single LinkedIn profile as structured JSON",
        body: {
          type: "object",
          required: ["url"],
          properties: { url: urlSchema },
        },
      },
    },
    async (req, reply) => {
      try {
        return await fetchProfile(req.body.url);
      } catch (err) {
        return handleError(err, req, reply);
      }
    }
  );

  app.post(
    "/api/profile/batch",
    {
      schema: {
        description: "Fetch multiple LinkedIn profiles (from CSV/TXT upload)",
        body: {
          type: "object",
          required: ["urls"],
          properties: { urls: { type: "array", items: urlSchema, minItems: 1, maxItems: 50 } },
        },
      },
    },
    async (req, reply) => {
      const results = [];
      for (const url of req.body.urls) {
        try {
          results.push(await fetchProfile(url));
        } catch (err) {
          results.push({ sourceUrl: url, error: err.message });
        }
      }
      return results;
    }
  );

  function handleError(err, req, reply) {
    if (err instanceof CookiesExpiredError) {
      return reply.code(401).send({ error: err.message });
    }
    req.log?.error(err);
    return reply.code(502).send({ error: "Could not fetch profile", detail: err.message });
  }
}
