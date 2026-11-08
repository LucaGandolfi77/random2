import { chromium, devices } from 'playwright';

const url = process.env.HYPE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/hype-mobile-title.png' });
await page.click('[data-action="title-start"]');
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/hype-mobile-menu.png' });
await page.click('[data-action="training"]');
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/hype-mobile-setup.png' });
await page.click('[data-action="choose-stage"]');
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/hype-mobile-stage.png' });
await page.click('[data-action="start-brawl"]');
await page.waitForSelector('.hud-card');
await page.waitForTimeout(3200);
await page.screenshot({ path: '/tmp/hype-mobile-fight.png' });
console.log('touch visible:', await page.locator('.touch-controls.visible').isVisible().catch(() => false));
console.log('hud cards:', await page.locator('.hud-card').count());
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exitCode = 1;
