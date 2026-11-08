import { NEUTRAL_INPUT, type InputFrame } from '../core/input/InputTypes';
import type { Fighter } from '../fighters/Fighter';
import type { StageDefinition } from '../stages/types';
import type { Rng } from '../utils/rng';
import { clamp, sign } from '../utils/math';

export interface AIOptions {
  frame: number;
  level: number;
  stage: StageDefinition;
  rng: Rng;
  teamMode: boolean;
  passive?: boolean;
}

/**
 * Stateless CPU policy: all randomness comes from the simulation RNG and every
 * decision is derived from the current visible state, which keeps replays and
 * snapshots deterministic. No hidden AI timers are stored.
 */
export function computeAIInput(
  self: Fighter,
  fighters: readonly Fighter[],
  options: AIOptions,
): InputFrame {
  const input: InputFrame = { ...NEUTRAL_INPUT };
  if (options.passive || self.eliminated || self.state === 'dead') return input;

  const opponents = fighters.filter(
    (fighter) =>
      fighter !== self &&
      !fighter.eliminated &&
      fighter.state !== 'dead' &&
      (!options.teamMode || fighter.config.team !== self.config.team),
  );
  if (opponents.length === 0) return input;

  let opponent = opponents[0];
  let nearest = Infinity;
  for (const candidate of opponents) {
    const distance = Math.abs(candidate.pos.x - self.pos.x);
    if (distance < nearest) {
      nearest = distance;
      opponent = candidate;
    }
  }

  if (self.state === 'ledge') {
    input.jump = options.frame % 7 < 2;
    return input;
  }

  const main = options.stage.platforms.find((platform) => platform.style === 'main');
  const centerX = main?.x ?? 0;
  const halfWidth = (main?.width ?? 18) / 2;
  const stageLeft = centerX - halfWidth;
  const stageRight = centerX + halfWidth;
  const offstage =
    !self.grounded && (self.pos.x < stageLeft - 0.2 || self.pos.x > stageRight + 0.2 || self.pos.y < -0.1);

  if (offstage && self.state !== 'grabbed' && self.state !== 'grabbing') {
    input.moveX = sign(centerX - self.pos.x);
    const pulse = options.frame % 9 < 2;
    if (self.airJumpsLeft > 0 && self.pos.y < 2.8) input.jump = pulse;
    if (self.pos.y < 1.1 || (self.airJumpsLeft === 0 && self.vel.y < -0.02)) {
      input.moveY = 1;
      input.special = pulse;
    }
    if (Math.abs(self.pos.x - centerX) < 2.2 && self.pos.y > 1.5) input.moveX = 0;
    return input;
  }

  const dx = opponent.pos.x - self.pos.x;
  const dy = opponent.pos.y - self.pos.y;
  const distance = Math.abs(dx);
  const level = clamp(options.level, 1, 3);
  const aggression = [0.016, 0.04, 0.075][level - 1];

  input.moveX = distance > 1.5 ? sign(dx) : 0;
  input.moveY = dy > 0.9 ? 1 : dy < -0.9 ? -1 : 0;

  if (
    self.grounded &&
    input.moveX !== 0 &&
    ((self.pos.x < stageLeft + 0.7 && input.moveX < 0) || (self.pos.x > stageRight - 0.7 && input.moveX > 0))
  ) {
    input.moveX = 0;
  }

  if (distance < 3.4) {
    if (options.rng.chance(aggression)) input.attack = true;
    if (opponent.damage > 70 && options.rng.chance(aggression * 0.45)) input.strong = true;
    else if (options.rng.chance(aggression * 0.28)) input.special = true;
    if (self.meter >= 100 && options.rng.chance(0.04)) input.taunt = true;
  }

  if (opponent.currentMove && distance < 3 && options.rng.chance(0.05)) input.shield = true;
  if (distance < 1.9 && options.rng.chance(0.012)) input.grab = true;
  if (distance > 4 && options.rng.chance(0.008)) {
    input.jump = true;
    input.moveX = sign(dx);
  }
  if (dy > 1.2 && distance < 2.4 && options.rng.chance(0.02)) input.jump = true;

  return input;
}
