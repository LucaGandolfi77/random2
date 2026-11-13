import { H, W, type Chapter, type Cue, type Lang } from './timeline';
import { clamp, rgba, smooth } from './util';

export const SERIF = '"Cormorant Garamond Variable", "Iowan Old Style", Palatino, Georgia, serif';
export const SANS = '"Inter Variable", "Avenir Next", "Segoe UI", system-ui, sans-serif';

export interface TextMetrics {
  /** CSS pixels per stage unit. */
  cssScale: number;
  /** Visible stage width in logical units after cover-cropping. */
  visibleWidth: number;
}

const captionCache = new Map<string, string[]>();
const quoteCache = new Map<string, string[]>();

function setSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = `${px}px`;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  cacheKey: string,
  cache: Map<string, string[]>,
): string[] {
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  cache.set(cacheKey, lines);
  return lines;
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  min: number,
  family: string,
  weight: number,
  maxLines: number,
  cache: Map<string, string[]>,
  key: string,
): { size: number; lines: string[] } {
  let s = size;
  let lines: string[] = [];
  while (s >= min) {
    ctx.font = `${weight} ${s}px ${family}`;
    lines = wrapLines(ctx, text, maxWidth, `${key}-${s}`, cache);
    if (lines.length <= maxLines) break;
    s -= 1;
  }
  return { size: s, lines };
}

export function drawCaption(
  ctx: CanvasRenderingContext2D,
  cue: Cue,
  lang: Lang,
  time: number,
  captionsOn: boolean,
  metrics: TextMetrics = { cssScale: 0.62, visibleWidth: 620 },
): void {
  if (!captionsOn || cue.kind !== 'caption') return;
  const fadeIn = smooth((time - cue.start) / 0.38);
  const fadeOut = smooth((cue.end - time) / 0.38);
  const alpha = clamp(Math.min(fadeIn, fadeOut));
  if (alpha <= 0) return;

  const text = cue.text[lang];
  const maxWidth = Math.min(560, metrics.visibleWidth * 0.84);
  const baseSize = clamp(17.2 / Math.max(0.28, metrics.cssScale), 24, 42);
  const key = `${cue.id}-${lang}`;
  const { size, lines } = fitFont(
    ctx,
    text,
    maxWidth,
    baseSize,
    22,
    SERIF,
    600,
    4,
    captionCache,
    key,
  );
  const lineHeight = size * 1.32;
  const bottom = 1034;
  const top = bottom - (lines.length - 1) * lineHeight;
  const offset = (1 - alpha) * 7;

  ctx.save();
  const scrim = ctx.createLinearGradient(0, top - 80, 0, bottom + 46);
  scrim.addColorStop(0, 'rgba(5,4,3,0)');
  scrim.addColorStop(0.25, `rgba(5,4,3,${0.48 * alpha})`);
  scrim.addColorStop(0.8, `rgba(5,4,3,${0.56 * alpha})`);
  scrim.addColorStop(1, 'rgba(5,4,3,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, top - 80, W, bottom - top + 126);

  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${size}px ${SERIF}`;
  ctx.fillStyle = '#f2e8d5';
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, top + i * lineHeight + offset);
  });
  ctx.restore();
}

export function drawQuote(
  ctx: CanvasRenderingContext2D,
  cue: Cue,
  lang: Lang,
  time: number,
  metrics: TextMetrics = { cssScale: 0.62, visibleWidth: 620 },
): void {
  const fadeIn = smooth((time - cue.start) / 0.55);
  const fadeOut = smooth((cue.end - time) / 0.55);
  const alpha = clamp(Math.min(fadeIn, fadeOut));
  if (alpha <= 0) return;

  const fr = cue.french;
  const translated = cue.text[lang];
  const maxWidth = Math.min(540, metrics.visibleWidth * 0.84);
  const key = `${cue.id}-${lang}`;
  const size = clamp((fr ? 21.5 : 23) / Math.max(0.28, metrics.cssScale), 26, 52);
  const primary = fr ?? translated;
  const { size: fitted, lines } = fitFont(
    ctx,
    primary,
    maxWidth,
    size,
    24,
    SERIF,
    500,
    fr ? 4 : 4,
    quoteCache,
    key,
  );
  const lineHeight = fitted * 1.27;
  const secondary = fr ? translated : '';
  const secondarySize = clamp(14.5 / Math.max(0.28, metrics.cssScale), 19, 36);
  const secondaryLines = secondary
    ? wrapLines(ctx, secondary, maxWidth, `${key}-tr`, quoteCache)
    : [];
  const blockHeight =
    lines.length * lineHeight +
    (secondary ? 18 + secondaryLines.length * secondarySize * 1.38 : 0);
  const centerY = 775;
  const startY = centerY - blockHeight / 2 + lineHeight / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  const scrim = ctx.createLinearGradient(0, centerY - blockHeight / 2 - 90, 0, centerY + blockHeight / 2 + 90);
  scrim.addColorStop(0, 'rgba(5,4,3,0)');
  scrim.addColorStop(0.22, 'rgba(5,4,3,0.48)');
  scrim.addColorStop(0.78, 'rgba(5,4,3,0.48)');
  scrim.addColorStop(1, 'rgba(5,4,3,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, centerY - blockHeight / 2 - 90, W, blockHeight + 180);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${fitted}px ${SERIF}`;
  ctx.fillStyle = '#efe2c6';
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + i * lineHeight);
  });

  if (secondary) {
    ctx.font = `400 ${secondarySize}px ${SANS}`;
    ctx.fillStyle = 'rgba(235,226,208,0.84)';
    const sy = startY + lines.length * lineHeight + 14;
    secondaryLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, sy + i * secondarySize * 1.38);
    });
  }

  // ornament
  const y = startY - fitted * 0.95;
  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = '#d9ad5b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 52, y);
  ctx.lineTo(W / 2 - 9, y);
  ctx.moveTo(W / 2 + 9, y);
  ctx.lineTo(W / 2 + 52, y);
  ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#d9ad5b';
  ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
  ctx.restore();
  ctx.restore();
}

export function drawChapterCard(
  ctx: CanvasRenderingContext2D,
  chapter: Chapter,
  local: number,
  lang: Lang,
  metrics: TextMetrics = { cssScale: 0.62, visibleWidth: 620 },
): void {
  if (chapter.scene === 'prologue') return;
  const duration = chapter.scene === 'epilogue' ? 4.2 : 6.4;
  if (local < 0.5 || local > duration) return;
  const inA = smooth((local - 0.5) / 0.8);
  const outA = smooth((duration - local) / 0.8);
  const alpha = clamp(Math.min(inA, outA));
  if (alpha <= 0) return;

  const label = chapter.scene === 'epilogue' ? 'ÉPILOGUE' : `LIVRE ${chapter.roman}`;
  const y = 238;
  const labelSize = clamp(9.5 / Math.max(0.28, metrics.cssScale), 11, 22);
  const titleSize = clamp(38 / Math.max(0.28, metrics.cssScale), 52, 78);
  const subSize = clamp(10 / Math.max(0.28, metrics.cssScale), 11, 22);

  ctx.save();
  ctx.globalAlpha = alpha;
  const scrim = ctx.createLinearGradient(0, y - 120, 0, y + 155);
  scrim.addColorStop(0, 'rgba(5,4,3,0)');
  scrim.addColorStop(0.35, 'rgba(5,4,3,0.38)');
  scrim.addColorStop(0.7, 'rgba(5,4,3,0.38)');
  scrim.addColorStop(1, 'rgba(5,4,3,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, y - 120, W, 275);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setSpacing(ctx, 4.4);
  ctx.font = `600 ${labelSize}px ${SANS}`;
  ctx.fillStyle = '#d9ad5b';
  ctx.fillText(label, W / 2, y - 46);
  setSpacing(ctx, 0);

  ctx.font = `500 ${titleSize}px ${SERIF}`;
  ctx.fillStyle = '#f0e6d2';
  ctx.fillText(chapter.titleFr, W / 2, y + 8);
  const translated = chapter.title[lang];
  if (translated.toLowerCase() !== chapter.titleFr.toLowerCase()) {
    setSpacing(ctx, 2.6);
    ctx.font = `500 ${subSize}px ${SANS}`;
    ctx.fillStyle = 'rgba(236,225,202,0.56)';
    ctx.fillText(translated.toUpperCase(), W / 2, y + 58);
    setSpacing(ctx, 0);
  }

  ctx.strokeStyle = 'rgba(217,173,91,0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 90, y + 91);
  ctx.lineTo(W / 2 - 8, y + 91);
  ctx.moveTo(W / 2 + 8, y + 91);
  ctx.lineTo(W / 2 + 90, y + 91);
  ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, y + 91);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#d9ad5b';
  ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
  ctx.restore();
  ctx.restore();
}

export function trackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  spacing: number,
  color: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const chars = Array.from(text);
  let total = 0;
  for (const c of chars) total += ctx.measureText(c).width + spacing;
  total -= spacing;
  let cx = x - total / 2;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  ctx.restore();
}

export function drawLetterSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  spacing: number,
  color: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  ctx.restore();
}

export function drawEndTitle(ctx: CanvasRenderingContext2D, t: number, local: number): void {
  const alpha = smooth(local / 1.4) * smooth((40 - local) / 2.2);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 148px ${SERIF}`;
  ctx.fillStyle = '#f1e7d3';
  ctx.shadowColor = 'rgba(217,173,91,0.28)';
  ctx.shadowBlur = 40;
  ctx.fillText('FIN', W / 2, 580);
  ctx.shadowBlur = 0;
  setSpacing(ctx, 5);
  ctx.font = `500 14px ${SANS}`;
  ctx.fillStyle = 'rgba(236,225,202,0.52)';
  ctx.fillText('D’APRÈS VICTOR HUGO', W / 2, 682);
  ctx.font = `500 12px ${SANS}`;
  ctx.fillStyle = 'rgba(236,225,202,0.3)';
  ctx.fillText('DRAWN LIVE IN TYPESCRIPT', W / 2, 744);
  ctx.fillText('ORIGINAL SCORE · 2026', W / 2, 766);
  setSpacing(ctx, 0);
  ctx.restore();
}

export function drawLowerThird(
  ctx: CanvasRenderingContext2D,
  text: string,
  alpha: number,
  color = 'rgba(236,225,202,0.65)',
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 13px ${SANS}`;
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, H - 82);
  ctx.restore();
}

export function captionZoneAlpha(time: number, cue: Cue): number {
  return clamp(Math.min(smooth((time - cue.start) / 0.38), smooth((cue.end - time) / 0.38)));
}

export function drawCaptionFallback(
  ctx: CanvasRenderingContext2D,
  lang: Lang,
  text: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = `500 28px ${SERIF}`;
  ctx.fillStyle = rgba('#efe5d1', 0.9);
  ctx.fillText(text, W / 2, 1000);
  ctx.restore();
}
