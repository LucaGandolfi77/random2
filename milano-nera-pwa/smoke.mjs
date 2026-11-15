import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from '../tools/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots');
const url = process.argv[2] || 'http://localhost:8099/milano-nera-pwa/';
const browser = await launch();
if (!browser) {
  console.log('SMOKE SKIPPED — no Chromium found.');
  process.exit(0);
}
const { cdp, sessionId } = browser;
let checks = 0;
let failures = 0;
const errors = [];
const ok = (condition, label, extra) => {
  checks++;
  if (condition) console.log(`  ok   ${label}`);
  else {
    failures++;
    console.log(`  FAIL ${label}${extra === undefined ? '' : `  (${extra})`}`);
  }
};
const evaluate = async (expression) => {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  return result.result?.value;
};
const waitFor = async (expression, timeout = 4000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(80);
  }
  return false;
};
const shot = async (name) => {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  mkdirSync(shots, { recursive: true });
  writeFileSync(join(shots, name), Buffer.from(result.data, 'base64'));
};
const key = async (value, code, keyCode) => {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code, windowsVirtualKeyCode: keyCode }, sessionId);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code, windowsVirtualKeyCode: keyCode }, sessionId);
};

cdp.on('Runtime.exceptionThrown', (params) => errors.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text));
cdp.on('Runtime.consoleAPICalled', (params) => {
  if (params.type === 'error') errors.push(params.args.map((arg) => arg.value || arg.description).join(' '));
});

await cdp.send('Page.enable', {}, sessionId);
await cdp.send('Runtime.enable', {}, sessionId);
await cdp.send('Network.enable', {}, sessionId);
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url }, sessionId);
await sleep(1100);

ok(await waitFor('!!window.MN'), 'the game module boots');
ok(await evaluate(`document.querySelector('#screen-title')?.classList.contains('is-active')`), 'the title screen is shown');
ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), 'the title has no horizontal overflow');
const pixels = await evaluate(`(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let lit = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 40) lit++;
  return { lit, width: canvas.width, height: canvas.height };
})()`);
ok(pixels?.lit > 1000, 'the title backdrop is drawn', `${pixels?.lit} lit pixels`);
ok(pixels?.width === 384 && pixels?.height === 216, 'the low-res canvas is 384x216');
await shot('title.png');

await evaluate(`document.querySelector('[data-action="new-game"]').click()`);
await sleep(250);
ok(await evaluate(`document.querySelector('#screen-intro')?.classList.contains('is-active')`), 'the chapter intro opens');
await shot('intro.png');
await evaluate(`document.querySelector('[data-action="enter-chapter"]').click()`);
await sleep(500);
ok(await evaluate(`window.MN.phase === 'playing'`), 'the first chapter starts');
ok(await evaluate(`window.MN.state.chapterId === 1 && window.MN.state.enemies.length > 0`), 'chapter one has enemies');
ok(await evaluate(`document.getElementById('hud').getAttribute('aria-hidden') === 'false'`), 'the HUD is visible in play');
await sleep(1700);
await shot('play.png');

const box = await evaluate(`(() => {
  const r = document.getElementById('game').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
const camera = await evaluate(`window.MN.state.camera`);
const mouseX = box.x + (190 - camera.x) / 384 * box.width;
const mouseY = box.y + (150 - camera.y) / 216 * box.height;
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mouseX, y: mouseY }, sessionId);
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mouseX, y: mouseY, button: 'left', buttons: 1, clickCount: 1 }, sessionId);
await sleep(420);
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mouseX, y: mouseY, button: 'left', buttons: 0, clickCount: 1 }, sessionId);
await sleep(200);
ok(await evaluate(`window.MN.state.stats.shots >= 1`), 'mouse fire spends ammo');
ok(await evaluate(`window.MN.state.player.ammo < 8`), 'ammo decreases');

await key('p', 'KeyP', 80);
await sleep(250);
ok(await evaluate(`window.MN.phase === 'paused'`), 'P opens the pause screen');
await key('p', 'KeyP', 80);
await sleep(250);
ok(await evaluate(`window.MN.phase === 'playing'`), 'P resumes play');

await evaluate(`window.MN.state.enemies = []; window.MN.state.objective.done = true; window.MN.state.exitOpen = true; window.MN.state.player.x = window.MN.state.level.exit.x + 8; window.MN.state.player.y = window.MN.state.level.exit.y + 8; document.getElementById('game').focus();`);
for (let attempt = 0; attempt < 3; attempt++) {
  if (await evaluate(`window.MN.phase === 'result'`)) break;
  await key('e', 'KeyE', 69);
  await sleep(350);
}
ok(await waitFor(`window.MN.phase === 'result'`), 'the chapter result opens');
ok(await evaluate(`!document.getElementById('result-next').classList.contains('is-hidden')`), 'the next chapter button is visible');
ok(await evaluate(`document.getElementById('result-rank').textContent !== ''`), 'the result shows a rank');
await shot('result.png');

await evaluate(`document.querySelector('[data-action="next-chapter"]').click()`);
await sleep(250);
ok(await evaluate(`window.MN.phase === 'intro'`), 'next opens the following intro');
await evaluate(`window.MN.beginChapter(3)`);
await sleep(2100);
ok(await evaluate(`window.MN.state.chapterId === 3 && window.MN.state.level.id === 'metro'`), 'chapter three is the Metrò');
ok(await evaluate(`window.MN.state.hazards.length === 1`), 'the Metrò has a train hazard');
await evaluate(`window.MN.state.hazards[0].time = 0; window.MN.state.hazards[0].wasWarning = false;`);
await sleep(250);
ok(await evaluate(`document.getElementById('train-warning').classList.contains('is-visible')`), 'the train warning reaches the HUD');
await shot('metro.png');

await evaluate(`window.MN.beginChapter(4)`);
await sleep(1900);
ok(await evaluate(`window.MN.state.chapterId === 4 && window.MN.state.level.id === 'parco'`), 'chapter four is Parco Lambro');
ok(await evaluate(`window.MN.state.boss?.name === 'La Iena'`), 'La Iena is the Parco boss');
await shot('parco.png');

await evaluate(`window.MN.beginChapter(5)`);
await sleep(1900);
ok(await evaluate(`window.MN.state.mode === 'chase'`), 'chapter five starts with the chase');
ok(await evaluate(`document.getElementById('chase-panel').classList.contains('is-visible')`), 'the chase HUD is visible');
await shot('chase.png');
await evaluate(`window.MN.state.chase.enemy.hp = 1; window.MN.state.chase.bullets.push({ x: window.MN.state.chase.enemy.x - 6, y: window.MN.state.chase.enemy.y, vx: 300, vy: 0, life: 1, damage: 1, team: 'player', dead: false });`);
await sleep(2100);
ok(await evaluate(`window.MN.phase === 'result' && window.MN.state.chapterId === 5`), 'the chase completes chapter five');
await evaluate(`document.querySelector('[data-action="next-chapter"]').click()`);
await sleep(250);
ok(await evaluate(`window.MN.phase === 'intro'`), 'chapter five opens the Darsena intro');
await evaluate(`document.querySelector('[data-action="enter-chapter"]').click()`);
await sleep(900);
ok(await evaluate(`window.MN.state.chapterId === 6 && window.MN.state.boss?.name === 'Il Bianco'`), 'chapter six is the Darsena finale');
await evaluate(`window.MN.state.flags.bossAnnounced = true;`);
await sleep(120);
ok(await evaluate(`document.getElementById('boss-bar').classList.contains('is-visible')`), 'the final boss bar is visible');
await shot('finale.png');
await evaluate(`window.MN.state.boss.hp = 1; window.MN.state.bullets.push({ x: window.MN.state.boss.x - 8, y: window.MN.state.boss.y, vx: 300, vy: 0, life: 1, damage: 5, team: 'player', dead: false });`);
await sleep(700);
ok(await evaluate(`window.MN.phase === 'result'`), 'the final boss opens the result screen');
await evaluate(`document.querySelector('[data-action="next-chapter"]').click()`);
await sleep(350);
ok(await evaluate(`document.querySelector('#screen-ending')?.classList.contains('is-active')`), 'the ending screen opens');
await shot('ending.png');

await evaluate(`window.MN.showTitle()`);
await sleep(250);
await evaluate(`document.querySelector('[data-action="open-settings"]').click()`);
await sleep(250);
ok(await evaluate(`document.querySelector('#screen-settings')?.classList.contains('is-active')`), 'settings open');
await evaluate(`document.querySelector('[data-setting="reducedMotion"]').click()`);
await sleep(120);
ok(await evaluate(`document.querySelector('[data-setting="reducedMotion"]').getAttribute('aria-checked') === 'true'`), 'reduced motion toggles');
await evaluate(`document.querySelector('[data-action="back-title"]').click()`);
await sleep(250);
await evaluate(`window.MN.showChapters()`);
await sleep(250);
ok(await evaluate(`document.querySelectorAll('.chapter-card').length === 6`), 'chapter select lists six chapters');
await shot('chapters.png');

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.reload', {}, sessionId);
await sleep(900);
ok(await evaluate(`document.querySelector('#screen-title')?.classList.contains('is-active')`), 'the desktop title renders');
await shot('desktop.png');

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.reload', {}, sessionId);
await sleep(1100);
const controlled = await evaluate(`navigator.serviceWorker?.controller != null`);
ok(controlled, 'the service worker controls the page');
await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }, sessionId);
await cdp.send('Page.reload', {}, sessionId);
await sleep(1400);
ok(await evaluate(`document.querySelector('#screen-title')?.classList.contains('is-active')`), 'the offline shell reloads');
ok(await evaluate(`!!window.MN`), 'the offline game boots');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId);

await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
await cdp.send('Page.reload', {}, sessionId);
await sleep(900);
await evaluate(`window.MN.beginChapter(1)`);
await sleep(500);
ok(await evaluate(`document.body.classList.contains('has-touch')`), 'touch mode is detected');
ok(await evaluate(`getComputedStyle(document.getElementById('touch-controls')).display === 'block'`), 'touch controls are visible');
await shot('touch.png');

ok(errors.length === 0, 'no console exceptions', errors.slice(0, 3).join(' | '));
console.log(`\n${checks - failures}/${checks} checks passed.`);
try {
  browser.close();
} catch {}
process.exit(failures === 0 ? 0 : 1);
