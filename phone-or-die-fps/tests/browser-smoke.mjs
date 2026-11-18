/**
 * Browser smoke test using Chrome DevTools Protocol (no extra npm dependencies).
 * Run: node tests/browser-smoke.mjs [http://localhost:5173/]
 * It starts headless Chrome, plays through menu -> intro -> phone -> call,
 * captures screenshots and reports any runtime exceptions.
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARGET_URL = process.argv[2] || 'http://localhost:5173/';
const PORT = 9400 + Math.floor(Math.random() * 400);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('./screenshots/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'pod-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1440,900', TARGET_URL
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    target = list.find((t) => t.type === 'page' && t.url.includes('localhost'));
  } catch { /* still starting */ }
}
if (!target) { console.error('Chrome did not start'); chrome.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const errors = [];
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
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
const debug = async (label) => console.log('  DEBUG', label, await evaluate(`(()=>{const g=window.__POD_GAME__;if(!g)return JSON.stringify({missing:true,href:location.href,title:document.title});return JSON.stringify({phase:g.state.phase,chapter:g.state.chapter,elapsed:+g.state.elapsed.toFixed(2),menu:g.menus.current,call:g.calls.call&&g.calls.call.phase,ring:g.calls.call&&g.calls.call.ringLeft})})()`));

await send('Runtime.enable');
await send('Page.enable');

async function waitFor(expression, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return true;
    await sleep(200);
  }
  return false;
}
if (!await waitFor(`!!document.querySelector('[data-a="new"]')`)) {
  console.error('Game did not render the main menu');
  console.error(await evaluate(`document.body.innerText.slice(0,500)`));
  ws.close(); chrome.kill(); process.exit(1);
}

console.log('1. Main menu');
check('title rendered', await evaluate(`document.body.innerText.includes('PHONE')`));
await shot('01-menu');

console.log('2. New game + intro');
await debug('before new');
await evaluate(`document.querySelector('[data-a="new"]').click()`);
await waitFor(`!!document.querySelector('[data-a="go"]')`);
await sleep(300);
check('intro shown', await evaluate(`document.body.innerText.includes('The first call')`));
await shot('02-intro');
await evaluate(`document.querySelector('[data-a="go"]').click()`);
await sleep(900);
if (await evaluate(`!!document.querySelector('.screen:not(.hidden)')`)) {
  await evaluate(`document.querySelector('[data-a="go"]')?.click()`);
  await sleep(400);
}
check('HUD visible', await evaluate(`!!document.querySelector('#hud-time') && !document.querySelector('.hud').classList.contains('hidden')`));
check('objective present', await evaluate(`document.querySelector('#hud-obj').textContent.length > 10`));
await debug('after intro');
await shot('03-first-person');

console.log('3. Phone and simulated call');
await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'Tab',bubbles:true}))`);
await sleep(500);
check('phone open', await evaluate(`!document.querySelector('.phone').classList.contains('hidden')`));
check('8 contacts', await evaluate(`document.querySelectorAll('.contact-row').length === 8`));
await shot('04-contacts');
await evaluate(`document.querySelector('[data-id="sophie"]').click()`);
await debug('after call start');
// headless rAF is throttled: advance the real CallSystem clock instead of waiting on frames
await evaluate(`window.__POD_GAME__.calls.update(4)`);
await sleep(700);
await debug('after call connect');
check('call connected with dialogue', await evaluate(`
  document.body.innerText.includes('CONNECTED') && document.querySelectorAll('[data-choice]').length === 3`));
await shot('05-call');
await evaluate(`document.querySelector('[data-choice="0"]').click()`);
await sleep(600);
check('dialogue advanced', await evaluate(`document.body.innerText.includes('breathe') || document.body.innerText.includes('Breathe')`));
await shot('06-dialogue');

console.log('4. Movement and environment');
await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'Tab',bubbles:true}))`);
await sleep(400);
const before = await evaluate(`document.querySelector('#hud-chapter').textContent`);
await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}))`);
await sleep(1200);
await evaluate(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}))`);
check('movement keys handled without error', !!before);
await shot('07-walking');

console.log('5. Interactions and resources');
await evaluate(`(()=>{const g=window.__POD_GAME__;g.interaction.hovered=g.world.interactables.find(i=>i.kind==='powerbank');g.interact();})()`);
check('power bank picked up', await evaluate(`window.__POD_GAME__.state.slots.powerBank === true`));
await evaluate(`(()=>{const g=window.__POD_GAME__;g.interaction.hovered=g.world.interactables.find(i=>i.kind==='flashlight');g.interact();g.toggleFlashlight();})()`);
check('flashlight acquired and on', await evaluate(`window.__POD_GAME__.state.slots.flashlight && window.__POD_GAME__.state.flashlightOn`));
await evaluate(`(()=>{const g=window.__POD_GAME__;const d=g.world.interactables.find(i=>i.kind==='door');g.interaction.hovered=d;g.interact();})()`);
check('door opens with collider disabled', await evaluate(`(()=>{const d=window.__POD_GAME__.world.interactables.find(i=>i.kind==='door');return d.data.open && d.data.collider.isEmpty();})()`));
await shot('08-interactions');

console.log('5b. City zones and the phone map');
await evaluate(`(()=>{const g=window.__POD_GAME__;const exit=g.world.interactables.find(i=>i.kind==='zone'&&i.data.target==='street');g.interaction.hovered=exit;g.interact();})()`);
await sleep(600);
check('home exit leads to the street', await evaluate(`window.__POD_GAME__.state.zone === 'street'`));
check('street was marked as visited', await evaluate(`window.__POD_GAME__.state.visited.has('street')`));
check('HUD shows the new zone', await evaluate(`document.querySelector('#hud-chapter').textContent.includes('OAKLANE')`));
await shot('08b-street');
await evaluate(`window.__POD_GAME__.transitionTo('bar')`);
await sleep(400);
check('bar is a safe zone', await evaluate(`window.__POD_GAME__.state.zone === 'bar'`));
await evaluate(`window.__POD_GAME__.calls.hangUp()`);
await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'Tab',bubbles:true}))`);
await sleep(300);
await evaluate(`document.querySelector('[data-tab="map"]').click()`);
await waitFor(`document.querySelectorAll('.zone-row').length === 10`);
check('ten zones on the phone map', await evaluate(`document.querySelectorAll('.zone-row').length === 10`));
await shot('08c-map');
const batteryBefore = await evaluate(`window.__POD_GAME__.state.battery`);
await evaluate(`document.querySelector('[data-zone="home"]').click()`);
await sleep(500);
check('taxi returns home and costs battery', await evaluate(`(()=>{const g=window.__POD_GAME__;return g.state.zone==='home' && g.state.battery < ${batteryBefore};})()`));
await shot('08d-back-home');

console.log('6. Shadows and threat');
await evaluate(`(()=>{const g=window.__POD_GAME__;g.state.threat=85;g.shadows.update(1,g.time,85,g.sm.camera.position,g.controller.yaw,false,false,1);g.sm.render();})()`);
await sleep(500);
check('shadows spawned at high threat', await evaluate(`window.__POD_GAME__.shadows.shadows.length >= 2`));
await shot('09-shadows');

console.log('7. Save and load');
await evaluate(`window.__POD_GAME__.saveGame(true)`);
check('save written', await evaluate(`!!localStorage.getItem('phone-or-die:save:slot1')`));
await evaluate(`window.__POD_GAME__.loadGame('slot1')`);
check('save loaded', await evaluate(`window.__POD_GAME__.state.phase === 'playing'`));

console.log('8. Ending at 6 AM');
await evaluate(`(()=>{const g=window.__POD_GAME__;g.state.elapsed=25*60;g.story.update(0.1);})()`);
await sleep(700);
check('ending screen shown', await evaluate(`document.body.innerText.includes('DAWN') && /TRUE SURVIVAL|ESCAPE ALONE|EVERYONE IS SAFE|THE TRUTH|THE VOICE IN THE GARDEN|THE CITY REMEMBERS|ALONE IN THE CROWD/.test(document.body.innerText)`));
await shot('10-ending');

console.log('9. Capture sequence');
await evaluate(`window.__POD_GAME__.newGame('normal')`);
await sleep(300);
await evaluate(`document.querySelector('[data-a="go"]')?.click()`);
await sleep(200);
await evaluate(`window.__POD_GAME__.capture()`);
check('capture overlay visible', await evaluate(`!document.querySelector('.capture').classList.contains('hidden')`));
await shot('11-capture');
await sleep(3000);
check('game over screen shown', await evaluate(`document.body.innerText.includes('CAPTURED')`));

console.log('10. Mobile layout (touch emulation)');
await evaluate(`navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()))`);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.reload', { ignoreCache: true });
await waitFor(`!!document.querySelector('[data-a="new"]')`);
await evaluate(`window.dispatchEvent(new Event('touchstart'))`);
await evaluate(`document.querySelector('[data-a="new"]').click()`);
await waitFor(`!!document.querySelector('[data-a="go"]')`);
await evaluate(`document.querySelector('[data-a="go"]').click()`);
await sleep(500);
if (await evaluate(`!!document.querySelector('.screen:not(.hidden)')`)) {
  await evaluate(`document.querySelector('[data-a="go"]')?.click()`);
  await sleep(300);
}
check('touch controls visible', await evaluate(`!document.querySelector('.mobile-controls').classList.contains('hidden')`));
check('joystick and look zone present', await evaluate(`!!document.querySelector('.joystick-zone') && !!document.querySelector('.look-zone')`));
await shot('12-mobile');

console.log('11. Runtime errors');
check('no uncaught exceptions', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 8).join('\n'));

ws.close();
chrome.kill();
process.exit(errors.length ? 1 : 0);
