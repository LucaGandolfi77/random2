import { createRun, launchArrow, spawnEnemy, update } from '../src/sim.js';

export function memoryStore(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    dump() {
      return Object.fromEntries(data);
    }
  };
}

export function quietRun(options = {}) {
  const run = createRun({ width: 390, height: 844, seed: 12345, ...options });
  run.spawnQueue = ['slime'];
  run.spawnT = 999;
  return run;
}

export function addTarget(run, type = 'slime', x = 130, y = 130) {
  const enemy = spawnEnemy(run, type, { x, y });
  enemy.speed = 0;
  enemy.vy = 0;
  enemy.baseX = x;
  enemy.amp = 0;
  return enemy;
}

export function directShot(run, enemy, options = {}) {
  const arrow = launchArrow(run, 0, 0.8, {
    x: enemy.x,
    y: enemy.y,
    speed: 0,
    damage: options.damage ?? 1,
    pierce: options.pierce ?? false
  });
  run.hitstop = 0;
  update(run, 0.016);
  return arrow;
}

export function step(run, seconds = 0.1, dt = 0.016) {
  const frames = Math.max(1, Math.ceil(seconds / dt));
  for (let i = 0; i < frames; i++) update(run, dt);
  return run;
}

export function clearWave(run) {
  run.spawnQueue = [];
  run.enemies = [];
  run.arrows = [];
  step(run, 0.12);
  return run;
}

export function killOne(run, type = 'slime', x = 120, y = 120, damage = 99) {
  const enemy = addTarget(run, type, x, y);
  directShot(run, enemy, { damage });
  step(run, 0.1);
  return enemy;
}
