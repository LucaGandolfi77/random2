import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { FILM, sceneStarts } from '../src/data/film';

const out = '/tmp/neve-sweep';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.goto('http://127.0.0.1:4173/random2/anna-karenina-film/?qa=1', { waitUntil: 'networkidle' });
await page.click('[data-action="watch"]');
await page.waitForSelector('.player-screen', { timeout: 45000 });
await page.waitForFunction(() => Boolean(window.__NEVE_E_FERRO__), undefined, { timeout: 15000 });
await page.addStyleTag({
  content: '.player-ui,.pause-screen,.rotate-hint,.player-toast{display:none!important}.subtitle-host{display:none!important}'
});
await page.evaluate(() => window.__NEVE_E_FERRO__?.pause());

const starts = sceneStarts();
const shots = FILM.scenes.flatMap((scene, sceneIndex) =>
  scene.shots.map((shot) => ({
    sceneIndex,
    sceneTitle: scene.title,
    id: shot.id,
    time: (starts[sceneIndex] ?? 0) + shot.start + shot.duration / 2,
    duration: shot.duration
  }))
);

const report: Array<{ index: number; scene: number; id: string; time: number; mean: number; file: string }> = [];
for (let i = 0; i < shots.length; i += 1) {
  const shot = shots[i];
  if (!shot) continue;
  await page.evaluate((time) => window.__NEVE_E_FERRO__?.seek(time), shot.time);
  await page.waitForTimeout(160);
  const file = `${out}/shot-${String(i + 1).padStart(3, '0')}.png`;
  await page.screenshot({ path: file });
  const stats = await sharp(file).greyscale().stats();
  report.push({
    index: i + 1,
    scene: shot.sceneIndex + 1,
    id: shot.id,
    time: Number(shot.time.toFixed(2)),
    mean: Number(stats.channels[0]?.mean.toFixed(2) ?? 0),
    file
  });
}
await writeFile(`${out}/report.json`, JSON.stringify({ errors, shots: report }, null, 2), 'utf8');
const blank = report.filter((item) => item.mean < 2.5);
console.log(JSON.stringify({ count: report.length, errors, blank: blank.map((item) => ({ id: item.id, mean: item.mean })) }, null, 2));
await browser.close();
