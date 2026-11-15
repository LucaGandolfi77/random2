#!/usr/bin/env node
/*
 * Production smoke test with no dependencies outside the repository's
 * DevTools Protocol client. Serves dist/, drives the real UI in headless
 * Chromium, then verifies the service worker can boot the shell offline.
 *
 * Run `npm run build && npm run smoke`. If Chromium is unavailable the test
 * prints SKIP and exits 0, matching the repository's other browser tests.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from '../../tools/cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = 4282;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE_PATH = '/whiteout-survival-pwa/';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html is missing. Run `npm run build` first.');
  process.exit(1);
}

let server;
let browser;

function serve() {
  server = createServer((request, response) => {
    try {
      const url = new URL(request.url ?? '/', ORIGIN);
      if (!url.pathname.startsWith(BASE_PATH)) {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('not found');
        return;
      }
      const relativePath = url.pathname.slice(BASE_PATH.length);
      let file = join(DIST, decodeURIComponent(relativePath));
      if (file.endsWith(sep) || relativePath === '') file = join(file, 'index.html');
      if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('not found');
        return;
      }
      const body = readFileSync(file);
      response.writeHead(200, {
        'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(500);
      response.end('server error');
    }
  });
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', resolvePromise);
  });
}

function fail(message) {
  throw new Error(message);
}

async function main() {
  await serve();
  browser = await launch();
  if (!browser) {
    console.log('SKIP: no Chromium available');
    return;
  }
  const { cdp, sessionId } = browser;
  const errors = [];
  let intentionallyOffline = false;

  cdp.on('Runtime.exceptionThrown', (params) => {
    errors.push(params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text ?? 'exception');
  });
  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (params.type !== 'error') return;
    const text = params.args?.map((arg) => arg.value ?? arg.description ?? '').join(' ');
    if (intentionallyOffline && /ERR_INTERNET_DISCONNECTED|Failed to fetch|net::/.test(text)) return;
    errors.push(text);
  });

  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);
  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
    sessionId,
  );

  async function evaluate(expression, awaitPromise = false) {
    const result = await cdp.send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise },
      sessionId,
    );
    if (result.exceptionDetails) {
      throw new Error(
        `page evaluation failed: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`,
      );
    }
    return result.result.value;
  }

  async function waitFor(expression, timeout = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(`Boolean(${expression})`)) return true;
      await sleep(150);
    }
    return false;
  }

  async function clickByText(selector, text, root = 'document') {
    const clicked = await evaluate(`(() => {
      const nodes = Array.from(${root}.querySelectorAll(${JSON.stringify(selector)}));
      const node = nodes.find((entry) => entry.textContent.trim().includes(${JSON.stringify(text)}));
      if (!node) return false;
      node.click();
      return true;
    })()`);
    if (!clicked) fail(`could not find ${selector} containing "${text}"`);
  }

  await cdp.send('Page.navigate', { url: `${ORIGIN}${BASE_PATH}` }, sessionId);
  if (!(await waitFor(`document.querySelector('.game-shell')`, 8000))) fail('app shell did not boot');
  if (!(await waitFor(`document.querySelector('.modal-panel')`, 3000))) fail('onboarding did not open');

  await clickByText('button', 'Skip', 'document');
  await sleep(500);
  if (!(await waitFor(`document.querySelector('.city-scene')`))) fail('city scene missing');
  const tabCount = await evaluate(`document.querySelectorAll('.nav-tab').length`);
  if (tabCount !== 4) fail(`expected 4 navigation tabs, found ${tabCount}`);
  const layout = await evaluate(`({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    canvasPainted: (() => {
      const canvas = document.querySelector('.city-canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const pixel = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
      return pixel[3] > 0;
    })()
  })`);
  if (layout.scrollWidth > layout.width) fail(`horizontal overflow: ${layout.scrollWidth}px in a ${layout.width}px viewport`);
  if (!layout.canvasPainted) fail('settlement canvas has no painted pixels');
  console.log('OK  onboarding, canvas and portrait layout');

  // Every tab is reachable from the bottom bar.
  for (const [tab, marker] of [['Survivors', 'Choose a decree'], ['Heroes', 'The Whistling Pines'], ['Tech', 'Research'], ['City', 'The settlement']]) {
    await evaluate(`Array.from(document.querySelectorAll('.nav-tab')).find((button) => button.textContent.includes(${JSON.stringify(tab)})).click()`);
    await sleep(280);
    const content = await evaluate(`document.querySelector('.game-scroll')?.innerText ?? ''`);
    if (!content.includes(marker)) fail(`${tab} tab did not render "${marker}"`);
  }
  console.log('OK  all four tabs render');

  // Furnace upgrade, then the coal mine it unlocks.
  await evaluate(`document.querySelector('.furnace-summary').click()`);
  if (!(await waitFor(`document.querySelector('.modal-panel-sheet')`, 2500))) fail('furnace sheet did not open');
  await clickByText('button', 'Upgrade to 2', 'document.querySelector(".modal-panel")');
  await sleep(400);
  const furnaceSheet = await evaluate(`document.querySelector('.modal-panel')?.innerText ?? ''`);
  if (!furnaceSheet.includes('LEVEL 2')) fail('furnace did not upgrade to level 2');
  await evaluate(`document.querySelector('.modal-panel .icon-button[aria-label="Close"]').click()`);
  await sleep(350);

  await sleep(300);
  const coalCardOpened = await evaluate(`(() => {
    const card = Array.from(document.querySelectorAll('.facility-card')).find((entry) => entry.textContent.includes('Coal'));
    if (!card) return false;
    card.querySelector('.facility-card-main')?.click();
    return true;
  })()`);
  if (!coalCardOpened) fail('coal mine card missing after furnace upgrade');
  if (!(await waitFor(`document.querySelector('.modal-panel-sheet')`, 2500))) fail('coal mine sheet did not open');
  await clickByText('button', 'Build Coal', 'document.querySelector(".modal-panel")');
  await sleep(400);
  const afterBuild = await evaluate(`document.querySelector('.modal-panel')?.innerText ?? ''`);
  if (!afterBuild.includes('LEVEL 1')) fail('coal mine did not build');
  await evaluate(`document.querySelector('.modal-panel .icon-button[aria-label="Close"]').click()`);
  console.log('OK  furnace upgrade and coal mine construction');

  // Expedition: deploy, observe real-time combat, then retreat.
  await evaluate(`Array.from(document.querySelectorAll('.nav-tab')).find((button) => button.textContent.includes('Heroes')).click()`);
  await sleep(400);
  await clickByText('button', 'Deploy', 'document');
  if (!(await waitFor(`document.querySelector('.battle-arena')`, 2500))) fail('expedition battle did not start');
  await sleep(1700);
  const logLines = await evaluate(`document.querySelectorAll('.battle-log p').length`);
  if (logLines < 2) fail('auto-battle did not write combat log entries');
  await clickByText('button', 'Retreat', 'document');
  if (!(await waitFor(`document.querySelector('.battle-result')`, 3000))) fail('battle result did not render');
  const battleText = await evaluate(`document.querySelector('.battle-result').innerText`);
  if (!/expedition broken/i.test(battleText)) fail('retreat did not resolve the battle as a defeat');
  console.log('OK  real-time expedition and retreat');

  const saved = await evaluate(`Boolean(localStorage.getItem('whiteout-last-ember-save-v1'))`);
  if (!saved) fail('game save was not written to localStorage');

  const swPath = await evaluate(`(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const result = await Promise.race([
      navigator.serviceWorker.ready.then((registration) => registration.active?.scriptURL ?? 'no-active-worker'),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 6000)),
    ]);
    return result;
  })()`, true);
  if (swPath === 'unsupported') {
    console.log('WARN: service workers unavailable in this browser');
  } else if (swPath === 'timeout' || swPath === 'no-active-worker') {
    fail(`service worker did not activate: ${swPath}`);
  } else if (!swPath.endsWith(`${BASE_PATH}service-worker.js`)) {
    fail(`unexpected service worker path: ${swPath}`);
  }
  if (!(await evaluate(`Boolean(navigator.serviceWorker.controller)`))) {
    await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
    await waitFor(`document.querySelector('.game-shell')`, 6000);
  }
  console.log(`OK  service worker registered (${swPath})`);

  // Offline boot through the real service worker.
  intentionallyOffline = true;
  await cdp.send(
    'Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    sessionId,
  );
  await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
  if (!(await waitFor(`document.querySelector('.game-shell')`, 8000))) fail('offline reload did not boot');
  const offlineHud = await evaluate(`document.querySelector('.hud')?.innerText ?? ''`);
  if (!offlineHud.includes('LAST EMBER')) fail('offline shell rendered without the HUD');
  intentionallyOffline = false;
  await cdp.send(
    'Network.emulateNetworkConditions',
    { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
    sessionId,
  );
  console.log('OK  offline boot through service worker');

  // Put the saved timestamp two minutes in the past and reload to exercise the
  // offline report path end to end.
  await evaluate(`(() => {
    const key = 'whiteout-last-ember-save-v1';
    const raw = JSON.parse(localStorage.getItem(key));
    raw.game.lastSeen = Date.now() - 120000;
    raw.game.tutorialDone = true;
    // The running page saves on pagehide. Block writes to the game key so the
    // seeded old timestamp survives the reload and exercises the boot path.
    const original = Storage.prototype.setItem;
    window.__lastEmberOriginalSetItem = original;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && window.__lastEmberBlockSave) return;
      return original.call(this, name, value);
    };
    original.call(localStorage, key, JSON.stringify(raw));
    window.__lastEmberBlockSave = true;
    return true;
  })()`);
  await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
  if (!(await waitFor(`document.querySelector('.modal-panel-center')`, 6000))) {
    const state = await evaluate(`({
      text: document.body.innerText.slice(0, 600),
      panels: Array.from(document.querySelectorAll('.modal-panel')).map((node) => node.innerText.slice(0, 120)),
      saved: localStorage.getItem('whiteout-last-ember-save-v1')?.slice(0, 180)
    })`);
    console.error(state);
    fail('offline return report did not open');
  }
  const reportText = await evaluate(`document.querySelector('.modal-panel-center').innerText`);
  if (!reportText.includes('While you were gone')) fail('offline return report has the wrong content');
  console.log('OK  offline progress report');

  if (errors.length) {
    console.error('Browser errors:');
    for (const error of errors) console.error(' -', error);
    fail('browser console contained errors');
  }

  console.log('\nPASS  Last Ember production smoke test');
}

try {
  await main();
} catch (error) {
  console.error(`\nFAIL  ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    browser?.close();
  } catch {
    // The CDP helper may race profile cleanup on macOS; the browser is killed.
  }
  if (server) await new Promise((resolvePromise) => server.close(resolvePromise));
}
