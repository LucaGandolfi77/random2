import { describe, expect, it, vi } from 'vitest';
import {
  basicAttack,
  createCombat,
  currentUnit,
  dashCurrentUnit,
  disengageCurrentUnit,
  endTurn,
  helpCurrentUnit,
  moveCurrentUnit,
  reachableTiles,
  shoveCurrentUnit,
  useAbility
} from '@/systems/combat';
import { createCompanion, createPlayer } from '@/systems/character';
import type { Appearance, CharacterRecord, CombatState } from '@/core/types';

const appearance: Appearance = {
  seed: 3,
  skin: '#c69b79',
  hair: '#3a2820',
  hairStyle: 0,
  eyes: '#6f8a6a',
  marking: 'none',
  accent: '#b08b51',
  outfit: '#2f2b2a'
};

const player = createPlayer({
  name: 'Aren',
  ancestry: 'cindral',
  classId: 'warrior',
  background: 'soldier',
  attributes: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 13 },
  appearance,
  difficulty: 'balanced'
});

const companion = createCompanion('nyx', 1);
companion.recruited = true;
const characters: Record<string, CharacterRecord> = { [player.id]: player, [companion.id]: companion };

const makeState = () => createCombat('enc_bastion_raiders', characters, [player.id, companion.id], 'balanced');

describe('tactical combat', () => {
  it('creates a battlefield with the party and all encounter enemies', () => {
    const state = makeState();
    expect(state.units.filter((unit) => unit.side === 'party')).toHaveLength(2);
    expect(state.units.filter((unit) => unit.side === 'enemy')).toHaveLength(3);
    expect(state.tiles).toHaveLength(10);
    expect(state.tiles[0]).toHaveLength(14);
    expect(state.order.length).toBe(state.units.length);
  });

  it('moves through reachable tiles and respects blocked terrain', () => {
    const state = makeState();
    const party = state.units.find((unit) => unit.side === 'party')!;
    const reachable = reachableTiles(state, party);
    expect(reachable.size).toBeGreaterThan(1);
    for (const tile of reachable.values()) {
      expect(state.tiles[tile.y][tile.x].blocked).toBe(false);
    }
  });

  it('resolves attacks and logs the dice roll', () => {
    const state: CombatState = makeState();
    const party = state.units.find((unit) => unit.side === 'party')!;
    const enemy = state.units.find((unit) => unit.side === 'enemy')!;
    enemy.x = party.x + 1;
    enemy.y = party.y;
    state.turnIndex = state.order.indexOf(party.id);
    state.waitingForAi = false;
    const next = basicAttack(state, enemy.x, enemy.y);
    expect(next.log.some((entry) => entry.text.includes('attacks'))).toBe(true);
    expect(next.units.find((unit) => unit.id === party.id)!.ap).toBe(party.ap - 1);
  });

  it('ends the battle when the last enemy is downed', () => {
    const state: CombatState = makeState();
    for (const unit of state.units) {
      if (unit.side === 'enemy') {
        unit.hp = 0;
        unit.downed = true;
      }
    }
    const party = state.units.find((unit) => unit.side === 'party')!;
    state.turnIndex = state.order.indexOf(party.id);
    const next = endTurn(state);
    expect(next.phase).toBe('victory');
  });

  it('heals and revives the chosen ally instead of the caster', () => {
    const cleric = createPlayer({
      name: 'Oren',
      ancestry: 'erdan',
      classId: 'cleric',
      background: 'pilgrim',
      attributes: { str: 12, dex: 10, con: 14, int: 8, wis: 15, cha: 13 },
      appearance,
      difficulty: 'balanced'
    });
    const ally = createCompanion('nyx', 1);
    ally.recruited = true;
    const healingState = createCombat(
      'enc_bastion_raiders',
      { player: cleric, nyx: ally },
      ['player', 'nyx'],
      'story'
    );
    const clericUnit = healingState.units.find((unit) => unit.side === 'party' && unit.charId === 'player')!;
    const allyUnit = healingState.units.find((unit) => unit.side === 'party' && unit.charId === 'nyx')!;
    healingState.turnIndex = healingState.order.indexOf(clericUnit.id);
    healingState.waitingForAi = false;
    clericUnit.ap = 3;
    clericUnit.resource = 8;
    healingState.units
      .filter((unit) => unit.side === 'enemy')
      .forEach((unit, index) => {
        unit.x = 12;
        unit.y = 1 + index;
      });
    allyUnit.x = clericUnit.x + 1;
    allyUnit.y = clericUnit.y;
    allyUnit.hp = 3;
    const healed = useAbility(healingState, 'mend_wounds', allyUnit.x, allyUnit.y);
    const healedAlly = healed.units.find((unit) => unit.id === allyUnit.id)!;
    const healedCleric = healed.units.find((unit) => unit.id === clericUnit.id)!;
    expect(healedAlly.hp).toBeGreaterThan(3);
    expect(healedCleric.hp).toBe(clericUnit.hp);

    const reviveState = structuredClone(healed);
    const reviveCleric = reviveState.units.find((unit) => unit.id === clericUnit.id)!;
    const reviveTarget = reviveState.units.find((unit) => unit.id === allyUnit.id)!;
    reviveState.turnIndex = reviveState.order.indexOf(reviveCleric.id);
    reviveCleric.ap = 3;
    reviveCleric.resource = 8;
    reviveTarget.hp = 0;
    reviveTarget.downed = true;
    const revived = useAbility(reviveState, 'revive', reviveTarget.x, reviveTarget.y);
    const revivedTarget = revived.units.find((unit) => unit.id === allyUnit.id)!;
    expect(revivedTarget.downed).toBe(false);
    expect(revivedTarget.hp).toBeGreaterThan(0);
  });

  it('supports Dash, Disengage, Shove, Help, and opportunity attacks', () => {
    const state = makeState();
    const party = state.units.find((unit) => unit.side === 'party')!;
    state.turnIndex = state.order.indexOf(party.id);
    state.waitingForAi = false;

    const dashed = dashCurrentUnit(state);
    const afterDash = dashed.units.find((unit) => unit.id === party.id)!;
    expect(afterDash.ap).toBe(party.ap - 1);
    expect(afterDash.movement).toBe(party.movement + party.speed);

    const disengaged = disengageCurrentUnit(state);
    const afterDisengage = disengaged.units.find((unit) => unit.id === party.id)!;
    expect(afterDisengage.statuses.some((status) => status.id === 'disengaged')).toBe(true);

    const helpState = makeState();
    const helperUnit = helpState.units.find((unit) => unit.side === 'party')!;
    const allyUnit = helpState.units.find((unit) => unit.side === 'party' && unit.id !== helperUnit.id)!;
    helpState.turnIndex = helpState.order.indexOf(helperUnit.id);
    helpState.waitingForAi = false;
    helperUnit.x = 5;
    helperUnit.y = 5;
    allyUnit.x = 6;
    allyUnit.y = 5;
    const helped = helpCurrentUnit(helpState, allyUnit.x, allyUnit.y);
    const helper = helped.units.find((unit) => unit.id === helperUnit.id)!;
    expect(helper.ap).toBe(helperUnit.ap - 1);

    const shoveState = makeState();
    const shover = shoveState.units.find((unit) => unit.side === 'party')!;
    const victim = shoveState.units.find((unit) => unit.side === 'enemy')!;
    shoveState.turnIndex = shoveState.order.indexOf(shover.id);
    shoveState.waitingForAi = false;
    shover.x = 5;
    shover.y = 5;
    victim.x = 6;
    victim.y = 5;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const shoved = shoveCurrentUnit(shoveState, victim.x, victim.y);
    random.mockRestore();
    const pushed = shoved.units.find((unit) => unit.id === victim.id)!;
    expect(pushed.x).toBe(7);
    expect(pushed.y).toBe(5);

    const oaState = makeState();
    const mover = oaState.units.find((unit) => unit.side === 'party')!;
    const watcher = oaState.units.find((unit) => unit.side === 'enemy')!;
    oaState.turnIndex = oaState.order.indexOf(mover.id);
    oaState.waitingForAi = false;
    mover.x = 5;
    mover.y = 5;
    watcher.x = 6;
    watcher.y = 5;
    const moved = moveCurrentUnit(oaState, 4, 7);
    const afterWatcher = moved.units.find((unit) => unit.id === watcher.id)!;
    expect(afterWatcher.reactionUsed).toBe(true);
    expect(moved.log.some((entry) => entry.text.includes('seizes the opening'))).toBe(true);
  });

  it('rejects actions from an enemy turn', () => {
    const state = makeState();
    const enemy = state.units.find((unit) => unit.side === 'enemy')!;
    state.turnIndex = state.order.indexOf(enemy.id);
    state.waitingForAi = false;
    const before = currentUnit(state)?.ap;
    const next = basicAttack(state, state.units.find((unit) => unit.side === 'party')!.x, state.units.find((unit) => unit.side === 'party')!.y);
    expect(currentUnit(next)?.ap).toBe(before);
  });
});
