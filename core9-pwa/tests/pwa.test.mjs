import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) { return readFileSync(join(ROOT, rel), "utf8"); }
function walk(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir + "/" + entry.name;
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

test("the manifest is a valid, installable game manifest", () => {
  const m = JSON.parse(read("manifest.json"));
  assert.equal(m.short_name, "CORE 9");
  assert.equal(m.lang, "en");
  assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "./");
  assert.equal(m.scope, "./");
  assert.ok(m.background_color && m.theme_color);
  assert.ok(m.icons.some((i) => i.sizes === "192x192"));
  assert.ok(m.icons.some((i) => i.sizes === "512x512"));
  assert.ok(m.icons.some((i) => i.purpose === "maskable"));
  for (const icon of m.icons) {
    assert.ok(existsSync(join(ROOT, icon.src)), icon.src);
  }
});

test("the HTML links the manifest, the stylesheet and the module entry", () => {
  const html = read("index.html");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /rel="manifest" href="manifest.json"/);
  assert.match(html, /<link rel="stylesheet" href="styles.css">/);
  assert.match(html, /src="\.\.\/shared\/arcade\.js"/);
  assert.match(html, /type="module" src="src\/main\.js"/);
  assert.match(html, /id="game"/);
  assert.match(html, /id="intro"/);
});

test("the service worker precaches every source module and icon", () => {
  const sw = read("service-worker.js");
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(block, "ASSETS block");
  const assets = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const set = new Set(assets);
  const required = [
    "./", "./index.html", "./styles.css", "./manifest.json",
    "../shared/arcade.js",
    "./icons/icon-192.svg", "./icons/icon-192.png",
    "./icons/icon-512.png", "./icons/icon-512-maskable.png",
  ];
  for (const rel of required) assert.ok(set.has(rel), rel);
  for (const file of walk("src")) {
    if (file.endsWith(".js")) {
      assert.ok(set.has("./" + file.split("/").join("/")), "missing from precache: " + file);
    }
  }
  assert.match(sw, /const CACHE = "core9-pwa-v2"/);
});

test("the app loads no binary art and no remote assets", () => {
  const html = read("index.html");
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const links = [...html.matchAll(/<link[^>]+>/g)]
    .filter((m) => /rel="(?:stylesheet|manifest|icon|apple-touch-icon)"/.test(m[0]))
    .map((m) => (m[0].match(/href="([^"]+)"/) || [])[1])
    .filter(Boolean);
  for (const src of [...scripts, ...links]) {
    assert.ok(!/^https?:/i.test(src), "unexpected remote asset " + src);
  }
  const binary = walk(".").filter((f) => /\.(png|jpe?g|gif|webp|avif)$/i.test(f));
  for (const f of binary) {
    assert.match(f, /(^|\/)icons\//, "binary art outside icons/: " + f);
  }
});

test("the PNG icons are real PNGs with the advertised sizes", () => {
  for (const [file, size] of [
    ["icons/icon-192.png", 192],
    ["icons/icon-512.png", 512],
    ["icons/icon-512-maskable.png", 512],
  ]) {
    const buf = readFileSync(join(ROOT, file));
    assert.equal(buf.readUInt32BE(0), 0x89504e47, file + " signature");
    assert.equal(buf.readUInt32BE(16), size, file + " width");
    assert.equal(buf.readUInt32BE(20), size, file + " height");
  }
});

test("every source file is syntactically present and non-trivial", () => {
  const files = walk(".").filter((f) => f.endsWith(".js"));
  assert.ok(files.length >= 10);
  for (const file of files) {
    const text = read(file);
    assert.ok(text.length > 80, file);
    assert.ok(!text.includes("http://"), file + " contains a remote URL");
  }
});
