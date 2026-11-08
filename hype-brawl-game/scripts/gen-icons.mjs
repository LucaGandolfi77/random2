import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
const standard = await readFile('public/icons/icon.svg', 'utf8');
const maskable = await readFile('public/icons/icon-maskable.svg', 'utf8');
const encoded = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

async function render(svg, size, path, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="${encoded(svg)}">`,
  );
  await page.screenshot({ path, omitBackground: transparent });
}

await render(standard, 512, 'public/icons/icon-512.png', true);
await render(standard, 192, 'public/icons/icon-192.png', true);
await render(maskable, 512, 'public/icons/icon-maskable-512.png', false);
await render(maskable, 192, 'public/icons/icon-maskable-192.png', false);
console.log('Generated PWA icons: 512, 192, maskable 512, maskable 192');
await browser.close();
