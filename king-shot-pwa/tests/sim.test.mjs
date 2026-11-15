import test from 'node:test';
import assert from 'node:assert/strict';
import {
  castVolley,
  chooseUpgrade,
  createRun,
  derived,
  fire,
  getSummary,
  launchArrow,
  skipDraft,
  update,
  volleyReady
} from '../src/sim.js';
import { waveComposition, isBossWave } from '../src/content.js';
import { makeRng } from '../src/rng.js';
import { addTarget, clearWave, directShot, quietRun, step } from './harness.js';

test('a new run starts with the oath hearts and a first wave', () => {
  const run = createRun({ seed: 7, oath: 'knight' });
  assert.equal(run.phase, 'playing');
  assert.equal(run.hp, 5);
  assert.equal(run.maxHp, 5);
  assert.equal(run.wave, 1);
  assert.ok(run.spawnQueue.length > 0);
  assert.equal(run.score, 0);
});

test('oaths change hearts, enemy speed and score multiplier', () => {
  const squire = createRun({ seed: 1, oath: 'squire' });
  const warlord = createRun({ seed: 1, oath: 'warlord' });
  assert.equal(squire.maxHp, 7);
  assert.equal(warlord.maxHp, 3);
  assert.ok(derived(warlord).scoreMult > derived(squire).scoreMult);
});

test('the daily siege is always knight with a deterministic seed', () => {
  const date = new Date(2026, 10, 15);
  const a = createRun({ daily: true, date });
  const b = createRun({ daily: true, date });
  assert.equal(a.oath, 'knight');
  assert.equal(a.seed, b.seed);
  assert.deepEqual(a.spawnQueue, b.spawnQueue);
  assert.equal(a.wind, b.wind);
});

test('the daily keeps its decrees and next horde deterministic', () => {
  const date = new Date(2026, 10, 15);
  const a = createRun({ daily: true, date });
  const b = createRun({ daily: true, date });
  clearWave(a);
  clearWave(b);
  assert.deepEqual(a.draft.choices, b.draft.choices);
  assert.equal(chooseUpgrade(a, a.draft.choices[0]), true);
  assert.equal(chooseUpgrade(b, b.draft.choices[0]), true);
  assert.deepEqual(a.spawnQueue, b.spawnQueue);
  assert.equal(a.wind, b.wind);
});

test('an arrow can kill a slime with a bullseye', () => {
  const run = quietRun();
  const enemy = addTarget(run, 'slime');
  directShot(run, enemy);
  assert.equal(enemy.dead, true);
  assert.equal(run.stats.kills, 1);
  assert.equal(run.stats.bullseyes, 1);
  assert.ok(run.score > 0);
});

test('piercing arrows continue through targets', () => {
  const run = quietRun();
  run.upgrades.bodkin = 1;
  const first = addTarget(run, 'slime', 120, 120);
  const second = addTarget(run, 'slime', 180, 120);
  launchArrow(run, 0, 0.8, {
    x: 100,
    y: 120,
    vx: 3000,
    vy: 0,
    speed: 3000,
    pierce: true
  });
  run.arrows[0].vx = 3000;
  run.arrows[0].vy = 0;
  for (let i = 0; i < 5; i++) {
    run.hitstop = 0;
    update(run, 0.016);
  }
  assert.equal(first.dead, true);
  assert.equal(second.dead, true);
});

test('kills build a timed combo and score', () => {
  const run = quietRun();
  const targets = [
    addTarget(run, 'slime', 100, 110),
    addTarget(run, 'slime', 160, 110),
    addTarget(run, 'slime', 220, 110)
  ];
  for (const target of targets) directShot(run, target);
  assert.equal(run.stats.kills, 3);
  assert.equal(run.combo.count, 3);
  assert.equal(run.combo.mult, 2);
  assert.ok(run.combo.best >= 2);
  assert.ok(run.score >= 3 * 12);
});

test('a cleared wave offers three upgrades and advances after choosing one', () => {
  const run = quietRun();
  clearWave(run);
  assert.equal(run.phase, 'draft');
  assert.ok(run.draft);
  assert.equal(run.draft.choices.length, 3);
  const choice = run.draft.choices[0];
  assert.equal(chooseUpgrade(run, choice), true);
  assert.equal(run.phase, 'playing');
  assert.equal(run.wave, 2);
  assert.equal(run.upgrades[choice], 1);
});

test('skipping a draft advances the wave and grants score', () => {
  const run = quietRun();
  clearWave(run);
  const before = run.score;
  assert.equal(skipDraft(run), true);
  assert.equal(run.phase, 'playing');
  assert.equal(run.wave, 2);
  assert.ok(run.score > before);
});

test('boss waves are every five waves and include a warlord', () => {
  assert.equal(isBossWave(4), false);
  assert.equal(isBossWave(5), true);
  assert.equal(isBossWave(10), true);
  const plan = waveComposition(makeRng(3), 5);
  assert.equal(plan.boss, true);
  assert.equal(plan.types[0], 'boss');
  const run = createRun({ seed: 3, startWave: 5 });
  assert.equal(run.spawnQueue[0], 'boss');
  assert.ok(run.waveTotal > 1);
});

test('a boss can be killed and unlocks its achievement', () => {
  const run = quietRun();
  const boss = addTarget(run, 'boss', 195, 100);
  boss.hp = 1;
  directShot(run, boss, { damage: 99 });
  assert.equal(run.stats.bossKills, 1);
  assert.ok(run.earned.includes('boss1'));
});

test('wind pushes arrows in its direction', () => {
  const left = quietRun();
  left.wind = -120;
  const right = quietRun();
  right.wind = 120;
  launchArrow(left, -Math.PI / 2, 0.5);
  launchArrow(right, -Math.PI / 2, 0.5);
  const startLeft = left.arrows[0].x;
  const startRight = right.arrows[0].x;
  step(left, 0.3);
  step(right, 0.3);
  assert.ok(left.arrows[0].x < startLeft);
  assert.ok(right.arrows[0].x > startRight);
});

test('royal volley is locked until purchased and then targets enemies', () => {
  const run = quietRun();
  assert.equal(castVolley(run), false);
  run.upgrades.volley = 1;
  const target = addTarget(run, 'slime', 120, 200);
  assert.equal(volleyReady(run), true);
  assert.equal(castVolley(run), true);
  assert.ok(run.stats.volleys === 1);
  assert.ok(run.volleyCooldown > 0);
  assert.ok(target);
});

test('firing uses cooldown and multishot arrows', () => {
  const run = quietRun();
  assert.equal(fire(run, -Math.PI / 2, 0.7), true);
  assert.equal(run.stats.shots, 1);
  assert.ok(run.cooldown > 0);
  assert.equal(fire(run, -Math.PI / 2, 0.7), false);
  step(run, 0.4);
  run.fx.multi = 5;
  assert.equal(fire(run, -Math.PI / 2, 0.7), true);
  assert.equal(run.stats.shots, 4);
});

test('a run can be ended with a summary', () => {
  const run = quietRun();
  run.outcome = 'quit';
  const summary = getSummary(run);
  assert.equal(summary.oath, 'knight');
  assert.equal(summary.outcome, 'quit');
  assert.equal(typeof summary.score, 'number');
  assert.equal(summary.daily, false);
});
