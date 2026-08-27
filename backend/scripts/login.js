// One-time interactive login: opens a real Chrome window, you log into LinkedIn
// yourself, then we lift the session cookies LinkedIn's own frontend uses
// (li_at + JSESSIONID) and write them into .env. Run with `npm run login`.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto("https://www.linkedin.com/login");

console.log("Log in to LinkedIn in the opened window. Waiting for feed to load...");
await page.waitForURL("https://www.linkedin.com/feed/**", { timeout: 0 });

const cookies = await context.cookies();
const liAt = cookies.find((c) => c.name === "li_at")?.value;
const jsessionid = cookies.find((c) => c.name === "JSESSIONID")?.value?.replaceAll('"', "");
// LinkedIn ties a session to the client that created it. If the backend later
// makes API calls with a different User-Agent than the browser that logged
// in, that mismatch alone is a strong bot signal — so capture the real one
// and reuse it for every request instead of hardcoding a guess.
const userAgent = await page.evaluate(() => navigator.userAgent);

if (!liAt || !jsessionid) {
  console.error("Could not find li_at / JSESSIONID cookies. Try again.");
  await browser.close();
  process.exit(1);
}

let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const setVar = (contents, key, value) => {
  const line = `${key}=${value}`;
  return contents.match(new RegExp(`^${key}=.*$`, "m"))
    ? contents.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : `${contents.trim()}\n${line}\n`;
};
env = setVar(env, "LI_AT", liAt);
env = setVar(env, "LI_JSESSIONID", jsessionid);
env = setVar(env, "LI_USER_AGENT", `"${userAgent}"`);
writeFileSync(envPath, env);

console.log("Saved LI_AT and LI_JSESSIONID to .env");
await browser.close();
