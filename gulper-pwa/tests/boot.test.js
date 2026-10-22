/*
 * GULPER - the wiring.
 *
 * Every screen in this game is DOM. That means the thing most likely to
 * break is not the simulation but the connection between the markup and
 * the code: an id renamed in one file and not the other, a button with
 * no handler, a script tag pointing at a file that does not exist.
 *
 * None of those throw at load time. They throw when a player taps the
 * thing, which is the worst possible moment to find out.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const { ok, equal, report } = require("./harness.js");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* ---------- every element the code asks for exists in the markup ---------- */

const sources = ["ui.js", "input.js", "main.js", "render.js"]
    .map((f) => fs.readFileSync(path.join(ROOT, "src", f), "utf8"))
    .join("\n");

const wanted = new Set();
const re = /byId\(\s*"([^"]+)"\s*\)/g;
let m;
while ((m = re.exec(sources)) !== null) wanted.add(m[1]);
const re2 = /getElementById\(\s*"([^"]+)"\s*\)/g;
while ((m = re2.exec(sources)) !== null) wanted.add(m[1]);

const present = new Set();
const re3 = /id="([^"]+)"/g;
while ((m = re3.exec(html)) !== null) present.add(m[1]);

for (const id of wanted) {
    ok(present.has(id), "the markup has #" + id);
}

/* ---------- every script the page loads exists ---------- */

const scripts = [];
const re4 = /<script src="([^"]+)"><\/script>/g;
while ((m = re4.exec(html)) !== null) scripts.push(m[1]);
ok(scripts.length >= 20, "the page loads every module (" + scripts.length + " scripts)");
for (const src of scripts) {
    /* path.join resolves the ".." in the shared library for us. */
    ok(fs.existsSync(path.join(ROOT, src)), "the page's script exists: " + src);
}

/* ---------- the service worker precaches every module ---------- */

const sw = fs.readFileSync(path.join(ROOT, "service-worker.js"), "utf8");
for (const src of scripts) {
    if (src.startsWith("../")) continue;
    ok(sw.includes(src), "the service worker precaches " + src);
}
ok(sw.includes('"../shared/arcade.js"'), "the service worker precaches the shared library");

/* ---------- the manifest is complete ---------- */

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
ok(!!manifest.name && !!manifest.short_name, "the manifest has a name");
ok(manifest.display === "standalone", "the manifest is a standalone app");
ok(manifest.icons.length >= 4, "the manifest has a full icon set");
ok(manifest.icons.some((i) => i.purpose === "maskable"), "the manifest has a maskable icon");
ok(!!manifest.start_url && !!manifest.scope, "the manifest has a start url and a scope");
for (const icon of manifest.icons) {
    ok(fs.existsSync(path.join(ROOT, icon.src)), "the manifest icon exists: " + icon.src);
}

/* ---------- the page declares its state ---------- */

ok(/<html lang="en">/.test(html), "the document declares a language");
ok(/rel="manifest"/.test(html), "the document links its manifest");
ok(/name="description"/.test(html), "the document has a description");
ok(/og:title/.test(html) && /og:image/.test(html), "the document has social metadata");
ok(/application\/ld\+json/.test(html), "the document has structured data");
ok(/VideoGame/.test(html), "the structured data is a game");

/* ---------- accessibility ---------- */

/* Every control has a name. The audit in tools/audit checks this in a
 * browser, but the check is cheap enough to run here too, and it fails
 * earlier. */
const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/g) || [];
ok(buttons.length >= 10, "the screens have buttons (" + buttons.length + ")");
for (const b of buttons) {
    const id = (b.match(/id="([^"]+)"/) || [])[1];
    const labelled = /aria-label=/.test(b) || /<[^>]+>[^<]*\w[^<]*</.test(b);
    ok(labelled, "the button " + (id || b.slice(0, 40)) + " has a name");
}

/* The canvas is described. */
ok(/<canvas id="game-canvas"[^>]*aria-label="[^"]+"/.test(html), "the canvas has a label");

/* Every screen has a heading, so a screen reader can announce it. */
const screens = html.match(/<section id="screen-[^"]+"/g) || [];
ok(screens.length >= 6, "there are several screens (" + screens.length + ")");
for (const s of screens) {
    const id = (s.match(/id="([^"]+)"/) || [])[1];
    const open = html.indexOf(s);
    const close = html.indexOf("</section>", open);
    const body = html.slice(open, close);
    ok(/<h[12][ >]/.test(body), "the screen #" + id + " has a heading");
}

process.exit(report("boot"));
