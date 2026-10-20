/*
 * tools/audit/a11y.mjs — the accessibility audit.
 *
 *   node tools/audit/a11y.mjs [--only census-pwa] [--json]
 *
 * Loads every project in this repository over the DevTools Protocol and
 * checks it in the browser, because that is the only place the real
 * computed styles live. The checks live in tools/audit/page-audit.js and
 * are evaluated inside the page.
 *
 * No dependencies, and no browser is not a failure: the script prints SKIP
 * and exits 0, because it must never be the reason a build goes red.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "../cdp.mjs";
import { serve } from "./serve.mjs";
import { writeReport } from "./report.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

/* The pages to audit: every top-level folder that ships an index.html, plus
   the portfolio's own pages. bucio and new-star-soccer build with a
   bundler, so their pages do not run from the repository root; they are
   audited from the repository root anyway, which serves their unbuilt
   index.html. */
function projects() {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    if (existsSync(join(root, entry.name, "index.html"))) out.push(entry.name);
  }
  return out.sort();
}

/* The pages that are not a project folder but are still pages. */
const EXTRA_PAGES = [
  { name: "portfolio/cv.html", path: "/portfolio/cv.html" },
  { name: "portfolio/verify.html", path: "/portfolio/verify.html" },
  { name: "portfolio/notes/", path: "/portfolio/notes/" },
  { name: "portfolio/notes/corpus.html", path: "/portfolio/notes/corpus.html" },
  { name: "portfolio/notes/copy.html", path: "/portfolio/notes/copy.html" },
  { name: "portfolio/notes/audit.html", path: "/portfolio/notes/audit.html" },
  { name: "portfolio/now.html", path: "/portfolio/now.html" },
];

const PAGES = [
  ...projects().map((name) => ({ name, path: `/${name}/` })),
  ...EXTRA_PAGES,
];

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const bin = (await import("../cdp.mjs")).findChromium();
if (!bin) {
  console.log("SKIP  no Chromium found (set CHROMIUM_PATH to point at one)");
  process.exit(0);
}

const server = await serve(root);
const browser = await launch({ bin });
if (!browser) {
  console.log("SKIP  no Chromium found (set CHROMIUM_PATH to point at one)");
  await server.close();
  process.exit(0);
}

const { cdp, sessionId } = browser;
await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);

const source = readFileSync(join(here, "page-audit.js"), "utf8");

const apps = [];
for (const page of PAGES) {
  const name = page.name;
  const path = page.path;
  if (only && name !== only) continue;
  try {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
    }, sessionId);

    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: server.url + path }, sessionId);
    await Promise.race([loaded, sleep(12000)]);
    /* Give the page a moment to draw: the checks read computed styles and
       a canvas that has not painted has no size yet. */
    await sleep(900);

    const res = await cdp.send("Runtime.evaluate", {
      expression: source,
      returnByValue: true,
    }, sessionId);
    const report = JSON.parse(res.result.value);
    apps.push({ name, path, ...report });
    const total = Object.keys(report).filter((k) => Array.isArray(report[k])).reduce((n, k) => n + report[k].length, 0);
    console.log(`  ${String(total).padStart(4)}  ${name}`);
  } catch (err) {
    console.log(`  FAIL  ${name}  ${err.message}`);
    apps.push({ name, path, error: err.message, findings: {} });
  }
}

cdp.close();
browser.close();
await server.close();

/* Sorted, so the report does not depend on the order the browser happened
   to answer in. */
const RULE_KEYS = ["alt", "names", "labels", "contrast", "targets", "headings",
                   "live", "ids", "focus", "inlineLang"];

const sorted = {
  apps: apps.map((a) => ({
    name: a.name,
    path: a.path,
    lang: a.lang || "MISSING",
    manual: a.manual || 0,
    checked: a.checked || 0,
    error: a.error || null,
    findings: Object.fromEntries(RULE_KEYS.map((k) => [k, a[k] || []])),
  })).sort((a, b) => a.name.localeCompare(b.name)),
};

const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "a11y.json"), JSON.stringify(sorted, null, 2));

const perfPath = join(outDir, "perf.json");
const perf = existsSync(perfPath) ? JSON.parse(readFileSync(perfPath, "utf8")) : null;
writeReport({ a11y: sorted, perf }, join(root, "portfolio/audit/report.html"));

const findings = sorted.apps.reduce((n, a) =>
  n + Object.values(a.findings).reduce((m, v) => m + v.length, 0), 0);
console.log(`\n${sorted.apps.length} apps · ${findings} findings → portfolio/audit/report.html`);
process.exit(0);
