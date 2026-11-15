import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from '../tools/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots');
const url = process.argv[2] || 'http://localhost:8099/milano-nera-pwa/';
const browser = await launch();
if (!browser) {
  console.log('IPHONE SMOKE SKIPPED — no Chromium found.');
  process.exit(0);
}
const { cdp, sessionId } = browser;
const errors = [];
let checks = 0;
let failures = 0;
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

cdp.on('Runtime.exceptionThrown', (params) => errors.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text));
cdp.on('Runtime.consoleAPICalled', (params) => {
  if (params.type === 'error') errors.push(params.args.map((arg) => arg.value || arg.description).join(' '));
});

await cdp.send('Page.enable', {}, sessionId);
await cdp.send('Runtime.enable', {}, sessionId);
await cdp.send('Network.enable', {}, sessionId);
await cdp.send('Network.setUserAgentOverride', {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1'
}, sessionId);
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true }, sessionId);
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
await cdp.send('Page.navigate', { url }, sessionId);
await sleep(1100);

ok(await waitFor('!!window.MN'), 'the game boots with an iPhone Chrome user agent');
ok(await evaluate(`document.querySelectorAll('link[rel="apple-touch-startup-image"]').length >= 16`), 'iPhone startup images are linked');
ok(await evaluate(`!document.getElementById('ios-install').classList.contains('is-hidden')`), 'the iOS install guide is visible');
ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), 'the iPhone title has no horizontal overflow');
await shot('iphone-title.png');
await evaluate(`document.querySelector('[data-action="open-chapters"]').click()`);
await sleep(250);
ok(await evaluate(`document.querySelector('#screen-chapters')?.classList.contains('is-active')`), 'the chapter select fits the iPhone');
ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), 'the iPhone chapter select has no horizontal overflow');
await shot('iphone-chapters.png');
await evaluate(`document.querySelector('.screen.is-active [data-action="back-title"]').click()`);
await sleep(200);

await evaluate(`document.querySelector('[data-action="new-game"]').click()`);
await sleep(200);
await evaluate(`document.querySelector('[data-action="enter-chapter"]').click()`);
await sleep(1200);
ok(await evaluate(`window.MN.phase === 'playing'`), 'the chapter starts on iPhone');
ok(await evaluate(`window.MN.state.viewW === 216 && window.MN.state.viewH === 300`), 'portrait uses the tall camera view');
ok(await evaluate(`document.getElementById('game').width === 216 && document.getElementById('game').height === 300`), 'the canvas uses the portrait backing buffer');
ok(await evaluate(`document.body.dataset.view === 'portrait'`), 'the UI switches to the portrait layout');
const portraitRect = await evaluate(`(() => {
  const r = document.getElementById('game').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight };
})()`);
ok(portraitRect.x >= 0 && portraitRect.y >= 0, 'the portrait game frame starts inside the viewport', JSON.stringify(portraitRect));
ok(portraitRect.x + portraitRect.width <= portraitRect.vw + 1, 'the portrait frame fits horizontally');
ok(portraitRect.y + portraitRect.height <= portraitRect.vh + 1, 'the portrait frame fits vertically');
ok(await evaluate(`getComputedStyle(document.getElementById('touch-controls')).display === 'block'`), 'touch controls are visible');
const stick = await evaluate(`(() => {
  const r = document.getElementById('stick-left').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
const beforeMove = await evaluate(`window.MN.state.player.x`);
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: stick.x + stick.width / 2, y: stick.y + stick.height / 2, button: 'left', buttons: 1, clickCount: 1 }, sessionId);
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: stick.x + stick.width / 2 + 28, y: stick.y + stick.height / 2, button: 'left', buttons: 1 }, sessionId);
await sleep(450);
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: stick.x + stick.width / 2 + 28, y: stick.y + stick.height / 2, button: 'left', buttons: 0, clickCount: 1 }, sessionId);
await sleep(120);
ok(await evaluate(`window.MN.state.player.x > ${beforeMove} + 3`), 'the portrait left stick moves the player');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true }, sessionId);
await sleep(250);
await shot('iphone-portrait.png');

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 852, height: 393, deviceScaleFactor: 1, mobile: true }, sessionId);
await sleep(500);
ok(await evaluate(`window.MN.state.viewW === 384 && window.MN.state.viewH === 216`), 'landscape returns to the widescreen view');
ok(await evaluate(`document.body.dataset.view === 'landscape'`), 'the UI switches back to landscape');
const landscapeRect = await evaluate(`(() => {
  const r = document.getElementById('game').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight };
})()`);
ok(landscapeRect.x >= 0 && landscapeRect.y >= 0 && landscapeRect.x + landscapeRect.width <= landscapeRect.vw + 1 && landscapeRect.y + landscapeRect.height <= landscapeRect.vh + 1, 'the landscape frame fits inside the viewport', JSON.stringify(landscapeRect));
await shot('iphone-landscape.png');
ok(errors.length === 0, 'no iPhone console exceptions', errors.slice(0, 3).join(' | '));

console.log(`\n${checks - failures}/${checks} iPhone checks passed.`);
try {
  browser.close();
} catch {}
process.exit(failures === 0 ? 0 : 1);
