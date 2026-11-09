import { describe, expect, it } from 'vitest';
import { performCheck, passiveScore } from '@/systems/checks';
import { createPlayer } from '@/systems/character';
import type { Appearance } from '@/core/types';

const appearance: Appearance = {
  seed: 2,
  skin: '#c69b79',
  hair: '#3a2820',
  hairStyle: 0,
  eyes: '#6f8a6a',
  marking: 'none',
  accent: '#b08b51',
  outfit: '#2f2b2a'
};

const player = createPlayer({
  name: 'Tester',
  ancestry: 'aelborn',
  classId: 'mage',
  background: 'scholar',
  attributes: { str: 8, dex: 13, con: 12, int: 15, wis: 14, cha: 10 },
  appearance,
  difficulty: 'balanced'
});

describe('skill checks', () => {
  it('adds attribute modifiers and proficiency', () => {
    const result = performCheck(player, 'int', 10, 'Investigation', () => 0.5);
    expect(result.die).toBe(11);
    expect(result.proficiency).toBe(3); // Scholar proficiency + Aelborn echo sight.
    expect(result.modifier).toBe(4); // Intelligence 17 plus the starting staff and circlet.
    expect(result.total).toBe(18);
    expect(result.success).toBe(true);
  });

  it('treats a natural 20 as success and a natural 1 as failure', () => {
    expect(performCheck(player, 'str', 99, 'Athletics', () => 0.999).critical).toBe('success');
    expect(performCheck(player, 'str', 1, 'Athletics', () => 0).success).toBe(false);
  });

  it('computes passive scores from the correct attribute', () => {
    expect(passiveScore(player, 'Arcana')).toBe(10 + 4 + 3);
    expect(passiveScore(player, 'Insight')).toBe(10 + 2);
  });
});
