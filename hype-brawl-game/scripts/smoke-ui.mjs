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
await page.waitForTimeout(500);
await page.click('[data-action="roster"]');
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/hype-roster.png' });
await page.click('[data-action="roster-select"][data-fighter="zia"]');
await page.waitForTimeout(800);
await page.click('[data-action="roster-color"][data-index="2"]');
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/hype-roster-zia.png' });
await page.click('[data-action="back"]');
await page.waitForTimeout(400);
await page.click('[data-action="settings"]');
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/hype-settings.png' });
await page.click('[data-action="back"]');
await page.waitForTimeout(300);
await page.click('[data-action="online"]');
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/hype-online.png' });
await page.click('[data-action="back"]');
await page.waitForTimeout(300);
await page.click('[data-action="spectator"]');
await page.waitForSelector('.hud-card');
await page.waitForTimeout(5200);
await page.screenshot({ path: '/tmp/hype-spectator.png' });
console.log('spectator cards:', await page.locator('.hud-card').count());
console.log('spectator damage:', await page.locator('.hud-damage').allTextContents());

await page.evaluate(() => {
  const app = window.__HYPE__;
  const sim = app?.getActiveSimulation();
  if (!sim) return;
  for (const fighter of sim.fighters) {
    if (fighter.slot !== 0) {
      fighter.stocks = 1;
      fighter.pos = { x: 40 + fighter.slot, y: 0 };
    }
  }
});
await page.waitForTimeout(3200);
await page.screenshot({ path: '/tmp/hype-results.png' });
console.log('results visible:', await page.locator('.results-panel').isVisible().catch(() => false));
await page.click('[data-action="results-menu"]');
await page.waitForTimeout(500);

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exitCode = 1;
