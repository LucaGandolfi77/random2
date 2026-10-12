/**
 * Genera le icone PWA e le key-art (screenshot) del gioco a partire da SVG,
 * rasterizzate con sharp. Va eseguito da `npm run icons` (e da `npm run build`).
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outIcons = join(root, 'public', 'icons');
const outScreens = join(root, 'public', 'screens');

const C = {
  deep: '#0b1526',
  deep2: '#132a44',
  ink: '#05070d',
  sand: '#f2dfb5',
  terra: '#d4784f',
  cream: '#f7f1e3',
  sea: '#2fa8c9',
  seaDark: '#1d7fa3',
  palm: '#5fa860',
  lemon: '#ffd15c',
  coral: '#ef7d6b',
  sky1: '#ffc48c',
  sky2: '#ff8f7a',
};

const rnd = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** Sky + stars + low poly town seen from above, with a giant hole chewing it. */
function artSvg(w, h, { padding = 0, title = false } = {}) {
  const r = rnd(w * 7919 + h);
  const cx = w / 2;
  const baseY = h * 0.62;
  const unit = Math.min(w, h);
  const holeR = unit * 0.2 * (1 - padding * 0.18);
  const holeY = baseY;

  const stars = [];
  for (let i = 0; i < 40; i++) {
    const x = r() * w;
    const y = r() * h * 0.5;
    const rad = r() * unit * 0.004 + 0.6;
    stars.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#fff" opacity="${(
        0.15 +
        r() * 0.5
      ).toFixed(2)}"/>`
    );
  }

  // low-poly skyline
  const blocks = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const bw = (w / n) * (0.7 + r() * 1.5);
    const x = (i / n) * w - w * 0.05 + r() * (w / n);
    const bh = unit * (0.05 + r() * 0.14);
    const y = baseY - bh;
    const pal = [C.cream, C.terra, C.lemon, C.coral, C.sand][Math.floor(r() * 5)];
    const dist = Math.abs(x + bw / 2 - cx) / (w / 2);
    // buildings far from the hole stay upright, near the hole get tilted + sinking
    const tilt = Math.max(0, 1 - dist * 1.5) * (28 + r() * 46);
    const sink = Math.max(0, 1 - dist * 1.4) * unit * 0.09;
    const dir = x + bw / 2 < cx ? -1 : 1;
    blocks.push(
      `<g transform="translate(${(x + bw / 2).toFixed(1)} ${(y + sink).toFixed(1)}) rotate(${(
        tilt * dir
      ).toFixed(1)})" opacity="${(0.55 + (1 - dist) * 0.45).toFixed(2)}">
         <rect x="${(-bw / 2).toFixed(1)}" y="${(-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${(
        bh * 1.25
      ).toFixed(1)}" fill="${pal}" rx="${(bw * 0.08).toFixed(1)}"/>
         <rect x="${(-bw / 2).toFixed(1)}" y="${(-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${(
        bh * 0.18
      ).toFixed(1)}" fill="${C.deep}" opacity="0.28"/>
       </g>`
    );
  }

  // tiny props orbiting the rim
  const orbit = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.3;
    const rad = holeR * (1.25 + r() * 0.75);
    const x = cx + Math.cos(a) * rad;
    const y = holeY + Math.sin(a) * rad * 0.42;
    const s = unit * (0.008 + r() * 0.014);
    const pal = [C.lemon, C.coral, C.cream, C.palm][Math.floor(r() * 4)];
    orbit.push(
      `<rect x="${(x - s).toFixed(1)}" y="${(y - s).toFixed(1)}" width="${(s * 2).toFixed(1)}" height="${(
        s * 2
      ).toFixed(1)}" fill="${pal}" transform="rotate(${(a * 57.3).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" opacity="0.95"/>`
    );
  }

  const waves = [];
  for (let i = 0; i < 7; i++) {
    const y = baseY + unit * 0.04 + i * unit * 0.035;
    waves.push(
      `<path d="M0 ${y} Q ${w * 0.25} ${y - unit * 0.012} ${w * 0.5} ${y} T ${w} ${y}" stroke="${
        C.sea
      }" stroke-width="${(unit * 0.006).toFixed(2)}" fill="none" opacity="${(0.75 - i * 0.08).toFixed(2)}"/>`
    );
  }

  const titleBlock = title
    ? `<g>
         <text x="${cx}" y="${(holeY - holeR * 1.45).toFixed(
           0
         )}" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-weight="bold" font-size="${(
        unit * 0.16
      ).toFixed(0)}" fill="${C.cream}" letter-spacing="${(unit * 0.012).toFixed(1)}">BUCIO</text>
         <text x="${cx}" y="${(holeY - holeR * 1.05).toFixed(
           0
         )}" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="${(
        unit * 0.045
      ).toFixed(0)}" fill="${C.lemon}" letter-spacing="${(unit * 0.008).toFixed(
        1
      )}">DIVORA TUTTO</text>
       </g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.deep}"/>
      <stop offset="0.55" stop-color="${C.deep2}"/>
      <stop offset="1" stop-color="#0d1b2a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffd15c" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffd15c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pit" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="#000"/>
      <stop offset="0.7" stop-color="#04060c"/>
      <stop offset="1" stop-color="#0a1220"/>
    </radialGradient>
    <clipPath id="frame"><rect width="${w}" height="${h}"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    ${stars.join('\n    ')}
    <circle cx="${cx}" cy="${baseY - holeR * 0.2}" r="${(holeR * 2.1).toFixed(0)}" fill="url(#glow)"/>
    <rect x="0" y="${baseY}" width="${w}" height="${(h - baseY).toFixed(0)}" fill="${C.seaDark}"/>
    ${waves.join('\n    ')}
    ${blocks.join('\n    ')}
    ${orbit.join('\n    ')}
    <ellipse cx="${cx}" cy="${holeY.toFixed(0)}" rx="${(holeR * 1.12).toFixed(0)}" ry="${(
    holeR * 0.5
  ).toFixed(0)}" fill="${C.deep}" opacity="0.85"/>
    <ellipse cx="${cx}" cy="${holeY.toFixed(0)}" rx="${holeR.toFixed(0)}" ry="${(
    holeR * 0.44
  ).toFixed(0)}" fill="url(#pit)"/>
    <ellipse cx="${cx}" cy="${(holeY - holeR * 0.05).toFixed(0)}" rx="${(holeR * 0.5).toFixed(
    0
  )}" ry="${(holeR * 0.2).toFixed(0)}" fill="#000" opacity="0.9"/>
    ${titleBlock}
  </g>
</svg>`;
}

async function png(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  return file;
}

async function main() {
  await mkdir(outIcons, { recursive: true });
  await mkdir(outScreens, { recursive: true });

  const full = artSvg(512, 512);
  await png(full, 512, join(outIcons, 'icon-512.png'));
  await png(full, 192, join(outIcons, 'icon-192.png'));

  // maskable: contenuto rimpicciolito nella safe zone (centro 80%)
  const maskable = artSvg(512, 512, { padding: 0.28 });
  await png(maskable, 512, join(outIcons, 'maskable-512.png'));
  await png(maskable, 192, join(outIcons, 'maskable-192.png'));

  await sharp(Buffer.from(artSvg(1280, 720, { title: true })))
    .png({ compressionLevel: 9 })
    .toFile(join(outScreens, 'shot-wide.png'));
  await sharp(Buffer.from(artSvg(750, 1334, { title: true })))
    .png({ compressionLevel: 9 })
    .toFile(join(outScreens, 'shot-tall.png'));

  await writeFile(
    join(outIcons, 'favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${
      C.deep
    }"/><circle cx="32" cy="38" r="17" fill="${C.ink}"/><rect x="10" y="18" width="7" height="14" rx="2" fill="${
      C.terra
    }"/><rect x="20" y="14" width="6" height="18" rx="2" fill="${C.cream}"/><rect x="46" y="16" width="6" height="16" rx="2" fill="${
      C.lemon
    }"/><circle cx="46" cy="14" r="3" fill="${C.palm}"/></svg>`,
    'utf8'
  );

  console.log('✓ icone e key-art generate in public/');
}

main();
