/**
 * The expedition auto-battler. A battle is a small deterministic simulation over
 * combatants with attack timers, shields, taunts, heals and seeded damage. The
 * React layer only steps it and renders the resulting log and health bars.
 */

import {
  HEROES,
  HERO_ORDER,
  MAX_HERO_LEVEL,
  STAGES,
  enemyStatsFor,
  firstClearReward,
  fullResources,
  heroXpToNext,
  stageById,
  stageEnemyCount,
  stageReward,
  stageXp,
} from './content';
import { nextRandom } from './rng';
import type {
  BattleLogEntry,
  BattleState,
  Combatant,
  GameState,
  HeroId,
  Resources,
} from './types';
import { grantResources } from './engine';

export interface StartBattleResult {
  ok: boolean;
  message: string;
  battle?: BattleState;
}

export interface AwardResult {
  awarded: boolean;
  win: boolean;
  message: string;
  reward?: Resources;
  levelsGained: string[];
}

function heroScale(level: number, base: number, growth: number, gear: boolean): number {
  const scaled = base * (1 + Math.max(0, level - 1) * growth);
  return Math.round(scaled * (gear ? 1.15 : 1));
}

export function heroCombatant(state: GameState, heroId: HeroId): Combatant {
  const def = HEROES[heroId];
  const progress = state.heroes[heroId];
  const gear = state.tech.expedition_gear;
  const maxHp = heroScale(progress.level, def.baseHp, 0.17, gear);
  return {
    id: `hero-${heroId}`,
    name: def.name,
    side: 'hero',
    heroClass: def.heroClass,
    hp: maxHp,
    maxHp,
    attack: heroScale(progress.level, def.baseAttack, 0.2, gear),
    defense: heroScale(progress.level, def.baseDefense, 0.15, gear),
    interval: def.interval,
    nextAt: 0.4,
    actionCount: 0,
    shield: 0,
    tauntUntil: 0,
    alive: true,
  };
}

function makeEnemy(stage: number, index: number): Combatant {
  const stats = enemyStatsFor(stage, index);
  return {
    id: `beast-${stage}-${index}`,
    name: stats.name,
    side: 'beast',
    heroClass: stats.boss ? 'boss' : 'beast',
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    interval: stats.interval,
    nextAt: 0.9 + index * 0.25,
    actionCount: 0,
    shield: 0,
    tauntUntil: 0,
    alive: true,
  };
}

export function startBattle(state: GameState, stage = state.expedition.selectedStage): StartBattleResult {
  const selected = Math.max(1, Math.min(STAGES.length, Math.round(stage)));
  if (selected > state.expedition.maxStage) {
    return { ok: false, message: 'Clear the earlier stages before pushing deeper.' };
  }
  const recruited = HERO_ORDER.filter((id) => state.heroes[id].recruited);
  if (recruited.length === 0) {
    return { ok: false, message: 'Recruit at least one hero before deploying.' };
  }

  const heroes = recruited.map((id) => heroCombatant(state, id));
  const enemies = Array.from({ length: stageEnemyCount(selected) }, (_, index) =>
    makeEnemy(selected, index),
  );
  const firstClear = !state.expedition.firstClears.includes(selected);
  const reward = { ...stageReward(selected) };
  if (firstClear) {
    const bonus = firstClearReward(selected);
    for (const key of Object.keys(bonus) as Array<keyof Resources>) {
      reward[key] += bonus[key];
    }
  }

  const battle: BattleState = {
    stage: selected,
    status: 'fighting',
    elapsed: 0,
    heroes,
    enemies,
    log: [],
    rng:
      (state.rng ^
        (selected * 0x9e3779b1) ^
        ((state.expedition.runs + 1) * 0x85ebca6b) ^
        state.day) >>>
        0 || 0x51ed270b,
    reward,
    xp: stageXp(selected),
    firstClear,
    awarded: false,
  };
  pushLog(battle, `${stageById(selected).name}. ${stageById(selected).region}.`, 'info');
  pushLog(battle, 'The expedition moves out through the gate.', 'info');
  return {
    ok: true,
    message: `Expedition deployed to stage ${selected}.`,
    battle,
  };
}

function pushLog(
  battle: BattleState,
  text: string,
  kind: BattleLogEntry['kind'],
): void {
  const last = battle.log[battle.log.length - 1];
  battle.log.push({
    id: (last?.id ?? 0) + 1,
    time: Math.round(battle.elapsed * 10) / 10,
    text,
    kind,
  });
  if (battle.log.length > 90) battle.log.splice(0, battle.log.length - 90);
}

function living(list: Combatant[]): Combatant[] {
  return list.filter((item) => item.alive && item.hp > 0);
}

function rollDamage(battle: BattleState, attacker: Combatant, defender: Combatant, mult = 1): number {
  const variance = 0.88 + nextRandom(battle) * 0.24;
  const raw = Math.max(
    1,
    (attacker.attack * variance - defender.defense * 0.35) * mult,
  );
  return Math.max(1, Math.round(raw));
}

function applyDamage(target: Combatant, damage: number): number {
  let remaining = damage;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }
  target.hp = Math.max(0, target.hp - remaining);
  if (target.hp <= 0) {
    target.alive = false;
    target.shield = 0;
  }
  return remaining;
}

function chooseHeroTarget(battle: BattleState): Combatant | null {
  const tank = living(battle.heroes).find((hero) => hero.heroClass === 'tank');
  if (tank && tank.tauntUntil > battle.elapsed) return tank;
  const targets = living(battle.heroes);
  if (targets.length === 0) return null;
  if (tank && nextRandom(battle) < 0.52) return tank;
  return targets[Math.floor(nextRandom(battle) * targets.length) % targets.length];
}

function chooseEnemyTarget(battle: BattleState, actor: Combatant): Combatant | null {
  const enemies = living(battle.enemies);
  if (enemies.length === 0) return null;
  if (actor.heroClass === 'marksman') {
    return [...enemies].sort((a, b) => a.hp - b.hp)[0];
  }
  return enemies[0];
}

function heroAttack(battle: BattleState, hero: Combatant): void {
  if (hero.heroClass === 'support' && hero.actionCount % 2 === 0) {
    const allies = living(battle.heroes);
    const wounded = [...allies].sort(
      (a, b) => a.hp / a.maxHp - b.hp / b.maxHp,
    )[0];
    if (wounded && wounded.hp < wounded.maxHp) {
      const heal = Math.round(hero.attack * (1.45 + nextRandom(battle) * 0.35));
      wounded.hp = Math.min(wounded.maxHp, wounded.hp + heal);
      pushLog(battle, `${hero.name} binds a wound: ${wounded.name} +${heal} HP.`, 'heal');
      return;
    }
  }

  const target = chooseEnemyTarget(battle, hero);
  if (!target) return;
  let multiplier = 1;
  let crit = false;
  if (hero.heroClass === 'marksman' && hero.actionCount % 3 === 0) {
    multiplier = 1.8;
    crit = true;
  }
  const damage = rollDamage(battle, hero, target, multiplier);
  applyDamage(target, damage);
  pushLog(
    battle,
    `${hero.name} hits ${target.name} for ${damage}${crit ? ' — focused shot!' : ''}.`,
    crit ? 'skill' : 'attack',
  );
  if (!target.alive) pushLog(battle, `${target.name} collapses into the snow.`, 'down');
}

function enemyAttack(battle: BattleState, beast: Combatant): void {
  const target = chooseHeroTarget(battle);
  if (!target) return;
  const damage = rollDamage(battle, beast, target);
  applyDamage(target, damage);
  pushLog(
    battle,
    `${beast.name} strikes ${target.name} for ${damage}.`,
    beast.heroClass === 'boss' ? 'skill' : 'attack',
  );
  if (!target.alive) pushLog(battle, `${target.name} is down.`, 'down');
}

function act(battle: BattleState, actor: Combatant): void {
  actor.actionCount += 1;
  if (actor.side === 'hero') {
    if (actor.heroClass === 'tank' && actor.actionCount % 3 === 0) {
      actor.shield += Math.round(actor.maxHp * 0.18);
      actor.tauntUntil = battle.elapsed + 3;
      pushLog(battle, `${actor.name} braces and draws the beasts' eyes.`, 'skill');
    }
    heroAttack(battle, actor);
  } else {
    enemyAttack(battle, actor);
  }
  actor.nextAt += actor.interval;
}

function checkEnd(battle: BattleState): void {
  if (battle.status !== 'fighting') return;
  if (living(battle.enemies).length === 0) {
    battle.status = 'victory';
    pushLog(battle, 'The last beast falls. The expedition holds the field.', 'win');
  } else if (living(battle.heroes).length === 0) {
    battle.status = 'defeat';
    pushLog(battle, 'The expedition is broken. Retreat is called.', 'lose');
  }
}

export function stepBattle(battle: BattleState, deltaSeconds: number): BattleState {
  if (battle.status !== 'fighting') return battle;
  const dt = Math.min(5, Math.max(0, deltaSeconds));
  battle.elapsed += dt;
  let guard = 0;
  while (battle.status === 'fighting' && guard < 600) {
    guard += 1;
    const actors = living([...battle.heroes, ...battle.enemies]);
    if (actors.length === 0) break;
    const actor = actors.reduce((earliest, entry) =>
      entry.nextAt < earliest.nextAt ? entry : earliest,
    );
    if (actor.nextAt > battle.elapsed) break;
    act(battle, actor);
    checkEnd(battle);
  }
  return battle;
}

export function addHeroXp(
  state: GameState,
  heroId: HeroId,
  amount: number,
): { leveled: boolean; level: number } {
  const progress = state.heroes[heroId];
  if (!progress.recruited) return { leveled: false, level: 1 };
  let leveled = false;
  progress.xp += Math.max(0, amount);
  while (progress.level < MAX_HERO_LEVEL && progress.xp >= heroXpToNext(progress.level)) {
    progress.xp -= heroXpToNext(progress.level);
    progress.level += 1;
    leveled = true;
  }
  if (progress.level >= MAX_HERO_LEVEL) progress.xp = 0;
  return { leveled, level: progress.level };
}

export function awardBattle(state: GameState, battle: BattleState): AwardResult {
  if (battle.status === 'fighting' || battle.awarded) {
    return { awarded: false, win: battle.status === 'victory', message: '', levelsGained: [] };
  }
  battle.awarded = true;
  if (battle.status === 'defeat') {
    state.stats.expeditionsLost += 1;
    return {
      awarded: true,
      win: false,
      message: 'The expedition returns empty-handed. Tend the wounded.',
      levelsGained: [],
    };
  }

  const levelsGained: string[] = [];
  state.stats.expeditionsWon += 1;
  grantResources(state.resources, battle.reward ?? {});
  if (battle.reward) {
    state.stats.resourcesGained += Object.values(battle.reward).reduce(
      (sum, amount) => sum + amount,
      0,
    );
  }

  for (const hero of battle.heroes) {
    const id = hero.id.replace('hero-', '') as HeroId;
    const result = addHeroXp(state, id, battle.xp);
    if (result.leveled) {
      levelsGained.push(`${HEROES[id].name} reached level ${result.level}`);
    }
  }

  if (battle.firstClear && !state.expedition.firstClears.includes(battle.stage)) {
    state.expedition.firstClears.push(battle.stage);
    state.expedition.maxStage = Math.min(STAGES.length, Math.max(
      state.expedition.maxStage,
      battle.stage + 1,
    ));
    if (battle.stage === state.expedition.maxStage - 1) {
      state.expedition.selectedStage = Math.min(
        state.expedition.maxStage,
        battle.stage + 1,
      );
    }
  }

  return {
    awarded: true,
    win: true,
    message: battle.firstClear
      ? `Stage ${battle.stage} cleared. A new route opens.`
      : `Stage ${battle.stage} cleared. Supplies recovered.`,
    reward: battle.reward ?? fullResources({}),
    levelsGained,
  };
}

export function retreatBattle(state: GameState, battle: BattleState): BattleState {
  if (battle.status !== 'fighting') return battle;
  battle.status = 'defeat';
  pushLog(battle, 'The party withdraws before the cold can finish the job.', 'lose');
  state.stats.expeditionsLost += 1;
  battle.awarded = true;
  return battle;
}

export function maxPartyPower(state: GameState): number {
  return HERO_ORDER.filter((id) => state.heroes[id].recruited).reduce((sum, id) => {
    const hero = heroCombatant(state, id);
    return sum + hero.attack + hero.defense * 2 + hero.maxHp * 0.25;
  }, 0);
}

export function heroPower(state: GameState, heroId: HeroId): number {
  const hero = heroCombatant(state, heroId);
  return Math.round(hero.attack * 3 + hero.defense * 2 + hero.maxHp * 0.3);
}
