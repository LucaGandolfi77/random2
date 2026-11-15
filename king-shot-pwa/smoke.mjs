import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from '../tools/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots');
const url = process.argv[2] || 'http://localhost:8099/king-shot-pwa/';

const browser = await launch();
if (!browser) {
  console.log('SMOKE SKIPPED — no Chromium found.');
  process.exit(0);
}

const { cdp, sessionId } = browser;
let checks = 0;
let failures = 0;
const errors = [];

function ok(condition, label, extra) {
  checks++;
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${extra === undefined ? '' : `  (${extra})`}`);
  }
}

async function evaluate(expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  return result.result?.value;
}

async function waitFor(expression, timeout = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(80);
  }
  return false;
}

async function shot(name) {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  mkdirSync(shots, { recursive: true });
  writeFileSync(join(shots, name), Buffer.from(result.data, 'base64'));
}

cdp.on('Runtime.exceptionThrown', (params) => {
  errors.push(
    params.exceptionDetails?.exception?.description ||
      params.exceptionDetails?.text ||
      'uncaught exception'
  );
});
cdp.on('Runtime.consoleAPICalled', (params) => {
  if (params.type === 'error') {
    errors.push(params.args.map((arg) => arg.value || arg.description).join(' '));
  }
});

await cdp.send('Page.enable', {}, sessionId);
await cdp.send('Runtime.enable', {}, sessionId);
await cdp.send('Network.enable', {}, sessionId);
await cdp.send(
  'Emulation.setDeviceMetricsOverride',
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  sessionId
);
await cdp.send('Page.navigate', { url }, sessionId);
await sleep(1200);

ok(await waitFor('!!window.KS'), 'the game module boots');
ok(await evaluate(`document.querySelector('#screen-menu')?.classList.contains('is-active')`), 'the menu is shown');
ok(await evaluate(`document.body.dataset.phase === 'menu'`), 'the menu phase is active');
ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), 'the menu has no horizontal overflow');

const pixels = await evaluate(`(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let lit = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] + data[i + 1] + data[i + 2] > 40) lit++;
  }
  return { lit, width: canvas.width, height: canvas.height };
})()`);
ok(pixels?.lit > 1000, 'the attract scene is drawn', `${pixels?.lit} lit pixels`);
ok(pixels?.width >= 390, 'the canvas has a real backing buffer', `${pixels?.width}x${pixels?.height}`);
await shot('title.png');

await evaluate(`document.querySelector('[data-action="open-oath"]').click()`);
await sleep(250);
ok(await evaluate(`document.querySelector('#screen-oath')?.classList.contains('is-active')`), 'the oath screen opens');
await evaluate(`document.querySelector('[data-oath="knight"]').click()`);
await sleep(550);
ok(await evaluate(`window.KS.phase === 'playing'`), 'the Knight oath starts a run');
ok(await evaluate(`document.getElementById('hud').getAttribute('aria-hidden') === 'false'`), 'the HUD is visible in play');
ok(await evaluate(`window.KS.run.oath === 'knight' && window.KS.run.hp === 5`), 'the Knight has five hearts');

await sleep(900);
const canvasBox = await evaluate(`(() => {
  const r = document.getElementById('game').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
await cdp.send(
  'Input.dispatchMouseEvent',
  {
    type: 'mousePressed',
    x: canvasBox.x + canvasBox.width * 0.5,
    y: canvasBox.y + canvasBox.height * 0.72,
    button: 'left',
    buttons: 1,
    clickCount: 1
  },
  sessionId
);
await cdp.send(
  'Input.dispatchMouseEvent',
  {
    type: 'mouseMoved',
    x: canvasBox.x + canvasBox.width * 0.68,
    y: canvasBox.y + canvasBox.height * 0.32,
    button: 'left',
    buttons: 1
  },
  sessionId
);
await sleep(120);
await cdp.send(
  'Input.dispatchMouseEvent',
  {
    type: 'mouseReleased',
    x: canvasBox.x + canvasBox.width * 0.68,
    y: canvasBox.y + canvasBox.height * 0.32,
    button: 'left',
    buttons: 0,
    clickCount: 1
  },
  sessionId
);
await sleep(300);
ok(await evaluate('window.KS.run.stats.shots >= 1'), 'a drag-and-release fires an arrow');
ok(await evaluate('window.KS.run.arrows.length + window.KS.run.stats.hits >= 0'), 'the shot resolves without throwing');
await shot('play.png');

await evaluate('window.KS.clearWave()');
await sleep(350);
ok(await evaluate(`window.KS.phase === 'draft'`), 'a cleared wave opens the draft');
ok(await evaluate(`document.querySelectorAll('.draft-card').length === 3`), 'the draft offers three decrees');
await shot('draft.png');
await evaluate(`document.querySelector('.draft-card')?.click()`);
await sleep(400);
ok(await evaluate(`window.KS.phase === 'playing' && window.KS.run.wave === 2`), 'choosing a decree advances the wave');
ok(await evaluate(`Object.keys(window.KS.run.upgrades).length >= 1`), 'the chosen upgrade is in the run');

await evaluate(`document.getElementById('pause-btn').click()`);
await sleep(250);
ok(await evaluate(`document.querySelector('#screen-pause')?.classList.contains('is-active')`), 'pause opens');
await evaluate(`document.querySelector('[data-action="resume"]').click()`);
await sleep(250);
ok(await evaluate(`window.KS.phase === 'playing'`), 'resume returns to play');

await evaluate('window.KS.endRun()');
await sleep(450);
ok(await evaluate(`document.querySelector('#screen-over')?.classList.contains('is-active')`), 'the result screen opens');
ok(await evaluate(`document.getElementById('over-score').textContent.length > 0`), 'the result shows a score');
ok(await evaluate(`document.getElementById('over-stats').children.length === 6`), 'the result shows six stats');
await shot('over.png');

await evaluate(`document.querySelector('.screen.is-active [data-action="back-menu"]').click()`);
await sleep(250);
ok(await evaluate(`window.KS.phase === 'menu'`), 'the result returns to the menu');

await evaluate(`document.querySelector('[data-action="open-daily"]').click()`);
await sleep(200);
ok(await evaluate(`document.querySelector('#screen-daily')?.classList.contains('is-active')`), 'the daily screen opens');
await evaluate(`document.querySelector('[data-action="start-daily"]').click()`);
await sleep(500);
ok(await evaluate(`window.KS.run.daily === true`), 'the daily starts');
ok(await evaluate(`window.KS.run.oath === 'knight'`), 'the daily uses the Knight oath');
ok(await evaluate(`/^\\d{4}-\\d{2}-\\d{2}$/.test(window.KS.run.dateKey)`), 'the daily has a date key');
await evaluate('window.KS.endRun()');
await sleep(350);
ok(await evaluate(`!document.getElementById('over-daily').classList.contains('is-hidden')`), 'the result labels the daily');
await evaluate(`document.querySelector('.screen.is-active [data-action="back-menu"]').click()`);
await sleep(250);

await cdp.send(
  'Emulation.setDeviceMetricsOverride',
  { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
  sessionId
);
await cdp.send('Page.navigate', { url }, sessionId);
await sleep(900);
ok(await evaluate(`document.getElementById('screen-menu')?.classList.contains('is-active')`), 'the desktop menu renders');
ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), 'the desktop menu has no overflow');
await shot('desktop.png');

await evaluate(`document.querySelector('[data-action="open-settings"]').click()`);
await sleep(200);
ok(await evaluate(`document.querySelectorAll('[data-setting]').length === 5`), 'all five settings are present');
await evaluate(`document.querySelector('[data-theme="forest"]').click()`);
await sleep(200);
ok(await evaluate(`document.documentElement.dataset.theme === 'forest'`), 'the theme changes');
await cdp.send('Page.reload', {}, sessionId);
await sleep(900);
ok(await evaluate(`document.documentElement.dataset.theme === 'forest'`), 'the theme survives a reload');

await evaluate(`document.querySelector('[data-action="open-settings"]').click()`);
await sleep(160);
await evaluate(`document.querySelector('[data-theme="royal"]').click()`);
await sleep(160);
ok(await evaluate(`document.documentElement.dataset.theme === 'royal'`), 'the royal theme restores');
await evaluate(`document.querySelector('.screen.is-active [data-action="back-menu"]').click()`);
await sleep(160);

const controlled = await evaluate(`navigator.serviceWorker?.controller != null`);
ok(controlled, 'the service worker controls the page');

await cdp.send(
  'Network.emulateNetworkConditions',
  { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
  sessionId
);
await cdp.send('Page.reload', {}, sessionId);
await sleep(1400);
ok(await evaluate(`document.querySelector('#screen-menu')?.classList.contains('is-active')`), 'the offline shell reloads');
ok(await evaluate(`!!window.KS`), 'the offline game module boots');
await cdp.send(
  'Network.emulateNetworkConditions',
  { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
  sessionId
);

await cdp.send('Page.navigate', { url: `${url}?daily=1` }, sessionId);
await sleep(700);
ok(await evaluate(`document.querySelector('#screen-daily')?.classList.contains('is-active')`), 'the daily shortcut opens the daily screen');
await cdp.send('Page.navigate', { url: `${url}?play=1` }, sessionId);
await sleep(700);
ok(await evaluate(`document.querySelector('#screen-oath')?.classList.contains('is-active')`), 'the play shortcut opens the oath screen');

ok(errors.length === 0, 'no console exceptions', errors.slice(0, 3).join(' | '));

console.log(`\n${checks - failures}/${checks} checks passed.`);
try {
  browser.close();
} catch {}
process.exit(failures === 0 ? 0 : 1);
