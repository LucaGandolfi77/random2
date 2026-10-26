import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const modules = ["main.js", "render.js", "engine.js", "path.js", "board.js", "quantize.js", "artworks.js", "image-import.js"];

function read(name) {
  return readFileSync(resolve(root, name), "utf8");
}

test("the manifest is valid and points at real icons", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.match(manifest.name, /Pixel Ants/);
  assert.ok(manifest.icons.length >= 2);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(resolve(root, icon.src)), icon.src + " is missing");
    assert.match(icon.type, /^image\//);
  }
});

test("the page links the manifest and loads the shared arcade library", () => {
  const html = read("index.html");
  assert.match(html, /rel="manifest"/);
  assert.match(html, /shared\/arcade\.js/);
  assert.match(html, /src\/main\.js/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /sceneCanvas/);
  assert.match(html, /id="detail"/);
  assert.match(html, /data-detail="fine"/);
  assert.match(html, /data-detail="ultra"/);
});

test("every service-worker asset exists", () => {
  const sw = read("service-worker.js");
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(block, "ASSETS array not found");
  const files = [...block[1].matchAll(/"(\.[^"]+)"/g)].map((match) => match[1]);
  assert.ok(files.length >= 12);
  for (const file of files) {
    if (file.endsWith("/")) continue;
    assert.ok(existsSync(resolve(root, file)), file + " is missing");
  }
});

test("every relative import in the browser modules resolves", () => {
  const dir = resolve(root, "src");
  for (const file of modules) {
    const source = readFileSync(resolve(dir, file), "utf8");
    for (const match of source.matchAll(/from\s+"(\.[^"]+)"/g)) {
      assert.ok(existsSync(resolve(dir, match[1])), file + " imports missing " + match[1]);
    }
  }
});
