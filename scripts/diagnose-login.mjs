/**
 * Drives a real sign-in against the deployed site and reports what happened.
 *
 * A server action cannot be exercised with curl - Next dispatches on a
 * `Next-Action` header that only its own client runtime sets - so the only
 * honest way to test the login is to run a browser at it.
 *
 * The password arrives through the environment and is never echoed. What the
 * script prints is the resulting URL, the HTTP status, and the error digest
 * shown on the page, which is enough to pair with the Worker log.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

if (!BASE || !EMAIL || !PASSWORD) {
  console.error("BASE, EMAIL and PASSWORD are all required.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

const failures = [];
page.on("response", (response) => {
  if (response.status() >= 500) {
    failures.push(`${response.status()} ${response.url()}`);
  }
});
page.on("pageerror", (error) => failures.push(`client: ${String(error)}`));

const report = async (label, index) => {
  const text = await page.textContent("body").catch(() => "");
  const digest = (text.match(/Kode kesalahan:\s*(\S+)/) || [])[1];
  console.log(`${label}: ${page.url()}`);
  if (digest) console.log(`  error page, digest ${digest}`);
  await page.screenshot({ path: `/tmp/shot-${index}.png`, fullPage: false });
  return Boolean(digest);
};

await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
const brokenBefore = await report("login page", 1);

await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await Promise.all([
  page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 })
    .catch(() => {}),
  // Scoped to the form: the sign-out button in the shell is also a submit.
  page.locator('form:has(input[name="password"]) button[type="submit"]')
    .first().click(),
]);
await page.waitForTimeout(3000);
const brokenAfter = await report("after submit", 2);

if (!brokenAfter && !page.url().includes("/admin/login")) {
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await report("dashboard", 3);
}

if (failures.length > 0) {
  console.log("\nfailed responses:");
  for (const failure of failures) console.log(" ", failure);
}

await browser.close();

// A red job is the point when the panel is broken: it makes the run itself the
// record, rather than something a person has to notice inside the log.
if (brokenBefore || brokenAfter || failures.length > 0) process.exit(1);
console.log("\nsign-in completed without an error page.");
