import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const out = '/tmp/neve-full-pass';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto('http://127.0.0.1:4173/random2/anna-karenina-film/?qa=1', { waitUntil: 'networkidle' });
await page.click('[data-action="watch"]');
await page.waitForSelector('.player-screen', { timeout: 45000 });
await page.waitForFunction(() => Boolean(window.__NEVE_E_FERRO__), undefined, { timeout: 15000 });
await page.addStyleTag({
  content: '.player-ui,.rotate-hint,.player-toast{display:none!important}.pause-screen{display:none!important}'
});
await page.evaluate(() => {
  window.__NEVE_E_FERRO__?.seek(0);
  window.__NEVE_E_FERRO__?.play();
});

const log: Array<{ at: string; time: number; scene: number; subtitle: string | null; audio: unknown }> = [];
let lastScene = -1;
let lastLog = -1;
let screenshots = 0;
const started = Date.now();
const maxMs = (1500 + 40) * 1000;

while (Date.now() - started < maxMs) {
  await page.waitForTimeout(15_000);
  const snapshot = await page.evaluate(() => {
    const api = window.__NEVE_E_FERRO__;
    return {
      state: api?.getState(),
      subtitle: api?.getSubtitle(),
      audio: api?.getAudio(),
      end: Boolean(document.querySelector('.end-screen'))
    };
  });
  const t = snapshot.state?.time ?? 0;
  const scene = snapshot.state?.sceneIndex ?? -1;
  if (scene !== lastScene || t - lastLog >= 60) {
    lastScene = scene;
    lastLog = t;
    log.push({
      at: new Date().toISOString(),
      time: Number(t.toFixed(2)),
      scene,
      subtitle: snapshot.subtitle?.id ?? null,
      audio: snapshot.audio
    });
    console.log(JSON.stringify(log[log.length - 1]));
  }
  if (t >= 240 * (screenshots + 1) && screenshots < 6) {
    screenshots += 1;
    await page.screenshot({ path: `${out}/pass-${String(screenshots).padStart(2, '0')}.png` });
  }
  if (snapshot.end) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/end-screen.png` });
    break;
  }
}

const final = await page.evaluate(() => ({
  state: window.__NEVE_E_FERRO__?.getState(),
  audio: window.__NEVE_E_FERRO__?.getAudio(),
  end: Boolean(document.querySelector('.end-screen')),
  endTitle: document.querySelector('.end-title')?.textContent ?? null
}));
await writeFile(`${out}/full-pass.json`, JSON.stringify({ errors, log, final }, null, 2), 'utf8');
console.log(JSON.stringify({ errors, final, samples: log.length }, null, 2));
await browser.close();
