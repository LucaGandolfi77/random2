import { createState, step } from '../src/sim.js';

export function makeGame(chapter = 1, options = {}) {
  return createState(chapter, { seed: 1234, ...options });
}

export function tick(state, intent, seconds = 0.1) {
  const frames = Math.max(1, Math.ceil(seconds / (1 / 60)));
  for (let i = 0; i < frames; i++) step(state, intent, 1 / 60);
  return state;
}

export function parkEnemies(state) {
  for (const enemy of state.enemies) {
    enemy.patrol = null;
    enemy.state = 'idle';
    enemy.awareness = 0;
    enemy.fireCooldown = 999;
    enemy.attackCooldown = 999;
  }
  return state;
}

export function movePlayer(state, x, y) {
  state.player.x = x;
  state.player.y = y;
  return state;
}
