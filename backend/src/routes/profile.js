import { fetchProfile } from "../services/linkedin.js";
import { CookiesExpiredError, ProfileNotFoundError, ProfileRestrictedError } from "../lib/voyagerClient.js";
import { normalizeProfileUrl } from "../lib/validateUrl.js";
import { parseBatchInput, MAX_ROWS } from "../lib/parseBatchInput.js";
import { planBatchRows } from "../lib/planBatch.js";
import { config } from "../config.js";

const MAX_CONCURRENT_BATCHES = 3;
let activeBatches = 0;

// Not-found and restricted profiles are dead ends, never worth a retry —
// callers get a distinct code for each so the UI can tell "doesn't exist" /
// "private" apart from a transient fetch failure, and the batch loop just
// moves straight on to the next row.
function errorCode(err) {
  if (err instanceof CookiesExpiredError) return "COOKIES_EXPIRED";
  if (err instanceof ProfileNotFoundError) return "PROFILE_NOT_FOUND";
  if (err instanceof ProfileRestrictedError) return "PROFILE_RESTRICTED";
  return "FETCH_FAILED";
}

function statusFor(code) {
  return { COOKIES_EXPIRED: 401, PROFILE_NOT_FOUND: 404, PROFILE_RESTRICTED: 403 }[code] || 502;
}

// Don't echo raw error internals to callers in production — keep them for
// local debugging, where seeing the real axios/Node error speeds things up.
function safeDetail(err) {
  return config.isProd ? undefined : err.message;
}

// COOKIES_EXPIRED/PROFILE_NOT_FOUND/PROFILE_RESTRICTED are routine, expected
// outcomes — logging them as errors would just be noise. FETCH_FAILED means
// something we didn't anticipate (LinkedIn shape change, network blip, a bug
// in our own parsing) — that's the one worth a full stack trace to diagnose.
function logFetchError(req, err, code, url) {
  if (code === "FETCH_FAILED") {
    req.log.error({ err, url }, "unexpected LinkedIn fetch failure");
  } else {
    req.log.info({ code, url }, "profile fetch skipped");
  }
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
        logFetchError(req, err, code, req.body.url);
        return reply.code(statusFor(code)).send({ error: code, detail: safeDetail(err) });
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
      // Every request already queues behind the same single-lane LinkedIn
      // request queue, so this isn't about LinkedIn load — it caps how many
      // long-lived streaming connections (and pending profile lists) this
      // process holds open at once, so a handful of concurrent batch uploads
      // can't exhaust server memory/file descriptors.
      if (activeBatches >= MAX_CONCURRENT_BATCHES) {
        return reply.code(429).send({ error: "Too many batch requests in progress, try again shortly" });
      }

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

      // reply.hijack() takes this response out of Fastify's normal lifecycle
      // for streaming, which also means its automatic request/response
      // logging never fires — log the batch explicitly instead, or it's
      // invisible in the logs end-to-end.
      req.log.info({ rows: plan.length }, "batch started");
      const tally = { ok: 0, error: 0 };
      const startedAt = Date.now();

      activeBatches++;
      reply.hijack();
      // reply.hijack() bypasses Fastify's whole send pipeline, including the
      // hook @fastify/cors normally uses to add Access-Control-Allow-Origin —
      // without setting it here by hand, the browser receives a real 200 but
      // blocks it from reaching JS ("Failed to fetch"), since it's missing.
      reply.raw.writeHead(200, {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": config.frontendUrl,
        Vary: "Origin",
      });

      try {
        for (const item of plan) {
          if (item.error) {
            tally.error++;
            logFetchError(req, new Error(item.error), item.error, item.raw);
            reply.raw.write(JSON.stringify({ row: item.row, sourceUrl: item.raw, error: item.error }) + "\n");
            continue;
          }
          try {
            const data = await fetchProfile(item.canonical);
            tally.ok++;
            reply.raw.write(JSON.stringify({ row: item.row, ...data }) + "\n");
          } catch (err) {
            tally.error++;
            const code = errorCode(err);
            logFetchError(req, err, code, item.canonical);
            reply.raw.write(
              JSON.stringify({
                row: item.row,
                sourceUrl: item.raw,
                error: code,
                detail: safeDetail(err),
              }) + "\n"
            );
          }
        }
      } finally {
        activeBatches--;
        reply.raw.end();
        req.log.info({ ...tally, durationMs: Date.now() - startedAt }, "batch finished");
      }
    }
  );
}
