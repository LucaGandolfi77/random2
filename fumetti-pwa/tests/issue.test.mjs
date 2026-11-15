import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ISSUES, validateIssue } from "../src/comics.js";
import { ART_VOCAB } from "../src/art.js";
import {
  clampPage, getIssueProgress, saveIssueProgress, resetIssueProgress
} from "../src/progress.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

test("every issue is structurally valid", () => {
  assert.equal(ISSUES.length, 2);
  ISSUES.forEach((issue) => {
    assert.deepEqual(validateIssue(issue, ART_VOCAB), [], issue.id);
  });
});

test("Sentinelle #1 and #2 are eight pages each and carry text", () => {
  ISSUES.forEach((issue) => {
    assert.equal(issue.pages.length, 8, issue.id);
    let textCount = 0;
    issue.pages.forEach((page) => {
      assert.ok(page.panels.length >= 1, `${issue.id} ${page.id}`);
      page.panels.forEach((panel) => {
        textCount += (panel.balloons || []).filter((item) => item.kind !== "sfx").length;
      });
    });
    assert.ok(textCount >= 55, `${issue.id} only has ${textCount} readable text items`);
  });
});

test("issues have unique ids, numbers and a teaser", () => {
  const ids = new Set();
  const numbers = new Set();
  ISSUES.forEach((issue) => {
    assert.ok(!ids.has(issue.id), `duplicate issue id ${issue.id}`);
    assert.ok(!numbers.has(issue.number), `duplicate issue number ${issue.number}`);
    ids.add(issue.id);
    numbers.add(issue.number);
    assert.ok(issue.end && issue.end.teaser, `${issue.id} has no teaser`);
    assert.ok(issue.coverAlt, `${issue.id} has no coverAlt`);
    assert.ok(issue.genre, `${issue.id} has no genre`);
  });
});

test("the second issue is the sequel promised by the first", () => {
  const second = ISSUES.find((issue) => issue.number === 2);
  assert.ok(second, "issue 2 is missing");
  assert.equal(second.id, "sentinelle-02");
  assert.equal(second.title, "L'uomo senza ombra");
});

test("the manifest is valid JSON and its icons exist", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.lang, "it");
  assert.ok(manifest.icons.length >= 3);
  manifest.icons.forEach((icon) => {
    assert.ok(existsSync(join(root, icon.src)), `missing icon ${icon.src}`);
  });
});

test("the service worker precaches both issues and every shipped module", () => {
  const sw = readFileSync(join(root, "service-worker.js"), "utf8");
  const assets = [...sw.matchAll(/"\.\/([^"]*)"/g)].map((match) => match[1]);
  assert.ok(assets.length >= 12);
  assets.forEach((asset) => {
    const target = asset === "" ? "index.html" : asset;
    assert.ok(existsSync(join(root, target)), `service worker references missing ${target}`);
  });
  [
    "src/art-core.js", "src/art-backgrounds.js", "src/art-characters.js",
    "src/art-fx.js", "src/issues/sentinelle-01.js", "src/issues/sentinelle-02.js"
  ].forEach((file) => {
    assert.ok(assets.includes(file), `precache is missing ${file}`);
  });
  assert.match(sw, /fumetti-pwa-v2/);
});

test("reading progress is clamped and independent per issue", () => {
  assert.equal(clampPage(0, 8), 1);
  assert.equal(clampPage(99, 8), 8);
  assert.equal(clampPage("4", 8), 4);
  assert.equal(clampPage("nope", 8), 1);

  const storage = memoryStorage();
  const first = ISSUES[0];
  const second = ISSUES[1];
  assert.deepEqual(getIssueProgress(first.id, 8, storage), { page: 1, completed: false, updatedAt: 0 });
  saveIssueProgress(first.id, { page: 5, completed: false }, 8, storage);
  saveIssueProgress(second.id, { page: 3, completed: false }, 8, storage);
  assert.equal(getIssueProgress(first.id, 8, storage).page, 5);
  assert.equal(getIssueProgress(second.id, 8, storage).page, 3);
  saveIssueProgress(second.id, { page: 99, completed: true }, 8, storage);
  assert.deepEqual(
    {
      page: getIssueProgress(second.id, 8, storage).page,
      completed: getIssueProgress(second.id, 8, storage).completed
    },
    { page: 8, completed: true }
  );
  assert.equal(getIssueProgress(first.id, 8, storage).page, 5);
  resetIssueProgress(second.id, storage);
  assert.equal(getIssueProgress(second.id, 8, storage).page, 1);
  assert.equal(getIssueProgress(first.id, 8, storage).page, 5);
});
