/*
 * PIXEL CUP '96 — preview tool
 * ----------------------------
 * Renders a frame of the match headlessly and writes it as a PNG, so the
 * picture can be looked at without a browser.
 *
 *   node pixel-cup-pwa/tests/preview.mjs [out.png] [seconds] [seed]
 *
 * The PNG is written with nothing but node's own zlib: no dependency, no
 * canvas. The output is a real PNG, scaled up by an integer factor with
 * nearest-neighbour sampling, which is exactly how the game draws itself.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { encodePNG } from "../tools/png.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Core = require(resolve(here, "../src/core.js"));
const Raster = require(resolve(here, "../src/raster.js"));
const Render = require(resolve(here, "../src/render.js"));
const Font = require(resolve(here, "../src/font.js"));

/* ---- the scene ---------------------------------------------------- */

const W = 320, H = 180, SCALE = 3;

const out = process.argv[2] || "/tmp/pixel-cup.png";
const seconds = Number(process.argv[3] || 8);
const seed = Number(process.argv[4] || 31);

const buf = Raster.createBuffer(W, H);
const cam = Render.createCamera();
const m = Core.createMatch({ seed, home: "azzurri", away: "neri" });

const dt = 1 / 60;
for (let i = 0; i < seconds * 60; i++) {
  if (m.phase === "halftime") Core.startSecondHalf(m);
  /* A simple scripted player: walk towards the ball, and shoot when
     close to the goal. */
  const me = m.players[m.controlled];
  const dx = m.ball.x - me.x, dz = m.ball.z - me.z;
  const l = Math.hypot(dx, dz) || 1;
  const input = { mx: 0, my: 0, sprint: true };
  if (m.ball.owner === me.index) {
    input.mx = 0; input.my = 1;
    if (me.x > 12) { input.shootDown = true; }
  } else {
    input.mx = dz / l; input.my = dx / l;
  }
  Core.stepMatch(m, dt, input);
  if (input.shootDown && i % 40 === 0) { input.shootUp = true; }
  /* The camera follows the ball and eases into place, so it has to be
     updated every frame, not once at the end. */
  Render.updateCamera(cam, buf, dt, { x: m.ball.x, z: m.ball.z });
}

Raster.beginFrame(buf);
Render.drawScene(buf, cam, m, {
  homeKit: m.home.kit, awayKit: m.away.kit,
  homeShorts: m.home.shorts, awayShorts: m.away.shorts,
  spin: m.clock * 6,
});

/* ---- the heads-up display ----------------------------------------- */

/* The real interface module, so the preview shows the same heads-up
   display the game does — and so a bug in it shows up here. */
const UI = require(resolve(here, "../src/ui.js"));
const fakeScreen = { innerHTML: "", classList: { add() {}, remove() {}, contains() { return false; } },
                     setAttribute() {}, querySelector() { return null; }, addEventListener() {} };
const ui = UI.createUI({ screen: fakeScreen, live: null, audio: null, onAction() {} });

ui.drawHUD(buf, m, {
  banner: m.phase === "goal" ? "GOOOOL!" : null,
  commentary: "Che gola!",
});

/* ---- scale up and write -------------------------------------------- */

const outW = W * SCALE, outH = H * SCALE;
const big = Buffer.alloc(outW * outH * 3);
for (let y = 0; y < outH; y++) {
  const sy = (y / SCALE) | 0;
  for (let x = 0; x < outW; x++) {
    const sx = (x / SCALE) | 0;
    const si = (sy * W + sx) * 4;      /* the frame buffer is RGBA */
    const di = (y * outW + x) * 3;
    big[di] = buf.data[si];
    big[di + 1] = buf.data[si + 1];
    big[di + 2] = buf.data[si + 2];
  }
}
writeFileSync(out, encodePNG(outW, outH, big));
console.log("wrote " + out + "  (" + outW + "x" + outH + ")  score " + m.score.join("-") + "  phase " + m.phase);
