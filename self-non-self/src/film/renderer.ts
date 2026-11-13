import { actPalette } from './palette';
import { chapterAt, shotAt, STAGE_H, STAGE_W } from './timeline';
import type { ActRenderer, SceneFrame } from './scenes/common';
import { renderPrologue } from './scenes/act0';
import { renderWatch } from './scenes/act1';
import { renderSilence } from './scenes/act2';
import { renderBreach } from './scenes/act3';
import { renderResidents } from './scenes/act4';
import { renderSignal } from './scenes/act5';
import { renderEmpty } from './scenes/act6';
import { renderSurface } from './scenes/act7';
import { renderApoptosis } from './scenes/act8';
import { renderGarden } from './scenes/act9';
import { drawDendriticCell, drawGlow, drawPulseRing } from './cells';
import { drawForegroundHaze, drawLivingField } from './environments';
import { PALETTE } from './palette';
import { clamp, rgba } from './util';

const ACTS: Record<string, ActRenderer> = {
  prologue: renderPrologue,
  watch: renderWatch,
  silence: renderSilence,
  breach: renderBreach,
  residents: renderResidents,
  signal: renderSignal,
  empty: renderEmpty,
  surface: renderSurface,
  apoptosis: renderApoptosis,
  garden: renderGarden,
};

export interface RendererOptions {
  reducedMotion?: boolean;
}

export class FilmRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private grainPattern: CanvasPattern | null = null;
  private scale = 1;
  private reducedMotion: boolean;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.reducedMotion = options.reducedMotion ?? false;
    this.buildGrain();
    this.resize();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  resize(): void {
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    const maxPixels = 2_200_000;
    const cap = Math.min(dpr, 1.6, Math.sqrt(maxPixels / (STAGE_W * STAGE_H)));
    this.scale = Math.max(1, cap);
    this.canvas.width = Math.round(STAGE_W * this.scale);
    this.canvas.height = Math.round(STAGE_H * this.scale);
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  draw(time: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050405';
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);

    const chapter = chapterAt(time);
    const { shot, local } = shotAt(time);
    const frame: SceneFrame = {
      ctx,
      time,
      chapter,
      shot,
      chapterLocal: time - chapter.start,
      shotLocal: local,
      shotDuration: shot.end - shot.start,
      palette: actPalette(chapter.id),
      reducedMotion: this.reducedMotion,
    };

    ctx.save();
    if (!this.reducedMotion) {
      ctx.translate(Math.sin(time * 0.37) * 0.5, Math.cos(time * 0.29) * 0.4);
    }
    ctx.beginPath();
    ctx.rect(0, 0, STAGE_W, STAGE_H);
    ctx.clip();
    const act = ACTS[chapter.id];
    if (act) act(frame);
    ctx.restore();

    if (time > 10 && time < 771) drawForegroundHaze(ctx, time, frame.palette);

    this.drawGrade(time);
    this.drawGrain();
    this.drawVignette();

    if (time >= 779.2) {
      const fade = clamp((time - 779.2) / 0.8, 0, 1);
      ctx.fillStyle = `rgba(2, 2, 3, ${fade})`;
      ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    }
  }

  drawPoster(time: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = '#050405';
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    const palette = actPalette('prologue');
    drawLivingField(ctx, time, palette);
    const breathe = 1 + Math.sin(time * 0.5) * 0.025;
    ctx.save();
    ctx.translate(360, 700);
    ctx.scale(breathe, breathe);
    drawDendriticCell(ctx, {
      x: 0,
      y: 0,
      scale: 1.6,
      time,
      tint: PALETTE.rose,
      glow: PALETTE.gold,
      alpha: 0.86,
    });
    ctx.restore();
    drawPulseRing(ctx, 360, 700, 250 + Math.sin(time * 0.6) * 14, 0.05, PALETTE.amber, 1);
    drawPulseRing(ctx, 360, 700, 190 + Math.sin(time * 0.6 + 1) * 10, 0.07, PALETTE.rose, 1);
    drawGlow(ctx, { x: 360, y: 700, radius: 340, color: PALETTE.blood, alpha: 0.08 });
    this.drawGrain();
    this.drawVignette();
  }

  private drawGrade(time: number): void {
    const ctx = this.ctx;
    const chapter = chapterAt(time);
    const palette = actPalette(chapter.id);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createRadialGradient(360, 620, 80, 360, 620, 720);
    g.addColorStop(0, rgba(palette.glow, 0.08));
    g.addColorStop(0.55, rgba(palette.accent, 0.04));
    g.addColorStop(1, rgba(PALETTE.void, 0.25));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    ctx.restore();
  }

  private drawGrain(): void {
    if (!this.grainPattern) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = this.grainPattern;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    ctx.restore();
  }

  private drawVignette(): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(360, 620, 240, 360, 620, 760);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  }

  private buildGrain(): void {
    const size = 192;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const gctx = offscreen.getContext('2d');
    if (!gctx) return;
    const image = gctx.createImageData(size, size);
    let seed = 0x9e3779b9;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const v = (seed >>> 24) & 255;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    gctx.putImageData(image, 0, 0);
    this.grainPattern = this.ctx.createPattern(offscreen, 'repeat');
  }
}
