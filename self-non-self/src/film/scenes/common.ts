import type { Chapter, Shot } from '../types';
import type { ActPalette } from '../palette';
import { drawDendriticCell, type DendriticCellOptions } from '../cells';
import { PALETTE } from '../palette';
import { clamp, smoothstep } from '../util';

export interface SceneFrame {
  ctx: CanvasRenderingContext2D;
  time: number;
  chapter: Chapter;
  shot: Shot;
  chapterLocal: number;
  shotLocal: number;
  shotDuration: number;
  palette: ActPalette;
  reducedMotion: boolean;
}

export type ActRenderer = (frame: SceneFrame) => void;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  rotate: number;
}

export const CAMERA_HOME: Camera = { x: 360, y: 640, zoom: 1, rotate: 0 };

export function camera(
  x = 360,
  y = 640,
  zoom = 1,
  rotate = 0,
): Camera {
  return { x, y, zoom, rotate };
}

export function withCamera(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  draw: () => void,
): void {
  ctx.save();
  ctx.translate(360, 640);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.rotate(cam.rotate);
  ctx.translate(-cam.x, -cam.y);
  draw();
  ctx.restore();
}

export function drift(
  time: number,
  amountX = 10,
  amountY = 8,
  speed = 0.12,
): { x: number; y: number } {
  return {
    x: Math.sin(time * speed) * amountX,
    y: Math.cos(time * speed * 0.73) * amountY,
  };
}

export function messenger(
  frame: SceneFrame,
  x: number,
  y: number,
  scale: number,
  options: Partial<DendriticCellOptions> = {},
): void {
  drawDendriticCell(frame.ctx, {
    x,
    y,
    scale,
    time: frame.time,
    tint: PALETTE.rose,
    glow: PALETTE.gold,
    alpha: 1,
    ...options,
  });
}

/** A soft dip to black at shot edges; it hides the cut without slowing the film. */
export function drawShotEdge(frame: SceneFrame, strength = 0.35): void {
  const { ctx, shotLocal, shotDuration } = frame;
  const inAlpha = 1 - smoothstep(0, 0.32, shotLocal);
  const outAlpha = smoothstep(shotDuration - 0.24, shotDuration, shotLocal);
  const a = Math.max(inAlpha, outAlpha) * strength;
  if (a <= 0.002) return;
  ctx.fillStyle = `rgba(3, 3, 4, ${a})`;
  ctx.fillRect(0, 0, 720, 1280);
}

export function shake(frame: SceneFrame, amount = 6): { x: number; y: number } {
  if (frame.reducedMotion) return { x: 0, y: 0 };
  const t = frame.time;
  return {
    x: Math.sin(t * 37.1) * amount + Math.sin(t * 11.7) * amount * 0.4,
    y: Math.cos(t * 43.3) * amount * 0.8,
  };
}

export function chapterAlpha(local: number, duration: number, fade = 1.2): number {
  return clamp(Math.min(local / fade, (duration - local) / fade), 0, 1);
}

export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  const p = clamp(t, 0, 1);
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    zoom: a.zoom + (b.zoom - a.zoom) * p,
    rotate: a.rotate + (b.rotate - a.rotate) * p,
  };
}

export function pulse(time: number, bpm: number, phase = 0): number {
  const beat = (time * bpm) / 60 + phase;
  const f = beat - Math.floor(beat);
  return Math.max(0, 1 - f * 4.5);
}
