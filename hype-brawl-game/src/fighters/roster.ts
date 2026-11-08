import { ACE } from './data/ace';
import { NERO } from './data/nero';
import { VELVET } from './data/velvet';
import { ZIA } from './data/zia';
import type { FighterDefinition } from './types';

export interface LockedFighter {
  id: string;
  name: string;
  title: string;
  description: string;
  playable: false;
  accent: number;
  archetype: string;
}

export type RosterEntry = FighterDefinition | LockedFighter;

export const PLAYABLE_FIGHTERS: FighterDefinition[] = [NERO, VELVET, ZIA, ACE];

const LOCKED: LockedFighter[] = [
  {
    id: 'tastiera',
    name: 'TASTIERA NERA',
    title: 'The Pianist',
    description: 'A concert pianist whose arpeggios hit like traffic. In development.',
    playable: false,
    accent: 0xe8d5b5,
    archetype: 'Technical zoner',
  },
  {
    id: 'cuore',
    name: 'CUORE STORTO',
    title: 'The Sadboy',
    description: 'A heartbroken balladeer with a guitar and zero emotional regulation. In development.',
    playable: false,
    accent: 0x6b8cff,
    archetype: 'Trap specialist',
  },
  {
    id: 'commentina',
    name: 'COMMENTINA',
    title: 'The Ratio Queen',
    description: 'She read your post. She already replied. In development.',
    playable: false,
    accent: 0xff6b35,
    archetype: 'Counter zoner',
  },
  {
    id: 'coro',
    name: 'IL CORO',
    title: 'The Stadium Beast',
    description: 'A thousand voices in one body. The stadium sings with him. In development.',
    playable: false,
    accent: 0xffd319,
    archetype: 'Super heavyweight',
  },
  {
    id: 'fashion-error',
    name: 'FASHION ERROR',
    title: 'The Runway Killer',
    description: 'A designer so far ahead of the trend that the trend filed a restraining order. In development.',
    playable: false,
    accent: 0x9d4edd,
    archetype: 'Mobile mix-up',
  },
  {
    id: 'reina',
    name: 'REINA RITMO',
    title: 'The Latin Queen',
    description: 'Reggaeton royalty with a rhythm section in her heels. In development.',
    playable: false,
    accent: 0xff2d95,
    archetype: 'Combo dancer',
  },
  {
    id: 'glitchetta',
    name: 'GLITCHETTA',
    title: 'The Digital Idol',
    description: 'A virtual idol who discovered the joy of rendering errors. In development.',
    playable: false,
    accent: 0x39f6ff,
    archetype: 'Randomizer',
  },
  {
    id: 'honey-badge',
    name: 'HONEY BADGE',
    title: 'The Rodeo Star',
    description: 'Eight seconds on the bull, ten minutes on the combo. In development.',
    playable: false,
    accent: 0xffb703,
    archetype: 'Grappler',
  },
  {
    id: 'nocturna',
    name: 'NOCTURNA',
    title: 'The Dark Star',
    description: 'Headliner of the midnight slot. Nobody has seen her leave the stage. In development.',
    playable: false,
    accent: 0x7b2cbf,
    archetype: 'Shadow fighter',
  },
  {
    id: 'mr-trailer',
    name: 'MR. TRAILER',
    title: 'The Action Hero',
    description: 'The explosion happens three seconds after he walks away. In development.',
    playable: false,
    accent: 0xff4d3d,
    archetype: 'Explosive brawler',
  },
  {
    id: 'the-brand',
    name: 'THE BRAND',
    title: 'The Walking Advertisement',
    description: 'Every move is a sponsorship opportunity. In development.',
    playable: false,
    accent: 0xf5f7fa,
    archetype: 'Summoner',
  },
  {
    id: 'npc-404',
    name: 'NPC 404',
    title: 'The Background Legend',
    description: 'He was in the background of every iconic clip. Now he wants a name. In development.',
    playable: false,
    accent: 0x8a9bb5,
    archetype: 'Mystery fighter',
  },
];

export const ROSTER: RosterEntry[] = [...PLAYABLE_FIGHTERS, ...LOCKED];

export function getFighterDefinition(id: string): FighterDefinition | undefined {
  return PLAYABLE_FIGHTERS.find((fighter) => fighter.id === id);
}

export function getRosterEntry(id: string): RosterEntry | undefined {
  return ROSTER.find((fighter) => fighter.id === id);
}

export function isPlayable(entry: RosterEntry): entry is FighterDefinition {
  return entry.playable === true;
}

export function hexToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
