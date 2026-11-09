import type { ItemDef } from '@/core/types';

export const items: ItemDef[] = [
  // Weapons
  { id: 'iron_longsword', name: 'Iron Longsword', description: 'A dependable blade with a notch for every year it has survived.', category: 'weapon', slot: 'weapon', rarity: 'common', value: 32, icon: '⚔', stats: { attack: 1, damage: '1d8' }, classes: ['warrior', 'rogue', 'ranger'] },
  { id: 'greywatch_axe', name: 'Greywatch Axe', description: 'The axe of the village watch. Its haft is wrapped in faded red cord.', category: 'weapon', slot: 'weapon', rarity: 'uncommon', value: 78, icon: '🪓', stats: { attack: 2, damage: '1d10', str: 1 }, classes: ['warrior'] },
  { id: 'cinderbrand', name: 'Cinderbrand', description: 'A Cindral longsword whose edge remembers the forge. It glows faintly when danger is near.', category: 'weapon', slot: 'weapon', rarity: 'rare', value: 210, icon: '🔥', stats: { attack: 3, damage: '1d10', str: 1 }, classes: ['warrior'] },
  { id: 'hollow_needle', name: 'Hollow Needle', description: 'A slender dagger made from a splinter of the Fallen Bastion’s gate.', category: 'weapon', slot: 'weapon', rarity: 'rare', value: 180, icon: '🗡', stats: { attack: 3, damage: '1d6', dex: 1 }, classes: ['rogue'] },
  { id: 'thiefs_knife', name: 'Thief’s Knife', description: 'Short, quiet, and never where the guards expect it.', category: 'weapon', slot: 'weapon', rarity: 'common', value: 24, icon: '🔪', stats: { attack: 1, damage: '1d6' }, classes: ['rogue', 'ranger', 'warlock'] },
  { id: 'ashwood_bow', name: 'Ashwood Bow', description: 'The wood is pale as bone and sings when drawn.', category: 'weapon', slot: 'weapon', rarity: 'uncommon', value: 86, icon: '🏹', stats: { attack: 2, damage: '1d8', dex: 1 }, classes: ['ranger'] },
  { id: 'thornstring_bow', name: 'Thornstring', description: 'A longbow strung with a living root. It never needs restringing.', category: 'weapon', slot: 'weapon', rarity: 'rare', value: 220, icon: '➶', stats: { attack: 3, damage: '1d10', dex: 1 }, classes: ['ranger'] },
  { id: 'oak_staff', name: 'Othren Staff', description: 'A ritual staff carved with the names of drowned temples.', category: 'weapon', slot: 'weapon', rarity: 'uncommon', value: 90, icon: '🪄', stats: { attack: 2, damage: '1d6', int: 1 }, classes: ['mage', 'cleric', 'warlock'] },
  { id: 'covenant_scepter', name: 'Covenant Scepter', description: 'A mace of office carried by village clergy. The chain emblem is worn smooth.', category: 'weapon', slot: 'weapon', rarity: 'uncommon', value: 95, icon: '🔨', stats: { attack: 2, damage: '1d6', wis: 1 }, classes: ['cleric'] },
  { id: 'pactblade', name: 'Pactblade', description: 'A black iron blade that casts no reflection.', category: 'weapon', slot: 'weapon', rarity: 'rare', value: 230, icon: '🗡', stats: { attack: 3, damage: '1d8', cha: 1 }, classes: ['warlock'] },
  { id: 'saints_hammer', name: 'Saint’s Hammer', description: 'The head bears a reliquary of pale glass. Inside, something moves.', category: 'weapon', slot: 'weapon', rarity: 'epic', value: 410, icon: '⚒', stats: { attack: 4, damage: '2d6', wis: 2, con: 1 }, classes: ['cleric', 'warrior'] },
  { id: 'first_memory', name: 'The First Memory', description: 'A blade of white obsidian that seems to remember being a star. It deals additional holy damage to the Crownbound.', category: 'weapon', slot: 'weapon', rarity: 'legendary', value: 900, icon: '✦', stats: { attack: 5, damage: '2d8', int: 2, cha: 1 } },

  // Armor
  { id: 'traveling_clothes', name: 'Traveling Clothes', description: 'Sturdy wool, dust, and the smell of rain.', category: 'armor', slot: 'armor', rarity: 'common', value: 12, icon: '🧥', stats: { ac: 1 }, classes: ['mage', 'rogue', 'warlock'] },
  { id: 'leather_armor', name: 'Layered Leather', description: 'Boiled hide and quiet reinforcements.', category: 'armor', slot: 'armor', rarity: 'common', value: 35, icon: '🥋', stats: { ac: 2 }, classes: ['rogue', 'ranger', 'warlock'] },
  { id: 'chain_mail', name: 'Chain Mail', description: 'Heavy links worn smooth by a previous owner’s fear.', category: 'armor', slot: 'armor', rarity: 'uncommon', value: 80, icon: '🛡', stats: { ac: 4 }, classes: ['warrior', 'cleric'] },
  { id: 'greywatch_coat', name: 'Greywatch Coat', description: 'A long coat of waxed leather and grey fur. The village watch’s last uniform.', category: 'armor', slot: 'armor', rarity: 'rare', value: 190, icon: '🧥', stats: { ac: 3, hp: 6 }, classes: ['ranger', 'rogue'] },
  { id: 'rootwoven_vest', name: 'Rootwoven Vest', description: 'Bark and living moss that shift to cover wounds.', category: 'armor', slot: 'armor', rarity: 'rare', value: 205, icon: '🌿', stats: { ac: 3, con: 1, hp: 8 }, classes: ['ranger', 'cleric'] },
  { id: 'temple_plate', name: 'Drowned Plate', description: 'Othren armor recovered from the temple. It still drips.', category: 'armor', slot: 'armor', rarity: 'rare', value: 250, icon: '🛡', stats: { ac: 5, con: 1 }, classes: ['warrior', 'cleric'] },
  { id: 'warded_robes', name: 'Warded Robes', description: 'Black silk stitched with silver equations.', category: 'armor', slot: 'armor', rarity: 'rare', value: 230, icon: '🪡', stats: { ac: 2, int: 1, resource: 2 }, classes: ['mage', 'warlock'] },
  { id: 'crown_guard_mail', name: 'Crown Guard Mail', description: 'Black plate veined with ember-gold. Wearing it feels like being watched.', category: 'armor', slot: 'armor', rarity: 'epic', value: 520, icon: '♜', stats: { ac: 6, str: 1, hp: 12 }, classes: ['warrior', 'cleric'] },

  // Shields / offhand
  { id: 'wooden_shield', name: 'Wooden Shield', description: 'Painted with a faded grey tower.', category: 'shield', slot: 'offhand', rarity: 'common', value: 18, icon: '🛡', stats: { ac: 2 }, classes: ['warrior', 'cleric'] },
  { id: 'covenant_shield', name: 'Covenant Shield', description: 'A kite shield bearing the nine-linked chain.', category: 'shield', slot: 'offhand', rarity: 'uncommon', value: 72, icon: '⛨', stats: { ac: 3, wis: 1 }, classes: ['warrior', 'cleric'] },
  { id: 'mirror_shard', name: 'Mirror Shard', description: 'A fragment of a mirror that shows a room you have never entered.', category: 'accessory', slot: 'offhand', rarity: 'rare', value: 160, icon: '◈', stats: { ac: 1, int: 1 }, classes: ['mage', 'warlock'] },

  // Helmets
  { id: 'iron_helm', name: 'Iron Helm', description: 'Dented, practical, and warm enough in winter.', category: 'helmet', slot: 'helmet', rarity: 'common', value: 20, icon: '⛑', stats: { ac: 1 } },
  { id: 'watch_cap', name: 'Watch Cap', description: 'A grey hood with a brass chain pin.', category: 'helmet', slot: 'helmet', rarity: 'uncommon', value: 55, icon: '🎩', stats: { ac: 1, wis: 1 } },
  { id: 'circlet_of_echoes', name: 'Circlet of Echoes', description: 'A thin silver band that whispers in the voices of people you have not met yet.', category: 'helmet', slot: 'helmet', rarity: 'rare', value: 210, icon: '👑', stats: { int: 1, cha: 1 } },

  // Accessories
  { id: 'ember_charm', name: 'Ember Charm', description: 'A coal that never cools, strung on leather.', category: 'accessory', slot: 'accessory', rarity: 'uncommon', value: 60, icon: '🜂', stats: { hp: 4, con: 1 } },
  { id: 'pilgrim_beads', name: 'Pilgrim Beads', description: 'Nine beads for nine Shapers. One is missing.', category: 'accessory', slot: 'accessory', rarity: 'uncommon', value: 65, icon: '📿', stats: { wis: 1, resource: 1 } },
  { id: 'tidal_ring', name: 'Tidal Ring', description: 'A band of blue glass that grows warm near deep water.', category: 'accessory', slot: 'accessory', rarity: 'rare', value: 140, icon: '💍', stats: { dex: 1, initiative: 2 } },
  { id: 'hunters_talisman', name: 'Hunter’s Talisman', description: 'A wolf’s tooth on a root cord. It remembers the hunt.', category: 'accessory', slot: 'accessory', rarity: 'rare', value: 155, icon: '🦷', stats: { dex: 1, attack: 1 } },
  { id: 'crown_shard_charm', name: 'Crown Shard', description: 'A sliver of grey metal that hums when the Ashen Crown is near.', category: 'accessory', slot: 'accessory', rarity: 'epic', value: 500, icon: '♛', stats: { resource: 2, cha: 1 } },
  { id: 'betrayers_locket', name: 'Betrayer’s Locket', description: 'Inside is a portrait of someone who has been erased from every record.', category: 'accessory', slot: 'accessory', rarity: 'epic', value: 460, icon: '🔒', stats: { int: 2, cha: 1 } },

  // Potions
  { id: 'healing_potion', name: 'Healing Draught', description: 'A red tincture that tastes of iron and berries.', category: 'potion', rarity: 'common', value: 25, icon: '🧪', stackable: true, effect: { heal: '2d8' } },
  { id: 'greater_healing', name: 'Greater Healing Draught', description: 'Thick, silver-red, and almost too warm to drink.', category: 'potion', rarity: 'uncommon', value: 65, icon: '⚗', stackable: true, effect: { heal: '4d8' } },
  { id: 'focus_tonic', name: 'Focus Tonic', description: 'Clears the fog from the mind and restores 3 class resource.', category: 'potion', rarity: 'uncommon', value: 45, icon: '🫙', stackable: true, effect: { resource: 3 } },
  { id: 'fire_flask', name: 'Fire Flask', description: 'Throwable oil that ignites on impact. Deals 2d6 fire damage in a small area.', category: 'potion', rarity: 'common', value: 30, icon: '🔥', stackable: true, effect: { damageType: 'fire' } },
  { id: 'antidote', name: 'Gravewort Antidote', description: 'Bitter, chalky, and effective. Cures Poisoned.', category: 'potion', rarity: 'common', value: 20, icon: '💧', stackable: true, effect: { status: 'antidote' } },
  { id: 'scroll_revive', name: 'Scroll of Mending', description: 'A single-use prayer for the badly wounded. The ink moves when no one is reading.', category: 'scroll', rarity: 'rare', value: 120, icon: '📜', stackable: true, effect: { heal: '1d8' } },
  { id: 'scroll_chain_lightning', name: 'Scroll of Chain Lightning', description: 'The formula is written in a hand that trembles.', category: 'scroll', rarity: 'rare', value: 140, icon: '📜', stackable: true, effect: { damageType: 'lightning' } },

  // Quest / materials
  { id: 'sealed_letter', name: 'Sealed Letter', description: 'The Reeve’s seal, addressed to a name that has been scratched out.', category: 'quest', rarity: 'uncommon', value: 0, icon: '✉' },
  { id: 'ash_sigil', name: 'Ashen Sigil', description: 'A flat grey disc marked with a crown. It is warm.', category: 'quest', rarity: 'rare', value: 0, icon: '◉' },
  { id: 'root_key', name: 'Root Key', description: 'A living key that fits no lock made by human hands.', category: 'quest', rarity: 'rare', value: 0, icon: '🗝' },
  { id: 'drowned_seal', name: 'Drowned Seal', description: 'An Othren seal of office, green with age.', category: 'quest', rarity: 'epic', value: 0, icon: '🜄' },
  { id: 'crown_fragment', name: 'Crown Fragment', description: 'One of the three fragments of the Ashen Crown.', category: 'quest', rarity: 'legendary', value: 0, icon: '♛' },
  { id: 'gravewort', name: 'Gravewort', description: 'A pale herb that grows where the dead remember.', category: 'material', rarity: 'common', value: 8, icon: '🌿', stackable: true },
  { id: 'ember_dust', name: 'Ember Dust', description: 'Warm ash from a Cindral forge.', category: 'material', rarity: 'common', value: 10, icon: '🜂', stackable: true },
  { id: 'shadow_silk', name: 'Shadow Silk', description: 'Thread spun by something that has no shadow.', category: 'material', rarity: 'uncommon', value: 28, icon: '🕸', stackable: true },
  { id: 'ancient_coin', name: 'Othren Coin', description: 'A coin from a civilization that no longer exists. It is still legal tender in the right market.', category: 'material', rarity: 'uncommon', value: 40, icon: '🪙', stackable: true },
  { id: 'repair_kit', name: 'Armorer’s Kit', description: 'Oil, wire, and patience.', category: 'material', rarity: 'common', value: 18, icon: '🧰', stackable: true },

  // Special loot
  { id: 'warden_cinder', name: 'Warden’s Cinder', description: 'The still-burning heart of the Ash-Warden.', category: 'quest', rarity: 'epic', value: 0, icon: '♥' },
  { id: 'silence_antler', name: 'Antler of Silence', description: 'A black antler that drinks the sound around it.', category: 'accessory', slot: 'accessory', rarity: 'epic', value: 450, icon: '🦌', stats: { wis: 2, ac: 1 } },
  { id: 'saints_tear', name: 'Drowned Saint’s Tear', description: 'A pearl formed around a memory of grief.', category: 'accessory', slot: 'accessory', rarity: 'epic', value: 500, icon: '◌', stats: { wis: 2, resource: 2 } },
  { id: 'crown_of_ashes', name: 'Crown of Ashes', description: 'Not the Ashen Crown. A copy made by someone who understood only its shape.', category: 'helmet', slot: 'helmet', rarity: 'legendary', value: 800, icon: '♛', stats: { cha: 2, wis: 2, ac: 2 } },
  { id: 'sable_shadow', name: 'Sable’s Shadow', description: 'A ribbon of living dark, cool as deep water.', category: 'accessory', slot: 'accessory', rarity: 'legendary', value: 700, icon: '◐', stats: { dex: 2, initiative: 3 } }
];

export const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

export const starterInventory = [
  { itemId: 'healing_potion', quantity: 3 },
  { itemId: 'focus_tonic', quantity: 1 },
  { itemId: 'antidote', quantity: 1 },
  { itemId: 'gravewort', quantity: 2 }
];
