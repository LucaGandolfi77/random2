import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("manifest is valid and every icon exists", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.name, "PocketCode");
  assert.equal(manifest.display, "standalone");
  assert.match(manifest.start_url, /^\.\//);
  assert.match(manifest.scope, /^\.\//);
  assert.ok(manifest.icons.length >= 4);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(root, icon.src)), `missing ${icon.src}`);
  }
});

test("service worker precaches the whole app shell", () => {
  const sw = read("service-worker.js");
  const match = sw.match(/const SHELL = \[([\s\S]*?)\];/);
  assert.ok(match, "SHELL list not found");
  const shell = [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
  assert.ok(shell.includes("./index.html"));
  assert.ok(shell.includes("./styles.css"));
  for (const file of readdirSync(join(root, "src")).filter((name) => name.endsWith(".js"))) {
    assert.ok(shell.includes(`./src/${file}`), `SHELL missing src/${file}`);
  }
  for (const file of shell) {
    assert.ok(existsSync(join(root, file)), `SHELL file missing on disk: ${file}`);
  }
  assert.match(sw, /request\.method !== "GET"/);
  assert.match(sw, /includes\("\/api\/"\)/);
});

test("page loads no third-party scripts or styles", () => {
  const html = read("index.html");
  const external = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((entry) => entry[1]);
  assert.deepEqual(external, []);
  assert.match(html, /<link rel="manifest" href="manifest\.json">/);
  assert.match(html, /viewport-fit=cover/);
});

test("PWA modules do not use a build step or packages", () => {
  assert.equal(existsSync(join(root, "package-lock.json")), false);
  const app = read("src/app.js");
  assert.match(app, /serviceWorker\.register\("\.\/service-worker\.js"\)/);
  assert.doesNotMatch(app, /import .* from "https?:/);
});
