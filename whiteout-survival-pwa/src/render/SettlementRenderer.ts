/**
 * Procedural Canvas 2D settlement. The ground and buildings are painted once
 * into an offscreen layer and only snow, smoke, light and the selection ring are
 * redrawn. It is independent of React and reads the latest state through a ref.
 */

import { FACILITIES, FACILITY_ORDER } from '../game/content';
import { getDayPhase, getFurnaceHeatRatio } from '../game/engine';
import type { FacilityId, GameState } from '../game/types';

export const PLOT_POSITIONS: Record<FacilityId, { x: number; y: number }> = {
  clinic: { x: 0.345, y: 0.14 },
  ironSeam: { x: 0.66, y: 0.14 },
  lumberMill: { x: 0.2, y: 0.31 },
  coalMine: { x: 0.81, y: 0.31 },
  furnace: { x: 0.5, y: 0.47 },
  huntersHut: { x: 0.16, y: 0.66 },
  cookhouse: { x: 0.84, y: 0.66 },
  shelter: { x: 0.5, y: 0.82 },
};

const FURNACE_GLOW = { x: 0.5, y: 0.52 };
const TREES = [
  [0.06, 0.12, 0.9],
  [0.12, 0.19, 0.7],
  [0.9, 0.15, 1],
  [0.95, 0.24, 0.72],
  [0.07, 0.45, 0.7],
  [0.94, 0.48, 0.85],
  [0.06, 0.58, 1],
  [0.93, 0.58, 0.65],
  [0.28, 0.05, 0.55],
  [0.74, 0.045, 0.62],
  [0.1, 0.86, 0.7],
  [0.9, 0.86, 0.85],
  [0.28, 0.94, 0.55],
  [0.72, 0.94, 0.6],
] as const;

interface Flake {
  x: number;
  y: number;
  size: number;
  drift: number;
  speed: number;
  phase: number;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
}

function seeded(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export class SettlementRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private staticCanvas: HTMLCanvasElement;
  private staticCtx: CanvasRenderingContext2D;
  private game: GameState;
  private selected: FacilityId | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private staticSignature = '';
  private flakes: Flake[] = [];
  private smoke: SmokePuff[] = [];
  private lastTime = 0;
  private elapsed = 0;
  private smokeClock = 0;
  private reducedMotion = false;
  private running = false;
  private animationId = 0;

  constructor(canvas: HTMLCanvasElement, game: GameState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.staticCanvas = document.createElement('canvas');
    this.staticCtx = this.staticCanvas.getContext('2d') ?? ctx;
    this.game = game;
    if (typeof window !== 'undefined') {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    this.resize();
  }

  setGame(game: GameState): void {
    this.game = game;
  }

  setSelected(facility: FacilityId | null): void {
    this.selected = facility;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.staticCanvas.width = Math.round(width * this.dpr);
    this.staticCanvas.height = Math.round(height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.staticCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.buildFlakes();
    this.staticSignature = '';
    this.rebuildStatic();
    this.draw();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
      this.lastTime = now;
      if (!document.hidden) {
        this.elapsed += dt;
        this.update(dt);
        this.draw();
      }
      this.animationId = window.requestAnimationFrame(loop);
    };
    this.animationId = window.requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    window.cancelAnimationFrame(this.animationId);
  }

  private buildFlakes(): void {
    const count = this.reducedMotion ? 45 : 120;
    this.flakes = Array.from({ length: count }, (_, index) => ({
      x: seeded(index + 4) * this.width,
      y: seeded(index + 70) * this.height,
      size: 0.7 + seeded(index + 120) * 1.9,
      drift: 4 + seeded(index + 190) * 12,
      speed: 9 + seeded(index + 260) * 17,
      phase: seeded(index + 330) * Math.PI * 2,
    }));
  }

  private structuralSignature(): string {
    return FACILITY_ORDER.map(
      (id) => `${id}:${this.game.buildings[id].built ? 1 : 0}:${this.game.buildings[id].level}`,
    ).join('|');
  }

  private px(x: number, y: number): { x: number; y: number } {
    return { x: x * this.width, y: y * this.height };
  }

  private rebuildStatic(): void {
    if (!this.width || !this.height) return;
    const signature = this.structuralSignature();
    if (signature === this.staticSignature) return;
    this.staticSignature = signature;
    const ctx = this.staticCtx;
    const { width, height } = this;
    ctx.clearRect(0, 0, width, height);

    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#07111b');
    background.addColorStop(0.52, '#0c1d2b');
    background.addColorStop(1, '#17293a');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    // aurora / distant cold light
    const aurora = ctx.createRadialGradient(width * 0.82, height * 0.08, 0, width * 0.82, height * 0.08, width * 0.8);
    aurora.addColorStop(0, 'rgba(96, 189, 210, 0.14)');
    aurora.addColorStop(0.55, 'rgba(58, 112, 143, 0.05)');
    aurora.addColorStop(1, 'rgba(7, 17, 27, 0)');
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, width, height);

    // stars and wind-blown snow grain
    for (let i = 0; i < 90; i += 1) {
      const x = seeded(i + 500) * width;
      const y = seeded(i + 620) * height * 0.55;
      ctx.fillStyle = `rgba(210, 240, 248, ${0.06 + seeded(i + 40) * 0.16})`;
      ctx.fillRect(x, y, seeded(i + 150) > 0.8 ? 2 : 1, 1);
    }

    // settlement snow plateau
    const plateau = ctx.createRadialGradient(width * 0.5, height * 0.52, 12, width * 0.5, height * 0.52, width * 0.64);
    plateau.addColorStop(0, 'rgba(210, 235, 242, 0.27)');
    plateau.addColorStop(0.55, 'rgba(152, 195, 208, 0.16)');
    plateau.addColorStop(1, 'rgba(132, 170, 184, 0)');
    ctx.fillStyle = plateau;
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.53, width * 0.47, height * 0.45, -0.06, 0, Math.PI * 2);
    ctx.fill();

    // trail network
    const furnace = this.px(PLOT_POSITIONS.furnace.x, PLOT_POSITIONS.furnace.y);
    for (const id of FACILITY_ORDER) {
      if (id === 'furnace') continue;
      if (!this.game.buildings[id].built) continue;
      const target = this.px(PLOT_POSITIONS[id].x, PLOT_POSITIONS[id].y);
      ctx.beginPath();
      ctx.moveTo(furnace.x, furnace.y + 17);
      const midX = (furnace.x + target.x) / 2 + (seeded(id.length * 33) - 0.5) * 28;
      const midY = (furnace.y + target.y) / 2 + (seeded(id.length * 17) - 0.5) * 16;
      ctx.quadraticCurveTo(midX, midY, target.x, target.y + 19);
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(180, 212, 223, 0.12)';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(180, 214, 225, 0.08)';
      ctx.stroke();
    }

    // snow pits and drifts
    for (let i = 0; i < 32; i += 1) {
      const x = seeded(i + 900) * width;
      const y = seeded(i + 970) * height;
      const rx = 8 + seeded(i + 1100) * 32;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.28, seeded(i + 1230) * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(206, 236, 244, ${0.015 + seeded(i + 50) * 0.035})`;
      ctx.fill();
    }

    // pines and boundary posts
    for (const [x, y, scale] of TREES) {
      this.drawPine(ctx, x * width, y * height, scale * Math.min(width, height) * 0.075);
    }
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const x = width * 0.5 + Math.cos(angle) * width * 0.44;
      const y = height * 0.52 + Math.sin(angle) * height * 0.42;
      ctx.fillStyle = 'rgba(75, 96, 105, .5)';
      ctx.fillRect(x, y - 7, 2.5, 13);
      ctx.beginPath();
      ctx.arc(x + 1, y - 8, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(210, 232, 238, .35)';
      ctx.fill();
    }

    const drawable = FACILITY_ORDER.filter(
      (id) => id !== 'furnace' && this.game.buildings[id].built,
    ).sort((a, b) => PLOT_POSITIONS[a].y - PLOT_POSITIONS[b].y);
    for (const id of drawable) {
      const point = this.px(PLOT_POSITIONS[id].x, PLOT_POSITIONS[id].y);
      this.drawBuilding(ctx, id, point.x, point.y);
    }
    const furnacePoint = this.px(PLOT_POSITIONS.furnace.x, PLOT_POSITIONS.furnace.y);
    this.drawFurnace(ctx, furnacePoint.x, furnacePoint.y);

    // wind-buried unbuilt plots
    for (const id of FACILITY_ORDER) {
      if (id === 'furnace' || this.game.buildings[id].built) continue;
      if (!this.isUnlocked(id)) continue;
      const point = this.px(PLOT_POSITIONS[id].x, PLOT_POSITIONS[id].y);
      ctx.beginPath();
      ctx.ellipse(point.x, point.y + 10, 28, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201, 231, 238, 0.08)';
      ctx.fill();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(185, 219, 229, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(85, 107, 115, .8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(point.x - 8, point.y + 8);
      ctx.lineTo(point.x, point.y - 2);
      ctx.lineTo(point.x + 8, point.y + 8);
      ctx.stroke();
    }

    // faded foreground drift
    const drift = ctx.createLinearGradient(0, height * 0.7, 0, height);
    drift.addColorStop(0, 'rgba(11, 27, 39, 0)');
    drift.addColorStop(1, 'rgba(132, 180, 195, .12)');
    ctx.fillStyle = drift;
    ctx.fillRect(0, height * 0.7, width, height * 0.3);
  }

  private isUnlocked(id: FacilityId): boolean {
    if (id === 'furnace') return true;
    return this.game.furnace.level >= FACILITIES[id].unlockFurnace;
  }

  private drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(7, 19, 26, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 2, size * 0.3, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#182d36';
    for (let tier = 0; tier < 3; tier += 1) {
      const width = size * (0.34 - tier * 0.07);
      const top = -size * (0.23 + tier * 0.24);
      ctx.beginPath();
      ctx.moveTo(0, top - size * 0.38);
      ctx.lineTo(-width, top);
      ctx.lineTo(width, top);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = tier === 0 ? '#d2edf2' : 'rgba(206, 235, 242, 0.72)';
      ctx.beginPath();
      ctx.moveTo(0, top - size * 0.38);
      ctx.lineTo(-width * 0.7, top - size * 0.05);
      ctx.lineTo(0, top - size * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#182d36';
    }
    ctx.fillStyle = '#2f4147';
    ctx.fillRect(-1, 0, 2, size * 0.12);
    ctx.restore();
  }

  private drawBuilding(ctx: CanvasRenderingContext2D, id: FacilityId, x: number, y: number): void {
    const level = this.game.buildings[id].level;
    const scale = 0.82 + Math.min(0.25, level * 0.035);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(4, 12, 18, .45)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 33, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    if (id === 'lumberMill') {
      this.drawCabin(ctx, 0, 0, 31, 22, '#243c42', '#7a5b44', 'saw');
      ctx.strokeStyle = '#8e6650';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-30, 16);
      ctx.lineTo(-19, -2);
      ctx.stroke();
      ctx.fillStyle = '#9eb4b7';
      ctx.beginPath();
      ctx.arc(-30, 17, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4e3328';
      ctx.fillRect(16, 11, 15, 5);
      ctx.fillRect(16, 4, 12, 5);
    } else if (id === 'coalMine') {
      ctx.fillStyle = '#1d3036';
      ctx.beginPath();
      ctx.moveTo(-34, 15);
      ctx.quadraticCurveTo(-30, -20, 0, -24);
      ctx.quadraticCurveTo(30, -20, 34, 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#050c10';
      ctx.beginPath();
      ctx.ellipse(0, 5, 16, 18, 0, Math.PI, 0);
      ctx.lineTo(16, 15);
      ctx.lineTo(-16, 15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#63787a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-19, 14);
      ctx.lineTo(-16, -6);
      ctx.moveTo(19, 14);
      ctx.lineTo(16, -6);
      ctx.stroke();
      ctx.fillStyle = '#2b3a3c';
      roundedRect(ctx, 20, 9, 14, 7, 2);
      ctx.fill();
      ctx.fillStyle = '#0f1b1f';
      ctx.beginPath();
      ctx.arc(23, 17, 3, 0, Math.PI * 2);
      ctx.arc(31, 17, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'huntersHut') {
      this.drawCabin(ctx, 0, 0, 25, 20, '#2a3b3d', '#5d4638', 'hunter');
      ctx.strokeStyle = '#a9c4c5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-13, -21);
      ctx.lineTo(-19, -31);
      ctx.moveTo(-13, -21);
      ctx.lineTo(-6, -32);
      ctx.stroke();
    } else if (id === 'cookhouse') {
      this.drawCabin(ctx, 0, 0, 29, 22, '#3b3732', '#6e4e3a', 'cook');
      ctx.fillStyle = '#2d3535';
      ctx.fillRect(4, -30, 7, 15);
      ctx.fillStyle = 'rgba(238, 161, 93, .18)';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'shelter') {
      this.drawCabin(ctx, 0, 0, 43, 20, '#2e3d40', '#6c4e3b', 'shelter');
      ctx.fillStyle = 'rgba(244, 177, 103, .2)';
      ctx.beginPath();
      ctx.arc(0, 1, 28, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'clinic') {
      this.drawCabin(ctx, 0, 0, 27, 21, '#35484c', '#664c3e', 'clinic');
    } else if (id === 'ironSeam') {
      ctx.fillStyle = '#304046';
      ctx.beginPath();
      ctx.moveTo(-31, 15);
      ctx.lineTo(-20, -13);
      ctx.lineTo(-7, 2);
      ctx.lineTo(5, -20);
      ctx.lineTo(24, 2);
      ctx.lineTo(33, 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#557079';
      ctx.beginPath();
      ctx.moveTo(-20, -13);
      ctx.lineTo(-16, -2);
      ctx.lineTo(-25, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#233a43';
      ctx.beginPath();
      ctx.moveTo(5, -20);
      ctx.lineTo(10, -2);
      ctx.lineTo(1, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6d766f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 9);
      ctx.lineTo(26, -12);
      ctx.stroke();
    }

    // warm windows
    if (id !== 'coalMine' && id !== 'ironSeam') {
      ctx.fillStyle = 'rgba(252, 186, 105, .8)';
      ctx.fillRect(-7, -2, 5, 5);
      ctx.fillRect(2, -2, 5, 5);
      ctx.fillStyle = 'rgba(255, 208, 138, .18)';
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCabin(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    halfWidth: number,
    height: number,
    wall: string,
    roof: string,
    variant: string,
  ): void {
    ctx.fillStyle = 'rgba(215, 236, 241, .12)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, halfWidth + 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = wall;
    roundedRect(ctx, x - halfWidth * 0.68, y - height * 0.05, halfWidth * 1.36, height * 0.8, 2);
    ctx.fill();

    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - halfWidth, y + 1);
    ctx.lineTo(x, y - height - 9);
    ctx.lineTo(x + halfWidth, y + 1);
    ctx.lineTo(x + halfWidth - 5, y + 5);
    ctx.lineTo(x, y - height - 4);
    ctx.lineTo(x - halfWidth + 5, y + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(239, 247, 248, .85)';
    ctx.beginPath();
    ctx.moveTo(x - halfWidth * 0.75, y - 2);
    ctx.lineTo(x, y - height - 7);
    ctx.lineTo(x + halfWidth * 0.22, y - height * 0.45);
    ctx.lineTo(x - halfWidth * 0.24, y - height * 0.38);
    ctx.lineTo(x - halfWidth * 0.52, y - height * 0.18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(12, 24, 29, .45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - halfWidth * 0.52, y + 2);
    ctx.lineTo(x - halfWidth * 0.52, y + height * 0.63);
    ctx.moveTo(x + halfWidth * 0.52, y + 2);
    ctx.lineTo(x + halfWidth * 0.52, y + height * 0.63);
    ctx.stroke();

    if (variant === 'clinic') {
      ctx.fillStyle = '#d28e74';
      ctx.fillRect(x - 7, y - 12, 3, 11);
      ctx.fillRect(x - 11, y - 8, 11, 3);
    }
    if (variant === 'cook') {
      ctx.fillStyle = '#1d2829';
      ctx.fillRect(x + halfWidth * 0.2, y - height - 17, 4, 12);
    }
    if (variant === 'hunter') {
      ctx.fillStyle = '#4b3b32';
      ctx.fillRect(x - 3, y + 2, 6, 7);
    }
    if (variant === 'shelter') {
      ctx.fillStyle = 'rgba(255, 183, 103, .9)';
      for (let window = -1; window <= 1; window += 1) {
        ctx.fillRect(x + window * 14 - 3, y - height * 0.01, 6, 5);
      }
    }
    if (variant === 'saw') {
      ctx.strokeStyle = '#95a8a7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + halfWidth * 0.4, y + 3, 7, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  private drawFurnace(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(3, 8, 12, .55)';
    ctx.beginPath();
    ctx.ellipse(0, 28, 53, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone apron and snow-buried foundation.
    ctx.fillStyle = '#1b2d32';
    ctx.beginPath();
    ctx.ellipse(0, 13, 44, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a4146';
    ctx.beginPath();
    ctx.ellipse(0, 7, 38, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(226, 246, 249, .72)';
    ctx.beginPath();
    ctx.ellipse(-4, 4, 34, 10, -0.08, Math.PI, Math.PI * 2);
    ctx.fill();

    const stoneColors = ['#4a5e5e', '#3c5153', '#566a68', '#314649'];
    for (let i = 0; i < 11; i += 1) {
      const angle = (i / 11) * Math.PI * 2;
      const sx = Math.cos(angle) * 32;
      const sy = 7 + Math.sin(angle) * 11;
      ctx.fillStyle = stoneColors[i % stoneColors.length];
      ctx.beginPath();
      ctx.ellipse(sx, sy, 6.5, 4, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tapered furnace body.
    ctx.fillStyle = '#21383d';
    ctx.beginPath();
    ctx.moveTo(-18, 8);
    ctx.lineTo(-14, -25);
    ctx.quadraticCurveTo(0, -33, 14, -25);
    ctx.lineTo(18, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(139, 182, 186, .2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-13, -9);
    ctx.lineTo(13, -9);
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();

    // Chimney and snow cap.
    ctx.fillStyle = '#1a2e33';
    ctx.fillRect(-5, -47, 10, 23);
    ctx.fillStyle = '#3f575b';
    ctx.fillRect(-7, -48, 14, 4);
    ctx.fillStyle = 'rgba(226, 246, 249, .9)';
    ctx.beginPath();
    ctx.ellipse(-2, -49, 8, 3, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(226, 246, 249, .55)';
    ctx.beginPath();
    ctx.ellipse(14, -26, 8, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // The empty furnace mouth. Its fire is painted in draw() so it responds
    // to the live heat state without rebuilding the static scene.
    ctx.fillStyle = '#050b0e';
    ctx.beginPath();
    ctx.moveTo(-9, 7);
    ctx.lineTo(-8, -12);
    ctx.quadraticCurveTo(0, -20, 8, -12);
    ctx.lineTo(9, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(85, 117, 121, .48)';
    ctx.fillRect(-23, -5, 5, 4);
    ctx.fillRect(18, -5, 5, 4);
    ctx.restore();
  }

  private update(dt: number): void {
    const weather = this.game.weather.phase;
    const windMultiplier = weather === 'blizzard' ? 3.4 : weather === 'warning' ? 1.8 : 1;
    const motion = this.reducedMotion ? 0.25 : 1;
    for (const flake of this.flakes) {
      flake.phase += dt * 1.4;
      flake.y += flake.speed * windMultiplier * dt * motion;
      flake.x += (flake.drift * 0.4 + Math.sin(flake.phase) * 9) * windMultiplier * dt * motion;
      if (flake.y > this.height + 6) {
        flake.y = -8;
        flake.x = Math.random() * this.width;
      }
      if (flake.x > this.width + 20) flake.x = -10;
      if (flake.x < -20) flake.x = this.width + 10;
    }

    if (!this.reducedMotion) {
      this.smokeClock += dt;
      const furnaceOn = this.game.furnace.mode !== 'off';
      const spawnRate = this.game.furnace.mode === 'overdrive' ? 0.14 : 0.3;
      if (furnaceOn && this.smokeClock > spawnRate) {
        this.smokeClock = 0;
        const furnacePoint = this.px(FURNACE_GLOW.x, FURNACE_GLOW.y);
        this.smoke.push({
          x: furnacePoint.x + (Math.random() - 0.5) * 9,
          y: furnacePoint.y - 50,
          vx: -6 - Math.random() * 8,
          vy: -12 - Math.random() * 11,
          life: 0,
          maxLife: 2.5 + Math.random() * 2.8,
          radius: 5 + Math.random() * 7,
        });
      }
      for (const puff of this.smoke) {
        puff.life += dt;
        puff.x += puff.vx * dt;
        puff.y += puff.vy * dt;
        puff.radius += dt * 3;
      }
      this.smoke = this.smoke.filter((puff) => puff.life < puff.maxLife);
    } else {
      this.smoke = [];
    }
  }

  private draw(): void {
    if (!this.width || !this.height) return;
    this.rebuildStatic();
    const ctx = this.ctx;
    const { width, height } = this;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.staticCanvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, width, height);

    const weather = this.game.weather.phase;
    const phase = getDayPhase(this.game.clock);
    if (phase === 'sleep') {
      ctx.fillStyle = 'rgba(6, 14, 30, .36)';
      ctx.fillRect(0, 0, width, height);
    } else if (phase === 'eat') {
      ctx.fillStyle = 'rgba(255, 133, 66, .055)';
      ctx.fillRect(0, 0, width, height);
    }

    // warm life around the furnace
    const furnace = this.px(FURNACE_GLOW.x, FURNACE_GLOW.y);
    const heat = getFurnaceHeatRatio(this.game);
    const pulse = 0.94 + Math.sin(this.elapsed * 2.1) * 0.04;
    const glowRadius = (18 + heat * 70) * pulse;
    const glow = ctx.createRadialGradient(furnace.x, furnace.y, 2, furnace.x, furnace.y, glowRadius);
    const overdrive = this.game.furnace.mode === 'overdrive';
    glow.addColorStop(0, overdrive ? 'rgba(255, 181, 92, .22)' : 'rgba(255, 163, 80, .1)');
    glow.addColorStop(0.4, overdrive ? 'rgba(255, 108, 40, .1)' : 'rgba(255, 128, 54, .04)');
    glow.addColorStop(1, 'rgba(255, 90, 30, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(furnace.x, furnace.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // The furnace mouth burns only while the fire has heat.
    if (heat > 0.02) {
      const mouth = ctx.createRadialGradient(furnace.x, furnace.y - 2, 1, furnace.x, furnace.y - 2, 15);
      mouth.addColorStop(0, 'rgba(255, 241, 202, .96)');
      mouth.addColorStop(0.34, 'rgba(255, 172, 72, .78)');
      mouth.addColorStop(1, 'rgba(239, 91, 24, 0)');
      ctx.fillStyle = mouth;
      ctx.beginPath();
      ctx.ellipse(furnace.x, furnace.y - 2, 11, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 200, 112, .82)';
      ctx.beginPath();
      ctx.moveTo(furnace.x - 3.5, furnace.y + 4);
      ctx.quadraticCurveTo(furnace.x - 2, furnace.y - 6, furnace.x + 1, furnace.y - 11);
      ctx.quadraticCurveTo(furnace.x + 4, furnace.y - 4, furnace.x + 4, furnace.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 196, 103, .65)';
      ctx.fillRect(furnace.x - 23, furnace.y - 7, 5, 4);
      ctx.fillRect(furnace.x + 18, furnace.y - 7, 5, 4);
    }

    // window glow
    ctx.globalCompositeOperation = 'lighter';
    for (const id of FACILITY_ORDER) {
      if (id === 'furnace' || id === 'coalMine' || id === 'ironSeam') continue;
      if (!this.game.buildings[id].built) continue;
      const p = this.px(PLOT_POSITIONS[id].x, PLOT_POSITIONS[id].y);
      const radius = 13 + this.game.buildings[id].level * 1.5;
      const g = ctx.createRadialGradient(p.x, p.y - 1, 0, p.x, p.y - 1, radius);
      g.addColorStop(0, 'rgba(255, 195, 109, .12)');
      g.addColorStop(1, 'rgba(255, 171, 74, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 1, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // chimney smoke
    if (this.smoke.length) {
      ctx.save();
      for (const puff of this.smoke) {
        const t = puff.life / puff.maxLife;
        const alpha = (1 - t) * (weather === 'blizzard' ? 0.16 : 0.13);
        ctx.fillStyle = `rgba(194, 219, 224, ${Math.max(0, alpha)})`;
        ctx.beginPath();
        ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // embers in overdrive
    if (overdrive && !this.reducedMotion) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i += 1) {
        const t = (this.elapsed * 0.4 + i * 0.23) % 1;
        const x = furnace.x + Math.sin((this.elapsed + i) * 1.7) * 18 * (0.4 + t);
        const y = furnace.y - 10 - t * 52;
        ctx.fillStyle = `rgba(255, 178, 87, ${0.6 * (1 - t)})`;
        ctx.fillRect(x, y, 1.4, 2.8);
      }
      ctx.restore();
    }

    // selection ring
    if (this.selected) {
      const p = this.px(PLOT_POSITIONS[this.selected].x, PLOT_POSITIONS[this.selected].y);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 178, 96, .8)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 15, 34, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // snowfall and whiteout veil
    ctx.save();
    for (const flake of this.flakes) {
      const speedBoost = weather === 'blizzard' ? 1.7 : 1;
      ctx.fillStyle =
        weather === 'blizzard'
          ? `rgba(226, 244, 249, ${0.42 + flake.size * 0.1})`
          : `rgba(220, 241, 247, ${0.22 + flake.size * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(
        flake.x,
        flake.y,
        flake.size * speedBoost,
        flake.size * (weather === 'blizzard' ? 0.55 : 1),
        weather === 'blizzard' ? 0.65 : 0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();

    if (weather !== 'calm') {
      const veil = ctx.createLinearGradient(0, 0, width, height);
      const strength = weather === 'blizzard' ? 0.2 : 0.08;
      veil.addColorStop(0, `rgba(210, 235, 242, ${strength * 0.4})`);
      veil.addColorStop(0.5, `rgba(226, 242, 246, ${strength})`);
      veil.addColorStop(1, `rgba(187, 221, 231, ${strength * 0.5})`);
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, width, height);
      if (weather === 'blizzard' && !this.reducedMotion) {
        ctx.save();
        ctx.strokeStyle = 'rgba(225, 243, 248, .12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i += 1) {
          const y = ((this.elapsed * 130 + i * 67) % (height + 80)) - 40;
          const x = (i * 47 + this.elapsed * 90) % (width + 100) - 50;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 42, y - 22);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // subtle vignette keeps focus on the fire
    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.52,
      width * 0.21,
      width * 0.5,
      height * 0.52,
      width * 0.72,
    );
    vignette.addColorStop(0, 'rgba(3, 8, 13, 0)');
    vignette.addColorStop(1, 'rgba(3, 8, 13, .55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

  }
}
