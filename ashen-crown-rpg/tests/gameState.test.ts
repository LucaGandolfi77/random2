import { describe, expect, it } from 'vitest';
import type { Appearance, CharacterRecord, GameState } from '@/core/types';
import { createCompanion, createPlayer } from '@/systems/character';
import {
  addItem,
  completeQuest,
  inventoryCount,
  recruitInGame,
  refreshDerivedFlags,
  removeItem,
  restParty
} from '@/systems/gameState';

const appearance: Appearance = {
  seed: 4,
  skin: '#c69b79',
  hair: '#3a2820',
  hairStyle: 0,
  eyes: '#6f8a6a',
  marking: 'none',
  accent: '#b08b51',
  outfit: '#2f2b2a'
};

const player = createPlayer({
  name: 'Test',
  ancestry: 'erdan',
  classId: 'cleric',
  background: 'pilgrim',
  attributes: { str: 12, dex: 10, con: 14, int: 8, wis: 15, cha: 13 },
  appearance,
  difficulty: 'balanced'
});

const precreated = createCompanion('kaelen', 1);
const characters: Record<string, CharacterRecord> = {
  [player.id]: player,
  [precreated.id]: precreated
};

const baseGame = (): GameState => ({
  version: 1,
  createdAt: 0,
  updatedAt: 0,
  difficulty: 'balanced',
  playerId: player.id,
  characters,
  party: [player.id],
  inventory: [{ itemId: 'healing_potion', quantity: 2 }],
  quests: { q_marked: { status: 'active', stage: 0, flags: {} } },
  world: {
    locationId: 'fallen_bastion',
    x: 6,
    y: 13,
    discovered: ['fallen_bastion'],
    defeated: [],
    opened: [],
    visited: ['fallen_bastion'],
    flags: {},
    companionParty: []
  },
  settings: {
    musicVolume: 0.5,
    sfxVolume: 0.6,
    muted: false,
    textScale: 1,
    reducedMotion: false,
    lowEffects: false,
    showRolls: true
  },
  playTime: 0,
  ending: null
});

describe('game state', () => {
  it('stacks and removes inventory items', () => {
    const game = { ...baseGame(), inventory: addItem(baseGame().inventory, 'healing_potion', 1) };
    expect(inventoryCount(game.inventory, 'healing_potion')).toBe(3);
    const removed = removeItem(game.inventory, 'healing_potion', 2);
    expect(inventoryCount(removed, 'healing_potion')).toBe(1);
  });

  it('recruits a pre-created companion instead of silently failing', () => {
    const leveled = createCompanion('kaelen', 3);
    const game = recruitInGame(baseGame(), leveled, 'kaelen');
    expect(game.characters.kaelen.recruited).toBe(true);
    expect(game.characters.kaelen.level).toBe(3);
    expect(game.party).toContain('kaelen');
    expect(game.world.flags.recruited_kaelen).toBe(true);
  });

  it('completes quests only once and grants rewards once', () => {
    const first = completeQuest(baseGame(), 'q_marked');
    expect(first.game.quests.q_marked.status).toBe('completed');
    expect(first.notes.length).toBeGreaterThan(0);
    const second = completeQuest(first.game, 'q_marked');
    expect(second.notes).toHaveLength(0);
    expect(second.game.characters[player.id].xp).toBe(first.game.characters[player.id].xp);
  });

  it('derives the three seal and rune flags', () => {
    const game = baseGame();
    game.world.flags.seal_tides = true;
    game.world.flags.seal_memory = true;
    game.world.flags.seal_grief = true;
    game.world.flags.rune_root = true;
    game.world.flags.rune_moth = true;
    game.world.flags.rune_crown = true;
    const next = refreshDerivedFlags(game);
    expect(next.world.flags.temple_seals_open).toBe(true);
    expect(next.world.flags.woods_runes_solved).toBe(true);
    expect(next.world.flags.unwritten_ready).toBe(false);
  });

  it('rests the whole active party', () => {
    const game = baseGame();
    game.characters[player.id].hp = 1;
    game.characters[player.id].resource = 0;
    const next = restParty(game);
    expect(next.characters[player.id].hp).toBeGreaterThan(1);
    expect(next.characters[player.id].resource).toBeGreaterThan(0);
  });
});
