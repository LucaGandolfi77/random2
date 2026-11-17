/**
 * Rasterise the SVG icons and concept screens into the PNGs used by the
 * manifest. Reuses sharp from the sibling `bucio` tree when available so the
 * game itself stays dependency-free.
 *
 *   npm run assets
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
let sharp;
for (const spec of [join(here, '..', 'bucio', 'node_modules', 'sharp'), 'sharp']) {
  try { sharp = require(spec); break; } catch (e) { /* try next */ }
}
if (!sharp) {
  console.error('sharp not found. Run `npm --prefix bucio ci` first.');
  process.exit(1);
}

async function render(src, out, width, height) {
  const svg = await readFile(src);
  const buf = await sharp(svg, { density: 384 }).resize(width, height, { fit: 'fill' }).png().toBuffer();
  await writeFile(out, buf);
  console.log(`ok  ${out.slice(here.length + 1)}  ${(buf.length / 1024).toFixed(1)} kB`);
}

const icons = join(here, 'icons');
const screens = join(here, 'screens');
await render(join(icons, 'icon.svg'), join(icons, 'icon-192.png'), 192, 192);
await render(join(icons, 'icon.svg'), join(icons, 'icon-512.png'), 512, 512);
await render(join(icons, 'icon-maskable.svg'), join(icons, 'icon-maskable-512.png'), 512, 512);
await render(join(icons, 'icon.svg'), join(icons, 'apple-touch-icon.png'), 180, 180);
for (const name of ['play', 'paytable', 'jackpot']) {
  await render(join(screens, `${name}.svg`), join(screens, `${name}.png`), 390, 844);
}
console.log('\nAssets regenerated. Remember to commit the PNGs.');
