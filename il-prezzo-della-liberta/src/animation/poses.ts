import type { ActorId, PoseName } from '../data/types';
import { clamp01, noise1, smoothstep } from '../utils/math';
import { seedFromString } from '../utils/rng';

export interface PoseAngles {
  hipsDrop: number;
  hipsRoll: number;
  torsoX: number;
  torsoY: number;
  torsoZ: number;
  headX: number;
  headY: number;
  headZ: number;
  armLX: number;
  armLY: number;
  armLZ: number;
  elbowL: number;
  armRX: number;
  armRY: number;
  armRZ: number;
  elbowR: number;
  legLX: number;
  legLZ: number;
  kneeL: number;
  legRX: number;
  legRZ: number;
  kneeR: number;
  footL: number;
  footR: number;
}

export type PoseBlend = (from: PoseName, to: PoseName, weight: number, t: number, seed: number, walk: number, phase: number) => PoseAngles;

export function zeroPose(): PoseAngles {
  return {
    hipsDrop: 0,
    hipsRoll: 0,
    torsoX: 0,
    torsoY: 0,
    torsoZ: 0,
    headX: 0,
    headY: 0,
    headZ: 0,
    armLX: 0,
    armLY: 0,
    armLZ: 0,
    elbowL: 0,
    armRX: 0,
    armRY: 0,
    armRZ: 0,
    elbowR: 0,
    legLX: 0,
    legLZ: 0,
    kneeL: 0,
    legRX: 0,
    legRZ: 0,
    kneeR: 0,
    footL: 0,
    footR: 0
  };
}

export function poseAngles(name: PoseName, t: number, seed: number, walk: number, phase: number, seated = false): PoseAngles {
  const p = zeroPose();
  const breath = Math.sin(t * 1.35 + seed) * 0.012;
  const sway = noise1(t * 0.19, seed) * 0.05;
  const headSway = noise1(t * 0.23 + 7.1, seed) * 0.14;

  const armsHang = (): void => {
    p.armLX = 0.02;
    p.armRX = 0.02;
    p.armLZ = 0.10;
    p.armRZ = -0.10;
    p.elbowL = -0.16;
    p.elbowR = -0.16;
  };

  switch (name) {
    case 'idle':
      armsHang();
      p.torsoX = breath;
      p.torsoY = sway;
      p.headY = headSway;
      p.headX = 0.015 + Math.sin(t * 0.31 + seed) * 0.012;
      break;
    case 'talk':
      armsHang();
      p.torsoX = breath + 0.006;
      p.torsoY = sway * 1.2;
      p.headY = headSway * 1.2;
      p.headX = 0.02 + Math.sin(t * 0.55 + seed) * 0.02;
      p.armRX = -0.24 + Math.sin(t * 0.8 + seed) * 0.16;
      p.armRZ = -0.18;
      p.elbowR = -0.55 + Math.sin(t * 0.8 + seed + 1.1) * 0.18;
      p.armLX = -0.06;
      p.elbowL = -0.22;
      break;
    case 'sit':
      p.hipsDrop = 1;
      p.torsoX = 0.04 + breath;
      p.torsoY = sway * 0.4;
      p.headY = headSway * 0.8;
      p.headX = 0.03;
      p.legLX = -1.32;
      p.legRX = -1.32;
      p.kneeL = 1.24;
      p.kneeR = 1.24;
      p.footL = -0.12;
      p.footR = -0.12;
      p.legLZ = 0.07;
      p.legRZ = -0.07;
      p.armLX = -0.42;
      p.armRX = -0.42;
      p.armLZ = 0.16;
      p.armRZ = -0.16;
      p.elbowL = -0.85;
      p.elbowR = -0.85;
      break;
    case 'stand':
      armsHang();
      p.torsoX = breath;
      p.headY = headSway * 0.6;
      break;
    case 'lookDown':
      armsHang();
      p.headX = 0.26;
      p.torsoX = 0.07 + breath;
      p.headY = headSway * 0.4;
      p.armLX = 0.06;
      p.armRX = 0.06;
      break;
    case 'lookUp':
      armsHang();
      p.headX = -0.2;
      p.torsoX = -0.03 + breath;
      p.headY = headSway * 0.5;
      break;
    case 'holdPhoto':
      armsHang();
      p.armRX = -0.92;
      p.armRZ = -0.3;
      p.elbowR = -1.32;
      p.armLX = 0.04;
      p.elbowL = -0.2;
      p.headX = 0.22;
      p.headY = -0.05;
      p.torsoX = 0.06 + breath;
      break;
    case 'holdTape':
      p.armLX = -0.78;
      p.armRX = -0.78;
      p.armLZ = 0.26;
      p.armRZ = -0.26;
      p.elbowL = -1.28;
      p.elbowR = -1.28;
      p.headX = 0.24;
      p.torsoX = 0.07 + breath;
      p.headY = headSway * 0.3;
      break;
    case 'holdPaper':
      armsHang();
      p.armRX = -0.7;
      p.armRZ = -0.2;
      p.elbowR = -1.1;
      p.armLX = 0.05;
      p.headX = 0.15;
      p.torsoX = 0.05 + breath;
      break;
    case 'embrace':
      p.armLX = -1.34;
      p.armRX = -1.34;
      p.armLZ = 0.36;
      p.armRZ = -0.36;
      p.elbowL = -0.95;
      p.elbowR = -0.95;
      p.torsoX = 0.07 + breath;
      p.headX = -0.02;
      p.headZ = 0.05;
      break;
    case 'hug':
      p.armLX = -1.22;
      p.armRX = -1.22;
      p.armLZ = 0.24;
      p.armRZ = -0.24;
      p.elbowL = -1.45;
      p.elbowR = -1.45;
      p.torsoX = 0.13 + breath;
      p.headX = 0.06;
      p.headZ = -0.04;
      break;
    case 'handInHand':
      armsHang();
      p.armRX = -0.4;
      p.armRZ = -0.62;
      p.elbowR = -0.25;
      p.headY = 0.12;
      p.torsoX = breath;
      break;
    default:
      armsHang();
      break;
  }

  if (seated && name !== 'sit' && name !== 'stand' && walk < 0.001) {
    p.hipsDrop = 1;
    p.legLX = -1.32;
    p.legRX = -1.32;
    p.kneeL = 1.24;
    p.kneeR = 1.24;
    p.footL = -0.12;
    p.footR = -0.12;
    p.legLZ = 0.07;
    p.legRZ = -0.07;
  }

  if (walk > 0.001) {
    const w = walk;
    p.legLX += -Math.sin(phase) * 0.58 * w;
    p.legRX += Math.sin(phase) * 0.58 * w;
    p.kneeL += Math.max(0, Math.sin(phase + 0.65)) * 0.92 * w;
    p.kneeR += Math.max(0, -Math.sin(phase + 0.65)) * 0.92 * w;
    p.footL += Math.sin(phase + 1.2) * 0.16 * w;
    p.footR += -Math.sin(phase + 1.2) * 0.16 * w;
    p.armLX += Math.sin(phase) * 0.42 * w;
    p.armRX += -Math.sin(phase) * 0.42 * w;
    p.torsoY += Math.sin(phase) * 0.05 * w;
    p.hipsRoll += Math.sin(phase) * 0.035 * w;
    p.hipsDrop += 0.018 * Math.abs(Math.sin(phase * 2)) * w;
    p.headY += Math.sin(phase) * 0.02 * w;
  }

  return p;
}

export function blendPose(a: PoseAngles, b: PoseAngles, t: number): PoseAngles {
  const k = clamp01(t);
  const out = zeroPose();
  const keys = Object.keys(out) as Array<keyof PoseAngles>;
  for (const key of keys) {
    out[key] = a[key] + (b[key] - a[key]) * k;
  }
  return out;
}

export function poseBlendWeight(elapsed: number): number {
  return smoothstep(elapsed / 0.5);
}

export function actorSeed(actor: ActorId): number {
  return seedFromString(actor) % 1000;
}
