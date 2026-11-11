import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const publicDir = path.join(root, 'public');
const icon = await readFile(path.join(publicDir, 'icon.svg'));
const maskable = await readFile(path.join(publicDir, 'icon-maskable.svg'));

const targets = [
  { input: icon, file: 'pwa-192x192.png', size: 192 },
  { input: icon, file: 'pwa-512x512.png', size: 512 },
  { input: maskable, file: 'pwa-maskable-512x512.png', size: 512 },
  { input: icon, file: 'apple-touch-icon.png', size: 180 },
  { input: icon, file: 'favicon-32x32.png', size: 32 },
  { input: icon, file: 'favicon-16x16.png', size: 16 },
];

for (const target of targets) {
  await sharp(target.input).resize(target.size, target.size).png().toFile(path.join(publicDir, target.file));
  console.log(`generated ${target.file}`);
}
