import type { Difficulty, Quality } from '../data/types';

export const CONFIG = {
  eyeHeight: 1.62,
  crouchHeight: 1.02,
  walkSpeed: 3.15,
  sprintSpeed: 5.5,
  crouchSpeed: 1.7,
  acceleration: 15,
  damping: 12,
  gravity: 18,
  mouseSensitivity: 0.0022,
  touchSensitivity: 0.004,
  interactionRange: 3.0,
  captureDistance: 1.25,
  threatMax: 100,
  battery: {
    idleDrain: 0.012,
    phoneDrain: 0.09,
    callDrain: 0.24,
    flashlightDrain: 0.16,
    chargerRate: 12,
    powerBank: 38,
    critical: 15
  },
  difficulty: {
    easy: { threat: 0.68, battery: 0.75, enemySpeed: 0.82 },
    normal: { threat: 1, battery: 1, enemySpeed: 1 },
    hard: { threat: 1.38, battery: 1.25, enemySpeed: 1.2 }
  } as Record<Difficulty, { threat: number; battery: number; enemySpeed: number }>,
  quality: {
    low: { pixelRatio: 0.7, shadows: false, shadowSize: 512, fogFar: 26, lights: 2 },
    medium: { pixelRatio: 1, shadows: true, shadowSize: 1024, fogFar: 38, lights: 4 },
    high: { pixelRatio: 1.4, shadows: true, shadowSize: 2048, fogFar: 52, lights: 7 }
  } as Record<Quality, { pixelRatio: number; shadows: boolean; shadowSize: number; fogFar: number; lights: number }>
};
