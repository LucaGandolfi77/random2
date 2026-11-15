import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFileSync(join(here, file), 'utf8');

function pngSize(file) {
  const bytes = readFileSync(join(here, file));
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', `${file} is a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('the manifest describes an installable English game', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.lang, 'en');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'any');
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.name.includes('KING SHOT'));
  assert.ok(manifest.shortcuts.length >= 2);
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.type === 'image/png'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.type === 'image/png'));
  assert.ok(manifest.screenshots.length >= 2);
  for (const screenshot of manifest.screenshots) {
    const [width, height] = screenshot.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(screenshot.src), { width, height }, screenshot.src);
  }
});

test('the committed PNG assets have the sizes they claim', () => {
  const expected = [
    ['icons/icon-192.png', 192],
    ['icons/icon-512.png', 512],
    ['icons/icon-maskable-512.png', 512],
    ['icons/apple-touch-icon.png', 180]
  ];
  for (const [file, size] of expected) {
    const dimensions = pngSize(file);
    assert.deepEqual(dimensions, { width: size, height: size }, file);
  }
  assert.deepEqual(pngSize('og-cover.png'), { width: 1200, height: 630 });
});

test('every service-worker precache asset exists and the module graph is complete', () => {
  const sw = read('service-worker.js');
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(block, 'ASSETS block exists');
  const assets = [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.ok(assets.includes('./src/main.js'));
  for (const file of readdirSync(join(here, 'src')).filter((name) => name.endsWith('.js'))) {
    assert.ok(assets.includes(`./src/${file}`), `src/${file} is precached`);
  }
  for (const asset of assets) {
    if (asset === './') continue;
    const target = resolve(here, asset);
    assert.ok(existsSync(target), `${asset} exists`);
  }
  assert.ok(sw.includes("king-shot-pwa-v6"));
  assert.ok(!sw.includes('game.js'), 'the old single-file game is not precached');
});

test('the HTML shell is module-based, accessible and social-ready', () => {
  const html = read('index.html');
  assert.ok(html.includes('viewport-fit=cover'));
  assert.ok(!html.includes('user-scalable=no'));
  assert.ok(html.includes('rel="manifest" href="manifest.json"'));
  assert.ok(html.includes('type="module" src="src/main.js"'));
  assert.ok(html.includes('property="og:image"'));
  assert.ok(html.includes('name="twitter:card"'));
  assert.ok(html.includes('"@type": "VideoGame"'));
  assert.ok(html.includes('apple-touch-icon.png'));
  assert.ok(!html.includes('src="game.js"'));
});

test('the package is ESM and the screen ids the UI drives exist', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.type, 'module');
  const html = read('index.html');
  for (const id of [
    'screen-menu',
    'screen-oath',
    'screen-daily',
    'screen-how',
    'screen-settings',
    'screen-achievements',
    'screen-pause',
    'screen-draft',
    'screen-over',
    'hearts',
    'boss-chip',
    'volley-btn',
    'reset-dialog'
  ]) {
    assert.ok(html.includes(`id="${id}"`), `${id} exists`);
  }
});

test('the README screenshots are present', () => {
  for (const file of ['shots/title.png', 'shots/play.png', 'shots/draft.png', 'shots/over.png', 'shots/desktop.png']) {
    assert.ok(existsSync(join(here, file)), file);
  }
});
