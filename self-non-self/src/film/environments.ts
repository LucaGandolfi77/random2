import { PALETTE, type ActPalette } from './palette';
import {
  drawAntibody,
  drawBacterium,
  drawGlow,
  drawPlatelet,
  drawPulseRing,
  drawRedCell,
  drawTCell,
} from './cells';
import {
  TAU,
  blobPath,
  clamp,
  lerp,
  mod,
  noise1,
  rgba,
  seeded,
  smoothOpenPath,
} from './util';

const W = 720;
const H = 1280;

const glowCache = new Map<string, HTMLCanvasElement>();

function glowSprite(color: string): HTMLCanvasElement {
  const cached = glowCache.get(color);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, rgba(color, 0.95));
  g.addColorStop(0.22, rgba(color, 0.5));
  g.addColorStop(0.6, rgba(color, 0.12));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowCache.set(color, canvas);
  return canvas;
}

export function drawSpriteGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opacity: number,
  squash = 1,
): void {
  if (opacity <= 0.002 || radius <= 0.2) return;
  const sprite = glowSprite(color);
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = clamp(opacity, 0, 1);
  ctx.drawImage(sprite, x - radius, y - radius * squash, radius * 2, radius * 2 * squash);
  ctx.globalAlpha = previous;
}

export function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  palette: ActPalette,
  time: number,
  glowX = 360,
  glowY = 610,
): void {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, palette.sky);
  bg.addColorStop(0.42, palette.deep);
  bg.addColorStop(1, palette.sky);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const breathe = 1 + Math.sin(time * 0.35) * 0.04;
  const warm = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, 520 * breathe);
  warm.addColorStop(0, rgba(palette.tissue, 0.4));
  warm.addColorStop(0.45, rgba(palette.accent, 0.12));
  warm.addColorStop(1, rgba(palette.sky, 0));
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
}

export function drawBokeh(
  ctx: CanvasRenderingContext2D,
  time: number,
  options: {
    count: number;
    seed: string | number;
    color: string;
    opacity?: number;
    minRadius?: number;
    maxRadius?: number;
    speed?: number;
    vertical?: boolean;
    yFrom?: number;
    yTo?: number;
  },
): void {
  const {
    count,
    seed,
    color,
    opacity = 0.16,
    minRadius = 2,
    maxRadius = 16,
    speed = 8,
    vertical = true,
    yFrom = -40,
    yTo = H + 40,
  } = options;
  const rng = seeded(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const x0 = rng() * W;
    const y0 = yFrom + rng() * (yTo - yFrom);
    const radius = lerp(minRadius, maxRadius, rng() * rng());
    const phase = rng() * TAU;
    const localSpeed = speed * (0.3 + rng() * 0.9);
    const span = yTo - yFrom;
    const y = vertical
      ? yFrom + mod(y0 - yFrom + time * localSpeed, span)
      : y0 + Math.sin(time * 0.2 + phase) * 24;
    const x = vertical ? x0 + Math.sin(time * 0.17 + phase) * 18 : mod(x0 + time * localSpeed, W);
    drawSpriteGlow(ctx, x, y, radius, color, opacity * (0.5 + rng() * 0.5));
  }
  ctx.restore();
}

export function drawFibers(
  ctx: CanvasRenderingContext2D,
  time: number,
  options: {
    count: number;
    seed: string | number;
    color: string;
    opacity?: number;
    vertical?: boolean;
    amplitude?: number;
    width?: number;
  },
): void {
  const {
    count,
    seed,
    color,
    opacity = 0.12,
    vertical = true,
    amplitude = 30,
    width = 1.2,
  } = options;
  const rng = seeded(seed);
  ctx.save();
  ctx.strokeStyle = rgba(color, opacity);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const base = rng() * (vertical ? W : H);
    const offset = rng() * TAU;
    const points: Array<[number, number]> = [];
    const steps = 12;
    for (let j = 0; j <= steps; j++) {
      const u = j / steps;
      if (vertical) {
        const y = u * (H + 80) - 40;
        const x = base + Math.sin(u * 4.2 + time * 0.08 + offset) * amplitude + noise1(u * 4 + i, i) * 16;
        points.push([x, y]);
      } else {
        const x = u * (W + 80) - 40;
        const y = base + Math.sin(u * 4.2 + time * 0.08 + offset) * amplitude + noise1(u * 4 + i, i) * 16;
        points.push([x, y]);
      }
    }
    smoothOpenPath(ctx, points);
    ctx.stroke();
  }
  ctx.restore();
}

interface Branch {
  points: Array<[number, number]>;
  width: number;
  depth: number;
  phase: number;
}

let vascularCache: Branch[] | null = null;

function vascularBranches(): Branch[] {
  if (vascularCache) return vascularCache;
  const rng = seeded('vascular-city');
  const branches: Branch[] = [];
  const grow = (
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    depth: number,
    phase: number,
  ): void => {
    const points: Array<[number, number]> = [[x, y]];
    let px = x;
    let py = y;
    let a = angle;
    const segments = 6;
    for (let i = 0; i < segments; i++) {
      a += (rng() - 0.5) * 0.42;
      px += Math.cos(a) * (length / segments);
      py += Math.sin(a) * (length / segments);
      points.push([px, py]);
    }
    branches.push({ points, width, depth, phase });
    if (depth <= 0) return;
    const forks = depth > 3 ? 2 : 2 + (rng() > 0.55 ? 1 : 0);
    for (let i = 0; i < forks; i++) {
      const forkAngle = a + (rng() - 0.5) * 1.25;
      grow(
        px,
        py,
        forkAngle,
        length * (0.56 + rng() * 0.18),
        width * 0.62,
        depth - 1,
        rng() * TAU,
      );
    }
  };

  const heartX = 360;
  const heartY = 670;
  const roots = 8;
  for (let i = 0; i < roots; i++) {
    const angle = (i / roots) * TAU + (rng() - 0.5) * 0.5;
    grow(heartX, heartY, angle, 120 + rng() * 60, 10, 5, rng() * TAU);
  }
  vascularCache = branches;
  return branches;
}

function pointAlong(points: Array<[number, number]>, u: number): [number, number] {
  const total = points.length - 1;
  const scaled = clamp(u, 0, 0.999) * total;
  const index = Math.floor(scaled);
  const t = scaled - index;
  const a = points[index]!;
  const b = points[Math.min(points.length - 1, index + 1)]!;
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

export interface VascularOptions {
  time: number;
  palette: ActPalette;
  opacity?: number;
  darkness?: number;
  heartbeat?: number;
  broken?: boolean;
}

export function drawVascularCity(
  ctx: CanvasRenderingContext2D,
  options: VascularOptions,
): void {
  const { time, palette, opacity = 1, darkness = 0, heartbeat = 1, broken = false } = options;
  const branches = vascularBranches();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const branch of branches) {
    const fade = clamp(1 - darkness * (branch.depth < 3 ? 1.1 : 0.55), 0, 1);
    if (fade <= 0.01) continue;
    ctx.strokeStyle = rgba(palette.accent, (0.05 + branch.depth * 0.012) * opacity * fade);
    ctx.lineWidth = branch.width * 2.4;
    smoothOpenPath(ctx, branch.points);
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, (0.16 + branch.depth * 0.02) * opacity * fade);
    ctx.lineWidth = Math.max(0.6, branch.width * 0.34);
    smoothOpenPath(ctx, branch.points);
    ctx.stroke();
  }

  // Pulses travelling away from the heart.
  const pulse = (0.7 + Math.sin(time * 1.15) * 0.3) * heartbeat;
  for (let i = 0; i < branches.length; i += 2) {
    const branch = branches[i]!;
    if (branch.depth < 2) continue;
    const phase = (time * (0.035 + branch.depth * 0.008) + branch.phase / TAU) % 1;
    const [px, py] = pointAlong(branch.points, phase);
    const lightAlpha = 0.42 * opacity * pulse * clamp(1 - darkness * 0.8, 0, 1);
    drawSpriteGlow(ctx, px, py, 6 + branch.depth * 1.4, palette.glow, lightAlpha);
  }

  // The heart / central lamp.
  const heartGlow = (0.18 + Math.max(0, Math.sin(time * 1.15)) * 0.22) * heartbeat;
  drawGlow(ctx, {
    x: 360,
    y: 670,
    radius: 170 * (0.95 + Math.sin(time * 1.15) * 0.05),
    color: palette.accent,
    alpha: heartGlow * opacity * (1 - darkness * 0.7),
  });
  drawSpriteGlow(ctx, 360, 670, 26, palette.glow, 0.9 * opacity * heartbeat);

  if (broken) {
    // A dead branch, snapped and dark.
    const branch = branches.find((b) => b.depth === 5 && b.points.length > 4);
    if (branch) {
      const cut = branch.points[3]!;
      drawSpriteGlow(ctx, cut[0], cut[1], 34, PALETTE.blood, 0.6);
      ctx.strokeStyle = rgba(PALETTE.rose, 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cut[0] - 8, cut[1] - 8);
      ctx.lineTo(cut[0] + 12, cut[1] + 10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The body at the very beginning: a country of light seen from far away. */
export function drawHeartland(
  ctx: CanvasRenderingContext2D,
  time: number,
  palette: ActPalette,
): void {
  paintBackdrop(ctx, palette, time, 360, 700);
  drawVascularCity(ctx, { time, palette, opacity: 1, heartbeat: 0.8 + Math.sin(time * 1.15) * 0.2 });
  drawBokeh(ctx, time, {
    count: 34,
    seed: 'heartland-bokeh',
    color: palette.glow,
    opacity: 0.14,
    minRadius: 1,
    maxRadius: 5,
    speed: 2,
  });
}

export interface CapillaryOptions {
  time: number;
  palette: ActPalette;
  flow?: number;
  oxygen?: number;
  blocked?: number;
  cells?: number;
}

export function drawCapillary(
  ctx: CanvasRenderingContext2D,
  options: CapillaryOptions,
): void {
  const { time, palette, flow = 1, oxygen = 1, blocked = 0, cells = 8 } = options;
  paintBackdrop(ctx, palette, time, 360, 620);

  // Vessel walls: two organic bands that frame the lumen.
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let i = 0; i <= 12; i++) {
    const y = -30 + (i / 12) * (H + 60);
    const wobble = Math.sin(y * 0.007 + time * 0.16) * 20 + Math.sin(y * 0.021 - time * 0.1) * 8;
    left.push([78 + wobble, y]);
    right.push([642 + Math.sin(y * 0.006 - time * 0.13) * 22, y]);
  }

  const wallGradient = ctx.createLinearGradient(0, 0, W, 0);
  wallGradient.addColorStop(0, rgba(palette.deep, 0.9));
  wallGradient.addColorStop(0.22, rgba(palette.tissue, 0.72));
  wallGradient.addColorStop(0.5, rgba(palette.tissue, 0.12));
  wallGradient.addColorStop(0.78, rgba(palette.tissue, 0.72));
  wallGradient.addColorStop(1, rgba(palette.deep, 0.9));
  ctx.fillStyle = wallGradient;
  ctx.fillRect(0, 0, W, H);

  // Tissue masses and endothelial nuclei along both walls.
  const wrng = seeded('capillary-wall-tissue');
  for (let i = 0; i < 12; i++) {
    const onLeft = i < 6;
    const x = onLeft ? -30 + wrng() * 120 : 630 + wrng() * 120;
    const y = wrng() * H;
    const r = 48 + wrng() * 110;
    ctx.fillStyle = rgba(palette.tissue, 0.1 + wrng() * 0.08);
    blobPath(ctx, x, y, r, time * 0.1, i * 1.7, 7, 0.2, 0.85);
    ctx.fill();
    ctx.fillStyle = rgba(palette.accent, 0.16);
    ctx.beginPath();
    ctx.ellipse(onLeft ? 70 + wrng() * 30 : 620 + wrng() * 30, y, 14 + wrng() * 12, 6 + wrng() * 5, 0.2, 0, TAU);
    ctx.fill();
  }

  // Lumen: a broad plasma current with a soft core.
  const core = ctx.createLinearGradient(0, 0, 0, H);
  core.addColorStop(0, rgba(palette.glow, 0.025));
  core.addColorStop(0.35, rgba(palette.glow, 0.075 * flow));
  core.addColorStop(0.62, rgba(palette.accent, 0.045 * flow));
  core.addColorStop(1, rgba(palette.glow, 0.02));
  ctx.fillStyle = core;
  ctx.fillRect(150, 0, 420, H);

  // Glycocalyx: the fuzzy inner coat of the vessel.
  const groom = seeded('capillary-glycocalyx');
  ctx.save();
  ctx.strokeStyle = rgba(palette.glow, 0.11);
  ctx.lineWidth = 1;
  for (let i = 0; i < 46; i++) {
    const onLeft = i % 2 === 0;
    const y = groom() * H;
    const x = onLeft ? 84 + groom() * 18 : 624 + groom() * 18;
    const len = 6 + groom() * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (onLeft ? len : -len), y + (groom() - 0.5) * 8);
    ctx.stroke();
  }
  ctx.restore();

  // Lumen glow
  const lumen = ctx.createLinearGradient(0, 0, 0, H);
  lumen.addColorStop(0, rgba(palette.accent, 0.12));
  lumen.addColorStop(0.5, rgba(palette.glow, 0.08 * flow));
  lumen.addColorStop(1, rgba(palette.accent, 0.1));
  ctx.fillStyle = lumen;
  ctx.fillRect(70, 0, 580, H);

  // Wall membranes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const points of [left, right]) {
    ctx.strokeStyle = rgba(palette.glow, 0.1);
    ctx.lineWidth = 14;
    smoothOpenPath(ctx, points);
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, 0.28);
    ctx.lineWidth = 1.6;
    smoothOpenPath(ctx, points);
    ctx.stroke();
  }
  ctx.restore();

  drawFibers(ctx, time, {
    count: 16,
    seed: 'capillary-fibers',
    color: palette.glow,
    opacity: 0.05,
    vertical: false,
    amplitude: 12,
  });

  // Flow lines
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const phase = i * 0.77;
    const points: Array<[number, number]> = [];
    for (let j = 0; j <= 14; j++) {
      const y = -40 + (j / 14) * (H + 80);
      const x =
        150 +
        (i / 8) * 420 +
        Math.sin(y * 0.008 + time * 0.4 * flow + phase) * (20 + i * 2);
      points.push([x, y]);
    }
    ctx.strokeStyle = rgba(palette.glow, 0.05 + (i % 3) * 0.015);
    ctx.lineWidth = 1;
    smoothOpenPath(ctx, points);
    ctx.stroke();
  }
  ctx.restore();

  // Caustic ribbons in the plasma.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const points: Array<[number, number]> = [];
    for (let j = 0; j <= 10; j++) {
      const y = -40 + (j / 10) * (H + 80);
      const x = 200 + i * 52 + Math.sin(y * 0.012 + time * 0.33 + i * 1.9) * 28;
      points.push([x, y]);
    }
    ctx.strokeStyle = rgba(palette.glow, 0.035 + (i % 3) * 0.012);
    ctx.lineWidth = 5 + (i % 3) * 3;
    smoothOpenPath(ctx, points);
    ctx.stroke();
  }
  ctx.restore();

  // A few near-lens red cells, soft and out of focus.
  const big = seeded('capillary-big-cells');
  for (let i = 0; i < 4; i++) {
    drawRedCell(ctx, {
      x: i % 2 === 0 ? 40 + big() * 70 : 610 + big() * 80,
      y: big() * H,
      size: 28 + big() * 24,
      angle: big() * TAU,
      alpha: 0.07 + big() * 0.06,
      time,
      oxygen: 0.7,
    });
  }

  // Red cells drifting with the current.
  const rng = seeded('capillary-cells');
  for (let i = 0; i < cells; i++) {
    const lane = 130 + rng() * 460;
    const speed = 18 + rng() * 22;
    const y = mod(rng() * H + time * speed * flow, H + 120) - 60;
    const x = lane + Math.sin(y * 0.01 + time * 0.2 + i) * 18;
    const size = 15 + rng() * 12;
    drawRedCell(ctx, {
      x,
      y,
      size,
      angle: Math.sin(time * 0.3 + i) * 0.4,
      alpha: 0.3 + rng() * 0.32,
      time,
      oxygen,
    });
  }

  // Platelets and antibodies in the current.
  const small = seeded('capillary-small');
  for (let i = 0; i < 8; i++) {
    const x = 130 + small() * 460;
    const y = mod(small() * H + time * (6 + small() * 8), H);
    if (i % 3 === 0) {
      drawAntibody(ctx, x, y, 6 + small() * 5, small() * TAU, 0.2, PALETTE.gold);
    } else {
      drawPlatelet(ctx, x, y, 3 + small() * 4, time + i, 0.4);
    }
  }

  // Bokeh depth
  drawBokeh(ctx, time, {
    count: 22,
    seed: 'capillary-bokeh',
    color: palette.glow,
    opacity: 0.08,
    minRadius: 2,
    maxRadius: 12,
    speed: 5,
  });

  if (blocked > 0) {
    // A clot: cells pile up and stop.
    const pileY = 760;
    drawGlow(ctx, {
      x: 360,
      y: pileY,
      radius: 160,
      color: PALETTE.blood,
      alpha: 0.35 * blocked,
    });
    for (let i = 0; i < 14; i++) {
      const a = rng() * TAU;
      const r = Math.sqrt(rng()) * 105;
      drawRedCell(ctx, {
        x: 360 + Math.cos(a) * r,
        y: pileY + Math.sin(a) * r * 0.45,
        size: 10 + rng() * 8,
        angle: a,
        alpha: (0.22 + rng() * 0.25) * blocked,
        time,
        oxygen: 0.2,
      });
    }
  }
}

export interface LymphOptions {
  time: number;
  palette: ActPalette;
  lit?: number;
  emptiness?: number;
  focus?: number;
}

export function drawLymphCathedral(
  ctx: CanvasRenderingContext2D,
  options: LymphOptions,
): void {
  const { time, palette, lit = 1, emptiness = 0, focus = 0.5 } = options;
  paintBackdrop(ctx, palette, time, 360, 540);

  // A dark vault above the node.
  const vault = ctx.createLinearGradient(0, 0, 0, 420);
  vault.addColorStop(0, rgba(PALETTE.void, 0.82));
  vault.addColorStop(0.55, rgba(PALETTE.void, 0.34));
  vault.addColorStop(1, rgba(PALETTE.void, 0));
  ctx.fillStyle = vault;
  ctx.fillRect(0, 0, W, 430);

  // Reticular fibers, front and back.
  drawFibers(ctx, time, {
    count: 42,
    seed: 'lymph-fibers',
    color: palette.glow,
    opacity: 0.11,
    amplitude: 44,
    width: 1,
  });

  // Cathedral arches: a dark shadow, a wide membrane, a bright edge.
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const x = -30 + i * 158;
    const top = 225 + Math.sin(i * 1.4) * 22;
    const span = 176;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x, H + 30);
      ctx.lineTo(x, top);
      ctx.quadraticCurveTo(x + span * 0.5, top - 138, x + span, top);
      ctx.lineTo(x + span, H + 30);
    };
    ctx.strokeStyle = rgba(PALETTE.void, 0.5);
    ctx.lineWidth = 26;
    path();
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, 0.095);
    ctx.lineWidth = 14;
    path();
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, 0.34);
    ctx.lineWidth = 1.6;
    path();
    ctx.stroke();
    // A pale inner highlight on the column
    ctx.strokeStyle = rgba(palette.glow, 0.1);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 6, H + 20);
    ctx.lineTo(x + 6, top + 18);
    ctx.stroke();
  }
  ctx.restore();

  // Lantern T cells suspended from the vault.
  const rng = seeded('lymph-lanterns');
  for (let i = 0; i < 18; i++) {
    const x = 70 + rng() * 580;
    const y = 220 + rng() * 360;
    const isLit = rng() < lit;
    const size = 6 + rng() * 9;
    const pulse = 0.68 + Math.sin(time * 0.8 + i * 1.7) * 0.32;
    if (isLit) {
      ctx.strokeStyle = rgba(PALETTE.bone, 0.1 * pulse);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, 80 + rng() * 60);
      ctx.lineTo(x, y - size);
      ctx.stroke();
      drawTCell(ctx, x, y, size, time + i, palette.glow, (0.5 + emptiness * -0.2) * pulse);
      drawSpriteGlow(ctx, x, y, size * 5.5, palette.glow, 0.14 * pulse);
    } else {
      ctx.strokeStyle = rgba(PALETTE.slate, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.stroke();
    }
  }

  // A few near-lens lanterns, soft and out of focus.
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? 30 + i * 12 : 660 + (i % 2) * 20;
    const y = 180 + i * 210;
    drawSpriteGlow(ctx, x, y, 34 + i * 8, palette.glow, 0.06 * lit);
  }

  // The messenger's node center
  drawGlow(ctx, {
    x: 360,
    y: 620,
    radius: 220,
    color: palette.accent,
    alpha: 0.13 * (0.4 + focus * 0.6),
  });

  // Empty chairs / dark silhouettes at the bottom.
  if (emptiness > 0.05) {
    for (let i = 0; i < 5; i++) {
      const x = 130 + i * 115 + Math.sin(i) * 14;
      ctx.fillStyle = rgba(PALETTE.void, 0.7 * emptiness);
      ctx.beginPath();
      ctx.ellipse(x, 1120, 34, 9, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(x - 20, 1120, 40, 70);
    }
  }

  drawBokeh(ctx, time, {
    count: 20,
    seed: 'lymph-bokeh',
    color: palette.glow,
    opacity: 0.06,
    minRadius: 2,
    maxRadius: 10,
    speed: 3,
  });
}

export function drawMarrow(
  ctx: CanvasRenderingContext2D,
  time: number,
  palette: ActPalette,
  emptiness = 0,
): void {
  paintBackdrop(ctx, palette, time, 360, 650);
  drawFibers(ctx, time, {
    count: 22,
    seed: 'marrow-fibers',
    color: palette.accent,
    opacity: 0.11,
    amplitude: 46,
  });

  // Cavern walls
  const rng = seeded('marrow-cavern');
  for (let i = 0; i < 9; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = 60 + rng() * 150;
    ctx.fillStyle = rgba(PALETTE.blood, 0.08);
    blobPath(ctx, x, y, r, time * 0.2, i * 1.9, 7, 0.22);
    ctx.fill();
  }

  // Empty sockets where stem cells used to be.
  for (let i = 0; i < 12; i++) {
    const x = 90 + rng() * 540;
    const y = 260 + rng() * 760;
    const r = 8 + rng() * 18;
    ctx.strokeStyle = rgba(PALETTE.slate, 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    if (rng() > emptiness) {
      drawSpriteGlow(ctx, x, y, r * 3.2, palette.glow, 0.25 * (1 - emptiness));
      ctx.fillStyle = rgba(palette.glow, 0.5);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.32, 0, TAU);
      ctx.fill();
    }
  }

  drawGlow(ctx, {
    x: 360,
    y: 700,
    radius: 250,
    color: palette.accent,
    alpha: 0.1 * (1 - emptiness * 0.7),
  });
}

export interface GutOptions {
  time: number;
  palette: ActPalette;
  breach?: number;
  bacteria?: number;
  oxygen?: number;
}

export function drawGut(
  ctx: CanvasRenderingContext2D,
  options: GutOptions,
): void {
  const { time, palette, breach = 0, bacteria = 20, oxygen = 0.6 } = options;
  void oxygen;
  paintBackdrop(ctx, palette, time, 360, 760);

  // Mucus aurora
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const g = ctx.createLinearGradient(0, 380 + i * 40, 0, 900);
    g.addColorStop(0, rgba(palette.other, 0));
    g.addColorStop(0.5, rgba(palette.other, 0.05 + i * 0.012));
    g.addColorStop(1, rgba(palette.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 420 + i * 40);
    for (let x = 0; x <= W; x += 30) {
      ctx.lineTo(x, 420 + i * 40 + Math.sin(x * 0.012 + time * 0.25 + i) * 26);
    }
    ctx.lineTo(W, 980);
    ctx.lineTo(0, 980);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // A darker row of villi behind the front row gives the wall depth.
  const backRng = seeded('gut-villi-back');
  for (let i = 0; i < 7; i++) {
    const x = -20 + i * 118 + backRng() * 30;
    const height = 300 + backRng() * 220;
    const top = 930 - height;
    const width = 74 + backRng() * 40;
    const sway = Math.sin(time * 0.2 + i) * 14;
    ctx.fillStyle = rgba(palette.tissue, 0.14);
    ctx.beginPath();
    ctx.moveTo(x - width / 2, 1030);
    ctx.quadraticCurveTo(x - width * 0.4 + sway, top + 110, x + sway, top);
    ctx.quadraticCurveTo(x + width * 0.4 + sway, top + 110, x + width / 2, 1030);
    ctx.closePath();
    ctx.fill();
  }

  // Villi: fleshy columns, not bars. Each has a bright edge, a dark side and
  // a lacteal running down its middle.
  const rng = seeded('gut-villi');
  const columns = 9;
  for (let i = 0; i < columns; i++) {
    const x = 34 + i * 84 + (rng() - 0.5) * 12;
    const height = 390 + rng() * 190;
    const top = 910 - height;
    const width = 54 + rng() * 30;
    const sway = Math.sin(time * 0.28 + i * 0.9) * 9;
    const half = width / 2;
    const g = ctx.createLinearGradient(x - half, 0, x + half, 0);
    g.addColorStop(0, rgba(PALETTE.blood, 0.55));
    g.addColorStop(0.32, rgba(palette.tissue, 0.82));
    g.addColorStop(0.58, rgba(palette.accent, 0.32));
    g.addColorStop(0.82, rgba(palette.tissue, 0.7));
    g.addColorStop(1, rgba(PALETTE.blood, 0.58));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - half, 1000);
    ctx.bezierCurveTo(x - half * 0.92 + sway, top + height * 0.58, x - half * 0.6 + sway, top + 96, x - half * 0.2 + sway, top + 26);
    ctx.quadraticCurveTo(x + sway, top - 18, x + half * 0.24 + sway, top + 26);
    ctx.bezierCurveTo(x + half * 0.64 + sway, top + 96, x + half * 0.94, top + height * 0.58, x + half, 1000);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(palette.glow, 0.18);
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // A highlight running down the lit edge.
    ctx.strokeStyle = rgba(palette.glow, 0.14);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + half * 0.3 + sway, top + 30);
    ctx.quadraticCurveTo(x + half * 0.46, top + height * 0.5, x + half * 0.6, 990);
    ctx.stroke();

    // Lacteal glow inside the villus, with two small branches.
    ctx.strokeStyle = rgba(palette.glow, 0.2);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + sway, top + 24);
    ctx.quadraticCurveTo(x + sway + 10, top + 150, x + sway * 0.4, 940);
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, 0.1);
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sway + side * 3, top + 120);
      ctx.quadraticCurveTo(x + sway + side * 24, top + 180, x + sway + side * 16, top + 260);
      ctx.stroke();
    }

    // Microvilli fuzz at the brush border.
    ctx.save();
    ctx.strokeStyle = rgba(palette.glow, 0.16);
    ctx.lineWidth = 0.8;
    for (let j = 0; j < 11; j++) {
      const fx = x - half * 0.24 + (j / 10) * half * 0.55 + sway;
      const fy = top + 12 - Math.sin((j / 10) * Math.PI) * 8;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + (rng() - 0.5) * 6, fy - 7 - rng() * 5);
      ctx.stroke();
    }
    ctx.restore();

    drawSpriteGlow(ctx, x + sway, top + 12, 22, palette.glow, 0.28);
  }

  // Barrier line over the villi
  const integrity = 1 - clamp(breach, 0, 1);
  ctx.save();
  if (integrity > 0.02) {
    const points: Array<[number, number]> = [];
    for (let x = -20; x <= W + 20; x += 20) {
      const gap = noise1(x * 0.02, 3) * (1 - integrity) * 26;
      points.push([x, 570 + Math.sin(x * 0.018 + time * 0.5) * 6 + gap]);
    }
    // A translucent band of epithelium, then the bright tight junction.
    const band: Array<[number, number]> = points.map(([x, y]) => [x, y - 13]);
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i]!;
      band.push([p[0], p[1] + 13]);
    }
    const bandGradient = ctx.createLinearGradient(0, 540, 0, 590);
    bandGradient.addColorStop(0, rgba(palette.glow, 0.02 * integrity));
    bandGradient.addColorStop(0.5, rgba(palette.glow, 0.09 * integrity));
    bandGradient.addColorStop(1, rgba(PALETTE.blood, 0.04 * integrity));
    ctx.fillStyle = bandGradient;
    ctx.beginPath();
    smoothOpenPath(ctx, band);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = rgba(palette.glow, 0.2 * integrity);
    ctx.lineWidth = 9;
    smoothOpenPath(ctx, points);
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, 0.5 * integrity);
    ctx.lineWidth = 1.6;
    smoothOpenPath(ctx, points);
    ctx.stroke();

    const nuclei = seeded('gut-barrier-nuclei');
    for (let i = 0; i < 12; i++) {
      const x = 24 + i * 62 + nuclei() * 12;
      const y = 570 + Math.sin(x * 0.018 + time * 0.5) * 6;
      ctx.fillStyle = rgba(PALETTE.blood, 0.35 * integrity);
      ctx.beginPath();
      ctx.ellipse(x, y, 5 + nuclei() * 3, 3 + nuclei() * 2, 0.2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // Broken barrier shards
  if (breach > 0.1) {
    for (let i = 0; i < 12; i++) {
      const x = rng() * W;
      const y = 520 + rng() * 130;
      ctx.strokeStyle = rgba(palette.glow, 0.25 * breach * (0.3 + rng()));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 40, y + (rng() - 0.5) * 50);
      ctx.stroke();
    }
  }

  // The residents drift up through the broken wall.
  const brng = seeded('gut-bacteria');
  for (let i = 0; i < bacteria; i++) {
    const x = 30 + brng() * (W - 60);
    const phase = brng() * TAU;
    const speed = 8 + brng() * 14;
    const y = 900 - mod(phase * 80 + time * speed, 520 + breach * 180);
    const kind = brng() > 0.82 ? 'coccus' : brng() > 0.7 ? 'spiral' : 'rod';
    drawBacterium(ctx, {
      x: x + Math.sin(time * 0.3 + phase) * 18,
      y,
      angle: Math.sin(time * 0.2 + phase) * 0.6,
      size: 4 + brng() * 7,
      time: time + phase,
      color: brng() > 0.5 ? palette.other : palette.accent,
      glow: palette.glow,
      alpha: 0.35 + brng() * 0.4,
      kind,
      granule: brng() > 0.88,
    });
  }

  // Near-lens residents, soft and out of focus.
  const near = seeded('gut-near-bacteria');
  for (let i = 0; i < 5; i++) {
    drawBacterium(ctx, {
      x: i % 2 === 0 ? 30 + near() * 90 : 600 + near() * 100,
      y: 300 + near() * 800,
      angle: near() * TAU,
      size: 14 + near() * 10,
      time: time + i,
      color: palette.other,
      glow: PALETTE.gold,
      alpha: 0.07 + near() * 0.06,
      kind: i % 3 === 0 ? 'spiral' : 'rod',
      granule: i === 2,
    });
  }

  drawBokeh(ctx, time, {
    count: 26,
    seed: 'gut-bokeh',
    color: palette.glow,
    opacity: 0.07,
    minRadius: 1,
    maxRadius: 9,
    speed: 4,
  });

  // The dark at the top of the breach.
  const dark = ctx.createLinearGradient(0, 0, 0, 560);
  dark.addColorStop(0, rgba(PALETTE.void, 0.55 + breach * 0.25));
  dark.addColorStop(1, rgba(PALETTE.void, 0));
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, W, 560);
}

export interface BarrierOptions {
  time: number;
  palette: ActPalette;
  integrity: number;
  crossers?: number;
}

export function drawBarrier(
  ctx: CanvasRenderingContext2D,
  options: BarrierOptions,
): void {
  const { time, palette, integrity, crossers = 16 } = options;
  paintBackdrop(ctx, palette, time, 360, 620);
  drawFibers(ctx, time, {
    count: 22,
    seed: 'barrier-fibers',
    color: palette.accent,
    opacity: 0.09,
    amplitude: 24,
  });

  // A dark lumen above, a warm serosa below.
  const lumen = ctx.createLinearGradient(0, 0, 0, 560);
  lumen.addColorStop(0, rgba(PALETTE.void, 0.72));
  lumen.addColorStop(0.7, rgba(palette.deep, 0.2));
  lumen.addColorStop(1, rgba(palette.deep, 0));
  ctx.fillStyle = lumen;
  ctx.fillRect(0, 0, W, 560);
  const serosa = ctx.createLinearGradient(0, 780, 0, H);
  serosa.addColorStop(0, rgba(palette.deep, 0));
  serosa.addColorStop(1, rgba(PALETTE.void, 0.8));
  ctx.fillStyle = serosa;
  ctx.fillRect(0, 780, W, H - 780);

  // Columnar epithelial cells. Each one is a living brick with a nucleus,
  // a bright apical cap, and a dark tight junction on either side.
  const rng = seeded('barrier-cells');
  const count = 8;
  const cellW = W / count;
  for (let i = 0; i < count; i++) {
    const x = i * cellW - 4;
    const w = cellW + 8;
    const top = 516 + Math.sin(i * 1.7 + time * 0.2) * 7;
    const bottom = 830 + Math.sin(i * 1.3) * 26;
    const nucleusX = x + w * (0.42 + rng() * 0.16);
    const nucleusY = top + 150 + rng() * 100;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, rgba(PALETTE.blood, 0.62));
    g.addColorStop(0.28, rgba(palette.tissue, 0.86));
    g.addColorStop(0.58, rgba(palette.accent, 0.32));
    g.addColorStop(0.82, rgba(palette.tissue, 0.72));
    g.addColorStop(1, rgba(PALETTE.blood, 0.6));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + 6, top + 12);
    ctx.quadraticCurveTo(x + w * 0.2, top - 8, x + w * 0.5, top - 2);
    ctx.quadraticCurveTo(x + w * 0.82, top + 5, x + w - 6, top + 16);
    ctx.bezierCurveTo(x + w - 2, top + 100, x + w - 8, bottom - 60, x + w - 12, bottom);
    ctx.quadraticCurveTo(x + w * 0.5, bottom + 22, x + 12, bottom);
    ctx.bezierCurveTo(x + 8, bottom - 70, x + 2, top + 100, x + 6, top + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(palette.glow, 0.1);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Apical cap: the tight, bright surface of the cell.
    ctx.strokeStyle = rgba(PALETTE.gold, 0.38 * integrity);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x + 8, top + 12);
    ctx.quadraticCurveTo(x + w * 0.5, top - 6, x + w - 8, top + 14);
    ctx.stroke();

    // Nucleus and a couple of organelles.
    drawGlow(ctx, { x: nucleusX, y: nucleusY, radius: 32, color: palette.accent, alpha: 0.08 });
    ctx.fillStyle = rgba(PALETTE.blood, 0.72);
    ctx.beginPath();
    ctx.ellipse(nucleusX, nucleusY, 13 + rng() * 5, 9 + rng() * 4, rng() * 0.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(palette.glow, 0.24);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = rgba(j === 0 ? PALETTE.teal : PALETTE.gold, 0.25);
      ctx.beginPath();
      ctx.arc(x + 20 + rng() * (w - 40), top + 260 + rng() * 200, 2 + rng() * 3, 0, TAU);
      ctx.fill();
    }

    // Tight junction: a thin dark seam with a bright edge.
    ctx.strokeStyle = rgba(PALETTE.void, 0.55);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w, top + 16);
    ctx.lineTo(x + w, bottom);
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, 0.16 * integrity);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w + 1.5, top + 20);
    ctx.lineTo(x + w + 1.5, bottom - 10);
    ctx.stroke();
  }

  // The apical membrane: a continuous bright line, broken when the barrier
  // fails. It is the wall the film keeps talking about.
  const points: Array<[number, number]> = [];
  for (let x = -20; x <= W + 20; x += 18) {
    const gap = (1 - integrity) * Math.max(0, noise1(x * 0.026, 8)) * 70;
    points.push([x, 516 + Math.sin(x * 0.019 + time * 0.45) * 8 + gap]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(palette.glow, 0.1 * integrity + 0.02);
  ctx.lineWidth = 14;
  smoothOpenPath(ctx, points);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba(palette.glow, 0.55 * integrity + 0.08);
  ctx.lineWidth = 1.8;
  smoothOpenPath(ctx, points);
  ctx.stroke();

  // Mucus above the wall.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const g = ctx.createLinearGradient(0, 300 + i * 50, 0, 560);
    g.addColorStop(0, rgba(palette.other, 0));
    g.addColorStop(0.6, rgba(palette.other, 0.06 + i * 0.015));
    g.addColorStop(1, rgba(palette.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 300 + i * 50, W, 260);
  }
  ctx.restore();

  // The residents crossing.
  const crng = seeded('barrier-crossers');
  for (let i = 0; i < crossers; i++) {
    const x = crng() * W;
    const speed = 14 + crng() * 22;
    const y = ((crng() * 520 + time * speed) % 620) + 560;
    const size = 3 + crng() * 5;
    drawBacterium(ctx, {
      x: x + Math.sin(time * 0.3 + i) * 20,
      y,
      angle: Math.sin(time * 0.4 + i) * 0.7,
      size,
      time: time + i,
      color: crng() > 0.5 ? palette.other : palette.accent,
      glow: palette.glow,
      alpha: 0.25 + crng() * 0.45,
      kind: crng() > 0.85 ? 'coccus' : crng() > 0.7 ? 'spiral' : 'rod',
      granule: crng() > 0.9,
    });
  }

  // Near-lens residents.
  for (let i = 0; i < 4; i++) {
    drawBacterium(ctx, {
      x: i % 2 === 0 ? 30 + crng() * 70 : 620 + crng() * 70,
      y: 250 + crng() * 700,
      angle: crng() * TAU,
      size: 13 + crng() * 8,
      time: time + i,
      color: palette.other,
      glow: PALETTE.gold,
      alpha: 0.08 + crng() * 0.05,
      kind: i % 2 === 0 ? 'rod' : 'spiral',
    });
  }
}

export interface LungOptions {
  time: number;
  palette: ActPalette;
  breath?: number;
  dust?: number;
  warm?: number;
}

export function drawLung(
  ctx: CanvasRenderingContext2D,
  options: LungOptions,
): void {
  const { time, palette, breath = 0.5, dust = 18, warm = 0 } = options;
  paintBackdrop(ctx, palette, time, 360, 620);

  const expansion = 1 + Math.sin(time * 0.45) * 0.035 + breath * 0.06;
  const rng = seeded('lung-alveoli');
  const centers: Array<[number, number, number]> = [];
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * TAU;
    const r = 110 + rng() * 120;
    centers.push([360 + Math.cos(a) * r, 640 + Math.sin(a) * r * 0.75, 70 + rng() * 55]);
  }
  centers.push([360, 640, 150]);

  ctx.save();
  for (const [x, y, r] of centers) {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * expansion);
    g.addColorStop(0, rgba(warm > 0.5 ? palette.glow : palette.accent, 0.08 + warm * 0.04));
    g.addColorStop(0.75, rgba(palette.tissue, 0.08));
    g.addColorStop(1, rgba(PALETTE.void, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * expansion, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = rgba(palette.glow, 0.3 + warm * 0.1);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, r * expansion, 0, TAU);
    ctx.stroke();

    // Capillary lace
    ctx.strokeStyle = rgba(palette.accent, 0.26);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r * expansion * 0.86, 0.4, 2.6);
    ctx.stroke();
  }
  ctx.restore();

  drawBokeh(ctx, time, {
    count: dust * 1.6,
    seed: 'lung-dust',
    color: warm > 0.5 ? palette.glow : PALETTE.bone,
    opacity: 0.1,
    minRadius: 1,
    maxRadius: 4,
    speed: 2,
  });

  if (warm > 0) {
    drawGlow(ctx, {
      x: 360,
      y: 640,
      radius: 340,
      color: palette.glow,
      alpha: 0.08 * warm,
    });
  }
}

export function drawScar(
  ctx: CanvasRenderingContext2D,
  time: number,
  palette: ActPalette,
  warmth = 1,
): void {
  paintBackdrop(ctx, palette, time, 360, 650);
  drawFibers(ctx, time, {
    count: 22,
    seed: 'scar-fibers',
    color: palette.glow,
    opacity: 0.08,
    amplitude: 22,
  });

  // A field of soft tissue, with deep folds that catch the light.
  const rng = seeded('scar-tissue');
  for (let i = 0; i < 16; i++) {
    const x = rng() * W;
    const y = 300 + rng() * 700;
    const r = 60 + rng() * 110;
    const fold = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    fold.addColorStop(0, rgba(palette.tissue, 0.16));
    fold.addColorStop(0.65, rgba(palette.tissue, 0.06));
    fold.addColorStop(1, rgba(PALETTE.void, 0));
    ctx.fillStyle = fold;
    blobPath(ctx, x, y, r, time * 0.1, i * 2.2, 7, 0.2);
    ctx.fill();
    ctx.strokeStyle = rgba(palette.glow, 0.045);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // The scar itself: a small gold fault line.
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    points.push([170 + u * 380, 690 + Math.sin(u * 7 + 1.3) * 26]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(palette.glow, 0.22 * warmth);
  ctx.lineWidth = 16;
  smoothOpenPath(ctx, points);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba(palette.glow, 0.8 * warmth);
  ctx.lineWidth = 2.6;
  smoothOpenPath(ctx, points);
  ctx.stroke();

  // Tiny healed punctures along the scar
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.5) / 7;
    const idx = Math.floor(u * 12);
    const p = points[idx]!;
    drawSpriteGlow(ctx, p[0], p[1], 10, palette.glow, 0.18 * warmth);
  }

  drawBokeh(ctx, time, {
    count: 26,
    seed: 'scar-bokeh',
    color: palette.glow,
    opacity: 0.1,
    minRadius: 1,
    maxRadius: 7,
    speed: -2,
  });
}

export interface SkinOptions {
  time: number;
  palette: ActPalette;
  hand?: number;
  snow?: number;
  light?: number;
}

export function drawSkin(
  ctx: CanvasRenderingContext2D,
  options: SkinOptions,
): void {
  const { time, palette, hand = 1, snow = 0.4, light = 1 } = options;
  paintBackdrop(ctx, palette, time, 360, 780);
  const ceiling = 430;

  // ---------------------------------------------------------- the dermis
  const tissue = ctx.createLinearGradient(0, ceiling, 0, H);
  tissue.addColorStop(0, rgba(palette.tissue, 0.45));
  tissue.addColorStop(0.3, rgba(palette.deep, 0.78));
  tissue.addColorStop(1, rgba(PALETTE.void, 0.95));
  ctx.fillStyle = tissue;
  ctx.fillRect(0, ceiling, W, H - ceiling);

  // Collagen ribbons: thick, translucent, running up toward the surface.
  const crng = seeded('skin-collagen');
  for (let i = 0; i < 15; i++) {
    const base = -20 + i * 52 + crng() * 24;
    const points: Array<[number, number]> = [];
    for (let j = 0; j <= 9; j++) {
      const y = H + 30 - (j / 9) * (H - ceiling + 60);
      const x = base + Math.sin(y * 0.006 + time * 0.08 + i * 0.9) * (14 + i * 1.6);
      points.push([x, y]);
    }
    ctx.strokeStyle = rgba(palette.tissue, 0.3);
    ctx.lineWidth = 16 + (i % 4) * 6;
    ctx.lineCap = 'round';
    smoothOpenPath(ctx, points);
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, 0.075);
    ctx.lineWidth = 1.8;
    smoothOpenPath(ctx, points);
    ctx.stroke();
  }

  // Fibroblasts and a few near-lens cells in the dermis.
  const frng = seeded('skin-fibroblasts');
  for (let i = 0; i < 10; i++) {
    const x = 50 + frng() * 620;
    const y = 520 + frng() * 680;
    drawSpriteGlow(ctx, x, y, 34, palette.accent, 0.09);
    drawPlatelet(ctx, x, y, 7 + frng() * 7, time + i, 0.5);
  }
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? 30 + i * 10 : 660 + (i % 2) * 15;
    const y = 560 + i * 170;
    drawSpriteGlow(ctx, x, y, 50, palette.glow, 0.045);
  }

  // A warm light from the body, down below.
  drawGlow(ctx, { x: 360, y: 1180, radius: 360, color: PALETTE.arterial, alpha: 0.075 });

  // ---------------------------------------------------------- the glass
  const glass = ctx.createLinearGradient(0, 0, 0, ceiling);
  glass.addColorStop(0, rgba('#dfe8ef', 0.24 * light));
  glass.addColorStop(0.45, rgba('#a8bbc4', 0.38 * light));
  glass.addColorStop(0.8, rgba('#d8d4c8', 0.42 * light));
  glass.addColorStop(1, rgba('#f2e8d4', 0.38 * light));
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, W, ceiling);

  // A cold window beyond the skin, in the upper-left.
  const windowX = 54;
  const windowY = 34;
  const windowW = 260;
  const windowH = 340;
  const outside = ctx.createLinearGradient(0, windowY, 0, windowY + windowH);
  outside.addColorStop(0, '#b8cbd3');
  outside.addColorStop(0.55, '#7e97a2');
  outside.addColorStop(1, '#3b5058');
  ctx.fillStyle = outside;
  ctx.fillRect(windowX, windowY, windowW, windowH);

  // Distant, nameless skyline.
  const skyRng = seeded('skin-skyline');
  ctx.fillStyle = 'rgba(31, 45, 51, 0.5)';
  for (let i = 0; i < 6; i++) {
    const w = 26 + skyRng() * 24;
    const h = 50 + skyRng() * 120;
    ctx.fillRect(windowX + 12 + i * 41, windowY + windowH - 60 - h, w, h);
  }

  // Snow, falling outside. It never reaches the body.
  const srng = seeded('skin-snow');
  for (let i = 0; i < 46 * snow; i++) {
    const x = windowX + 8 + srng() * (windowW - 16);
    const y = windowY + 8 + mod(srng() * windowH + time * (5 + srng() * 10), windowH - 16);
    drawSpriteGlow(ctx, x, y, 1.5 + srng() * 3.5, '#eef7fa', 0.22 * light);
  }

  // Window frame, dark against the cold.
  ctx.strokeStyle = 'rgba(13, 17, 19, 0.8)';
  ctx.lineWidth = 14;
  ctx.strokeRect(windowX, windowY, windowW, windowH);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(windowX + windowW / 2, windowY);
  ctx.lineTo(windowX + windowW / 2, windowY + windowH);
  ctx.moveTo(windowX, windowY + windowH / 2);
  ctx.lineTo(windowX + windowW, windowY + windowH / 2);
  ctx.stroke();

  // ---------------------------------------------------------- the hand
  if (hand > 0) {
    const handX = 420;
    const palmY = 172;
    ctx.save();
    ctx.globalAlpha = 0.68 * hand;

    // A soft shadow around the whole hand, as if it were pressed close.
    drawSpriteGlow(ctx, handX, palmY + 100, 230, '#151113', 0.34);

    // Wrist and forearm, entering from the top of the frame.
    const arm = ctx.createLinearGradient(handX - 70, 0, handX + 70, 0);
    arm.addColorStop(0, '#1d1819');
    arm.addColorStop(0.42, '#302828');
    arm.addColorStop(0.7, '#3a3030');
    arm.addColorStop(1, '#1b1618');
    ctx.fillStyle = arm;
    ctx.beginPath();
    ctx.roundRect(handX - 82, -70, 164, 250, 54);
    ctx.fill();

    // Palm.
    const palm = ctx.createRadialGradient(handX - 28, palmY - 18, 12, handX, palmY, 110);
    palm.addColorStop(0, '#3e3332');
    palm.addColorStop(0.62, '#2a2324');
    palm.addColorStop(1, '#171314');
    ctx.fillStyle = palm;
    ctx.beginPath();
    ctx.ellipse(handX, palmY, 124, 102, -0.08, 0, TAU);
    ctx.fill();

    // Four fingers and a thumb, as narrow capsules that overlap the palm.
    const fingers: Array<[number, number, number, number, number]> = [
      [-78, 226, 31, 176, -0.15],
      [-27, 244, 33, 196, -0.04],
      [26, 244, 32, 188, 0.04],
      [77, 226, 30, 170, 0.14],
      [116, 196, 39, 132, 0.72],
    ];
    for (const [dx, fy, w, h, rot] of fingers) {
      ctx.save();
      ctx.translate(handX + dx, fy);
      ctx.rotate(rot);
      const finger = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      finger.addColorStop(0, '#1b1617');
      finger.addColorStop(0.45, '#372d2c');
      finger.addColorStop(0.8, '#2c2425');
      finger.addColorStop(1, '#161213');
      ctx.fillStyle = finger;
      ctx.beginPath();
      ctx.roundRect(-w / 2, 0, w, h, w / 2);
      ctx.fill();
      // A little knuckle light.
      ctx.fillStyle = 'rgba(232, 180, 106, 0.06)';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.55, w * 0.32, 7, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(228, 238, 240, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // The rim of the window on the top edge of the hand.
    ctx.strokeStyle = 'rgba(224, 235, 238, 0.14)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(handX, palmY, 124, 102, -0.08, Math.PI * 0.95, Math.PI * 1.85);
    ctx.stroke();

    // The hand's warmth, seen through the skin.
    ctx.restore();
    drawGlow(ctx, {
      x: handX,
      y: palmY + 80,
      radius: 230,
      color: PALETTE.amber,
      alpha: 0.07 * hand,
    });
  }

  // Frost over the glass: the outside is close, but never sharp.
  const frost = ctx.createLinearGradient(0, 0, 0, ceiling);
  frost.addColorStop(0, 'rgba(228, 238, 240, 0.06)');
  frost.addColorStop(0.55, 'rgba(210, 222, 226, 0.12)');
  frost.addColorStop(1, 'rgba(242, 232, 212, 0.16)');
  ctx.fillStyle = frost;
  ctx.fillRect(0, 0, W, ceiling);
  const frostRng = seeded('skin-frost-over');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    drawSpriteGlow(ctx, frostRng() * W, frostRng() * ceiling, 6 + frostRng() * 26, '#eef7fa', 0.025 * light);
  }
  ctx.restore();

  // ---------------------------------------------------------- the surface
  // Keratinocyte nuclei along the epidermal line.
  const krng = seeded('skin-keratinocytes');
  for (let i = 0; i < 16; i++) {
    const x = 20 + i * 46 + krng() * 10;
    const y = ceiling + Math.sin(x * 0.02 + time * 0.2) * 7;
    ctx.fillStyle = rgba(PALETTE.bone, 0.08 * light);
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 4 + krng() * 3, 2 + krng() * 2, 0.2, 0, TAU);
    ctx.fill();
  }

  // The bright membrane itself: a tight, living border.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const epi: Array<[number, number]> = [];
  for (let x = -20; x <= W + 20; x += 18) {
    epi.push([x, ceiling + Math.sin(x * 0.02 + time * 0.2) * 7]);
  }
  ctx.strokeStyle = rgba(PALETTE.gold, 0.14 * light);
  ctx.lineWidth = 12;
  smoothOpenPath(ctx, epi);
  ctx.stroke();
  ctx.strokeStyle = rgba(PALETTE.bone, 0.5 * light);
  ctx.lineWidth = 1.6;
  smoothOpenPath(ctx, epi);
  ctx.stroke();
  ctx.restore();

  // Frosted glass texture.
  const rng = seeded('skin-frost');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const x = rng() * W;
    const y = rng() * ceiling;
    drawSpriteGlow(ctx, x, y, 8 + rng() * 38, '#e8f2f5', 0.035 * light);
  }
  ctx.restore();

  // Cold light from above, warm light from below.
  drawSpriteGlow(ctx, 360, 40, 240, '#e9f3f7', 0.16 * light);
  drawGlow(ctx, { x: 360, y: 1180, radius: 260, color: PALETTE.arterial, alpha: 0.05 });

  drawBokeh(ctx, time, {
    count: 20,
    seed: 'skin-bokeh',
    color: palette.glow,
    opacity: 0.06,
    minRadius: 1,
    maxRadius: 6,
    speed: 2,
  });
}

export interface AscentOptions {
  time: number;
  palette: ActPalette;
  progress?: number;
}

export function drawCollagenAscent(
  ctx: CanvasRenderingContext2D,
  options: AscentOptions,
): void {
  const { time, palette, progress = 0.5 } = options;
  paintBackdrop(ctx, palette, time, 360, 980);

  // Light from above grows as the cell climbs.
  drawSpriteGlow(ctx, 360, 80, 420, palette.glow, 0.18 + progress * 0.25);
  drawSpriteGlow(ctx, 360, 80, 160, '#ffffff', 0.08 + progress * 0.12);

  // Collagen cables, thick and vertical.
  const rng = seeded('ascent-collagen');
  for (let i = 0; i < 16; i++) {
    const base = 40 + i * 44 + rng() * 22;
    const points: Array<[number, number]> = [];
    for (let j = 0; j <= 9; j++) {
      const y = H + 40 - (j / 9) * (H + 80);
      const x = base + Math.sin(y * 0.008 + time * 0.12 + i) * (18 + i * 1.2);
      points.push([x, y]);
    }
    ctx.strokeStyle = rgba(palette.tissue, 0.5);
    ctx.lineWidth = 16 + (i % 3) * 7;
    ctx.lineCap = 'round';
    smoothOpenPath(ctx, points);
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.glow, 0.08);
    ctx.lineWidth = 2;
    smoothOpenPath(ctx, points);
    ctx.stroke();
  }

  // Fibroblasts
  for (let i = 0; i < 9; i++) {
    const x = 40 + rng() * 640;
    const y = 200 + rng() * 900;
    drawSpriteGlow(ctx, x, y, 40, palette.accent, 0.1);
    drawPlatelet(ctx, x, y, 8 + rng() * 8, time + i, 0.5);
  }

  // Rising particles
  drawBokeh(ctx, time, {
    count: 36,
    seed: 'ascent-bokeh',
    color: palette.glow,
    opacity: 0.12,
    minRadius: 1,
    maxRadius: 5,
    speed: -14,
    yFrom: 0,
    yTo: H,
  });
}

export interface GalaxyOptions {
  x: number;
  y: number;
  radius: number;
  time: number;
  reveal?: number;
  colorA?: string;
  colorB?: string;
  spin?: number;
}

export function drawGalaxy(
  ctx: CanvasRenderingContext2D,
  options: GalaxyOptions,
): void {
  const {
    x,
    y,
    radius,
    time,
    reveal = 1,
    colorA = PALETTE.gold,
    colorB = PALETTE.teal,
    spin = 0.06,
  } = options;
  const rng = seeded(`galaxy-${Math.round(radius)}`);
  const count = Math.round(110 * clamp(reveal, 0, 1));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const arm = i % 3;
    const baseAngle = (i / count) * TAU * 2.2 + arm * (TAU / 3);
    const rr = Math.sqrt(rng()) * radius;
    const a = baseAngle + rr * 0.012 + time * spin;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.82;
    const size = 1 + rng() * 3.6;
    const color = rng() > 0.55 ? colorA : colorB;
    drawSpriteGlow(ctx, px, py, size * 7, color, 0.18 * reveal);
    ctx.fillStyle = rgba(color, 0.6 * reveal);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  drawSpriteGlow(ctx, x, y, radius * 0.9, colorA, 0.08 * reveal);
}

export interface EmptyCityOptions {
  time: number;
  palette: ActPalette;
  darkness: number;
}

export function drawEmptyCity(
  ctx: CanvasRenderingContext2D,
  options: EmptyCityOptions,
): void {
  const { time, palette, darkness } = options;
  paintBackdrop(ctx, palette, time, 360, 690);
  drawFibers(ctx, time, {
    count: 34,
    seed: 'empty-capillaries',
    color: PALETTE.slate,
    opacity: 0.05,
    amplitude: 30,
  });
  drawVascularCity(ctx, {
    time,
    palette,
    opacity: 1 - darkness * 0.35,
    darkness: darkness * 0.72,
    heartbeat: Math.max(0.18, 1 - darkness * 0.55),
  });
  // The last lamp: the heart, still keeping time.
  const heartPulse = 0.4 + Math.max(0, Math.sin(time * 0.9)) * 0.6;
  drawGlow(ctx, {
    x: 360,
    y: 670,
    radius: 120 + heartPulse * 30,
    color: PALETTE.arterial,
    alpha: 0.06 + heartPulse * 0.05,
  });
  drawSpriteGlow(ctx, 360, 670, 16, palette.glow, 0.3 + heartPulse * 0.2);

  // Windows of the body going dark one by one.
  const rng = seeded('empty-lights');
  for (let i = 0; i < 48; i++) {
    const x = 40 + rng() * 640;
    const y = 180 + rng() * 960;
    const phase = rng();
    const on = phase > darkness;
    if (on) {
      drawSpriteGlow(ctx, x, y, 4 + rng() * 8, palette.glow, 0.2 * (0.5 + rng() * 0.5));
    } else {
      ctx.fillStyle = rgba(PALETTE.void, 0.55);
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + rng() * 2, 0, TAU);
      ctx.fill();
    }
  }

  drawBokeh(ctx, time, {
    count: 18,
    seed: 'empty-bokeh',
    color: PALETTE.slate,
    opacity: 0.06,
    minRadius: 1,
    maxRadius: 6,
    speed: 1,
  });
}

export function drawMemoryField(
  ctx: CanvasRenderingContext2D,
  time: number,
  palette: ActPalette,
): void {
  paintBackdrop(ctx, palette, time, 360, 620);
  const warm = ctx.createRadialGradient(360, 620, 20, 360, 620, 520);
  warm.addColorStop(0, rgba(PALETTE.gold, 0.1));
  warm.addColorStop(0.6, rgba(PALETTE.amber, 0.04));
  warm.addColorStop(1, rgba(PALETTE.void, 0));
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
  drawFibers(ctx, time, {
    count: 18,
    seed: 'memory-fibers',
    color: PALETTE.gold,
    opacity: 0.06,
    amplitude: 22,
  });
  drawBokeh(ctx, time, {
    count: 30,
    seed: 'memory-bokeh',
    color: PALETTE.gold,
    opacity: 0.12,
    minRadius: 1,
    maxRadius: 8,
    speed: -4,
  });
}

export function drawGarden(
  ctx: CanvasRenderingContext2D,
  time: number,
  palette: ActPalette,
): void {
  paintBackdrop(ctx, palette, time, 360, 680);
  drawBokeh(ctx, time, {
    count: 40,
    seed: 'garden-bokeh',
    color: palette.glow,
    opacity: 0.08,
    minRadius: 1,
    maxRadius: 9,
    speed: -3,
  });

  const rng = seeded('garden-bacteria');
  for (let i = 0; i < 46; i++) {
    const x = 20 + rng() * 680;
    const y = 200 + rng() * 980;
    const phase = rng() * TAU;
    const dividing = i % 7 === 0;
    const offset = dividing ? Math.sin(time * 0.9 + phase) * 12 : 0;
    drawBacterium(ctx, {
      x: x + offset,
      y: y + Math.cos(time * 0.4 + phase) * 8,
      angle: Math.sin(time * 0.2 + phase) * 1.2,
      size: 3 + rng() * 6,
      time: time + phase,
      color: rng() > 0.55 ? palette.accent : PALETTE.teal,
      glow: rng() > 0.7 ? PALETTE.gold : palette.glow,
      alpha: 0.25 + rng() * 0.45,
      kind: rng() > 0.9 ? 'coccus' : rng() > 0.82 ? 'spiral' : 'rod',
      granule: rng() > 0.8,
    });
  }

  // Green-gold spores
  drawBokeh(ctx, time, {
    count: 26,
    seed: 'garden-spores',
    color: PALETTE.verdigris,
    opacity: 0.14,
    minRadius: 1,
    maxRadius: 5,
    speed: -2,
  });
}

export function drawWindow(
  ctx: CanvasRenderingContext2D,
  time: number,
): void {
  // The only exterior shot in the film.
  const room = ctx.createLinearGradient(0, 0, 0, H);
  room.addColorStop(0, '#030405');
  room.addColorStop(0.55, '#0a0d10');
  room.addColorStop(1, '#020303');
  ctx.fillStyle = room;
  ctx.fillRect(0, 0, W, H);

  // Window: cold light, snow, a city that does not know.
  const glass = ctx.createLinearGradient(0, 80, 0, 720);
  glass.addColorStop(0, '#aebfc7');
  glass.addColorStop(0.55, '#6f858f');
  glass.addColorStop(1, '#2b3a40');
  ctx.fillStyle = glass;
  ctx.fillRect(90, 70, 540, 640);

  // Snow beyond the glass
  const rng = seeded('window-snow');
  for (let i = 0; i < 90; i++) {
    const x = 100 + rng() * 520;
    const y = mod(80 + rng() * 620 + time * (5 + rng() * 12), 620) + 70;
    drawSpriteGlow(ctx, x, y, 1.5 + rng() * 3.5, '#eef7fa', 0.2 + rng() * 0.25);
  }

  // A distant, nameless skyline
  ctx.fillStyle = 'rgba(25, 36, 41, 0.55)';
  for (let i = 0; i < 8; i++) {
    const x = 100 + i * 70;
    const h = 80 + rng() * 180;
    ctx.fillRect(x, 700 - h, 52, h);
  }

  // Window frame
  ctx.strokeStyle = 'rgba(4, 6, 7, 0.92)';
  ctx.lineWidth = 22;
  ctx.strokeRect(90, 70, 540, 640);
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(360, 70);
  ctx.lineTo(360, 710);
  ctx.moveTo(90, 390);
  ctx.lineTo(630, 390);
  ctx.stroke();

  // The room below, and the bed.
  ctx.fillStyle = 'rgba(9, 10, 11, 0.9)';
  ctx.fillRect(0, 710, W, H - 710);
  ctx.fillStyle = 'rgba(74, 82, 85, 0.18)';
  ctx.beginPath();
  ctx.ellipse(360, 1040, 250, 90, 0, 0, TAU);
  ctx.fill();

  // A hand on the sheet, out of focus.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(150, 140, 128, 0.4)';
  ctx.beginPath();
  ctx.ellipse(290, 1000, 60, 34, -0.25, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(245, 975, 46, 15, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  // The flatline, reflected in the glass.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(132, 210, 160, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const baseY = 640;
  for (let x = 140; x <= 580; x += 4) {
    let y = baseY;
    if (x > 250 && x < 270) y = baseY - Math.sin((x - 250) / 20 * Math.PI) * 34;
    if (x > 380 && x < 390) y = baseY + 8;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // Vignette
  const vignette = ctx.createRadialGradient(360, 560, 120, 360, 560, 680);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

export function drawTitleBackdrop(
  ctx: CanvasRenderingContext2D,
  time: number,
): void {
  ctx.fillStyle = '#050405';
  ctx.fillRect(0, 0, W, H);
  drawGlow(ctx, {
    x: 360,
    y: 640,
    radius: 300,
    color: PALETTE.blood,
    alpha: 0.1 + Math.sin(time * 0.9) * 0.02,
  });
  drawGlow(ctx, {
    x: 360,
    y: 640,
    radius: 100,
    color: PALETTE.amber,
    alpha: 0.08,
  });
  drawBokeh(ctx, time, {
    count: 24,
    seed: 'title-bokeh',
    color: PALETTE.amber,
    opacity: 0.08,
    minRadius: 1,
    maxRadius: 4,
    speed: 1,
  });
}

/** A tiny reusable particle field for the landing poster. */
export function drawLivingField(
  ctx: CanvasRenderingContext2D,
  time: number,
  palette: ActPalette,
): void {
  paintBackdrop(ctx, palette, time, 360, 640);
  drawBokeh(ctx, time, {
    count: 30,
    seed: 'living-field',
    color: palette.glow,
    opacity: 0.1,
    minRadius: 1,
    maxRadius: 7,
    speed: 2,
  });
  drawPulseRing(ctx, 360, 640, 80 + Math.sin(time * 0.7) * 8, 0.12, palette.glow, 1);
  drawPulseRing(ctx, 360, 640, 130 + Math.sin(time * 0.7 + 1) * 10, 0.07, palette.accent, 1);
}


/**
 * A shared foreground layer: huge out-of-focus cells and tissue at the edges,
 * so every shot has air in front of the lens as well as behind it.
 */
export function drawForegroundHaze(
  ctx: CanvasRenderingContext2D,
  time: number,
  palette: ActPalette,
): void {
  const rng = seeded('foreground-haze');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const blooms: Array<[number, number, number, string, number]> = [
    [-40, 240, 250, PALETTE.arterial, 0.05],
    [760, 520, 280, palette.glow, 0.04],
    [90, 1110, 230, palette.accent, 0.035],
    [660, 1210, 260, PALETTE.blood, 0.07],
    [360, -80, 300, palette.glow, 0.03],
  ];
  for (const [x, y, radius, color, opacity] of blooms) {
    drawSpriteGlow(ctx, x, y, radius * (1 + Math.sin(time * 0.13 + x) * 0.04), color, opacity);
  }
  // A handful of very soft, near-lens particles.
  for (let i = 0; i < 11; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const radius = 16 + rng() * 52;
    const phase = rng() * TAU;
    const driftX = Math.sin(time * 0.09 + phase) * 22;
    const driftY = Math.cos(time * 0.07 + phase) * 18;
    drawSpriteGlow(
      ctx,
      x + driftX,
      y + driftY,
      radius,
      i % 3 === 0 ? palette.glow : PALETTE.arterial,
      0.018 + rng() * 0.025,
    );
  }
  ctx.restore();
}
