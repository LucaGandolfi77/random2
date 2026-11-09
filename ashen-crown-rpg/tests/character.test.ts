import { describe, expect, it } from 'vitest';
import { createPlayer, addXp, equipmentBonuses, maxHp, armorClass } from '@/systems/character';
import type { Appearance } from '@/core/types';

const appearance: Appearance = {
  seed: 1,
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

describe('character creation', () => {
  it('applies ancestry bonuses and the soldier health bonus', () => {
    const player = createPlayer(draft);
    expect(player.attributes.cha).toBe(14);
    expect(player.attributes.dex).toBe(13);
    expect(player.hp).toBe(maxHp(player));
    expect(maxHp(player)).toBe(14 + 2 + 2);
    expect(player.gold).toBe(90);
  });

  it('gives starting equipment and derives armor class from it', () => {
    const player = createPlayer(draft);
    expect(player.equipment.weapon).toBe('iron_longsword');
    expect(player.equipment.armor).toBe('chain_mail');
    expect(equipmentBonuses(player).ac).toBe(6);
    expect(armorClass(player)).toBeGreaterThan(10);
  });

  it('levels without mutating the previous character record', () => {
    const player = createPlayer(draft);
    const originalAttributes = { ...player.attributes };
    const result = addXp(player, 900);
    expect(result.levels).toBe(3);
    expect(result.character.level).toBe(4);
    expect(player.attributes).toEqual(originalAttributes);
    expect(result.character.attributes.str).toBe(originalAttributes.str + 1);
    expect(result.character.abilities.length).toBeGreaterThan(player.abilities.length);
  });
});
