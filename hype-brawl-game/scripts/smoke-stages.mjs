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

async function matchOn(stageId, screenshot) {
  await page.click('[data-action="play"]');
  await page.waitForTimeout(350);
  await page.click('[data-action="choose-stage"]');
  await page.waitForTimeout(500);
  await page.click(`[data-action="stage-select"][data-stage="${stageId}"]`);
  await page.waitForTimeout(700);
  await page.click('[data-action="start-brawl"]');
  await page.waitForSelector('.hud-card');
  await page.waitForTimeout(4200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.click('[data-action="toggle-hitbox"]');
  await page.click('[data-action="resume"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: screenshot });
  const stats = await page.evaluate(() => {
    const sim = window.__HYPE__?.getActiveSimulation();
    return sim ? { stage: sim.stage.id, fighters: sim.fighters.length, platforms: sim.platforms.length } : null;
  });
  console.log(stageId, stats);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.click('[data-action="quit"]');
  await page.waitForTimeout(600);
}

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.click('[data-action="title-start"]');
await page.waitForTimeout(400);
await matchOn('metro-0317', '/tmp/hype-metro.png');
await matchOn('club-verticale', '/tmp/hype-club.png');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exitCode = 1;
