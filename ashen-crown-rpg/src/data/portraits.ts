import type { Appearance } from '@/core/types';
import { companionById } from './companions';

export const npcPortraits: Record<string, Appearance> = {
  narrator: { seed: 90, skin: '#d8cbb6', hair: '#d8cbb6', hairStyle: 0, eyes: '#e0bc79', marking: 'none', accent: '#b08b51', outfit: '#282326' },
  crown: { seed: 91, skin: '#c6ad7b', hair: '#d8b05b', hairStyle: 5, eyes: '#ffd47a', marking: 'crown', accent: '#f0c169', outfit: '#34271b' },
  halvard: { seed: 101, skin: '#b98f76', hair: '#c7c0b5', hairStyle: 1, eyes: '#665b4e', marking: 'scar', accent: '#7f6e50', outfit: '#4d4b47' },
  marla: { seed: 102, skin: '#c49a79', hair: '#5b3b32', hairStyle: 2, eyes: '#59684b', marking: 'none', accent: '#745c3f', outfit: '#4a4038' },
  enna: { seed: 103, skin: '#c5a184', hair: '#8b7666', hairStyle: 4, eyes: '#7b6a58', marking: 'none', accent: '#6e5d4d', outfit: '#3b3833' },
  tam: { seed: 104, skin: '#d0ac8b', hair: '#6d5542', hairStyle: 3, eyes: '#7a8573', marking: 'none', accent: '#6b7658', outfit: '#494d3d' },
  orl: { seed: 105, skin: '#b58967', hair: '#4b3e33', hairStyle: 1, eyes: '#665a45', marking: 'none', accent: '#6f6848', outfit: '#4d4b38' },
  preacher: { seed: 106, skin: '#a7856d', hair: '#2e2521', hairStyle: 0, eyes: '#b56b43', marking: 'ritual', accent: '#8c4a2e', outfit: '#3d2f2b' },
  tomas: { seed: 107, skin: '#b58d6e', hair: '#6c5643', hairStyle: 4, eyes: '#5d665a', marking: 'none', accent: '#806a4f', outfit: '#3f3c32' },
  bree: { seed: 108, skin: '#8f6b55', hair: '#3a2a29', hairStyle: 3, eyes: '#8a7a52', marking: 'none', accent: '#847042', outfit: '#493f32' },
  veyra: { seed: 109, skin: '#b49783', hair: '#d7c6a4', hairStyle: 2, eyes: '#d9a546', marking: 'crown', accent: '#c39852', outfit: '#1f1b20' },
  echo: { seed: 110, skin: '#d8c9ae', hair: '#e3d8c6', hairStyle: 5, eyes: '#d9b45c', marking: 'crown', accent: '#b08b55', outfit: '#28202a' }
};

export const getPortrait = (key: string | undefined, player?: Appearance): Appearance => {
  if (!key) return npcPortraits.narrator;
  if (key === 'player') return player ?? npcPortraits.narrator;
  if (npcPortraits[key]) return npcPortraits[key];
  if (companionById[key]) return companionById[key].portrait;
  return npcPortraits.narrator;
};
