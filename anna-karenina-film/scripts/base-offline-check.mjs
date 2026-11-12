import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4173/random2/anna-karenina-film/?qa=1';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(base, { waitUntil: 'networkidle' });
const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
const manifest = await page.evaluate(async (href) => (await fetch(href)).json(), manifestHref);
const sw1 = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  return { scope: reg.scope, active: Boolean(reg.active), controller: Boolean(navigator.serviceWorker.controller) };
});
await page.reload({ waitUntil: 'networkidle' });
const sw2 = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  return { scope: reg.scope, active: Boolean(reg.active), controller: Boolean(navigator.serviceWorker.controller) };
});
await page.click('[data-action="watch"]');
await page.waitForSelector('.player-screen', { timeout: 45000 });
await page.waitForTimeout(1000);
await page.evaluate(() => window.__NEVE_E_FERRO__?.pause());

const cacheState = await page.evaluate(async () => {
  const keys = await caches.keys();
  const filmKey = keys.find((key) => key.startsWith('neve-ferro-'));
  const cache = filmKey ? await caches.open(filmKey) : null;
  const urls = cache ? (await cache.keys()).map((request) => request.url) : [];
  return {
    keys,
    count: urls.length,
    hasIndex: urls.some((url) => url.endsWith('/index.html')),
    hasJs: urls.some((url) => /\/assets\/index-.*\.js$/.test(url)),
    hasManifest: urls.some((url) => url.endsWith('/manifest.webmanifest')),
    hasIcon: urls.some((url) => url.endsWith('/icons/icon-192.png')),
    hasFont: urls.some((url) => url.endsWith('.woff2'))
  };
});

await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.landing-screen', { timeout: 30000 });
const offlineLanding = await page.locator('.landing-title').innerText();
await page.click('[data-action="watch"]');
await page.waitForSelector('.player-screen', { timeout: 45000 });
await page.waitForTimeout(1000);
const offlineState = await page.evaluate(() => window.__NEVE_E_FERRO__?.getState());
await context.setOffline(false);

console.log(
  JSON.stringify(
    {
      manifestHref,
      manifest: {
        name: manifest.name,
        start_url: manifest.start_url,
        scope: manifest.scope,
        display: manifest.display,
        icons: manifest.icons?.length
      },
      sw1,
      sw2,
      cacheState,
      offlineLanding,
      offlineState,
      errors
    },
    null,
    2
  )
);
await browser.close();
