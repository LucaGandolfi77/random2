import { chromium, devices } from 'playwright';

const url = process.env.HYPE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.click('[data-action="title-start"]');
await page.click('[data-action="training"]');
await page.click('[data-action="choose-stage"]');
await page.click('[data-action="start-brawl"]');
await page.waitForSelector('.touch-controls.visible');
await page.waitForTimeout(3200);

const before = await page.evaluate(() => window.__HYPE__?.getActiveSimulation()?.getFighter(0)?.pos.x ?? null);
const stick = await page.locator('.touch-stick').boundingBox();
if (stick) {
  await page.mouse.move(stick.x + stick.width / 2, stick.y + stick.height / 2);
  await page.mouse.down();
  await page.mouse.move(stick.x + stick.width / 2 + 45, stick.y + stick.height / 2, { steps: 5 });
  await page.waitForTimeout(780);
  await page.mouse.up();
}
await page.waitForTimeout(250);
const after = await page.evaluate(() => window.__HYPE__?.getActiveSimulation()?.getFighter(0)?.pos.x ?? null);

const attack = await page.locator('.touch-attack').boundingBox();
if (attack) {
  await page.mouse.move(attack.x + attack.width / 2, attack.y + attack.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(160);
  await page.mouse.up();
}
await page.waitForTimeout(900);
const damage = await page.locator('.hud-damage').allTextContents();
await page.screenshot({ path: '/tmp/hype-touch-input.png' });
console.log('before x:', before, 'after x:', after);
console.log('damage:', damage);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
