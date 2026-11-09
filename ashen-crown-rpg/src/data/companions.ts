import type { CompanionDef } from '@/core/types';

export const companions: CompanionDef[] = [
  {
    id: 'kaelen',
    name: 'Kaelen Voss',
    classId: 'warrior',
    ancestry: 'erdan',
    title: 'The Grey Knight',
    description:
      'A broad-shouldered man in a ruined watch coat, carrying a sword he no longer believes he has the right to use. Kaelen speaks little and watches doors. He was once a captain of the Covenant’s Grey Watch — before a night in Greymoor that he refuses to explain.',
    personality: 'Duty-bound, dryly funny, quietly furious. Believes mercy is a discipline, not a feeling.',
    secret: 'He carried out the purge at Greymoor under sealed orders. The Reeve helped bury the evidence.',
    questId: 'q_name_in_ashes',
    approvalLikes: ['protect the innocent', 'mercy', 'honest responsibility'],
    approvalDislikes: ['needless sacrifice', 'lying to allies', 'serving the Choir'],
    recruitFlag: 'recruited_kaelen',
    subclass: 'vanguard',
    abilities: ['cleave', 'shield_bash', 'rallying_cry', 'second_wind', 'execute'],
    portrait: { seed: 11, skin: '#9a6b50', hair: '#3d2b24', hairStyle: 1, eyes: '#5d6c63', marking: 'scar', accent: '#6b6f78', outfit: '#5b5b62' },
    baseAttributes: { str: 16, dex: 12, con: 15, int: 10, wis: 13, cha: 11 }
  },
  {
    id: 'nyx',
    name: 'Nyx Ardent',
    classId: 'rogue',
    ancestry: 'wraithmarked',
    title: 'The Knife in the Choir',
    description:
      'A quick-eyed stranger with too many knives and a laugh that never quite reaches her eyes. Nyx claims to be a freelance problem-solver. Her boots are Choir-made, her accent is Greymoor-born, and she knows the Ashen Citadel’s drainage plans by heart.',
    personality: 'Wry, restless, protective of anyone the world has decided to discard. Loyalty frightens her more than death.',
    secret: 'She was sent by the Ashen Choir to observe the mark-bearer and, if necessary, kill them.',
    questId: 'q_knife_for_choir',
    approvalLikes: ['freedom', 'clever solutions', 'protecting outcasts'],
    approvalDislikes: ['blind obedience', 'sacrificing people for doctrine', 'threatening her friends'],
    recruitFlag: 'recruited_nyx',
    subclass: 'assassin',
    abilities: ['backstab', 'smoke_veil', 'poisoned_blade', 'shadowstep', 'deathmark'],
    portrait: { seed: 22, skin: '#c58e72', hair: '#1f1a25', hairStyle: 3, eyes: '#b68bc9', marking: 'shadow', accent: '#3d2f51', outfit: '#2c2a37' },
    baseAttributes: { str: 10, dex: 17, con: 12, int: 13, wis: 11, cha: 14 }
  },
  {
    id: 'ilyra',
    name: 'Ilyra Morn',
    classId: 'mage',
    ancestry: 'aelborn',
    title: 'The Archivist of Absences',
    description:
      'A scholar with ink-stained fingers and eyes the color of a winter sky. Ilyra came to the Whispering Woods searching for her sister, only to discover that every record of the woman has been saying something different for the last twenty years.',
    personality: 'Precise, curious, unexpectedly fierce. Treats knowledge as a moral obligation and affection as an unsolved equation.',
    secret: 'Her memories of her sister may themselves be false — implanted by the Crown to make her follow it.',
    questId: 'q_sister_who_never_was',
    approvalLikes: ['truth', 'protecting knowledge', 'asking difficult questions'],
    approvalDislikes: ['destroying books', 'ignorance', 'choosing comfort over truth'],
    recruitFlag: 'recruited_ilyra',
    subclass: 'evoker',
    abilities: ['ember_lance', 'frost_nova', 'arcane_ward', 'chain_lightning', 'mind_spike'],
    portrait: { seed: 33, skin: '#d3b8a5', hair: '#d8d4dc', hairStyle: 2, eyes: '#8aa8c8', marking: 'rune', accent: '#7e8fae', outfit: '#39445e' },
    baseAttributes: { str: 8, dex: 12, con: 10, int: 17, wis: 14, cha: 10 }
  },
  {
    id: 'oren',
    name: 'Oren Hale',
    classId: 'cleric',
    ancestry: 'stoneborn',
    title: 'The Village Prayer',
    description:
      'The priest of Greymoor’s small Covenant chapel. Oren is gentle, broad-handed, and tired in a way that sleep cannot fix. He has healed every family in the village at least once. He has also begun to hear his prayers answered before he finishes them.',
    personality: 'Compassionate, self-deprecating, stubbornly hopeful. His faith is in people first, doctrine second.',
    secret: 'His holy power comes not from the Nine Shapers but from the Ashen Crown itself.',
    questId: 'q_last_prayer',
    approvalLikes: ['compassion', 'protecting the weak', 'honest faith'],
    approvalDislikes: ['cruelty', 'sacrificing villagers', 'mocking belief'],
    recruitFlag: 'recruited_oren',
    subclass: 'lightbringer',
    abilities: ['mend_wounds', 'bless', 'sacred_flame', 'sanctuary', 'revive'],
    portrait: { seed: 44, skin: '#9a9486', hair: '#6e655d', hairStyle: 4, eyes: '#b9a27a', marking: 'stone', accent: '#7a6d54', outfit: '#6e6149' },
    baseAttributes: { str: 12, dex: 9, con: 15, int: 11, wis: 17, cha: 12 }
  },
  {
    id: 'sable',
    name: 'Sable',
    classId: 'ranger',
    ancestry: 'wraithmarked',
    title: 'The Shadow of the Woods',
    description:
      'A Rootbound warden who speaks to the forest and argues with it. Sable moves without leaving tracks and smiles without showing teeth. Something follows her through the Whispering Woods — something with her face and none of her warmth.',
    personality: 'Blunt, wounded, deeply loyal to places rather than people. She tests everyone before trusting them.',
    secret: 'Her shadow was stolen by the Thorned Court. It now hunts her and anyone who travels with her.',
    questId: 'q_debt_in_shadow',
    approvalLikes: ['protecting the wild', 'directness', 'facing your shadow'],
    approvalDislikes: ['needless destruction of nature', 'lying', 'abandoning a hunt'],
    recruitFlag: 'recruited_sable',
    subclass: 'warden',
    abilities: ['hunters_mark', 'piercing_shot', 'ensnaring_roots', 'volley', 'beast_call'],
    portrait: { seed: 55, skin: '#7f6758', hair: '#2d342b', hairStyle: 0, eyes: '#c4c98d', marking: 'leaves', accent: '#4f6a43', outfit: '#3e4d39' },
    baseAttributes: { str: 11, dex: 17, con: 13, int: 10, wis: 15, cha: 9 }
  }
];

export const companionById = Object.fromEntries(companions.map((c) => [c.id, c]));
