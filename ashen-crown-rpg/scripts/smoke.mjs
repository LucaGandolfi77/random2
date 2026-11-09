import { chromium } from 'playwright-core';
import fs from 'node:fs';

const out = 'smoke';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--disable-gpu', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(process.env.ASHEN_URL ?? 'http://localhost:4173', { waitUntil: 'networkidle' });
await page.waitForSelector('.menu-screen', { timeout: 15000 });
await page.screenshot({ path: `${out}/01-menu.png` });

console.log('menu buttons', await page.locator('.menu-action').allTextContents());
await page.getByRole('button', { name: /New Chronicle/i }).click();
await page.waitForSelector('.creation-screen');
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/02-creation-soul.png` });

await page.locator('.creation-next').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/03-creation-calling.png` });

await page.locator('.creation-next').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/04-creation-history.png` });

await page.locator('.creation-next').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/05-creation-oath.png` });

await page.locator('.creation-next').click();
await page.waitForSelector('.intro-screen', { timeout: 10000 });
await page.screenshot({ path: `${out}/06-intro.png` });
await page.locator('.intro-skip').click();
await page.waitForSelector('.game-screen', { timeout: 10000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/07-game.png` });

// The Kaelen marker sits north-east of the spawn point. Try its projected position.
const canvas = page.locator('.game-canvas canvas');
const box = await canvas.boundingBox();
console.log('canvas box', box);
await page.mouse.click(513, 409);
await page.waitForTimeout(900);
const dialogueVisible = await page.locator('.dialogue-layer').count();
console.log('dialogue visible', dialogueVisible);
await page.screenshot({ path: `${out}/08-dialogue-attempt.png` });

if (dialogueVisible) {
  await page.screenshot({ path: `${out}/09-dialogue.png` });
  const choice = page.locator('.dialogue-choice').filter({ hasText: 'What happened to me' });
  if (await choice.count()) await choice.first().click();
  await page.waitForTimeout(300);
  const plan = page.locator('.dialogue-choice').filter({ hasText: 'Later. The Warden first' });
  if (await plan.count()) await plan.first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/10-dialogue-choices.png` });
  const ready = page.locator('.dialogue-choice').filter({ hasText: 'I am ready' });
  if (await ready.count()) await ready.first().click();
  await page.waitForTimeout(300);
  const leave = page.locator('.dialogue-continue');
  if (await leave.count()) await leave.first().click();
  await page.waitForTimeout(400);
  await page.keyboard.press('i');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/11-inventory.png` });
  const close = page.locator('.modal-close');
  if (await close.count()) await close.first().click();
}

// Try the courtyard threat marker.
await page.mouse.click(702, 377);
await page.waitForTimeout(1800);
const combatVisible = await page.locator('.combat-toolbar').count();
console.log('combat visible', combatVisible);
await page.screenshot({ path: `${out}/12-combat-attempt.png` });

if (combatVisible) {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/13-combat.png` });
  const endTurn = page.locator('.end-turn-button');
  if (await endTurn.count()) {
    for (let i = 0; i < 3; i++) {
      if (!(await endTurn.isDisabled())) await endTurn.click();
      await page.waitForTimeout(1600);
    }
  }
  await page.screenshot({ path: `${out}/14-combat-after-turns.png` });
}

const sw = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.map((entry) => entry.scope);
});
console.log('service workers', sw);
console.log('errors', errors);
await browser.close();
