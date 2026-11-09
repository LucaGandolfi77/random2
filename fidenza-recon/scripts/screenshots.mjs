import { spawn } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'docs/screenshots');
mkdirSync(output, { recursive: true });
const port = 4173;
const url = `http://127.0.0.1:${port}/`;

const server = spawn('npm', ['--prefix', 'web', 'run', 'preview', '--', '--port', String(port)], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error('Preview server did not start');
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=metal'],
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  const performance = {
    browser: 'Chrome headless (channel: chrome)',
    viewport: '1600x1000',
    captured_at: new Date().toISOString(),
    views: {},
  };
  const readStats = async (name) => {
    performance.views[name] = {
      fps: await page.locator('#stat-fps').textContent(),
      draw_calls: await page.locator('#stat-calls').textContent(),
      triangles: await page.locator('#stat-triangles').textContent(),
    };
  };

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.loading.done', { timeout: 60000 });
  await sleep(1800);
  await page.screenshot({ path: resolve(output, '01-duomo.png') });
  await readStats('duomo');

  await page.locator('[data-view="porta"]').click();
  await sleep(1200);
  await page.screenshot({ path: resolve(output, '02-porta-san-donnino.png') });
  await readStats('porta');

  await page.locator('[data-view="overview"]').click();
  await sleep(1200);
  await page.screenshot({ path: resolve(output, '03-overview.png') });
  await readStats('overview');

  await page.locator('#toggle-confidence').check();
  await sleep(800);
  await page.screenshot({ path: resolve(output, '04-height-confidence.png') });
  await page.locator('#toggle-confidence').uncheck();

  await page.locator('[data-view="street"]').click();
  await sleep(1200);
  await page.screenshot({ path: resolve(output, '05-street-level.png') });
  await readStats('street');

  await page.locator('[data-view="duomo"]').click();
  await page.locator('#toggle-footprints').check();
  await sleep(800);
  await page.screenshot({ path: resolve(output, '06-osm-footprints.png') });

  const exportDir = resolve(root, 'data/processed/export');
  mkdirSync(exportDir, { recursive: true });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.locator('#export-glb').click(),
  ]);
  const glbPath = resolve(exportDir, 'fidenza-piazza-duomo.glb');
  await download.saveAs(glbPath);
  performance.glb_export = {
    path: 'data/processed/export/fidenza-piazza-duomo.glb',
    bytes: statSync(glbPath).size,
  };
  writeFileSync(resolve(root, 'docs/performance.json'), JSON.stringify(performance, null, 2));
  console.log(`GLB export: ${glbPath} (${statSync(glbPath).size} bytes)`);

  console.log(`screenshots written to ${output}`);
  if (errors.length) {
    console.error('Browser errors:');
    errors.forEach((error) => console.error(` - ${error}`));
    process.exitCode = 1;
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
