import { fetchProfile } from "../services/linkedin.js";
import { CookiesExpiredError } from "../lib/voyagerClient.js";
import { normalizeProfileUrl } from "../lib/validateUrl.js";
import { parseBatchInput, MAX_ROWS } from "../lib/parseBatchInput.js";
import { planBatchRows } from "../lib/planBatch.js";

function errorCode(err) {
  return err instanceof CookiesExpiredError ? "COOKIES_EXPIRED" : "FETCH_FAILED";
}

export default async function profileRoutes(app) {
  app.post(
    "/api/profile",
    {
      schema: {
        description: "Fetch a single LinkedIn profile as structured JSON",
        body: {
          type: "object",
          required: ["url"],
          properties: { url: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      if (!normalizeProfileUrl(req.body.url)) {
        return reply.code(400).send({ error: "INVALID_PROFILE_URL" });
      }
      try {
        return await fetchProfile(req.body.url);
      } catch (err) {
        const code = errorCode(err);
        return reply.code(code === "COOKIES_EXPIRED" ? 401 : 502).send({ error: code, detail: err.message });
      }
    }
  );

  // Accepts either a JSON { urls: [] } body or a multipart text/plain|text/csv
  // file upload. Streams results back as newline-delimited JSON, one row at a
  // time, in submitted order, so the UI can render profiles as they arrive.
  app.post(
    "/api/profile/batch",
    {
      schema: {
        description: "Fetch a batch of LinkedIn profiles (JSON array or CSV/TXT file upload)",
      },
    },
    async (req, reply) => {
      let rawEntries;

      if (req.isMultipart()) {
        const file = await req.file();
        if (!file) return reply.code(400).send({ error: "No file uploaded" });
        const buffer = await file.toBuffer();
        try {
          rawEntries = parseBatchInput(buffer, file.mimetype);
        } catch (err) {
          return reply.code(400).send({ error: err.message });
        }
      } else {
        const urls = req.body?.urls;
        if (!Array.isArray(urls) || urls.length === 0) {
          return reply.code(400).send({ error: "Provide a non-empty `urls` array or a file upload" });
        }
        if (urls.length > MAX_ROWS) {
          return reply.code(400).send({ error: `Batch limited to ${MAX_ROWS} rows, got ${urls.length}` });
        }
        rawEntries = urls;
      }

      const plan = planBatchRows(rawEntries);

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      });

      for (const item of plan) {
        if (item.error) {
          reply.raw.write(JSON.stringify({ row: item.row, sourceUrl: item.raw, error: item.error }) + "\n");
          continue;
        }
        try {
          const data = await fetchProfile(item.canonical);
          reply.raw.write(JSON.stringify({ row: item.row, ...data }) + "\n");
        } catch (err) {
          reply.raw.write(
            JSON.stringify({ row: item.row, sourceUrl: item.raw, error: errorCode(err), detail: err.message }) + "\n"
          );
        }
      }
      reply.raw.end();
    }
  );
}
