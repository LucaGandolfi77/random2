export type SpecialKind = 'stretch' | 'slash' | 'bolt' | 'fire' | 'pulse' | 'laser' | 'wave' | 'charge'
  | 'void' | 'quake' | 'star' | 'meteor' | 'venom';

export interface FighterDef {
  id: string;
  name: string;
  role: string;
  tagline: string;
  assistName: string;
  colors: { body: string; accent: string; hair: string; skin: string; legs: string; trim: string };
  stats: { power: number; speed: number; defense: number; reach: number };
  special: SpecialKind;
  specialCost: number;
  unlockAfter: number;
}

/** Original archetypes inspired by classic pirate-crew roles. No official names or artwork. */
export const FIGHTERS: FighterDef[] = [
  {
    id: 'rubber', name: 'RUBBER CAPTAIN', role: 'Elastic Brawler', tagline: 'Stretches his limits. Never stays down.',
    assistName: 'RUBBER SNAP', colors: { body: '#e8473f', accent: '#f7d34a', hair: '#3a2118', skin: '#f0c39a', legs: '#2540a8', trim: '#ffffff' },
    stats: { power: 7, speed: 7, defense: 7, reach: 8 }, special: 'stretch', specialCost: 30, unlockAfter: 0
  },
  {
    id: 'blade', name: 'BLADE MASTER', role: 'Three-Sword Duelist', tagline: 'Three blades, one answer.',
    assistName: 'BLADE RUSH', colors: { body: '#1e5b3b', accent: '#e9f0f5', hair: '#204020', skin: '#e8b68c', legs: '#152c20', trim: '#9fe8bd' },
    stats: { power: 9, speed: 6, defense: 5, reach: 8 }, special: 'slash', specialCost: 35, unlockAfter: 0
  },
  {
    id: 'storm', name: 'STORM NAVIGATOR', role: 'Weather Fighter', tagline: 'Reads the sky. Calls the thunder.',
    assistName: 'STORM ARROW', colors: { body: '#e8a13a', accent: '#4a7fd8', hair: '#d94f2b', skin: '#efc4a0', legs: '#263a63', trim: '#8fd8ff' },
    stats: { power: 6, speed: 9, defense: 5, reach: 7 }, special: 'bolt', specialCost: 30, unlockAfter: 0
  },
  {
    id: 'iron', name: 'IRON COOK', role: 'Heavy Brawler', tagline: 'Dinner is served. With both feet.',
    assistName: 'IRON KICK', colors: { body: '#e9eef5', accent: '#d8342f', hair: '#d8d8d0', skin: '#e5b58d', legs: '#22252c', trim: '#ff9a6b' },
    stats: { power: 9, speed: 4, defense: 8, reach: 6 }, special: 'fire', specialCost: 35, unlockAfter: 0
  },
  {
    id: 'tiny', name: 'TINY DOCTOR', role: 'Support Fighter', tagline: 'Small body. Enormous heart.',
    assistName: 'MEDIC BOOST', colors: { body: '#d98cc4', accent: '#f5f0d0', hair: '#a4562b', skin: '#f2cfae', legs: '#6a3f7a', trim: '#ffd7ef' },
    stats: { power: 4, speed: 9, defense: 6, reach: 4 }, special: 'pulse', specialCost: 25, unlockAfter: 0
  },
  {
    id: 'cyborg', name: 'CYBORG SHIPWRIGHT', role: 'Techno Tank', tagline: 'Built in a shipyard. Forged in battle.',
    assistName: 'CYBER SALVO', colors: { body: '#4a5a72', accent: '#f4c542', hair: '#20242b', skin: '#c99572', legs: '#2b3342', trim: '#7fe4ff' },
    stats: { power: 7, speed: 4, defense: 10, reach: 7 }, special: 'laser', specialCost: 40, unlockAfter: 0
  },
  {
    id: 'bone', name: 'BONE MINSTREL', role: 'Trickster', tagline: 'The beat goes on. Even after death.',
    assistName: 'BONE CHORUS', colors: { body: '#dfe4ef', accent: '#8b4fd8', hair: '#20202a', skin: '#e8e8e0', legs: '#3a2b58', trim: '#c79fff' },
    stats: { power: 5, speed: 8, defense: 5, reach: 9 }, special: 'wave', specialCost: 30, unlockAfter: 0
  },
  {
    id: 'hunter', name: 'HUNTER KING', role: 'Lockdown Fighter', tagline: 'The hunt never ends.',
    assistName: 'HUNTER LUNGE', colors: { body: '#2c6e78', accent: '#f0d060', hair: '#e8e8e8', skin: '#d8a478', legs: '#1c3a42', trim: '#ffe9a0' },
    stats: { power: 8, speed: 7, defense: 7, reach: 7 }, special: 'charge', specialCost: 35, unlockAfter: 4
  },
  {
    id: 'specter', name: 'GHOST KNIGHT', role: 'Phantom Duelist', tagline: 'A blade that remembers its owner.',
    assistName: 'PHANTOM EDGE', colors: { body: '#5b6c9c', accent: '#b8c8ff', hair: '#1c2038', skin: '#cfd8ee', legs: '#2b3358', trim: '#9fb4ff' },
    stats: { power: 8, speed: 8, defense: 4, reach: 9 }, special: 'void', specialCost: 32, unlockAfter: 0
  },
  {
    id: 'desert', name: 'DESERT QUEEN', role: 'Sand Sovereign', tagline: 'The dunes answer to her.',
    assistName: 'DUNE STRIKE', colors: { body: '#c98a3e', accent: '#f6df9e', hair: '#33231a', skin: '#d9a06e', legs: '#7a4a2c', trim: '#fff0bf' },
    stats: { power: 8, speed: 6, defense: 7, reach: 8 }, special: 'quake', specialCost: 34, unlockAfter: 2
  },
  {
    id: 'guns', name: 'TWIN GUNNER', role: 'Ranged Trickster', tagline: 'Two hands. Six shots. No mercy.',
    assistName: 'DOUBLE TAP', colors: { body: '#3d4a63', accent: '#f0c542', hair: '#20242c', skin: '#e0b08c', legs: '#222a3a', trim: '#ffdf8a' },
    stats: { power: 6, speed: 9, defense: 4, reach: 10 }, special: 'star', specialCost: 28, unlockAfter: 3
  },
  {
    id: 'giant', name: 'GIANT MECHANIC', role: 'Siege Engineer', tagline: 'Built to break fortresses.',
    assistName: 'PISTON SMASH', colors: { body: '#7a5c44', accent: '#ffa63a', hair: '#2a2018', skin: '#c68f68', legs: '#3c2e24', trim: '#ffd08a' },
    stats: { power: 10, speed: 3, defense: 10, reach: 7 }, special: 'meteor', specialCost: 38, unlockAfter: 5
  },
  {
    id: 'moon', name: 'MOON PRIESTESS', role: 'Mystic Healer', tagline: 'She reads the tide by moonlight.',
    assistName: 'LUNAR MERCY', colors: { body: '#7a6bbf', accent: '#e9e2ff', hair: '#d8d0f5', skin: '#e8c6b0', legs: '#3a3264', trim: '#cbbcff' },
    stats: { power: 5, speed: 7, defense: 6, reach: 8 }, special: 'pulse', specialCost: 24, unlockAfter: 0
  },
  {
    id: 'venom', name: 'SHADOW HUNTER', role: 'Poison Assassin', tagline: 'You will feel it before you see it.',
    assistName: 'VENOM DAGGER', colors: { body: '#2c4a3a', accent: '#8ce06a', hair: '#141c18', skin: '#b9a08c', legs: '#1a2a22', trim: '#b8ff9a' },
    stats: { power: 7, speed: 10, defense: 4, reach: 6 }, special: 'venom', specialCost: 26, unlockAfter: 6
  },
  {
    id: 'berserker', name: 'SEA BERSERKER', role: 'Raging Bruiser', tagline: 'The storm is nothing compared to him.',
    assistName: 'TIDAL RAGE', colors: { body: '#2a6f8a', accent: '#7fe4ff', hair: '#c94f2e', skin: '#c98f70', legs: '#1a3a4c', trim: '#bff4ff' },
    stats: { power: 9, speed: 6, defense: 6, reach: 7 }, special: 'charge', specialCost: 30, unlockAfter: 0
  },
  {
    id: 'gold', name: 'GOLDEN CAPTAIN', role: 'Legendary Leader', tagline: 'Every story ends where he begins.',
    assistName: 'GOLDEN FLEET', colors: { body: '#d9a92f', accent: '#fff2a8', hair: '#2a2014', skin: '#e8b98c', legs: '#4a3218', trim: '#fff8d0' },
    stats: { power: 9, speed: 8, defense: 8, reach: 8 }, special: 'laser', specialCost: 36, unlockAfter: 8
  }
];

export const FIGHTER_BY_ID = Object.fromEntries(FIGHTERS.map((f) => [f.id, f])) as Record<string, FighterDef>;
