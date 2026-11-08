import { chromium } from 'playwright';

const url = process.env.HYPE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.click('[data-action="title-start"]');
await page.click('[data-action="roster"]');
await page.waitForTimeout(600);
for (const [id, slug] of [['velvet', 'velvet'], ['ace', 'ace'], ['zia', 'zia'], ['nero', 'nero']]) {
  await page.click(`[data-action="roster-select"][data-fighter="${id}"]`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/hype-model-${slug}.png` });
}
await browser.close();
