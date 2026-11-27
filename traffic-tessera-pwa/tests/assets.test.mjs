import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = name => readFileSync(resolve(root, name), "utf8");

test("manifest and PNG icons are valid", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some(icon => icon.purpose === "maskable"));
  for (const icon of manifest.icons) {
    assert.ok(existsSync(resolve(root, icon.src)));
    assert.deepEqual([...readFileSync(resolve(root, icon.src)).subarray(0, 4)], [137, 80, 78, 71]);
  }
});

test("service worker is namespaced and every cached asset exists", () => {
  const worker = read("service-worker.js");
  assert.match(worker, /traffic-tessera-v2/);
  assert.match(worker, /startsWith\("traffic-tessera-"\)/);
  const assets = worker.match(/const ASSETS = \[([\s\S]*?)\];/);
  for (const match of assets[1].matchAll(/"(\.[^"]+)"/g)) {
    if (match[1].endsWith("/")) continue;
    assert.ok(existsSync(resolve(root, match[1])), match[1]);
  }
});

test("all local module imports resolve", () => {
  const directory = resolve(root, "src");
  for (const file of readdirSync(directory).filter(name => name.endsWith(".js"))) {
    const source = readFileSync(resolve(directory, file), "utf8");
    for (const match of source.matchAll(/from\s+"(\.[^"]+)"/g)) {
      assert.ok(existsSync(resolve(directory, match[1])), `${file}: ${match[1]}`);
    }
  }
});

test("page has install metadata and no remote runtime assets", () => {
  const html = read("index.html");
  assert.match(html, /rel="manifest"/);
  assert.match(html, /id="gameCanvas"/);
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
});
