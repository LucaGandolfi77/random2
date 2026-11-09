import type { AncestryDef } from '@/core/types';

export const ancestries: AncestryDef[] = [
  {
    id: 'erdan',
    name: 'Erdan',
    epithet: 'The Unwritten Folk',
    description:
      'The river-kingdoms of the Erdan were built on compromises: between crown and temple, merchant and farmer, memory and necessity. Erdan are not the oldest people of Elarion, but they are the most stubborn. Their cities keep records of every famine, treaty, and betrayal — and lately, those records have begun writing themselves.',
    bonuses: { cha: 1, dex: 1 },
    traitName: 'Second Wind of the River',
    trait: 'Once per rest, recover 20% of maximum health when reduced below 30% health.',
    dialogueTag: 'Erdan pragmatism',
    palette: '#c99766'
  },
  {
    id: 'aelborn',
    name: 'Aelborn',
    epithet: 'Children of the Long Dream',
    description:
      'The Aelborn remember lives they never lived. Their silver eyes are said to catch the light of the world before the Covenant. They build no empires; they build archives, gardens, and quiet observatories where the dreaming can be heard. Their gentleness is real. So is their ruthlessness with anyone who would wake the dream too soon.',
    bonuses: { int: 2, wis: 1 },
    traitName: 'Echo Sight',
    trait: 'Gain a bonus to Investigation and Arcana checks. Once per scene, reveal a hidden memory or illusion.',
    dialogueTag: 'Aelborn dream-sight',
    palette: '#b9b8d4'
  },
  {
    id: 'cindral',
    name: 'Cindral',
    epithet: 'The Ember-Blooded',
    description:
      'Cindral carry the heat of the first forges in their veins. Their skin is warm to the touch, their tempers warmer, and their smiths can shape metal that remembers fire. They were the first to mine the Ashen Marches, and the first to learn that some things buried beneath the earth should stay buried.',
    bonuses: { str: 2, con: 1 },
    traitName: 'Forgeheart',
    trait: 'Gain resistance to fire damage and a bonus to Intimidation checks. Your ember-bright blood reveals itself in moments of anger.',
    dialogueTag: 'Cindral forge-bond',
    palette: '#d97745'
  },
  {
    id: 'tidewrought',
    name: 'Tidewrought',
    epithet: 'The People Who Listen',
    description:
      'Born along the drowned coasts, the Tidewrought learned that memory travels like water. They trade in salvage, secrets, and songs that can only be sung underwater. Outsiders call them thieves. The Tidewrought call it remembering on behalf of those who forgot.',
    bonuses: { dex: 2, wis: 1 },
    traitName: 'Tidal Memory',
    trait: 'Gain a bonus to Insight and Persuasion. Once per rest, reroll a failed skill check involving memory, water, or the sea.',
    dialogueTag: 'Tidewrought memory',
    palette: '#60aeb6'
  },
  {
    id: 'stoneborn',
    name: 'Stoneborn',
    epithet: 'The Patient Nation',
    description:
      'The Stoneborn were carved from the roots of mountains, or so their oldest songs claim. They measure grief in centuries and promises in generations. Their skin bears faint mineral veins that glow when they lie — which has made them both terrible diplomats and deeply unpopular at card tables.',
    bonuses: { con: 2, str: 1 },
    traitName: 'Mountainsleep',
    trait: 'Gain a bonus to Constitution saves and Athletics checks. You require only four hours to complete a long rest.',
    dialogueTag: 'Stoneborn patience',
    palette: '#9c9a85'
  },
  {
    id: 'wraithmarked',
    name: 'Wraithmarked',
    epithet: 'Those Without Shadows',
    description:
      'Every Wraithmarked has lost something to the dark: a shadow, a reflection, a first love, a name. The mark passes at birth, and with it a gift for walking unnoticed. They are treated with suspicion in Greymoor and reverence in the Whispering Woods. Neither reaction is necessarily deserved.',
    bonuses: { dex: 2, cha: 1 },
    traitName: 'Shadeless',
    trait: 'Gain a bonus to Stealth and Deception checks. You can see in dim light and may step through one hidden passage per region without a check.',
    dialogueTag: 'Wraithmarked kinship',
    palette: '#8c77a8'
  }
];

export const ancestryById = Object.fromEntries(ancestries.map((a) => [a.id, a]));
