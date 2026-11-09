import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/core/gameStore';
import { maxHp } from '@/systems/character';
import type { Appearance } from '@/core/types';

const appearance: Appearance = {
  seed: 31,
  skin: '#c69b79',
  hair: '#3a2820',
  hairStyle: 1,
  eyes: '#6f8a6a',
  marking: 'none',
  accent: '#b08b51',
  outfit: '#2f2b2a'
};

const draft = {
  name: 'Aren',
  ancestry: 'erdan' as const,
  classId: 'warrior' as const,
  background: 'soldier' as const,
  attributes: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 13 },
  appearance,
  difficulty: 'balanced' as const
};

describe('specialization store flow', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(draft);
    const game = useGameStore.getState().game!;
    const player = game.characters[game.playerId];
    useGameStore.setState({
      game: {
        ...game,
        characters: {
          ...game.characters,
          [game.playerId]: { ...player, level: 3, xp: 500 }
        }
      }
    });
  });

  it('applies a specialization and its ability', () => {
    const game = useGameStore.getState().game!;
    const base = game.characters.player;
    const before = { ...base, hp: maxHp(base) };
    useGameStore.setState({
      game: { ...game, characters: { ...game.characters, player: before } }
    });
    useGameStore.getState().chooseSubclass('player', 'vanguard');
    const after = useGameStore.getState().game!.characters.player;
    expect(after.subclass).toBe('vanguard');
    expect(after.abilities).toContain('bulwark_stance');
    expect(maxHp(after)).toBe(maxHp(before) + 8);
    expect(after.hp).toBe(maxHp(after));
  });

  it('rejects a path from another class and does not allow a second choice', () => {
    useGameStore.getState().chooseSubclass('player', 'assassin');
    expect(useGameStore.getState().game!.characters.player.subclass).toBeUndefined();
    useGameStore.getState().chooseSubclass('player', 'vanguard');
    useGameStore.getState().chooseSubclass('player', 'berserker');
    expect(useGameStore.getState().game!.characters.player.subclass).toBe('vanguard');
  });
});
