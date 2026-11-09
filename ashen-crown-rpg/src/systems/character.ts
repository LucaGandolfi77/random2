import type {
  AncestryId,
  Appearance,
  AttributeKey,
  Attributes,
  BackgroundId,
  CharacterRecord,
  ClassId,
  EquipmentSlot,
  ItemDef
} from '@/core/types';
import { ancestryById } from '@/data/ancestries';
import { backgroundById, classById } from '@/data/classes';
import { abilityById, classAbilities } from '@/data/abilities';
import { itemById } from '@/data/items';
import { companionById } from '@/data/companions';
import { subclassById } from '@/data/subclasses';
import { clamp, modifier } from '@/core/rng';

export const XP_THRESHOLDS = [0, 0, 200, 500, 900, 1400, 2000, 2700, 3500];

export const levelForXp = (xp: number): number => {
  let level = 1;
  for (let i = 2; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i;
  }
  return level;
};

export const xpToNext = (xp: number, level: number): number | null => {
  if (level >= 8) return null;
  return Math.max(0, XP_THRESHOLDS[level + 1] - xp);
};

export const levelHp = (classId: ClassId, level: number, con: number) =>
  classById[classId].hpBase + (level - 1) * classById[classId].hpPerLevel + modifier(con) * level;

export const levelResource = (classId: ClassId, level: number) =>
  classById[classId].resourceBase + Math.floor((level - 1) / 2);

const defaultEquipment = (classId: ClassId): Partial<Record<EquipmentSlot, string>> => {
  switch (classId) {
    case 'warrior':
      return { weapon: 'iron_longsword', armor: 'chain_mail', offhand: 'wooden_shield' };
    case 'rogue':
      return { weapon: 'thiefs_knife', armor: 'leather_armor' };
    case 'mage':
      return { weapon: 'oak_staff', armor: 'traveling_clothes', helmet: 'circlet_of_echoes' };
    case 'cleric':
      return { weapon: 'covenant_scepter', armor: 'chain_mail', offhand: 'wooden_shield' };
    case 'ranger':
      return { weapon: 'ashwood_bow', armor: 'leather_armor' };
    case 'warlock':
      return { weapon: 'pactblade', armor: 'traveling_clothes' };
  }
  return {};
};

export const equipmentBonuses = (character: CharacterRecord): Record<string, number> => {
  const bonuses: Record<string, number> = {};
  const items: ItemDef[] = Object.values(character.equipment)
    .filter(Boolean)
    .map((id) => itemById[id!])
    .filter(Boolean);
  for (const item of items) {
    if (!item.stats) continue;
    for (const [key, value] of Object.entries(item.stats)) {
      if (typeof value === 'number') bonuses[key] = (bonuses[key] ?? 0) + value;
    }
  }
  return bonuses;
};

export const subclassFor = (character: CharacterRecord) =>
  character.subclass ? subclassById[character.subclass] : null;

const subclassBonuses = (character: CharacterRecord) => subclassFor(character)?.bonuses ?? {};

export const effectiveAttributes = (character: CharacterRecord): Attributes => {
  const b = equipmentBonuses(character);
  const sub = subclassBonuses(character).attributes ?? {};
  return {
    str: character.attributes.str + (b.str ?? 0) + (sub.str ?? 0),
    dex: character.attributes.dex + (b.dex ?? 0) + (sub.dex ?? 0),
    con: character.attributes.con + (b.con ?? 0) + (sub.con ?? 0),
    int: character.attributes.int + (b.int ?? 0) + (sub.int ?? 0),
    wis: character.attributes.wis + (b.wis ?? 0) + (sub.wis ?? 0),
    cha: character.attributes.cha + (b.cha ?? 0) + (sub.cha ?? 0)
  };
};

export const maxHp = (character: CharacterRecord): number => {
  const base = levelHp(character.classId, character.level, effectiveAttributes(character).con);
  const gear = equipmentBonuses(character).hp ?? 0;
  const backgroundBonus = character.isPlayer && character.background === 'soldier' ? 2 : 0;
  const subclassHp = subclassBonuses(character).hp ?? 0;
  return Math.max(1, base + gear + backgroundBonus + subclassHp);
};

export const maxResource = (character: CharacterRecord): number =>
  levelResource(character.classId, character.level) +
  (equipmentBonuses(character).resource ?? 0) +
  (subclassBonuses(character).resource ?? 0);

export const armorClass = (character: CharacterRecord): number => {
  const b = equipmentBonuses(character);
  const dex = modifier(effectiveAttributes(character).dex);
  return 10 + dex + (b.ac ?? 0) + (subclassBonuses(character).ac ?? 0);
};

export const initiativeBonus = (character: CharacterRecord): number =>
  modifier(effectiveAttributes(character).dex) +
  (equipmentBonuses(character).initiative ?? 0) +
  (subclassBonuses(character).initiative ?? 0);

export const attackBonus = (character: CharacterRecord): number => {
  const b = equipmentBonuses(character);
  const primary = classById[character.classId].primary;
  return (
    2 +
    Math.floor((character.level - 1) / 2) +
    modifier(effectiveAttributes(character)[primary]) +
    (b.attack ?? 0) +
    (subclassBonuses(character).attack ?? 0)
  );
};

export const weaponDamage = (character: CharacterRecord): string => {
  const weapon = character.equipment.weapon ? itemById[character.equipment.weapon] : null;
  const base = weapon?.stats?.damage ?? '1d4';
  const primary = classById[character.classId].primary;
  const mod = modifier(effectiveAttributes(character)[primary]);
  const level = character.level >= 5 ? 1 : 0;
  return `${base}${mod >= 0 ? '+' : ''}${mod + level}`;
};

export const proficiencyBonus = (character: CharacterRecord, label?: string): number => {
  if (!label) return 0;
  let bonus = character.proficiencies.includes(label) ? 2 : 0;
  if (character.ancestry === 'aelborn' && ['Investigation', 'Arcana'].includes(label)) bonus += 1;
  if (character.ancestry === 'tidewrought' && ['Insight', 'Persuasion'].includes(label)) bonus += 1;
  if (character.ancestry === 'wraithmarked' && ['Stealth', 'Deception'].includes(label)) bonus += 1;
  if (character.ancestry === 'cindral' && label === 'Intimidation') bonus += 1;
  if (character.ancestry === 'stoneborn' && label === 'Athletics') bonus += 1;
  return bonus;
};

const baseAppearance = (seed: number, palette: string): Appearance => ({
  seed,
  skin: '#b88c6e',
  hair: '#3a2922',
  hairStyle: seed % 5,
  eyes: '#6d7460',
  marking: 'none',
  accent: palette,
  outfit: '#3f3a36'
});

export interface CreationDraft {
  name: string;
  ancestry: AncestryId;
  classId: ClassId;
  background: BackgroundId;
  attributes: Attributes;
  appearance: Appearance;
  difficulty: 'story' | 'balanced' | 'tactician';
}

export const startingGold = (background: BackgroundId) => 80 + (background === 'outcast' ? 25 : background === 'soldier' ? 10 : 0);

export const createPlayer = (draft: CreationDraft): CharacterRecord => {
  const ancestry = ancestryById[draft.ancestry];
  const cls = classById[draft.classId];
  const bg = backgroundById[draft.background];
  const attrs: Attributes = { ...draft.attributes };
  for (const [key, bonus] of Object.entries(ancestry.bonuses)) {
    attrs[key as AttributeKey] += bonus ?? 0;
  }
  const level = 1;
  const profs = Array.from(new Set([...cls.proficiencies, ...bg.proficiencies]));
  const hp = levelHp(draft.classId, level, attrs.con) + (draft.background === 'soldier' ? 2 : 0);
  const abilities = classAbilities(draft.classId, level);
  return {
    id: 'player',
    name: draft.name.trim() || 'The Unwritten',
    ancestry: draft.ancestry,
    classId: draft.classId,
    background: draft.background,
    level,
    xp: 0,
    attributes: attrs,
    hp,
    resource: levelResource(draft.classId, level),
    gold: startingGold(draft.background),
    abilities,
    proficiencies: profs,
    equipment: defaultEquipment(draft.classId),
    isPlayer: true,
    approval: 100,
    recruited: true,
    alive: true,
    portrait: draft.appearance ?? baseAppearance(7, ancestry.palette)
  };
};

export const createCompanion = (companionId: string, level = 1): CharacterRecord => {
  const def = companionById[companionId];
  const cls = classById[def.classId];
  const subclass = def.subclass && level >= 3 ? subclassById[def.subclass] : null;
  const hp = levelHp(def.classId, level, def.baseAttributes.con) + (subclass?.bonuses.hp ?? 0);
  const equipment: Partial<Record<EquipmentSlot, string>> =
    companionId === 'kaelen'
      ? { weapon: 'iron_longsword', armor: 'chain_mail', offhand: 'wooden_shield' }
      : companionId === 'nyx'
        ? { weapon: 'thiefs_knife', armor: 'leather_armor' }
        : companionId === 'ilyra'
          ? { weapon: 'oak_staff', armor: 'warded_robes', helmet: 'circlet_of_echoes' }
          : companionId === 'oren'
            ? { weapon: 'covenant_scepter', armor: 'chain_mail', offhand: 'wooden_shield' }
            : { weapon: 'ashwood_bow', armor: 'leather_armor', accessory: 'hunters_talisman' };
  const abilities = Array.from(
    new Set([...classAbilities(def.classId, level), ...def.abilities, ...(subclass ? [subclass.abilityId] : [])])
  ).filter((id) => (abilityById[id]?.level ?? 1) <= level);
  return {
    id: companionId,
    name: def.name,
    ancestry: def.ancestry,
    classId: def.classId,
    background: companionId === 'kaelen' ? 'soldier' : companionId === 'ilyra' ? 'scholar' : companionId === 'oren' ? 'pilgrim' : companionId === 'sable' ? 'artisan' : 'outcast',
    level,
    xp: 0,
    attributes: { ...def.baseAttributes },
    hp,
    resource: levelResource(def.classId, level) + (subclass?.bonuses.resource ?? 0),
    abilities,
    proficiencies: [...cls.proficiencies],
    equipment,
    isPlayer: false,
    companionId,
    subclass: subclass?.id,
    approval: 20,
    recruited: false,
    alive: true,
    portrait: def.portrait
  };
};

export const addXp = (character: CharacterRecord, amount: number): { character: CharacterRecord; levels: number } => {
  const next = { ...character, xp: character.xp + amount, attributes: { ...character.attributes } };
  const newLevel = Math.min(8, levelForXp(next.xp));
  let levels = 0;
  while (next.level < newLevel) {
    levels++;
    next.level += 1;
    const primary = classById[next.classId].primary;
    const secondary = classById[next.classId].secondary;
    if (next.level === 4) next.attributes[primary] += 1;
    if (next.level === 6) next.attributes[secondary] += 1;
    if (next.level === 8) next.attributes[primary] += 1;
    next.abilities = Array.from(new Set([...next.abilities, ...classAbilities(next.classId, next.level)]));
    if (next.companionId) {
      const companionAbilities = companionById[next.companionId].abilities.filter(
        (id) => (abilityById[id]?.level ?? 1) <= next.level
      );
      next.abilities = Array.from(new Set([...next.abilities, ...companionAbilities]));
      if (!next.subclass && next.level >= 3) {
        const subclassId = companionById[next.companionId].subclass;
        const progressionSubclass = subclassId ? subclassById[subclassId] : null;
        if (progressionSubclass) {
          next.subclass = progressionSubclass.id;
          next.abilities = Array.from(new Set([...next.abilities, progressionSubclass.abilityId]));
        }
      }
    }
    const newMax = maxHp(next);
    next.hp = Math.min(newMax, next.hp + maxHp(next) - maxHp(character));
    next.resource = Math.min(maxResource(next), next.resource + 2);
  }
  return { character: next, levels };
};

export const healCharacter = (character: CharacterRecord, amount: number): CharacterRecord => ({
  ...character,
  hp: clamp(character.hp + amount, 0, maxHp(character))
});

export const shortRest = (character: CharacterRecord): CharacterRecord => ({
  ...character,
  hp: clamp(character.hp + Math.ceil(maxHp(character) * (character.classId === 'cleric' ? 0.55 : 0.4)), 0, maxHp(character)),
  resource: clamp(character.resource + Math.ceil(maxResource(character) * 0.5), 0, maxResource(character)),
  alive: true
});

export const fullRest = (character: CharacterRecord): CharacterRecord => ({
  ...character,
  hp: maxHp(character),
  resource: maxResource(character),
  alive: true
});

export const ancestryBonusDescription = (id: AncestryId) => {
  const a = ancestryById[id];
  return Object.entries(a.bonuses)
    .map(([k, v]) => `${k.toUpperCase()} +${v}`)
    .join(', ');
};

export const displayClassName = (id: ClassId) => classById[id].name;
export const displayAncestryName = (id: AncestryId) => ancestryById[id].name;
export const displayBackgroundName = (id: BackgroundId) => backgroundById[id].name;

export const pointBuyCost = (score: number) => {
  const costs: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9, 16: 12 };
  return costs[score] ?? 0;
};
