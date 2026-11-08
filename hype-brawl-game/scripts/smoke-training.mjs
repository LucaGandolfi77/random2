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
await page.waitForTimeout(900);
await page.click('[data-action="title-start"]');
await page.click('[data-action="training"]');
await page.waitForTimeout(500);
await page.click('[data-action="choose-stage"]');
await page.waitForTimeout(400);
await page.click('[data-action="start-brawl"]');
await page.waitForSelector('.training-panel');
await page.waitForTimeout(3400);

await page.keyboard.down('KeyD');
await page.waitForTimeout(650);
await page.keyboard.up('KeyD');
await page.waitForTimeout(200);
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(320);
}
await page.waitForTimeout(500);
const damage = await page.locator('.hud-damage').allTextContents();
console.log('damage after training attacks:', damage);
await page.keyboard.press('F2');
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/hype-training.png' });
console.log('hitboxes enabled:', await page.locator('[data-act="hitbox"]').evaluate((element) => element.classList.contains('active')));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exitCode = 1;
