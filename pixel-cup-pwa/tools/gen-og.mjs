/*
 * PIXEL CUP '96 — social card
 * ----------------------------
 * Writes the 1200x630 preview card the hub and the social networks use.
 *
 * The card is a real frame of the game, scaled up, with the title set in
 * the same 5x7 bitmap font the heads-up display uses — so the card is
 * made of the same pixels as the game rather than being a poster about
 * one.
 *
 *   node pixel-cup-pwa/tools/gen-og.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { encodePNG } from "./png.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Core = require(resolve(here, "../src/core.js"));
const Raster = require(resolve(here, "../src/raster.js"));
const Render = require(resolve(here, "../src/render.js"));
const Font = require(resolve(here, "../src/font.js"));

const W = 320, H = 180;
const SCALE = 3;
const CARD_W = 1200, CARD_H = 630;

/* ---- a frame of the game ---- */

const buf = Raster.createBuffer(W, H);
const cam = Render.createCamera();
const m = Core.createMatch({ seed: 20260921, home: "azzurri", away: "neri" });

/* Let the match run so the ball is out in the open, then render. */
for (let i = 0; i < 60 * 22; i++) {
  const me = m.players[m.controlled];
  const dx = m.ball.x - me.x, dz = m.ball.z - me.z;
  const l = Math.hypot(dx, dz) || 1;
  Core.stepMatch(m, 1 / 60, { mx: dz / l, my: dx / l, sprint: true });
  Render.updateCamera(cam, buf, 1 / 60, { x: m.ball.x, z: m.ball.z });
}

Raster.beginFrame(buf);
Render.drawScene(buf, cam, m, {
  homeKit: m.home.kit, awayKit: m.away.kit,
  homeShorts: m.home.shorts, awayShorts: m.away.shorts,
  spin: 2,
});

/* ---- the card ---- */

const card = Buffer.alloc(CARD_W * CARD_H * 3);
/* A dark blue ground, so the picture sits on something. */
for (let y = 0; y < CARD_H; y++) {
  const t = y / CARD_H;
  const r = Math.round(11 + (7 - 11) * t);
  const g = Math.round(16 + (10 - 16) * t);
  const b = Math.round(32 + (20 - 32) * t);
  for (let x = 0; x < CARD_W; x++) {
    const i = (y * CARD_W + x) * 3;
    card[i] = r; card[i + 1] = g; card[i + 2] = b;
  }
}

/* The picture, scaled up and centred. */
const picW = W * SCALE, picH = H * SCALE;
const picX = Math.round((CARD_W - picW) / 2);
const picY = 12;
for (let y = 0; y < picH; y++) {
  const sy = (y / SCALE) | 0;
  for (let x = 0; x < picW; x++) {
    const sx = (x / SCALE) | 0;
    const si = (sy * W + sx) * 4;
    const di = ((picY + y) * CARD_W + picX + x) * 3;
    card[di] = buf.data[si];
    card[di + 1] = buf.data[si + 1];
    card[di + 2] = buf.data[si + 2];
  }
}

/* A band under the picture for the title. */
for (let y = picY + picH; y < CARD_H; y++) {
  for (let x = 0; x < CARD_W; x++) {
    const i = (y * CARD_W + x) * 3;
    const t = (y - (picY + picH)) / (CARD_H - picY - picH);
    card[i] = Math.round(11 + (5 - 11) * t);
    card[i + 1] = Math.round(16 + (8 - 16) * t);
    card[i + 2] = Math.round(32 + (20 - 32) * t);
  }
}

/* The title, in the game's own font. The font writes into a frame
   buffer, so it draws into a scratch one and the pixels are copied
   over. */
const scratch = { w: CARD_W, h: CARD_H, data: new Uint8ClampedArray(CARD_W * CARD_H * 4) };
function draw(str, x, y, scale, rgb) {
  Font.drawText(scratch, x, y, str, rgb, scale);
}
draw("PIXEL CUP '96", 58, picY + picH + 16, 5, [255, 214, 64]);
draw("LOW-POLY ARCADE FOOTBALL", 62, picY + picH + 58, 2, [228, 234, 248]);
for (let i = 0; i < CARD_W * CARD_H; i++) {
  const a = scratch.data[i * 4 + 3];
  if (!a) continue;
  const j = i * 3;
  card[j] = scratch.data[i * 4];
  card[j + 1] = scratch.data[i * 4 + 1];
  card[j + 2] = scratch.data[i * 4 + 2];
}

const png = encodePNG(CARD_W, CARD_H, card);
const out = resolve(here, "../og-cover.png");
writeFileSync(out, png);
console.log("wrote " + out + " (" + CARD_W + "x" + CARD_H + ", " + (png.length / 1024).toFixed(1) + " kB)");
