import type { ItemKind } from '../core/game-state/types';

export interface ItemDefinition {
  kind: ItemKind;
  name: string;
  short: string;
  description: string;
  color: number;
  icon: string;
}

export const ITEMS: Record<ItemKind, ItemDefinition> = {
  hypeBattery: {
    kind: 'hypeBattery',
    name: 'HYPE BATTERY',
    short: 'BATTERY',
    description: 'Instantly charges 50 Hype meter.',
    color: 0xffd319,
    icon: 'battery',
  },
  goldenMic: {
    kind: 'goldenMic',
    name: 'GOLDEN MIC',
    short: 'MIC',
    description: 'Fires a golden sound blast forward.',
    color: 0xffc300,
    icon: 'mic',
  },
  speakerDrone: {
    kind: 'speakerDrone',
    name: 'SPEAKER DRONE',
    short: 'DRONE',
    description: 'Unleashes three sound waves in a fan.',
    color: 0x39f6ff,
    icon: 'drone',
  },
  glitchCapsule: {
    kind: 'glitchCapsule',
    name: 'GLITCH CAPSULE',
    short: 'GLITCH',
    description: 'Triggers a random beneficial glitch.',
    color: 0x9d4edd,
    icon: 'capsule',
  },
  megaBurger: {
    kind: 'megaBurger',
    name: 'MEGA BURGER',
    short: 'BURGER',
    description: 'Restores 20% damage and 30 Hype.',
    color: 0xff8c42,
    icon: 'burger',
  },
  rocketSneakers: {
    kind: 'rocketSneakers',
    name: 'ROCKET SNEAKERS',
    short: 'ROCKETS',
    description: 'Boosts jump height for 10 seconds.',
    color: 0xff2d95,
    icon: 'shoe',
  },
  commentBomb: {
    kind: 'commentBomb',
    name: 'COMMENT BOMB',
    short: 'BOMB',
    description: 'Explodes into a cloud of emoji shrapnel.',
    color: 0xff4d3d,
    icon: 'bomb',
  },
  turboCan: {
    kind: 'turboCan',
    name: 'TURBO CAN',
    short: 'TURBO',
    description: 'Boosts movement speed for 8 seconds.',
    color: 0x39f6ff,
    icon: 'can',
  },
};

export const ITEM_KINDS = Object.keys(ITEMS) as ItemKind[];

export function isItemKind(value: string): value is ItemKind {
  return value in ITEMS;
}
