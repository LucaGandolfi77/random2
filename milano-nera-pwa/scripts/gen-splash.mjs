import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const icons = join(here, 'icons');
const splashDir = join(here, 'splash');
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
const icon = await readFile(join(icons, 'icon.svg'), 'utf8');
const iconData = `data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}`;
await mkdir(splashDir, { recursive: true });

const jobs = [
  ['iphone-390x844-1170x2532', 390, 844, 1170, 2532],
  ['iphone-393x852-1179x2556', 393, 852, 1179, 2556],
  ['iphone-402x874-1206x2622', 402, 874, 1206, 2622],
  ['iphone-430x932-1290x2796', 430, 932, 1290, 2796],
  ['iphone-428x926-1284x2778', 428, 926, 1284, 2778],
  ['iphone-414x896-1242x2688', 414, 896, 1242, 2688],
  ['iphone-414x896-828x1792', 414, 896, 828, 1792],
  ['iphone-375x812-1125x2436', 375, 812, 1125, 2436],
  ['iphone-375x667-750x1334', 375, 667, 750, 1334],
  ['iphone-440x956-1320x2868', 440, 956, 1320, 2868]
];

function svg(width, height, landscape) {
  const iconSize = Math.round(Math.min(width, height) * (landscape ? 0.22 : 0.3));
  const titleSize = Math.round(Math.min(width, height) * (landscape ? 0.1 : 0.075));
  const subtitleSize = Math.max(12, Math.round(titleSize * 0.3));
  const centerX = width / 2;
  const iconY = landscape ? height * 0.34 : height * 0.38;
  const titleY = iconY + iconSize * 0.78;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#08080b"/>
        <stop offset=".65" stop-color="#241218"/>
        <stop offset="1" stop-color="#4b1d20"/>
      </linearGradient>
      <radialGradient id="glow" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#e0b35c" stop-opacity=".18"/>
        <stop offset="1" stop-color="#e0b35c" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="${centerX}" cy="${iconY}" r="${iconSize * 0.85}" fill="url(#glow)"/>
    <image href="${iconData}" x="${centerX - iconSize / 2}" y="${iconY - iconSize / 2}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet"/>
    <text x="${centerX}" y="${titleY}" fill="#f1e4c8" font-family="Arial Narrow, Arial, sans-serif" font-size="${titleSize}" font-weight="700" text-anchor="middle" letter-spacing="4">MILANO NERA '77</text>
    <text x="${centerX}" y="${titleY + subtitleSize * 2.2}" fill="#b8a78e" font-family="Arial, sans-serif" font-size="${subtitleSize}" letter-spacing="6" text-anchor="middle">UNA NOTTE DI PIOMBO</text>
    <line x1="${centerX - titleSize * 1.6}" y1="${titleY + subtitleSize * 3.4}" x2="${centerX + titleSize * 1.6}" y2="${titleY + subtitleSize * 3.4}" stroke="#e0b35c" stroke-width="2" opacity=".55"/>
  </svg>`;
}

for (const [name, cssW, cssH, width, height] of jobs) {
  for (const [suffix, w, h, landscape] of [['portrait', width, height, false], ['landscape', height, width, true]]) {
    const png = await sharp(Buffer.from(svg(w, h, landscape))).png({ compressionLevel: 9, palette: false }).toBuffer();
    await writeFile(join(splashDir, `${name}-${suffix}.png`), png);
  }
  console.log(`ok  ${cssW}x${cssH} portrait + landscape`);
}
