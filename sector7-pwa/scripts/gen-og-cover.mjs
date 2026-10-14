/**
 * Generate the social card: og-cover.svg + og-cover.png.
 *
 *   node sector7-pwa/scripts/gen-og-cover.mjs
 *
 * The card is 1200x630, which is the one size every platform crops to. It is
 * generated rather than drawn by hand for two reasons that have nothing to do
 * with convenience:
 *
 *   1. It has to stay in sync with the game. The hull count and the faction
 *      count are the two numbers that change, and a cover that still says
 *      "five hulls" is a promise the game stopped keeping.
 *
 *   2. The type is a dot matrix, not a font. `sharp` rasterises SVG through
 *      librsvg, which resolves font-family against whatever happens to be
 *      installed - so the same script on two machines produces two different
 *      cards, and the PNG gets committed. Drawing the letters out of squares
 *      makes the output byte-for-byte reproducible and keeps the promise the
 *      README makes: no asset in this repo is a font file.
 *
 * The art itself is the icon's own geometry, ported at 1:1 so the card and
 * the app icon are recognisably the same ship.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const here = dirname(dirname(fileURLToPath(import.meta.url)));

/* Same resolution order as gen-icons.mjs: reach for sharp in bucio's tree,
 * then fall back to a normal install. sharp is already there, so nothing new
 * gets installed to build a 1200x630 PNG. */
const require = createRequire(import.meta.url);
let sharp;
for (const spec of [join(here, "..", "bucio", "node_modules", "sharp"), "sharp"]) {
    try {
        sharp = require(spec);
        break;
    } catch {
        /* try the next one */
    }
}
if (!sharp) {
    console.error(
        "sharp not found.\n" +
        "  Run: npm --prefix bucio ci   (or install sharp anywhere reachable)"
    );
    process.exit(1);
}

/* ===== Config ===== */
const W = 1200, H = 630;

/* The numbers the card is built to advertise. Change these and rerun; that is
 * the whole point of generating it. */
const COPY = {
    wordmark: "SECTOR 7",
    subtitle: "PLAY FREE OFFLINE",
    stats: "8 HULLS . 6 FACTIONS",
};

/* The icon's palette, verbatim, so the card and the icon read as one thing. */
const C = {
    sky0: "#0d1b33", sky1: "#071122", sky2: "#04070f",
    glow: "#1e5f7a",
    hullTop0: "#a5f3fc", hullTop1: "#22d3ee",
    hullSide0: "#0e7490", hullSide1: "#0a4a63",
    wing0: "#67e8f9", wing1: "#155e75",
    eng0: "#fff7d6", eng1: "#ffb347", eng2: "#ff7a2f",
    crystal0: "#7dd3fc", crystal1: "#bae6fd", crystal2: "#38bdf8",
    bolt0: "#ffd166", bolt1: "#fff3c4",
};

/* ===== Dot-matrix type =====
 * 5x7 glyphs, authored as seven rows of five bits. A missing glyph throws
 * rather than silently dropping a letter, because a card with a hole in the
 * middle of the title is not a card. */
const GLYPHS = {
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "6": ["01111", "10000", "10000", "11110", "10001", "10001", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
};

const GAP_TOKEN = " ";   // a word break
const DOT_TOKEN = ".";   // a single centre square, for separators

/* A word gap is two pitches against a five-pitch glyph. Any narrower and the
 * words run together at thumbnail size - which is the only size anybody ever
 * sees this card at - and any wider looks like a typo rather than a space.
 * The same constant is used by measure() and dotText(): if the two ever
 * disagree, the centred block quietly goes off-centre. */
const SPACE_ADV = (pitch) => pitch * 2;

/** Width in units of a string at a given pitch, before drawing anything. */
function measure(text, pitch) {
    let w = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === DOT_TOKEN) w += pitch * 0.75;
        else if (ch === GAP_TOKEN) w += SPACE_ADV(pitch);
        else w += pitch * 5;
    }
    return w;
}

/**
 * Draw a string as squares.
 *
 * The advance is computed the same way in measure() and here on purpose: the
 * two drifting apart is how a wordmark ends up off-centre on a card that
 * nobody re-checks until somebody posts it.
 */
function dotText(text, x, y, pitch, fill, opts = {}) {
    const dot = opts.dot ?? Math.max(2, Math.round(pitch * 0.72));
    const step = (pitch * (opts.step ?? 5)) | 0;   // unused for gaps, see below
    void step;
    let cx = x;
    const out = [];

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === DOT_TOKEN) {
            const d = Math.max(3, Math.round(pitch * 0.5));
            out.push(`<rect x="${round(cx + pitch * 0.25)}" y="${round(y + pitch * 3)}" ` +
                `width="${d}" height="${d}" fill="${fill}"/>`);
            cx += pitch * 0.75;
            continue;
        }
        if (ch === GAP_TOKEN) {
            cx += SPACE_ADV(pitch);
            continue;
        }

        const rows = GLYPHS[ch];
        if (!rows) {
            throw new Error(
                `dot-matrix font has no glyph for ${JSON.stringify(ch)} - ` +
                `add it to GLYPHS rather than shipping a card with a hole in it`
            );
        }
        for (let r = 0; r < 7; r++) {
            const row = rows[r];
            for (let c = 0; c < 5; c++) {
                if (row[c] !== "1") continue;
                out.push(
                    `<rect x="${round(cx + c * pitch)}" y="${round(y + r * pitch)}" ` +
                    `width="${dot}" height="${dot}" fill="${fill}"/>`
                );
            }
        }
        cx += pitch * 5;
    }
    return { svg: out.join("\n"), width: cx - x };
}

const round = (n) => Math.round(n * 100) / 100;

/* ===== Starfield =====
 * Seeded, so the card does not change every time it is regenerated. */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function starfield(seed) {
    const rng = mulberry32(seed);
    const out = [];
    for (let i = 0; i < 110; i++) {
        const x = round(20 + rng() * (W - 40));
        const y = round(20 + rng() * (H - 40));
        const r = round(0.8 + rng() * 1.9);
        const o = round(0.25 + rng() * 0.6);
        out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${o}"/>`);
    }
    return out.join("\n");
}

/* ===== The ship =====
 * Ported from icons/icon-512.svg at 1:1 and shifted onto the card. The
 * coordinates below are the icon's own; only the wrapper transform changes. */
function shipArt() {
    return `
    <g transform="translate(690 76)">
      <ellipse cx="186" cy="330" rx="88" ry="54" fill="url(#engine)"/>
      <g transform="translate(262 258) rotate(-40)">
        <polygon points="40,14 -20,98 8,86 44,28" fill="#0b4a5e"/>
        <polygon points="-80,-20 58,-20 100,0 58,20 -80,20 -90,0" fill="url(#hullSide)"/>
        <polygon points="-80,-20 58,-20 100,0 16,0 -90,0" fill="#0891b2" opacity=".6"/>
        <polygon points="58,-20 100,0 58,20" fill="${C.wing0}"/>
        <polygon points="40,-16 -20,-98 8,-86 44,-28" fill="url(#wing)"/>
        <polygon points="40,-16 -20,-98 -10,-94 36,-25" fill="${C.hullTop0}" opacity=".3"/>
        <polygon points="12,-10 48,-5 48,5 12,10" fill="#cffafe"/>
        <polygon points="-80,-20 -92,0 -80,20 -86,0" fill="#0b3b4d"/>
        <circle cx="-88" cy="0" r="10" fill="${C.bolt0}"/>
      </g>
      <g transform="translate(96 400)">
        <polygon points="0,-34 14,-8 34,0 14,8 0,34 -14,8 -34,0 -14,-8" fill="${C.bolt0}" opacity=".9"/>
        <polygon points="0,-20 8,-5 20,0 8,5 0,20 -8,5 -20,0 -8,-5" fill="${C.bolt1}"/>
      </g>
      <g transform="translate(400 148)">
        <polygon points="0,-30 20,0 0,30 -20,0" fill="${C.crystal0}"/>
        <polygon points="0,-30 20,0 0,0 -20,0" fill="${C.crystal1}"/>
        <polygon points="0,30 20,0 0,0 -20,0" fill="${C.crystal2}" opacity=".7"/>
      </g>
    </g>`;
}

/* ===== Build ===== */
function buildSvg() {
    const pad = 64;

    /* Left column. Vertically centred as a block, not as three separate
     * lines, so the whole thing still balances if a line gets longer. */
    const wordPitch = 16;
    const subPitch = 6;
    const statPitch = 5;

    const wordW = measure(COPY.wordmark, wordPitch);
    const subW = measure(COPY.subtitle, subPitch);
    const statW = measure(COPY.stats, statPitch);

    const blockH = wordPitch * 7 + 34 + 6 + 32 + subPitch * 7 + 22 + statPitch * 7;
    let y = Math.round((H - blockH) / 2);

    const wordY = y;
    const ruleY = wordY + wordPitch * 7 + 34;
    const subY = ruleY + 6 + 32;
    const statY = subY + subPitch * 7 + 22;

    const word = dotText(COPY.wordmark, pad, wordY, wordPitch, C.hullTop0);
    const sub = dotText(COPY.subtitle, pad, subY, subPitch, "#8fd8ea");
    const stats = dotText(COPY.stats, pad, statY, statPitch, "#6f93ad");

    /* A soft scrim behind the type. Without it the wordmark crosses the
     * starfield and the card stops being readable at thumbnail size, which is
     * the only size anybody sees it at. */
    const scrimW = Math.max(wordW, subW, statW) + 48;
    const scrimH = statY + statPitch * 7 - wordY + 24;
    const scrim = `<rect x="${pad - 24}" y="${wordY - 24}" width="${round(scrimW)}" ` +
        `height="${round(scrimH)}" rx="18" fill="#04070f" opacity=".55"/>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.sky0}"/>
      <stop offset="55%" stop-color="${C.sky1}"/>
      <stop offset="100%" stop-color="${C.sky2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="52%" r="46%">
      <stop offset="0%" stop-color="${C.glow}" stop-opacity=".6"/>
      <stop offset="100%" stop-color="${C.sky2}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hullSide" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.hullSide0}"/>
      <stop offset="100%" stop-color="${C.hullSide1}"/>
    </linearGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0%" stop-color="${C.wing0}"/>
      <stop offset="100%" stop-color="${C.wing1}"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.wing0}"/>
      <stop offset="60%" stop-color="${C.crystal0}" stop-opacity=".35"/>
      <stop offset="100%" stop-color="${C.crystal0}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="engine" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${C.eng0}" stop-opacity=".95"/>
      <stop offset="45%" stop-color="${C.eng1}" stop-opacity=".7"/>
      <stop offset="100%" stop-color="${C.eng2}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="946" cy="342" r="240" fill="url(#glow)"/>

  ${starfield(0x5ec701)}

  <!-- Type first, art over it: the ship reads on top of the scrim edge
       without the wordmark ever crossing a hull facet. -->
  ${scrim}
  ${word.svg}
  <rect x="${pad}" y="${ruleY}" width="${round(Math.min(wordW, 560))}" height="3" rx="1.5" fill="url(#rule)"/>
  ${sub.svg}
  ${stats.svg}

  ${shipArt()}
</svg>
`;
}

const svg = buildSvg();
const svgPath = join(here, "og-cover.svg");
const pngPath = join(here, "og-cover.png");

await mkdir(here, { recursive: true });
await writeFile(svgPath, svg);

const png = await sharp(Buffer.from(svg), { density: 384 })
    .resize(W, H, { fit: "fill" })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

const meta = await sharp(png).metadata();
if (meta.width !== W || meta.height !== H) {
    console.error(`expected ${W}x${H}, sharp produced ${meta.width}x${meta.height}`);
    process.exit(1);
}
await writeFile(pngPath, png);

console.log(`ok  og-cover.svg + og-cover.png  (${W}x${H}, ${(png.length / 1024).toFixed(1)} kB)`);
console.log(`    ${COPY.wordmark} / ${COPY.subtitle} / ${COPY.stats}`);
