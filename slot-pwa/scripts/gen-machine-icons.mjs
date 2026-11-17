/**
 * Generate one SVG icon per machine plus the main PWA icon and its maskable
 * variant. Pure string templates — no dependencies.
 *
 *   node scripts/gen-machine-icons.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const icons = join(here, 'icons');
const machines = join(icons, 'machines');

const THEMES = {
  neon:    { bg1: '#241038', bg2: '#06030d', edge: '#ffcc00', accent: '#ff5ec4', metal: '#4a2a7a' },
  retro:   { bg1: '#001a1f', bg2: '#000000', edge: '#00ffff', accent: '#ff007f', metal: '#09383f' },
  egypt:   { bg1: '#3a2402', bg2: '#0d0700', edge: '#ffd34d', accent: '#ff7b29', metal: '#6b4708' },
  cosmic:  { bg1: '#1d083f', bg2: '#05010f', edge: '#b78cff', accent: '#ff6ec7', metal: '#3a1670' },
  candy:   { bg1: '#3a0a29', bg2: '#12020e', edge: '#ff7ac6', accent: '#ffe066', metal: '#70154f' },
  safari:  { bg1: '#332206', bg2: '#0d0801', edge: '#fbbf24', accent: '#84cc16', metal: '#5c4210' },
  ocean:   { bg1: '#04243d', bg2: '#010a14', edge: '#38bdf8', accent: '#22d3ee', metal: '#0d3556' },
  samurai: { bg1: '#360507', bg2: '#0d0101', edge: '#ff5252', accent: '#ffd166', metal: '#6b1015' },
  barblue:   { bg1: '#03122e', bg2: '#01050f', edge: '#3fa9ff', accent: '#7ce0ff', metal: '#0e2c66' },
  girobar:   { bg1: '#2a0c03', bg2: '#0d0301', edge: '#ff7043', accent: '#ffd166', metal: '#5c1c0d' },
  armata:    { bg1: '#0c1030', bg2: '#03040d', edge: '#ffd400', accent: '#0055ff', metal: '#25347a' },
  sinibbio:  { bg1: '#1c1e29', bg2: '#08090d', edge: '#f5f5ff', accent: '#ff9fc4', metal: '#34384d' },
  agente:    { bg1: '#04251a', bg2: '#010a06', edge: '#39ff9e', accent: '#b8ff4d', metal: '#0d4433' },
  principina:{ bg1: '#052a3d', bg2: '#01090f', edge: '#7fe0ff', accent: '#ffe0a3', metal: '#0e4a6b' },
};

const MACHINES = [
  { id: 'lucky-seven',    theme: 'neon',   title: 'LUCKY 7',     motif: 'seven' },
  { id: 'retro-777',      theme: 'retro',  title: '777',         motif: 'seven' },
  { id: 'pharaoh',        theme: 'egypt',  title: 'PHARAOH',     motif: 'pyramid' },
  { id: 'nebula',         theme: 'cosmic', title: 'NEBULA 9',    motif: 'planet' },
  { id: 'sugar-rush',     theme: 'candy',  title: 'SWEET',       motif: 'candy' },
  { id: 'vault',          theme: 'safari', title: 'VAULT',       motif: 'vault' },
  { id: 'atlantis',       theme: 'ocean',  title: 'ATLANTIS',    motif: 'wave' },
  { id: 'samurai',        theme: 'samurai',title: 'SAMURAI',     motif: 'sword' },
  { id: 'bar-blu',        theme: 'barblue',  title: 'BAR BLU',    motif: 'cocktail' },
  { id: 'giro-bar',       theme: 'girobar',  title: 'GIRO BAR',   motif: 'bike' },
  { id: 'armata',         theme: 'armata',   title: 'ARMATA',     motif: 'ball' },
  { id: 'sinibbio',       theme: 'sinibbio', title: 'SINIBBIO',   motif: 'bunny' },
  { id: 'agente',         theme: 'agente',   title: 'AGENTE ZERO',motif: 'lens' },
  { id: 'principina',     theme: 'principina',title:'PRINCIPINA', motif: 'crown' },
];

function motif(kind, t) {
  switch (kind) {
    case 'seven':
      return `<text x="256" y="300" font-family="Arial,sans-serif" font-weight="900" font-size="190"
        text-anchor="middle" fill="${t.edge}" filter="url(#glow)">7</text>`;
    case 'pyramid':
      return `<path d="M256 170 L360 320 L152 320 Z" fill="${t.edge}" filter="url(#glow)"/>
        <path d="M256 170 L256 320" stroke="#0006" stroke-width="6"/>
        <circle cx="256" cy="286" r="16" fill="#fff6c0"/>`;
    case 'planet':
      return `<circle cx="256" cy="252" r="78" fill="${t.edge}" filter="url(#glow)"/>
        <ellipse cx="256" cy="252" rx="134" ry="38" fill="none" stroke="${t.accent}" stroke-width="12" transform="rotate(-18 256 252)"/>
        <circle cx="232" cy="230" r="14" fill="#fff8"/>`;
    case 'candy':
      return `<circle cx="256" cy="252" r="72" fill="${t.edge}" filter="url(#glow)"/>
        <path d="M184 252 L132 218 L142 252 L132 286 Z" fill="${t.accent}"/>
        <path d="M328 252 L380 218 L370 252 L380 286 Z" fill="${t.accent}"/>
        <path d="M226 220 Q256 190 286 220" stroke="#fff" stroke-width="10" fill="none" opacity=".7"/>`;
    case 'vault':
      return `<rect x="166" y="174" width="180" height="166" rx="18" fill="${t.edge}" filter="url(#glow)"/>
        <circle cx="256" cy="256" r="54" fill="#120c02" stroke="#fff6c0" stroke-width="8"/>
        <text x="256" y="274" font-family="Arial,sans-serif" font-weight="900" font-size="56" text-anchor="middle" fill="#fff6c0">$</text>`;
    case 'wave':
      return `<path d="M140 300 Q196 232 256 300 T372 300" fill="none" stroke="${t.edge}" stroke-width="22" filter="url(#glow)"/>
        <path d="M140 340 Q196 272 256 340 T372 340" fill="none" stroke="${t.accent}" stroke-width="14" opacity=".8"/>`;
    case 'sword':
      return `<path d="M256 148 L282 196 L270 320 L242 320 L230 196 Z" fill="${t.edge}" filter="url(#glow)"/>
        <rect x="196" y="316" width="120" height="18" rx="8" fill="${t.accent}"/>
        <rect x="248" y="332" width="16" height="46" rx="6" fill="${t.edge}"/>`;
    case 'cocktail':
      return `<path d="M176 180 L336 180 L256 300 Z" fill="${t.edge}" opacity=".85" filter="url(#glow)"/>
        <path d="M176 180 L336 180" stroke="#fff" stroke-width="8"/>
        <path d="M256 300 L256 358 M210 358 L302 358" stroke="${t.accent}" stroke-width="10"/>
        <circle cx="296" cy="206" r="15" fill="#ff5ec4"/>`;
    case 'bike':
      return `<circle cx="180" cy="290" r="58" fill="none" stroke="${t.edge}" stroke-width="12" filter="url(#glow)"/>
        <circle cx="332" cy="290" r="58" fill="none" stroke="${t.edge}" stroke-width="12"/>
        <path d="M180 290 L238 196 L300 290 L180 290 M238 196 L312 184" fill="none" stroke="${t.accent}" stroke-width="11"/>`;
    case 'ball':
      return `<circle cx="256" cy="250" r="88" fill="${t.edge}" filter="url(#glow)"/>
        <path d="M168 250 H344 M256 162 V338" stroke="#2a1400" stroke-width="8"/>
        <circle cx="256" cy="250" r="46" fill="none" stroke="#2a1400" stroke-width="8"/>`;
    case 'bunny':
      return `<ellipse cx="216" cy="168" rx="26" ry="60" fill="${t.edge}" filter="url(#glow)"/>
        <ellipse cx="296" cy="168" rx="26" ry="60" fill="${t.edge}"/>
        <circle cx="256" cy="272" r="82" fill="${t.edge}"/>
        <circle cx="228" cy="258" r="9" fill="#111"/><circle cx="284" cy="258" r="9" fill="#111"/>
        <circle cx="256" cy="292" r="10" fill="${t.accent}"/>`;
    case 'lens':
      return `<circle cx="232" cy="226" r="78" fill="none" stroke="${t.edge}" stroke-width="16" filter="url(#glow)"/>
        <path d="M288 282 L356 350" stroke="${t.accent}" stroke-width="18" stroke-linecap="round"/>
        <circle cx="216" cy="210" r="24" fill="#fff" opacity=".25"/>`;
    case 'crown':
      return `<path d="M156 320 L176 170 L256 250 L336 170 L356 320 Z" fill="${t.edge}" filter="url(#glow)"/>
        <rect x="156" y="320" width="200" height="36" rx="8" fill="${t.accent}"/>
        <circle cx="256" cy="160" r="14" fill="#fff6c0"/>`;
    default:
      return `<circle cx="256" cy="252" r="70" fill="${t.edge}"/>`;
  }
}

function iconSVG(t, title, glyph, maskable = false) {
  const pad = maskable ? 1.18 : 1;
  const cx = 256, reelW = 86 * pad;
  const xs = [cx - reelW - 10, cx, cx + reelW + 10];
  const reels = xs.map((x, i) => `
    <rect x="${x - reelW / 2}" y="${128 * pad}" width="${reelW}" height="210" rx="12"
      fill="${i === 1 ? '#08050f' : '#160d24'}" stroke="${t.edge}" stroke-opacity=".55" stroke-width="3"/>`).join('');
  const dots = Array.from({ length: 20 }, (_, i) =>
    `<circle cx="${44 + i * (424 / 19)}" cy="42" r="3.4" fill="${i % 2 ? t.accent : '#fff6d0'}" opacity=".9"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.metal}"/><stop offset=".5" stop-color="#0a0612"/><stop offset="1" stop-color="${t.metal}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff9c4"/><stop offset=".5" stop-color="${t.edge}"/><stop offset="1" stop-color="#8a6200"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 96}" fill="url(#bg)"/>
  <rect x="38" y="38" width="436" height="436" rx="${maskable ? 64 : 72}" fill="url(#metal)"
    stroke="url(#gold)" stroke-width="9" filter="url(#glow)"/>
  <rect x="60" y="58" width="392" height="66" rx="20" fill="#0a0612" stroke="${t.edge}" stroke-width="4"/>
  ${dots}
  <text x="256" y="${maskable ? 102 : 104}" font-family="Arial,sans-serif" font-weight="900"
    font-size="34" letter-spacing="4" text-anchor="middle" fill="${t.edge}" filter="url(#glow)">${title}</text>
  <rect x="40" y="126" width="432" height="222" rx="18" fill="#05030a" stroke="${t.edge}" stroke-width="4"/>
  ${reels}
  ${motif(glyph, t)}
  <path d="M150 232 H362" stroke="${t.accent}" stroke-width="5" opacity=".85" filter="url(#glow)"/>
  <!-- lever -->
  <rect x="482" y="168" width="12" height="150" rx="6" fill="#9aa6ad"/>
  <circle cx="488" cy="162" r="17" fill="url(#gold)" stroke="#fff6c0" stroke-width="3"/>
  <!-- button deck -->
  <rect x="86" y="376" width="252" height="76" rx="24" fill="url(#gold)"/>
  <text x="212" y="424" font-family="Arial,sans-serif" font-weight="900" font-size="36"
    letter-spacing="3" text-anchor="middle" fill="#1a0f2e">SPIN</text>
  <circle cx="382" cy="414" r="25" fill="#0a0612" stroke="${t.edge}" stroke-width="5"/>
  <text x="382" y="425" font-family="Arial,sans-serif" font-weight="900" font-size="26"
    text-anchor="middle" fill="${t.edge}">$</text>
</svg>`;
}

await mkdir(machines, { recursive: true });
for (const m of MACHINES) {
  const t = THEMES[m.theme];
  const file = join(machines, `${m.id}.svg`);
  await writeFile(file, iconSVG(t, m.title, m.motif));
  console.log('ok  icons/machines/' + m.id + '.svg');
}
await writeFile(join(icons, 'icon.svg'), iconSVG(THEMES.neon, 'LUCKY 7', 'seven'));
await writeFile(join(icons, 'icon-maskable.svg'), iconSVG(THEMES.neon, 'LUCKY 7', 'seven', true));
console.log('ok  icons/icon.svg + icon-maskable.svg');
