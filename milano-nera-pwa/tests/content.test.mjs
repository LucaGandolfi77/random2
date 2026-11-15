import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, CHAPTER_BY_ID, LEVELS, rankFor, formatTime } from '../src/content.js';
import { circleCollides } from '../src/collision.js';

test('the campaign has six chapters across three acts', () => {
  assert.equal(CHAPTERS.length, 6);
  assert.deepEqual(CHAPTERS.map((chapter) => chapter.id), [1, 2, 3, 4, 5, 6]);
  assert.ok(CHAPTER_BY_ID[3].level === 'metro');
  assert.ok(CHAPTER_BY_ID[4].level === 'parco');
  assert.ok(CHAPTER_BY_ID[5].chase);
  assert.ok(CHAPTER_BY_ID[6].level === 'darsena');
  assert.deepEqual([...new Set(CHAPTERS.map((chapter) => chapter.act))], [1, 2, 3]);
});

test('every level has a valid start, objective and exit', () => {
  for (const level of Object.values(LEVELS)) {
    assert.ok(level.width >= 384 && level.height >= 216);
    assert.ok(level.start.x > 0 && level.start.y > 0);
    assert.ok(level.objective && level.objective.type);
    if (level.objective.type === 'collect') assert.ok(Number.isFinite(level.objective.x));
    if (level.objective.type === 'boss') assert.ok(level.objective.boss);
    if (!level.objective.autoComplete) assert.ok(level.exit, `${level.id} needs an exit`);
  }
});

test('no player or enemy spawn starts inside solid geometry', () => {
  for (const level of Object.values(LEVELS)) {
    const solids = [...level.walls, ...level.props.filter((prop) => prop.solid)];
    assert.equal(circleCollides(level.start.x, level.start.y, 6, solids), false, `${level.id} start`);
    for (const enemy of level.enemies) {
      assert.equal(circleCollides(enemy.x, enemy.y, 6, solids), false, `${level.id} ${enemy.type}`);
    }
  }
});

test('the main objective and boss of each level are reachable on foot', () => {
  for (const level of Object.values(LEVELS)) {
    const solids = [...level.walls, ...level.props.filter((prop) => prop.solid)];
    const step = 8;
    const startX = Math.round(level.start.x / step);
    const startY = Math.round(level.start.y / step);
    const seen = new Set([`${startX},${startY}`]);
    const queue = [[startX, startY]];
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx * step >= level.width || ny * step >= level.height) continue;
        const key = `${nx},${ny}`;
        if (seen.has(key) || circleCollides(nx * step, ny * step, 5, solids)) continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    const reachable = (x, y) => seen.has(`${Math.round(x / step)},${Math.round(y / step)}`);
    if (level.objective.type === 'collect') {
      assert.equal(reachable(level.objective.x, level.objective.y), true, `${level.id} objective`);
    }
    if (level.exit) {
      assert.equal(reachable(level.exit.x + level.exit.w / 2, level.exit.y + level.exit.h / 2), true, `${level.id} exit`);
    }
    for (const boss of level.enemies.filter((enemy) => enemy.boss)) {
      assert.equal(reachable(boss.x, boss.y), true, `${level.id} boss`);
    }
  }
});

test('ranks reward speed, accuracy, stealth and a clean run', () => {
  const chapter = CHAPTER_BY_ID[1];
  const good = rankFor({ time: 30, shots: 10, hits: 8, stealthKills: 2, damage: 0 }, chapter, 0);
  const bad = rankFor({ time: 240, shots: 10, hits: 1, stealthKills: 0, damage: 6 }, chapter, 1);
  assert.equal(good, 'S');
  assert.equal(bad, 'C');
  assert.equal(formatTime(65), '1:05');
});
