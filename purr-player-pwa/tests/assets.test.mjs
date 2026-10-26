import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (name) => readFileSync(join(root, name), "utf8");

test("the manifest is valid and points at real icons", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.lang, "it");
  assert.ok(manifest.icons.length >= 2);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(root, icon.src)), "missing icon " + icon.src);
  }
});

test("the page links the manifest and the theme colour", () => {
  const html = read("index.html");
  assert.match(html, /<link rel="manifest" href="manifest\.json">/);
  assert.match(html, /<meta name="theme-color"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /src="icons\/cat-bg\.jpg"/);
});

test("every precached asset exists", () => {
  const sw = read("service-worker.js");
  const block = /const ASSETS = \[([\s\S]*?)\];/.exec(sw);
  assert.ok(block, "ASSETS list not found");
  const assets = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(assets.includes("./index.html"));
  assert.ok(assets.includes("./src/main.js"));
  assert.ok(assets.includes("./icons/cat-bg.jpg"));
  for (const asset of assets) {
    if (asset === "./") continue;
    assert.ok(existsSync(join(root, asset.replace(/^\.\//, ""))), "missing " + asset);
  }
});

test("the shell loads no remote resources", () => {
  const files = ["index.html", "styles.css", "src/main.js", "src/player.js", "src/db.js", "src/format.js"];
  for (const file of files) {
    const text = read(file);
    assert.doesNotMatch(text, /(?:src|href)=["']https?:\/\//i, file + " loads a remote asset");
    assert.doesNotMatch(text, /import\s+[^"']*["']https?:\/\//i, file + " imports a remote module");
  }
});

test("the service worker cache name belongs to this app", () => {
  const sw = read("service-worker.js");
  assert.match(sw, /const CACHE_NAME = "purr-player-v1"/);
});
