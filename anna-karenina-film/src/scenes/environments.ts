import type { EnvironmentId } from '../data/types';
import type { Palette } from '../data/palettes';

export interface EnvironmentRender {
  back: string;
  front: string;
}

type Stop = [number, string, number?];

let envCounter = 0;

function uidFor(): string {
  envCounter += 1;
  return `env${envCounter}`;
}

function lg(id: string, stops: Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`)
    .join('')}</linearGradient>`;
}

function rg(id: string, stops: Stop[], cx = '50%', cy = '50%', r = '65%'): string {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`)
    .join('')}</radialGradient>`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function commonDefs(uid: string, p: Palette): string {
  return `
    ${lg(`${uid}-sky`, [
      [0, p.bg],
      [0.38, p.deep],
      [0.72, p.mid],
      [1, p.light, 0.75]
    ])}
    ${lg(`${uid}-floor`, [
      [0, p.deep],
      [0.55, p.mid],
      [1, p.ink]
    ])}
    ${lg(`${uid}-wall`, [
      [0, p.deep],
      [0.48, p.mid],
      [1, p.deep]
    ])}
    ${lg(`${uid}-drape`, [
      [0, p.accent],
      [0.45, p.deep],
      [1, p.ink]
    ])}
    ${rg(`${uid}-glow`, [
      [0, p.glow],
      [0.45, p.glow],
      [1, p.glow, 0]
    ])}
    ${rg(`${uid}-warm`, [
      [0, p.warm, 0.52],
      [0.4, p.warm, 0.16],
      [1, p.warm, 0]
    ])}
    ${rg(`${uid}-cool`, [
      [0, p.cold, 0.4],
      [0.5, p.cold, 0.12],
      [1, p.cold, 0]
    ])}
    <filter id="${uid}-blur"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="${uid}-soft"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="${uid}-shadow"><feGaussianBlur stdDeviation="22"/></filter>
    <filter id="${uid}-paper" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0" result="g"/>
      <feComponentTransfer in="g" result="a"><feFuncA type="table" tableValues="0 0.055 0"/></feComponentTransfer>
      <feBlend in="SourceGraphic" in2="a" mode="multiply"/>
    </filter>`;
}

function wrapBack(uid: string, p: Palette, content: string, extraDefs = ''): string {
  return `<svg class="env-svg env-back-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>${commonDefs(uid, p)}${extraDefs}</defs>
    ${content}
    <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-glow)" opacity=".55"/>
    <rect x="0" y="0" width="1920" height="1080" filter="url(#${uid}-paper)" opacity=".55" fill="none"/>
  </svg>`;
}

function wrapFront(uid: string, p: Palette, content: string, extraDefs = ''): string {
  if (!content.trim()) return '';
  return `<svg class="env-svg env-front-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>${commonDefs(uid, p)}${extraDefs}</defs>
    ${content}
  </svg>`;
}

function parquet(uid: string, p: Palette, horizon = 710): string {
  const lines: string[] = [];
  for (let i = -10; i <= 10; i += 1) {
    const bottomX = 960 + i * 145;
    lines.push(
      `<line x1="960" y1="${horizon - 60}" x2="${bottomX}" y2="1080" stroke="${p.light}" stroke-width="1.2" opacity=".11"/>`
    );
  }
  for (let i = 0; i < 12; i += 1) {
    const y = horizon + Math.pow(i / 11, 1.8) * 370;
    lines.push(
      `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="${p.light}" stroke-width="${i < 3 ? 1 : 1.6}" opacity="${0.04 + i * 0.006}"/>`
    );
  }
  return `<g class="env-mid">
    <rect x="0" y="${horizon}" width="1920" height="${1080 - horizon}" fill="url(#${uid}-floor)"/>
    ${lines.join('')}
    <ellipse cx="960" cy="${horizon + 160}" rx="620" ry="150" fill="${p.glow}" opacity=".45"/>
    <ellipse cx="960" cy="${horizon + 310}" rx="360" ry="90" fill="${p.warm}" opacity=".07"/>
  </g>`;
}

function archedWindow(
  uid: string,
  x: number,
  y: number,
  w: number,
  h: number,
  trim: string,
  ice = true
): string {
  const arch = `M ${x} ${y + h} L ${x} ${y + w * 0.48} Q ${x} ${y} ${x + w / 2} ${y - w * 0.06} Q ${x + w} ${y} ${x + w} ${y + w * 0.48} L ${x + w} ${y + h} Z`;
  return `<g class="env-window">
    <path d="${arch}" fill="${ice ? `url(#${uid}-cool)` : `url(#${uid}-warm)`}" opacity=".95"/>
    <path d="${arch}" fill="none" stroke="${trim}" stroke-width="7" opacity=".8"/>
    <path d="M ${x + w / 2} ${y - w * 0.03} L ${x + w / 2} ${y + h}" stroke="${trim}" stroke-width="4" opacity=".65"/>
    <path d="M ${x} ${y + h * 0.44} L ${x + w} ${y + h * 0.44}" stroke="${trim}" stroke-width="3" opacity=".55"/>
    <path d="M ${x} ${y + h * 0.68} L ${x + w} ${y + h * 0.68}" stroke="${trim}" stroke-width="3" opacity=".45"/>
    <ellipse cx="${x + w * 0.2}" cy="${y + h * 0.78}" rx="${w * 0.16}" ry="${h * 0.12}" fill="${p0(uid)}" opacity=".13"/>
  </g>`;
}

function p0(uid: string): string {
  return `url(#${uid}-cool)`;
}

function curtain(x: number, y: number, w: number, h: number, uid: string, trim: string): string {
  const folds: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const fx = x + (w / 5) * i + w * 0.04;
    folds.push(`<path d="M ${fx} ${y} C ${fx - w * 0.06} ${y + h * 0.35} ${fx + w * 0.05} ${y + h * 0.7} ${fx - w * 0.02} ${y + h}" fill="none" stroke="${trim}" stroke-width="3" opacity=".16"/>`);
  }
  return `<g class="env-curtain">
    <path d="M ${x} ${y} L ${x + w * 0.78} ${y} C ${x + w * 0.62} ${y + h * 0.3} ${x + w * 0.9} ${y + h * 0.72} ${x + w * 0.7} ${y + h} L ${x} ${y + h} Z" fill="url(#${uid}-drape)" opacity=".93"/>
    ${folds.join('')}
  </g>`;
}

function chandelier(uid: string, cx: number, cy: number, scale: number, p: Palette): string {
  const arms: string[] = [];
  for (let i = -3; i <= 3; i += 1) {
    const ax = i * 38;
    arms.push(`<path d="M 0 0 C ${ax * 0.55} 40 ${ax * 0.9} 74 ${ax} 92" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".85"/>`);
    arms.push(`<rect x="${ax - 3}" y="86" width="6" height="24" rx="2" fill="${p.light}" opacity=".8"/>`);
    arms.push(`<path d="M ${ax} 82 Q ${ax + 5} 72 ${ax} 64 Q ${ax - 5} 72 ${ax} 82 Z" fill="${p.warm}" opacity=".9"/>`);
  }
  return `<g class="env-chandelier" transform="translate(${cx} ${cy}) scale(${scale})">
    <circle cx="0" cy="0" r="190" fill="url(#${uid}-warm)" opacity=".45"/>
    <line x1="0" y1="-170" x2="0" y2="-60" stroke="${p.trim}" stroke-width="4" opacity=".55"/>
    <circle cx="0" cy="0" r="16" fill="${p.trim}" opacity=".9"/>
    <circle cx="0" cy="28" r="10" fill="${p.trim}" opacity=".8"/>
    ${arms.join('')}
    <path d="M -126 96 C -70 128 70 128 126 96" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".55"/>
    ${Array.from({ length: 17 }, (_, i) => {
      const a = (i / 17) * Math.PI * 2;
      const x = Math.cos(a) * (40 + (i % 4) * 24);
      const y = 70 + Math.sin(a) * 30;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${1.5 + (i % 3)}" fill="${p.light}" opacity=".65"/>`;
    }).join('')}
  </g>`;
}

function column(x: number, top: number, bottom: number, w: number, p: Palette): string {
  return `<g class="env-column">
    <rect x="${x - 12}" y="${top}" width="${w + 24}" height="${bottom - top}" fill="${p.deep}" opacity=".85"/>
    <rect x="${x}" y="${top + 22}" width="${w}" height="${bottom - top - 44}" fill="${p.mid}" opacity=".9"/>
    <path d="M ${x + 8} ${top + 34} L ${x + 8} ${bottom - 54} M ${x + w * 0.45} ${top + 34} L ${x + w * 0.45} ${bottom - 54} M ${x + w - 8} ${top + 34} L ${x + w - 8} ${bottom - 54}" stroke="${p.light}" stroke-width="2" opacity=".12"/>
    <rect x="${x - 20}" y="${top - 8}" width="${w + 40}" height="34" fill="${p.trim}" opacity=".38"/>
    <rect x="${x - 18}" y="${bottom - 32}" width="${w + 36}" height="32" fill="${p.trim}" opacity=".32"/>
  </g>`;
}

function distantTrain(uid: string, x: number, y: number, scale: number, p: Palette): string {
  return `<g class="env-train" transform="translate(${x} ${y}) scale(${scale})" opacity=".9">
    <circle cx="0" cy="18" r="110" fill="url(#${uid}-warm)" opacity=".42"/>
    <path d="M -150 50 L 160 50 L 185 8 L 130 -44 L -96 -44 L -158 4 Z" fill="${p.ink}" opacity=".95"/>
    <rect x="-92" y="-30" width="42" height="28" rx="4" fill="${p.warm}" opacity=".5"/>
    <rect x="-35" y="-30" width="42" height="28" rx="4" fill="${p.warm}" opacity=".35"/>
    <rect x="22" y="-30" width="42" height="28" rx="4" fill="${p.warm}" opacity=".3"/>
    <rect x="-120" y="-78" width="34" height="78" fill="${p.ink}"/>
    <rect x="-126" y="-90" width="46" height="16" fill="${p.ink}"/>
    <circle cx="142" cy="54" r="12" fill="${p.ink}"/>
    <circle cx="80" cy="54" r="14" fill="${p.ink}"/>
    <circle cx="-30" cy="54" r="16" fill="${p.ink}"/>
    <circle cx="-110" cy="54" r="12" fill="${p.ink}"/>
    <circle cx="182" cy="-6" r="18" fill="${p.warm}" opacity=".75"/>
    <circle cx="182" cy="-6" r="60" fill="url(#${uid}-warm)" opacity=".8"/>
    <path d="M -150 50 L 160 50" stroke="${p.trim}" stroke-width="2" opacity=".25"/>
  </g>`;
}

function clockFace(uid: string, cx: number, cy: number, r: number, p: Palette): string {
  const ticks: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = cx + Math.sin(a) * r * 0.82;
    const y1 = cy - Math.cos(a) * r * 0.82;
    const x2 = cx + Math.sin(a) * r * 0.92;
    const y2 = cy - Math.cos(a) * r * 0.92;
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.trim}" stroke-width="2" opacity=".75"/>`);
  }
  return `<g class="env-clock">
    <circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="${p.ink}" opacity=".8"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.light}" opacity=".9"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 8}" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".7"/>
    ${ticks.join('')}
    <line x1="${cx}" y1="${cy}" x2="${cx + r * 0.35}" y2="${cy - r * 0.28}" stroke="${p.ink}" stroke-width="4"/>
    <line x1="${cx}" y1="${cy}" x2="${cx - r * 0.18}" y2="${cy + r * 0.55}" stroke="${p.ink}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="5" fill="${p.trim}"/>
  </g>`;
}

function lamp(cx: number, cy: number, scale: number, uid: string, p: Palette): string {
  return `<g class="env-lamp" transform="translate(${cx} ${cy}) scale(${scale})">
    <circle cx="0" cy="0" r="150" fill="url(#${uid}-warm)" opacity=".55"/>
    <line x1="0" y1="-120" x2="0" y2="-36" stroke="${p.trim}" stroke-width="5" opacity=".6"/>
    <path d="M -24 -36 L 24 -36 L 16 22 L -16 22 Z" fill="${p.light}" opacity=".28"/>
    <path d="M -16 -34 L 16 -34 L 10 10 L -10 10 Z" fill="${p.warm}" opacity=".55"/>
    <path d="M -20 22 L 20 22 L 28 32 L -28 32 Z" fill="${p.trim}" opacity=".8"/>
  </g>`;
}

function birch(x: number, baseY: number, h: number, scale: number, p: Palette, seed: number): string {
  const rnd = mulberry32(seed);
  const marks: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const yy = baseY - h * (0.12 + rnd() * 0.72);
    const ww = 4 + rnd() * 10;
    marks.push(`<path d="M ${x - ww / 2} ${yy} Q ${x} ${yy + 3} ${x + ww / 2} ${yy - 1}" stroke="#1c211d" stroke-width="2" opacity="${0.2 + rnd() * 0.35}"/>`);
  }
  const leaves = Array.from({ length: 9 }, (_, i) => {
    const lx = x + (rnd() - 0.5) * 170 * scale;
    const ly = baseY - h + rnd() * h * 0.55;
    const rr = (24 + rnd() * 38) * scale;
    return `<ellipse cx="${lx}" cy="${ly}" rx="${rr}" ry="${rr * 0.62}" fill="${i % 2 ? p.accent : p.cold}" opacity="${0.14 + rnd() * 0.2}"/>`;
  }).join('');
  return `<g class="env-birch">
    <path d="M ${x - 7 * scale} ${baseY} C ${x - 4 * scale} ${baseY - h * 0.5} ${x - 9 * scale} ${baseY - h * 0.8} ${x - 2 * scale} ${baseY - h} L ${x + 5 * scale} ${baseY - h} C ${x + 1 * scale} ${baseY - h * 0.72} ${x + 8 * scale} ${baseY - h * 0.4} ${x + 7 * scale} ${baseY} Z" fill="#d9ddd0" opacity=".75"/>
    ${marks.join('')}
    ${leaves}
  </g>`;
}

function pine(x: number, baseY: number, h: number, p: Palette, opacity = 0.8): string {
  return `<path d="M ${x} ${baseY} L ${x + h * 0.26} ${baseY} L ${x + h * 0.08} ${baseY - h * 0.95} L ${x - h * 0.08} ${baseY - h * 0.95} L ${x - h * 0.26} ${baseY} Z" fill="${p.ink}" opacity="${opacity}"/>`;
}

function snowField(uid: string, p: Palette, horizon: number): string {
  return `<g class="env-bg">
    <rect x="0" y="${horizon}" width="1920" height="${1080 - horizon}" fill="url(#${uid}-sky)" opacity=".45"/>
    <path d="M 0 ${horizon + 60} C 260 ${horizon - 10} 520 ${horizon + 40} 760 ${horizon + 18} C 1080 ${horizon - 30} 1390 ${horizon + 60} 1920 ${horizon + 8} L 1920 1080 L 0 1080 Z" fill="${p.light}" opacity=".22"/>
    <path d="M 0 ${horizon + 110} C 350 ${horizon + 50} 620 ${horizon + 120} 980 ${horizon + 80} C 1280 ${horizon + 44} 1640 ${horizon + 110} 1920 ${horizon + 66} L 1920 1080 L 0 1080 Z" fill="${p.light}" opacity=".12"/>
  </g>`;
}

function stars(seed: number, p: Palette, count = 40): string {
  const rnd = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const x = rnd() * 1920;
    const y = rnd() * 420;
    const r = rnd() * 1.6 + 0.4;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${p.light}" opacity="${(0.15 + rnd() * 0.5).toFixed(2)}"/>`;
  }).join('');
}

function snowbank(x: number, y: number, w: number, h: number, p: Palette, opacity = 0.35): string {
  return `<path d="M ${x} ${y + h} C ${x + w * 0.18} ${y + h * 0.25} ${x + w * 0.45} ${y + h * 0.05} ${x + w * 0.6} ${y + h * 0.3} C ${x + w * 0.78} ${y + h * 0.55} ${x + w * 0.86} ${y + h * 0.35} ${x + w} ${y + h} Z" fill="${p.light}" opacity="${opacity}"/>`;
}

function windowNight(uid: string, x: number, y: number, w: number, h: number, p: Palette, trim: string): string {
  return `<g class="env-window">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.06}" fill="${p.ink}"/>
    <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" rx="${w * 0.05}" fill="url(#${uid}-sky)"/>
    <path d="M ${x + 18} ${y + h * 0.72} C ${x + w * 0.25} ${y + h * 0.6} ${x + w * 0.45} ${y + h * 0.78} ${x + w - 18} ${y + h * 0.58} L ${x + w - 18} ${y + h - 18} L ${x + 18} ${y + h - 18} Z" fill="${p.light}" opacity=".35"/>
    ${Array.from({ length: 18 }, (_, i) => {
      const sx = x + 22 + ((i * 73) % Math.max(1, w - 44));
      const sy = y + 20 + ((i * 47) % Math.max(1, h - 50));
      return `<circle cx="${sx}" cy="${sy}" r="${1 + (i % 3)}" fill="${p.light}" opacity=".45"/>`;
    }).join('')}
    <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" rx="${w * 0.05}" fill="none" stroke="${trim}" stroke-width="5" opacity=".65"/>
    <line x1="${x + w / 2}" y1="${y + 10}" x2="${x + w / 2}" y2="${y + h - 10}" stroke="${trim}" stroke-width="4" opacity=".55"/>
    <line x1="${x + 10}" y1="${y + h * 0.48}" x2="${x + w - 10}" y2="${y + h * 0.48}" stroke="${trim}" stroke-width="3" opacity=".45"/>
    <g opacity=".5">
      <ellipse cx="${x + 30}" cy="${y + 34}" rx="${w * 0.12}" ry="${h * 0.08}" fill="#e9f1f5" opacity=".22"/>
      <ellipse cx="${x + w - 34}" cy="${y + 48}" rx="${w * 0.1}" ry="${h * 0.12}" fill="#e9f1f5" opacity=".18"/>
      <path d="M ${x + 16} ${y + h - 28} C ${x + 40} ${y + h - 80} ${x + 52} ${y + h - 34} ${x + 70} ${y + h - 16}" fill="none" stroke="#e9f1f5" stroke-width="2" opacity=".2"/>
    </g>
  </g>`;
}


function crowdFigure(
  uid: string,
  x: number,
  y: number,
  scale: number,
  opacity: number,
  blurred: boolean,
  armUp: boolean,
  p: Palette,
  flip = false
): string {
  const filter = blurred ? ` filter="url(#${uid}-blur)"` : '';
  const arm = armUp
    ? `<path d="M 34 -560 C 52 -610 62 -670 54 -720" fill="none" stroke="${p.ink}" stroke-width="18" stroke-linecap="round"/>
       <path d="M 54 -714 C 52 -728 60 -734 64 -724" fill="none" stroke="${p.ink}" stroke-width="10" stroke-linecap="round"/>`
    : `<path d="M 34 -560 C 62 -500 72 -430 78 -370" fill="none" stroke="${p.ink}" stroke-width="18" stroke-linecap="round"/>`;
  return `<g class="env-crowd" transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})" opacity="${(opacity * 0.4).toFixed(2)}"${filter} pointer-events="none">
    <g class="env-crowd-sway">
      <ellipse cx="0" cy="2" rx="76" ry="11" fill="#000" opacity=".26"/>
      <path d="M -42 -585 C -58 -500 -66 -380 -70 -210 C -74 -80 -82 -18 -92 0 L 92 0 C 82 -18 74 -80 70 -210 C 66 -380 58 -500 42 -585 C 24 -604 -24 -604 -42 -585 Z" fill="${p.ink}" opacity=".9"/>
      <path d="M -44 -588 C -30 -604 30 -604 44 -588 L 56 -470 C 24 -448 -24 -448 -56 -470 Z" fill="${p.ink}"/>
      <circle cx="0" cy="-646" r="43" fill="${p.ink}"/>
      <path d="M -34 -630 C -28 -662 28 -662 34 -630" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".3"/>
      <path d="M -44 -564 C -68 -520 -82 -450 -88 -400" fill="none" stroke="${p.ink}" stroke-width="18" stroke-linecap="round"/>
      ${arm}
      <path d="M 44 -570 C 58 -500 66 -360 70 -170" fill="none" stroke="${p.trim}" stroke-width="1.6" opacity=".18"/>
      <path d="M -40 -590 C -54 -510 -60 -390 -64 -230" fill="none" stroke="${p.light}" stroke-width="1" opacity=".06"/>
    </g>
  </g>`;
}

function raceHorse(p: Palette): string {
  return `<g class="env-horse" opacity=".95">
    <ellipse cx="960" cy="880" rx="250" ry="40" fill="${p.ink}" opacity=".34" filter="url(#env-horse-shadow)"/>
    <path d="M 740 760 C 790 690 880 660 990 680 C 1070 660 1140 690 1180 740 C 1208 780 1190 820 1160 840 L 1100 850 C 1080 800 1030 780 970 790 C 920 800 880 830 860 870 L 800 870 C 790 830 780 800 740 760 Z" fill="${p.ink}"/>
    <path d="M 1120 700 C 1120 650 1160 620 1200 640 C 1228 654 1230 690 1210 714 L 1170 740 Z" fill="${p.ink}"/>
    <path d="M 1180 628 L 1210 574 L 1224 586 L 1206 646 Z" fill="${p.ink}"/>
    <path d="M 750 760 C 710 740 690 700 700 660" fill="none" stroke="${p.ink}" stroke-width="18" stroke-linecap="round"/>
    <g class="horse-legs">
      <path d="M 830 820 L 800 930 L 770 930" fill="none" stroke="${p.ink}" stroke-width="16" stroke-linecap="round"/>
      <path d="M 900 830 L 900 940 L 870 950" fill="none" stroke="${p.ink}" stroke-width="16" stroke-linecap="round"/>
      <path d="M 1080 820 L 1100 930 L 1130 944" fill="none" stroke="${p.ink}" stroke-width="16" stroke-linecap="round"/>
      <path d="M 1140 800 L 1180 900 L 1210 910" fill="none" stroke="${p.ink}" stroke-width="16" stroke-linecap="round"/>
    </g>
    <path d="M 1180 620 C 1240 600 1280 620 1300 660" fill="none" stroke="${p.ink}" stroke-width="8" opacity=".8"/>
    <path d="M 960 690 C 990 720 1040 730 1080 710" fill="none" stroke="${p.trim}" stroke-width="4" opacity=".35"/>
  </g>`;
}

function railEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const rnd = mulberry32(41);
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-sky)"/>
      ${stars(8, p, 30)}
      <circle cx="1520" cy="220" r="84" fill="${p.light}" opacity=".1"/>
      <circle cx="1520" cy="220" r="46" fill="${p.light}" opacity=".16"/>
      <path d="M 0 590 C 240 540 410 570 620 520 C 820 474 1070 540 1280 502 C 1500 462 1710 510 1920 480 L 1920 760 L 0 760 Z" fill="${p.mid}" opacity=".8"/>
      <path d="M 0 620 C 260 570 460 610 700 560 C 940 510 1120 590 1380 540 C 1600 500 1780 550 1920 530 L 1920 760 L 0 760 Z" fill="${p.light}" opacity=".2"/>
      ${pine(120, 680, 260, p, 0.8)}
      ${pine(220, 690, 190, p, 0.6)}
      ${pine(1720, 690, 280, p, 0.7)}
      ${pine(1620, 700, 200, p, 0.55)}
      ${distantTrain(uid, 1450, 560, 0.72, p)}
    </g>
    <g class="env-mid">
      ${snowField(uid, p, 700)}
      <path d="M 0 760 C 260 720 420 760 620 730 C 880 690 1080 750 1320 720 C 1520 694 1720 740 1920 710 L 1920 1080 L 0 1080 Z" fill="${p.light}" opacity=".1"/>
      <g opacity=".85">
        <path d="M 680 1080 L 958 650 L 974 650 L 1210 1080 Z" fill="${p.ink}" opacity=".5"/>
        <path d="M 740 1080 L 962 650 L 970 650 L 1180 1080 Z" fill="${p.mid}" opacity=".55"/>
        <line x1="690" y1="1080" x2="960" y2="650" stroke="${p.light}" stroke-width="7" opacity=".32"/>
        <line x1="1210" y1="1080" x2="960" y2="650" stroke="${p.light}" stroke-width="7" opacity=".32"/>
        ${Array.from({ length: 14 }, (_, i) => {
          const t = Math.pow(i / 13, 1.4);
          const y = 650 + t * 430;
          const half = 20 + t * 500;
          return `<line x1="${960 - half}" y1="${y}" x2="${960 + half}" y2="${y}" stroke="${p.ink}" stroke-width="${2 + t * 5}" opacity="${0.2 + t * 0.35}"/>`;
        }).join('')}
        <line x1="700" y1="1080" x2="960" y2="650" stroke="${p.warm}" stroke-width="2" opacity=".2"/>
        <line x1="1200" y1="1080" x2="960" y2="650" stroke="${p.warm}" stroke-width="2" opacity=".2"/>
      </g>
      <g opacity=".55">
        <line x1="1540" y1="760" x2="1580" y2="500" stroke="${p.ink}" stroke-width="10"/>
        <line x1="1580" y1="520" x2="1700" y2="500" stroke="${p.ink}" stroke-width="6"/>
        <line x1="1580" y1="570" x2="1690" y2="555" stroke="${p.ink}" stroke-width="5"/>
      </g>
    </g>
    ${Array.from({ length: 8 }, (_, i) => {
      const x = 80 + rnd() * 1760;
      const y = 720 + rnd() * 300;
      return `<ellipse cx="${x}" cy="${y}" rx="${60 + rnd() * 120}" ry="${4 + rnd() * 8}" fill="${p.light}" opacity="${0.04 + rnd() * 0.06}"/>`;
    }).join('')}`;
  const front = `
    <g class="env-fg">
      <path d="M 0 980 C 130 910 250 950 330 1080 L 0 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
      <path d="M 1920 950 C 1790 900 1660 960 1600 1080 L 1920 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
      ${snowbank(0, 900, 480, 220, p, 0.22)}
      ${snowbank(1450, 880, 520, 260, p, 0.18)}
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function trainEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="#160f0d"/>
      <rect x="0" y="0" width="1920" height="760" fill="url(#${uid}-wall)"/>
      ${Array.from({ length: 10 }, (_, i) => `<rect x="${i * 192}" y="0" width="3" height="760" fill="${p.trim}" opacity=".12"/>`).join('')}
      <rect x="0" y="620" width="1920" height="20" fill="${p.trim}" opacity=".18"/>
      <rect x="0" y="740" width="1920" height="26" fill="${p.trim}" opacity=".26"/>
      <path d="M 0 760 L 1920 760 L 1920 1080 L 0 1080 Z" fill="#1a1411"/>
      ${Array.from({ length: 16 }, (_, i) => `<path d="M ${i * 130 - 60} 1080 L ${760 + i * 90} 760" stroke="${p.accent}" stroke-width="1" opacity=".12"/>`).join('')}
      ${Array.from({ length: 8 }, (_, i) => `<path d="M 0 ${800 + i * 36} L 1920 ${760 + i * 38}" stroke="${p.accent}" stroke-width="1" opacity=".08"/>`).join('')}
      ${windowNight(uid, 210, 150, 590, 430, p, p.trim)}
      ${windowNight(uid, 1240, 180, 430, 350, p, p.trim)}
      ${curtain(120, 100, 210, 640, uid, p.trim)}
      ${curtain(1740, 100, 190, 640, uid, p.trim)}
      <rect x="828" y="220" width="250" height="160" rx="4" fill="#0b0a09" stroke="${p.trim}" stroke-width="8" opacity=".85"/>
      <rect x="844" y="236" width="218" height="128" fill="url(#${uid}-warm)" opacity=".2"/>
      <path d="M 860 250 C 900 280 940 250 980 280 C 1010 300 1030 270 1048 296" fill="none" stroke="${p.light}" stroke-width="3" opacity=".14"/>
      ${lamp(1030, 160, 0.9, uid, p)}
      <g opacity=".8">
        <rect x="90" y="700" width="640" height="170" rx="28" fill="#3a1720"/>
        <path d="M 110 710 C 160 680 250 690 320 720 L 300 850 L 110 860 Z" fill="#4b1c27"/>
        <path d="M 360 690 C 430 670 530 680 610 712 L 650 860 L 370 860 Z" fill="#3c1520"/>
        <path d="M 150 720 L 280 720 M 390 712 L 600 724" stroke="${p.trim}" stroke-width="3" opacity=".35"/>
      </g>
      <g opacity=".8">
        <rect x="1200" y="700" width="620" height="170" rx="28" fill="#2d1820"/>
        <path d="M 1220 710 C 1280 680 1370 690 1450 720 L 1430 860 L 1220 860 Z" fill="#3d1b25"/>
        <path d="M 1480 690 C 1550 670 1650 680 1730 712 L 1790 860 L 1490 860 Z" fill="#30151e"/>
      </g>
      <rect x="720" y="760" width="480" height="18" rx="9" fill="${p.trim}" opacity=".28"/>
      <path d="M 780 778 L 780 930 M 1140 778 L 1140 930" stroke="${p.trim}" stroke-width="6" opacity=".3"/>
      <ellipse cx="960" cy="880" rx="140" ry="22" fill="${p.warm}" opacity=".12"/>
      <g class="train-detail">
        <path d="M 620 930 L 1300 930 L 1440 1080 L 480 1080 Z" fill="#281418" opacity=".72"/>
        <path d="M 650 950 L 1270 950 L 1380 1060 L 540 1060 Z" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".2"/>
        ${Array.from({ length: 7 }, (_, i) => `<path d="M ${650 + i * 100} 950 L ${540 + i * 130} 1060" stroke="${p.trim}" stroke-width="1" opacity=".1"/>`).join('')}
        <rect x="760" y="728" width="400" height="18" rx="9" fill="#3b2017" stroke="${p.trim}" stroke-width="2" opacity=".85"/>
        <path d="M 790 746 L 790 860 M 1130 746 L 1130 860" stroke="${p.trim}" stroke-width="5" opacity=".28"/>
        <rect x="830" y="688" width="72" height="42" rx="3" fill="#0e0b08" stroke="${p.trim}" stroke-width="2" opacity=".7"/>
        <path d="M 838 696 L 894 696 M 838 704 L 886 704 M 838 712 L 892 712" stroke="${p.light}" stroke-width="1" opacity=".16"/>
        <path d="M 1064 674 L 1086 674 L 1081 714 L 1069 714 Z" fill="#c6d4dc" opacity=".22"/>
        <path d="M 1068 714 L 1082 714" stroke="${p.trim}" stroke-width="3" opacity=".4"/>
        <path d="M 180 106 L 1740 106" stroke="${p.trim}" stroke-width="4" opacity=".32"/>
        <path d="M 250 106 L 250 166 M 1660 106 L 1660 166" stroke="${p.trim}" stroke-width="4" opacity=".25"/>
        <rect x="320" y="58" width="210" height="58" rx="8" fill="#392217" stroke="${p.trim}" stroke-width="2" opacity=".7"/>
        <rect x="338" y="66" width="174" height="8" rx="4" fill="${p.light}" opacity=".08"/>
        <rect x="1310" y="70" width="160" height="44" rx="6" fill="#2b1a13" stroke="${p.trim}" stroke-width="2" opacity=".6"/>
        <rect x="1690" y="250" width="170" height="500" rx="8" fill="#170f0b" stroke="${p.trim}" stroke-width="4" opacity=".7"/>
        <circle cx="1718" cy="510" r="8" fill="${p.trim}" opacity=".65"/>
        <path d="M 1600 360 C 1620 460 1610 620 1600 760 L 1690 760 C 1680 620 1670 460 1690 360 Z" fill="#0d1116" opacity=".7"/>
        <circle cx="700" cy="320" r="90" fill="url(#${uid}-warm)" opacity=".22"/>
        <circle cx="700" cy="320" r="9" fill="${p.warm}" opacity=".8"/>
        <circle cx="1250" cy="320" r="80" fill="url(#${uid}-warm)" opacity=".18"/>
        <circle cx="1250" cy="320" r="7" fill="${p.warm}" opacity=".7"/>
        ${Array.from({ length: 10 }, (_, i) => `<circle cx="${170 + (i % 5) * 90}" cy="${770 + Math.floor(i / 5) * 30}" r="3" fill="${p.trim}" opacity=".25"/>`).join('')}
        ${Array.from({ length: 10 }, (_, i) => `<circle cx="${1230 + (i % 5) * 90}" cy="${770 + Math.floor(i / 5) * 30}" r="3" fill="${p.trim}" opacity=".25"/>`).join('')}
      </g>
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-warm)" opacity=".16"/>
    </g>
    <g class="env-mid">
      <rect x="740" y="180" width="440" height="140" fill="#0a0807" opacity=".4"/>
      <path d="M 780 200 L 1140 200" stroke="${p.trim}" stroke-width="5" opacity=".3"/>
      <ellipse cx="960" cy="250" rx="120" ry="40" fill="${p.warm}" opacity=".05"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 90 0 L 140 1080 L 0 1080 Z" fill="#0a0706" opacity=".7" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1830 0 L 1780 1080 L 1920 1080 Z" fill="#0a0706" opacity=".7" filter="url(#${uid}-blur)"/>
      <path d="M 690 900 L 1230 900 L 1290 1080 L 630 1080 Z" fill="#1b1410" opacity=".9"/>
      <path d="M 700 900 L 1220 900" stroke="${p.trim}" stroke-width="5" opacity=".4"/>
      <circle cx="960" cy="1015" r="34" fill="${p.warm}" opacity=".14" filter="url(#${uid}-blur)"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function ballroomEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-wall)"/>
      <rect x="0" y="0" width="1920" height="740" fill="#24180f"/>
      ${Array.from({ length: 7 }, (_, i) => `<rect x="${i * 320}" y="0" width="320" height="740" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".12"/>`).join('')}
      ${archedWindow(uid, 160, 140, 260, 460, p.trim)}
      ${archedWindow(uid, 610, 120, 300, 500, p.trim)}
      ${archedWindow(uid, 1050, 120, 300, 500, p.trim)}
      ${archedWindow(uid, 1500, 140, 260, 460, p.trim)}
      ${column(120, 160, 780, 62, p)}
      ${column(540, 110, 780, 62, p)}
      ${column(990, 90, 780, 70, p)}
      ${column(1450, 110, 780, 62, p)}
      ${column(1780, 160, 780, 62, p)}
      <rect x="0" y="700" width="1920" height="80" fill="${p.deep}" opacity=".8"/>
      <path d="M 0 740 L 1920 740" stroke="${p.trim}" stroke-width="6" opacity=".3"/>
      ${chandelier(uid, 960, 150, 1.25, p)}
      ${curtain(0, 100, 260, 700, uid, p.trim)}
      ${curtain(1700, 100, 240, 700, uid, p.trim)}
      <g class="ballroom-detail">
        <path d="M 0 42 L 1920 42 M 0 86 L 1920 86" stroke="${p.trim}" stroke-width="2" opacity=".16"/>
        ${Array.from({ length: 9 }, (_, i) => `<path d="M ${i * 240} 42 L ${i * 240 + 80} 86" stroke="${p.trim}" stroke-width="1" opacity=".08"/>`).join('')}
        <ellipse cx="960" cy="70" rx="140" ry="34" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".2"/>
        <path d="M 0 126 L 1920 126 M 0 150 L 1920 150" stroke="${p.trim}" stroke-width="3" opacity=".18"/>
        ${Array.from({ length: 16 }, (_, i) => `<path d="M ${i * 130} 126 L ${i * 130 + 60} 150" stroke="${p.trim}" stroke-width="2" opacity=".08"/>`).join('')}
        <path d="M 0 0 C 160 86 320 86 480 4 C 640 82 800 82 960 2 C 1120 80 1280 80 1440 4 C 1600 78 1760 78 1920 0 L 1920 0 Z" fill="${p.accent}" opacity=".16"/>
        <path d="M 0 0 C 160 86 320 86 480 4 C 640 82 800 82 960 2 C 1120 80 1280 80 1440 4 C 1600 78 1760 78 1920 0" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".22"/>
        ${Array.from({ length: 6 }, (_, i) => `<g opacity=".35"><rect x="${380 + i * 220}" y="210" width="150" height="330" fill="none" stroke="${p.trim}" stroke-width="2"/><path d="M ${400 + i * 220} 250 L ${510 + i * 220} 500 M ${510 + i * 220} 250 L ${400 + i * 220} 500" stroke="${p.trim}" stroke-width="1" opacity=".2"/></g>`).join('')}
        ${chandelier(uid, 430, 260, 0.52, p)}
        ${chandelier(uid, 1490, 260, 0.52, p)}
        <g class="ballroom-urn">
          <path d="M 500 690 C 482 640 494 596 520 580 C 548 596 558 640 540 690 Z" fill="${p.deep}" stroke="${p.trim}" stroke-width="3" opacity=".9"/>
          <path d="M 486 692 L 554 692 L 566 720 L 474 720 Z" fill="${p.trim}" opacity=".35"/>
          ${Array.from({ length: 8 }, (_, i) => `<circle cx="${500 + (i % 4) * 14}" cy="${560 - Math.floor(i / 4) * 18}" r="${7 + (i % 3) * 4}" fill="${i % 2 ? p.accent : p.light}" opacity=".35"/>`).join('')}
        </g>
        <g class="ballroom-urn">
          <path d="M 1420 690 C 1402 640 1414 596 1440 580 C 1468 596 1478 640 1460 690 Z" fill="${p.deep}" stroke="${p.trim}" stroke-width="3" opacity=".9"/>
          <path d="M 1406 692 L 1474 692 L 1486 720 L 1394 720 Z" fill="${p.trim}" opacity=".35"/>
          ${Array.from({ length: 8 }, (_, i) => `<circle cx="${1420 + (i % 4) * 14}" cy="${560 - Math.floor(i / 4) * 18}" r="${7 + (i % 3) * 4}" fill="${i % 2 ? p.accent : p.light}" opacity=".35"/>`).join('')}
        </g>
        <path d="M 700 838 L 1220 838 L 1300 1080 L 620 1080 Z" fill="${p.accent}" opacity=".16"/>
        <path d="M 720 850 L 1200 850 L 1260 1060 L 660 1060 Z" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".22"/>
        <path d="M 760 870 L 1160 870 L 1200 1040 L 720 1040 Z" fill="none" stroke="${p.light}" stroke-width="1" opacity=".08"/>
        <ellipse cx="960" cy="930" rx="250" ry="54" fill="${p.glow}" opacity=".14"/>
        <g opacity=".4">
          <circle cx="380" cy="430" r="8" fill="${p.warm}"/>
          <circle cx="1540" cy="430" r="8" fill="${p.warm}"/>
          <path d="M 380 438 L 380 470 M 1540 438 L 1540 470" stroke="${p.trim}" stroke-width="4" opacity=".4"/>
        </g>
      </g>
      <ellipse cx="960" cy="700" rx="800" ry="120" fill="url(#${uid}-warm)" opacity=".24"/>
    </g>
    ${parquet(uid, p, 740)}
    <g class="env-mid">
      <path d="M 0 820 C 320 780 520 840 760 800 C 1000 760 1240 830 1500 790 C 1680 770 1820 800 1920 780" fill="none" stroke="${p.light}" stroke-width="2" opacity=".05"/>
      <ellipse cx="960" cy="880" rx="520" ry="70" fill="${p.glow}" opacity=".3"/>
      <g opacity=".5">
        <rect x="760" y="640" width="400" height="90" rx="6" fill="${p.deep}"/>
        <rect x="780" y="620" width="360" height="30" rx="12" fill="${p.trim}" opacity=".2"/>
        <path d="M 820 620 C 860 590 1050 590 1100 620" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".45"/>
      </g>
      <g class="env-crowd-layer">
        ${crowdFigure(uid, 340, 890, 0.64, 0.36, true, false, p)}
        ${crowdFigure(uid, 480, 880, 0.7, 0.4, true, true, p, true)}
        ${crowdFigure(uid, 640, 850, 0.6, 0.3, true, false, p)}
        ${crowdFigure(uid, 790, 840, 0.62, 0.28, true, true, p, true)}
        ${crowdFigure(uid, 1140, 845, 0.6, 0.28, true, false, p)}
        ${crowdFigure(uid, 1290, 860, 0.66, 0.35, true, true, p, true)}
        ${crowdFigure(uid, 1450, 880, 0.72, 0.4, true, false, p)}
        ${crowdFigure(uid, 1600, 890, 0.64, 0.34, true, true, p, true)}
        ${crowdFigure(uid, 910, 820, 0.54, 0.25, true, false, p)}
        ${crowdFigure(uid, 1030, 820, 0.54, 0.25, true, true, p, true)}
      </g>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 130 0 L 210 1080 L 0 1080 Z" fill="#0b0705" opacity=".72" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1810 0 L 1740 1080 L 1920 1080 Z" fill="#0b0705" opacity=".72" filter="url(#${uid}-blur)"/>
      <path d="M 0 980 C 220 900 340 980 420 1080 L 0 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
      <path d="M 1920 960 C 1720 900 1630 980 1540 1080 L 1920 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function palaceEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-wall)"/>
      <rect x="0" y="0" width="1920" height="720" fill="#1c2427"/>
      ${Array.from({ length: 5 }, (_, i) => `<rect x="${i * 430 - 40}" y="0" width="430" height="720" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".1"/>`).join('')}
      ${archedWindow(uid, 120, 120, 300, 500, p.trim)}
      ${archedWindow(uid, 1480, 120, 300, 500, p.trim)}
      <g opacity=".9">
        <rect x="640" y="140" width="300" height="450" fill="none" stroke="${p.trim}" stroke-width="12"/>
        <rect x="660" y="160" width="260" height="410" fill="${p.ink}" opacity=".7"/>
        <path d="M 680 560 C 720 430 800 300 910 220" fill="none" stroke="${p.light}" stroke-width="2" opacity=".1"/>
      </g>
      <g opacity=".85">
        <rect x="1030" y="410" width="360" height="300" fill="#0d1112" stroke="${p.trim}" stroke-width="9"/>
        <rect x="1052" y="432" width="316" height="256" fill="url(#${uid}-warm)" opacity=".25"/>
        <path d="M 1070 640 C 1110 560 1180 540 1250 570 C 1320 600 1350 550 1390 520" fill="none" stroke="${p.warm}" stroke-width="3" opacity=".3"/>
        <ellipse cx="1220" cy="660" rx="100" ry="24" fill="${p.warm}" opacity=".2"/>
      </g>
      <rect x="0" y="680" width="1920" height="80" fill="${p.deep}" opacity=".9"/>
      <path d="M 0 720 L 1920 720" stroke="${p.trim}" stroke-width="5" opacity=".35"/>
      <g opacity=".8">
        <rect x="760" y="535" width="180" height="140" rx="8" fill="#1a2022" stroke="${p.trim}" stroke-width="4"/>
        <ellipse cx="850" cy="550" rx="70" ry="10" fill="${p.trim}" opacity=".2"/>
        ${clockFace(uid, 850, 610, 48, p)}
      </g>
      <g class="palace-detail">
        ${chandelier(uid, 960, 152, 0.82, p)}
        <path d="M 0 108 L 1920 108 M 0 132 L 1920 132" stroke="${p.trim}" stroke-width="2" opacity=".14"/>
        ${Array.from({ length: 10 }, (_, i) => `<rect x="${i * 200 + 30}" y="170" width="140" height="420" fill="none" stroke="${p.trim}" stroke-width="1" opacity=".06"/>`).join('')}
        <rect x="630" y="130" width="320" height="470" fill="#0c1214" stroke="${p.trim}" stroke-width="10" opacity=".7"/>
        <rect x="650" y="150" width="280" height="430" fill="url(#${uid}-cool)" opacity=".1"/>
        <path d="M 650 150 L 930 580 M 930 150 L 650 580" stroke="${p.light}" stroke-width="1" opacity=".06"/>
        <g opacity=".85">
          <rect x="1000" y="360" width="390" height="350" fill="#0b1012" stroke="${p.trim}" stroke-width="9"/>
          <rect x="1022" y="382" width="346" height="306" fill="url(#${uid}-warm)" opacity=".16"/>
          <path d="M 1030 650 C 1080 540 1160 560 1220 500 C 1290 430 1340 470 1380 420" fill="none" stroke="${p.warm}" stroke-width="3" opacity=".28"/>
          <ellipse cx="1200" cy="660" rx="150" ry="30" fill="${p.warm}" opacity=".18"/>
          <rect x="980" y="700" width="430" height="30" rx="8" fill="${p.trim}" opacity=".22"/>
          <rect x="1010" y="720" width="60" height="80" fill="${p.deep}" opacity=".8"/>
          <rect x="1360" y="720" width="60" height="80" fill="${p.deep}" opacity=".8"/>
          <path d="M 1030 730 C 1030 690 1080 690 1080 730" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".3"/>
          <path d="M 1320 730 C 1320 690 1370 690 1370 730" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".3"/>
        </g>
        <g opacity=".9">
          <rect x="150" y="230" width="210" height="270" fill="#0a0e10" stroke="${p.trim}" stroke-width="8"/>
          <rect x="172" y="252" width="166" height="226" fill="${p.deep}" opacity=".9"/>
          <ellipse cx="255" cy="340" rx="44" ry="58" fill="${p.mid}" opacity=".8"/>
          <path d="M 220 430 C 235 380 280 380 292 430 Z" fill="${p.deep}" opacity=".8"/>
          <rect x="1560" y="230" width="210" height="270" fill="#0a0e10" stroke="${p.trim}" stroke-width="8"/>
          <rect x="1582" y="252" width="166" height="226" fill="${p.deep}" opacity=".9"/>
          <ellipse cx="1665" cy="340" rx="44" ry="58" fill="${p.mid}" opacity=".8"/>
          <path d="M 1630 430 C 1645 380 1690 380 1702 430 Z" fill="${p.deep}" opacity=".8"/>
        </g>
        <path d="M 560 800 L 1360 800 L 1420 1080 L 500 1080 Z" fill="${p.deep}" opacity=".45"/>
        <path d="M 590 820 L 1330 820 L 1380 1050 L 540 1050 Z" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".16"/>
        ${Array.from({ length: 7 }, (_, i) => `<path d="M ${600 + i * 120} 820 L ${550 + i * 130} 1050" stroke="${p.trim}" stroke-width="1" opacity=".08"/>`).join('')}
        <g opacity=".6">
          <ellipse cx="420" cy="700" rx="90" ry="32" fill="${p.warm}" opacity=".2"/>
          <ellipse cx="420" cy="700" rx="54" ry="16" fill="${p.warm}" opacity=".12"/>
        </g>
        <path d="M 118 150 C 190 340 180 560 126 760 L 180 760 C 220 560 230 340 178 150 Z" fill="${p.accent}" opacity=".16"/>
        <path d="M 1480 150 C 1550 340 1540 560 1486 760 L 1540 760 C 1580 560 1590 340 1538 150 Z" fill="${p.accent}" opacity=".16"/>
        <g opacity=".4">
          <path d="M 150 200 L 150 700 M 1490 200 L 1490 700" stroke="${p.trim}" stroke-width="2"/>
          <path d="M 150 260 C 250 230 310 280 420 250" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".5"/>
          <path d="M 1490 260 C 1590 230 1650 280 1760 250" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".5"/>
        </g>
        <rect x="760" y="730" width="180" height="14" rx="7" fill="${p.trim}" opacity=".18"/>
        <rect x="780" y="744" width="20" height="60" fill="${p.trim}" opacity=".12"/>
        <rect x="900" y="744" width="20" height="60" fill="${p.trim}" opacity=".12"/>
        <ellipse cx="850" cy="790" rx="80" ry="18" fill="${p.cold}" opacity=".08"/>
      </g>
      <ellipse cx="960" cy="760" rx="700" ry="120" fill="url(#${uid}-cool)" opacity=".24"/>
      <g opacity=".65">
        <rect x="240" y="660" width="180" height="80" rx="20" fill="#1a2224"/>
        <rect x="1500" y="660" width="180" height="80" rx="20" fill="#1a2224"/>
        <path d="M 250 680 L 410 680 M 1510 680 L 1670 680" stroke="${p.trim}" stroke-width="2" opacity=".3"/>
      </g>
    </g>
    ${parquet(uid, p, 720)}
    <g class="env-mid">
      <path d="M 0 780 C 320 750 600 790 960 760 C 1320 730 1600 790 1920 750" fill="none" stroke="${p.light}" stroke-width="2" opacity=".05"/>
      <ellipse cx="400" cy="800" rx="280" ry="90" fill="${p.cold}" opacity=".07"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 100 0 L 170 1080 L 0 1080 Z" fill="#070c0e" opacity=".7" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1820 0 L 1750 1080 L 1920 1080 Z" fill="#070c0e" opacity=".7" filter="url(#${uid}-blur)"/>
      <path d="M 0 960 C 300 900 520 980 620 1080 L 0 1080 Z" fill="${p.bg}" opacity=".8" filter="url(#${uid}-blur)"/>
      <path d="M 1920 980 C 1680 900 1480 990 1400 1080 L 1920 1080 Z" fill="${p.bg}" opacity=".8" filter="url(#${uid}-blur)"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function apartmentEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="#17080d"/>
      <rect x="0" y="0" width="1920" height="780" fill="url(#${uid}-wall)"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 250}" y="0" width="250" height="780" fill="none" stroke="#3d1822" stroke-width="2" opacity=".25"/>`).join('')}
      ${windowNight(uid, 190, 120, 520, 520, p, p.trim)}
      ${curtain(100, 70, 220, 690, uid, p.trim)}
      ${curtain(610, 70, 190, 690, uid, p.trim)}
      <g opacity=".9">
        <rect x="1320" y="220" width="340" height="430" fill="#0a0608" stroke="${p.trim}" stroke-width="8"/>
        <rect x="1340" y="240" width="300" height="390" fill="url(#${uid}-warm)" opacity=".14"/>
        <path d="M 1360 560 C 1420 440 1510 470 1610 340" fill="none" stroke="${p.light}" stroke-width="2" opacity=".1"/>
      </g>
      <g opacity=".9">
        <rect x="700" y="650" width="520" height="210" rx="30" fill="#2a1018"/>
        <path d="M 720 660 C 800 620 900 640 980 680 L 960 830 L 720 840 Z" fill="#3c1622"/>
        <path d="M 990 630 C 1080 620 1160 650 1210 700 L 1230 850 L 990 840 Z" fill="#2e111b"/>
        <circle cx="760" cy="690" r="8" fill="${p.trim}" opacity=".4"/>
        <circle cx="1180" cy="700" r="8" fill="${p.trim}" opacity=".4"/>
      </g>
      <g opacity=".95">
        <rect x="1340" y="620" width="250" height="12" rx="6" fill="${p.trim}" opacity=".3"/>
        ${lamp(1430, 560, 0.65, uid, p)}
        ${lamp(1510, 565, 0.55, uid, p)}
      </g>
      <g class="apartment-detail">
        ${chandelier(uid, 960, 138, 0.48, p)}
        <path d="M 0 112 L 1920 112 M 0 136 L 1920 136" stroke="${p.trim}" stroke-width="2" opacity=".14"/>
        <rect x="760" y="200" width="380" height="280" fill="#080507" stroke="${p.trim}" stroke-width="8" opacity=".8"/>
        <rect x="782" y="222" width="336" height="236" fill="${p.deep}" opacity=".85"/>
        <path d="M 800 430 C 840 330 920 360 980 280 C 1040 220 1080 260 1110 230" fill="none" stroke="${p.cold}" stroke-width="2" opacity=".14"/>
        <ellipse cx="960" cy="400" rx="80" ry="36" fill="${p.warm}" opacity=".06"/>
        <g opacity=".8">
          <rect x="940" y="500" width="40" height="150" fill="${p.trim}" opacity=".25"/>
          <rect x="900" y="490" width="120" height="12" rx="5" fill="${p.trim}" opacity=".32"/>
          <path d="M 920 640 C 900 610 916 584 946 596 C 976 580 990 610 968 640 Z" fill="${p.deep}" stroke="${p.trim}" stroke-width="2" opacity=".5"/>
          <path d="M 946 590 L 946 550 M 946 550 C 930 536 944 522 960 536 C 976 522 990 536 974 550" fill="none" stroke="${p.accent}" stroke-width="3" opacity=".4"/>
        </g>
        <g opacity=".95">
          <rect x="1300" y="610" width="380" height="26" rx="6" fill="${p.trim}" opacity=".22"/>
          <rect x="1310" y="636" width="360" height="130" fill="#100608" opacity=".9"/>
          <path d="M 1330 650 C 1370 690 1440 670 1480 710 C 1520 748 1580 700 1640 740 L 1640 760 L 1330 760 Z" fill="${p.accent}" opacity=".24"/>
          <ellipse cx="1480" cy="730" rx="120" ry="50" fill="url(#${uid}-warm)" opacity=".5"/>
          <path d="M 1370 700 C 1390 660 1410 680 1420 700 M 1470 690 C 1490 640 1520 660 1530 700 M 1560 700 C 1580 670 1600 680 1610 710" fill="none" stroke="${p.warm}" stroke-width="4" opacity=".45"/>
          ${lamp(1420, 574, 0.5, uid, p)}
          ${lamp(1530, 566, 0.55, uid, p)}
        </g>
        <g opacity=".9">
          <path d="M 720 700 C 760 680 820 690 850 720 L 840 790 L 720 790 Z" fill="#3c1622"/>
          <path d="M 850 680 C 900 660 980 672 1020 700 L 1020 790 L 850 790 Z" fill="#4a1a27"/>
          <path d="M 1030 690 C 1090 680 1140 700 1170 730 L 1180 790 L 1030 790 Z" fill="#35121d"/>
          <path d="M 740 710 C 780 720 810 720 840 710" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".25"/>
          <rect x="720" y="790" width="30" height="60" fill="${p.trim}" opacity=".2"/>
          <rect x="1180" y="790" width="30" height="60" fill="${p.trim}" opacity=".2"/>
        </g>
        <path d="M 620 900 L 1300 900 L 1420 1080 L 500 1080 Z" fill="${p.deep}" opacity=".5"/>
        <path d="M 660 920 L 1260 920 L 1360 1060 L 560 1060 Z" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".14"/>
        ${Array.from({ length: 8 }, (_, i) => `<path d="M ${680 + i * 80} 920 L ${600 + i * 100} 1060" stroke="${p.trim}" stroke-width="1" opacity=".08"/>`).join('')}
        <g opacity=".5">
          <path d="M 1080 900 L 1240 900 L 1280 960 L 1040 960 Z" fill="${p.accent}" opacity=".2"/>
          <ellipse cx="1160" cy="925" rx="50" ry="12" fill="${p.warm}" opacity=".2"/>
        </g>
        <path d="M 100 120 C 140 280 130 520 80 720 L 130 720 C 180 520 190 280 150 120 Z" fill="${p.accent}" opacity=".18"/>
        <path d="M 610 120 C 650 280 640 520 590 720 L 640 720 C 690 520 700 280 660 120 Z" fill="${p.accent}" opacity=".18"/>
        <g opacity=".4">
          <path d="M 700 140 L 700 700 M 1280 140 L 1280 700" stroke="${p.trim}" stroke-width="2"/>
          <path d="M 700 220 C 760 200 800 230 860 210" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".4"/>
        </g>
      </g>
      <ellipse cx="1440" cy="700" rx="250" ry="160" fill="url(#${uid}-warm)" opacity=".35"/>
      <rect x="0" y="760" width="1920" height="30" fill="${p.ink}" opacity=".6"/>
      <path d="M 0 790 L 1920 790 L 1920 1080 L 0 1080 Z" fill="#160b0d"/>
      ${Array.from({ length: 9 }, (_, i) => `<path d="M ${i * 220} 1080 L ${960 + (i - 4) * 150} 790" stroke="${p.accent}" stroke-width="1" opacity=".1"/>`).join('')}
      <ellipse cx="960" cy="900" rx="520" ry="100" fill="${p.glow}" opacity=".16"/>
    </g>
    <g class="env-mid">
      <ellipse cx="1440" cy="650" rx="220" ry="260" fill="url(#${uid}-warm)" opacity=".18"/>
      <g opacity=".8">
        <path d="M 760 220 C 820 260 900 230 960 280 C 1010 320 1080 280 1120 320" fill="none" stroke="${p.light}" stroke-width="2" opacity=".08"/>
      </g>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 120 0 L 180 1080 L 0 1080 Z" fill="#080304" opacity=".75" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1800 0 L 1720 1080 L 1920 1080 Z" fill="#080304" opacity=".75" filter="url(#${uid}-blur)"/>
      <path d="M 0 1000 C 200 900 360 970 460 1080 L 0 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
      <path d="M 1300 900 L 1700 900 L 1800 1080 L 1220 1080 Z" fill="#1a0b10" opacity=".8" filter="url(#${uid}-blur)"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function racecourseEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-sky)"/>
      <circle cx="1500" cy="180" r="110" fill="${p.warm}" opacity=".26"/>
      <circle cx="1500" cy="180" r="70" fill="${p.light}" opacity=".2"/>
      <path d="M 0 520 C 300 470 560 510 820 480 C 1120 446 1390 500 1920 460 L 1920 760 L 0 760 Z" fill="${p.mid}" opacity=".55"/>
      <path d="M 0 570 C 300 520 620 560 940 530 C 1260 500 1580 550 1920 510 L 1920 760 L 0 760 Z" fill="${p.accent}" opacity=".2"/>
      ${Array.from({ length: 9 }, (_, i) => {
        const x = 120 + i * 210;
        return `<g opacity=".55">
          <rect x="${x}" y="500" width="12" height="180" fill="${p.ink}"/>
          <path d="M ${x - 90} 500 L ${x + 110} 500 L ${x + 80} 440 L ${x - 60} 440 Z" fill="${i % 2 ? p.light : p.trim}" opacity=".8"/>
          <path d="M ${x - 60} 440 L ${x + 80} 440" stroke="${p.light}" stroke-width="3" opacity=".3"/>
        </g>`;
      }).join('')}
      <g opacity=".9">
        <path d="M 0 690 L 1920 690 L 1920 760 L 0 760 Z" fill="${p.deep}" opacity=".75"/>
        <path d="M 0 700 L 1920 700" stroke="${p.trim}" stroke-width="4" opacity=".3"/>
        ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 110}" y1="700" x2="${i * 110 - 30}" y2="760" stroke="${p.ink}" stroke-width="3" opacity=".4"/>`).join('')}
      </g>
      <path d="M 0 760 C 400 730 760 780 1160 750 C 1450 730 1700 770 1920 740 L 1920 1080 L 0 1080 Z" fill="${p.accent}" opacity=".5"/>
      <path d="M 0 840 C 460 790 820 850 1260 810 C 1540 784 1760 830 1920 800 L 1920 1080 L 0 1080 Z" fill="${p.warm}" opacity=".12"/>
      <g class="race-detail">
        <g opacity=".65">
          <path d="M 0 760 L 1920 760" stroke="${p.light}" stroke-width="6" opacity=".35"/>
          <path d="M 0 800 L 1920 800" stroke="${p.light}" stroke-width="3" opacity=".2"/>
          ${Array.from({ length: 18 }, (_, i) => `<path d="M ${i * 112} 760 L ${i * 112} 800" stroke="${p.light}" stroke-width="3" opacity=".28"/>`).join('')}
        </g>
        <g opacity=".5">
          ${crowdFigure(uid, 360, 760, 0.44, 0.3, true, false, p)}
          ${crowdFigure(uid, 470, 752, 0.48, 0.3, true, true, p, true)}
          ${crowdFigure(uid, 610, 760, 0.42, 0.25, true, false, p)}
          ${crowdFigure(uid, 760, 748, 0.46, 0.28, true, true, p, true)}
          ${crowdFigure(uid, 1180, 750, 0.44, 0.26, true, false, p)}
          ${crowdFigure(uid, 1320, 758, 0.46, 0.28, true, true, p, true)}
          ${crowdFigure(uid, 1470, 748, 0.42, 0.24, true, false, p)}
          ${crowdFigure(uid, 1600, 756, 0.46, 0.28, true, true, p, true)}
        </g>
        <g opacity=".7">
          <rect x="170" y="700" width="16" height="70" fill="${p.trim}" opacity=".4"/>
          <rect x="320" y="700" width="16" height="70" fill="${p.trim}" opacity=".4"/>
          <path d="M 178 700 L 328 700" stroke="${p.trim}" stroke-width="4" opacity=".4"/>
          <path d="M 178 720 L 328 720" stroke="${p.light}" stroke-width="2" opacity=".2"/>
          ${Array.from({ length: 8 }, (_, i) => `<path d="M ${190 + i * 18} 700 L ${190 + i * 18} 680 L ${204 + i * 18} 690 L ${218 + i * 18} 680" fill="none" stroke="${i % 2 ? p.accent : p.light}" stroke-width="2" opacity=".3"/>`).join('')}
          <rect x="1700" y="640" width="120" height="110" fill="#1b1a15" opacity=".5"/>
          <path d="M 1700 640 L 1820 640 L 1800 610 L 1720 610 Z" fill="${p.trim}" opacity=".3"/>
          <rect x="1725" y="660" width="70" height="50" fill="${p.warm}" opacity=".14"/>
        </g>
      </g>
      <ellipse cx="960" cy="760" rx="900" ry="100" fill="${p.warm}" opacity=".09"/>
      <g opacity=".5">
        <path d="M 0 700 C 260 650 540 690 780 660 C 1080 620 1360 680 1920 640" fill="none" stroke="${p.light}" stroke-width="2" opacity=".12"/>
      </g>
      <g opacity=".32" filter="url(#${uid}-blur)">
        <ellipse cx="760" cy="760" rx="300" ry="50" fill="${p.warm}"/>
        <ellipse cx="1200" cy="780" rx="360" ry="60" fill="${p.light}"/>
      </g>
    </g>
    <g class="env-mid">
      ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${300 + i * 280}" cy="${760 + (i % 2) * 20}" rx="180" ry="16" fill="${p.warm}" opacity=".06"/>`).join('')}
      <path d="M 0 900 L 1920 900" stroke="${p.light}" stroke-width="2" opacity=".06"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 1920 0 L 1920 90 C 1600 140 1540 40 1200 90 C 850 140 700 40 380 90 C 220 116 100 90 0 110 Z" fill="${p.light}" opacity=".12" filter="url(#${uid}-blur)"/>
      <path d="M 0 930 C 300 870 560 960 760 1080 L 0 1080 Z" fill="${p.bg}" opacity=".85" filter="url(#${uid}-blur)"/>
      <path d="M 1920 920 C 1700 880 1520 960 1440 1080 L 1920 1080 Z" fill="${p.bg}" opacity=".85" filter="url(#${uid}-blur)"/>
      <g stroke="${p.light}" stroke-width="4" opacity=".22">
        <path d="M 0 1010 L 1920 1010"/>
        <path d="M 120 1010 L 90 1080 M 420 1010 L 390 1080 M 720 1010 L 690 1080 M 1020 1010 L 990 1080 M 1320 1010 L 1290 1080 M 1620 1010 L 1590 1080" />
      </g>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function bedroomEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="#100b09"/>
      <rect x="0" y="0" width="1920" height="760" fill="url(#${uid}-wall)"/>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${i * 340}" y="0" width="340" height="760" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".08"/>`).join('')}
      <g opacity=".9">
        <rect x="700" y="90" width="520" height="670" rx="30" fill="#1a0f0c"/>
        <path d="M 720 120 C 760 60 1160 60 1200 120 L 1200 760 L 720 760 Z" fill="#26140f" opacity=".9"/>
        <path d="M 760 120 C 800 80 1120 80 1160 120" fill="none" stroke="${p.trim}" stroke-width="4" opacity=".25"/>
        <rect x="760" y="620" width="400" height="150" rx="16" fill="#3a2018"/>
        <path d="M 780 640 C 820 590 1100 590 1140 640 L 1140 760 L 780 760 Z" fill="#4b2a1e"/>
        <path d="M 800 630 C 860 610 1060 610 1120 630" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".25"/>
      </g>
      ${curtain(620, 50, 220, 720, uid, p.trim)}
      ${curtain(1140, 50, 220, 720, uid, p.trim)}
      <g opacity=".9">
        <rect x="1380" y="520" width="260" height="230" rx="12" fill="#1a100c"/>
        <rect x="1400" y="540" width="220" height="12" rx="6" fill="${p.trim}" opacity=".2"/>
        ${lamp(1500, 500, 0.8, uid, p)}
      </g>
      <g opacity=".7">
        <rect x="150" y="200" width="160" height="250" fill="#0a0706" stroke="${p.trim}" stroke-width="5"/>
        <path d="M 180 380 C 200 300 250 280 280 320" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".3"/>
        <circle cx="230" cy="250" r="28" fill="${p.warm}" opacity=".18"/>
        <circle cx="250" cy="230" r="28" fill="${p.warm}" opacity=".12"/>
      </g>
      <g class="bedroom-detail">
        <path d="M 680 140 L 680 720 M 1240 140 L 1240 720 M 650 140 L 1270 140" stroke="${p.trim}" stroke-width="9" opacity=".26"/>
        <path d="M 680 150 C 640 240 660 340 620 420 L 670 420 C 700 340 690 240 710 160 Z" fill="${p.accent}" opacity=".24"/>
        <path d="M 1240 150 C 1280 240 1260 340 1300 420 L 1250 420 C 1220 340 1230 240 1210 160 Z" fill="${p.accent}" opacity=".24"/>
        <rect x="740" y="560" width="190" height="70" rx="26" fill="#e2d5c2" opacity=".18"/>
        <rect x="960" y="558" width="190" height="72" rx="26" fill="#d8c8b2" opacity=".16"/>
        <path d="M 760 650 C 820 690 1110 690 1180 650 L 1180 760 L 760 760 Z" fill="#3e2218" opacity=".75"/>
        ${Array.from({ length: 5 }, (_, i) => `<path d="M ${790 + i * 80} 660 C ${800 + i * 80} 700 ${800 + i * 80} 730 ${810 + i * 80} 760" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".18"/>`).join('')}
        <path d="M 620 900 C 760 860 1150 860 1300 900 L 1360 1080 L 560 1080 Z" fill="${p.deep}" opacity=".55"/>
        <path d="M 660 920 C 800 886 1140 886 1260 920 L 1320 1060 L 600 1060 Z" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".14"/>
        ${Array.from({ length: 7 }, (_, i) => `<path d="M ${690 + i * 90} 920 L ${620 + i * 110} 1060" stroke="${p.trim}" stroke-width="1" opacity=".08"/>`).join('')}
        <g opacity=".9">
          <rect x="1260" y="600" width="190" height="24" rx="6" fill="${p.trim}" opacity=".2"/>
          <rect x="1270" y="624" width="170" height="140" fill="#1b100b" opacity=".9"/>
          <rect x="1300" y="650" width="34" height="54" rx="4" fill="#0c0805" stroke="${p.trim}" stroke-width="1.5" opacity=".7"/>
          <ellipse cx="1317" cy="640" rx="24" ry="30" fill="url(#${uid}-warm)" opacity=".5"/>
          <path d="M 1317 606 C 1308 618 1310 632 1317 638 C 1324 632 1326 618 1317 606 Z" fill="${p.warm}" opacity=".85"/>
          <ellipse cx="1350" cy="700" rx="42" ry="9" fill="${p.trim}" opacity=".2"/>
          <path d="M 1330 690 L 1370 690 L 1360 706 L 1340 706 Z" fill="#d9cbb8" opacity=".16"/>
        </g>
        <g opacity=".8">
          <rect x="420" y="690" width="170" height="28" rx="8" fill="${p.deep}"/>
          <rect x="440" y="718" width="130" height="50" fill="${p.accent}" opacity=".12"/>
          <rect x="450" y="768" width="16" height="70" fill="${p.trim}" opacity=".16"/>
          <rect x="570" y="768" width="16" height="70" fill="${p.trim}" opacity=".16"/>
        </g>
        <g opacity=".9">
          <rect x="580" y="180" width="120" height="150" fill="#0c0805" stroke="${p.trim}" stroke-width="5"/>
          <rect x="600" y="200" width="80" height="110" fill="${p.warm}" opacity=".08"/>
          <path d="M 620 300 C 630 260 650 250 660 270 C 672 242 690 250 690 286 C 680 300 660 300 650 296 C 638 302 622 300 620 300 Z" fill="${p.mid}" opacity=".7"/>
          <circle cx="700" cy="318" r="7" fill="${p.warm}" opacity=".5"/>
          <path d="M 700 318 C 688 306 690 294 700 288 C 710 294 712 306 700 318 Z" fill="${p.accent}" opacity=".7"/>
        </g>
        ${windowNight(uid, 1460, 160, 300, 420, p, p.trim)}
        <path d="M 1440 120 C 1400 240 1420 380 1380 520 L 1440 520 C 1470 380 1450 240 1480 140 Z" fill="${p.accent}" opacity=".2"/>
        <path d="M 1800 120 C 1760 240 1780 380 1740 520 L 1800 520 C 1830 380 1810 240 1840 140 Z" fill="${p.accent}" opacity=".2"/>
        <ellipse cx="1620" cy="680" rx="220" ry="160" fill="url(#${uid}-cool)" opacity=".12"/>
      </g>
      <ellipse cx="960" cy="760" rx="650" ry="180" fill="${p.warm}" opacity=".12"/>
      <rect x="0" y="800" width="1920" height="280" fill="#120c09"/>
      <ellipse cx="960" cy="940" rx="520" ry="90" fill="${p.accent}" opacity=".07"/>
    </g>
    <g class="env-mid">
      <ellipse cx="1500" cy="650" rx="220" ry="220" fill="url(#${uid}-warm)" opacity=".18"/>
      <path d="M 300 700 C 380 640 460 660 520 720" fill="none" stroke="${p.light}" stroke-width="2" opacity=".08"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 100 0 L 160 1080 L 0 1080 Z" fill="#070403" opacity=".8" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1820 0 L 1760 1080 L 1920 1080 Z" fill="#070403" opacity=".8" filter="url(#${uid}-blur)"/>
      <path d="M 690 760 C 760 730 1160 730 1230 760 L 1240 1080 L 680 1080 Z" fill="#1e110c" opacity=".96"/>
      <path d="M 700 770 C 780 740 1140 740 1220 770" fill="none" stroke="${p.trim}" stroke-width="4" opacity=".28"/>
      <path d="M 780 780 C 840 800 1080 800 1140 780" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".2"/>
      <rect x="1340" y="800" width="360" height="20" rx="10" fill="#1a100c" opacity=".9"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function villaEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-sky)"/>
      <circle cx="1460" cy="230" r="150" fill="${p.warm}" opacity=".24"/>
      <circle cx="1460" cy="230" r="90" fill="${p.light}" opacity=".18"/>
      <path d="M 0 520 C 280 470 520 540 760 500 C 1000 460 1240 520 1500 480 C 1680 454 1820 500 1920 480 L 1920 720 L 0 720 Z" fill="${p.mid}" opacity=".55"/>
      <path d="M 0 560 C 300 520 580 580 840 540 C 1120 500 1380 560 1920 520 L 1920 720 L 0 720 Z" fill="${p.accent}" opacity=".25"/>
      ${Array.from({ length: 7 }, (_, i) => `<path d="M ${i * 320 - 40} 540 C ${i * 320 + 20} 430 ${i * 320 + 90} 380 ${i * 320 + 140} 360 L ${i * 320 + 180} 360 C ${i * 320 + 100} 450 ${i * 320 + 70} 520 ${i * 320 + 60} 540 Z" fill="${p.ink}" opacity=".35"/>`).join('')}
      <g opacity=".9">
        <rect x="0" y="620" width="1920" height="460" fill="#1a1711"/>
        <path d="M 0 700 L 1920 700" stroke="${p.trim}" stroke-width="3" opacity=".12"/>
        ${Array.from({ length: 10 }, (_, i) => `<path d="M ${i * 220} 1080 L ${760 + i * 45} 700" stroke="${p.light}" stroke-width="1" opacity=".08"/>`).join('')}
        ${Array.from({ length: 5 }, (_, i) => `<path d="M 0 ${760 + i * 70} L 1920 ${740 + i * 70}" stroke="${p.light}" stroke-width="1" opacity=".05"/>`).join('')}
        <path d="M 0 680 L 1920 680" stroke="${p.trim}" stroke-width="8" opacity=".18"/>
      </g>
      <g opacity=".9">
        <path d="M 0 180 L 0 660 L 300 660 L 300 180 Q 150 70 0 180 Z" fill="#221c14" opacity=".8"/>
        <path d="M 300 240 L 620 240 L 620 660 L 300 660 Z" fill="none" stroke="${p.trim}" stroke-width="5" opacity=".2"/>
        <path d="M 300 240 Q 460 150 620 240" fill="none" stroke="${p.trim}" stroke-width="5" opacity=".25"/>
        <path d="M 1480 660 L 1480 240 Q 1640 130 1800 240 L 1800 660 Z" fill="#201a12" opacity=".75"/>
      </g>
      ${birch(760, 680, 320, 1, p, 12)}
      ${birch(860, 680, 260, 0.8, p, 19)}
      ${birch(1180, 680, 300, 0.9, p, 27)}
      <g opacity=".8">
        <rect x="340" y="560" width="120" height="120" rx="8" fill="#2c2418" stroke="${p.trim}" stroke-width="4"/>
        <path d="M 360 580 C 380 520 430 520 450 580" fill="none" stroke="${p.accent}" stroke-width="4" opacity=".5"/>
        <rect x="1460" y="560" width="140" height="120" rx="8" fill="#2c2418" stroke="${p.trim}" stroke-width="4"/>
        <path d="M 1480 580 C 1510 500 1570 520 1590 580" fill="none" stroke="${p.accent}" stroke-width="4" opacity=".5"/>
      </g>
      <g opacity=".7">
        <rect x="0" y="620" width="1920" height="18" fill="${p.trim}" opacity=".2"/>
        <rect x="0" y="660" width="1920" height="16" fill="${p.trim}" opacity=".12"/>
      </g>
      <g class="villa-detail">
        <path d="M 0 900 L 1920 900" stroke="${p.trim}" stroke-width="10" opacity=".16"/>
        <g opacity=".9">
          <path d="M 140 880 L 140 520 L 210 520 L 210 880 Z" fill="#1b241b" opacity=".8"/>
          <path d="M 150 520 C 130 440 160 390 210 370 C 240 400 250 450 230 520 Z" fill="${p.deep}" opacity=".8"/>
          <path d="M 1690 880 L 1690 540 L 1760 540 L 1760 880 Z" fill="#1b241b" opacity=".8"/>
          <path d="M 1700 540 C 1680 460 1710 420 1760 400 C 1790 430 1800 480 1780 540 Z" fill="${p.deep}" opacity=".8"/>
          <path d="M 340 880 L 340 620 L 390 620 L 390 880 Z" fill="#1b241b" opacity=".65"/>
          <path d="M 1900 880 L 1900 640 L 1860 640 L 1860 880 Z" fill="#1b241b" opacity=".65"/>
        </g>
        <g opacity=".85">
          <rect x="470" y="760" width="180" height="14" rx="7" fill="${p.trim}" opacity=".25"/>
          <rect x="490" y="774" width="140" height="80" fill="#1a1711" stroke="${p.trim}" stroke-width="3" opacity=".7"/>
          <rect x="510" y="700" width="100" height="46" rx="4" fill="${p.light}" opacity=".18"/>
          <path d="M 510 720 L 610 720" stroke="${p.trim}" stroke-width="2" opacity=".3"/>
        </g>
        <g opacity=".9">
          <rect x="1400" y="760" width="170" height="14" rx="7" fill="${p.trim}" opacity=".22"/>
          <rect x="1420" y="774" width="130" height="80" fill="#1a1711" stroke="${p.trim}" stroke-width="3" opacity=".65"/>
          <rect x="1440" y="700" width="90" height="46" rx="4" fill="${p.light}" opacity=".15"/>
        </g>
        <g opacity=".85">
          <path d="M 460 700 C 440 660 450 620 480 600 C 510 620 520 660 500 700 Z" fill="${p.deep}" stroke="${p.trim}" stroke-width="3"/>
          <path d="M 440 702 L 520 702 L 530 730 L 430 730 Z" fill="${p.trim}" opacity=".25"/>
          ${Array.from({ length: 7 }, (_, i) => `<circle cx="${465 + (i % 4) * 14}" cy="${590 - Math.floor(i / 4) * 16}" r="${6 + (i % 3) * 3}" fill="${i % 2 ? p.accent : p.light}" opacity=".3"/>`).join('')}
          <path d="M 1460 700 C 1440 660 1450 620 1480 600 C 1510 620 1520 660 1500 700 Z" fill="${p.deep}" stroke="${p.trim}" stroke-width="3"/>
          <path d="M 1440 702 L 1520 702 L 1530 730 L 1430 730 Z" fill="${p.trim}" opacity=".25"/>
          ${Array.from({ length: 7 }, (_, i) => `<circle cx="${1465 + (i % 4) * 14}" cy="${590 - Math.floor(i / 4) * 16}" r="${6 + (i % 3) * 3}" fill="${i % 2 ? p.accent : p.light}" opacity=".3"/>`).join('')}
        </g>
        <g opacity=".5">
          <path d="M 760 820 C 780 790 820 780 850 800" fill="none" stroke="${p.light}" stroke-width="2" opacity=".12"/>
          <path d="M 1100 840 C 1120 810 1160 800 1190 820" fill="none" stroke="${p.light}" stroke-width="1.5" opacity=".1"/>
          <circle cx="860" cy="820" r="3" fill="${p.accent}" opacity=".3"/>
          <circle cx="1140" cy="850" r="2" fill="${p.accent}" opacity=".25"/>
        </g>
      </g>
      <ellipse cx="960" cy="700" rx="950" ry="140" fill="${p.warm}" opacity=".1"/>
    </g>
    <g class="env-mid">
      <path d="M 0 760 C 380 710 620 760 960 740 C 1300 720 1600 760 1920 730" fill="none" stroke="${p.light}" stroke-width="2" opacity=".05"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 920 C 240 840 420 900 540 1080 L 0 1080 Z" fill="${p.bg}" opacity=".8" filter="url(#${uid}-blur)"/>
      <path d="M 1920 900 C 1700 840 1540 930 1460 1080 L 1920 1080 Z" fill="${p.bg}" opacity=".8" filter="url(#${uid}-blur)"/>
      <g opacity=".85">
        <rect x="0" y="960" width="1920" height="120" fill="#15120d"/>
        <path d="M 0 960 L 1920 960" stroke="${p.trim}" stroke-width="5" opacity=".2"/>
        ${Array.from({ length: 8 }, (_, i) => `<path d="M ${i * 280} 960 L ${i * 280 + 20} 1080" stroke="${p.light}" stroke-width="2" opacity=".08"/>`).join('')}
      </g>
      <path d="M 0 0 L 100 0 L 160 1080 L 0 1080 Z" fill="#0b0906" opacity=".65" filter="url(#${uid}-blur)"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function operaEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="#150709"/>
      <rect x="0" y="0" width="1920" height="760" fill="#2a0d12"/>
      ${Array.from({ length: 6 }, (_, i) => `<path d="M ${i * 380} 0 L ${i * 380 + 190} 0 L ${i * 380 + 190} 760 L ${i * 380} 760 Z" fill="#351017" opacity="${i % 2 ? 0.4 : 0.15}"/>`).join('')}
      <g>
        <rect x="520" y="120" width="880" height="520" rx="12" fill="#0b0507" stroke="${p.trim}" stroke-width="10"/>
        <rect x="546" y="146" width="828" height="468" fill="#2f1018"/>
        <path d="M 546 146 C 620 240 720 210 800 300 C 890 400 1000 260 1120 340 C 1200 390 1280 300 1374 360 L 1374 614 L 546 614 Z" fill="#4a1822" opacity=".8"/>
        <path d="M 600 500 C 700 380 860 460 950 380 C 1050 290 1150 400 1300 320" fill="none" stroke="${p.warm}" stroke-width="4" opacity=".2"/>
        <path d="M 546 146 C 620 240 720 210 800 300" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".25"/>
      </g>
      ${chandelier(uid, 960, 100, 1.1, p)}
      <g opacity=".9">
        <path d="M 0 300 C 160 260 260 300 320 420 L 320 760 L 0 760 Z" fill="#210a0e" stroke="${p.trim}" stroke-width="3" opacity=".7"/>
        <path d="M 1920 300 C 1760 260 1660 300 1600 420 L 1600 760 L 1920 760 Z" fill="#210a0e" stroke="${p.trim}" stroke-width="3" opacity=".7"/>
        <circle cx="150" cy="430" r="20" fill="${p.warm}" opacity=".22"/>
        <circle cx="1770" cy="430" r="20" fill="${p.warm}" opacity=".22"/>
      </g>
      <g opacity=".8">
        <path d="M 0 700 L 1920 700 L 1920 760 L 0 760 Z" fill="#160709"/>
        <path d="M 0 700 L 1920 700" stroke="${p.trim}" stroke-width="5" opacity=".35"/>
      </g>
      <g class="opera-detail">
        <path d="M 420 120 C 600 40 1320 40 1500 120 L 1500 700 L 420 700 Z" fill="none" stroke="${p.trim}" stroke-width="10" opacity=".3"/>
        <path d="M 450 140 C 620 66 1300 66 1470 140 L 1470 620 L 450 620 Z" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".2"/>
        <path d="M 540 150 L 540 610 C 560 520 600 420 650 360 L 690 610 Z" fill="${p.accent}" opacity=".3"/>
        <path d="M 1380 150 L 1380 610 C 1360 520 1320 420 1270 360 L 1230 610 Z" fill="${p.accent}" opacity=".3"/>
        <path d="M 650 360 C 760 430 1160 430 1270 360 L 1270 610 L 650 610 Z" fill="${p.ink}" opacity=".2"/>
        <path d="M 520 140 C 640 80 1280 80 1400 140" fill="none" stroke="${p.trim}" stroke-width="6" opacity=".3"/>
        <path d="M 520 140 C 600 210 700 200 780 250 C 870 310 1050 300 1140 250 C 1220 200 1320 210 1400 140" fill="none" stroke="${p.accent}" stroke-width="4" opacity=".4"/>
        ${chandelier(uid, 500, 220, 0.45, p)}
        ${chandelier(uid, 1420, 220, 0.45, p)}
        <g opacity=".9">
          <path d="M 80 280 C 80 230 140 220 180 250 L 180 660 L 80 660 Z" fill="#1a080b" stroke="${p.trim}" stroke-width="3"/>
          <path d="M 100 300 C 100 260 150 250 160 280 L 160 660 L 100 660 Z" fill="${p.accent}" opacity=".14"/>
          <path d="M 80 420 L 180 420 M 80 540 L 180 540" stroke="${p.trim}" stroke-width="2" opacity=".2"/>
          <path d="M 1840 280 C 1840 230 1780 220 1740 250 L 1740 660 L 1840 660 Z" fill="#1a080b" stroke="${p.trim}" stroke-width="3"/>
          <path d="M 1820 300 C 1820 260 1770 250 1760 280 L 1760 660 L 1820 660 Z" fill="${p.accent}" opacity=".14"/>
          <path d="M 1740 420 L 1840 420 M 1740 540 L 1840 540" stroke="${p.trim}" stroke-width="2" opacity=".2"/>
          ${crowdFigure(uid, 120, 650, 0.3, 0.45, true, false, p)}
          ${crowdFigure(uid, 160, 650, 0.28, 0.35, true, true, p, true)}
          ${crowdFigure(uid, 1770, 650, 0.3, 0.45, true, true, p, true)}
          ${crowdFigure(uid, 1810, 650, 0.28, 0.35, true, false, p)}
        </g>
        <g opacity=".8">
          <path d="M 0 660 L 1920 660" stroke="${p.trim}" stroke-width="3" opacity=".2"/>
          ${Array.from({ length: 12 }, (_, i) => `<circle cx="${700 + i * 45}" cy="630" r="4" fill="${p.warm}" opacity=".4"/>`).join('')}
          <ellipse cx="960" cy="640" rx="420" ry="40" fill="${p.warm}" opacity=".1"/>
        </g>
        <g opacity=".4">
          <path d="M 380 160 L 380 700 M 1540 160 L 1540 700" stroke="${p.trim}" stroke-width="6"/>
          <path d="M 380 220 C 330 280 330 380 380 440" fill="none" stroke="${p.trim}" stroke-width="4" opacity=".5"/>
          <path d="M 1540 220 C 1590 280 1590 380 1540 440" fill="none" stroke="${p.trim}" stroke-width="4" opacity=".5"/>
        </g>
      </g>
      <ellipse cx="960" cy="660" rx="700" ry="110" fill="${p.warm}" opacity=".12"/>
    </g>
    ${parquet(uid, p, 760)}
    <g class="env-mid">
      <ellipse cx="960" cy="820" rx="600" ry="80" fill="${p.accent}" opacity=".1"/>
      <g opacity=".8">
        <path d="M 0 820 C 300 780 620 840 960 800 C 1300 760 1620 830 1920 790" fill="none" stroke="${p.light}" stroke-width="2" opacity=".06"/>
      </g>
      <g class="env-crowd-layer">
        ${crowdFigure(uid, 420, 990, 0.62, 0.3, true, false, p)}
        ${crowdFigure(uid, 640, 970, 0.56, 0.26, true, true, p, true)}
        ${crowdFigure(uid, 1260, 980, 0.58, 0.28, true, false, p)}
        ${crowdFigure(uid, 1480, 1000, 0.64, 0.32, true, true, p, true)}
        ${crowdFigure(uid, 760, 900, 0.45, 0.2, true, false, p)}
        ${crowdFigure(uid, 1160, 900, 0.45, 0.2, true, true, p, true)}
      </g>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 140 0 L 240 1080 L 0 1080 Z" fill="#080203" opacity=".85" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1780 0 L 1690 1080 L 1920 1080 Z" fill="#080203" opacity=".85" filter="url(#${uid}-blur)"/>
      <path d="M 0 940 L 1920 940 L 1920 1080 L 0 1080 Z" fill="#120406" opacity=".9"/>
      <path d="M 0 940 L 1920 940" stroke="${p.trim}" stroke-width="6" opacity=".3"/>
      <path d="M 0 940 C 240 900 400 960 500 1080 L 0 1080 Z" fill="#2b0d13" opacity=".8" filter="url(#${uid}-blur)"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function countryEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-sky)"/>
      <circle cx="1520" cy="180" r="110" fill="${p.warm}" opacity=".22"/>
      <path d="M 0 500 C 260 460 520 520 780 480 C 1040 440 1260 500 1500 470 C 1690 446 1820 480 1920 460 L 1920 760 L 0 760 Z" fill="${p.mid}" opacity=".55"/>
      <path d="M 0 550 C 300 510 560 570 840 530 C 1120 490 1380 550 1920 510 L 1920 760 L 0 760 Z" fill="${p.accent}" opacity=".3"/>
      ${Array.from({ length: 5 }, (_, i) => `<path d="M ${i * 460 - 80} 560 C ${i * 460 + 60} 500 ${i * 460 + 150} 470 ${i * 460 + 250} 470 L ${i * 460 + 300} 470 C ${i * 460 + 160} 520 ${i * 460 + 90} 550 ${i * 460 + 70} 560 Z" fill="${p.ink}" opacity=".25"/>`).join('')}
      <g opacity=".95">
        <rect x="1240" y="470" width="320" height="200" fill="#30261a"/>
        <path d="M 1210 480 L 1400 360 L 1590 480 Z" fill="#1c1711"/>
        <rect x="1300" y="520" width="50" height="70" fill="${p.warm}" opacity=".22"/>
        <rect x="1440" y="520" width="50" height="70" fill="${p.warm}" opacity=".16"/>
        <rect x="1350" y="580" width="42" height="90" fill="#15110c"/>
      </g>
      ${birch(220, 720, 360, 1.2, p, 4)}
      ${birch(360, 740, 260, 0.9, p, 9)}
      ${birch(980, 730, 300, 0.85, p, 15)}
      ${birch(1700, 740, 280, 0.8, p, 22)}
      <g opacity=".8">
        <path d="M 0 760 C 360 700 660 780 980 730 C 1260 690 1560 760 1920 710 L 1920 1080 L 0 1080 Z" fill="#2e3a22"/>
        <path d="M 0 840 C 300 780 620 860 920 810 C 1240 760 1540 840 1920 790 L 1920 1080 L 0 1080 Z" fill="#3f4a2a" opacity=".8"/>
        ${Array.from({ length: 30 }, (_, i) => {
          const x = (i * 71) % 1920;
          const y = 800 + ((i * 37) % 230);
          return `<path d="M ${x} ${y} C ${x + 4} ${y - 20} ${x + 8} ${y - 30} ${x + 12} ${y - 36}" fill="none" stroke="${i % 3 ? p.accent : p.trim}" stroke-width="2" opacity=".28"/>`;
        }).join('')}
        <path d="M 0 780 L 1920 740" stroke="${p.light}" stroke-width="3" opacity=".08"/>
        <path d="M 720 860 L 920 760 L 1120 860" fill="none" stroke="${p.trim}" stroke-width="6" opacity=".18"/>
      </g>
      <g class="country-detail">
        <path d="M 1240 470 L 1560 470 L 1560 670 L 1240 670 Z" fill="#2a2118" stroke="${p.trim}" stroke-width="3" opacity=".9"/>
        <path d="M 1210 480 L 1400 350 L 1590 480 Z" fill="#17120d" stroke="${p.trim}" stroke-width="2" opacity=".9"/>
        <rect x="1270" y="540" width="70" height="90" fill="${p.warm}" opacity=".18"/>
        <rect x="1450" y="540" width="70" height="90" fill="${p.warm}" opacity=".14"/>
        <rect x="1360" y="590" width="50" height="80" fill="#120e0a"/>
        <rect x="1470" y="380" width="28" height="90" fill="#17120d"/>
        <path d="M 1484 380 C 1470 330 1510 300 1540 280 C 1520 330 1530 360 1560 380" fill="none" stroke="${p.light}" stroke-width="2" opacity=".12"/>
        <path d="M 1000 760 C 1150 720 1350 740 1500 760 C 1650 780 1770 760 1920 740 L 1920 780 C 1700 800 1540 790 1320 790 C 1160 790 1060 780 980 780 Z" fill="${p.deep}" opacity=".35"/>
        ${Array.from({ length: 12 }, (_, i) => `<path d="M ${i * 170 + 40} 800 L ${i * 170 + 52} 900" stroke="${p.trim}" stroke-width="3" opacity=".22"/><path d="M ${i * 170 + 40} 820 L ${i * 170 + 170} 820" stroke="${p.trim}" stroke-width="2" opacity=".16"/>`).join('')}
        <g opacity=".8">
          <path d="M 1080 790 C 1050 740 1080 700 1120 690 C 1160 700 1180 740 1150 790 Z" fill="${p.accent}" opacity=".25"/>
          <path d="M 1600 790 C 1570 740 1600 700 1640 690 C 1680 700 1700 740 1670 790 Z" fill="${p.accent}" opacity=".22"/>
          <path d="M 1120 700 C 1120 680 1120 660 1120 640 M 1640 700 C 1640 680 1640 660 1640 640" stroke="${p.trim}" stroke-width="2" opacity=".3"/>
        </g>
        <g opacity=".55">
          <path d="M 400 520 C 420 470 470 430 520 420 L 540 420 C 490 450 450 490 430 540 Z" fill="${p.deep}" opacity=".5"/>
          <path d="M 180 620 C 210 580 260 560 300 570" fill="none" stroke="${p.light}" stroke-width="2" opacity=".12"/>
          <path d="M 720 480 C 760 440 800 430 840 440" fill="none" stroke="${p.light}" stroke-width="1.5" opacity=".14"/>
          <path d="M 300 620 C 330 600 360 600 390 620" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".2"/>
        </g>
        ${Array.from({ length: 24 }, (_, i) => `<path d="M ${i * 82 + 20} ${900 + (i % 4) * 35} C ${i * 82 + 30} ${880 + (i % 4) * 35} ${i * 82 + 36} ${870 + (i % 4) * 35} ${i * 82 + 44} ${860 + (i % 4) * 35}" fill="none" stroke="${i % 3 ? p.accent : p.light}" stroke-width="2" opacity=".2"/>`).join('')}
        <g opacity=".4">
          <path d="M 820 280 C 840 260 870 260 890 280" fill="none" stroke="${p.light}" stroke-width="2"/>
          <path d="M 900 250 C 920 230 950 230 970 250" fill="none" stroke="${p.light}" stroke-width="1.5"/>
          <path d="M 760 300 C 780 280 810 280 830 300" fill="none" stroke="${p.light}" stroke-width="1.5"/>
        </g>
        <circle cx="1520" cy="180" r="80" fill="${p.warm}" opacity=".12"/>
      </g>
      <ellipse cx="960" cy="760" rx="900" ry="100" fill="${p.warm}" opacity=".12"/>
    </g>
    <g class="env-mid">
      <path d="M 0 900 C 300 850 620 910 960 880 C 1300 850 1600 920 1920 880" fill="none" stroke="${p.light}" stroke-width="2" opacity=".06"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 900 C 220 840 380 920 480 1080 L 0 1080 Z" fill="${p.bg}" opacity=".8" filter="url(#${uid}-blur)"/>
      <path d="M 1920 900 C 1720 840 1560 930 1480 1080 L 1920 1080 Z" fill="${p.bg}" opacity=".8" filter="url(#${uid}-blur)"/>
      ${birch(80, 1120, 600, 1.5, p, 31)}
      <g opacity=".8">
        <path d="M 0 1010 C 320 960 640 1030 960 990 C 1280 950 1600 1030 1920 980 L 1920 1080 L 0 1080 Z" fill="#1d2618"/>
        ${Array.from({ length: 22 }, (_, i) => {
          const x = (i * 97) % 1920;
          return `<path d="M ${x} 1080 C ${x + 6} 1040 ${x + 18} 1010 ${x + 30} 990" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".3"/>`;
        }).join('')}
      </g>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function izbaEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="#1b120c"/>
      <rect x="0" y="0" width="1920" height="740" fill="#2a1b11"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 170}" y="0" width="170" height="740" fill="none" stroke="#4a2f1b" stroke-width="3" opacity=".18"/>`).join('')}
      ${Array.from({ length: 7 }, (_, i) => `<path d="M 0 ${100 + i * 80} L 1920 ${90 + i * 80}" stroke="#5a3a22" stroke-width="2" opacity=".08"/>`).join('')}
      <g opacity=".95">
        <rect x="1180" y="160" width="360" height="300" fill="#0b0805" stroke="#4a2f1b" stroke-width="10"/>
        <rect x="1200" y="180" width="320" height="260" fill="url(#${uid}-cool)" opacity=".8"/>
        <path d="M 1200 350 C 1280 320 1360 340 1520 310 L 1520 440 L 1200 440 Z" fill="#c9d6c5" opacity=".16"/>
        <line x1="1360" y1="180" x2="1360" y2="440" stroke="#4a2f1b" stroke-width="5" opacity=".6"/>
        <line x1="1200" y1="320" x2="1520" y2="320" stroke="#4a2f1b" stroke-width="4" opacity=".5"/>
      </g>
      <g opacity=".9">
        <rect x="160" y="220" width="240" height="240" fill="#0c0805" stroke="#4a2f1b" stroke-width="8"/>
        <path d="M 200 260 C 230 230 280 240 300 280 C 320 320 290 360 250 360 C 210 360 190 320 200 260 Z" fill="${p.trim}" opacity=".18"/>
        <circle cx="280" cy="250" r="18" fill="${p.warm}" opacity=".25"/>
        <path d="M 200 420 C 240 390 300 400 340 430" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".2"/>
      </g>
      <g opacity=".95">
        <rect x="520" y="620" width="880" height="140" rx="8" fill="#3d2717"/>
        <path d="M 560 640 L 1360 640 L 1320 740 L 600 740 Z" fill="#5a3a22" opacity=".7"/>
        <rect x="760" y="500" width="180" height="130" rx="12" fill="#8d6b3b" opacity=".7"/>
        <path d="M 790 510 C 800 460 900 460 910 510" fill="none" stroke="${p.trim}" stroke-width="5" opacity=".5"/>
        <rect x="790" y="540" width="120" height="30" rx="6" fill="${p.warm}" opacity=".2"/>
        <path d="M 820 620 L 820 500 M 880 620 L 880 500" stroke="${p.trim}" stroke-width="3" opacity=".3"/>
      </g>
      <g opacity=".8">
        <rect x="1520" y="560" width="240" height="240" rx="12" fill="#24160e"/>
        <path d="M 1560 620 C 1600 580 1680 590 1720 640 C 1740 700 1700 760 1640 770 C 1580 760 1540 700 1560 620 Z" fill="${p.warm}" opacity=".12"/>
        <ellipse cx="1640" cy="700" rx="80" ry="30" fill="${p.warm}" opacity=".15"/>
        <path d="M 1580 580 L 1580 540 M 1660 580 L 1660 530 M 1720 600 L 1740 560" stroke="${p.warm}" stroke-width="3" opacity=".3"/>
      </g>
      <g class="izba-detail">
        <g opacity=".9">
          <rect x="540" y="610" width="840" height="30" rx="6" fill="#6b4527" opacity=".8"/>
          <rect x="560" y="640" width="800" height="20" fill="#3c2615" opacity=".8"/>
          <ellipse cx="760" cy="612" rx="42" ry="12" fill="#d8c7a8" opacity=".28"/>
          <ellipse cx="860" cy="612" rx="28" ry="10" fill="#d8c7a8" opacity=".22"/>
          <path d="M 790 596 L 830 596 L 824 618 L 796 618 Z" fill="#e4d6b9" opacity=".2"/>
          <path d="M 930 612 C 950 590 980 590 1000 612" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".3"/>
          <rect x="1030" y="596" width="50" height="22" rx="4" fill="#d8c7a8" opacity=".18"/>
          <path d="M 1060 596 C 1070 580 1086 580 1096 596" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".3"/>
          <path d="M 1140 610 C 1160 600 1180 600 1200 610" fill="none" stroke="${p.light}" stroke-width="2" opacity=".18"/>
        </g>
        <g opacity=".85">
          <path d="M 620 0 L 620 120 M 700 0 L 700 96 M 780 0 L 780 130" stroke="${p.trim}" stroke-width="3" opacity=".3"/>
          <path d="M 620 120 C 606 146 610 174 630 190 C 650 174 654 146 640 120 Z" fill="${p.accent}" opacity=".3"/>
          <path d="M 700 96 C 686 120 690 146 710 162 C 730 146 734 120 720 96 Z" fill="${p.accent}" opacity=".25"/>
          <path d="M 780 130 C 766 156 770 182 790 198 C 810 182 814 156 800 130 Z" fill="${p.accent}" opacity=".28"/>
        </g>
        <g opacity=".8">
          <rect x="440" y="700" width="240" height="30" rx="6" fill="#3e2716"/>
          <rect x="460" y="730" width="24" height="80" fill="#2a1a0e"/>
          <rect x="640" y="730" width="24" height="80" fill="#2a1a0e"/>
          <rect x="470" y="690" width="180" height="20" rx="8" fill="${p.accent}" opacity=".18"/>
        </g>
        <path d="M 360 900 C 500 860 860 860 1020 900 L 1080 1080 L 300 1080 Z" fill="${p.deep}" opacity=".45"/>
        <path d="M 400 920 C 540 890 820 890 960 920 L 1020 1060 L 340 1060 Z" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".12"/>
        ${Array.from({ length: 6 }, (_, i) => `<path d="M ${430 + i * 95} 920 L ${370 + i * 110} 1060" stroke="${p.trim}" stroke-width="1" opacity=".08"/>`).join('')}
        <g opacity=".7">
          <path d="M 1580 600 C 1620 560 1680 570 1720 620 C 1740 680 1700 740 1640 750 C 1580 740 1540 680 1580 600 Z" fill="${p.warm}" opacity=".14"/>
          <ellipse cx="1650" cy="690" rx="80" ry="28" fill="${p.warm}" opacity=".18"/>
          <path d="M 1590 570 L 1590 530 M 1660 570 L 1660 520 M 1720 590 L 1740 550" stroke="${p.warm}" stroke-width="3" opacity=".3"/>
        </g>
      </g>
      <ellipse cx="960" cy="760" rx="700" ry="160" fill="url(#${uid}-warm)" opacity=".24"/>
      <rect x="0" y="760" width="1920" height="320" fill="#1a110b"/>
    </g>
    <g class="env-mid">
      <ellipse cx="960" cy="800" rx="600" ry="100" fill="${p.warm}" opacity=".1"/>
      <path d="M 100 100 C 200 60 300 80 400 40" fill="none" stroke="#5a3a22" stroke-width="4" opacity=".12"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 90 0 L 150 1080 L 0 1080 Z" fill="#0b0705" opacity=".8" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1830 0 L 1770 1080 L 1920 1080 Z" fill="#0b0705" opacity=".8" filter="url(#${uid}-blur)"/>
      <path d="M 480 860 L 1440 860 L 1500 1080 L 420 1080 Z" fill="#2d1c10" opacity=".95"/>
      <path d="M 500 860 L 1420 860" stroke="${p.trim}" stroke-width="5" opacity=".3"/>
      <ellipse cx="960" cy="980" rx="300" ry="50" fill="${p.warm}" opacity=".08"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function stationEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-sky)"/>
      ${stars(77, p, 50)}
      <path d="M 0 470 C 320 430 620 470 960 450 C 1300 430 1600 470 1920 440 L 1920 760 L 0 760 Z" fill="${p.mid}" opacity=".6"/>
      <g>
        <rect x="0" y="0" width="1920" height="120" fill="${p.ink}" opacity=".3"/>
        ${Array.from({ length: 9 }, (_, i) => `<path d="M ${i * 260 - 100} 0 C ${i * 260 - 20} 160 ${i * 260 + 40} 200 ${i * 260 + 10} 420" fill="none" stroke="${p.ink}" stroke-width="18" opacity=".7"/>`).join('')}
        ${Array.from({ length: 8 }, (_, i) => `<path d="M ${i * 300 - 120} 80 L ${i * 300 + 120} 80" stroke="${p.ink}" stroke-width="10" opacity=".45"/>`).join('')}
        <path d="M 0 420 L 1920 420" stroke="${p.ink}" stroke-width="16" opacity=".55"/>
        <path d="M 0 420 L 1920 420" stroke="${p.light}" stroke-width="3" opacity=".12"/>
      </g>
      <g opacity=".9">
        <rect x="0" y="420" width="1920" height="280" fill="${p.deep}" opacity=".35"/>
        ${Array.from({ length: 11 }, (_, i) => `<rect x="${i * 190}" y="440" width="6" height="240" fill="${p.ink}" opacity=".35"/>`).join('')}
        ${Array.from({ length: 5 }, (_, i) => `<rect x="${i * 430 + 40}" y="450" width="360" height="230" fill="url(#${uid}-cool)" opacity=".08"/>`).join('')}
      </g>
      ${clockFace(uid, 960, 210, 72, p)}
      ${lamp(380, 420, 1.15, uid, p)}
      ${lamp(1540, 420, 1.15, uid, p)}
      <g opacity=".85">
        <rect x="0" y="680" width="1920" height="180" fill="${p.ink}" opacity=".55"/>
        <path d="M 0 700 L 1920 680" stroke="${p.light}" stroke-width="4" opacity=".2"/>
        <path d="M 0 740 L 1920 720" stroke="${p.light}" stroke-width="2" opacity=".1"/>
        ${Array.from({ length: 8 }, (_, i) => `<path d="M ${i * 280} 700 L ${i * 280 - 40} 860" stroke="${p.ink}" stroke-width="5" opacity=".4"/>`).join('')}
      </g>
      <g opacity=".75">
        <path d="M 0 860 L 1920 860 L 1920 1080 L 0 1080 Z" fill="#0b1116"/>
        <path d="M 0 860 L 1920 860" stroke="${p.light}" stroke-width="5" opacity=".18"/>
        <path d="M 620 1080 L 940 860 L 980 860 L 720 1080 Z" fill="${p.ink}" opacity=".6"/>
        <path d="M 1200 1080 L 980 860 L 1020 860 L 1320 1080 Z" fill="${p.ink}" opacity=".6"/>
        <line x1="660" y1="1080" x2="958" y2="860" stroke="${p.light}" stroke-width="5" opacity=".22"/>
        <line x1="1260" y1="1080" x2="966" y2="860" stroke="${p.light}" stroke-width="5" opacity=".22"/>
      </g>
      <g class="station-detail">
        ${lamp(620, 360, 0.7, uid, p)}
        ${lamp(1300, 360, 0.7, uid, p)}
        <g opacity=".8">
          <rect x="570" y="470" width="240" height="50" rx="4" fill="#0e1418" stroke="${p.trim}" stroke-width="4"/>
          <path d="M 590 470 L 590 432 M 790 470 L 790 432" stroke="${p.trim}" stroke-width="4" opacity=".5"/>
          <text x="690" y="503" text-anchor="middle" fill="${p.light}" font-family="Georgia, serif" font-size="20" letter-spacing="7" opacity=".55">PIETROBURGO</text>
        </g>
        <g opacity=".85">
          <rect x="120" y="780" width="230" height="180" fill="#10171b" stroke="${p.trim}" stroke-width="4"/>
          <rect x="145" y="805" width="180" height="90" fill="${p.warm}" opacity=".14"/>
          <path d="M 145 805 L 325 805 L 325 895 L 145 895 Z" fill="none" stroke="${p.trim}" stroke-width="2" opacity=".4"/>
          <path d="M 235 805 L 235 895" stroke="${p.trim}" stroke-width="2" opacity=".3"/>
          <circle cx="300" cy="930" r="7" fill="${p.trim}" opacity=".5"/>
          <text x="235" y="940" text-anchor="middle" fill="${p.light}" font-family="Georgia, serif" font-size="12" letter-spacing="3" opacity=".28">BIGLIETTERIA</text>
        </g>
        <g opacity=".9">
          <rect x="1450" y="830" width="280" height="50" rx="8" fill="#171d20" stroke="${p.trim}" stroke-width="3"/>
          <rect x="1470" y="880" width="24" height="70" fill="${p.trim}" opacity=".3"/>
          <rect x="1680" y="880" width="24" height="70" fill="${p.trim}" opacity=".3"/>
          <path d="M 1450 850 L 1730 850" stroke="${p.trim}" stroke-width="2" opacity=".3"/>
          <rect x="1520" y="790" width="70" height="40" rx="5" fill="#2c2118" stroke="${p.trim}" stroke-width="3"/>
          <rect x="1600" y="800" width="55" height="30" rx="4" fill="#1d2a2d" stroke="${p.trim}" stroke-width="2"/>
        </g>
        <g opacity=".8">
          <rect x="690" y="960" width="120" height="70" rx="8" fill="#2c2118" stroke="${p.trim}" stroke-width="3"/>
          <rect x="710" y="976" width="80" height="8" rx="4" fill="${p.trim}" opacity=".25"/>
          <rect x="820" y="990" width="150" height="50" rx="6" fill="#1a2228" stroke="${p.trim}" stroke-width="3"/>
          <circle cx="850" cy="1035" r="7" fill="#0c0f12"/>
          <circle cx="940" cy="1035" r="7" fill="#0c0f12"/>
        </g>
        <g opacity=".7">
          <circle cx="420" cy="860" r="3" fill="${p.light}" opacity=".4"/>
          <circle cx="1100" cy="850" r="2" fill="${p.light}" opacity=".3"/>
          <path d="M 380 900 C 420 880 470 890 500 920" fill="none" stroke="${p.light}" stroke-width="2" opacity=".1"/>
          <path d="M 1420 900 C 1460 880 1510 890 1540 920" fill="none" stroke="${p.light}" stroke-width="2" opacity=".1"/>
        </g>
      </g>
      ${distantTrain(uid, 1450, 690, 0.65, p)}
      <g filter="url(#${uid}-blur)" opacity=".3">
        <ellipse cx="500" cy="820" rx="300" ry="90" fill="${p.light}"/>
        <ellipse cx="1500" cy="800" rx="250" ry="70" fill="${p.light}"/>
      </g>
    </g>
    <g class="env-mid">
      <path d="M 0 760 C 320 730 620 780 960 750 C 1300 720 1600 770 1920 740" fill="none" stroke="${p.light}" stroke-width="2" opacity=".05"/>
      <ellipse cx="960" cy="760" rx="600" ry="90" fill="${p.glow}" opacity=".2"/>
      <g class="env-crowd-layer">
        ${crowdFigure(uid, 380, 990, 0.58, 0.3, true, false, p)}
        ${crowdFigure(uid, 520, 1000, 0.62, 0.28, true, true, p, true)}
        ${crowdFigure(uid, 680, 980, 0.5, 0.22, true, false, p)}
        ${crowdFigure(uid, 1280, 990, 0.55, 0.26, true, true, p, true)}
        ${crowdFigure(uid, 1420, 1000, 0.6, 0.3, true, false, p)}
        ${crowdFigure(uid, 1570, 980, 0.5, 0.22, true, true, p, true)}
      </g>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 110 0 L 190 1080 L 0 1080 Z" fill="#04070a" opacity=".85" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1810 0 L 1730 1080 L 1920 1080 Z" fill="#04070a" opacity=".85" filter="url(#${uid}-blur)"/>
      <path d="M 0 930 C 280 880 500 960 650 1080 L 0 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
      <path d="M 1920 940 C 1700 890 1510 960 1400 1080 L 1920 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
      <g opacity=".9">
        <rect x="0" y="930" width="1920" height="20" fill="${p.light}" opacity=".1"/>
        <path d="M 0 930 L 1920 930" stroke="${p.light}" stroke-width="3" opacity=".16"/>
      </g>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function tracksEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="url(#${uid}-sky)"/>
      ${stars(91, p, 24)}
      <circle cx="1440" cy="250" r="100" fill="${p.light}" opacity=".08"/>
      <path d="M 0 540 C 260 500 500 550 760 520 C 1040 486 1280 540 1540 510 C 1720 490 1840 520 1920 500 L 1920 760 L 0 760 Z" fill="${p.mid}" opacity=".55"/>
      <path d="M 0 600 C 320 560 620 610 960 580 C 1280 550 1600 600 1920 570 L 1920 760 L 0 760 Z" fill="${p.light}" opacity=".15"/>
      ${pine(220, 720, 240, p, 0.55)}
      ${pine(1720, 720, 260, p, 0.5)}
      <g opacity=".75">
        <path d="M 0 760 C 340 720 700 780 1040 740 C 1360 700 1640 760 1920 730 L 1920 1080 L 0 1080 Z" fill="#d4dfe5" opacity=".2"/>
        <path d="M 680 1080 L 954 720 L 976 720 L 1240 1080 Z" fill="${p.ink}" opacity=".45"/>
        <line x1="700" y1="1080" x2="960" y2="720" stroke="${p.light}" stroke-width="6" opacity=".26"/>
        <line x1="1210" y1="1080" x2="960" y2="720" stroke="${p.light}" stroke-width="6" opacity=".26"/>
        ${Array.from({ length: 12 }, (_, i) => {
          const t = Math.pow(i / 11, 1.4);
          const y = 720 + t * 360;
          const half = 18 + t * 500;
          return `<line x1="${960 - half}" y1="${y}" x2="${960 + half}" y2="${y}" stroke="${p.ink}" stroke-width="${2 + t * 4}" opacity="${0.14 + t * 0.25}"/>`;
        }).join('')}
        <line x1="720" y1="1080" x2="960" y2="720" stroke="${p.cold}" stroke-width="2" opacity=".2"/>
        <line x1="1200" y1="1080" x2="960" y2="720" stroke="${p.cold}" stroke-width="2" opacity=".2"/>
      </g>
      <g opacity=".5">
        <line x1="1480" y1="760" x2="1520" y2="450" stroke="${p.ink}" stroke-width="9"/>
        <line x1="1520" y1="470" x2="1650" y2="450" stroke="${p.ink}" stroke-width="5"/>
        <line x1="1520" y1="520" x2="1640" y2="505" stroke="${p.ink}" stroke-width="4"/>
        <line x1="420" y1="760" x2="400" y2="490" stroke="${p.ink}" stroke-width="7"/>
        <line x1="400" y1="510" x2="300" y2="500" stroke="${p.ink}" stroke-width="4"/>
      </g>
      ${distantTrain(uid, 1500, 620, 0.55, p)}
      <ellipse cx="960" cy="760" rx="1000" ry="120" fill="${p.cold}" opacity=".08"/>
    </g>
    <g class="env-mid">
      <ellipse cx="960" cy="860" rx="800" ry="120" fill="${p.glow}" opacity=".12"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 960 C 280 900 540 980 700 1080 L 0 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
      <path d="M 1920 960 C 1700 900 1500 980 1380 1080 L 1920 1080 Z" fill="${p.bg}" opacity=".9" filter="url(#${uid}-blur)"/>
      <path d="M 0 1000 C 200 970 380 1000 480 1080 L 0 1080 Z" fill="${p.light}" opacity=".08"/>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

function churchEnvironment(p: Palette): EnvironmentRender {
  const uid = uidFor();
  const back = `
    <g class="env-bg">
      <rect x="0" y="0" width="1920" height="1080" fill="#170f08"/>
      <rect x="0" y="0" width="1920" height="760" fill="url(#${uid}-wall)"/>
      ${Array.from({ length: 5 }, (_, i) => `<path d="M ${i * 440 - 20} 0 L ${i * 440 + 200} 0 L ${i * 440 + 340} 760 L ${i * 440 + 120} 760 Z" fill="${i % 2 ? '#241509' : '#1c1007'}" opacity=".8"/>`).join('')}
      <g>
        <rect x="600" y="180" width="720" height="420" fill="#120a05" stroke="${p.trim}" stroke-width="10"/>
        <path d="M 620 220 L 1300 220 L 1300 580 L 620 580 Z" fill="url(#${uid}-warm)" opacity=".18"/>
        <path d="M 700 300 C 760 240 840 260 900 320 C 960 380 1040 340 1100 280 C 1160 220 1220 260 1260 320" fill="none" stroke="${p.trim}" stroke-width="3" opacity=".3"/>
        <g opacity=".75">
          <path d="M 760 420 C 790 360 860 360 890 420 Z" fill="${p.trim}" opacity=".3"/>
          <path d="M 960 420 C 990 340 1060 340 1090 420 Z" fill="${p.trim}" opacity=".26"/>
          <path d="M 1130 420 C 1160 370 1230 370 1260 420 Z" fill="${p.trim}" opacity=".24"/>
        </g>
      </g>
      <g opacity=".8">
        ${Array.from({ length: 6 }, (_, i) => `<path d="M ${i * 380} 0 L ${i * 380 + 100} 0 L ${i * 380 + 180} 760 L ${i * 380 + 60} 760 Z" fill="${p.deep}" opacity=".25"/>`).join('')}
      </g>
      ${chandelier(uid, 960, 140, 1.15, p)}
      <g opacity=".9">
        <path d="M 0 760 L 1920 760 L 1920 1080 L 0 1080 Z" fill="#1a1008"/>
        <path d="M 0 760 L 1920 760" stroke="${p.trim}" stroke-width="6" opacity=".3"/>
        ${Array.from({ length: 12 }, (_, i) => `<path d="M ${i * 180} 1080 L ${700 + i * 45} 760" stroke="${p.trim}" stroke-width="1" opacity=".1"/>`).join('')}
        <ellipse cx="960" cy="820" rx="600" ry="100" fill="${p.warm}" opacity=".12"/>
      </g>
      ${lamp(420, 620, 0.9, uid, p)}
      ${lamp(1500, 620, 0.9, uid, p)}
      <ellipse cx="960" cy="620" rx="500" ry="300" fill="url(#${uid}-warm)" opacity=".2"/>
    </g>
    <g class="env-mid">
      <ellipse cx="960" cy="760" rx="600" ry="100" fill="${p.glow}" opacity=".25"/>
    </g>`;
  const front = `
    <g class="env-fg">
      <path d="M 0 0 L 100 0 L 160 1080 L 0 1080 Z" fill="#080402" opacity=".8" filter="url(#${uid}-blur)"/>
      <path d="M 1920 0 L 1820 0 L 1760 1080 L 1920 1080 Z" fill="#080402" opacity=".8" filter="url(#${uid}-blur)"/>
      <g opacity=".9">
        <rect x="0" y="980" width="1920" height="100" fill="#160d06"/>
        <path d="M 0 980 L 1920 980" stroke="${p.trim}" stroke-width="4" opacity=".2"/>
        ${Array.from({ length: 10 }, (_, i) => `<circle cx="${120 + i * 190}" cy="960" r="4" fill="${p.warm}" opacity=".4"/>`).join('')}
      </g>
    </g>`;
  return { back: wrapBack(uid, p, back), front: wrapFront(uid, p, front) };
}

const environmentCache = new Map<string, EnvironmentRender>();

export function renderEnvironment(id: EnvironmentId, palette: Palette): EnvironmentRender {
  const key = `${id}:${palette.id}`;
  const cached = environmentCache.get(key);
  if (cached) return cached;
  let result: EnvironmentRender;
  switch (id) {
    case 'rail':
      result = railEnvironment(palette);
      break;
    case 'train':
      result = trainEnvironment(palette);
      break;
    case 'ballroom':
      result = ballroomEnvironment(palette);
      break;
    case 'palace':
      result = palaceEnvironment(palette);
      break;
    case 'apartment':
      result = apartmentEnvironment(palette);
      break;
    case 'racecourse':
      result = racecourseEnvironment(palette);
      break;
    case 'bedroom':
      result = bedroomEnvironment(palette);
      break;
    case 'villa':
      result = villaEnvironment(palette);
      break;
    case 'opera':
      result = operaEnvironment(palette);
      break;
    case 'country':
      result = countryEnvironment(palette);
      break;
    case 'izba':
      result = izbaEnvironment(palette);
      break;
    case 'station':
      result = stationEnvironment(palette);
      break;
    case 'tracks':
      result = tracksEnvironment(palette);
      break;
    case 'church':
      result = churchEnvironment(palette);
      break;
    default:
      result = stationEnvironment(palette);
  }
  environmentCache.set(key, result);
  return result;
}

export function clearEnvironmentCache(): void {
  environmentCache.clear();
}
