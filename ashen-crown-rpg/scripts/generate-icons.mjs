import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');
mkdirSync(out, { recursive: true });

const emblem = (size, maskable = false) => {
  const pad = maskable ? size * 0.18 : size * 0.08;
  const cx = size / 2;
  const cy = size / 2;
  const crownY = cy - size * 0.04;
  const w = size - pad * 2;
  const h = w * 0.62;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <radialGradient id="bg" cx="50%" cy="38%" r="70%">
        <stop offset="0" stop-color="#3a2420"/>
        <stop offset="0.55" stop-color="#171113"/>
        <stop offset="1" stop-color="#090708"/>
      </radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f4d58a"/>
        <stop offset="0.45" stop-color="#b58a43"/>
        <stop offset="1" stop-color="#5c3c1d"/>
      </linearGradient>
      <linearGradient id="ember" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff9d4d"/>
        <stop offset="1" stop-color="#8e2f21"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.12}" fill="url(#bg)"/>
    <circle cx="${cx}" cy="${cy}" r="${w * 0.52}" fill="none" stroke="#6b4a27" stroke-width="${size * 0.012}" opacity="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="${w * 0.45}" fill="none" stroke="#3f2a18" stroke-width="${size * 0.004}" stroke-dasharray="${size * 0.018} ${size * 0.012}" opacity="0.8"/>
    <path d="M ${cx - w * 0.36} ${crownY + h * 0.46}
             L ${cx - w * 0.42} ${crownY - h * 0.28}
             L ${cx - w * 0.18} ${crownY + h * 0.02}
             L ${cx} ${crownY - h * 0.48}
             L ${cx + w * 0.18} ${crownY + h * 0.02}
             L ${cx + w * 0.42} ${crownY - h * 0.28}
             L ${cx + w * 0.36} ${crownY + h * 0.46}
             Z" fill="url(#gold)" stroke="#2a1a10" stroke-width="${size * 0.008}" stroke-linejoin="round"/>
    <path d="M ${cx - w * 0.34} ${crownY + h * 0.34} L ${cx + w * 0.34} ${crownY + h * 0.34}" stroke="#2a1a10" stroke-width="${size * 0.014}" opacity="0.65"/>
    <path d="M ${cx} ${crownY - h * 0.5} l ${w * 0.035} ${h * 0.12} l ${w * 0.11} ${h * 0.01} l -${w * 0.082} ${h * 0.075} l ${w * 0.034} ${h * 0.11} l -${w * 0.097} -${h * 0.056} l -${w * 0.097} ${h * 0.056} l ${w * 0.034} -${h * 0.11} l -${w * 0.082} -${h * 0.075} l ${w * 0.11} -${h * 0.01} Z" fill="#ffcf73" opacity="0.95"/>
    <path d="M ${cx - w * 0.08} ${crownY + h * 0.56} Q ${cx} ${crownY + h * 0.86} ${cx + w * 0.08} ${crownY + h * 0.56}" fill="none" stroke="url(#ember)" stroke-width="${size * 0.018}" stroke-linecap="round" opacity="0.8"/>
    <circle cx="${cx}" cy="${cy}" r="${w * 0.53}" fill="none" stroke="#a87839" stroke-width="${size * 0.006}" opacity="0.45"/>
  </svg>`;
};

await sharp(Buffer.from(emblem(192))).png().toFile(join(out, 'icon-192.png'));
await sharp(Buffer.from(emblem(512))).png().toFile(join(out, 'icon-512.png'));
await sharp(Buffer.from(emblem(512, true))).png().toFile(join(out, 'icon-maskable-512.png'));
console.log('Generated PWA icons in public/icons');
