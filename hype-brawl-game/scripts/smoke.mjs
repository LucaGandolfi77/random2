import { chromium } from 'playwright';

const url = process.env.HYPE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
await page.screenshot({ path: '/tmp/hype-title.png' });
console.log('title visible:', await page.locator('.game-logo').isVisible());

await page.click('[data-action="title-start"]');
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/hype-menu.png' });
console.log('menu visible:', await page.locator('.main-menu').isVisible());

await page.click('[data-action="play"]');
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/hype-setup.png' });
console.log('setup selects:', await page.locator('.char-select').count());

await page.click('[data-action="choose-stage"]');
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/hype-stage.png' });
console.log('stage cards:', await page.locator('.stage-card').count());

await page.click('[data-action="start-brawl"]');
await page.waitForSelector('.hud-card');
await page.waitForTimeout(4200);
await page.screenshot({ path: '/tmp/hype-fight.png' });
console.log('hud cards:', await page.locator('.hud-card').count());
console.log('canvas:', await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  return { width: canvas.width, height: canvas.height, webgl2: Boolean(canvas.getContext('webgl2')) };
}));

await page.keyboard.down('KeyD');
for (let i = 0; i < 22; i++) await page.keyboard.press('KeyF');
await page.waitForTimeout(1800);
await page.keyboard.up('KeyD');
await page.screenshot({ path: '/tmp/hype-fight-action.png' });
console.log('damage cards:', await page.locator('.hud-damage').allTextContents());

await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/hype-pause.png' });
console.log('pause visible:', await page.locator('.pause-overlay').isVisible());
await page.click('[data-action="resume"]');
await page.waitForTimeout(400);

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exitCode = 1;
