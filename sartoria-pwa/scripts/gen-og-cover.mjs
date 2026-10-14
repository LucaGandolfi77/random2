/**
 * Generate the SARTORIA social card: og-cover.svg + og-cover.png.
 *
 *   node sartoria-pwa/scripts/gen-og-cover.mjs
 *
 * Same approach as the hub's card: a 1200x630 SVG built procedurally, with the
 * wordmark drawn as a 5x7 dot matrix rather than text. A font family written
 * into the SVG would be resolved by librsvg against whatever happens to be
 * installed, so the same script on two machines would produce two different
 * cards - and the PNG is the thing that gets committed.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const here = dirname(dirname(fileURLToPath(import.meta.url)));

const require = createRequire(import.meta.url);
let sharp;
for (const spec of [join(here, "..", "bucio", "node_modules", "sharp"), "sharp"]) {
    try { sharp = require(spec); break; } catch { /* next */ }
}
if (!sharp) { console.error("sharp not found"); process.exit(1); }

const W = 1200, H = 630;

const C = {
    sky0: "#2a1430", sky1: "#180d1e", sky2: "#0d060f",
    gold0: "#f7e3ae", gold1: "#e8b96a", gold2: "#b8803a",
    silk0: "#f3b8cf", silk1: "#a83f6d",
};

/* 5x7 dot-matrix glyphs: S A R T O I 7 and the letters of the subtitle. */
const GLYPHS = {
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
};

const rnd = (n) => Math.round(n * 100) / 100;

function dotText(text, x, y, pitch, fill) {
    const dot = Math.max(3, Math.round(pitch * 0.74));
    const space = pitch * 2;
    let cx = x;
    const out = [];
    for (const ch of text) {
        if (ch === " ") { cx += space; continue; }
        const rows = GLYPHS[ch];
        if (!rows) throw new Error(`no glyph for ${JSON.stringify(ch)}`);
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 5; c++) {
                if (rows[r][c] !== "1") continue;
                out.push(`<rect x="${rnd(cx + c * pitch)}" y="${rnd(y + r * pitch)}" ` +
                    `width="${dot}" height="${dot}" fill="${fill}"/>`);
            }
        }
        cx += pitch * 5;
    }
    return { svg: out.join(""), w: cx - x };
}

/* deterministic starfield */
function stars(seed) {
    let a = seed >>> 0;
    const rng = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const out = [];
    for (let i = 0; i < 90; i++) {
        out.push(`<circle cx="${rnd(20 + rng() * (W - 40))}" cy="${rnd(20 + rng() * (H - 40))}" ` +
            `r="${rnd(0.9 + rng() * 1.7)}" fill="#f7e3ae" opacity="${rnd(0.18 + rng() * 0.45)}"/>`);
    }
    return out.join("\n");
}

const WORD = "SARTORIA";
const SUB = "COUTURE TYCOON";

const wordPitch = 22, subPitch = 8;
const word = dotText(WORD, 74, 176, wordPitch, C.gold0);
const sub = dotText(SUB, 78, 176 + wordPitch * 7 + 26, subPitch, "#c9a6d8");

/* the mannequin, in the right third, scaled from the icon's geometry */
const FIG = `
  <g transform="translate(880 148) scale(1.05)">
    <polygon points="0,108 -70,208 70,208 0,108" fill="url(#silk)"/>
    <polygon points="0,108 70,208 0,208 0,108" fill="#7d2b50" opacity=".55"/>
    <polygon points="-34,-4 34,-4 26,116 -26,116" fill="url(#gold)"/>
    <polygon points="34,-4 26,116 0,116 0,-4" fill="#a8762f" opacity=".6"/>
    <polygon points="-52,-26 52,-26 34,-4 -34,-4" fill="#f2d79b"/>
    <polygon points="-10,-34 10,-34 10,-26 -10,-26" fill="#e0b98e"/>
    <polygon points="0,-96 26,-64 0,-30 -26,-64" fill="#eac39e"/>
    <polygon points="26,-64 0,-30 0,-96" fill="#cd9f7c"/>
    <polygon points="-24,-74 0,-84 24,-74 0,-64" fill="url(#gold)"/>
    <circle cx="0" cy="-78" r="6" fill="#f7e3ae"/>
  </g>`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.sky0}"/>
      <stop offset="55%" stop-color="${C.sky1}"/>
      <stop offset="100%" stop-color="${C.sky2}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.gold0}"/>
      <stop offset="50%" stop-color="${C.gold1}"/>
      <stop offset="100%" stop-color="${C.gold2}"/>
    </linearGradient>
    <linearGradient id="silk" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="${C.silk0}"/>
      <stop offset="100%" stop-color="${C.silk1}"/>
    </linearGradient>
    <radialGradient id="halo" cx="72%" cy="46%" r="40%">
      <stop offset="0%" stop-color="${C.gold1}" stop-opacity=".26"/>
      <stop offset="100%" stop-color="${C.sky2}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="864" cy="290" r="380" fill="url(#halo)"/>
  ${stars(0x5a27a)}

  <!-- A runway: the card is the game's own stage. -->
  <polygon points="486,630 714,630 660,318 540,318" fill="${C.sky1}" opacity=".85"/>
  <polygon points="486,630 540,318 600,318 552,630" fill="#000" opacity=".25"/>
  <polygon points="600,470 660,470 664,486 596,486" fill="${C.gold1}" opacity=".22"/>
  <polygon points="608,540 652,540 656,556 604,556" fill="${C.gold1}" opacity=".22"/>

  <rect x="70" y="152" width="520" height="${rnd(wordPitch * 7 + subPitch * 7 + 26 + 24)}" rx="26"
        fill="#0d060f" opacity=".55"/>
  ${word.svg}
  ${sub.svg}
  ${FIG}
  <g transform="translate(300 470)">
    <rect x="-26" y="-8" width="52" height="26" rx="6" fill="url(#gold)"/>
    <rect x="-18" y="-14" width="36" height="10" rx="4" fill="${C.gold0}"/>
    <rect x="-14" y="30" width="10" height="20" rx="3" fill="${C.gold2}"/>
    <rect x="4" y="30" width="10" height="20" rx="3" fill="${C.gold2}"/>
  </g>
  <g transform="translate(430 470) rotate(-18)">
    <circle cx="-22" cy="0" r="14" fill="none" stroke="${C.gold1}" stroke-width="6"/>
    <circle cx="22" cy="0" r="14" fill="none" stroke="${C.gold1}" stroke-width="6"/>
    <line x1="-12" y1="10" x2="26" y2="56" stroke="${C.gold2}" stroke-width="6" stroke-linecap="round"/>
    <line x1="12" y1="10" x2="-26" y2="56" stroke="${C.gold2}" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>
`;

await mkdir(here, { recursive: true });
await writeFile(join(here, "og-cover.svg"), svg);

const png = await sharp(Buffer.from(svg), { density: 384 })
    .resize(W, H, { fit: "fill" })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
const meta = await sharp(png).metadata();
if (meta.width !== W || meta.height !== H) {
    console.error(`expected ${W}x${H}, got ${meta.width}x${meta.height}`);
    process.exit(1);
}
await writeFile(join(here, "og-cover.png"), png);
console.log(`ok  og-cover.svg + og-cover.png  (${W}x${H}, ${(png.length / 1024).toFixed(1)} kB)`);
console.log(`    ${WORD} / ${SUB}`);
