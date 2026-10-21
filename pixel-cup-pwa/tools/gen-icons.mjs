/*
 * PIXEL CUP '96 — icon generator
 * ------------------------------
 * Writes the three SVG icons the manifest asks for. They are drawn from
 * the same pixel grid the game itself uses, so the icon looks like a
 * frame of the game.
 *
 *   node pixel-cup-pwa/tools/gen-icons.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../icons");
mkdirSync(out, { recursive: true });

/* A football, twelve pixels across and nine tall. '#' is the dark panel,
   '.' is the white leather, ' ' is nothing. */
const BALL = [
  "....####....",
  "..##....##..",
  ".#..#..#..#.",
  "#..#....#..#",
  "#..#....#..#",
  "#..#....#..#",
  ".#..#..#..#.",
  "..##....##..",
  "....####....",
];

const CELL = 16;   /* pixels of the icon per ball pixel */

function ballRects(ox, oy, scale) {
  const rects = [];
  for (let y = 0; y < BALL.length; y++) {
    for (let x = 0; x < BALL[y].length; x++) {
      const c = BALL[y][x];
      if (c === " ") continue;
      rects.push({
        x: ox + x * scale,
        y: oy + y * scale,
        s: scale,
        fill: c === "#" ? "#15161f" : "#f4f7fb",
      });
    }
  }
  return rects;
}

function svg(size, scale, bg) {
  const s = size / 512;
  const ballScale = CELL * 2.6 * (scale || 1);
  const bw = 12 * ballScale;
  const ox = (size - bw) / 2;
  const oy = (size - bw) / 2 - 10 * s;
  const rects = ballRects(ox, oy, ballScale)
    .map((r) => `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.s.toFixed(1)}" height="${r.s.toFixed(1)}" fill="${r.fill}"/>`)
    .join("\n    ");

  /* A pitch: two lines and a halfway stripe, drawn in the same chunky
     style as the ball. */
  const lineW = 9 * s;
  const pad = 46 * s;
  const mid = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" fill="#2f7a44"/>
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" fill="none" stroke="#f2f6f2" stroke-width="${lineW}"/>
  <rect x="${mid - lineW / 2}" y="${pad}" width="${lineW}" height="${size - pad * 2}" fill="#f2f6f2" opacity="0.85"/>
  <rect x="${pad + (size - pad * 2) * 0.16}" y="${mid - 9 * s}" width="${(size - pad * 2) * 0.16}" height="${18 * s}" fill="none" stroke="#f2f6f2" stroke-width="${lineW * 0.8}" opacity="0.7"/>
  <rect x="${size - pad - (size - pad * 2) * 0.16}" y="${mid - 9 * s}" width="${(size - pad * 2) * 0.16}" height="${18 * s}" fill="none" stroke="#f2f6f2" stroke-width="${lineW * 0.8}" opacity="0.7"/>
  <g>
    ${rects}
  </g>
</svg>
`;
}

writeFileSync(resolve(out, "icon-192.svg"), svg(192, 1, "#0b1020"));
writeFileSync(resolve(out, "icon-512.svg"), svg(512, 1, "#0b1020"));
/* A maskable icon has to survive a circular crop, so the picture sits in
   the middle of a plain background. */
writeFileSync(resolve(out, "icon-maskable-512.svg"), svg(512, 0.68, "#0b1020"));
writeFileSync(resolve(out, "apple-touch-icon.svg"), svg(180, 1, "#0b1020"));
console.log("wrote the icons to " + out);
