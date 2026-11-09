import type { AttributeKey, CharacterRecord, SkillCheckResult } from '@/core/types';
import { modifier, rollDie } from '@/core/rng';
import { effectiveAttributes, proficiencyBonus } from './character';

export const SKILL_ATTRIBUTE: Record<string, AttributeKey> = {
  Athletics: 'str',
  Acrobatics: 'dex',
  Stealth: 'dex',
  'Sleight of Hand': 'dex',
  Arcana: 'int',
  Investigation: 'int',
  History: 'int',
  Nature: 'int',
  Religion: 'int',
  Insight: 'wis',
  Perception: 'wis',
  Survival: 'wis',
  Persuasion: 'cha',
  Deception: 'cha',
  Intimidation: 'cha',
  Performance: 'cha'
};

export const performCheck = (
  character: CharacterRecord,
  stat: AttributeKey,
  dc: number,
  proficiency?: string,
  rng: () => number = Math.random
): SkillCheckResult => {
  const die = rollDie(20, rng);
  const attrs = effectiveAttributes(character);
  const mod = modifier(attrs[stat]);
  const prof = proficiencyBonus(character, proficiency);
  const total = die + mod + prof;
  const critical = die === 20 ? 'success' : die === 1 ? 'failure' : null;
  return {
    stat,
    die,
    modifier: mod,
    proficiency: prof,
    total,
    dc,
    success: critical === 'success' || (critical !== 'failure' && total >= dc),
    critical,
    label: proficiency ?? stat.toUpperCase()
  };
};

export const skillCheckLabel = (stat: AttributeKey, dc: number, proficiency?: string) =>
  `${proficiency ?? stat.toUpperCase()} · DC ${dc}`;

export const passiveScore = (character: CharacterRecord, proficiency: string) => {
  const attr = SKILL_ATTRIBUTE[proficiency] ?? 'wis';
  return 10 + modifier(effectiveAttributes(character)[attr]) + proficiencyBonus(character, proficiency);
};
