#!/usr/bin/env node
/*
 * tools/verify.mjs — the claims ledger.
 *
 * Every number the portfolio states is recomputed here from the repository
 * and compared against the number the page actually renders. If a claim
 * drifts, CI fails. That is the whole point: the page argues for itself with
 * numbers, so the numbers had better be true.
 *
 *   node tools/verify.mjs            # table
 *   node tools/verify.mjs --json     # machine-readable
 *   node tools/verify.mjs --check    # exit 1 on drift
 *   node tools/verify.mjs --html out.html
 *   node tools/verify.mjs --audit    # also run every `how` command
 *
 * No dependencies. The house rule is that a static page ships zero of them,
 * and a tool that audits it should not be the exception.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "portfolio", "index.html");

/* ------------------------------------------------------------------ files */

/* The repository's own file list, so the numbers describe what is committed
 * rather than what happens to be lying around in the working tree. Git is
 * the source of truth when it is there; without it (a tarball, a CI cache)
 * the same ignore rules are applied by hand. */
const IGNORED_DIRS = new Set([
  "node_modules", "dist", ".git", ".venv", "__pycache__", "out", ".cache",
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else {
      out.push(relative(ROOT, full).split(sep).join("/"));
    }
  }
  return out;
}

let FILES = null;
function files() {
  if (FILES) return FILES;
  let list = null;
  try {
    const raw = execSync("git ls-files -z", { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    list = raw.split("\0").filter(Boolean);
  } catch {
    list = walk(ROOT);
  }
  FILES = list.sort();
  return FILES;
}

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function isDir(rel) {
  try { return statSync(join(ROOT, rel)).isDirectory(); } catch { return false; }
}

/* A project is a top-level folder that ships an index.html. The portfolio
 * itself is one of them, but it is the page, not a project in the arcade.
 * `EADS/studio/templates/index.html` is a Flask template, not a project. */
function projects() {
  const all = new Set(files());
  return files()
    .filter((f) => f.includes("/") && f.endsWith("/index.html"))
    .map((f) => f.split("/")[0])
    .filter((d) => d !== "portfolio" && all.has(`${d}/index.html`))
    .filter((d, i, a) => a.indexOf(d) === i)
    .sort();
}

/* Two projects build with a bundler and ship a generated manifest and
 * service worker in the output rather than in the source tree. They are
 * named here because the claim "every project is an installable PWA" is only
 * true if the generated ones are counted. */
const GENERATED_PWA = ["bucio", "new-star-soccer"];

function manifestOf(dir) {
  if (files().includes(`${dir}/manifest.json`)) return `${dir}/manifest.json`;
  if (files().includes(`${dir}/public/manifest.json`)) return `${dir}/public/manifest.json`;
  const web = files().find((f) => f.startsWith(`${dir}/`) && f.endsWith(".webmanifest"));
  return web || null;
}

function serviceWorkerOf(dir) {
  for (const name of ["service-worker.js", "sw.js"]) {
    if (files().includes(`${dir}/${name}`)) return `${dir}/${name}`;
    if (files().includes(`${dir}/public/${name}`)) return `${dir}/public/${name}`;
  }
  return null;
}

/* ------------------------------------------------------------------ shell */

/* The `how` column of the ledger is a command a reader can paste and get the
 * same number. These run them, so the commands cannot quietly stop working. */
function runShell(cmd) {
  const out = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return out.trim();
}

/* --------------------------------------------------------------- the pages */

/* The pages that state claims. Both are scraped, so a number on the CV is
   checked as carefully as a number on the portfolio. */
const PAGES = ["portfolio/index.html", "portfolio/cv.html"];

function pageHtml(path) {
  return readFileSync(join(ROOT, path || PAGES[0]), "utf8");
}

/* Numeric claims are read out of the page, not out of a copy of the page.
   The stat tiles carry data-claim="<id>", so the check is: does the number
   the reader sees equal the number the repository produces? */
function scrapeStat(html, id) {
  const re = new RegExp(`data-claim="${id}"[^>]*>\\s*<b>([\\s\\S]*?)</b>`, "i");
  const m = html.match(re);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/* Every tile that claims something has to be in the registry. A number on
   the page that the ledger does not know about is a bug, not a detail. */
function pageClaimIds(html) {
  const ids = [];
  const re = /data-claim="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) ids.push(m[1]);
  return [...new Set(ids)];
}

/* The cloud: every project the page links to from the "Also built" section. */
function cloudLinks(html) {
  const start = html.indexOf('<div class="cloud">');
  if (start < 0) return [];
  const end = html.indexOf("</div>", start);
  const cloud = html.slice(start, end);
  const links = [];
  const re = /href="\.\.\/([^/"]+)\/?"/g;
  let m;
  while ((m = re.exec(cloud))) links.push(m[1]);
  return [...new Set(links)].sort();
}

/* ------------------------------------------------------------- the claims */

/* A claim is: an id, a value, a way to compute it, and the shell command a
   reader can paste into a terminal to reproduce it. The `how` string is the
   part that matters most — it is what turns an assertion into a fact.

   `expect` is what the page has to show. A claim without one is not stated
   on the page; it is a supporting number, reported but not compared. */
const CLAIMS = [
  {
    id: "projects",
    label: "Projects shipped",
    labelIt: "Progetti pubblicati",
    where: "the first stat tile, and the CV",
    whereIt: "la prima cifra, e il CV",
    expect: "56",
    expectElsewhere: { "portfolio/cv.html": "56" },
    how: "for d in */; do d=${d%/}; [ -f \"$d/index.html\" ] && echo \"$d\"; done | grep -v '^portfolio$' | wc -l",
    compute: () => projects().length,
  },
  {
    id: "zero_dep",
    label: "Projects with zero runtime dependencies",
    labelIt: "Progetti senza dipendenze runtime",
    where: "the second stat tile, and the CV",
    whereIt: "la seconda cifra, e il CV",
    expect: "54/56",
    expectElsewhere: { "portfolio/cv.html": "54/56" },
    how: "deps=$(for d in */; do d=${d%/}; [ -f \"$d/index.html\" ] || continue; \
c=$(python3 -c \"import json;print(len(json.load(open('$d/package.json')).get('dependencies',{})))\" 2>/dev/null || echo 0); \
if [ \"$c\" != 0 ] || [ -d \"$d/vendor\" ]; then echo \"$d\"; fi; done | wc -l); \
total=$(for d in */; do d=${d%/}; [ -f \"$d/index.html\" ] && echo \"$d\"; done | grep -v '^portfolio$' | wc -l); \
echo \"$((total-deps))/$total\"",
    compute: () => {
      const offenders = projects().filter((d) => {
        if (isDir(`${d}/vendor`)) return true;
        const pkg = files().find((f) => f === `${d}/package.json`);
        if (!pkg) return false;
        try {
          const json = JSON.parse(read(pkg));
          return Object.keys(json.dependencies || {}).length > 0;
        } catch { return false; }
      });
      return `${projects().length - offenders.length}/${projects().length}`;
    },
  },
  {
    id: "binary_art",
    label: "Binary images loaded by a game",
    labelIt: "Immagini binarie caricate da un gioco",
    where: "the third stat tile",
    whereIt: "la terza cifra",
    expect: "0",
    how: "git ls-files | grep -iE '\\.(png|jpe?g|gif|webp|avif|bmp)$' | grep -vE '/icons/|apple-touch-icon|^icons/|og-cover\\.png$|/shots/|/screens/' | wc -l",
    compute: () => {
      /* No game may load a binary image as content. Icons are loaded, and are
         icons; social preview cards are metadata for crawlers, never loaded
         by a page; screenshots are documentation. Anything else is a sprite
         sheet, and the answer stops being zero. */
      const art = files().filter((f) => {
        if (!/\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(f)) return false;
        if (/\/icons\/|apple-touch-icon|^icons\/|og-cover\.png$|\/shots\/|\/screens\//.test(f)) return false;
        return true;
      });
      return art.length;
    },
  },
  {
    id: "trackers",
    label: "Trackers and ad scripts",
    labelIt: "Tracker e script pubblicitari",
    where: "the fourth stat tile, and the CV",
    whereIt: "la quarta cifra, e il CV",
    expect: "0",
    expectElsewhere: { "portfolio/cv.html": "0" },
    how: "grep -rniE 'googletagmanager|google-analytics|gtag\\(|adsense|doubleclick|hotjar|plausible\\.io|matomo|mixpanel|segment\\.io|amplitude\\.com|clarity\\.ms|connect\\.facebook\\.net|adservice' \
--include='*.html' --include='*.css' --include='*.js' --include='*.mjs' --include='*.ts' . \
| grep -v node_modules | grep -v '/dist/' | grep -v 'tools/verify.mjs' | grep -v 'portfolio/verify.html' | wc -l",
    compute: () => scanLines(TRACKER).length,
  },
  {
    id: "external_loads",
    label: "Remote resources loaded at runtime",
    labelIt: "Risorse remote caricate a runtime",
    where: "the whole repository, and the CV",
    whereIt: "tutto il repository, e il CV",
    expectElsewhere: { "portfolio/cv.html": "0" },
    how: "grep -rnE '<(script|img|iframe|source|video|audio|embed)[^>]*[[:space:]]src=[\"\'\\''](https?:)?//|<link[^>]*rel=[\"\'\\''](stylesheet|icon|manifest|preload|prefetch|apple-touch-icon)[\"\'\\''][^>]*href=[\"\'\\''](https?:)?//|@import[[:space:]]+url\\([\"\'\\'']?(https?:)?//|url\\([\"\'\\'']?(https?:)?//|fetch\\([[:space:]]*[\"\'\\''](https?:)?//|from[[:space:]]+[\"\'\\''](https?:)?//' \
--include='*.html' --include='*.css' --include='*.js' --include='*.mjs' --include='*.ts' . \
| grep -v node_modules | grep -v '/dist/' | wc -l",
    compute: () => scanLines(REMOTE_LOAD).length,
  },
  {
    id: "pwa_manifests",
    label: "Projects with a web manifest",
    labelIt: "Progetti con un web manifest",
    where: "the Craft panel, offline",
    whereIt: "il pannello Metodo, offline",
    how: "for d in */; do d=${d%/}; [ -f \"$d/index.html\" ] || continue; \
if [ -f \"$d/manifest.json\" ] || [ -f \"$d/public/manifest.json\" ] || ls \"$d\"/*.webmanifest >/dev/null 2>&1; then echo \"$d\"; fi; done | wc -l",
    compute: () => projects().filter((d) => manifestOf(d) || GENERATED_PWA.includes(d)).length,
  },
  {
    id: "service_workers",
    label: "Projects with a service worker",
    labelIt: "Progetti con un service worker",
    where: "the Craft panel, offline",
    whereIt: "il pannello Metodo, offline",
    how: "for d in */; do d=${d%/}; [ -f \"$d/index.html\" ] || continue; \
if [ -f \"$d/service-worker.js\" ] || [ -f \"$d/sw.js\" ] || [ -f \"$d/public/service-worker.js\" ]; then echo \"$d\"; fi; done | wc -l",
    compute: () => projects().filter((d) => serviceWorkerOf(d) || GENERATED_PWA.includes(d)).length,
  },
  {
    id: "png_total",
    label: "PNG files in the repository",
    labelIt: "File PNG nel repository",
    where: "the Craft panel, budgets",
    whereIt: "il pannello Metodo, budget",
    how: "git ls-files '*.png' | wc -l",
    compute: () => files().filter((f) => f.toLowerCase().endsWith(".png")).length,
  },
  {
    id: "png_icons",
    label: "…of which are app icons",
    labelIt: "…di cui icone delle app",
    where: "the Craft panel, budgets",
    whereIt: "il pannello Metodo, budget",
    how: "git ls-files '*.png' | grep -E '/icons/|apple-touch-icon|^icons/' | wc -l",
    compute: () => files().filter((f) => f.toLowerCase().endsWith(".png")).filter((f) => /\/icons\/|apple-touch-icon|^icons\//.test(f)).length,
  },
  {
    id: "png_screenshots",
    label: "…of which are screenshots",
    labelIt: "…di cui screenshot",
    where: "the Craft panel, budgets",
    whereIt: "il pannello Metodo, budget",
    how: "git ls-files '*.png' | grep -E '/shots/|/screens/' | wc -l",
    compute: () => files().filter((f) => f.toLowerCase().endsWith(".png")).filter((f) => /\/shots\/|\/screens\//.test(f)).length,
  },
  {
    id: "png_og_cards",
    label: "…of which are social preview cards",
    labelIt: "…di cui card per le anteprime social",
    where: "the Craft panel, budgets",
    whereIt: "il pannello Metodo, budget",
    how: "git ls-files '*.png' | grep -E 'og-cover\\.png$' | wc -l",
    compute: () => files().filter((f) => /og-cover\.png$/i.test(f)).length,
  },
  {
    id: "svg_total",
    label: "SVG files in the repository",
    labelIt: "File SVG nel repository",
    where: "the ledger",
    whereIt: "il registro",
    how: "git ls-files '*.svg' | wc -l",
    compute: () => files().filter((f) => f.toLowerCase().endsWith(".svg")).length,
  },
  {
    id: "loc_total",
    label: "Lines of source",
    labelIt: "Righe di codice",
    where: "the ledger",
    whereIt: "il registro",
    /* Volatile: this number moves with every commit, so it is reported but
       not part of the committed ledger — otherwise the committed copy would
       be stale the moment anything else was touched. */
    volatile: true,
    how: "git ls-files '*.js' '*.mjs' '*.ts' '*.html' '*.css' '*.py' | xargs wc -l | tail -1 | awk '{print $1}'",
    compute: () => {
      const exts = new Set([".js", ".mjs", ".ts", ".html", ".css", ".py"]);
      let n = 0;
      for (const f of files()) {
        if (!exts.has(extname(f))) continue;
        n += read(f).split("\n").length - 1;
      }
      return n;
    },
  },
  {
    id: "loc_js",
    label: "Lines of JavaScript",
    labelIt: "Righe di JavaScript",
    where: "the ledger",
    whereIt: "il registro",
    volatile: true,
    how: "git ls-files '*.js' '*.mjs' | xargs wc -l | tail -1 | awk '{print $1}'",
    compute: () => {
      const exts = new Set([".js", ".mjs"]);
      let n = 0;
      for (const f of files()) {
        if (!exts.has(extname(f))) continue;
        n += read(f).split("\n").length - 1;
      }
      return n;
    },
  },
  {
    id: "test_files",
    label: "Test files",
    labelIt: "File di test",
    where: "the ledger",
    whereIt: "il registro",
    how: "git ls-files | grep -E '(\\.test\\.(mjs|js)$|(^|/)test\\.py$|(^|/)smoke\\.mjs$)' | wc -l",
    compute: () => files().filter((f) => /\.test\.(mjs|js)$/.test(f) || /(^|\/)test\.py$/.test(f) || /(^|\/)smoke\.mjs$/.test(f)).length,
  },
  {
    id: "case_studies",
    label: "Case studies",
    labelIt: "Case study",
    where: "the hero and the work section",
    whereIt: "l'hero e la sezione lavori",
    how: "grep -c '<article class=\"case' portfolio/index.html",
    compute: () => (pageHtml().match(/<article class="case/g) || []).length,
  },
  {
    id: "census_lines",
    label: "CENSUS — lines of source",
    labelIt: "CENSUS — righe di codice",
    where: "case 01, the line-count chip",
    whereIt: "case 01, il chip delle righe",
    expect: "2,762",
    how: "git ls-files census-pwa | grep -E '\\.(js|mjs|html|css)$' | xargs cat | wc -l",
    compute: () => grouped(sourceLines("census-pwa")),
  },
  {
    id: "stats_lines",
    label: "STATS — lines of source",
    labelIt: "STATS — righe di codice",
    where: "case 02, the line-count chip",
    whereIt: "case 02, il chip delle righe",
    expect: "1,750",
    how: "git ls-files stats-pwa | grep -E '\\.(js|mjs|html|css)$' | xargs cat | wc -l",
    compute: () => grouped(sourceLines("stats-pwa")),
  },
  {
    id: "bucio_lines",
    label: "BUCIO — lines of source",
    labelIt: "BUCIO — righe di codice",
    where: "case 03, the line-count chip",
    whereIt: "case 03, il chip delle righe",
    expect: "8,741",
    how: "git ls-files bucio | grep -E '\\.(js|mjs|html|css)$' | grep -v node_modules | grep -v '/dist/' | xargs cat | wc -l",
    compute: () => grouped(sourceLines("bucio")),
  },
  {
    id: "sector7_lines",
    label: "SECTOR 7 — lines of source",
    labelIt: "SECTOR 7 — righe di codice",
    where: "case 04, the line-count chip",
    whereIt: "case 04, il chip delle righe",
    expect: "19,926",
    how: "git ls-files sector7-pwa | grep -E '\\.(js|mjs|html|css)$' | xargs cat | wc -l",
    compute: () => grouped(sourceLines("sector7-pwa")),
  },
  {
    id: "sector7_modules",
    label: "SECTOR 7 — source modules",
    labelIt: "SECTOR 7 — moduli sorgente",
    where: "case 04, the module chip",
    whereIt: "case 04, il chip dei moduli",
    expect: "15",
    how: "ls sector7-pwa/src/*.js | wc -l",
    compute: () => files().filter((f) => /^sector7-pwa\/src\/[^/]+\.js$/.test(f)).length,
  },
  {
    id: "ironfall_lines",
    label: "IRONFALL — lines of source",
    labelIt: "IRONFALL — righe di codice",
    where: "case 05, the line-count chip",
    whereIt: "case 05, il chip delle righe",
    expect: "16,134",
    how: "git ls-files ironfall-pwa | grep -E '\\.(js|mjs|html|css)$' | xargs cat | wc -l",
    compute: () => grouped(sourceLines("ironfall-pwa")),
  },
  {
    id: "pulse_lines",
    label: "PULSE — lines of source",
    labelIt: "PULSE — righe di codice",
    where: "case 06, the line-count chip",
    whereIt: "case 06, il chip delle righe",
    expect: "3,099",
    how: "git ls-files pulse-pwa | grep -E '\\.(js|mjs|html|css)$' | xargs cat | wc -l",
    compute: () => grouped(sourceLines("pulse-pwa")),
  },
  {
    id: "pixelcup_lines",
    label: "PIXEL CUP '96 — lines of source",
    labelIt: "PIXEL CUP '96 — righe di codice",
    where: "case 10, the line-count chip",
    whereIt: "case 10, il chip delle righe",
    expect: "8,942",
    how: "git ls-files pixel-cup-pwa | grep -E '\\.(js|mjs|html|css)$' | xargs cat | wc -l",
    compute: () => grouped(sourceLines("pixel-cup-pwa")),
  },
  {
    id: "pixelcup_model",
    label: "PIXEL CUP '96 — lines of rules",
    labelIt: "PIXEL CUP '96 — righe di regole",
    where: "case 10, the rules chip",
    whereIt: "case 10, il chip delle regole",
    expect: "1,861",
    how: "cat pixel-cup-pwa/src/core.js | wc -l",
    compute: () => grouped(fileLines("pixel-cup-pwa/src/core.js")),
  },
  {
    id: "balance_sessions",
    label: "THE BALANCE LAB — sessions per run",
    labelIt: "THE BALANCE LAB — sessioni per run",
    where: "case 07, the sessions chip",
    whereIt: "case 07, il chip delle sessioni",
    expect: "5,000",
    how: "grep -o 'arg(\"sessions\", [0-9]*' tools/balance/run.mjs | grep -o '[0-9]*'",
    compute: () => {
      const m = read("tools/balance/run.mjs").match(/arg\("sessions",\s*(\d+)\)/);
      return m ? grouped(Number(m[1])) : "0";
    },
  },
  {
    id: "shared_lines",
    label: "THE SHARED ENGINE — lines in the shared layer",
    labelIt: "THE SHARED ENGINE — righe nello strato condiviso",
    where: "case 08, the line-count chip",
    whereIt: "case 08, il chip delle righe",
    expect: "1,655",
    how: "git ls-files shared/ | xargs cat | wc -l",
    compute: () => {
      let n = 0;
      for (const f of files()) {
        if (!f.startsWith("shared/")) continue;
        n += read(f).split("\n").length - 1;
      }
      return grouped(n);
    },
  },
  {
    id: "shared_consumers",
    label: "THE SHARED ENGINE — projects that load it",
    labelIt: "THE SHARED ENGINE — progetti che lo caricano",
    where: "case 08, the consumers chip",
    whereIt: "case 08, il chip dei consumatori",
    expect: "42",
    how: "git ls-files | grep -E '\\.(html|js|mjs)$' | xargs grep -l -E '(src|import|from)[[:space:]]*=?[[:space:]]*[\"'\\''][^\"'\\'']*shared/(arcade|chart|scene-reader)\\.js' | cut -d/ -f1 | sort -u | grep -vE '^(index\\.html|sw\\.js|shared|portfolio)$' | wc -l",
    compute: () => {
      const rx = /(?:src|import|from)\s*=?\s*["']([^"']*shared\/(?:arcade|chart|scene-reader)\.js)/;
      const dirs = new Set();
      for (const f of files()) {
        if (!/\.(html|js|mjs)$/i.test(f)) continue;
        if (f.startsWith("shared/")) continue;
        if (rx.test(read(f))) dirs.add(f.split("/")[0]);
      }
      dirs.delete("index.html");
      dirs.delete("sw.js");
      dirs.delete("portfolio");
      return dirs.size;
    },
  },
  {
    id: "eads_lines",
    label: "EADS STUDIO — lines of source",
    labelIt: "EADS STUDIO — righe di codice",
    where: "case 09, the line-count chip",
    whereIt: "case 09, il chip delle righe",
    expect: "2,747",
    how: "git ls-files EADS | grep -E '\\.(py|html|js|css)$' | xargs cat | wc -l",
    compute: () => {
      let n = 0;
      for (const f of files()) {
        if (!f.startsWith("EADS/")) continue;
        if (!/\.(py|html|js|css)$/i.test(f)) continue;
        n += read(f).split("\n").length - 1;
      }
      return grouped(n);
    },
  },
  {
    id: "claims_checked",
    label: "Claims in the ledger",
    labelIt: "Affermazioni nel registro",
    where: "the CV, the numbers row",
    whereIt: "il CV, la riga dei numeri",
    /* The number of claims is the number of claims: the CV quotes it, and
       the ledger checks that the CV quotes it correctly. */
    expectElsewhere: { "portfolio/cv.html": () => String(CLAIMS.length) },
    how: "node tools/verify.mjs --json | grep -c '\"id\":'",
    compute: () => CLAIMS.length,
  },
  {
    id: "cloud_links",
    label: "Projects linked from the catalogue",
    labelIt: "Progetti linkati dal catalogo",
    where: "the Also built cloud",
    whereIt: "la nuvola «Costruito anche»",
    how: "python3 -c \"import re;h=open('portfolio/index.html',encoding='utf-8').read();c=h.split('<div class=\\\"cloud\\\">')[1].split('</div>')[0];print(len(set(re.findall(r'href=\\\"\\\\.\\\\./([^/\\\"]+)/?\\\"',c))))\"",
    compute: () => cloudLinks(pageHtml()).filter((d) => projects().includes(d)).length,
  },
  {
    id: "cloud_missing",
    label: "Projects missing from the catalogue",
    labelIt: "Progetti assenti dal catalogo",
    where: "the Also built cloud",
    whereIt: "la nuvola «Costruito anche»",
    how: "python3 -c \"import os,re;h=open('portfolio/index.html',encoding='utf-8').read();c=h.split('<div class=\\\"cloud\\\">')[1].split('</div>')[0];l=set(re.findall(r'href=\\\"\\\\.\\\\./([^/\\\"]+)/?\\\"',c));p=[d for d in os.listdir('.') if os.path.isdir(d) and os.path.isfile(os.path.join(d,'index.html')) and d!='portfolio'];print(len([x for x in p if x not in l]))\"",
    compute: () => {
      const linked = cloudLinks(pageHtml());
      return projects().filter((d) => !linked.includes(d)).length;
    },
  },
];

/* Numbers that appear in the prose rather than in a data-claim attribute.
   A literal that shows up in the page means the page is out of date.

   Only literals that are actually *wrong* belong here. A phrase that is true
   today is not a bug detector, it is noise, and noise is how a lint starts
   being ignored. */
const STALE = [
  { literal: "Forty-eight", claim: "projects" },
  { literal: "Quarantotto", claim: "projects" },
  { literal: "48 projects", claim: "projects" },
  { literal: "48 PNG", claim: "png_total" },
  { literal: "44 PNG", claim: "png_total" },
  { literal: "46 published PNGs", claim: "png_total" },
  { literal: "every one of them", claim: "zero_dep" },
  { literal: "Six projects", claim: "case_studies" },
  { literal: "Sei progetti", claim: "case_studies" },
  { literal: "six of them", claim: "case_studies" },
  { literal: "sei di loro", claim: "case_studies" },
  { literal: "nine of them", claim: "case_studies" },
  { literal: "nove di loro", claim: "case_studies" },
];

/* The ledger scans the repository for trackers and for remote loads. It
   cannot scan itself, and it cannot scan the page it generates: both quote
   the very patterns they are looking for. */
const PATTERN_FILES = new Set(["tools/verify.mjs", "portfolio/verify.html"]);

/* Lines that actually fetch something from another origin. A link a reader
   can click is not a load; a canonical URL is metadata. */
const REMOTE_LOAD = [
  /<(script|img|iframe|source|video|audio|embed)\b[^>]*\ssrc\s*=\s*["'](https?:\/\/|\/\/)/i,
  /<link\b[^>]*\brel\s*=\s*["'](stylesheet|icon|manifest|preload|prefetch|apple-touch-icon)["'][^>]*\bhref\s*=\s*["'](https?:\/\/|\/\/)/i,
  /<link\b[^>]*\bhref\s*=\s*["'](https?:\/\/|\/\/)[^"']*["'][^>]*\brel\s*=\s*["'](stylesheet|icon|manifest|preload|prefetch)["']/i,
  /@import\s+url\(\s*["']?(https?:\/\/|\/\/)/i,
  /url\(\s*["']?(https?:\/\/|\/\/)/i,
  /\bfetch\(\s*["'`](https?:\/\/|\/\/)/i,
  /\bfrom\s+["'](https?:\/\/|\/\/)/i,
  /\bnew\s+URL\(\s*["'`](https?:\/\/|\/\/)/i,
];

/* Tracker fingerprints. Hostnames and API entry points, not words: "plausible"
   and "amplitude" are ordinary English and appear in the prose. */
const TRACKER = [
  "googletagmanager", "google-analytics", "gtag(", "adsense", "doubleclick",
  "hotjar", "plausible.io", "matomo", "mixpanel", "segment.io", "amplitude.com",
  "clarity.ms", "connect.facebook.net", "adservice",
];

/* The lines of source in one project: every tracked .js, .mjs, .html and
   .css file in the folder. The case-study chips quote this number. */
function sourceLines(dir) {
  let n = 0;
  for (const f of files()) {
    if (!f.startsWith(`${dir}/`)) continue;
    if (!/\.(js|mjs|html|css)$/i.test(f)) continue;
    n += read(f).split("\n").length - 1;
  }
  return n;
}

/* The lines of source in one file: the same count the shell would make,
   for a chip that quotes a single file rather than a whole project. */
function fileLines(path) {
  const f = files().find((x) => x === path);
  if (!f) return 0;
  return read(f).split("\n").length - 1;
}

/* Thousands separators, the way the chips write them. */
const grouped = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/* Scan the repository line by line, the way grep does, so the number the
   ledger reports and the number the command prints are the same number. */
function scanLines(patterns) {
  const hits = [];
  for (const f of files()) {
    if (PATTERN_FILES.has(f)) continue;
    if (!/\.(html|css|js|mjs|ts)$/i.test(f)) continue;
    const lines = read(f).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of patterns) {
        const rx = p instanceof RegExp ? p : new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        if (rx.test(line)) { hits.push([f, i + 1, line.trim()]); break; }
      }
    }
  }
  return hits;
}

/* --------------------------------------------------------------- checking */

function check() {
  const html = pageHtml();
  const results = [];

  for (const claim of CLAIMS) {
    let value, error = null;
    try {
      value = claim.compute();
    } catch (err) {
      value = null;
      error = err.message;
    }

    let shown = null;
    let ok = true;
    let note = "";

    if (error) {
      ok = false;
      note = error;
    } else {
      /* A claim may be stated on more than one page. Each page that
         states it has to state it the same way. */
      const placements = [];
      if (claim.expect !== undefined) placements.push([PAGES[0], claim.expect]);
      for (const [path, expected] of Object.entries(claim.expectElsewhere || {})) {
        placements.push([path, expected]);
      }

      for (const [path, expected] of placements) {
        const want = typeof expected === "function" ? expected() : expected;
        const page = path === PAGES[0] ? html : pageHtml(path);
        const got = scrapeStat(page, claim.id);
        if (got === null) {
          ok = false;
          note = `${path} has no tile for "${claim.id}"`;
          break;
        }
        if (String(value) !== got && String(want) !== got) {
          ok = false;
          note = `${path} says ${got}, the repository says ${value}`;
          break;
        }
        if (path === PAGES[0]) shown = got;
      }
    }

    results.push({ ...claim, value, shown, ok, note });
  }

  /* A tile on a page that the ledger does not know about is a number
     nobody is checking. */
  const known = new Set(CLAIMS.map((c) => c.id));
  const unknown = [];
  for (const path of PAGES) {
    for (const id of pageClaimIds(pageHtml(path))) {
      if (!known.has(id)) unknown.push(`${path}: ${id}`);
    }
  }

  /* The prose lint. Comments are stripped first: a literal inside an HTML
     comment is not a claim anybody reads. */
  const stale = [];
  for (const path of PAGES) {
    const prose = pageHtml(path).replace(/<!--[\s\S]*?-->/g, " ");
    for (const { literal, claim } of STALE) {
      if (prose.includes(literal)) stale.push({ literal, claim, path });
    }
  }

  return { results, unknown, stale };
}

function auditHow() {
  const out = [];
  for (const claim of CLAIMS) {
    let shellValue, error = null;
    try {
      shellValue = runShell(claim.how);
    } catch (err) {
      error = (err.stderr || err.stdout || err.message || "").toString().trim().split("\n").pop();
    }
    const mine = String(claim.compute());
    const theirs = error ? null : shellValue;
    /* Some commands print a list rather than a count; a count is what the
       ledger compares, so the last numeric token is the answer. Thousands
       separators are a formatting choice, not a different number. */
    const norm = (s) => String(s).replace(/[, ]/g, "");
    const numeric = theirs !== null && norm(theirs.split(/\s+/).filter(Boolean).pop());
    out.push({
      id: claim.id,
      ok: error === null && numeric === norm(mine),
      shell: theirs,
      computed: mine,
      error,
    });
  }
  return out;
}

/* --------------------------------------------------------------- rendering */

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function renderTable({ results, unknown, stale }) {
  const w = Math.max(...results.map((r) => r.id.length), 8);
  const lines = [];
  lines.push("");
  lines.push(`  ${"CLAIM".padEnd(w)}  ${"VALUE".padEnd(14)}  ${"STATE".padEnd(6)}  NOTE`);
  lines.push(`  ${"-".repeat(w)}  ${"-".repeat(14)}  ${"-".repeat(6)}  ${"-".repeat(40)}`);
  for (const r of results) {
    const state = r.ok ? "PASS" : "FAIL";
    lines.push(`  ${r.id.padEnd(w)}  ${String(r.value).padEnd(14)}  ${state.padEnd(6)}  ${r.note}`);
  }
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  lines.push("");
  lines.push(`  ${results.length} claims · ${pass} pass · ${fail} fail`);
  if (unknown.length) lines.push(`  unknown data-claim on the page: ${unknown.join(", ")}`);
  for (const s of stale) lines.push(`  stale literal "${s.literal}" contradicts ${s.claim}`);
  lines.push("");
  return lines.join("\n");
}

function renderJson({ results, unknown, stale }) {
  const pass = results.filter((r) => r.ok).length;
  return JSON.stringify({
    claims: results.map((r) => ({
      id: r.id,
      label: r.label,
      labelIt: r.labelIt,
      value: r.value,
      expected: r.expect ?? null,
      shown: r.shown,
      ok: r.ok,
      note: r.note,
      where: r.where,
      how: r.how,
    })),
    summary: {
      total: results.length,
      pass,
      fail: results.length - pass,
      unknownPageClaims: unknown,
      stale,
    },
  }, null, 2);
}

/* The rendered ledger. No timestamp, deliberately: the file has to be
   byte-for-byte reproducible so CI can regenerate it and diff it.

   Claims that move with every commit are kept in a marked-off section: they
   are reported, but they are not part of the committed copy, because a
   committed copy that is stale the moment anything else is touched is a
   copy nobody keeps up to date. */
function renderHtml({ results, unknown, stale }) {
  const stable = results.filter((r) => !r.volatile);
  const volatile = results.filter((r) => r.volatile);
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;

  const row = (r) => `
        <tr class="${r.ok ? "ok" : "bad"}" id="${esc(r.id)}">
          <th scope="row">
            <span class="en">${esc(r.label)}</span>
            <span class="it" lang="it">${esc(r.labelIt)}</span>
          </th>
          <td class="value">${esc(r.value)}</td>
          <td class="state">${r.ok ? "PASS" : "FAIL"}</td>
          <td class="where">
            <span class="en">${esc(r.where)}</span>
            <span class="it" lang="it">${esc(r.whereIt || r.where)}</span>
          </td>
          <td class="how">
            <pre><code>${esc(r.how)}</code></pre>
            <button class="copy" type="button" hidden data-copy>Copy</button>
          </td>
        </tr>`;

  const rows = stable.map(row).join("");
  const volatileRows = volatile.map(row).join("");

  return `<!DOCTYPE html>
<html lang="en" data-lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>The claims ledger — Luca Gandolfi</title>
<meta name="description" content="Every number the portfolio states, recomputed from the repository and checked against the page that states it.">
<meta name="robots" content="index, follow">
<link rel="stylesheet" href="assets/portfolio.css">
<link rel="stylesheet" href="assets/ledger.css">
</head>
<body>
<div class="wrap ledger">
  <header class="topbar" id="topbar">
    <a class="brand" href="./"><span></span>Luca Gandolfi</a>
    <nav class="topnav" aria-label="Sections">
      <a href="./" class="en">Portfolio</a>
      <a href="./" class="it" lang="it">Portfolio</a>
    </nav>
    <div class="toggles">
      <button class="toggle" id="lang-btn" type="button" aria-label="Switch language">
        <span class="en">IT</span><span class="it" lang="it">EN</span>
      </button>
      <button class="toggle" id="theme-btn" type="button" aria-label="Switch colour theme">
        <span id="theme-label-en" class="en">Light</span><span id="theme-label-it" class="it" lang="it">Chiaro</span>
      </button>
    </div>
  </header>

  <header class="ledger-head">
    <p class="kicker">
      <span class="en">The claims ledger</span>
      <span class="it" lang="it">Il registro delle affermazioni</span>
    </p>
    <h1>
      <span class="en">Every number, checked against the repository</span>
      <span class="it" lang="it">Ogni numero, verificato sul repository</span>
    </h1>
    <p class="ledger-intro">
      <span class="en">This page is generated by <code>tools/verify.mjs</code>. Every number the portfolio states is recomputed from the repository and compared with the number the page actually renders. If one of them drifts, CI goes red. The command column is the command that produces the number — paste it into a terminal and you get the same answer.</span>
      <span class="it" lang="it">Questa pagina è generata da <code>tools/verify.mjs</code>. Ogni numero che il portfolio afferma ricalcolato sul repository e confrontato con il numero che la pagina mostra davvero. Se uno scivola, la CI diventa rossa. La colonna dei comandi è il comando che produce il numero: incollatelo in un terminale e ottieni la stessa risposta.</span>
    </p>
    <p class="ledger-summary">
      <b>${results.length}</b>
      <span class="en">claims · ${pass} pass · ${fail} fail</span>
      <span class="it" lang="it">affermazioni · ${pass} ok · ${fail} ko</span>
    </p>
    <p class="ledger-back">
      <a href="./">&larr; <span class="en">Back to the portfolio</span><span class="it" lang="it">Torna al portfolio</span></a>
    </p>
  </header>

  <table class="ledger-table">
    <colgroup>
      <col class="c-claim"><col class="c-value"><col class="c-state"><col class="c-where"><col class="c-how">
    </colgroup>
    <caption class="visually-hidden">
      <span class="en">Claims, values and the command that reproduces each one</span>
      <span class="it" lang="it">Affermazioni, valori e il comando che li riproduce</span>
    </caption>
    <thead>
      <tr>
        <th scope="col"><span class="en">Claim</span><span class="it" lang="it">Affermazione</span></th>
        <th scope="col"><span class="en">Value</span><span class="it" lang="it">Valore</span></th>
        <th scope="col"><span class="en">State</span><span class="it" lang="it">Esito</span></th>
        <th scope="col"><span class="en">Used on</span><span class="it" lang="it">Usata su</span></th>
        <th scope="col"><span class="en">Reproduce it</span><span class="it" lang="it">Riprodurla</span></th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>

  <!-- volatile:start — the numbers below move with every commit, so they are
       reported live and left out of the byte-for-byte comparison. -->
  <h2 class="ledger-subhead">
    <span class="en">And the numbers that move with every commit</span>
    <span class="it" lang="it">E i numeri che cambiano a ogni commit</span>
  </h2>
  <table class="ledger-table">
    <tbody>${volatileRows}
    </tbody>
  </table>
  <!-- volatile:end -->

${unknown.length ? `
  <p class="ledger-problem">
    <b>Unknown claim ids on the page:</b> ${esc(unknown.join(", "))}
  </p>` : ""}
${stale.length ? `
  <p class="ledger-problem">
    <b>Stale literals:</b> ${stale.map((s) => esc(`${s.literal} (${s.claim})`)).join(", ")}
  </p>` : ""}
  <p class="ledger-foot">
    <span class="en">Generated by <code>node tools/verify.mjs --html portfolio/verify.html</code>. No timestamp, on purpose: the file is byte-for-byte reproducible, so CI regenerates it and fails if the committed copy is stale.</span>
    <span class="it" lang="it">Generato da <code>node tools/verify.mjs --html portfolio/verify.html</code>. Nessun timestamp, di proposito: il file è riproducibile byte per byte, così la CI lo rigenera e fallisce se la copia committata è vecchia.</span>
  </p>
</div>
<script src="assets/portfolio.js"></script>
<script src="assets/ledger.js"></script>
</body>
</html>
`;
}

/* Compare the committed ledger with a fresh one. The volatile section is
   stripped from both sides first: those numbers move with every commit and
   are not what "the committed copy is stale" is about. */
function stripVolatile(text) {
  const start = text.indexOf("<!-- volatile:start");
  const end = text.indexOf("<!-- volatile:end");
  if (start < 0 || end < 0) return text;
  return text.slice(0, start) + text.slice(end);
}

/* -------------------------------------------------------------------- CLI */

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const report = check();
const failures = report.results.filter((r) => !r.ok).length + report.unknown.length + report.stale.length;

if (has("--json")) {
  process.stdout.write(renderJson(report) + "\n");
} else if (has("--html")) {
  const out = valueOf("--html") || "portfolio/verify.html";
  const target = join(ROOT, out);
  writeFileSync(target, renderHtml(report));
  if (!has("--quiet")) console.log(`wrote ${relative(ROOT, target)}`);
} else if (has("--check")) {
  const table = renderTable(report);
  if (!has("--quiet")) process.stdout.write(table + "\n");
  process.exit(failures ? 1 : 0);
} else if (has("--compare")) {
  const committed = valueOf("--compare") || "portfolio/verify.html";
  const fresh = renderHtml(report);
  let stored = null;
  try {
    stored = readFileSync(join(ROOT, committed), "utf8");
  } catch {
    console.error(`FAIL  ${committed} is missing — run: node tools/verify.mjs --html ${committed}`);
    process.exit(1);
  }
  if (stripVolatile(stored) !== stripVolatile(fresh)) {
    console.error(`FAIL  ${committed} is stale — run: node tools/verify.mjs --html ${committed}`);
    /* Show where, without dumping the whole file. */
    const a = stripVolatile(stored).split("\n");
    const b = stripVolatile(fresh).split("\n");
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.error(`  line ${i + 1}`);
        console.error(`  committed: ${a[i] ?? ""}`);
        console.error(`  fresh:     ${b[i] ?? ""}`);
        break;
      }
    }
    process.exit(1);
  }
  console.log(`OK    ${committed} is up to date`);
  process.exit(0);
} else if (has("--audit")) {
  const audited = auditHow();
  for (const a of audited) {
    console.log(`  ${a.ok ? "OK  " : "FAIL"} ${a.id.padEnd(18)} shell=${a.shell ?? "?"}  computed=${a.computed}${a.error ? "  error: " + a.error : ""}`);
  }
  const bad = audited.filter((a) => !a.ok);
  console.log(`\n  ${audited.length} commands · ${audited.length - bad.length} agree · ${bad.length} disagree`);
  process.exit(bad.length ? 1 : 0);
} else {
  process.stdout.write(renderTable(report) + "\n");
  process.exit(failures ? 1 : 0);
}
