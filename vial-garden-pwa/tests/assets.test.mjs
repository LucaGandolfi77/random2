import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(resolve(root, name), "utf8");

test("manifest is complete and all icons exist", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
  for (const icon of manifest.icons) {
    assert.ok(existsSync(resolve(root, icon.src)), icon.src);
    assert.deepEqual([...readFileSync(resolve(root, icon.src)).subarray(0, 4)], [137, 80, 78, 71]);
  }
});

test("service worker is namespaced and every asset exists", () => {
  const sw = read("service-worker.js");
  assert.match(sw, /vial-garden-v1/);
  assert.match(sw, /startsWith\("vial-garden-"\)/);
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  const assets = [...block[1].matchAll(/"(\.[^"]+)"/g)].map((match) => match[1]);
  for (const asset of assets) {
    if (asset.endsWith("/")) continue;
    assert.ok(existsSync(resolve(root, asset)), asset);
  }
});

test("all module imports resolve", () => {
  const dir = resolve(root, "src");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".js"))) {
    const source = readFileSync(resolve(dir, file), "utf8");
    for (const match of source.matchAll(/from\s+"(\.[^"]+)"/g)) {
      assert.ok(existsSync(resolve(dir, match[1])), `${file} imports missing ${match[1]}`);
    }
  }
});

test("page has install metadata and no remote runtime assets", () => {
  const html = read("index.html");
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /id="gameCanvas"/);
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
});
