import { TAU, clamp, hash, lerp, rgba } from './util';
import { glow } from './art';

export type Pose =
  | 'stand'
  | 'walk'
  | 'run'
  | 'carry'
  | 'lift'
  | 'reach'
  | 'point'
  | 'kneel'
  | 'sit'
  | 'raise'
  | 'embrace'
  | 'guard';

export type FigureKind = 'man' | 'woman' | 'child' | 'priest' | 'student' | 'soldier' | 'old';
export type HatKind = 'none' | 'top' | 'cap' | 'bonnet' | 'bicorne';
export type HairKind = 'short' | 'long' | 'bun' | 'bald';

export interface FigureOptions {
  x: number;
  y: number;
  h: number;
  t: number;
  phase?: number;
  pose?: Pose;
  facing?: 1 | -1;
  color?: string;
  rim?: string;
  alpha?: number;
  kind?: FigureKind;
  hat?: HatKind;
  coat?: boolean;
  skirt?: boolean;
  hair?: HairKind;
  shadow?: boolean;
  lean?: number;
}

function pathStroke(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  color: string,
  width: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

function legPath(
  ctx: CanvasRenderingContext2D,
  hip: [number, number],
  angle: number,
  bend: number,
  color: string,
  width: number,
  footColor: string,
): void {
  const knee: [number, number] = [hip[0] + Math.sin(angle) * 0.25, hip[1] + Math.cos(angle) * 0.25];
  const footAngle = angle - bend;
  const foot: [number, number] = [knee[0] + Math.sin(footAngle) * 0.225, knee[1] + Math.cos(footAngle) * 0.225];
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hip[0], hip[1]);
  ctx.quadraticCurveTo(knee[0], knee[1], foot[0], foot[1]);
  ctx.stroke();
  // shoe
  ctx.fillStyle = footColor;
  ctx.save();
  ctx.translate(foot[0] + 0.022, foot[1] - 0.012);
  ctx.rotate(footAngle * 0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.055, 0.022, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function armPath(
  ctx: CanvasRenderingContext2D,
  shoulder: [number, number],
  angle: number,
  bend: number,
  color: string,
  width: number,
): void {
  const elbow: [number, number] = [shoulder[0] + Math.sin(angle) * 0.17, shoulder[1] + Math.cos(angle) * 0.17];
  const handAngle = angle - bend;
  const hand: [number, number] = [elbow[0] + Math.sin(handAngle) * 0.165, elbow[1] + Math.cos(handAngle) * 0.165];
  pathStroke(ctx, [shoulder, elbow, hand], color, width);
}

export function drawFigure(ctx: CanvasRenderingContext2D, o: FigureOptions): void {
  const {
    x,
    y,
    h,
    t,
    pose = 'stand',
    facing = 1,
    kind = 'man',
    alpha = 1,
    shadow = true,
  } = o;
  const phase = o.phase ?? t * (pose === 'run' ? 9.6 : pose === 'walk' ? 5.6 : 1.4);
  const color = o.color ?? '#0b0907';
  const rim = o.rim;
  const isChild = kind === 'child';
  const isWoman = kind === 'woman' || kind === 'priest';
  const isOld = kind === 'old';
  const skirt = o.skirt ?? isWoman;
  const coat = o.coat ?? !skirt;
  const hair = o.hair ?? (isWoman ? 'long' : isChild ? 'short' : 'short');
  const hat = o.hat ?? (kind === 'soldier' ? 'bicorne' : kind === 'student' ? 'cap' : 'none');
  const stride = pose === 'run' ? 0.63 : pose === 'walk' ? 0.3 : pose === 'kneel' ? 0.12 : 0.055;
  const swing = Math.sin(phase) * stride;
  const bob = pose === 'walk' || pose === 'run' ? Math.abs(Math.sin(phase)) * 0.018 : 0;
  const lean = (o.lean ?? 0) + (pose === 'run' ? -0.12 : 0) + (isOld ? -0.08 : 0);
  const bodyY = pose === 'kneel' ? 0.15 : pose === 'sit' ? 0.18 : 0;
  const headR = isChild ? 0.075 : 0.058;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(facing * h, h);
  if (lean) ctx.rotate(lean);
  ctx.translate(0, -bob + bodyY);

  if (shadow) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 0.005, 0.16, 0.028, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const hipY = -0.46;
  const shoulderY = -0.77;
  const shoulderW = isChild ? 0.085 : 0.078;
  const hipW = isChild ? 0.06 : 0.055;
  const limbW = isChild ? 0.055 : 0.047;
  const armW = isChild ? 0.046 : 0.038;

  // Back leg and arm first.
  const legAngleBack = -swing * 0.75;
  const legAngleFront = swing;
  const backLegBend = 0.15 + Math.max(0, -swing) * 0.9;
  const frontLegBend = 0.12 + Math.max(0, swing) * 0.9;
  if (pose === 'kneel' || pose === 'sit') {
    // Seated/kneeling silhouettes read best as a folded hem, not as limbs
    // sticking out from under a heavy coat.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, -0.015, 0.17, 0.045, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-0.08, -0.012, 0.045, 0.016, -0.2, 0, TAU);
    ctx.ellipse(0.07, -0.01, 0.045, 0.016, 0.15, 0, TAU);
    ctx.fill();
  } else {
    legPath(ctx, [-hipW, hipY], legAngleBack, backLegBend, color, limbW, color);
    legPath(ctx, [hipW, hipY], legAngleFront, frontLegBend, color, limbW, color);
  }

  const armBase = shoulderY + 0.02;
  const walking = pose === 'walk' || pose === 'run';
  const downSwing = walking ? swing * 0.72 : 0;

  // Back arm. Only a few poses use both arms; the rest keep the far arm
  // relaxed so silhouettes read cleanly.
  let backAngle = 0.08 - downSwing;
  let backBend = 0.12;
  if (pose === 'lift') {
    backAngle = 2.18;
    backBend = -0.12;
  } else if (pose === 'carry') {
    backAngle = 1.42;
    backBend = -0.45;
  } else if (pose === 'embrace') {
    backAngle = 1.28;
    backBend = 0.12;
  }
  armPath(ctx, [-shoulderW * 0.8, armBase], backAngle, backBend, color, armW);

  // Coat tails / skirt.
  if (coat) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-shoulderW, shoulderY + 0.02);
    ctx.quadraticCurveTo(-0.115, -0.58, -0.085, -0.47);
    ctx.quadraticCurveTo(-0.14, -0.35, -0.16 - Math.abs(swing) * 0.03, -0.24);
    ctx.quadraticCurveTo(-0.06, -0.21, 0, -0.25);
    ctx.quadraticCurveTo(0.06, -0.21, 0.16, -0.24);
    ctx.quadraticCurveTo(0.145, -0.35, 0.085, -0.47);
    ctx.quadraticCurveTo(0.115, -0.58, shoulderW, shoulderY + 0.02);
    ctx.closePath();
    ctx.fill();
  }
  if (skirt) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-0.075, -0.54);
    ctx.quadraticCurveTo(-0.11, -0.38, -0.16 - Math.abs(swing) * 0.02, -0.11);
    ctx.quadraticCurveTo(-0.05, -0.08, 0.005, -0.105);
    ctx.quadraticCurveTo(0.07, -0.08, 0.155, -0.11);
    ctx.quadraticCurveTo(0.11, -0.38, 0.075, -0.54);
    ctx.closePath();
    ctx.fill();
    if (isWoman && !o.coat) {
      // a hint of an apron or a fold, still pure silhouette
      ctx.globalAlpha = alpha * 0.35;
      ctx.strokeStyle = rim ?? '#c6b48b';
      ctx.lineWidth = 0.003;
      ctx.beginPath();
      ctx.moveTo(-0.03, -0.48);
      ctx.quadraticCurveTo(-0.055, -0.3, -0.075, -0.13);
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }
  }

  // Torso.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-shoulderW, shoulderY);
  ctx.quadraticCurveTo(-shoulderW * 1.18, shoulderY + 0.13, -hipW * 1.15, hipY + 0.02);
  ctx.quadraticCurveTo(0, hipY + 0.07, hipW * 1.15, hipY + 0.02);
  ctx.quadraticCurveTo(shoulderW * 1.18, shoulderY + 0.13, shoulderW, shoulderY);
  ctx.quadraticCurveTo(0, shoulderY - 0.035, -shoulderW, shoulderY);
  ctx.fill();

  if (kind === 'soldier') {
    ctx.fillRect(-shoulderW * 1.2, shoulderY + 0.02, shoulderW * 2.4, 0.03);
  }
  if (kind === 'priest') {
    ctx.strokeStyle = rim ?? '#d9ad5b';
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = 0.004;
    ctx.beginPath();
    ctx.moveTo(0, shoulderY + 0.01);
    ctx.lineTo(0, hipY);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  // Neck + head.
  ctx.fillStyle = color;
  ctx.fillRect(-0.017, shoulderY - 0.045, 0.034, 0.06);
  ctx.beginPath();
  ctx.arc(0.008, shoulderY - 0.045 - headR * 0.82, headR, 0, TAU);
  ctx.fill();

  // Hair.
  if (hair !== 'bald') {
    ctx.fillStyle = color;
    if (hair === 'long') {
      ctx.beginPath();
      ctx.moveTo(-headR * 0.9, shoulderY - 0.04 - headR * 1.5);
      ctx.quadraticCurveTo(-headR * 2.0, shoulderY - 0.14, -headR * 1.35, shoulderY + 0.16);
      ctx.quadraticCurveTo(-headR * 0.4, shoulderY + 0.12, headR * 0.1, shoulderY + 0.02);
      ctx.quadraticCurveTo(headR * 1.1, shoulderY - 0.08, headR * 0.9, shoulderY - 0.06 - headR * 1.4);
      ctx.closePath();
      ctx.fill();
    } else if (hair === 'bun') {
      ctx.beginPath();
      ctx.arc(-headR * 1.05, shoulderY - 0.045 - headR * 0.9, headR * 0.55, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0.005, shoulderY - 0.045 - headR * 0.96, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
    }
  }

  // Hat.
  if (hat !== 'none') {
    ctx.fillStyle = color;
    if (hat === 'top') {
      ctx.fillRect(-headR * 0.95, shoulderY - 0.045 - headR * 2.65, headR * 1.9, headR * 1.25);
      ctx.fillRect(-headR * 1.35, shoulderY - 0.045 - headR * 1.5, headR * 2.7, headR * 0.26);
    } else if (hat === 'cap') {
      ctx.beginPath();
      ctx.ellipse(-headR * 0.05, shoulderY - 0.045 - headR * 1.65, headR * 1.12, headR * 0.42, -0.12, 0, TAU);
      ctx.fill();
      ctx.fillRect(-headR * 1.05, shoulderY - 0.045 - headR * 1.62, headR * 1.5, headR * 0.24);
    } else if (hat === 'bonnet') {
      ctx.beginPath();
      ctx.arc(0, shoulderY - 0.045 - headR * 0.95, headR * 1.28, Math.PI * 0.92, Math.PI * 2.06);
      ctx.fill();
    } else if (hat === 'bicorne') {
      ctx.beginPath();
      ctx.moveTo(-headR * 1.7, shoulderY - 0.045 - headR * 1.5);
      ctx.quadraticCurveTo(0, shoulderY - 0.045 - headR * 2.55, headR * 1.7, shoulderY - 0.045 - headR * 1.5);
      ctx.quadraticCurveTo(0, shoulderY - 0.045 - headR * 1.72, -headR * 1.7, shoulderY - 0.045 - headR * 1.5);
      ctx.fill();
    }
  }

  // Front arm. Angles are measured from the vertical: 0 is down, positive
  // swings forward, values near PI raise the hand overhead.
  let frontAngle = 0.08 + downSwing;
  let frontBend = 0.12;
  if (pose === 'reach') {
    frontAngle = 1.02;
    frontBend = 0.16;
  } else if (pose === 'raise') {
    frontAngle = 2.46;
    frontBend = -0.18;
  } else if (pose === 'carry') {
    frontAngle = 1.44;
    frontBend = -0.5;
  } else if (pose === 'lift') {
    frontAngle = 2.24;
    frontBend = -0.12;
  } else if (pose === 'embrace') {
    frontAngle = 1.3;
    frontBend = 0.1;
  } else if (pose === 'point') {
    frontAngle = 1.5;
    frontBend = 0.02;
  } else if (pose === 'guard') {
    frontAngle = 1.28;
    frontBend = 0.2;
  }
  armPath(ctx, [shoulderW * 0.85, armBase], frontAngle, frontBend, color, armW);

  // A thin rim of light: enough to separate the silhouette from the dark.
  if (rim) {
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = rim;
    ctx.lineWidth = 0.0028;
    ctx.beginPath();
    ctx.arc(0.008, shoulderY - 0.045 - headR * 0.82, headR * 0.96, Math.PI * 0.92, Math.PI * 1.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-shoulderW * 0.96, shoulderY + 0.04);
    ctx.quadraticCurveTo(-shoulderW * 1.05, shoulderY + 0.16, -hipW * 1.07, hipY + 0.02);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  ctx.restore();
}

export function drawCrowd(
  ctx: CanvasRenderingContext2D,
  t: number,
  baseY: number,
  count: number,
  color: string,
  alpha = 0.9,
  seed = 1,
  spread = 1,
): void {
  for (let i = 0; i < count; i++) {
    const r = hash(seed * 23 + i * 7.3);
    const r2 = hash(seed * 51 + i * 13.7);
    const x = (i / Math.max(1, count - 1)) * (W_SCENE * spread) + (r - 0.5) * 18;
    const y = baseY + (r2 - 0.5) * 14;
    const h = 75 + r2 * 50;
    const pose = r > 0.72 ? 'walk' : 'stand';
    drawFigure(ctx, {
      x,
      y,
      h,
      t,
      phase: t * 3.4 + r * 9,
      pose,
      facing: r > 0.5 ? 1 : -1,
      color,
      alpha: alpha * (0.55 + r * 0.45),
      shadow: false,
      kind: r > 0.9 ? 'child' : 'man',
      hat: r > 0.55 ? 'top' : r > 0.2 ? 'cap' : 'none',
    });
  }
}

const W_SCENE = 720;

export function drawFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  t: number,
  color = '#8f2f2a',
  poleColor = '#1b1510',
): void {
  ctx.save();
  ctx.strokeStyle = poleColor;
  ctx.lineWidth = Math.max(2, h * 0.018);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(t * 0.7) * h * 0.008, y - h);
  ctx.stroke();
  const wave = Math.sin(t * 2.1) * h * 0.05;
  const g = ctx.createLinearGradient(x, y - h, x + h * 0.75, y - h * 0.55);
  g.addColorStop(0, color);
  g.addColorStop(0.6, color);
  g.addColorStop(1, rgba(color, 0.55));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.98);
  ctx.quadraticCurveTo(x + h * 0.35, y - h * 0.95 + wave, x + h * 0.78, y - h * 0.77 + wave);
  ctx.lineTo(x + h * 0.6, y - h * 0.58 + wave);
  ctx.quadraticCurveTo(x + h * 0.28, y - h * 0.68 - wave * 0.5, x, y - h * 0.67);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRifle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  angle: number,
  color = '#17120d',
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.045;
  ctx.beginPath();
  ctx.moveTo(-h * 0.35, h * 0.2);
  ctx.lineTo(h * 0.6, -h * 0.55);
  ctx.stroke();
  ctx.lineWidth = h * 0.016;
  ctx.beginPath();
  ctx.moveTo(h * 0.15, -h * 0.18);
  ctx.lineTo(h * 0.58, -h * 0.55);
  ctx.stroke();
  ctx.restore();
}

export function drawBucket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color = '#241b12',
  water = '#6d8a8c',
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.035);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.3, y - size * 0.42);
  ctx.quadraticCurveTo(x, y - size * 0.92, x + size * 0.3, y - size * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.26, y - size * 0.4);
  ctx.lineTo(x - size * 0.18, y);
  ctx.lineTo(x + size * 0.18, y);
  ctx.lineTo(x + size * 0.26, y - size * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(water, 0.35);
  ctx.fillRect(x - size * 0.23, y - size * 0.36, size * 0.46, size * 0.06);
  ctx.restore();
}

export function drawDoll(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color = '#d9ad5b',
): void {
  glow(ctx, x, y - size * 0.5, size * 2.2, color, 0.08);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.72, size * 0.18, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.24, y);
  ctx.lineTo(x + size * 0.24, y);
  ctx.lineTo(x + size * 0.15, y - size * 0.55);
  ctx.quadraticCurveTo(x, y - size * 0.68, x - size * 0.15, y - size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawCart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color = '#18120c',
  t = 0,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x - w * 0.5, y - w * 0.32, w, w * 0.12);
  ctx.fillRect(x - w * 0.45, y - w * 0.2, w * 0.9, w * 0.08);
  ctx.strokeStyle = color;
  ctx.lineWidth = w * 0.03;
  for (const wx of [x - w * 0.3, x + w * 0.3]) {
    ctx.beginPath();
    ctx.arc(wx, y, w * 0.16, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI + t * 0.001;
      ctx.beginPath();
      ctx.moveTo(wx, y);
      ctx.lineTo(wx + Math.cos(a) * w * 0.15, y + Math.sin(a) * w * 0.15);
      ctx.stroke();
    }
  }
  // shafts
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y - w * 0.27);
  ctx.lineTo(x - w * 0.82, y - w * 0.47);
  ctx.moveTo(x - w * 0.43, y - w * 0.22);
  ctx.lineTo(x - w * 0.8, y - w * 0.38);
  ctx.stroke();
  ctx.restore();
}

export function drawTwoHands(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
  color: string,
  glowColor = '#d9ad5b',
  t = 0,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + Math.sin(t) * 3, x2, y2);
  ctx.stroke();
  glow(ctx, (x1 + x2) / 2, (y1 + y2) / 2, size * 2.5, glowColor, 0.14);
  ctx.restore();
}

export function drawProfile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  facing: 1 | -1,
  t: number,
  opts: {
    color?: string;
    hair?: string;
    eye?: string;
    alpha?: number;
    hairLong?: boolean;
    rim?: string;
    tears?: boolean;
  } = {},
): void {
  const color = opts.color ?? '#0a0806';
  const hairColor = opts.hair ?? '#d9b26a';
  const alpha = opts.alpha ?? 1;
  const longHair = opts.hairLong !== false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(facing * h, h);

  // Shoulders / upper chest.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-0.52, 0.6);
  ctx.quadraticCurveTo(-0.22, 0.32, -0.07, 0.16);
  ctx.lineTo(0.13, 0.16);
  ctx.quadraticCurveTo(0.3, 0.34, 0.54, 0.58);
  ctx.lineTo(0.66, 0.72);
  ctx.lineTo(-0.66, 0.72);
  ctx.closePath();
  ctx.fill();

  // Neck.
  ctx.fillRect(-0.065, 0.02, 0.2, 0.18);

  // Hair mass behind the head.
  if (longHair) {
    ctx.fillStyle = hairColor;
    ctx.globalAlpha = alpha * 0.88;
    ctx.beginPath();
    ctx.moveTo(-0.06, -0.44);
    ctx.quadraticCurveTo(-0.36, -0.42, -0.36, -0.1);
    ctx.quadraticCurveTo(-0.55, 0.25, -0.44, 0.6);
    ctx.quadraticCurveTo(-0.3, 0.68, -0.26, 0.46);
    ctx.quadraticCurveTo(-0.22, 0.18, -0.13, -0.1);
    ctx.closePath();
    ctx.fill();
  }

  // Head profile. The nose, lips and chin are kept crisp: this is the
  // silhouette the audience reads in a close-up.
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(-0.14, 0.18);
  ctx.quadraticCurveTo(-0.24, 0.06, -0.27, -0.1);
  ctx.quadraticCurveTo(-0.28, -0.34, -0.07, -0.47);
  ctx.quadraticCurveTo(0.12, -0.58, 0.23, -0.41);
  ctx.quadraticCurveTo(0.27, -0.33, 0.24, -0.28);
  ctx.quadraticCurveTo(0.24, -0.23, 0.35, -0.185);
  ctx.quadraticCurveTo(0.4, -0.17, 0.31, -0.12);
  ctx.quadraticCurveTo(0.275, -0.1, 0.295, -0.075);
  ctx.quadraticCurveTo(0.34, -0.055, 0.295, -0.035);
  ctx.quadraticCurveTo(0.285, -0.015, 0.335, 0.005);
  ctx.quadraticCurveTo(0.31, 0.04, 0.235, 0.062);
  ctx.quadraticCurveTo(0.21, 0.085, 0.13, 0.09);
  ctx.closePath();
  ctx.fill();

  // Hair cap over the crown.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0.19, -0.405);
  ctx.quadraticCurveTo(0.08, -0.56, -0.1, -0.52);
  ctx.quadraticCurveTo(-0.31, -0.46, -0.32, -0.22);
  ctx.quadraticCurveTo(-0.325, -0.08, -0.255, 0.02);
  ctx.quadraticCurveTo(-0.19, -0.12, -0.165, -0.24);
  ctx.quadraticCurveTo(-0.02, -0.4, 0.16, -0.4);
  ctx.closePath();
  ctx.fillStyle = hairColor;
  ctx.globalAlpha = alpha * (longHair ? 0.82 : 0.5);
  ctx.fill();
  if (longHair) {
    // a few golden strands, never a helmet
    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = '#efd79f';
    ctx.lineWidth = 0.0018;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0.12 + i * 0.035, -0.45 + i * 0.015);
      ctx.quadraticCurveTo(-0.06, -0.52 + i * 0.02, -0.22, -0.3 + i * 0.06);
      ctx.stroke();
    }
  } else {
    ctx.globalAlpha = alpha * 0.22;
    ctx.strokeStyle = '#b7c1c4';
    ctx.lineWidth = 0.0016;
    ctx.beginPath();
    ctx.moveTo(0.13, -0.43);
    ctx.quadraticCurveTo(-0.04, -0.5, -0.2, -0.3);
    ctx.stroke();
  }
  ctx.restore();

  // Ear.
  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.arc(-0.08, -0.16, 0.035, -1.2, 1.8);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  // Eye, brow, nostril, mouth.
  if (opts.eye) {
    const blink = 0.5 + 0.5 * Math.sin(t * 0.9);
    ctx.fillStyle = opts.eye;
    ctx.globalAlpha = alpha * (blink > 0.06 ? 0.88 : 0.15);
    ctx.beginPath();
    ctx.ellipse(0.158, -0.25, 0.011, 0.0055, -0.08, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = opts.rim ?? opts.eye;
    ctx.globalAlpha = alpha * 0.32;
    ctx.lineWidth = 0.0022;
    ctx.beginPath();
    ctx.moveTo(0.075, -0.295);
    ctx.quadraticCurveTo(0.16, -0.315, 0.235, -0.285);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0.305, -0.145, 0.009, 0.0035, -0.2, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.255, -0.06);
    ctx.quadraticCurveTo(0.285, -0.052, 0.305, -0.043);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  if (opts.tears) {
    ctx.fillStyle = 'rgba(220,235,240,0.55)';
    ctx.beginPath();
    ctx.ellipse(0.18, -0.195, 0.006, 0.03, 0.08, 0, TAU);
    ctx.fill();
  }

  // Rim light along forehead, nose, lips and chin.
  if (opts.rim) {
    const rimPath = (): void => {
      ctx.beginPath();
      ctx.moveTo(-0.07, -0.47);
      ctx.quadraticCurveTo(0.12, -0.58, 0.23, -0.41);
      ctx.quadraticCurveTo(0.27, -0.33, 0.24, -0.28);
      ctx.quadraticCurveTo(0.24, -0.23, 0.35, -0.185);
      ctx.quadraticCurveTo(0.4, -0.17, 0.31, -0.12);
      ctx.quadraticCurveTo(0.275, -0.1, 0.295, -0.075);
      ctx.quadraticCurveTo(0.34, -0.055, 0.295, -0.035);
      ctx.quadraticCurveTo(0.285, -0.015, 0.335, 0.005);
      ctx.quadraticCurveTo(0.31, 0.04, 0.235, 0.062);
      ctx.quadraticCurveTo(0.21, 0.085, 0.13, 0.09);
    };
    ctx.globalAlpha = alpha * 0.14;
    ctx.strokeStyle = opts.rim;
    ctx.lineWidth = 0.014;
    rimPath();
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.85;
    ctx.lineWidth = 0.0032;
    rimPath();
    ctx.stroke();
    // shoulder edge
    ctx.globalAlpha = alpha * 0.28;
    ctx.lineWidth = 0.003;
    ctx.beginPath();
    ctx.moveTo(-0.5, 0.61);
    ctx.quadraticCurveTo(-0.22, 0.33, -0.07, 0.18);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }
  ctx.restore();
}

export function drawCarryingPair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  t: number,
  opts: {
    color?: string;
    rim?: string;
    alpha?: number;
    facing?: 1 | -1;
    hat?: HatKind;
  } = {},
): void {
  const color = opts.color ?? '#050403';
  const rim = opts.rim ?? '#d9ad5b';
  const alpha = opts.alpha ?? 1;
  const facing = opts.facing ?? 1;
  const phase = t * 5.4;
  const swing = Math.sin(phase) * 0.25;
  const bob = Math.abs(Math.sin(phase)) * 0.012;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y - bob * h);
  ctx.scale(facing * h, h);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // shadow
  ctx.globalAlpha = alpha * 0.32;
  ctx.beginPath();
  ctx.ellipse(0.05, 0.005, 0.24, 0.03, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alpha;

  // back leg
  const backKnee = 0.24;
  const backFoot = 0.23;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.04, -0.45);
  ctx.quadraticCurveTo(-0.13, -0.24, -0.16, -0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-0.19, -0.015, 0.055, 0.022, 0.15, 0, TAU);
  ctx.fill();

  // front leg
  ctx.beginPath();
  ctx.moveTo(0.045, -0.45);
  ctx.quadraticCurveTo(0.14, -0.25, 0.18 + swing * 0.1, -0.01);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0.21 + swing * 0.1, 0.0, 0.06, 0.022, 0.1, 0, TAU);
  ctx.fill();

  // carried man's legs hanging behind on the left
  ctx.lineWidth = 0.042;
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.55);
  ctx.quadraticCurveTo(-0.22, -0.44, -0.25, -0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.03, -0.56);
  ctx.quadraticCurveTo(-0.13, -0.42, -0.15, -0.27);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-0.26, -0.29, 0.042, 0.018, -0.35, 0, TAU);
  ctx.ellipse(-0.15, -0.26, 0.042, 0.018, -0.2, 0, TAU);
  ctx.fill();

  // Valjean's torso and coat
  ctx.beginPath();
  ctx.moveTo(-0.085, -0.78);
  ctx.quadraticCurveTo(-0.12, -0.62, -0.075, -0.46);
  ctx.quadraticCurveTo(-0.16, -0.3, -0.17, -0.18);
  ctx.quadraticCurveTo(-0.03, -0.2, 0.02, -0.24);
  ctx.quadraticCurveTo(0.08, -0.2, 0.18, -0.18);
  ctx.quadraticCurveTo(0.125, -0.34, 0.08, -0.46);
  ctx.quadraticCurveTo(0.12, -0.62, 0.085, -0.78);
  ctx.quadraticCurveTo(0, -0.82, -0.085, -0.78);
  ctx.fill();

  // head + cap
  ctx.beginPath();
  ctx.arc(0.005, -0.87, 0.058, 0, TAU);
  ctx.fill();
  if (opts.hat !== 'none') {
    if (opts.hat === 'top') {
      ctx.fillRect(-0.05, -1.0, 0.11, 0.075);
      ctx.fillRect(-0.085, -0.94, 0.17, 0.018);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, -0.92, 0.07, 0.024, -0.08, 0, TAU);
      ctx.fill();
      ctx.fillRect(-0.065, -0.928, 0.1, 0.018);
    }
  }

  // Marius, carried across the chest
  ctx.beginPath();
  ctx.ellipse(0.1, -0.585, 0.29, 0.063, -0.02, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.395, -0.6, 0.057, 0, TAU);
  ctx.fill();
  // his dangling arm
  ctx.lineWidth = 0.038;
  ctx.beginPath();
  ctx.moveTo(0.28, -0.56);
  ctx.quadraticCurveTo(0.27, -0.45, 0.22, -0.36);
  ctx.stroke();

  // Valjean's arms under the body
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(-0.07, -0.74);
  ctx.quadraticCurveTo(-0.13, -0.6, -0.04, -0.51);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.07, -0.75);
  ctx.quadraticCurveTo(0.16, -0.63, 0.3, -0.55);
  ctx.stroke();

  // Rim light: head, shoulders, and the line of the carried body.
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = rim;
  ctx.lineWidth = 0.0028;
  ctx.beginPath();
  ctx.arc(0.005, -0.87, 0.054, Math.PI * 0.85, Math.PI * 1.95);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.38;
  ctx.beginPath();
  ctx.moveTo(-0.22, -0.61);
  ctx.quadraticCurveTo(0.1, -0.67, 0.4, -0.645);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.78);
  ctx.quadraticCurveTo(-0.11, -0.64, -0.07, -0.48);
  ctx.stroke();
  ctx.restore();
}

export function drawClaspedHands(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
  color = '#070504',
  rim = '#efc87c',
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const breathe = Math.sin(t * 1.1) * 0.008;

  // forearms
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(-0.95, 0.85);
  ctx.quadraticCurveTo(-0.55, 0.4, -0.12, 0.1 + breathe);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1.05, 0.8);
  ctx.quadraticCurveTo(0.6, 0.35, 0.14, 0.07 + breathe);
  ctx.stroke();

  // palms
  ctx.beginPath();
  ctx.ellipse(-0.12, 0.05 + breathe, 0.2, 0.12, 0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.12, 0.04 + breathe, 0.2, 0.12, -0.3, 0, TAU);
  ctx.fill();

  // interlaced fingers
  ctx.lineWidth = 0.055;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-0.25 + i * 0.025, 0.02 + breathe);
    ctx.quadraticCurveTo(-0.12 + i * 0.03, -0.09 + breathe, 0.02 + i * 0.035, -0.055 + breathe);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.27 - i * 0.025, 0.04 + breathe);
    ctx.quadraticCurveTo(0.14 - i * 0.03, -0.08 + breathe, 0.0 - i * 0.035, -0.045 + breathe);
    ctx.stroke();
  }

  // rim light along the clasp
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = rim;
  ctx.lineWidth = 0.008;
  ctx.beginPath();
  ctx.moveTo(-0.32, 0.04 + breathe);
  ctx.quadraticCurveTo(-0.08, -0.12 + breathe, 0.3, -0.02 + breathe);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(-0.8, 0.72);
  ctx.quadraticCurveTo(-0.5, 0.42, -0.18, 0.18);
  ctx.stroke();
  ctx.restore();
}

export function drawLyingFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
  alpha = 1,
  facing: 1 | -1 = 1,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * h, h);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -0.08, 0.34, 0.075, -0.03, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.34, -0.1, 0.062, 0, TAU);
  ctx.fill();
  pathStroke(ctx, [[0.28, -0.11], [0.48, -0.09], [0.6, -0.07]], color, 0.045);
  pathStroke(ctx, [[-0.2, -0.1], [-0.4, -0.14], [-0.52, -0.21]], color, 0.045);
  pathStroke(ctx, [[-0.12, -0.12], [-0.28, -0.04], [-0.45, -0.02]], color, 0.045);
  ctx.restore();
}

export function drawCarriedFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
  alpha = 1,
): void {
  // A limp body slung over a shoulder: torso horizontal, head heavy,
  // legs and one arm hanging. Reads instantly even at small sizes.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(-0.045);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  // torso
  ctx.beginPath();
  ctx.ellipse(0, 0, h * 0.36, h * 0.075, -0.03, 0, TAU);
  ctx.fill();
  // head
  ctx.beginPath();
  ctx.arc(h * 0.4, -h * 0.015, h * 0.062, 0, TAU);
  ctx.fill();
  // legs hanging
  ctx.lineWidth = h * 0.055;
  ctx.beginPath();
  ctx.moveTo(-h * 0.24, h * 0.02);
  ctx.quadraticCurveTo(-h * 0.4, h * 0.12, -h * 0.46, h * 0.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-h * 0.33, h * 0.01);
  ctx.quadraticCurveTo(-h * 0.5, h * 0.11, -h * 0.55, h * 0.2);
  ctx.stroke();
  // dangling arm
  ctx.lineWidth = h * 0.044;
  ctx.beginPath();
  ctx.moveTo(h * 0.14, h * 0.01);
  ctx.quadraticCurveTo(h * 0.08, h * 0.14, h * 0.04, h * 0.22);
  ctx.stroke();
  // boot tips
  ctx.beginPath();
  ctx.ellipse(-h * 0.46, h * 0.26, h * 0.045, h * 0.02, 0.4, 0, TAU);
  ctx.ellipse(-h * 0.55, h * 0.21, h * 0.04, h * 0.018, 0.3, 0, TAU);
  ctx.fill();
  // a thin gold edge on the top of the body
  ctx.globalAlpha = alpha * 0.28;
  ctx.strokeStyle = '#d9ad5b';
  ctx.lineWidth = h * 0.007;
  ctx.beginPath();
  ctx.moveTo(-h * 0.33, -h * 0.055);
  ctx.quadraticCurveTo(-h * 0.1, -h * 0.08, h * 0.3, -h * 0.065);
  ctx.stroke();
  ctx.restore();
}

export function drawHorse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
  t: number,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const bob = Math.sin(t * 1.6) * h * 0.008;
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.52 + bob, h * 0.34, h * 0.15, -0.05, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + h * 0.34, y - h * 0.62 + bob, h * 0.1, h * 0.16, 0.3, 0, TAU);
  ctx.fill();
  ctx.lineWidth = h * 0.045;
  for (const [dx, ph] of [
    [-0.22, 0],
    [0.2, 1.2],
    [-0.15, 2.4],
    [0.26, 3],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + h * dx, y - h * 0.44);
    ctx.quadraticCurveTo(
      x + h * dx + Math.sin(t * 2 + ph) * h * 0.04,
      y - h * 0.22,
      x + h * dx + Math.sin(t * 2 + ph) * h * 0.06,
      y,
    );
    ctx.stroke();
  }
  ctx.restore();
}

export function drawWheelbarrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w * 0.03;
  ctx.beginPath();
  ctx.arc(x, y, w * 0.13, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y - w * 0.1);
  ctx.lineTo(x + w * 0.3, y - w * 0.2);
  ctx.lineTo(x + w * 0.42, y - w * 0.1);
  ctx.moveTo(x - w * 0.35, y - w * 0.1);
  ctx.lineTo(x - w * 0.62, y + w * 0.08);
  ctx.stroke();
  ctx.restore();
}

export function drawSimplePerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
  alpha = 1,
  t = 0,
): void {
  drawFigure(ctx, { x, y, h, t, color, alpha, pose: 'stand', shadow: false });
}

export function drawScarfOrCoatFlutter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  t: number,
  color: string,
  seed = 1,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, h * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(
    x - h * 0.22,
    y + Math.sin(t * 3.1 + seed) * h * 0.09,
    x - h * 0.42,
    y + h * 0.08 + Math.sin(t * 2.3 + seed) * h * 0.12,
  );
  ctx.stroke();
  ctx.restore();
}

export const figureColors = {
  ink: '#0a0806',
  inkSoft: '#16110c',
  rimGold: '#d9ad5b',
  rimMoon: '#cfd8dc',
};
