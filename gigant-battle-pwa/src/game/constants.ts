import type { FighterDef } from '../data/fighters';
import type { AttackDef, AttackKind, Platform } from './types';

export const VIEW_W = 480;
export const VIEW_H = 270;
export const GROUND_Y = 232;
export const FIGHTER_W = 18;
export const FIGHTER_H = 30;
export const WALL_L = 14;
export const WALL_R = VIEW_W - 14;
export const GRAVITY = 1450;
export const JUMP_V = -505;
export const ROUND_SECONDS = 60;
export const MAX_HP = 100;

export const PLATFORMS: Platform[] = [
  { x: 70, y: 168, w: 96, h: 6 },
  { x: 314, y: 168, w: 96, h: 6 },
  { x: 192, y: 128, w: 96, h: 6 }
];

export function attacksFor(def: FighterDef): Record<AttackKind, AttackDef> {
  const p = def.stats.power / 7;
  const r = def.stats.reach / 7;
  const mk = (kind: AttackKind, dmg: number, startup: number, active: number, recovery: number, range: number, kb: number, hitstun: number, gain: number, launch = 0): AttackDef => ({
    kind, damage: Math.round(dmg * p), startup, active, recovery,
    range: Math.round(range * r), height: FIGHTER_H + 10,
    knockback: kb, hitstun, energyGain: gain, launch
  });
  return {
    light1: mk('light1', 5, 0.07, 0.08, 0.12, 26, 85, 0.16, 6),
    light2: mk('light2', 6, 0.08, 0.09, 0.14, 27, 100, 0.18, 7),
    light3: mk('light3', 9, 0.11, 0.10, 0.22, 31, 210, 0.26, 10, -120),
    heavy: mk('heavy', 14, 0.20, 0.12, 0.30, 34, 320, 0.34, 12, -170),
    special: mk('special', 17, 0.16, 0.16, 0.34, 30, 280, 0.30, 0, -90)
  };
}

export const ASSIST_COOLDOWN = 8;
export const DODGE_TIME = 0.26;
export const DODGE_IFRAME = 0.18;
