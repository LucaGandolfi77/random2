import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const out = '/tmp/neve-shots';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${out}/00-landing.png`, fullPage: true });
await page.click('[data-action="watch"]');
await page.waitForSelector('.player-screen', { timeout: 20000 });
await page.waitForTimeout(900);
await page.addStyleTag({
  content: '.player-ui,.pause-screen,.rotate-hint,.player-toast{display:none!important} .subtitle-host{opacity:.92}'
});
await page.screenshot({ path: `${out}/01-player-start.png` });
const hook = async (fn, arg) => page.evaluate(([name, value]) => {
  const api = window.__NEVE_E_FERRO__;
  if (!api) throw new Error('QA hook missing');
  if (name === 'seek') api.pause();
  api[name](value);
}, [fn, arg]);
const times = [
  [60, '02-seq1-ballroom'],
  [150, '03-seq2-train'],
  [290, '04-seq3-kitty'],
  [430, '05-seq4-palace'],
  [560, '06-seq5-apartment'],
  [680, '07-seq6-race'],
  [800, '08-seq7-bedroom'],
  [950, '09-seq8-door'],
  [1080, '10-seq9-opera'],
  [1190, '11-seq10-country'],
  [1310, '12-seq11-face'],
  [1360, '13-seq11-light'],
  [1440, '14-seq12-family'],
  [1490, '15-seq12-tracks']
];
for (const [time, name] of times) {
  await hook('seek', time);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${out}/${name}.png` });
}
const state = await page.evaluate(() => {
  const api = window.__NEVE_E_FERRO__;
  return {
    state: api?.getState(),
    scene: api?.getSceneIndex(),
    subtitle: api?.getSubtitle(),
    audio: api?.getAudio(),
    chapter: api?.getChapter()
  };
});
console.log(JSON.stringify({ state, errors }, null, 2));
await browser.close();
