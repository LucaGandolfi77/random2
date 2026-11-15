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

test('the manifest is an installable Italian game', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.lang, 'it');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'any');
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.name.includes('MILANO NERA'));
  assert.ok(manifest.shortcuts.length >= 2);
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
  assert.ok(manifest.screenshots.length >= 2);
  for (const screenshot of manifest.screenshots) {
    const [width, height] = screenshot.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(screenshot.src), { width, height }, screenshot.src);
  }
});

test('the committed PWA assets have the right dimensions', () => {
  assert.deepEqual(pngSize('icons/icon-192.png'), { width: 192, height: 192 });
  assert.deepEqual(pngSize('icons/icon-512.png'), { width: 512, height: 512 });
  assert.deepEqual(pngSize('icons/icon-maskable-512.png'), { width: 512, height: 512 });
  assert.deepEqual(pngSize('icons/apple-touch-icon.png'), { width: 180, height: 180 });
  assert.deepEqual(pngSize('og-cover.png'), { width: 1200, height: 630 });
});

test('the service worker precaches every runtime module', () => {
  const sw = read('service-worker.js');
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(block, 'ASSETS block exists');
  const assets = [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  for (const file of readdirSync(join(here, 'src')).filter((name) => name.endsWith('.js'))) {
    assert.ok(assets.includes(`./src/${file}`), `src/${file} is precached`);
  }
  for (const asset of assets) {
    if (asset === './') continue;
    assert.ok(existsSync(resolve(here, asset)), `${asset} exists`);
  }
  assert.ok(sw.includes("milano-nera-77-v3"));
  assert.ok(!sw.includes('game.js'));
});

test('the HTML shell is Italian, module-based and social-ready', () => {
  const html = read('index.html');
  assert.ok(html.includes('lang="it"'));
  assert.ok(html.includes('viewport-fit=cover'));
  assert.ok(!html.includes('user-scalable=no'));
  assert.ok(html.includes('rel="manifest" href="manifest.json"'));
  assert.ok(html.includes('type="module" src="src/main.js"'));
  assert.ok(html.includes('property="og:image"'));
  assert.ok(html.includes('name="twitter:card"'));
  assert.ok(html.includes('"@type": "VideoGame"'));
  assert.ok(html.includes('apple-touch-icon.png'));
  assert.ok(html.includes('apple-touch-startup-image'));
  assert.ok(html.includes('viewport-fit=cover'));
});

test('the package is ESM and the UI target ids exist', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.type, 'module');
  const html = read('index.html');
  for (const id of [
    'screen-title', 'screen-chapters', 'screen-intro', 'screen-help',
    'screen-settings', 'screen-pause', 'screen-result', 'screen-ending',
    'hud', 'health-frames', 'boss-bar', 'chase-panel', 'touch-controls',
    'stick-left', 'stick-right', 'reset-dialog'
  ]) {
    assert.ok(html.includes(`id="${id}"`), `${id} exists`);
  }
});

test('the project ships no binary sprite sheets', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(join(here, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(png|jpe?g|webp|gif)$/i.test(entry.name) && !rel.startsWith('icons/') && !rel.startsWith('shots/') && rel !== 'og-cover.png') {
        files.push(rel);
      }
    }
  };
  walk('src');
  assert.deepEqual(files, []);
});

test('the iPhone PWA assets and checklist exist', () => {
  const html = read('index.html');
  assert.ok((html.match(/rel="apple-touch-startup-image"/g) || []).length >= 16);
  assert.ok(existsSync(join(here, 'splash/iphone-393x852-1179x2556-portrait.png')));
  assert.ok(existsSync(join(here, 'IPHONE.md')));
});

test('the README screenshots and social card source exist', () => {
  for (const file of ['shots/title.png', 'shots/play.png', 'shots/metro.png', 'shots/parco.png', 'shots/chase.png', 'shots/desktop.png', 'shots/iphone-portrait.png', 'scripts/og.html']) {
    assert.ok(existsSync(join(here, file)), file);
  }
});
