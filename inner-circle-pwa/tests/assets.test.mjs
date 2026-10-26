import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("the manifest is valid, installable and points at both icons", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait");
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  assert.equal(manifest.icons.length, 2);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(root, icon.src)), icon.src + " should exist");
    assert.match(icon.type, /image\/svg\+xml/);
  }
});

test("index.html links the manifest, icons and the shared arcade", () => {
  const html = read("index.html");
  assert.match(html, /rel="manifest" href="manifest\.json"/);
  assert.match(html, /icons\/icon-192\.svg/);
  assert.match(html, /\.\.\/shared\/arcade\.js/);
  assert.match(html, /type="module" src="src\/main\.js"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /viewport-fit=cover/);
});

test("the service worker precaches every local module in the shell", () => {
  const sw = read("service-worker.js");
  const modules = [
    "src/main.js",
    "src/engine.js",
    "src/roster.js",
    "src/faces.js",
    "src/portrait.js",
    "src/render.js",
    "src/postcard.js",
    "src/chat.js",
    "src/dare.js",
    "src/wrapped.js",
  ];
  for (const module of modules) {
    assert.ok(existsSync(join(root, module)), module + " should exist");
    assert.match(sw, new RegExp(module.replace(/[./]/g, "\\$&")), module + " should be precached");
  }
  assert.match(sw, /\.\.\/shared\/arcade\.js/);
  assert.match(sw, /icons\/icon-192\.svg/);
  assert.match(sw, /icons\/icon-512\.svg/);
  assert.doesNotMatch(sw, /inner-circle-squad-v1|data:image/);
});

test("the README documents the local-only photo pipeline", () => {
  const readme = read("README.md");
  assert.match(readme, /Photos are decoded in the tab/i);
  assert.match(readme, /never uploaded|never sent anywhere/i);
  assert.match(readme, /node --test inner-circle-pwa\/tests/);
});

test("the game ships no binary art assets", () => {
  const manifest = JSON.parse(read("manifest.json"));
  for (const icon of manifest.icons) {
    assert.ok(!/\.(png|jpe?g|webp|gif)$/i.test(icon.src), "icons should stay vector");
  }
  assert.ok(!existsSync(join(root, "assets")), "no asset folder is needed");
});
