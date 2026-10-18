/*
 * Rasterise the icon set and the social card.
 *
 * The PNGs are committed; this never runs in CI. It exists so the artwork can
 * be edited as SVG and re-rendered rather than being drawn once by hand and
 * never touched again.
 *
 * sharp is resolved through bucio/node_modules when it is not installed
 * locally, which is how every other game in this repository does it: the
 * games are plain static folders with no package.json, so nothing here is
 * worth a dependency declaration of its own.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const ICONS = join(here, "..", "icons");

let sharp = null;
/* Resolved by walking UP as well as down, because bucio/ is a SIBLING of
 * this folder rather than a child of it: ironfall-pwa/scripts/../../bucio.
 * Only looking downwards finds nothing and reports "install sharp", which is
 * both wrong advice and wrong about the state of the checkout. */
const candidates = [
    join(here, "..", "..", "bucio", "node_modules", "sharp"),
    join(here, "..", "node_modules", "sharp"),
    "sharp"
];
for (const spec of candidates) {
    try { sharp = require(spec); break; } catch { /* try the next one */ }
}

if (!sharp) {
    console.error(
        "sharp is not available.\n" +
        "Install it (npm i sharp) or run this from a checkout that has\n" +
        "bucio/node_modules. The committed PNGs are unaffected - this script\n" +
        "only regenerates them."
    );
    process.exit(1);
}

const jobs = [
    ["icon-512.svg", "icon-512.png", 512, 512],
    ["icon-192.svg", "icon-192.png", 192, 192],
    ["icon-512-maskable.svg", "icon-512-maskable.png", 512, 512],
    /* apple-touch-icon is never maskable: iOS applies its own rounding and a
     * pre-masked icon would arrive with its corners cut twice. */
    ["icon-512.svg", "apple-touch-icon.png", 180, 180]
];

for (const [src, out, w, h] of jobs) {
    const svg = readFileSync(join(ICONS, src));
    const png = await sharp(svg, { density: 384 }).resize(w, h, { fit: "fill" }).png().toBuffer();
    writeFileSync(join(ICONS, out), png);
    console.log("  " + src + "  ->  " + out + "  " + w + "x" + h);
}

/* ----- the social card -----
 *
 * 1200x630 is the one size every platform crops to, and summary_large_image
 * is the card type that actually shows the art rather than cropping it to a
 * stamp. The map sits in the right third and every piece of text is
 * constrained to the left 55%: the first version let the wordmark run under
 * the artwork, and a social card where the title overlaps the illustration is
 * worse than one with no illustration at all.
 */
const S = 1200, T = 630;
const card = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${T}" width="${S}" height="${T}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#151b26"/>
      <stop offset="1" stop-color="#05070c"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff2c4"/>
      <stop offset="0.55" stop-color="#e8bb45"/>
      <stop offset="1" stop-color="#9d6f10"/>
    </linearGradient>
    <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a9d0ff"/>
      <stop offset="1" stop-color="#22507f"/>
    </linearGradient>
    <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffa3aa"/>
      <stop offset="1" stop-color="#8d1f28"/>
    </linearGradient>
    <radialGradient id="halo">
      <stop offset="0" stop-color="#e0b23c" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#e0b23c" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="plate">
      <path d="M256 40 L472 256 L256 472 L40 256 Z"/>
    </clipPath>
  </defs>

  <rect width="${S}" height="${T}" fill="url(#bg)"/>

  <!-- the map, right third, bleeding slightly off the bottom edge -->
  <g transform="translate(884,368) scale(0.84) translate(-256,-256)">
    <g clip-path="url(#plate)">
      <path d="M256 40 L472 256 L256 472 L40 256 Z" fill="#1b1e23"/>
      <path d="M40 256 L472 256" stroke="#242a32" stroke-width="60"/>
      <g stroke="#4d4436" stroke-width="40" stroke-linecap="round" fill="none">
        <path d="M256 60 L256 256"/>
        <path d="M256 256 L256 452"/>
        <path d="M62 256 L450 256"/>
      </g>
      <g stroke="#6a5d47" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.5">
        <path d="M256 60 L256 452"/>
        <path d="M62 256 L450 256"/>
      </g>
    </g>
    <path d="M256 40 L472 256 L256 472 L40 256 Z" fill="none" stroke="#3a414c" stroke-width="5"/>
    <path d="M256 74 L306 124 L256 174 L206 124 Z" fill="url(#blue)"/>
    <path d="M256 74 L306 124 L256 142 L206 124 Z" fill="#ffffff" opacity="0.24"/>
    <path d="M256 338 L306 388 L256 438 L206 388 Z" fill="url(#red)"/>
    <path d="M256 338 L306 388 L256 406 L206 388 Z" fill="#ffffff" opacity="0.2"/>
    <circle cx="256" cy="256" r="146" fill="url(#halo)"/>
    <ellipse cx="256" cy="288" rx="80" ry="42" fill="none" stroke="#e0b23c" stroke-width="6" opacity="0.5"/>
    <path d="M256 176 L338 256 L256 336 L174 256 Z" fill="#5e4a0e"/>
    <path d="M256 194 L314 256 L256 318 L198 256 Z" fill="url(#gold)"/>
    <path d="M256 222 L288 256 L256 290 L224 256 Z" fill="#fff6d8" opacity="0.9"/>
  </g>

  <!-- text, left 55% only -->
  <g font-family="Georgia, 'Times New Roman', serif" fill="#e0b23c">
    <text x="78" y="286" font-size="78" letter-spacing="13">IRONFALL</text>
  </g>
  <rect x="80" y="322" width="290" height="3" fill="#e0b23c" opacity="0.5"/>
  <g font-family="Verdana, Geneva, sans-serif">
    <text x="82" y="378" font-size="25" letter-spacing="4" fill="#cfd4da">THREE LANES TO THE RELIQUARY</text>
    <text x="82" y="424" font-size="20" letter-spacing="2" fill="#7d8792">8 champions &#183; 4 warbands &#183; works offline</text>
    <text x="82" y="486" font-size="18" letter-spacing="3" fill="#5d6672">A 3v3 LANE MOBA IN THE WARHAMMER 40K UNIVERSE</text>
  </g>
  <rect x="78" y="540" width="520" height="1" fill="#3a414c" opacity="0.7"/>
  <text x="82" y="576" font-family="Verdana, Geneva, sans-serif" font-size="16"
        letter-spacing="2" fill="#4b535d">lucagandolfi77.github.io/random2/ironfall-pwa/</text>
</svg>`;

const og = await sharp(Buffer.from(card), { density: 192 })
    .resize(S, T, { fit: "fill" }).png().toBuffer();
writeFileSync(join(here, "..", "og-cover.png"), og);
console.log("  social card        ->  og-cover.png  " + S + "x" + T);
