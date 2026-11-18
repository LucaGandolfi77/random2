/**
 * Headless Chrome smoke test via CDP, with touch emulation.
 * Run: node tests/browser-smoke.mjs [url]
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARGET = process.argv[2] || 'http://localhost:5174/';
const PORT = 9700 + Math.floor(Math.random() * 300);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('./screenshots/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'gbp-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=900,520', TARGET
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    target = list.find((t) => t.type === 'page' && t.url.includes('localhost'));
  } catch { /* starting */ }
}
if (!target) { console.error('Chrome did not start'); chrome.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const errors = [];
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    const text = m.params.args.map((a) => a.value || a.description).join(' ');
    if (!text.includes('[vite]')) errors.push(text); // HMR socket noise during offline test
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(OUT + name + '.png', Buffer.from(r.data, 'base64'));
  console.log('  screenshot:', name + '.png');
};
const check = (label, ok) => console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`);
async function waitFor(expr, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expr)) return true;
    await sleep(150);
  }
  return false;
}

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 520, deviceScaleFactor: 1, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.reload', { ignoreCache: true });

console.log('1. Main menu');
if (!await waitFor(`!!document.querySelector('[data-a="arcade"]') && document.body.innerText.includes('GIGANT')`)) {
  console.error('Menu did not render:', await evaluate(`document.body.innerText.slice(0,300)`));
  ws.close(); chrome.kill(); process.exit(1);
}
check('title rendered', await evaluate(`document.body.innerText.includes('GIGANT')`));
await shot('01-menu');

console.log('2. Story mode with dialogue');
await evaluate(`document.querySelector('[data-a="story"]').click()`);
await waitFor(`!!document.querySelector('#dlg-text') && !document.querySelector('.dialogue-panel').closest('.screen').classList.contains('hidden')`);
check('dialogue screen visible', await evaluate(`window.__GBP_GAME__.mode === 'dialogue'`));
check('dialogue text present', await evaluate(`document.querySelector('#dlg-text').textContent.length > 0 || window.__GBP_GAME__.dialogue.node.text.length > 0`));
await shot('01b-story-dialogue');
await evaluate(`window.__GBP_GAME__.dialogueUI.update(10)`);
await sleep(200);
await evaluate(`document.querySelector('[data-i="0"]')?.click()`);
await sleep(200);
await evaluate(`window.__GBP_GAME__.dialogueUI.update(10)`);
await sleep(200);
await evaluate(`document.querySelector('[data-i="0"]')?.click()`);
await waitFor(`window.__GBP_GAME__.mode === 'fight'`);
check('story battle started', await evaluate(`window.__GBP_GAME__.storyActive && window.__GBP_GAME__.enemy !== null`));
check('enemy class shown in HUD', await evaluate(`document.querySelector('#hud-ename').textContent.includes('·')`));
await shot('01c-story-fight');
await evaluate(`(()=>{const g=window.__GBP_GAME__;for(let i=0;i<900 && g.mode==='fight';i++){if(g.round.phase==='fight'&&g.enemy&&g.enemy.hp>0)g.debugForceKO('enemy');g.step(1/60);}})()`);
await sleep(300);
check('story victory dialogue shown', await evaluate(`window.__GBP_GAME__.mode === 'dialogue' && window.__GBP_GAME__.dialogue.nodeId === 'c1_win'`));
await evaluate(`window.__GBP_GAME__.dialogueUI.update(10)`);
await sleep(150);
await evaluate(`document.querySelector('[data-i="0"]')?.click()`);
await sleep(300);
check('story advanced to chapter 2', await evaluate(`window.__GBP_GAME__.story.chapterIndex === 1 && window.__GBP_GAME__.dialogue.nodeId === 'c2_intro'`));
await shot('01d-story-chapter2');
await evaluate(`window.__GBP_GAME__.toMenu()`);
await sleep(200);

console.log('3. Fighter and support selection');
await evaluate(`document.querySelector('[data-a="arcade"]').click()`);
await waitFor(`!!document.querySelector('[data-f="rubber"]')`);
check('16 fighter cards', await evaluate(`document.querySelectorAll('[data-f]').length === 16`));
await shot('02-select');
await evaluate(`document.querySelector('[data-f="rubber"]').click()`);
await waitFor(`!!document.querySelector('[data-a="next"]')`);
await evaluate(`document.querySelector('[data-a="next"]').click()`);
await waitFor(`!!document.querySelector('.fighter-card:not(.locked)')`);
await evaluate(`(()=>{const cards=[...document.querySelectorAll('[data-f]')].filter(c=>!c.classList.contains('locked'));cards[0].click();cards[1].click();})()`);
await waitFor(`!!document.querySelector('[data-a="fight"]')`);
check('support team chosen', await evaluate(`!!document.querySelector('[data-a="fight"]')`));
await shot('03-team');

console.log('3. Arcade route and fight');
await evaluate(`document.querySelector('[data-a="fight"]').click()`);
await waitFor(`!!document.querySelector('[data-a="fight"]') && document.body.innerText.includes('ARCADE ROUTE')`);
check('8 arcade steps', await evaluate(`document.querySelectorAll('.arcade-step').length === 8`));
await shot('04-arcade');
await evaluate(`document.querySelector('[data-a="fight"]').click()`);
await waitFor(`!!document.querySelector('#hud-timer') && !document.querySelector('.hud').classList.contains('hidden')`);
await sleep(900);
check('HUD visible', await evaluate(`!document.querySelector('.hud').classList.contains('hidden')`));
check('two fighters spawned', await evaluate(`window.__GBP_GAME__.player && window.__GBP_GAME__.enemy`));
check('touch controls present', await evaluate(`!!document.querySelector('.touch-ui')`));
await shot('05-fight');

console.log('4. Combat simulation');
await evaluate(`(()=>{const g=window.__GBP_GAME__;g.player.energy=100;g.player.startAttack('special');for(let i=0;i<20;i++)g.step(1/60);})()`);
check('special spawned a projectile', await evaluate(`window.__GBP_GAME__.projectiles.length > 0 || window.__GBP_GAME__.player.energy < 100`));
await shot('06-special');

console.log('5. Match result and next battle');
await evaluate(`(()=>{const g=window.__GBP_GAME__;for(let i=0;i<900 && g.mode==='fight';i++){if(g.round.phase==='fight'&&g.enemy&&g.enemy.hp>0)g.debugForceKO('enemy');g.step(1/60);}})()`);
await sleep(400);
check('result screen shown', await evaluate(`document.body.innerText.includes('MATCH WON')`));
await shot('07-result');
await evaluate(`document.querySelector('[data-a="next"]').click()`);
await waitFor(`document.body.innerText.includes('ARCADE ROUTE')`);
check('arcade advanced to battle 2', await evaluate(`window.__GBP_GAME__.arcadeSeed === 1`));
await shot('08-next');

console.log('6. Offline PWA reload');
await sleep(600);
await send('Network.enable');
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await send('Page.reload');
check('menu loads offline from service worker', await waitFor(`!!document.querySelector('[data-a="arcade"]')`, 8000));
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

console.log('7. Runtime errors');
check('no uncaught exceptions', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 6).join('\n'));

ws.close();
chrome.kill();
process.exit(errors.length ? 1 : 0);
