/* The panel painter: one canvas, one virtual 1000-unit stage.
 *
 * Background, then the effects that belong behind the cast, then the figures
 * sorted by their feet, then the effects that live in front, then halftone,
 * paper grain and a vignette. All coordinates in the data are fractions, so
 * the same panel works as a phone strip or a desktop splash.
 */
import { VH, THEMES, hash, mulberry32, halftone, vignette, grain } from "./art-core.js";
import { BACKGROUNDS } from "./art-backgrounds.js";
import { CHARACTERS, POSES_LIST } from "./art-characters.js";
import { FX } from "./art-fx.js";

export { BACKGROUNDS, CHARACTERS, POSES_LIST, FX };

export const ART_VOCAB = {
  backgrounds: Object.keys(BACKGROUNDS),
  characters: Object.keys(CHARACTERS),
  poses: POSES_LIST,
  fx: Object.keys(FX)
};

export function drawPanel(canvas, panel) {
  if (!canvas || !panel) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;

  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2.5);
  const pxW = Math.max(1, Math.round(rect.width * dpr));
  const pxH = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scale = pxH / VH;
  const W = pxW / scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, VH);
  ctx.imageSmoothingEnabled = true;

  const V = { w: W, h: VH };
  const theme = THEMES[panel.theme] || THEMES.night;
  const rng = mulberry32(hash(panel.id || "panel"));

  const background = BACKGROUNDS[panel.bg] || BACKGROUNDS.tramStreet;
  background(ctx, V, theme, rng, panel);

  const effects = (panel.fx || []).map((key) => FX[key]).filter(Boolean);
  effects.filter((effect) => effect.layer === "back").forEach((effect) => {
    ctx.save();
    effect.draw(ctx, V, theme, rng, panel);
    ctx.restore();
  });

  const cast = (panel.chars || []).slice().sort((a, b) => (a.y || 0) - (b.y || 0));
  cast.forEach((char) => {
    const draw = CHARACTERS[char.who] || CHARACTERS.crowd;
    const x = (char.x == null ? 0.5 : char.x) * W;
    const y = (char.y == null ? 0.88 : char.y) * VH;
    ctx.save();
    draw(ctx, x, y, char.s == null ? 1 : char.s, Boolean(char.flip), theme, rng, char.pose || "stand", panel);
    ctx.restore();
  });

  effects.filter((effect) => effect.layer === "front").forEach((effect) => {
    ctx.save();
    effect.draw(ctx, V, theme, rng, panel);
    ctx.restore();
  });

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  halftone(ctx, V);
  grain(ctx, V, rng);
  vignette(ctx, V, theme);
  ctx.restore();
}

export function drawCover(canvas, issue) {
  if (!issue || !issue.cover) return;
  drawPanel(canvas, { ...issue.cover, id: `cover:${issue.id}` });
}
