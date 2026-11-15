import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, drainEvents, interactionPrompt, step } from '../src/sim.js';
import { LEVELS } from '../src/levels.js';
import { makeGame, movePlayer, parkEnemies, tick } from './harness.js';

test('a chapter starts with a player, enemies and an objective', () => {
  const state = makeGame(1);
  assert.equal(state.phase, 'playing');
  assert.equal(state.player.hp, 3);
  assert.ok(state.enemies.length > 0);
  assert.equal(state.objective.type, 'collect');
  assert.equal(state.level.id, 'casa');
});

test('patrolling enemies keep finite positions', () => {
  const state = makeGame(1);
  tick(state, {}, 1.5);
  for (const enemy of state.enemies) {
    assert.equal(Number.isFinite(enemy.x), true);
    assert.equal(Number.isFinite(enemy.y), true);
  }
});

test('the player cannot walk through a wall', () => {
  const state = makeGame(1);
  state.player.x = 190;
  state.player.y = 50;
  tick(state, { moveX: 1, moveY: 0 }, 0.5);
  assert.ok(state.player.x < 200);
});

test('firing spends ammo and reloading refills the magazine', () => {
  const state = makeGame(1);
  parkEnemies(state);
  movePlayer(state, 100, 100);
  state.player.angle = 0;
  tick(state, { fire: true, aimX: 1, aimY: 0 }, 0.04);
  assert.equal(state.player.ammo, 7);
  state.player.ammo = 0;
  tick(state, { reload: true }, 0.02);
  assert.equal(state.player.reloading, true);
  tick(state, {}, 1.25);
  assert.equal(state.player.ammo, 8);
  assert.equal(state.player.reloading, false);
});

test('a pistol bullet can kill a gunman in two hits', () => {
  const state = makeGame(1);
  parkEnemies(state);
  const enemy = state.enemies[0];
  enemy.x = 120;
  enemy.y = 100;
  enemy.hp = 2;
  enemy.maxHp = 2;
  movePlayer(state, 100, 100);
  state.player.angle = 0;
  tick(state, { fire: true, aimX: 1, aimY: 0 }, 0.8);
  assert.equal(enemy.dead, true);
  assert.ok(state.stats.kills >= 1);
});

test('cover puts the player in a crouched state near a prop', () => {
  const state = makeGame(1);
  parkEnemies(state);
  movePlayer(state, 100, 195);
  tick(state, { cover: true }, 0.02);
  assert.equal(state.player.crouched, true);
  assert.ok(state.player.cover);
});

test('an unaware enemy can be taken down from behind', () => {
  const state = makeGame(1);
  parkEnemies(state);
  const enemy = state.enemies[0];
  enemy.x = 120;
  enemy.y = 100;
  enemy.angle = 0;
  enemy.state = 'idle';
  enemy.awareness = 0;
  movePlayer(state, 108, 100);
  tick(state, { action: true }, 0.02);
  assert.equal(enemy.dead, true);
  assert.equal(state.stats.stealthKills, 1);
});

test('ricochet signs reverse player bullets', () => {
  const state = makeGame(1);
  const sign = state.level.signs[0];
  state.bullets.push({
    x: sign.x - 8,
    y: sign.y + sign.h / 2,
    vx: 240,
    vy: 0,
    life: 1,
    damage: 1,
    team: 'player',
    owner: state.player,
    bounces: 1,
    dead: false
  });
  tick(state, {}, 0.08);
  const events = drainEvents(state);
  assert.ok(events.some((event) => event.type === 'ricochet'));
  assert.equal(state.bullets[0]?.vx < 0, true);
});

test('collecting the tape opens the exit and finishing the chapter sets a rank', () => {
  const state = makeGame(1);
  parkEnemies(state);
  state.player.x = state.objective.x;
  state.player.y = state.objective.y;
  tick(state, {}, 0.02);
  assert.equal(state.objective.done, true);
  assert.equal(state.exitOpen, true);
  state.player.x = state.level.exit.x + 10;
  state.player.y = state.level.exit.y + 10;
  tick(state, { action: true }, 0.02);
  assert.equal(state.phase, 'clear');
  assert.ok(['S', 'A', 'B', 'C'].includes(state.summary.rank));
});

test('the boss dies and opens the exit in chapter two', () => {
  const state = makeGame(2);
  parkEnemies(state);
  const boss = state.boss;
  boss.hp = 1;
  state.bullets.push({
    x: boss.x - 10,
    y: boss.y,
    vx: 300,
    vy: 0,
    life: 1,
    damage: 4,
    team: 'player',
    owner: state.player,
    bounces: 0,
    dead: false
  });
  tick(state, {}, 0.1);
  assert.equal(boss.dead, true);
  assert.equal(state.exitOpen, true);
});

test('the chase completes chapter five without auto-starting the finale', () => {
  const state = makeGame(5);
  assert.equal(state.mode, 'chase');
  state.chase.enemy.hp = 1;
  state.chase.bullets.push({
    x: state.chase.enemy.x - 4,
    y: state.chase.enemy.y,
    vx: 300,
    vy: 0,
    life: 1,
    damage: 1,
    team: 'player',
    dead: false
  });
  tick(state, {}, 0.1);
  assert.equal(state.chase.won, true);
  tick(state, {}, 1.4);
  assert.equal(state.phase, 'clear');
  assert.equal(state.summary.chapterId, 5);
});

test('the Metrò train hazard damages a player on the rails', () => {
  const state = makeGame(3);
  parkEnemies(state);
  movePlayer(state, 200, 150);
  const hazard = state.hazards[0];
  hazard.time = hazard.warnTime + 0.01;
  hazard.hit = false;
  tick(state, {}, 0.02);
  assert.ok(state.player.hp < 3);
  assert.ok(state.stats.damage >= 2);
});

test('the Lupara fires a pellet spread', () => {
  const state = makeGame(1);
  parkEnemies(state);
  state.player.weapon = 'lupara';
  state.player.ammo = 2;
  state.player.angle = 0;
  tick(state, { fire: true, aimX: 1, aimY: 0 }, 0.02);
  assert.equal(state.player.ammo, 1);
  assert.equal(state.bullets.length, 5);
});

test('an alerted enemy fires at the player', () => {
  const state = makeGame(1);
  parkEnemies(state);
  const enemy = state.enemies.find((entry) => entry.type === 'gunman');
  enemy.x = 160;
  enemy.y = 100;
  enemy.angle = Math.PI;
  enemy.state = 'combat';
  enemy.awareness = 1;
  enemy.fireCooldown = 0;
  movePlayer(state, 100, 100);
  tick(state, {}, 0.2);
  assert.ok(state.bullets.length > 0 || state.player.hp < 3);
});

test('killing the final boss clears the game', () => {
  const state = makeGame(6);
  const boss = state.boss;
  boss.hp = 1;
  state.bullets.push({
    x: boss.x - 8,
    y: boss.y,
    vx: 300,
    vy: 0,
    life: 1,
    damage: 5,
    team: 'player',
    owner: state.player,
    bounces: 0,
    dead: false
  });
  tick(state, {}, 0.12);
  assert.equal(boss.dead, true);
  assert.equal(state.phase, 'clear');
  assert.equal(state.chapterId, 6);
});

test('the player dies after losing all three hearts', () => {
  const state = makeGame(1);
  state.player.hp = 1;
  state.player.invuln = 0;
  state.bullets.push({
    x: state.player.x - 4,
    y: state.player.y,
    vx: 300,
    vy: 0,
    life: 1,
    damage: 1,
    team: 'enemy',
    dead: false
  });
  tick(state, {}, 0.08);
  assert.equal(state.phase, 'dead');
  assert.equal(state.player.hp, 0);
});

test('interaction prompts describe the available action', () => {
  const state = makeGame(1);
  parkEnemies(state);
  movePlayer(state, 100, 195);
  tick(state, { cover: true }, 0.02);
  assert.equal(interactionPrompt(state)?.key, 'Spazio');
});
