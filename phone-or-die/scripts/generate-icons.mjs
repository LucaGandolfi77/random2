import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const svg = path.join(root, 'scripts', 'icon.svg');
const outDir = path.join(root, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 512, name: 'icon-maskable-512.png', padding: 0.14 }
];

for (const entry of sizes) {
  let image = sharp(svg).resize(entry.size, entry.size);
  if (entry.padding) {
    const inner = Math.round(entry.size * (1 - entry.padding * 2));
    const icon = await sharp(svg).resize(inner, inner).png().toBuffer();
    const background = await sharp({
      create: {
        width: entry.size,
        height: entry.size,
        channels: 4,
        background: { r: 5, g: 5, b: 6, alpha: 1 }
      }
    })
      .composite([{ input: icon, left: Math.round(entry.size * entry.padding), top: Math.round(entry.size * entry.padding) }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(outDir, entry.name), background);
    continue;
  }
  await image.png().toFile(path.join(outDir, entry.name));
}

console.log('Generated PWA icons in public/icons');
