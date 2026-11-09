import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox']
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const base = process.env.ASHEN_URL ?? 'http://localhost:4173';
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForSelector('.menu-screen');
await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
});
await page.waitForTimeout(1200);
const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
console.log('controlled before reload', controlled);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.menu-screen');
const controlledAfter = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
console.log('controlled after reload', controlledAfter);
const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
  const response = await fetch(href);
  const data = await response.json();
  const iconResponse = await fetch(data.icons[0].src);
  return { status: response.status, name: data.name, icons: data.icons.length, iconStatus: iconResponse.status };
});
console.log('manifest', manifest);
await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.menu-screen', { timeout: 15000 });
console.log('offline menu visible', await page.locator('.menu-screen').isVisible());
console.log('offline title', await page.title());
await page.screenshot({ path: 'smoke/50-offline.png' });
await context.setOffline(false);
console.log('errors', errors);
await browser.close();
