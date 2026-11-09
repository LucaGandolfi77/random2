import type {
  AbilityDef,
  CharacterRecord,
  CombatLogEntry,
  CombatState,
  CombatUnit,
  DamageType,
  EncounterDef,
  MapTile,
  StatusDef,
  SurfaceType
} from '@/core/types';
import { encounterById } from '@/data/encounters';
import { enemyById } from '@/data/enemies';
import { abilityById } from '@/data/abilities';
import { statusById } from '@/data/statuses';
import { itemById } from '@/data/items';
import { classById } from '@/data/classes';
import { clamp, modifier, rollDie, rollDice } from '@/core/rng';
import {
  armorClass,
  attackBonus,
  effectiveAttributes,
  initiativeBonus,
  maxHp,
  maxResource,
  weaponDamage
} from './character';

let logId = 1;

const log = (draft: CombatState, text: string, kind: CombatLogEntry['kind'] = 'info') => {
  draft.log.push({ id: logId++, text, kind });
  if (draft.log.length > 140) draft.log.shift();
};

const clone = (state: CombatState): CombatState => structuredClone(state);

const tileAt = (state: CombatState, x: number, y: number): MapTile | undefined => state.tiles[y]?.[x];

export const isBlockedTile = (tile: MapTile | undefined): boolean => !tile || tile.blocked;

const surfaceForChar = (ch: string): SurfaceType => {
  if (ch === '~') return 'water';
  if (ch === 'f') return 'fire';
  if (ch === 'o') return 'oil';
  if (ch === 'i') return 'ice';
  if (ch === 'a') return 'ash';
  if (ch === 'b') return 'ash';
  return 'none';
};

const groundForChar = (ch: string): string => {
  if (ch === 'b') return 'basalt';
  if (ch === '~') return 'water';
  if (ch === 'i') return 'ice';
  if (ch === 'f') return 'fire';
  if (ch === 'a') return 'ash';
  if (ch === ',') return 'grass';
  if (ch === 'T') return 'grass';
  return 'stone';
};

const parseTiles = (encounter: EncounterDef): MapTile[][] =>
  encounter.rows.map((row) =>
    Array.from(row).map((ch) => ({
      ground: groundForChar(ch),
      height: 0,
      blocked: ['#', '^', 'T', 'x', 'o'].includes(ch),
      surface: surfaceForChar(ch),
      barrel: ch === 'o',
      prop: ch === 'T' ? 'tree' : ch === '^' ? 'rubble' : undefined
    }))
  );

const placement = [
  { x: 1, y: 3 }, { x: 1, y: 6 }, { x: 2, y: 5 }, { x: 3, y: 8 }, { x: 2, y: 2 }
];

const createPartyUnit = (character: CharacterRecord, index: number, difficulty: string): CombatUnit => {
  const attrs = effectiveAttributes(character);
  const primary = classById[character.classId].primary;
  const hpBonus = difficulty === 'story' ? 1.2 : 1;
  const max = Math.round(maxHp(character) * hpBonus);
  return {
    id: character.id,
    charId: character.id,
    name: character.name,
    side: 'party',
    x: placement[index % placement.length].x,
    y: placement[index % placement.length].y,
    hp: Math.min(max, Math.max(1, Math.round(character.hp * hpBonus))),
    maxHp: max,
    ac: armorClass(character),
    attackBonus: attackBonus(character),
    damage: weaponDamage(character),
    power: modifier(attrs[primary]),
    initiative: 0,
    ap: 3,
    maxAp: 3,
    movement: classById[character.classId].id === 'rogue' ? 7 : classById[character.classId].id === 'ranger' ? 7 : 6,
    maxMovement: classById[character.classId].id === 'rogue' ? 7 : classById[character.classId].id === 'ranger' ? 7 : 6,
    speed: classById[character.classId].id === 'rogue' ? 7 : 6,
    resource: character.resource,
    maxResource: Math.max(1, maxResource(character)),
    abilities: character.abilities,
    cooldowns: {},
    statuses: [],
    downed: false,
    reactionUsed: false,
    color: '#d6b46e',
    icon: classById[character.classId].icon,
    role: character.classId
  };
};

const createEnemyUnit = (enemyId: string, x: number, y: number, name: string | undefined, difficulty: string, index: number): CombatUnit => {
  const def = enemyById[enemyId];
  const hpScale = difficulty === 'story' ? 0.82 : difficulty === 'tactician' ? 1.22 : 1;
  const dmgScale = difficulty === 'story' ? 0.85 : difficulty === 'tactician' ? 1.18 : 1;
  return {
    id: `${enemyId}_${index}`,
    enemyId,
    name: name ?? def.name,
    side: 'enemy',
    x,
    y,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    ac: def.ac + (difficulty === 'tactician' ? 1 : 0),
    attackBonus: def.attackBonus,
    damage: def.damage,
    power: Math.round(def.attackBonus / 2),
    initiative: 0,
    ap: 3,
    maxAp: 3,
    movement: def.speed,
    maxMovement: def.speed,
    speed: def.speed,
    resource: 6,
    maxResource: 6,
    abilities: [...def.abilities],
    cooldowns: {},
    statuses: [],
    downed: false,
    color: def.color,
    icon: def.portraitIcon,
    role: def.role,
    bossPhase: def.boss ? 1 : undefined,
    reactionUsed: false
  };
};

export const createCombat = (
  encounterId: string,
  characters: Record<string, CharacterRecord>,
  party: string[],
  difficulty: 'story' | 'balanced' | 'tactician'
): CombatState => {
  const encounter = encounterById[encounterId];
  const state: CombatState = {
    encounterId,
    encounterName: encounter.name,
    round: 1,
    order: [],
    turnIndex: 0,
    units: [],
    tiles: parseTiles(encounter),
    log: [],
    phase: 'active',
    selectedAbility: null,
    selectedAction: null,
    selectedUnitId: null,
    hoveredTile: null,
    rewards: { xp: encounter.rewardXp, gold: encounter.rewardGold, items: encounter.rewardItems ?? [] },
    objective: encounter.objective,
    waitingForAi: false,
    difficulty
  };

  let partyIndex = 0;
  for (const id of party) {
    const char = characters[id];
    if (!char || !char.recruited || !char.alive || char.hp <= 0) continue;
    const unit = createPartyUnit(char, partyIndex++, difficulty);
    // find a free placement tile
    let guard = 0;
    while (state.units.some((u) => u.x === unit.x && u.y === unit.y) && guard < 30) {
      unit.x = clamp(unit.x + 1, 1, encounter.width - 2);
      unit.y = clamp(unit.y + (guard % 2 === 0 ? 1 : -1), 1, encounter.height - 2);
      guard++;
    }
    unit.initiative = rollDie(20) + initiativeBonus(char);
    state.units.push(unit);
  }

  encounter.enemies.forEach((spawn, index) => {
    const unit = createEnemyUnit(spawn.enemyId, spawn.x, spawn.y, spawn.name, difficulty, index);
    unit.initiative = rollDie(20) + enemyById[spawn.enemyId].initiativeBonus;
    state.units.push(unit);
  });

  state.order = state.units
    .slice()
    .sort((a, b) => b.initiative - a.initiative || (a.side === 'party' ? -1 : 1))
    .map((u) => u.id);
  state.turnIndex = 0;
  state.selectedUnitId = state.order[0];
  const first = currentUnit(state);
  log(state, `Battle begins: ${encounter.name}.`, 'system');
  if (first) {
    log(state, `${first.name} acts first.`, 'info');
    beginTurn(state, first.id);
  }
  return state;
};

export const currentUnit = (state: CombatState): CombatUnit | undefined =>
  state.units.find((u) => u.id === state.order[state.turnIndex]);

export const activeParty = (state: CombatState): CombatUnit[] =>
  state.units.filter((u) => u.side === 'party' && !u.downed);

export const activeEnemies = (state: CombatState): CombatUnit[] =>
  state.units.filter((u) => u.side === 'enemy' && !u.downed);

export const unitAt = (state: CombatState, x: number, y: number): CombatUnit | undefined =>
  state.units.find((u) => !u.downed && u.x === x && u.y === y);

const anyUnitAt = (state: CombatState, x: number, y: number): CombatUnit | undefined =>
  state.units.find((u) => u.x === x && u.y === y);

const beginTurn = (state: CombatState, unitId: string) => {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit || unit.downed) return false;
  unit.ap = unit.maxAp;
  unit.reactionUsed = false;
  unit.movement = Math.max(1, unit.speed + unit.statuses.reduce((sum, s) => sum + (statusById[s.id]?.speedMod ?? 0), 0));
  for (const [id, cd] of Object.entries(unit.cooldowns)) {
    if (cd > 0) unit.cooldowns[id] = cd - 1;
  }
  for (const status of [...unit.statuses]) {
    const def = statusById[status.id];
    if (!def) continue;
    if (def.damagePerTurn) {
      damageUnit(state, unit, def.damagePerTurn, def.damageType ?? 'physical', 'status', true);
      log(state, `${unit.name} suffers ${def.damagePerTurn} ${def.damageType ?? 'physical'} damage from ${def.name}.`, 'status');
    }
    if (status.id === 'regenerating') {
      healUnit(state, unit, 3);
      log(state, `${unit.name} regenerates 3 health.`, 'heal');
    }
  }
  const stunned = unit.statuses.some((s) => statusById[s.id]?.skipTurn);
  if (stunned) log(state, `${unit.name} is stunned and loses this turn.`, 'status');
  checkEnd(state);
  return !stunned;
};

const tickStatuses = (state: CombatState, unit: CombatUnit) => {
  unit.statuses = unit.statuses
    .map((s) => ({ ...s, duration: s.duration - 1 }))
    .filter((s) => s.duration > 0);
};

export const endTurn = (state: CombatState): CombatState => {
  const draft = clone(state);
  if (draft.phase !== 'active') return draft;
  const current = currentUnit(draft);
  if (current) {
    tickStatuses(draft, current);
    current.ap = 0;
    current.movement = 0;
  }
  let guard = 0;
  do {
    draft.turnIndex++;
    if (draft.turnIndex >= draft.order.length) {
      draft.turnIndex = 0;
      draft.round++;
      log(draft, `Round ${draft.round}.`, 'system');
    }
    guard++;
    const next = currentUnit(draft);
    if (!next) break;
    if (next.downed) continue;
    draft.selectedUnitId = next.id;
    draft.selectedAbility = null;
    draft.selectedAction = null;
    const canAct = beginTurn(draft, next.id);
    if (!canAct) {
      tickStatuses(draft, next);
      continue;
    }
    draft.waitingForAi = next.side === 'enemy';
    log(draft, `${next.name} begins their turn.`, 'info');
    checkEnd(draft);
    return draft;
  } while (guard < 20);
  checkEnd(draft);
  return draft;
};

export const skipCurrentTurn = (state: CombatState): CombatState => {
  const draft = clone(state);
  const current = currentUnit(draft);
  if (current) {
    log(draft, `${current.name} loses their turn.`, 'status');
    tickStatuses(draft, current);
  }
  return endTurn(draft);
};

export const isStunned = (unit: CombatUnit) => unit.statuses.some((s) => statusById[s.id]?.skipTurn);

export const canAct = (state: CombatState, unitId: string) => {
  const current = currentUnit(state);
  return state.phase === 'active' && current?.id === unitId && !current.downed && !isStunned(current);
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const pathCost = (tile: MapTile, from: MapTile) => {
  const heightDiff = Math.abs(tile.height - from.height);
  if (heightDiff > 1) return Infinity;
  if (tile.surface === 'water') return 2;
  return 1;
};

const neighbors = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1]
];

export interface ReachableTile {
  x: number;
  y: number;
  cost: number;
  from?: { x: number; y: number };
}

export const reachableTiles = (state: CombatState, unit: CombatUnit): Map<string, ReachableTile> => {
  if (!unit || unit.downed) return new Map();
  const result = new Map<string, ReachableTile>();
  const startKey = `${unit.x},${unit.y}`;
  result.set(startKey, { x: unit.x, y: unit.y, cost: 0 });
  const open: ReachableTile[] = [{ x: unit.x, y: unit.y, cost: 0 }];
  const occupied = new Set(
    state.units.filter((u) => !u.downed && u.id !== unit.id).map((u) => `${u.x},${u.y}`)
  );
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const current = open.shift()!;
    if (current.cost > unit.movement) continue;
    const fromTile = tileAt(state, current.x, current.y)!;
    for (const [dx, dy] of neighbors) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= state.tiles[0].length || ny >= state.tiles.length) continue;
      if (occupied.has(`${nx},${ny}`)) continue;
      const tile = tileAt(state, nx, ny);
      if (isBlockedTile(tile)) continue;
      const cost = current.cost + pathCost(tile!, fromTile);
      if (!Number.isFinite(cost) || cost > unit.movement) continue;
      const key = `${nx},${ny}`;
      const existing = result.get(key);
      if (!existing || cost < existing.cost) {
        result.set(key, { x: nx, y: ny, cost, from: { x: current.x, y: current.y } });
        open.push({ x: nx, y: ny, cost });
      }
    }
  }
  return result;
};

export const pathTo = (reachable: Map<string, ReachableTile>, x: number, y: number) => {
  const path: { x: number; y: number }[] = [];
  let key = `${x},${y}`;
  let guard = 0;
  while (reachable.has(key) && guard < 50) {
    const tile = reachable.get(key)!;
    path.unshift({ x: tile.x, y: tile.y });
    if (!tile.from) break;
    key = `${tile.from.x},${tile.from.y}`;
    guard++;
  }
  return path;
};

const hasLineOfSight = (state: CombatState, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps <= 1) return true;
  for (let i = 1; i < steps; i++) {
    const x = Math.round(a.x + (dx * i) / steps);
    const y = Math.round(a.y + (dy * i) / steps);
    if (isBlockedTile(tileAt(state, x, y))) return false;
  }
  return true;
};

const coverBonus = (state: CombatState, attacker: CombatUnit, target: CombatUnit) => {
  if (distance(attacker, target) <= 1) return 0;
  let cover = 0;
  for (const [dx, dy] of neighbors) {
    const tile = tileAt(state, target.x + dx, target.y + dy);
    if (tile?.blocked || tile?.prop) cover++;
  }
  return cover > 0 ? 2 : 0;
};

const effectiveAc = (state: CombatState, attacker: CombatUnit, target: CombatUnit) => {
  const statusMod = target.statuses.reduce((sum, s) => sum + (statusById[s.id]?.acMod ?? 0), 0);
  return target.ac + statusMod + coverBonus(state, attacker, target);
};

const rageBonus = (unit: CombatUnit) => (unit.statuses.some((status) => status.id === 'enraged') ? 3 : 0);

const attackRoll = (state: CombatState, attacker: CombatUnit, target: CombatUnit) => {
  const attackStatus = attacker.statuses.reduce((sum, s) => sum + (statusById[s.id]?.attackMod ?? 0), 0);
  const hidden = attacker.statuses.some((s) => s.id === 'hidden');
  const die = rollDie(20);
  const total = die + attacker.attackBonus + attackStatus + (hidden ? 3 : 0);
  const ac = effectiveAc(state, attacker, target);
  const natural = die === 20 ? 'crit' : die === 1 ? 'miss' : null;
  let hit = false;
  if (natural === 'crit') hit = true;
  else if (natural === 'miss') hit = false;
  else hit = total >= ac;
  if (hidden) attacker.statuses = attacker.statuses.filter((s) => s.id !== 'hidden');
  log(
    state,
    `${attacker.name} attacks ${target.name}: d20 ${die} ${attacker.attackBonus + attackStatus + (hidden ? 3 : 0) >= 0 ? '+' : ''}${attacker.attackBonus + attackStatus + (hidden ? 3 : 0)} = ${total} vs AC ${ac} — ${hit ? (natural === 'crit' ? 'critical hit!' : 'hit') : 'miss'}.`,
    'check'
  );
  return { hit, crit: natural === 'crit' };
};

const damageUnit = (
  state: CombatState,
  target: CombatUnit,
  amount: number,
  type: DamageType,
  sourceId: string,
  ignoreWard = false
) => {
  if (target.downed) return;
  let value = Math.max(0, Math.round(amount));
  if (state.difficulty === 'story' && sourceId === 'party') value = Math.round(value * 1.2);
  if (state.difficulty === 'tactician' && sourceId === 'enemy') value = Math.round(value * 1.2);
  const warded = target.statuses.some((s) => s.id === 'warded') && !ignoreWard;
  if (warded) value = Math.max(0, value - 3);
  const enraged = target.statuses.some((s) => s.id === 'enraged');
  if (enraged && sourceId !== 'status') value += 2;
  target.hp = clamp(target.hp - value, 0, target.maxHp);
  state.lastDamage = { x: target.x, y: target.y, amount: value, type, unitId: target.id };
  log(state, `${target.name} takes ${value} ${type} damage${warded ? ' (warded)' : ''}.`, 'damage');
  if (target.hp <= 0) {
    target.downed = true;
    log(state, `${target.name} falls.`, 'damage');
  }
};

const healUnit = (state: CombatState, target: CombatUnit, amount: number) => {
  if (target.downed && target.hp <= 0) {
    target.downed = false;
    target.hp = 0;
  }
  const value = Math.max(0, Math.round(amount));
  target.hp = clamp(target.hp + value, 0, target.maxHp);
  state.lastDamage = { x: target.x, y: target.y, amount: value, type: 'holy', unitId: target.id, heal: true };
  log(state, `${target.name} recovers ${value} health.`, 'heal');
};

const applyStatus = (state: CombatState, unit: CombatUnit, statusId: string, duration: number) => {
  const def = statusById[statusId];
  if (!def) return;
  const existing = unit.statuses.find((s) => s.id === statusId);
  if (existing) existing.duration = Math.max(existing.duration, duration);
  else unit.statuses.push({ id: statusId, duration: duration || def.duration });
  log(state, `${unit.name} gains ${def.name} (${duration || def.duration} turns).`, def.beneficial ? 'status' : 'status');
};

const checkEnd = (state: CombatState) => {
  if (state.phase !== 'active') return;
  const enemies = activeEnemies(state);
  const party = activeParty(state);
  if (enemies.length === 0) {
    state.phase = 'victory';
    state.waitingForAi = false;
    log(state, 'Victory. The last enemy falls.', 'victory');
  } else if (party.length === 0) {
    state.phase = 'defeat';
    state.waitingForAi = false;
    log(state, 'The party has fallen.', 'defeat');
  }
};

const magicTypes: DamageType[] = ['fire', 'cold', 'lightning', 'shadow', 'holy', 'nature', 'psychic'];

const explodeBarrel = (state: CombatState, barrelX: number, barrelY: number) => {
  const tile = tileAt(state, barrelX, barrelY);
  if (!tile?.barrel) return;
  tile.barrel = false;
  tile.blocked = false;
  tile.prop = undefined;
  tile.surface = 'fire';
  log(state, 'An explosive barrel detonates!', 'status');
  for (const unit of state.units.filter((u) => !u.downed && distance(u, { x: barrelX, y: barrelY }) <= 1)) {
    damageUnit(state, unit, rollDice('2d6'), 'fire', 'environment');
  }
};

const applySurfaceEffects = (
  state: CombatState,
  ability: AbilityDef,
  center: { x: number; y: number },
  radius: number
) => {
  if (!ability.damageType) return;
  for (let y = 0; y < state.tiles.length; y++) {
    for (let x = 0; x < state.tiles[0].length; x++) {
      if (distance({ x, y }, center) > radius) continue;
      const tile = state.tiles[y][x];
      if (ability.damageType === 'fire') {
        if (tile.surface === 'oil') tile.surface = 'fire';
        if (tile.surface === 'fire' && tile.ground !== 'water') tile.surface = 'fire';
        if (tile.barrel) explodeBarrel(state, x, y);
      }
      if (ability.damageType === 'cold' && tile.surface === 'water') tile.surface = 'ice';
      if (ability.damageType === 'lightning' && tile.surface === 'water') {
        for (const unit of state.units.filter((u) => !u.downed && u.x === x && u.y === y)) {
          applyStatus(state, unit, 'shocked', 2);
        }
      }
    }
  }
};

const validateRange = (state: CombatState, attacker: CombatUnit, ability: AbilityDef, target: { x: number; y: number }) => {
  const dist = distance(attacker, target);
  if (ability.target === 'self') return true;
  if (dist > ability.range) return false;
  if (ability.range > 2 && ability.requiresLineOfSight !== false) return hasLineOfSight(state, attacker, target);
  return true;
};

export const selectAbility = (state: CombatState, abilityId: string | null): CombatState => {
  const draft = clone(state);
  draft.selectedAbility = abilityId;
  if (abilityId) draft.selectedAction = null;
  return draft;
};

export const selectCombatAction = (state: CombatState, action: CombatState['selectedAction']): CombatState => {
  const draft = clone(state);
  draft.selectedAction = action;
  if (action) draft.selectedAbility = null;
  return draft;
};

const opportunityAttack = (draft: CombatState, enemy: CombatUnit, mover: CombatUnit) => {
  if (enemy.downed || enemy.reactionUsed || isStunned(enemy)) return;
  if (mover.statuses.some((status) => status.id === 'disengaged')) return;
  enemy.reactionUsed = true;
  log(draft, `${enemy.name} seizes the opening as ${mover.name} moves away.`, 'status');
  const roll = attackRoll(draft, enemy, mover);
  if (!roll.hit) {
    log(draft, `${enemy.name}'s opportunity attack misses.`, 'check');
    return;
  }
  let amount = rollDice(enemy.damage);
  if (roll.crit) amount = Math.round(amount * 1.8);
  amount += rageBonus(enemy);
  damageUnit(draft, mover, amount, 'physical', enemy.side);
  log(draft, `${enemy.name} deals ${amount} damage with an opportunity attack.`, 'damage');
};

export const moveCurrentUnit = (state: CombatState, x: number, y: number): CombatState => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  if (!unit || draft.phase !== 'active' || unit.side !== 'party' || draft.waitingForAi) return draft;
  if (isStunned(unit)) return draft;
  const reachable = reachableTiles(draft, unit);
  const spot = reachable.get(`${x},${y}`);
  if (!spot) {
    log(draft, 'That position is out of reach.', 'system');
    return draft;
  }
  const start = { x: unit.x, y: unit.y };
  const watchers = draft.units.filter(
    (candidate) =>
      !candidate.downed &&
      candidate.side !== unit.side &&
      distance(candidate, start) <= 1 &&
      !candidate.reactionUsed
  );
  unit.x = x;
  unit.y = y;
  unit.movement = Math.max(0, unit.movement - spot.cost);
  draft.selectedAbility = null;
  draft.selectedAction = null;

  for (const enemy of watchers) {
    if (distance(enemy, unit) > 1) opportunityAttack(draft, enemy, unit);
  }

  const tile = tileAt(draft, x, y);
  if (tile?.surface === 'fire') {
    applyStatus(draft, unit, 'burning', 2);
    log(draft, `${unit.name} steps into fire.`, 'status');
  }
  if (tile?.surface === 'water') log(draft, `${unit.name} wades through the water.`, 'info');
  checkEnd(draft);
  if (draft.phase === 'active' && unit.downed) return endTurn(draft);
  return draft;
};

export const dashCurrentUnit = (state: CombatState): CombatState => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  if (!unit || draft.phase !== 'active' || unit.side !== 'party' || draft.waitingForAi) return draft;
  if (isStunned(unit)) return draft;
  if (unit.ap < 1) {
    log(draft, 'No actions remaining to Dash.', 'system');
    return draft;
  }
  unit.ap -= 1;
  unit.movement += unit.speed;
  draft.selectedAbility = null;
  draft.selectedAction = null;
  log(draft, `${unit.name} dashes, gaining ${unit.speed} movement.`, 'info');
  return draft;
};

export const disengageCurrentUnit = (state: CombatState): CombatState => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  if (!unit || draft.phase !== 'active' || unit.side !== 'party' || draft.waitingForAi) return draft;
  if (isStunned(unit)) return draft;
  if (unit.ap < 1) {
    log(draft, 'No actions remaining to Disengage.', 'system');
    return draft;
  }
  unit.ap -= 1;
  applyStatus(draft, unit, 'disengaged', 1);
  draft.selectedAbility = null;
  draft.selectedAction = null;
  log(draft, `${unit.name} disengages. Movement will not provoke opportunity attacks this turn.`, 'info');
  return draft;
};

export const shoveCurrentUnit = (state: CombatState, x: number, y: number): CombatState => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  const target = unitAt(draft, x, y);
  if (!unit || draft.phase !== 'active' || unit.side !== 'party' || draft.waitingForAi) return draft;
  if (!target || target.side === unit.side) {
    log(draft, 'Shove needs an adjacent enemy.', 'system');
    return draft;
  }
  if (distance(unit, target) > 1) {
    log(draft, `${target.name} is too far away to shove.`, 'system');
    return draft;
  }
  if (unit.ap < 1) {
    log(draft, 'No actions remaining to Shove.', 'system');
    return draft;
  }
  unit.ap -= 1;
  draft.selectedAbility = null;
  draft.selectedAction = null;
  const die = rollDie(20);
  const attack = die + Math.max(0, unit.power);
  const defense = 10 + Math.max(0, target.power);
  log(draft, `${unit.name} shoves ${target.name}: d20 ${die} + ${Math.max(0, unit.power)} = ${attack} vs ${defense}.`, 'check');
  if (attack < defense) {
    log(draft, `${target.name} holds their ground.`, 'info');
    return draft;
  }
  const dx = Math.sign(target.x - unit.x);
  const dy = Math.sign(target.y - unit.y);
  const nx = target.x + dx;
  const ny = target.y + dy;
  const tile = tileAt(draft, nx, ny);
  const occupant = draft.units.find((other) => !other.downed && other.id !== target.id && other.x === nx && other.y === ny);
  if (isBlockedTile(tile) || occupant || nx < 0 || ny < 0) {
    applyStatus(draft, target, 'stunned', 1);
    log(draft, `${target.name} slams into an obstacle and is Stunned.`, 'status');
    return draft;
  }
  target.x = nx;
  target.y = ny;
  log(draft, `${target.name} is shoved ${Math.abs(dx) + Math.abs(dy)} tile${Math.abs(dx) + Math.abs(dy) === 1 ? '' : 's'}.`, 'info');
  if (tile?.surface === 'fire') applyStatus(draft, target, 'burning', 2);
  if (tile?.surface === 'water') log(draft, `${target.name} splashes into the water.`, 'info');
  return draft;
};

export const helpCurrentUnit = (state: CombatState, x: number, y: number): CombatState => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  const target = anyUnitAt(draft, x, y);
  if (!unit || draft.phase !== 'active' || unit.side !== 'party' || draft.waitingForAi) return draft;
  if (!target || target.side !== unit.side) {
    log(draft, 'Help needs an adjacent ally.', 'system');
    return draft;
  }
  if (target.id === unit.id) {
    log(draft, 'You cannot Help yourself.', 'system');
    return draft;
  }
  if (distance(unit, target) > 1) {
    log(draft, `${target.name} is too far away to help.`, 'system');
    return draft;
  }
  if (unit.ap < 1) {
    log(draft, 'No actions remaining to Help.', 'system');
    return draft;
  }
  unit.ap -= 1;
  draft.selectedAbility = null;
  draft.selectedAction = null;
  if (target.downed) {
    target.downed = false;
    target.hp = Math.max(1, Math.ceil(target.maxHp * 0.12));
    log(draft, `${unit.name} stabilises ${target.name}. They return with ${target.hp} health.`, 'heal');
  } else {
    applyStatus(draft, target, 'blessed', 2);
    log(draft, `${unit.name} aids ${target.name}. They gain Blessed.`, 'status');
  }
  return draft;
};

const payAbilityCost = (draft: CombatState, unit: CombatUnit, ability: AbilityDef) => {
  unit.ap -= ability.apCost;
  unit.resource -= ability.resourceCost;
  if (ability.cooldown) unit.cooldowns[ability.id] = ability.cooldown + 1;
};

const canUseAbility = (state: CombatState, unit: CombatUnit, ability: AbilityDef) => {
  if (unit.downed) return false;
  if (unit.ap < ability.apCost) return false;
  if (unit.resource < ability.resourceCost) return false;
  if ((unit.cooldowns[ability.id] ?? 0) > 0) return false;
  return true;
};

const alliesInRadius = (state: CombatState, attacker: CombatUnit, center: { x: number; y: number }, radius: number) => {
  const side = attacker.side;
  return state.units.filter(
    (u) => !u.downed && u.side === side && distance(u, center) <= radius
  );
};

const enemiesInRadius = (state: CombatState, attacker: CombatUnit, center: { x: number; y: number }, radius: number) =>
  state.units.filter(
    (u) => !u.downed && u.side !== attacker.side && distance(u, center) <= radius
  );

const resolveDamageAbility = (
  draft: CombatState,
  attacker: CombatUnit,
  ability: AbilityDef,
  targetUnit: CombatUnit | null,
  center: { x: number; y: number }
) => {
  const radius = ability.radius ?? 0;
  const isAoe = radius > 0 || ability.target === 'ground';
  let targets: CombatUnit[];
  if (isAoe) targets = enemiesInRadius(draft, attacker, center, radius || 0);
  else if (targetUnit) targets = [targetUnit];
  else targets = [];
  if (targets.length === 0) {
    log(draft, `${ability.name} finds no target.`, 'system');
    return;
  }
  for (const target of targets) {
    let hit = true;
    let crit = false;
    let saved = false;
    if (isAoe && ability.damageType && magicTypes.includes(ability.damageType)) {
      const dc = 10 + 2 + Math.max(0, attacker.power);
      const saveBonus = 2 + Math.round(target.power / 2);
      const saveDie = rollDie(20);
      const saveRoll = saveDie + saveBonus;
      saved = saveRoll >= dc;
      log(
        draft,
        `${target.name} resists ${ability.name}: d20 ${saveDie} + ${saveBonus} = ${saveRoll} vs DC ${dc}${saved ? ' — success, half damage.' : '.'}`,
        'check'
      );
    } else {
      const roll = attackRoll(draft, attacker, target);
      hit = roll.hit;
      crit = roll.crit;
    }
    if (!hit) continue;
    let base = ability.dice ? rollDice(ability.dice) : 0;
    if (ability.dice && ability.scaling) base += Math.max(0, attacker.power);
    if (crit) base = Math.round(base * 1.8);
    base += rageBonus(attacker);
    if (saved) base = Math.max(1, Math.round(base * 0.5));
    const tile = tileAt(draft, target.x, target.y);
    if (ability.damageType === 'lightning' && tile?.surface === 'water') {
      base += rollDie(6);
      log(draft, `${target.name} is standing in water. The lightning arcs.`, 'status');
    }
    if (ability.damageType && base > 0) damageUnit(draft, target, base, ability.damageType, attacker.side);
    if (ability.status && (!saved || !magicTypes.includes(ability.damageType ?? 'physical'))) {
      applyStatus(draft, target, ability.status, ability.statusDuration ?? statusById[ability.status]?.duration ?? 2);
    }
    if (ability.healing && attacker.side === 'party') {
      healUnit(draft, attacker, Math.round(rollDice(ability.healing) / 2));
    }
  }
  applySurfaceEffects(draft, ability, center, radius);
};

const resolveSupportAbility = (
  draft: CombatState,
  attacker: CombatUnit,
  ability: AbilityDef,
  targetUnit: CombatUnit | null,
  center: { x: number; y: number }
) => {
  const radius = ability.radius ?? 0;
  const targets = radius > 0 ? alliesInRadius(draft, attacker, center, radius) : [targetUnit ?? attacker];
  for (const target of targets) {
    if (ability.healing) {
      const amount = rollDice(ability.healing) + (ability.scaling ? Math.max(0, attacker.power) : 0);
      healUnit(draft, target, amount);
    }
    if (ability.status) applyStatus(draft, target, ability.status, ability.statusDuration ?? 2);
  }
  log(draft, `${attacker.name} uses ${ability.name}.`, 'info');
};

export const useAbility = (state: CombatState, abilityId: string, targetX: number, targetY: number): CombatState => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  const ability = abilityById[abilityId];
  if (!unit || !ability || draft.phase !== 'active') return draft;
  if (draft.waitingForAi) return draft;
  if (unit.side === 'enemy' && !draft.waitingForAi) {
    // Enemy abilities are resolved by the AI turn function.
  }
  if (!canUseAbility(draft, unit, ability)) {
    log(draft, `${ability.name} is not ready.`, 'system');
    return draft;
  }
  const allowDownedTarget = Boolean(ability.tags?.includes('revive'));
  const targetUnit = (allowDownedTarget ? anyUnitAt(draft, targetX, targetY) : unitAt(draft, targetX, targetY)) ?? null;
  const center = ability.target === 'self' ? { x: unit.x, y: unit.y } : { x: targetX, y: targetY };
  if (!validateRange(draft, unit, ability, center)) {
    log(draft, `${unit.name} cannot reach that target with ${ability.name}.`, 'system');
    return draft;
  }
  if (ability.target === 'enemy' && (!targetUnit || targetUnit.side === unit.side)) {
    log(draft, `${ability.name} needs an enemy target.`, 'system');
    return draft;
  }
  if (ability.target === 'ally' && (!targetUnit || targetUnit.side !== unit.side)) {
    log(draft, `${ability.name} needs an ally target.`, 'system');
    return draft;
  }
  if (ability.target === 'ground' && isBlockedTile(tileAt(draft, targetX, targetY))) {
    log(draft, 'That ground cannot be targeted.', 'system');
    return draft;
  }
  payAbilityCost(draft, unit, ability);
  draft.selectedAbility = null;

  const damaging = Boolean(ability.damageType && ability.dice);
  if (damaging) {
    resolveDamageAbility(draft, unit, ability, targetUnit, center);
  } else {
    resolveSupportAbility(draft, unit, ability, targetUnit, center);
    if (ability.target === 'enemy' && targetUnit && ability.damageType && !ability.dice && ability.status) {
      applyStatus(draft, targetUnit, ability.status, ability.statusDuration ?? 2);
    }
  }

  // Special summoning.
  if (ability.id === 'beast_call') {
    const enemy = createEnemyUnit('mire_hound', clamp(center.x - 1, 1, draft.tiles[0].length - 2), center.y, 'Called Wolf', draft.difficulty, Date.now() % 10000);
    enemy.side = 'party';
    enemy.name = 'Grey Wolf';
    enemy.color = '#8d9a76';
    enemy.icon = '🐺';
    enemy.abilities = ['enemy_strike'];
    enemy.initiative = 0;
    draft.units.push(enemy);
    draft.order.push(enemy.id);
    log(draft, 'A grey wolf answers the call and joins the fight.', 'status');
  }

  checkEnd(draft);
  return draft;
};

export const basicAttack = (state: CombatState, targetX: number, targetY: number): CombatState => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  if (!unit || draft.phase !== 'active' || draft.waitingForAi) return draft;
  const target = unitAt(draft, targetX, targetY);
  if (!target || target.side === unit.side) {
    log(draft, 'Choose an enemy to attack.', 'system');
    return draft;
  }
  const range = unit.role === 'ranger' ? 7 : unit.role === 'mage' || unit.role === 'warlock' ? 3 : 1;
  if (distance(unit, target) > range) {
    log(draft, `${target.name} is out of range.`, 'system');
    return draft;
  }
  if (range > 2 && !hasLineOfSight(draft, unit, target)) {
    log(draft, 'The shot is blocked.', 'system');
    return draft;
  }
  if (unit.ap < 1) {
    log(draft, 'No actions remaining.', 'system');
    return draft;
  }
  unit.ap -= 1;
  const roll = attackRoll(draft, unit, target);
  if (roll.hit) {
    let amount = rollDice(unit.damage);
    if (roll.crit) amount = Math.round(amount * 1.8);
    amount += rageBonus(unit);
    damageUnit(draft, target, amount, 'physical', unit.side);
    applySurfaceEffects(
      draft,
      { ...abilityById['enemy_strike'], damageType: 'physical', dice: undefined },
      target,
      0
    );
  }
  draft.selectedAbility = null;
  checkEnd(draft);
  return draft;
};

const bestTargetFor = (state: CombatState, unit: CombatUnit, range: number) => {
  const enemies = state.units.filter((u) => !u.downed && u.side !== unit.side);
  const inRange = enemies.filter((e) => distance(unit, e) <= range && (range <= 2 || hasLineOfSight(state, unit, e)));
  const pool = inRange.length ? inRange : enemies;
  return pool.sort((a, b) => {
    const lowHpA = a.hp / a.maxHp;
    const lowHpB = b.hp / b.maxHp;
    return lowHpA - lowHpB;
  })[0];
};

const moveTowards = (state: CombatState, unit: CombatUnit, target: CombatUnit, desiredRange: number) => {
  const reachable = reachableTiles(state, unit);
  let best: { x: number; y: number; cost: number; score: number } | null = null;
  for (const tile of reachable.values()) {
    if (tile.cost === 0) continue;
    const dist = distance(tile, target);
    const score = Math.abs(dist - desiredRange) * 10 + tile.cost;
    if (!best || score < best.score) best = { ...tile, score };
  }
  if (best && best.score < distance(unit, target) * 10) {
    unit.x = best.x;
    unit.y = best.y;
    unit.movement = Math.max(0, unit.movement - best.cost);
    log(state, `${unit.name} moves.`, 'info');
  }
};

const maybeBossPhase = (state: CombatState, unit: CombatUnit) => {
  const def = unit.enemyId ? enemyById[unit.enemyId] : null;
  if (!def?.boss || !def.phases) return;
  const phase = unit.bossPhase ?? 1;
  const threshold = phase === 1 ? 0.6 : 0.3;
  if (unit.hp / unit.maxHp <= threshold && phase < def.phases) {
    unit.bossPhase = phase + 1;
    applyStatus(state, unit, 'enraged', 99);
    log(state, `${unit.name} enters phase ${unit.bossPhase}! The air tears open.`, 'system');
    if (unit.enemyId === 'crownbound_veyra' || unit.enemyId === 'drowned_saint') {
      for (let i = 0; i < (unit.bossPhase === 3 ? 2 : 1); i++) {
        const echo = createEnemyUnit('crown_echo', clamp(unit.x - 2 + i, 1, state.tiles[0].length - 2), clamp(unit.y + 1, 1, state.tiles.length - 2), 'Crown Echo', state.difficulty, Date.now() % 10000 + i);
        echo.initiative = 0;
        echo.hp = Math.round(echo.maxHp * 0.7);
        echo.maxHp = echo.hp;
        state.units.push(echo);
        state.order.splice(state.turnIndex + 1, 0, echo.id);
        log(state, 'A Crown Echo steps out of the wound in the air.', 'status');
      }
    }
  }
};

export const takeEnemyTurn = (state: CombatState): CombatState => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  if (!unit || unit.side !== 'enemy' || draft.phase !== 'active') return draft;
  if (unit.downed) return endTurn(draft);
  if (isStunned(unit)) {
    log(draft, `${unit.name} is stunned.`, 'status');
    return skipCurrentTurn(draft);
  }
  maybeBossPhase(draft, unit);
  const def = unit.enemyId ? enemyById[unit.enemyId] : null;
  const target = bestTargetFor(draft, unit, 8);
  if (!target) {
    return endTurn(draft);
  }

  // Support units heal wounded allies first.
  if (def?.ai === 'support' || unit.abilities.includes('enemy_heal')) {
    const wounded = state.units
      .filter((u) => !u.downed && u.side === unit.side && u.id !== unit.id && u.hp / u.maxHp < 0.55)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (wounded && unit.abilities.includes('enemy_heal') && distance(unit, wounded) <= 5 && unit.resource >= 2 && unit.ap >= 1) {
      const ability = abilityById['enemy_heal'];
      payAbilityCost(draft, unit, ability);
      healUnit(draft, wounded, rollDice('1d8') + 2);
      checkEnd(draft);
      return endTurn(draft);
    }
  }

  // Choose the best usable offensive ability in range.
  const available = unit.abilities
    .map((id) => abilityById[id])
    .filter((a): a is AbilityDef => Boolean(a && canUseAbility(draft, unit, a) && a.damageType && a.dice))
    .sort((a, b) => (b.ai ?? 0) - (a.ai ?? 0));
  let chosen = available.find((a) => {
    const range = a.range;
    return distance(unit, target) <= range && (range <= 2 || hasLineOfSight(draft, unit, target));
  });

  if (!chosen) {
    const desired = unit.role === 'archer' || unit.role === 'mage' ? 5 : 1;
    const start = { x: unit.x, y: unit.y };
    moveTowards(draft, unit, target, desired);
    const watchers = draft.units.filter(
      (candidate) =>
        !candidate.downed &&
        candidate.side === 'party' &&
        distance(candidate, start) <= 1 &&
        !candidate.reactionUsed &&
        distance(candidate, unit) > 1
    );
    for (const watcher of watchers) opportunityAttack(draft, watcher, unit);
    if (draft.phase !== 'active' || unit.downed) return endTurn(draft);
    chosen = available.find((a) => {
      const range = a.range;
      return distance(unit, target) <= range && (range <= 2 || hasLineOfSight(draft, unit, target));
    });
  }

  if (chosen) {
    const targetTile = chosen.target === 'self' ? unit : target;
    payAbilityCost(draft, unit, chosen);
    log(draft, `${unit.name} uses ${chosen.name}.`, 'info');
    if (chosen.healing) {
      healUnit(draft, target, rollDice(chosen.healing));
    } else {
      resolveDamageAbility(draft, unit, chosen, target, { x: targetTile.x, y: targetTile.y });
    }
  } else if (distance(unit, target) <= 1 || (unit.role === 'archer' && distance(unit, target) <= 7)) {
    if (unit.ap >= 1) {
      unit.ap -= 1;
      const roll = attackRoll(draft, unit, target);
      if (roll.hit) {
        let amount = rollDice(unit.damage);
        if (roll.crit) amount = Math.round(amount * 1.8);
        amount += rageBonus(unit);
        damageUnit(draft, target, amount, 'physical', 'enemy');
      }
    }
  } else {
    log(draft, `${unit.name} circles the party, waiting for an opening.`, 'info');
  }
  checkEnd(draft);
  return endTurn(draft);
};

export const useCombatConsumable = (state: CombatState, itemId: string): { state: CombatState; consumed: boolean; message: string } => {
  const draft = clone(state);
  const unit = currentUnit(draft);
  const item = itemById[itemId];
  if (!unit || !item || draft.phase !== 'active' || unit.side !== 'party' || draft.waitingForAi) {
    return { state: draft, consumed: false, message: 'You cannot use that now.' };
  }
  if (unit.ap < 1) return { state: draft, consumed: false, message: 'No actions remaining.' };
  if (item.category !== 'potion' && item.category !== 'scroll') {
    return { state: draft, consumed: false, message: `${item.name} cannot be used in combat.` };
  }
  if (item.effect?.heal) {
    const amount = rollDice(item.effect.heal) + 2;
    unit.ap -= 1;
    healUnit(draft, unit, amount);
    checkEnd(draft);
    return { state: draft, consumed: true, message: `${unit.name} drinks ${item.name} and recovers ${amount} health.` };
  }
  if (item.effect?.resource) {
    unit.ap -= 1;
    unit.resource = clamp(unit.resource + item.effect.resource, 0, unit.maxResource);
    log(draft, `${unit.name} recovers ${item.effect.resource} resource.`, 'heal');
    return { state: draft, consumed: true, message: `${unit.name} recovers ${item.effect.resource} resource.` };
  }
  if (item.effect?.status === 'antidote') {
    unit.ap -= 1;
    unit.statuses = unit.statuses.filter((s) => s.id !== 'poisoned' && s.id !== 'burning');
    log(draft, `${unit.name} is cured of common afflictions.`, 'status');
    return { state: draft, consumed: true, message: `${unit.name} is cured of common afflictions.` };
  }
  return { state: draft, consumed: false, message: `${item.name} cannot be used in this way.` };
};

export const combatVictoryRewards = (state: CombatState) => {
  const encounter = encounterById[state.encounterId];
  return {
    xp: encounter.rewardXp,
    gold: encounter.rewardGold,
    items: encounter.rewardItems ?? [],
    encounterName: encounter.name,
    victoryText: encounter.victoryText
  };
};

export const itemName = (id: string) => itemById[id]?.name ?? id;

export const abilityUsable = (state: CombatState, unit: CombatUnit, abilityId: string): boolean => {
  const ability = abilityById[abilityId];
  if (!ability) return false;
  return canUseAbility(state, unit, ability);
};

export const abilityRange = (abilityId: string) => abilityById[abilityId]?.range ?? 1;

export const combatDistance = distance;
