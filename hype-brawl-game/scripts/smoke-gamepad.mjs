import { chromium } from 'playwright';

const url = process.env.HYPE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.click('[data-action="title-start"]');
await page.click('[data-action="training"]');
await page.waitForTimeout(350);
await page.click('[data-action="choose-stage"]');
await page.waitForTimeout(350);
await page.click('[data-action="start-brawl"]');
await page.waitForSelector('.hud-card');
await page.waitForTimeout(3200);

const before = await page.evaluate(() => {
  const app = window.__HYPE__;
  return app?.getActiveSimulation()?.getFighter(0)?.pos.x ?? null;
});

await page.evaluate(() => {
  const pad = {
    index: 0,
    id: 'QA Fake Pad (STANDARD GAMEPAD)',
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    timestamp: performance.now(),
  };
  window.__FAKE_PAD__ = pad;
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => [pad, null, null, null],
  });
  window.dispatchEvent(new Event('gamepadconnected'));
  pad.axes[0] = 0.9;
});
await page.waitForTimeout(1200);
const afterMove = await page.evaluate(() => {
  const app = window.__HYPE__;
  return {
    x: app?.getActiveSimulation()?.getFighter(0)?.pos.x ?? null,
    control: document.querySelector('.hud-card.top-left .hud-control')?.textContent,
  };
});

await page.evaluate(() => {
  const pad = window.__FAKE_PAD__;
  pad.axes[0] = 0;
  pad.buttons[0].pressed = true;
  pad.buttons[0].value = 1;
});
await page.waitForTimeout(350);
const air = await page.evaluate(() => {
  const app = window.__HYPE__;
  const fighter = app?.getActiveSimulation()?.getFighter(0);
  return fighter ? { grounded: fighter.grounded, y: fighter.pos.y, vy: fighter.vel.y } : null;
});
await page.evaluate(() => {
  const pad = window.__FAKE_PAD__;
  pad.buttons[0].pressed = false;
  pad.buttons[0].value = 0;
});
await page.screenshot({ path: '/tmp/hype-gamepad.png' });
console.log('before x:', before, 'after x:', afterMove);
console.log('jump state:', air);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exitCode = 1;
