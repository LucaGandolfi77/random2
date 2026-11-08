import { clamp, degToRad, sign } from '../utils/math';

export interface KnockbackInput {
  damage: number;
  targetPercent: number;
  weight: number;
  baseKnockback: number;
  knockbackGrowth: number;
  knockbackResistance: number;
  damageScaling?: number;
  attackMultiplier?: number;
}

export interface KnockbackResult {
  magnitude: number;
  hitstun: number;
}

/**
 * Configurable platform-fighter launch formula. Damage percentage feeds the
 * base term and also scales with the incoming hit, so a 12% hit at 140% sends
 * a fighter much farther than the same hit at 20%. Weight and knockback
 * resistance dampen the result. All values are tunable per move.
 */
export function computeKnockback(input: KnockbackInput): KnockbackResult {
  const scaling = input.damageScaling ?? 1;
  const damage = Math.max(0, input.damage) * scaling;
  const percent = Math.max(0, input.targetPercent);
  const weight = Math.max(20, input.weight);
  const growth = Math.max(0, input.knockbackGrowth);
  const base = Math.max(0, input.baseKnockback);
  const attackMultiplier = input.attackMultiplier ?? 1;

  const damageTerm = percent / 10 + (percent * damage) / 20;
  const weightTerm = 200 / (weight + 100);
  const magnitude = ((damageTerm * weightTerm * 1.4 + 18) * (growth / 100) + base) * attackMultiplier;
  const resistance = clamp(input.knockbackResistance, 0, 0.6);
  const effective = magnitude * (1 - resistance);
  const hitstun = Math.floor(effective * 0.55) + 4;

  return {
    magnitude: Math.min(effective, 320),
    hitstun: Math.min(hitstun, 190),
  };
}

export function knockbackVelocity(
  magnitude: number,
  angleDegrees: number,
  direction: number,
): { x: number; y: number } {
  const speed = magnitude * 0.0195;
  const rad = degToRad(angleDegrees);
  return {
    x: Math.cos(rad) * speed * sign(direction),
    y: Math.sin(rad) * speed,
  };
}

export interface DiInput {
  moveX: number;
  moveY: number;
}

/**
 * Directional influence rotates a launch by up to 18 degrees using the stick
 * perpendicular to the launch angle. A neutral stick leaves the launch intact.
 */
export function applyDirectionalInfluence(
  angleDegrees: number,
  direction: number,
  di: DiInput,
): number {
  const magnitude = Math.hypot(di.moveX, di.moveY);
  if (magnitude < 0.2) return angleDegrees;

  const rad = degToRad(angleDegrees);
  const launchX = Math.cos(rad) * direction;
  const launchY = Math.sin(rad);
  const perpendicularX = -launchY;
  const perpendicularY = launchX * direction;
  const dot = di.moveX * perpendicularX + di.moveY * perpendicularY;
  const normalized = Math.max(-1, Math.min(1, dot));
  return angleDegrees + normalized * 18;
}
