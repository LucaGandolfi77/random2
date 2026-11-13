import {
  CHAPTERS,
  DURATION,
  H,
  W,
  activeCue,
  chapterAt,
  type Chapter,
  type Lang,
} from './timeline';
import { clamp, smooth } from './util';
import { drawChapterCard, drawCaption, drawQuote } from './text';
import { letterboxShade } from './art';
import type { SceneContext } from './scenes/common';
import { prologue } from './scenes/prologue';
import { digne } from './scenes/digne';
import { fantine } from './scenes/fantine';
import { montreuil } from './scenes/montreuil';
import { cosette } from './scenes/cosette';
import { paris } from './scenes/paris';
import { jardin } from './scenes/jardin';
import { barricade } from './scenes/barricade';
import { egout } from './scenes/egout';
import { etoile } from './scenes/etoile';
import { pardon } from './scenes/pardon';
import { epilogue } from './scenes/epilogue';

const scenes: Record<Chapter['scene'], (s: SceneContext) => void> = {
  prologue,
  digne,
  fantine,
  montreuil,
  cosette,
  paris,
  jardin,
  barricade,
  egout,
  etoile,
  pardon,
  epilogue,
};

export interface RenderOptions {
  lang: Lang;
  captions: boolean;
  reducedMotion: boolean;
  quality: number;
}

export class FilmRenderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = W;
  private cssH = H;
  private quality = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const dpr = Math.min(2, Math.max(1, rawDpr));
    const pixelBudget = 1_800_000;
    const budgetDpr = Math.sqrt(pixelBudget / Math.max(1, cssW * cssH));
    this.dpr = Math.max(1, Math.min(dpr, budgetDpr));
    const outW = Math.round(cssW * this.dpr);
    const outH = Math.round(cssH * this.dpr);
    if (this.canvas.width !== outW || this.canvas.height !== outH) {
      this.canvas.width = outW;
      this.canvas.height = outH;
    }
    this.cssW = cssW;
    this.cssH = cssH;
    this.quality = clamp(this.dpr / 2, 0.55, 1);
  }

  setQuality(quality: number): void {
    this.quality = clamp(quality, 0.5, 1);
  }

  render(time: number, options: RenderOptions): void {
    const { ctx } = this;
    const dpr = this.dpr;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const t = clamp(time, 0, DURATION);
    const chapter = chapterAt(t);
    const local = t - chapter.start;
    const duration = chapter.end - chapter.start;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, cw, ch);

    // Fit the portrait stage. Phones are taller than 9:16, so cover with a
    // modest side crop; wider tablets and desktops get the whole frame.
    const aspect = cw / ch;
    const stageAspect = W / H;
    const cover = aspect <= 0.66;
    const scale = cover ? Math.max(cw / W, ch / H) : Math.min(cw / W, ch / H);
    const ox = (cw - W * scale) / 2;
    const oy = (ch - H * scale) / 2;
    const cssScale = scale / dpr;
    const textMetrics = { cssScale, visibleWidth: this.cssW / cssScale };

    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, W * scale, H * scale);
    ctx.clip();
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    // A barely-there camera drift keeps the ink alive; disabled for
    // reduced-motion audiences.
    const drift = options.reducedMotion ? 0 : 1;
    const zoom = 1 + 0.012 * drift + Math.sin(t * 0.075) * 0.006 * drift;
    const dx = Math.sin(t * 0.11) * 5 * drift;
    const dy = Math.cos(t * 0.09) * 4 * drift;
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2 + dx, -H / 2 + dy);

    const sceneCtx: SceneContext = {
      ctx,
      t: Math.max(0, local),
      p: clamp(local / duration),
      accent: chapter.accent,
      quality: this.quality * options.quality,
    };

    ctx.save();
    scenes[chapter.scene](sceneCtx);
    ctx.restore();

    // A whisper of warm exposure: on a phone in daylight, the ink needs
    // a little air without losing its blacks.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(26,20,14,0.26)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // chapter boundaries: a short breath of black, like a page turning
    const edge = 0.55;
    let fade = 0;
    if (chapter.start > 0 && local < edge) fade = 1 - smooth(local / edge);
    if (chapter.end < DURATION && duration - local < edge) {
      fade = Math.max(fade, 1 - smooth((duration - local) / edge));
    }
    if (fade > 0) {
      ctx.fillStyle = `rgba(4,3,2,${fade})`;
      ctx.fillRect(0, 0, W, H);
    }

    letterboxShade(ctx);
    drawChapterCard(ctx, chapter, local, options.lang, textMetrics);

    const cue = activeCue(t);
    if (cue?.kind === 'quote') {
      drawQuote(ctx, cue, options.lang, t, textMetrics);
    } else if (cue) {
      drawCaption(ctx, cue, options.lang, t, options.captions, textMetrics);
    }

    ctx.restore();

    // subtle side frames for extra-wide viewports
    if (!cover) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(4,3,2,0.92)';
      ctx.fillRect(0, 0, cw, oy);
      ctx.fillRect(0, oy + H * scale, cw, ch - (oy + H * scale));
    }
  }

  renderPoster(): void {
    this.render(100, {
      lang: 'en',
      captions: false,
      reducedMotion: false,
      quality: 1,
    });
  }

  getCssRect(): { width: number; height: number } {
    return { width: this.cssW, height: this.cssH };
  }

  toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => this.canvas.toBlob((blob) => resolve(blob), 'image/png'));
  }
}

export function allChapterStarts(): number[] {
  return CHAPTERS.map((c) => c.start);
}
