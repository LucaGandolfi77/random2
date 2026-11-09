import { describe, expect, it } from 'vitest';
import { addXp, armorClass, createCompanion, createPlayer, maxHp, maxResource } from '@/systems/character';
import { classAbilities } from '@/data/abilities';
import { classes } from '@/data/classes';
import { companions } from '@/data/companions';
import { subclassById, subclasses, subclassesForClass } from '@/data/subclasses';
import type { Appearance } from '@/core/types';

const appearance: Appearance = {
  seed: 21,
  skin: '#c69b79',
  hair: '#3a2820',
  hairStyle: 2,
  eyes: '#6f8a6a',
  marking: 'none',
  accent: '#b08b51',
  outfit: '#2f2b2a'
};

describe('specializations', () => {
  it('offers exactly two valid paths for every class', () => {
    for (const cls of classes) {
      const paths = subclassesForClass(cls.id);
      expect(paths, cls.id).toHaveLength(2);
      for (const path of paths) {
        expect(path.classId).toBe(cls.id);
        expect(subclassById[path.id]).toBe(path);
        expect(Boolean(path.abilityId)).toBe(true);
      }
    }
    expect(new Set(subclasses.map((entry) => entry.id)).size).toBe(subclasses.length);
  });

  it('gives companions a matching specialization at level 3', () => {
    for (const companion of companions) {
      expect(companion.subclass, companion.id).toBeTruthy();
      const subclass = subclassById[companion.subclass!];
      expect(subclass, companion.id).toBeTruthy();
      expect(subclass.classId).toBe(companion.classId);
      const character = createCompanion(companion.id, 3);
      expect(character.subclass).toBe(subclass.id);
      expect(character.abilities).toContain(subclass.abilityId);
    }
  });

  it('applies specialization statistics without auto-granting its ability', () => {
    const player = createPlayer({
      name: 'Aren',
      ancestry: 'erdan',
      classId: 'warrior',
      background: 'soldier',
      attributes: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 13 },
      appearance,
      difficulty: 'balanced'
    });
    const levelThree = addXp(player, 500).character;
    const withoutPath = {
      hp: maxHp(levelThree),
      ac: armorClass(levelThree),
      resource: maxResource(levelThree)
    };
    const vanguard = {
      ...levelThree,
      subclass: 'vanguard',
      abilities: [...levelThree.abilities, subclassById.vanguard.abilityId]
    };
    expect(maxHp(vanguard)).toBe(withoutPath.hp + 8);
    expect(armorClass(vanguard)).toBe(withoutPath.ac + 1);
    expect(maxResource(vanguard)).toBe(withoutPath.resource);

    const berserker = { ...levelThree, subclass: 'berserker' };
    expect(maxResource(berserker)).toBe(withoutPath.resource + 2);
    expect(classAbilities('warrior', 8)).not.toContain('bulwark_stance');
  });
});
