import { parseCsv } from "./csv.js";

export const MAX_FILE_BYTES = 1024 * 1024; // 1 MB
export const MAX_ROWS = 50;
const URL_COLUMNS = ["url", "profile_url", "linkedin_url"];

export class BatchInputError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

// Accepts either one URL per line, or comma-separated URLs (LinkedIn URLs
// never contain commas, so splitting on either delimiter is unambiguous).
function fromTxt(text) {
  return text
    .split(/[\r\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function fromCsv(text) {
  const rows = parseCsv(text).filter((r) => r.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const namedIndex = header.findIndex((h) => URL_COLUMNS.includes(h));

  if (namedIndex !== -1) {
    return rows.slice(1).map((r) => (r[namedIndex] || "").trim()).filter(Boolean);
  }

  // No recognized header column. If the first row's first cell already looks
  // like a URL, there's no header at all — use every row. Otherwise assume
  // row 0 is a header with an unrecognized name and skip it.
  const firstRowIsData = (rows[0][0] || "").includes("linkedin.com");
  const dataRows = firstRowIsData ? rows : rows.slice(1);

  return dataRows.map((r) => (r[0] || "").trim()).filter(Boolean);
}

// Returns raw URL strings in submitted order (1 entry per input row).
export function parseBatchInput(buffer, mimetype) {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new BatchInputError("File exceeds the 1 MB limit");
  }

  const text = buffer.toString("utf8");
  let entries;
  if (mimetype === "text/plain") {
    entries = fromTxt(text);
  } else if (mimetype === "text/csv") {
    entries = fromCsv(text);
  } else {
    throw new BatchInputError("Only text/plain and text/csv files are accepted");
  }

  if (entries.length > MAX_ROWS) {
    throw new BatchInputError(`Batch limited to ${MAX_ROWS} rows, got ${entries.length}`);
  }

  return entries;
}
