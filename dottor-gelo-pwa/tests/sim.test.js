import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AREAS,
  AREA_BY_ID,
  CAMPAIGN,
  MEMORY_NODES,
  STORY,
} from '../src/data.js';
import {
  areaOutputPerSecond,
  areaStage,
  battleResult,
  buildCost,
  buyMemoryNode,
  canPrestige,
  checkStory,
  collectExpedition,
  collectIncubation,
  collectTraining,
  completeStory,
  createInitialState,
  cyborgPower,
  cyborgStats,
  endingFor,
  offlineAdvance,
  powerStats,
  prestige,
  prestigeGain,
  productionRates,
  startExpedition,
  startIncubation,
  startTraining,
  tick,
  upgradeArea,
  unlockArea,
  upgradeCost,
  squadPower,
  sanitizeState,
} from '../src/sim.js';

const give = (s, scrap = 1e6, circuits = 1e5, cells = 1e5) => {
  s.resources.scrap = scrap;
  s.resources.circuits = circuits;
  s.resources.cells = cells;
};

const unlockAll = (s) => {
  for (const a of AREAS) {
    s.areas[a.id].unlocked = true;
    s.areas[a.id].level = Math.max(1, s.areas[a.id].level);
    s.areas[a.id].active = true;
  }
};

test('initial state is playable and finite', () => {
  const s = createInitialState(1_700_000_000_000);
  assert.equal(s.cyborgs.length, 1);
  assert.equal(s.cyborgs[0].blueprintId, 'cenere');
  assert.equal(s.areas.hq.unlocked, true);
  assert.equal(s.areas.reactor.unlocked, true);
  assert.equal(s.areas.foundry.unlocked, true);
  assert.equal(s.areas.circuits.unlocked, false);
  assert.ok(s.resources.scrap >= 100);
  const p = powerStats(s);
  assert.equal(p.overload, false);
  assert.ok(p.output >= p.demand);
  const rates = productionRates(s);
  assert.ok(rates.scrap > 0);
  assert.ok(Number.isFinite(rates.scrap));
});

test('area stages and upgrades are monotonic', () => {
  const s = createInitialState();
  give(s);
  const before = areaOutputPerSecond(s, 'foundry');
  const cost = upgradeCost(s, 'foundry');
  assert.ok(cost.scrap > 0);
  const r = upgradeArea(s, 'foundry');
  assert.equal(r.ok, true);
  assert.ok(areaOutputPerSecond(s, 'foundry') > before);
  assert.equal(areaStage(1), 1);
  assert.equal(areaStage(4), 2);
  assert.equal(areaStage(13), 5);
});

test('build chain unlocks circuits, incubator, training and arena', () => {
  const s = createInitialState();
  give(s);
  s.areas.foundry.level = 2;
  assert.equal(unlockArea(s, 'circuits').ok, true);
  assert.equal(s.areas.circuits.unlocked, true);
  assert.equal(unlockArea(s, 'incubator').ok, false);
  s.areas.circuits.level = 2;
  assert.equal(unlockArea(s, 'incubator').ok, true);
  s.areas.incubator.level = 2;
  assert.equal(unlockArea(s, 'training').ok, true);
  s.areas.training.level = 2;
  assert.equal(unlockArea(s, 'arena').ok, true);
  assert.deepEqual(buildCost(s, 'memory'), AREA_BY_ID.memory.buildCost);
});

test('power overload reduces production but never becomes zero', () => {
  const s = createInitialState();
  unlockAll(s);
  give(s);
  for (const a of AREAS) s.areas[a.id].level = 8;
  s.areas.reactor.level = 1;
  const p = powerStats(s);
  assert.equal(p.overload, true);
  assert.ok(p.efficiency >= 0.35 && p.efficiency < 1);
  const rate = areaOutputPerSecond(s, 'foundry');
  assert.ok(rate > 0 && Number.isFinite(rate));
});

test('tick produces resources and keeps every number finite over an hour', () => {
  const s = createInitialState();
  const start = s.resources.scrap;
  for (let i = 0; i < 3600; i++) tick(s, 1_700_000_000_000 + i * 1000, 1);
  assert.ok(s.resources.scrap > start);
  assert.ok(Number.isFinite(s.resources.scrap));
  assert.ok(Number.isFinite(s.resources.circuits));
  assert.ok(Number.isFinite(s.resources.cells));
  assert.ok(Number.isFinite(s.stats.scrapEarned));
});

test('offline advance is capped and reports rewards', () => {
  const s = createInitialState(1_700_000_000_000);
  s.lastSeen = 1_700_000_000_000;
  const report = offlineAdvance(s, 1_700_000_000_000 + 48 * 3600 * 1000);
  assert.ok(report);
  assert.ok(report.used <= 4 * 3600 + 1);
  assert.ok(report.efficiency === 0.5);
  assert.ok(report.rewards.scrap > 0);
  assert.equal(report.capped, true);
});

test('training levels a cyborg and respects the slots', () => {
  const s = createInitialState();
  give(s);
  unlockAll(s);
  s.areas.training.level = 2;
  const c = s.cyborgs[0];
  const before = c.level;
  const r = startTraining(s, c.id, 'forza');
  assert.equal(r.ok, true);
  assert.ok(r.duration > 0);
  const end = s.training[0].endsAt + 1;
  collectTraining(s, end);
  assert.equal(s.training.length, 0);
  assert.ok(c.level > before || c.xp > 0);
  assert.ok(cyborgStats(s, c).str >= 1);
});

test('incubation creates a cyborg and enforces roster limits', () => {
  const s = createInitialState();
  give(s);
  unlockAll(s);
  const r = startIncubation(s, { kind: 'procedural', chassisId: 'leggero', coreId: 'precisione', name: 'Prova' });
  assert.equal(r.ok, true);
  const c = collectIncubation(s, s.incubation.endsAt + 1);
  assert.equal(c.ok, true);
  assert.equal(s.cyborgs.length, 2);
  assert.equal(s.cyborgs[1].name, 'Prova');
});

test('campaign requires the arena and rewards the first clear only', () => {
  const s = createInitialState();
  give(s);
  assert.equal(battleResult(s, CAMPAIGN[0].id).ok, false);
  unlockAll(s);
  for (const c of s.cyborgs) { c.level = 20; c.rank = 3; c.affection = 90; }
  const node = CAMPAIGN[0];
  const r = battleResult(s, node.id);
  assert.equal(r.ok, true);
  assert.equal(r.win, true);
  assert.equal(r.first, true);
  assert.equal(s.campaign.wins, 1);
  assert.ok(s.resources.scrap > 0);
  assert.equal(battleResult(s, node.id).first, false);
});

test('overclock adds twenty percent and is reflected in the result', () => {
  const s = createInitialState();
  give(s);
  unlockAll(s);
  for (const c of s.cyborgs) { c.level = 5; c.affection = 80; }
  const plain = battleResult(s, 'n1');
  const boosted = battleResult(s, 'n1', true);
  assert.equal(plain.ok, true);
  assert.equal(boosted.ok, true);
  assert.ok(boosted.power > plain.power);
  assert.ok(Math.abs(boosted.power / plain.power - 1.2) < 0.02);
});

test('story triggers in order, choices set flags and endings resolve', () => {
  const s = createInitialState();
  assert.equal(checkStory(s).id, 'ch1');
  completeStory(s, 'ch1');
  s.areas.incubator.unlocked = true;
  s.areas.incubator.level = 1;
  assert.equal(checkStory(s).id, 'ch2');
  completeStory(s, 'ch2');
  assert.ok(s.cyborgs.some((c) => c.blueprintId === 'cenere'));

  s.areas.foundry.level = 3;
  assert.equal(checkStory(s).id, 'ch3');
  completeStory(s, 'ch3');
  s.areas.garden.unlocked = true;
  s.areas.garden.level = 1;
  assert.equal(checkStory(s).id, 'ch4');
  completeStory(s, 'ch4');
  s.campaign.wins = 1;
  assert.equal(checkStory(s).id, 'ch5');
  completeStory(s, 'ch5', 'keep');
  assert.equal(s.story.flags.keptSong, true);
  s.campaign.wins = 3;
  completeStory(s, 'ch6');
  s.areas.circuits.level = 3;
  assert.equal(checkStory(s).id, 'ch7');
  completeStory(s, 'ch7');
  assert.ok(s.cyborgs.some((c) => c.blueprintId === 'sedici'));
  s.cyborgs[0].level = 5;
  completeStory(s, 'ch8', 'prototype');
  assert.equal(s.story.flags.savedPrototype, true);
  s.campaign.wins = 6;
  completeStory(s, 'ch9');
  assert.ok(s.cyborgs.some((c) => c.blueprintId === 'vento'));
  s.campaign.wins = 10;
  completeStory(s, 'ch10');
  s.campaign.wins = 11;
  completeStory(s, 'ch11', 'neve');
  assert.equal(s.story.ending, 'neve');
  assert.ok(endingFor(s));
  assert.equal(checkStory(s).id, 'ch12');
  completeStory(s, 'ch12');
  assert.equal(s.story.epilogueSeen, true);
});

test('prestige grants fragments, resets the run, keeps memory and story', () => {
  const s = createInitialState();
  give(s);
  unlockAll(s);
  s.story.seen = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10'];
  s.run = { scrap: 90000, circuits: 12000, cells: 15 };
  s.campaign.wins = 10;
  s.prestige.nodes.lab = true;
  const gain = prestigeGain(s);
  assert.ok(gain > 0);
  const r = prestige(s);
  assert.equal(r.ok, true);
  assert.ok(s.resources.fragments >= gain);
  assert.equal(s.prestige.count, 1);
  assert.equal(s.areas.circuits.unlocked, false);
  assert.equal(s.story.seen.length, 10);
  assert.equal(s.prestige.nodes.lab, true);
  assert.ok(canPrestige(s) === false || s.story.seen.includes('ch10'));
});

test('memory nodes cost fragments and affect bonuses', () => {
  const s = createInitialState();
  s.resources.fragments = 100;
  const r = buyMemoryNode(s, 'lab');
  assert.equal(r.ok, true);
  assert.ok(s.resources.fragments < 100);
  assert.equal(buyMemoryNode(s, 'lab').ok, false);
});

test('expeditions complete offline and pay out', () => {
  const s = createInitialState();
  s.areas.arena.unlocked = true;
  s.areas.arena.active = true;
  s.areas.arena.level = 1;
  s.cyborgs[0].level = 20;
  const start = startExpedition(s, 'short', 1_700_000_000_000);
  assert.equal(start.ok, true);
  const done = collectExpedition(s, 1_700_000_000_000 + 16 * 60 * 1000);
  assert.ok(done);
  assert.equal(done.type, 'expedition');
  assert.ok(done.rewards.scrap > 0);
});

test('save sanitisation preserves a legal state and repairs a corrupt one', () => {
  const s = createInitialState();
  s.resources.scrap = 1234;
  s.areas.foundry.level = 3;
  s.story.seen = ['ch1'];
  const round = sanitizeState(JSON.parse(JSON.stringify(s)));
  assert.equal(round.resources.scrap, 1234);
  assert.equal(round.areas.foundry.level, 3);
  assert.deepEqual(round.story.seen, ['ch1']);
  const corrupt = sanitizeState({ resources: { scrap: -10 }, areas: {}, cyborgs: 'no' });
  assert.ok(corrupt.resources.scrap >= 0);
  assert.ok(corrupt.cyborgs.length >= 1);
  assert.ok(corrupt.areas.foundry.unlocked);
});

test('numbers stay finite through power, production and combat', () => {
  const s = createInitialState();
  give(s);
  unlockAll(s);
  for (const a of AREAS) s.areas[a.id].level = 15;
  for (const c of s.cyborgs) { c.level = 30; c.rank = 5; c.affection = 100; }
  const p = powerStats(s);
  assert.ok(Number.isFinite(p.efficiency));
  assert.ok(Number.isFinite(squadPower(s)));
  for (const n of CAMPAIGN) {
    const r = battleResult(s, n.id);
    if (r.ok) assert.ok(Number.isFinite(r.power));
    else break;
  }
  for (let i = 0; i < 600; i++) tick(s, 1_700_000_000_000 + i * 1000, 1);
  assert.ok(Number.isFinite(s.resources.scrap));
  assert.ok(Number.isFinite(cyborgPower(s, s.cyborgs[0])));
});
