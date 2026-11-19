/**
 * Headless Chrome CDP smoke test with touch emulation.
 * Run: node tests/browser-smoke.mjs [url]
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARGET = process.argv[2] || 'http://localhost:5175/';
const PORT = 9900 + Math.floor(Math.random() * 300);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('./screenshots/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'bros-chrome-'));
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
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    const t = m.params.args.map((a) => a.value || a.description).join(' ');
    if (!t.includes('[vite]')) errors.push(t);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq; pending.set(id, { resolve, reject });
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
  while (Date.now() < end) { if (await evaluate(expr)) return true; await sleep(150); }
  return false;
}

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 520, deviceScaleFactor: 1, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.reload', { ignoreCache: true });

console.log('1. Main menu');
if (!await waitFor(`!!document.querySelector('[data-a="new"]')`)) {
  console.error('Menu did not render:', await evaluate(`document.body.innerText.slice(0,300)`));
  ws.close(); chrome.kill(); process.exit(1);
}
check('title rendered', await waitFor(`document.body.innerText.includes('BROS')`, 5000));
await shot('01-menu');

console.log('2. New game, challenge mode and overworld');
check('long-term menu entries', await evaluate(`!!document.querySelector('[data-a="endless"]') && !!document.querySelector('[data-a="daily"]') && !!document.querySelector('[data-a="collections"]')`));
await evaluate(`document.querySelector('[data-a="new"]').click()`);
await waitFor(`document.querySelectorAll('[data-ch]').length === 4`);
check('four challenge modes', await evaluate(`document.querySelectorAll('[data-ch]').length === 4`));
await evaluate(`document.querySelector('[data-ch="normal"]').click()`);
await waitFor(`!!document.querySelector('[data-a="go"]')`);
await evaluate(`document.querySelector('[data-a="go"]').click()`);
await waitFor(`!document.querySelector('.hud').classList.contains('hidden')`);
check('overworld HUD visible', await evaluate(`!document.querySelector('.hud').classList.contains('hidden')`));
check('two brothers in state', await evaluate(`window.__BROS_GAME__.bros.length === 2`));
check('touch controls present', await evaluate(`!!document.querySelector('.dpad') && !!document.querySelector('[data-a="a"]')`));
await shot('02-overworld');

console.log('2b. Minigame and reward');
await evaluate(`window.__BROS_GAME__.mode='menu'; window.__BROS_GAME__.ui.minigames()`);
await waitFor(`document.querySelectorAll('[data-mg]').length === 5`);
check('five minigames listed', await evaluate(`document.querySelectorAll('[data-mg]').length === 5`));
await evaluate(`document.querySelector('[data-mg="coinrush"]').click()`);
await sleep(300);
check('minigame HUD visible', await evaluate(`!document.querySelector('#mini-score').closest('.battle-hud').classList.contains('hidden')`));
await shot('02b-minigame');
const coinsBefore = await evaluate(`window.__BROS_GAME__.coins`);
await evaluate(`(()=>{const g=window.__BROS_GAME__;g.minigame.cursor=g.minigame.zone;g.minigame.press(true);g.minigame.time=0.01;g.minigame.update(0.05);})()`);
await sleep(200);
check('minigame awards coins', await evaluate(`window.__BROS_GAME__.coins > ${coinsBefore}`));
await sleep(2600);
check('returns to overworld after minigame', await evaluate(`window.__BROS_GAME__.mode === 'world'`));

console.log('3. Battle, power and action command');
await evaluate(`window.__BROS_GAME__.debugStartBattle('grubbo')`);
await sleep(400);
check('battle UI visible', await evaluate(`!document.querySelector('.battle-hud').classList.contains('hidden')`));
check('command grid populated', await waitFor(`document.querySelectorAll('[data-cmd]').length >= 4`, 6000));
await shot('03-battle');
await evaluate(`(()=>{const g=window.__BROS_GAME__;g.bros[0].level=5;g.syncPowers();g.battle.powers=g.world.powers;g.ui.updateBattle(g.battle.view);})()`);
await sleep(200);
check('power move unlocked at level 5', await evaluate(`[...document.querySelectorAll('[data-cmd]')].some(b=>b.dataset.cmd==='firestorm')`));
await evaluate(`(()=>{const g=window.__BROS_GAME__;g.battle.select('firestorm');g.battle.cursor=0.5;g.battle.press();})()`);
await sleep(200);
check('power attack applies burn status', await evaluate(`window.__BROS_GAME__.battle.status && window.__BROS_GAME__.battle.status.kind === 'burn'`));
await shot('03b-power');
const hpBefore = await evaluate(`window.__BROS_GAME__.battle.enemyHp`);
await evaluate(`(()=>{const g=window.__BROS_GAME__;g.battle.phase='command';g.battle.select('jump');g.battle.cursor=0.5;g.battle.press();})()`);
await sleep(300);
check('timed attack damages the enemy', await evaluate(`window.__BROS_GAME__.battle.enemyHp < ${hpBefore}`));
await shot('04-action');

console.log('4. Victory and save');
await evaluate(`(()=>{const g=window.__BROS_GAME__;g.debugWinBattle();g.battle.update(1);})()`);
await sleep(300);
check('victory reached', await evaluate(`window.__BROS_GAME__.battle.phase === 'victory'`));
await shot('05-victory');
await evaluate(`document.querySelector('[data-continue]').click()`);
await sleep(300);
check('back in overworld', await evaluate(`window.__BROS_GAME__.mode === 'world'`));
check('save written', await evaluate(`!!localStorage.getItem('bros-saga:save')`));

console.log('4b. Badges');
await evaluate(`(()=>{const g=window.__BROS_GAME__;g.coins=50;g.mode='menu';g.ui.badges(g.badges,g.coins);})()`);
await waitFor(`document.querySelectorAll('[data-badge]').length >= 13`);
check('thirteen badges listed', await evaluate(`document.querySelectorAll('[data-badge]').length >= 13`));
await evaluate(`document.querySelector('[data-badge="power_badge"]').click()`);
await sleep(200);
check('badge purchased and equipped', await evaluate(`window.__BROS_GAME__.badges.owned.includes('power_badge') && window.__BROS_GAME__.badges.equipped.includes('power_badge')`));
await shot('05b-badges');

console.log('4c. Long-term systems');
await evaluate(`(()=>{const g=window.__BROS_GAME__;g.meta.registerWin('grubbo');g.meta.bump('bosses',1);g.checkAchievements();g.ui.achievements(g.meta);})()`);
await sleep(250);
check('achievements screen populated', await evaluate(`document.querySelectorAll('.settings-row').length >= 10`));
await shot('05c-achievements');
await evaluate(`window.__BROS_GAME__.ui.collections(window.__BROS_GAME__.meta)`);
await sleep(200);
check('collection completion shown', await evaluate(`document.body.innerText.includes('COMPLETION')`));
await evaluate(`window.__BROS_GAME__.ui.questLog(window.__BROS_GAME__.meta)`);
await sleep(200);
check('quest log populated', await evaluate(`document.body.innerText.includes('Quest Log')`));
await evaluate(`window.__BROS_GAME__.startRun('endless')`);
await sleep(300);
check('endless dungeon starts a battle', await evaluate(`window.__BROS_GAME__.runKind === 'endless' && window.__BROS_GAME__.mode === 'battle'`));
await shot('05d-endless');

console.log('5. Offline PWA');
await sleep(400);
await send('Network.enable');
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await send('Page.reload');
check('menu loads offline', await waitFor(`!!document.querySelector('[data-a="new"]')`, 8000));
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

console.log('6. Runtime errors');
check('no uncaught exceptions', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 6).join('\n'));

ws.close();
chrome.kill();
process.exit(errors.length ? 1 : 0);
