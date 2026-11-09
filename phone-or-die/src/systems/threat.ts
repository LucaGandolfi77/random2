import type { Difficulty, GameState, ThreatStage } from '@/core/types';
import { clamp } from '@/core/rng';
import { isAlleyTile, isLitAt, zoneAt } from '@/data/road';

export interface StageInfo {
  stage: ThreatStage;
  label: string;
  short: string;
  description: string;
  color: string;
  glow: string;
}

export const STAGES: StageInfo[] = [
  {
    stage: 0,
    label: 'The Street Is Empty',
    short: 'Quiet',
    description: 'For a moment, the road belongs to you.',
    color: '#7f9c8c',
    glow: 'rgba(127,156,140,0.2)'
  },
  {
    stage: 1,
    label: 'Footsteps Behind You',
    short: 'Followed',
    description: 'A second set of steps keeps time with yours. A streetlight stutters.',
    color: '#c6a56b',
    glow: 'rgba(198,165,107,0.24)'
  },
  {
    stage: 2,
    label: 'The Street Is Wrong',
    short: 'Watched',
    description: 'The same corner. The same car. Something is taking the long way with you.',
    color: '#c77d54',
    glow: 'rgba(199,125,84,0.28)'
  },
  {
    stage: 3,
    label: 'Do Not Look Back',
    short: 'Close',
    description: 'Headlights behind you with no car. Your phone is hot enough to hurt.',
    color: '#bd5247',
    glow: 'rgba(189,82,71,0.34)'
  },
  {
    stage: 4,
    label: 'The Road Took You',
    short: 'Taken',
    description: 'The line is dead. The road has finished the sentence.',
    color: '#7d2d2b',
    glow: 'rgba(125,45,43,0.46)'
  }
];

export const stageForThreat = (threat: number): ThreatStage => {
  if (threat >= 100) return 4;
  if (threat >= 60) return 3;
  if (threat >= 40) return 2;
  if (threat >= 20) return 1;
  return 0;
};

export const stageInfo = (threat: number): StageInfo => STAGES[stageForThreat(threat)];

export const criticalThreat = (threat: number): boolean => threat >= 80;

export const difficultyThreatFactor = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case 'story':
      return 0.64;
    case 'nightmare':
      return 1.28;
    default:
      return 1;
  }
};

/**
 * Fear added by putting one foot in front of the other.
 * Streetlights slow the approach; dark ground accelerates it.
 */
export const stepThreatFor = (game: GameState, x = game.player.x, y = game.player.y): number => {
  const lit = isLitAt(x, y, game.powerOn);
  const darkTerrain = zoneAt(x, y) === 'park' || isAlleyTile(x, y);
  const difficulty = game.difficulty === 'story' ? 0.7 : game.difficulty === 'nightmare' ? 1.45 : 1;
  const base = lit ? 0.55 : 1.45;
  const pressure = 1 + game.chapter * 0.05 + game.threat / 300;
  return base * (darkTerrain ? 1.4 : 1) * difficulty * pressure;
};

/** Approximate number of footsteps the shadows need to reach Emma. */
export const shadowStepsBehind = (game: GameState): number =>
  clamp(Math.ceil((100 - game.threat) / Math.max(0.45, stepThreatFor(game))), 0, 99);

export const threatRisePerSecond = (game: GameState): number => {
  const chapterFactor = 0.84 + game.chapter * 0.15;
  const barricades =
    (game.barricades.front ? 0.08 : 0) +
    (game.barricades.back ? 0.08 : 0) +
    (game.barricades.windows ? 0.06 : 0);
  const powerPenalty = game.powerOn ? 0 : 0.12;
  const litRelief = isLitAt(game.player.x, game.player.y, game.powerOn) ? 0.08 : 0;
  const darkTerrain = zoneAt(game.player.x, game.player.y) === 'park' || isAlleyTile(game.player.x, game.player.y) ? 0.1 : 0;
  const idle = game.idleSeconds ?? 0;
  const idleFactor = idle >= 12 ? 3.4 : idle >= 6 ? 2.1 : 0.5;
  const base = 0.17 * chapterFactor * difficultyThreatFactor(game.difficulty) * idleFactor;
  return Math.max(
    0.04,
    base - barricades + powerPenalty - litRelief + darkTerrain
  );
};

export const threatDecayPerSecond = (game: GameState): number =>
  0.52 * (game.difficulty === 'story' ? 1.15 : game.difficulty === 'nightmare' ? 0.9 : 1);

export interface ThreatTick {
  threat: number;
  shieldSeconds: number;
  captured: boolean;
  stage: ThreatStage;
  previousStage: ThreatStage;
}

export const tickThreat = (
  game: GameState,
  deltaSeconds: number,
  connected: boolean
): ThreatTick => {
  const previousStage = stageForThreat(game.threat);
  let threat = game.threat;
  let shieldSeconds = Math.max(0, game.shieldSeconds - deltaSeconds);

  if (connected) {
    threat -= threatDecayPerSecond(game) * 1.25 * deltaSeconds;
    shieldSeconds = Math.max(shieldSeconds, 6);
  } else if (shieldSeconds > 0) {
    threat -= threatDecayPerSecond(game) * deltaSeconds;
  } else {
    threat += threatRisePerSecond(game) * deltaSeconds;
  }

  threat = clamp(threat, 0, 100);
  return {
    threat,
    shieldSeconds,
    captured: threat >= 100,
    stage: stageForThreat(threat),
    previousStage
  };
};

export const protectionFraction = (game: GameState): number => Math.max(0, Math.min(1, game.threat / 100));
