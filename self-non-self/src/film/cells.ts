import { PALETTE } from './palette';
import {
  TAU,
  blobPath,
  clamp,
  lerp,
  noise1,
  rgba,
  seeded,
  smoothOpenPath,
} from './util';

export interface GlowOptions {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  squash?: number;
}

export function drawGlow(ctx: CanvasRenderingContext2D, options: GlowOptions): void {
  const { x, y, radius, color, alpha, squash = 1 } = options;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.35, rgba(color, alpha * 0.45));
  g.addColorStop(0.72, rgba(color, alpha * 0.12));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * squash, 0, 0, TAU);
  ctx.fill();
}

export interface DendriticCellOptions {
  x: number;
  y: number;
  scale: number;
  time: number;
  alpha?: number;
  tint?: string;
  glow?: string;
  branches?: number;
  branchLength?: number;
  reveal?: number;
  fold?: number;
  wounded?: boolean;
  wobble?: number;
  nucleusGlow?: number;
  showAntigens?: boolean;
}

/**
 * The protagonist: a dendritic cell drawn as a translucent hand / winter tree.
 * Everything is a pure function of time, so it can be scrubbed exactly.
 */
export function drawDendriticCell(
  ctx: CanvasRenderingContext2D,
  options: DendriticCellOptions,
): void {
  const {
    x,
    y,
    scale,
    time,
    alpha = 1,
    tint = PALETTE.rose,
    glow = PALETTE.amber,
    branches = 9,
    branchLength = 104,
    reveal = 1,
    fold = 0,
    wounded = false,
    wobble = 0.2,
    nucleusGlow = 1,
    showAntigens = true,
  } = options;

  const s = scale;
  const bodyRadius = 50 * s * (1 - fold * 0.22);
  const bodyAlpha = alpha * (1 - fold * 0.25);

  // Ambient halo
  drawGlow(ctx, {
    x,
    y,
    radius: 170 * s,
    color: glow,
    alpha: 0.13 * bodyAlpha,
  });
  drawGlow(ctx, {
    x,
    y,
    radius: 70 * s,
    color: tint,
    alpha: 0.18 * bodyAlpha,
  });

  ctx.save();
  ctx.globalAlpha = bodyAlpha;

  // Dendrites behind the body. The lengths are deliberately uneven: a hand,
  // not a virus. Every third arm is a main branch with a fork.
  const count = Math.max(1, Math.round(branches * reveal));
  const baseAngles = [-2.85, -2.08, -1.38, -0.68, 0.02, 0.68, 1.36, 2.06, 2.8];
  const lengthFactors = [1.34, 0.78, 1.08, 0.68, 1.26, 0.82, 1.12, 0.74, 1.18];
  for (let i = 0; i < count; i++) {
    if (wounded && i === 3) continue;
    const base = baseAngles[i % baseAngles.length]!;
    const angle = base + Math.sin(time * 0.16 + i * 1.9) * 0.08 + 0.08;
    const phase = i * 2.31;
    const sway = Math.sin(time * 0.42 + phase) * wobble;
    const main = i % 3 === 0;
    const length =
      branchLength *
      s *
      (1 - fold * 0.72) *
      lengthFactors[i % lengthFactors.length]! *
      (0.9 + noise1(i * 1.7, 4) * 0.1);
    drawDendrite(
      ctx,
      x,
      y,
      angle + sway,
      length,
      (main ? 8.2 : 5.6) * s,
      time,
      phase,
      tint,
      glow,
      alpha * (1 - fold * 0.5),
      main ? 2 : 1,
    );
  }

  if (wounded) {
    const stumpAngle = -0.68 + 0.08;
    const sx = x + Math.cos(stumpAngle) * bodyRadius * 1.1;
    const sy = y + Math.sin(stumpAngle) * bodyRadius * 1.1;
    drawGlow(ctx, { x: sx, y: sy, radius: 24 * s, color: PALETTE.arterial, alpha: 0.45 });
    ctx.strokeStyle = rgba(PALETTE.rose, 0.8);
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(stumpAngle) * 12 * s, sy + Math.sin(stumpAngle) * 12 * s);
    ctx.stroke();
  }

  // Cell body
  ctx.save();
  const gradient = ctx.createRadialGradient(
    x - bodyRadius * 0.3,
    y - bodyRadius * 0.35,
    bodyRadius * 0.1,
    x,
    y,
    bodyRadius,
  );
  gradient.addColorStop(0, rgba(glow, 0.46));
  gradient.addColorStop(0.48, rgba(tint, 0.34));
  gradient.addColorStop(0.82, rgba(PALETTE.arterial, 0.42));
  gradient.addColorStop(1, rgba(PALETTE.blood, 0.78));
  ctx.fillStyle = gradient;
  blobPath(ctx, x, y, bodyRadius, time, 3.4, 8, 0.14, 0.9);
  ctx.fill();
  ctx.strokeStyle = rgba(glow, 0.56);
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // A pseudopod lobe, so the silhouette is never a perfect star.
  ctx.fillStyle = rgba(tint, 0.16);
  blobPath(
    ctx,
    x + bodyRadius * 0.46,
    y - bodyRadius * 0.28,
    bodyRadius * 0.42,
    time + 1.2,
    7.3,
    7,
    0.18,
    0.85,
  );
  ctx.fill();
  ctx.strokeStyle = rgba(glow, 0.2);
  ctx.lineWidth = 0.9 * s;
  ctx.stroke();

  // Inner membrane
  ctx.strokeStyle = rgba(tint, 0.2);
  ctx.lineWidth = 0.8 * s;
  blobPath(ctx, x, y, bodyRadius * 0.78, time + 2, 8.2, 7, 0.12, 0.9);
  ctx.stroke();

  // Cytoskeleton filaments.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.3;
    ctx.strokeStyle = rgba(glow, 0.045);
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * bodyRadius * 0.2, y + Math.sin(a) * bodyRadius * 0.2);
    ctx.lineTo(x + Math.cos(a) * bodyRadius * 0.88, y + Math.sin(a) * bodyRadius * 0.88);
    ctx.stroke();
  }

  // A slow shimmer along the membrane.
  ctx.save();
  ctx.setLineDash([10 * s, 17 * s]);
  ctx.lineDashOffset = -time * 9 * s;
  ctx.strokeStyle = rgba(PALETTE.gold, 0.22);
  ctx.lineWidth = 0.9 * s;
  blobPath(ctx, x, y, bodyRadius * 1.015, time, 3.4, 8, 0.14, 0.9);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // Organelles — everything the body has eaten, kept as small lanterns.
  const rng = seeded(`organelles-${Math.round(scale * 100)}`);
  const organelleCount = 13;
  for (let i = 0; i < organelleCount; i++) {
    const a = rng() * TAU;
    const r = Math.sqrt(rng()) * bodyRadius * 0.62;
    const ox = x + Math.cos(a) * r;
    const oy = y + Math.sin(a) * r * 0.9;
    const size = (1.6 + rng() * 3.2) * s;
    const color = i % 3 === 0 ? PALETTE.teal : i % 3 === 1 ? PALETTE.gold : PALETTE.amber;
    drawGlow(ctx, {
      x: ox,
      y: oy,
      radius: size * 5,
      color,
      alpha: 0.2 * bodyAlpha,
    });
    ctx.fillStyle = rgba(color, 0.45);
    ctx.beginPath();
    ctx.arc(ox, oy, size, 0, TAU);
    ctx.fill();
  }

  // Nucleus: a dark sun with a gold nucleolus, never a hole.
  const nucleusRadius = bodyRadius * 0.38;
  const nx = x + bodyRadius * 0.1;
  const ny = y + bodyRadius * 0.06;
  drawGlow(ctx, {
    x: nx,
    y: ny,
    radius: nucleusRadius * 2.8,
    color: PALETTE.blood,
    alpha: 0.3 * nucleusGlow,
  });
  const nucleusGradient = ctx.createRadialGradient(
    nx - nucleusRadius * 0.3,
    ny - nucleusRadius * 0.35,
    nucleusRadius * 0.05,
    nx,
    ny,
    nucleusRadius,
  );
  nucleusGradient.addColorStop(0, rgba(PALETTE.amber, 0.55));
  nucleusGradient.addColorStop(0.38, rgba(PALETTE.blood, 0.95));
  nucleusGradient.addColorStop(0.82, rgba('#180609', 0.96));
  nucleusGradient.addColorStop(1, rgba(PALETTE.blood, 0.7));
  ctx.fillStyle = nucleusGradient;
  blobPath(ctx, nx, ny, nucleusRadius, time * 0.7, 5.9, 6, 0.1, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(glow, 0.45);
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  drawGlow(ctx, { x: nx, y: ny, radius: nucleusRadius * 1.4, color: PALETTE.gold, alpha: 0.22 * nucleusGlow });
  ctx.fillStyle = rgba(PALETTE.gold, 0.85);
  ctx.beginPath();
  ctx.arc(nx - nucleusRadius * 0.12, ny - nucleusRadius * 0.1, nucleusRadius * 0.17, 0, TAU);
  ctx.fill();

  // Antigens: tiny illuminated letters on the surface.
  if (showAntigens) {
    const letters = ['A', 'T', 'G', 'C', '·', '·', 'S', 'N'];
    ctx.save();
    ctx.font = `${Math.max(6, 8 * s)}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < letters.length; i++) {
      const a = (i / letters.length) * TAU + Math.sin(time * 0.08 + i) * 0.08;
      const r = bodyRadius * (1.02 + Math.sin(time * 0.6 + i * 1.7) * 0.05);
      const lx = x + Math.cos(a) * r;
      const ly = y + Math.sin(a) * r * 0.9;
      ctx.fillStyle = rgba(PALETTE.gold, 0.48 + Math.sin(time * 0.9 + i) * 0.16);
      ctx.fillText(letters[i]!, lx, ly);
    }
    ctx.restore();
  }

  // Membrane blebs during apoptosis.
  if (fold > 0.05) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + time * 0.06;
      const r = bodyRadius * (1.08 + i * 0.035);
      const bx = x + Math.cos(a) * r;
      const by = y + Math.sin(a) * r * 0.95;
      ctx.fillStyle = rgba(tint, 0.12 * fold);
      ctx.beginPath();
      ctx.arc(bx, by, (3 + (i % 3) * 2) * s * fold, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawDendrite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  time: number,
  phase: number,
  tint: string,
  glow: string,
  alpha: number,
  depth: number,
): void {
  const segments = 5;
  const points: Array<[number, number]> = [[x, y]];
  let px = x;
  let py = y;
  let a = angle;
  for (let i = 0; i < segments; i++) {
    a += Math.sin(time * 0.38 + phase + i * 0.8) * 0.075;
    px += Math.cos(a) * (length / segments);
    py += Math.sin(a) * (length / segments);
    points.push([px, py]);
  }

  // Wide bloom
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(glow, 0.12 * alpha);
  ctx.lineWidth = width * 3.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  smoothOpenPath(ctx, points);
  ctx.stroke();
  ctx.restore();

  // Core
  ctx.strokeStyle = rgba(tint, 0.62 * alpha);
  ctx.lineWidth = width * 0.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  smoothOpenPath(ctx, points);
  ctx.stroke();

  // Bright tip
  const tip = points[points.length - 1]!;
  drawGlow(ctx, {
    x: tip[0],
    y: tip[1],
    radius: width * 5.5,
    color: glow,
    alpha: 0.2 * alpha,
  });
  ctx.fillStyle = rgba(glow, 0.65 * alpha);
  ctx.beginPath();
  ctx.arc(tip[0], tip[1], Math.max(0.8, width * 0.42), 0, TAU);
  ctx.fill();

  if (depth > 0) {
    const anchorA = points[Math.floor(points.length * 0.56)]!;
    const anchorB = points[Math.floor(points.length * 0.78)]!;
    const side = phase % 2 > 1 ? 1 : -1;
    drawDendrite(
      ctx,
      anchorA[0],
      anchorA[1],
      angle + side * 0.78,
      length * 0.46,
      width * 0.52,
      time,
      phase + 1.7,
      tint,
      glow,
      alpha * 0.82,
      depth - 1,
    );
    drawDendrite(
      ctx,
      anchorB[0],
      anchorB[1],
      angle - side * 0.64,
      length * 0.3,
      width * 0.38,
      time,
      phase + 3.4,
      tint,
      glow,
      alpha * 0.66,
      Math.max(0, depth - 1),
    );
  }
}

export type BacteriumKind = 'rod' | 'coccus' | 'spiral';

export interface BacteriumOptions {
  x: number;
  y: number;
  angle?: number;
  size: number;
  time: number;
  color?: string;
  glow?: string;
  alpha?: number;
  kind?: BacteriumKind;
  granule?: boolean;
  flagella?: number;
  wobble?: number;
}

export function drawBacterium(
  ctx: CanvasRenderingContext2D,
  options: BacteriumOptions,
): void {
  const {
    x,
    y,
    angle = 0,
    size,
    time,
    color = PALETTE.violet,
    glow = PALETTE.teal,
    alpha = 1,
    kind = 'rod',
    granule = false,
    flagella = 2,
    wobble = 1,
  } = options;

  const sway = Math.sin(time * 0.8 + x * 0.01 + y * 0.013) * 0.12 * wobble;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle + sway);

  drawGlow(ctx, {
    x: 0,
    y: 0,
    radius: size * 4.2,
    color: glow,
    alpha: 0.12 * alpha,
  });

  // Flagella trailing behind
  for (let f = 0; f < flagella; f++) {
    const offset = (f - (flagella - 1) / 2) * size * 0.45;
    const points: Array<[number, number]> = [];
    for (let i = 0; i <= 7; i++) {
      const px = -size * 1.1 - i * size * 0.55;
      const py = offset + Math.sin(time * 1.8 + i * 0.85 + f * 1.9) * size * 0.38;
      points.push([px, py]);
    }
    ctx.strokeStyle = rgba(glow, 0.22 * alpha);
    ctx.lineWidth = Math.max(0.5, size * 0.09);
    ctx.lineCap = 'round';
    smoothOpenPath(ctx, points);
    ctx.stroke();
  }

  if (kind === 'coccus') {
    const r = size * 0.9;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, rgba(glow, 0.85));
    g.addColorStop(0.55, rgba(color, 0.72));
    g.addColorStop(1, rgba(PALETTE.blood, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(glow, 0.35);
    ctx.lineWidth = Math.max(0.6, size * 0.1);
    ctx.stroke();
  } else if (kind === 'spiral') {
    ctx.strokeStyle = rgba(color, 0.82);
    ctx.lineWidth = size * 0.32;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const px = -size * 1.8 + (i / 18) * size * 3.6;
      const py = Math.sin(i * 0.9 + time * 2.1) * size * 0.55;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(glow, 0.4);
    ctx.lineWidth = size * 0.08;
    ctx.stroke();
  } else {
    const length = size * 2.5;
    const width = size * 0.92;
    const g = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    g.addColorStop(0, rgba(PALETTE.blood, 0.5));
    g.addColorStop(0.35, rgba(color, 0.78));
    g.addColorStop(0.7, rgba(glow, 0.72));
    g.addColorStop(1, rgba(PALETTE.blood, 0.45));
    ctx.fillStyle = g;
    roundedCapsule(ctx, length, width);
    ctx.fill();
    ctx.strokeStyle = rgba(glow, 0.38);
    ctx.lineWidth = Math.max(0.6, size * 0.09);
    ctx.stroke();

    // Pili
    ctx.strokeStyle = rgba(glow, 0.2);
    ctx.lineWidth = Math.max(0.4, size * 0.05);
    for (let i = 0; i < 5; i++) {
      const px = -length * 0.34 + i * length * 0.17;
      const side = i % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(px, side * width * 0.42);
      ctx.lineTo(px + size * 0.15, side * (width * 0.42 + size * 0.35));
      ctx.stroke();
    }
  }

  if (granule) {
    drawGlow(ctx, { x: 0, y: 0, radius: size * 2.6, color: PALETTE.gold, alpha: 0.5 * alpha });
    ctx.fillStyle = rgba(PALETTE.gold, 0.9);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.34, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

function roundedCapsule(ctx: CanvasRenderingContext2D, length: number, width: number): void {
  const r = width / 2;
  ctx.beginPath();
  ctx.moveTo(-length / 2 + r, -r);
  ctx.lineTo(length / 2 - r, -r);
  ctx.arc(length / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-length / 2 + r, r);
  ctx.arc(-length / 2 + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.closePath();
}

export interface RedCellOptions {
  x: number;
  y: number;
  size: number;
  angle?: number;
  alpha?: number;
  time?: number;
  oxygen?: number;
}

export function drawRedCell(ctx: CanvasRenderingContext2D, options: RedCellOptions): void {
  const { x, y, size, angle = 0, alpha = 1, time = 0, oxygen = 1 } = options;
  const r = size;
  const tint = oxygen > 0.5 ? '#d64b52' : '#8c4a52';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle + Math.sin(time * 0.3 + x * 0.02) * 0.05);
  ctx.scale(1, 0.58);

  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, rgba(PALETTE.rose, 0.9));
  g.addColorStop(0.55, tint);
  g.addColorStop(1, rgba(PALETTE.blood, 0.85));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  // The biconcave dimple
  ctx.fillStyle = rgba(PALETTE.blood, 0.55);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.44, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(PALETTE.rose, 0.26);
  ctx.lineWidth = Math.max(0.6, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function drawTCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  color = PALETTE.amber,
  alpha = 1,
): void {
  drawGlow(ctx, { x, y, radius: size * 4, color, alpha: 0.2 * alpha });
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, size * 0.1, x, y, size);
  g.addColorStop(0, rgba(PALETTE.bone, 0.7));
  g.addColorStop(0.55, rgba(color, 0.45));
  g.addColorStop(1, rgba(PALETTE.blood, 0.55));
  ctx.fillStyle = g;
  blobPath(ctx, x, y, size, time * 0.5, x * 0.01 + y * 0.02, 7, 0.12);
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.42);
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + time * 0.1;
    ctx.strokeStyle = rgba(color, 0.22);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * size * 0.9, y + Math.sin(a) * size * 0.9);
    ctx.lineTo(x + Math.cos(a) * size * 1.3, y + Math.sin(a) * size * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawAntibody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  alpha = 1,
  color = PALETTE.gold,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = rgba(color, 0.65);
  ctx.lineWidth = Math.max(1, size * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(0, 0);
  ctx.lineTo(-size * 0.75, -size * 0.85);
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 0.75, -size * 0.85);
  ctx.stroke();
  for (const [dx, dy] of [
    [-size * 0.75, -size * 0.85],
    [size * 0.75, -size * 0.85],
    [0, size],
  ] as Array<[number, number]>) {
    drawGlow(ctx, { x: dx, y: dy, radius: size * 0.7, color, alpha: 0.24 * alpha });
    ctx.fillStyle = rgba(color, 0.55);
    ctx.beginPath();
    ctx.arc(dx, dy, size * 0.16, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPlatelet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = rgba(PALETTE.bone, 0.32);
  blobPath(ctx, x, y, size, time, x * 0.03 + y * 0.02, 6, 0.25);
  ctx.fill();
  ctx.strokeStyle = rgba(PALETTE.gold, 0.22);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

export function drawFragment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
  alpha = 1,
): void {
  drawGlow(ctx, { x, y, radius: size * 6, color, alpha: 0.18 * alpha });
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = rgba(color, 0.75 * alpha);
  ctx.fillRect(-size * 0.5, -size * 0.22, size, size * 0.44);
  ctx.restore();
}

/** A pulse ring, used for heartbeats and unanswered signals. */
export function drawPulseRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  color = PALETTE.amber,
  lineWidth = 1.5,
): void {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function drawMembrane(
  ctx: CanvasRenderingContext2D,
  y: number,
  time: number,
  width: number,
  color: string,
  alpha: number,
  amplitude = 10,
  phrase = 0.02,
): void {
  const points: Array<[number, number]> = [];
  for (let x = -40; x <= width + 40; x += 22) {
    const py =
      y +
      Math.sin(x * phrase + time * 0.7) * amplitude +
      Math.sin(x * phrase * 2.7 - time * 0.4) * amplitude * 0.35;
    points.push([x, py]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(color, alpha * 0.12);
  ctx.lineWidth = 9;
  smoothOpenPath(ctx, points);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 1.4;
  smoothOpenPath(ctx, points);
  ctx.stroke();
}

export function oxygenLevel(time: number): number {
  // 98% at the start, down to 0 by the last heartbeat.
  if (time < 160) return 0.98;
  if (time < 245) return lerp(0.94, 0.71, clamp((time - 160) / 85, 0, 1));
  if (time < 525) return lerp(0.71, 0.34, clamp((time - 245) / 280, 0, 1));
  if (time < 695) return lerp(0.34, 0.08, clamp((time - 525) / 170, 0, 1));
  return 0;
}

export function heartRate(time: number): number {
  if (time < 160) return lerp(64, 60, clamp(time / 160, 0, 1));
  if (time < 335) return lerp(60, 48, clamp((time - 160) / 175, 0, 1));
  if (time < 525) return lerp(48, 38, clamp((time - 335) / 190, 0, 1));
  if (time < 695) return lerp(38, 26, clamp((time - 525) / 170, 0, 1));
  return 24;
}
