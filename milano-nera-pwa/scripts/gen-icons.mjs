import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const icons = join(here, 'icons');
const require = createRequire(import.meta.url);
let sharp;
for (const spec of [join(here, '..', 'bucio', 'node_modules', 'sharp'), 'sharp']) {
  try {
    sharp = require(spec);
    break;
  } catch {}
}
if (!sharp) {
  console.error('sharp not found. Run: npm --prefix bucio ci');
  process.exit(1);
}
const source = await readFile(join(icons, 'icon.svg'));
await mkdir(icons, { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180]
]) {
  const png = await sharp(source, { density: 384 })
    .resize(size, size, { fit: 'fill' })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  await writeFile(join(icons, name), png);
  console.log(`ok  ${name}`);
}
