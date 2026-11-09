import { chromium } from 'playwright-core';

const BASE = process.env.POD_PREVIEW_URL ?? 'http://127.0.0.1:5200/';
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const context = await browser.newContext({ viewport: { width: 1290, height: 820 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.menu-screen');
const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  const response = await fetch(link.href);
  return { status: response.status, json: await response.json() };
});
console.log('manifest:', manifest.status, manifest.json.name, manifest.json.icons.length);
const iconStatus = await page.evaluate(async () => {
  const paths = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];
  return Promise.all(paths.map(async (path) => (await fetch(path)).status));
});
console.log('icons:', iconStatus.join(','));

await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
});
await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });
const scope = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? 'none');
const cacheNames = await page.evaluate(() => caches.keys());
console.log('service worker:', scope);
console.log('caches:', cacheNames.join(', '));

await page.evaluate(() => caches.open('inspect').then((cache) => cache.keys()).then((keys) => keys.length));
const cached = await page.evaluate(async () => {
  const names = await caches.keys();
  const entries = [];
  for (const name of names) {
    const cache = await caches.open(name);
    entries.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
  }
  return entries;
});
console.log('cached entries:', cached.length);
console.log('cached core:', ['/index.html', '/manifest.webmanifest', '/icons/icon-192.png'].every((path) => cached.includes(path)));

await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.menu-screen');
console.log('offline menu loaded:', await page.locator('.menu-title').innerText());

await page.getByRole('button', { name: /New Night/i }).click();
await page.locator('.difficulty-card', { hasText: 'Story' }).click();
await page.waitForSelector('.intro-screen');
for (let i = 0; i < 3; i++) {
  await page.locator('.intro-next').click();
  await page.waitForTimeout(280);
}
await page.waitForSelector('.game-screen');
await page.waitForTimeout(1400);
const canvas = await page.locator('.game-canvas canvas').count();
console.log('offline game canvas:', canvas);
await page.screenshot({ path: 'smoke/15-offline-game.png' });

await context.setOffline(false);
console.log('ERRORS:', errors.length);
for (const error of errors) console.log(error);
await browser.close();
if (errors.length || iconStatus.some((status) => status !== 200) || !cached.includes('/index.html')) {
  process.exitCode = 1;
}
