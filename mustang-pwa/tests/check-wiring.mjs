import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

let failures = 0;
function ok(label, condition, detail) {
    if (condition) { console.log("  ok    " + label); return; }
    failures++;
    console.error("  FAIL  " + label + (detail ? " -> " + detail : ""));
}

const html = read("index.html");
const game = read("src/game.js");
const sw = read("service-worker.js");
const manifest = JSON.parse(read("manifest.json"));

console.log("\nDOM wiring");
const usedIds = [...new Set([...game.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]))].sort();
ok("game.js queries " + usedIds.length + " element ids", usedIds.length >= 20, String(usedIds.length));
for (const id of usedIds) ok("index.html declares #" + id, html.includes('id="' + id + '"'));
for (const id of ["theatre-overlord", "theatre-rising"]) {
    ok("#" + id + " carries a data-theatre attribute", html.includes('data-theatre="' + id.replace("theatre-", "") + '"'));
}

console.log("\nasset wiring");
const refs = [...new Set([...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]))]
    .filter((r) => !/^(https?:|data:|#|mailto:)/.test(r)).sort();
ok("index.html references " + refs.length + " local assets", refs.length >= 8, String(refs.length));
for (const r of refs) {
    ok("asset " + r + " exists on disk", existsSync(resolve(root, r)));
}
/* The service worker registers itself from game.js. Loading it a second time
   as a page script was redundant, and the old count of nine local assets was
   the number that still included it. */
ok("the service worker is not loaded as a page script", !/src="service-worker\.js"/.test(html));

console.log("\nportability");
ok("no asset path is root absolute", !/(?:src|href)="\//.test(html), (html.match(/(?:src|href)="\/[^"]*"/) || [""])[0]);
ok("the service worker is registered relative", /register\(["']service-worker\.js["']\)/.test(read("src/game.js")));
ok("manifest start_url is relative", manifest.start_url === "./", manifest.start_url);
ok("manifest scope is relative", manifest.scope === "./", manifest.scope);

const cached = [...new Set([...sw.matchAll(/"([^"]*)"/g)].map((m) => m[1]))]
    .filter((r) => r.endsWith("/") || r.endsWith(".js") || r.endsWith(".css") || r.endsWith(".html")
        || r.endsWith(".json") || r.endsWith(".svg") || r.endsWith(".png")).sort();
ok("service worker precaches " + cached.length + " paths", cached.length >= 13);
for (const r of cached) {
    const file = r === "./" ? "index.html" : r.replace(/^\.\//, "");
    ok("precached " + r + " exists", existsSync(resolve(root, file)));
}
ok("precache list covers the four game scripts",
    ["./src/data.js", "./src/audio.js", "./src/art.js", "./src/game.js"].every((p) => cached.includes(p)));
ok("precache list covers the PNG icons", cached.filter((p) => p.endsWith(".png")).length >= 5,
    cached.filter((p) => p.endsWith(".png")).join(" "));

console.log("\nmanifest");
ok("name is Mustang PWA", manifest.name === "Mustang PWA", manifest.name);
ok("standalone display", manifest.display === "standalone");
ok("portrait orientation", manifest.orientation === "portrait");
ok("five icons declared", manifest.icons.length === 5, String(manifest.icons.length));
for (const icon of manifest.icons) {
    ok("icon " + icon.src + " exists", existsSync(resolve(root, icon.src)), icon.src);
}
ok("PNG icons are declared for install prompts",
    manifest.icons.filter((i) => i.type === "image/png").length === 4);
ok("a maskable icon is declared",
    manifest.icons.some((i) => String(i.purpose || "").includes("maskable")));
ok("apple-touch-icon points at a PNG, which is the only format iOS accepts",
    /rel="apple-touch-icon" href="[^"]+\.png"/.test(html), (html.match(/rel="apple-touch-icon"[^>]*>/) || [""])[0]);
ok("theme color matches the default palette", manifest.theme_color === "#14180f", manifest.theme_color);

console.log(failures === 0 ? "\nOK: wiring test passed" : "\nFAILED: " + failures + " wiring checks");
process.exit(failures === 0 ? 0 : 1);