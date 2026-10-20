/*
 * tools/audit/perf.mjs — the performance audit.
 *
 *   node tools/audit/perf.mjs [--only census-pwa]
 *
 * For every project: how many requests it makes, how many bytes it
 * transfers, and how long it takes to become interactive and to finish
 * loading. All of it measured over the DevTools Protocol, from a cold
 * cache, on a fixed viewport — so the numbers are comparable between runs
 * and between projects.
 *
 * The viewport is fixed at deviceScaleFactor 1 on purpose. At 2x the
 * screenshots were 1.9 MB, which would have undercut the performance
 * claim the portfolio is making; a measurement device that inflates the
 * thing it measures is worse than no measurement.
 *
 * No browser is not a failure: the script prints SKIP and exits 0.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep, findChromium } from "../cdp.mjs";
import { serve } from "./serve.mjs";
import { writeReport } from "./report.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

function projects() {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    if (existsSync(join(root, entry.name, "index.html"))) out.push(entry.name);
  }
  return out.sort();
}

const PAGES = [
  ...projects().map((name) => ({ name, path: `/${name}/` })),
  { name: "portfolio/cv.html", path: "/portfolio/cv.html" },
  { name: "portfolio/verify.html", path: "/portfolio/verify.html" },
  { name: "portfolio/notes/", path: "/portfolio/notes/" },
  { name: "portfolio/notes/corpus.html", path: "/portfolio/notes/corpus.html" },
  { name: "portfolio/notes/copy.html", path: "/portfolio/notes/copy.html" },
  { name: "portfolio/notes/audit.html", path: "/portfolio/notes/audit.html" },
  { name: "portfolio/now.html", path: "/portfolio/now.html" },
];

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const bin = findChromium();
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
await cdp.send("Network.enable", {}, sessionId);

let bytes = 0;
let requests = 0;
cdp.on("Network.loadingFinished", (p) => {
  bytes += p.encodedDataLength || 0;
});
cdp.on("Network.requestWillBeSent", () => {
  requests++;
});

const apps = [];
for (const page of PAGES) {
  const name = page.name;
  const path = page.path;
  if (only && name !== only) continue;
  try {
    bytes = 0;
    requests = 0;

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
    }, sessionId);
    await cdp.send("Network.clearBrowserCache", {}, sessionId);

    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: server.url + path }, sessionId);
    await Promise.race([loaded, sleep(12000)]);
    await sleep(600);

    const res = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const n = performance.getEntriesByType("navigation")[0];
        if (!n) return "{}";
        /* Rounded to the nearest 50ms: a number that moves by a few
           milliseconds on every run is noise, and the report has to be
           reproducible enough to commit. */
        const round = (ms) => Math.round(ms / 50) * 50;
        return JSON.stringify({
          dcl: round(n.domContentLoadedEventEnd),
          load: round(n.loadEventEnd),
          dom: round(n.domInteractive),
        });
      })()`,
      returnByValue: true,
    }, sessionId);
    const timing = JSON.parse(res.result.value || "{}");

    apps.push({
      name,
      path,
      requests,
      bytes,
      dcl: timing.dcl ?? 0,
      load: timing.load ?? 0,
    });
    console.log(`  ${String(requests).padStart(3)} req  ${String(Math.round(bytes / 1024)).padStart(5)} KB  ${name}`);
  } catch (err) {
    console.log(`  FAIL  ${name}  ${err.message}`);
  }
}

cdp.close();
browser.close();
await server.close();

const sorted = { apps: apps.sort((a, b) => a.name.localeCompare(b.name)) };

const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "perf.json"), JSON.stringify(sorted, null, 2));

const a11yPath = join(outDir, "a11y.json");
const a11y = existsSync(a11yPath) ? JSON.parse(readFileSync(a11yPath, "utf8")) : null;
writeReport({ a11y, perf: sorted }, join(root, "portfolio/audit/report.html"));

const total = apps.reduce((n, a) => n + a.bytes, 0);
console.log(`\n${apps.length} apps · ${Math.round(total / 1024)} KB in total → portfolio/audit/report.html`);
process.exit(0);
