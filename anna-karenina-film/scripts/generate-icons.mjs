import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const out = join(process.cwd(), 'public', 'icons');
await mkdir(out, { recursive: true });

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#07090d"/>
  <rect x="78" y="78" width="868" height="868" fill="none" stroke="#c9a15c" stroke-width="8" opacity=".62"/>
  <path d="M300 752 V292 L724 724 V292" fill="none" stroke="#efe9dd" stroke-width="54" stroke-linecap="square" stroke-linejoin="miter"/>
  <path d="M300 842 H724" stroke="#c9a15c" stroke-width="5" opacity=".45"/>
  <circle cx="760" cy="760" r="25" fill="#9e3a45"/>
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#07090d"/>
  <path d="M320 730 V314 L704 710 V314" fill="none" stroke="#efe9dd" stroke-width="52" stroke-linecap="square"/>
  <path d="M320 820 H704" stroke="#c9a15c" stroke-width="5" opacity=".45"/>
  <circle cx="738" cy="738" r="24" fill="#9e3a45"/>
</svg>`;

const splashSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="sg" cx="70%" cy="30%" r="80%"><stop offset="0" stop-color="#342617"/><stop offset=".5" stop-color="#0a0e14"/><stop offset="1" stop-color="#05070b"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sg)"/>
  <circle cx="${w * 0.72}" cy="${h * 0.24}" r="${w * 0.16}" fill="#c9a15c" opacity=".05"/>
  <path d="M 0 ${h * 0.7} C ${w * 0.22} ${h * 0.62} ${w * 0.45} ${h * 0.76} ${w * 0.7} ${h * 0.68} C ${w * 0.85} ${h * 0.63} ${w * 0.95} ${h * 0.67} ${w} ${h * 0.65} L ${w} ${h} L 0 ${h} Z" fill="#080b10" opacity=".9"/>
  <text x="${w * 0.09}" y="${h * 0.38}" fill="#efe9dd" font-family="Georgia, 'Times New Roman', serif" font-size="${w * 0.13}" letter-spacing="${w * 0.006}">NEVE</text>
  <text x="${w * 0.09}" y="${h * 0.46}" fill="#c9a15c" font-family="Georgia, 'Times New Roman', serif" font-size="${w * 0.07}" font-style="italic">e</text>
  <text x="${w * 0.15}" y="${h * 0.46}" fill="#efe9dd" font-family="Georgia, 'Times New Roman', serif" font-size="${w * 0.13}" letter-spacing="${w * 0.006}">FERRO</text>
  <rect x="${w * 0.09}" y="${h * 0.5}" width="${w * 0.13}" height="1" fill="#c9a15c" opacity=".7"/>
  <text x="${w * 0.09}" y="${h * 0.535}" fill="#8f8a81" font-family="Arial, Helvetica, sans-serif" font-size="${w * 0.018}" letter-spacing="${w * 0.004}">UN FILM D'ANIMAZIONE ORIGINALE</text>
  <text x="${w * 0.09}" y="${h * 0.95}" fill="#8f8a81" font-family="Arial, Helvetica, sans-serif" font-size="${w * 0.016}" letter-spacing="${w * 0.003}">25 MINUTI · ITALIANO · SOTTOTITOLI</text>
</svg>`;

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g" cx="72%" cy="36%" r="68%"><stop offset="0" stop-color="#3a2a17"/><stop offset=".55" stop-color="#0b1018"/><stop offset="1" stop-color="#05070b"/></radialGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9a15c" stop-opacity="0"/><stop offset=".5" stop-color="#c9a15c"/><stop offset="1" stop-color="#c9a15c" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <path d="M760 630 C 820 520 900 480 1010 490 C 1090 498 1150 540 1200 600 L 1200 630 Z" fill="#0a0e14" opacity=".9"/>
  <circle cx="930" cy="210" r="130" fill="#c9a15c" opacity=".06"/>
  <text x="90" y="266" fill="#efe9dd" font-family="Georgia, 'Times New Roman', serif" font-size="112" letter-spacing="4">NEVE</text>
  <text x="90" y="370" fill="#c9a15c" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-style="italic">e</text>
  <text x="148" y="370" fill="#efe9dd" font-family="Georgia, 'Times New Roman', serif" font-size="112" letter-spacing="4">FERRO</text>
  <rect x="92" y="418" width="110" height="1" fill="#c9a15c" opacity=".7"/>
  <text x="92" y="462" fill="#c8c0b2" font-family="Georgia, 'Times New Roman', serif" font-size="25" font-style="italic">Liberamente ispirato ad Anna Karenina di Lev Tolstoj</text>
  <text x="92" y="512" fill="#8f8a81" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="4">UN FILM D'ANIMAZIONE ORIGINALE · 25 MIN</text>
  <path d="M90 560 H1110" stroke="url(#line)" stroke-width="1" opacity=".6"/>
</svg>`;

await writeFile(join(out, 'favicon.svg'), iconSvg, 'utf8');
await writeFile(join(out, 'icon.svg'), iconSvg, 'utf8');

const sizes = [192, 512, 1024, 180, 32];
for (const size of sizes) {
  const svg = size === 180 ? iconSvg : iconSvg;
  const name =
    size === 180
      ? 'apple-touch-icon.png'
      : size === 32
        ? 'favicon-32.png'
        : `icon-${size}.png`;
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(out, name));
  console.log('icon', name);
}
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(join(out, 'icon-512-maskable.png'));
await sharp(Buffer.from(maskableSvg)).resize(1024, 1024).png().toFile(join(out, 'icon-1024-maskable.png'));
await sharp(Buffer.from(ogSvg)).jpeg({ quality: 88, progressive: true }).toFile(join(out, 'og.jpg'));
for (const [w, h, name] of [
  [1170, 2532, 'splash-1170x2532.png'],
  [1290, 2796, 'splash-1290x2796.png'],
  [1536, 2048, 'splash-1536x2048.png']
]) {
  await sharp(Buffer.from(splashSvg(w, h))).resize(w, h).png().toFile(join(out, name));
  console.log('splash', name);
}
console.log('icons and og image generated');
