import type { CharacterRecord, GameState, ItemStack, QuestState } from '@/core/types';
import { itemById } from '@/data/items';
import { questById } from '@/data/quests';
import { clamp } from '@/core/rng';
import { addXp, maxHp, maxResource, fullRest, equipmentBonuses } from './character';

export const addItem = (inventory: ItemStack[], itemId: string, quantity = 1): ItemStack[] => {
  const item = itemById[itemId];
  if (!item) return inventory;
  const next = inventory.map((s) => ({ ...s }));
  const existing = next.find((s) => s.itemId === itemId);
  if (existing && item.stackable !== false) existing.quantity += quantity;
  else if (existing) existing.quantity += quantity;
  else next.push({ itemId, quantity });
  return next;
};

export const removeItem = (inventory: ItemStack[], itemId: string, quantity = 1): ItemStack[] => {
  const next = inventory
    .map((s) => (s.itemId === itemId ? { ...s, quantity: s.quantity - quantity } : { ...s }))
    .filter((s) => s.quantity > 0);
  return next;
};

export const inventoryCount = (inventory: ItemStack[], itemId: string): number =>
  inventory.find((s) => s.itemId === itemId)?.quantity ?? 0;

export const playerGold = (game: GameState): number => game.characters[game.playerId]?.gold ?? 0;

export const setGold = (game: GameState, value: number): GameState => {
  const player = game.characters[game.playerId];
  if (!player) return game;
  return {
    ...game,
    characters: { ...game.characters, [game.playerId]: { ...player, gold: Math.max(0, Math.round(value)) } }
  };
};

export const addXpToGame = (game: GameState, amount: number): { game: GameState; levelUps: string[] } => {
  if (amount <= 0) return { game, levelUps: [] };
  const characters = { ...game.characters };
  const levelUps: string[] = [];
  for (const char of Object.values(characters)) {
    if (!char.recruited) continue;
    const { character, levels } = addXp(char, amount);
    characters[char.id] = character;
    if (levels > 0) levelUps.push(`${character.name} reached level ${character.level}.`);
  }
  return { game: { ...game, characters }, levelUps };
};

export const startQuest = (game: GameState, questId: string): GameState => {
  if (!questById[questId]) return game;
  const existing = game.quests[questId];
  if (existing && existing.status !== 'hidden') return game;
  return {
    ...game,
    quests: {
      ...game.quests,
      [questId]: { status: 'active', stage: 0, flags: {} }
    }
  };
};

export const setQuestStage = (game: GameState, questId: string, stage: number): GameState => {
  const existing = game.quests[questId] ?? { status: 'active' as const, stage: 0, flags: {} };
  if (existing.status !== 'active') return game;
  return {
    ...game,
    quests: { ...game.quests, [questId]: { ...existing, stage: Math.max(existing.stage, stage), status: 'active' } }
  };
};

export const completeQuest = (
  game: GameState,
  questId: string
): { game: GameState; notes: string[]; levelUps: string[] } => {
  const quest = questById[questId];
  const existing = game.quests[questId];
  if (!quest || (existing?.status === 'completed')) return { game, notes: [], levelUps: [] };
  const notes = [`Quest completed: ${quest.title}.`];
  let next: GameState = {
    ...game,
    quests: {
      ...game.quests,
      [questId]: { status: 'completed', stage: Math.max(0, quest.stages.length - 1), flags: existing?.flags ?? {} }
    },
    world: { ...game.world, flags: { ...game.world.flags, [`completed_${questId}`]: true } }
  };
  if (quest.rewardItems?.length) {
    for (const item of quest.rewardItems) {
      next = { ...next, inventory: addItem(next.inventory, item, 1) };
      notes.push(`Received ${itemById[item]?.name ?? item}.`);
    }
  }
  if (quest.rewardGold) {
    next = setGold(next, playerGold(next) + quest.rewardGold);
    notes.push(`Received ${quest.rewardGold} gold.`);
  }
  let levelUps: string[] = [];
  if (quest.rewardXp) {
    const result = addXpToGame(next, quest.rewardXp);
    next = result.game;
    levelUps = result.levelUps;
  }
  next = refreshDerivedFlags(next);
  return { game: next, notes, levelUps };
};

export const failQuest = (game: GameState, questId: string): GameState => {
  const existing = game.quests[questId];
  if (!existing || existing.status !== 'active') return game;
  return { ...game, quests: { ...game.quests, [questId]: { ...existing, status: 'failed' } } };
};

export const setFlag = (game: GameState, flag: string, value: string | number | boolean = true): GameState => ({
  ...game,
  world: { ...game.world, flags: { ...game.world.flags, [flag]: value } }
});

export const refreshDerivedFlags = (game: GameState): GameState => {
  const requiredQuests = ['q_debt_in_shadow', 'q_name_in_ashes', 'q_knife_for_choir', 'q_sister_who_never_was', 'q_last_prayer', 'q_hollow_merchant'];
  const allCompanions = requiredQuests.every((id) => game.quests[id]?.status === 'completed');
  const flags = { ...game.world.flags };

  // Temple seals are only open when all three have been unbound, regardless of order.
  const sealsOpen = Boolean(flags.seal_tides && flags.seal_memory && flags.seal_grief);
  flags.temple_seals_open = sealsOpen;
  if (sealsOpen) flags.temple_seal_three = true;

  // The rune door answers only to the complete Root → Moth → Crown sequence.
  const runesSolved = Boolean(flags.rune_root && flags.rune_moth && flags.rune_crown);
  flags.woods_runes_solved = runesSolved;

  // Keep discovery flags and the discovered-map list in sync.
  const discovered = new Set(game.world.discovered);
  const flagToMap: Record<string, string> = {
    discovered_woods: 'whispering_woods',
    discovered_temple: 'sunken_temple',
    discovered_citadel: 'ashen_citadel'
  };
  for (const [key, value] of Object.entries(flags)) {
    if (value && key.startsWith('discovered_')) {
      discovered.add(flagToMap[key] ?? key.replace('discovered_', ''));
    }
  }
  if (flags.temple_unlocked) discovered.add('sunken_temple');
  if (flags.temple_seals_open) discovered.add('sunken_temple');
  if (flags.drowned_saint_defeated) discovered.add('ashen_citadel');

  flags.unwritten_ready = Boolean(allCompanions && flags.unwritten_truth && flags.crown_truth);
  flags.all_companion_quests = allCompanions;
  return { ...game, world: { ...game.world, flags, discovered: Array.from(discovered) } };
};

export const recruitInGame = (game: GameState, character: CharacterRecord, companionId: string): GameState => {
  if (game.characters[character.id]?.recruited) return game;
  const characters = { ...game.characters, [character.id]: { ...character, recruited: true } };
  const party = game.party.length < 4 ? [...game.party, character.id] : game.party;
  return {
    ...game,
    characters,
    party,
    world: {
      ...game.world,
      flags: { ...game.world.flags, [`recruited_${companionId}`]: true },
      companionParty: party.filter((id) => id !== game.playerId)
    }
  };
};

export const removeCompanionFromParty = (game: GameState, companionId: string): GameState => ({
  ...game,
  party: game.party.filter((id) => id !== companionId),
  world: { ...game.world, companionParty: game.world.companionParty.filter((id) => id !== companionId) }
});

export const leaveCompanion = (game: GameState, companionId: string): GameState => {
  const character = game.characters[companionId];
  if (!character) return game;
  return {
    ...game,
    characters: { ...game.characters, [companionId]: { ...character, recruited: false } },
    party: game.party.filter((id) => id !== companionId),
    world: {
      ...game.world,
      flags: { ...game.world.flags, [`recruited_${companionId}`]: false },
      companionParty: game.world.companionParty.filter((id) => id !== companionId)
    }
  };
};

export const togglePartyMember = (game: GameState, companionId: string): { game: GameState; message: string } => {
  const character = game.characters[companionId];
  if (!character || !character.recruited) return { game, message: 'That companion is not available.' };
  if (game.party.includes(companionId)) {
    if (character.isPlayer) return { game, message: 'The protagonist must remain in the party.' };
    return { game: removeCompanionFromParty(game, companionId), message: `${character.name} moved to reserve.` };
  }
  if (game.party.length >= 4) return { game, message: 'Your party is full. Remove someone first.' };
  return {
    game: {
      ...game,
      party: [...game.party, companionId],
      world: { ...game.world, companionParty: [...game.party, companionId].filter((id) => id !== game.playerId) }
    },
    message: `${character.name} joined the active party.`
  };
};

export const equipItemInGame = (
  game: GameState,
  characterId: string,
  itemId: string
): { game: GameState; message: string } => {
  const character = game.characters[characterId];
  const item = itemById[itemId];
  if (!character || !item) return { game, message: 'That item cannot be equipped.' };
  if (!item.slot) return { game, message: 'That item cannot be equipped.' };
  if (item.classes && !item.classes.includes(character.classId)) {
    return { game, message: `${character.name} cannot use ${item.name}.` };
  }
  if (inventoryCount(game.inventory, itemId) <= 0) return { game, message: 'You do not have that item.' };
  const old = character.equipment[item.slot];
  let inventory = removeItem(game.inventory, itemId, 1);
  if (old) inventory = addItem(inventory, old, 1);
  const equipment = { ...character.equipment, [item.slot]: itemId };
  const nextCharacter = { ...character, equipment };
  nextCharacter.hp = clamp(nextCharacter.hp, 0, maxHp(nextCharacter));
  nextCharacter.resource = clamp(nextCharacter.resource, 0, maxResource(nextCharacter));
  return {
    game: { ...game, inventory, characters: { ...game.characters, [characterId]: nextCharacter } },
    message: `${character.name} equipped ${item.name}.`
  };
};

export const unequipItemInGame = (game: GameState, characterId: string, slot: keyof CharacterRecord['equipment']): { game: GameState; message: string } => {
  const character = game.characters[characterId];
  if (!character) return { game, message: 'Character not found.' };
  const itemId = character.equipment[slot];
  if (!itemId) return { game, message: 'Nothing is equipped there.' };
  const equipment = { ...character.equipment };
  delete equipment[slot];
  const nextCharacter = { ...character, equipment };
  nextCharacter.hp = clamp(nextCharacter.hp, 0, maxHp(nextCharacter));
  nextCharacter.resource = clamp(nextCharacter.resource, 0, maxResource(nextCharacter));
  const item = itemById[itemId];
  return {
    game: {
      ...game,
      inventory: addItem(game.inventory, itemId, 1),
      characters: { ...game.characters, [characterId]: nextCharacter }
    },
    message: `${character.name} removed ${item?.name ?? 'the item'}.`
  };
};

export const useItemInGame = (game: GameState, characterId: string, itemId: string): { game: GameState; message: string } => {
  const character = game.characters[characterId];
  const item = itemById[itemId];
  if (!character || !item) return { game, message: 'That item cannot be used.' };
  if (inventoryCount(game.inventory, itemId) <= 0) return { game, message: 'You do not have that item.' };
  if (item.category !== 'potion' && item.category !== 'scroll') return { game, message: 'That item cannot be used directly.' };
  let nextChar = { ...character };
  const notes: string[] = [];
  if (item.effect?.heal) {
    const amount = Math.floor(Math.random() * 8) + 1 + Math.floor(Math.random() * 8) + 1;
    nextChar.hp = Math.min(maxHp(nextChar), nextChar.hp + amount);
    notes.push(`recovered ${amount} health`);
  }
  if (item.effect?.resource) {
    nextChar.resource = Math.min(maxResource(nextChar), nextChar.resource + item.effect.resource);
    notes.push(`recovered ${item.effect.resource} resource`);
  }
  if (item.effect?.status === 'antidote') notes.push('cured common poisons');
  if (!notes.length) return { game, message: `${item.name} has no effect outside combat.` };
  nextChar.alive = true;
  return {
    game: {
      ...game,
      inventory: removeItem(game.inventory, itemId, 1),
      characters: { ...game.characters, [characterId]: nextChar }
    },
    message: `${character.name} used ${item.name}: ${notes.join(', ')}.`
  };
};

export const restParty = (game: GameState): GameState => {
  const characters = { ...game.characters };
  for (const char of Object.values(characters)) {
    if (char.recruited) {
      const rested = fullRest(char);
      characters[char.id] = rested;
    }
  }
  const player = characters[game.playerId];
  return {
    ...game,
    characters,
    world: { ...game.world, flags: { ...game.world.flags, last_rest_location: game.world.locationId } }
  };
};

export const bestPartySkill = (game: GameState, proficiency: string): number => {
  const attrMap: Record<string, keyof CharacterRecord['attributes']> = {
    Athletics: 'str', Stealth: 'dex', 'Sleight of Hand': 'dex', Investigation: 'int', Arcana: 'int',
    Nature: 'int', Religion: 'int', Insight: 'wis', Perception: 'wis', Survival: 'wis',
    Persuasion: 'cha', Deception: 'cha', Intimidation: 'cha'
  };
  const attr = attrMap[proficiency] ?? 'wis';
  return Math.max(
    0,
    ...game.party
      .map((id) => game.characters[id])
      .filter(Boolean)
      .map((char) => {
        const base = Math.floor((char.attributes[attr] - 10) / 2);
        return base + (char.proficiencies.includes(proficiency) ? 2 : 0);
      })
  );
};

export const partyEquipmentStats = (character: CharacterRecord) => equipmentBonuses(character);
