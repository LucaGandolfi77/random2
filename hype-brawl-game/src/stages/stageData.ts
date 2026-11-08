import type { LockedStage, StageDefinition, StageEntry } from './types';

export const LAST_FESTIVAL: StageDefinition = {
  id: 'last-festival',
  name: 'THE LAST FESTIVAL',
  subtitle: 'MAIN STAGE // 22:40',
  description:
    'A giant pop stage built on a festival floor. Speaker stacks, synchronized lights and one proudly unstable center platform.',
  playable: true,
  music: 'festival',
  platforms: [
    { id: 'ground', x: 0, y: 0, width: 20, height: 1.1, style: 'main' },
    { id: 'left-float', x: -6.2, y: 2.9, width: 4.2, height: 0.35, style: 'floating' },
    { id: 'right-float', x: 6.2, y: 2.9, width: 4.2, height: 0.35, style: 'floating' },
    {
      id: 'center-float',
      x: 0,
      y: 4.7,
      width: 4.6,
      height: 0.35,
      style: 'moving',
      moving: { axis: 'y', amplitude: 1.0, speed: 0.014, phase: 0 },
    },
  ],
  blastZones: { left: -15, right: 15, top: 12, bottom: -7 },
  spawns: [
    { x: -3.2, y: 6.4, facing: 1 },
    { x: 3.2, y: 6.4, facing: -1 },
    { x: -1.4, y: 7.0, facing: 1 },
    { x: 1.4, y: 7.0, facing: -1 },
  ],
  cameraBounds: { minX: -11, maxX: 11, minY: 0.5, maxY: 8.5 },
  hazard: {
    type: 'speaker',
    x: 0,
    y: 1.0,
    radius: 3.8,
    interval: 420,
    warning: 75,
    duration: 28,
    damage: 9,
    angle: 85,
    baseKnockback: 28,
    knockbackGrowth: 60,
  },
  theme: {
    skyTop: 0x090117,
    skyBottom: 0x3a0b4d,
    fog: 0x1a0628,
    accent: 0xff2d95,
    accent2: 0x39f6ff,
    floor: 0x1a1028,
    floorEdge: 0xff2d95,
  },
};

export const METRO_0317: StageDefinition = {
  id: 'metro-0317',
  name: 'METRO 03:17',
  subtitle: 'NIGHT SERVICE // PLATFORM 4',
  description:
    'The last train left twelve minutes ago. A futuristic subway platform carved by neon, suspended above a very impatient city.',
  playable: true,
  music: 'metro',
  platforms: [
    { id: 'ground', x: 0, y: 0, width: 18, height: 1.0, style: 'main' },
    { id: 'left-float', x: -5.5, y: 2.7, width: 4.0, height: 0.35, style: 'floating' },
    { id: 'right-float', x: 5.5, y: 2.7, width: 4.0, height: 0.35, style: 'floating' },
    {
      id: 'center-float',
      x: 0,
      y: 4.5,
      width: 5.0,
      height: 0.35,
      style: 'moving',
      moving: { axis: 'x', amplitude: 2.1, speed: 0.012, phase: 1.2 },
    },
    { id: 'high-left', x: -7.4, y: 5.2, width: 2.8, height: 0.35, style: 'floating' },
  ],
  blastZones: { left: -14.5, right: 14.5, top: 12, bottom: -6.5 },
  spawns: [
    { x: -4.8, y: 6.6, facing: 1 },
    { x: 4.8, y: 6.6, facing: -1 },
    { x: -1.2, y: 6.9, facing: 1 },
    { x: 1.2, y: 6.9, facing: -1 },
  ],
  cameraBounds: { minX: -10.5, maxX: 10.5, minY: 0.5, maxY: 8.5 },
  hazard: {
    type: 'train',
    x: -4,
    y: 1.0,
    radius: 4.2,
    interval: 480,
    warning: 80,
    duration: 36,
    damage: 8,
    angle: 20,
    baseKnockback: 30,
    knockbackGrowth: 55,
  },
  theme: {
    skyTop: 0x02040d,
    skyBottom: 0x071d33,
    fog: 0x06121f,
    accent: 0x39f6ff,
    accent2: 0xff2d95,
    floor: 0x102030,
    floorEdge: 0x39f6ff,
  },
};

export const CLUB_VERTICALE: StageDefinition = {
  id: 'club-verticale',
  name: 'CLUB VERTICALE',
  subtitle: 'FLOOR 9 // NO LAST CALL',
  description:
    'A vertical nightclub where the bass holds the platforms up. The disco ball controls the lights and the laser grid controls the pace.',
  playable: true,
  music: 'club',
  platforms: [
    { id: 'ground', x: 0, y: 0, width: 17, height: 1.0, style: 'main' },
    { id: 'left-float', x: -5.8, y: 2.7, width: 3.8, height: 0.35, style: 'floating' },
    { id: 'right-float', x: 5.8, y: 2.7, width: 3.8, height: 0.35, style: 'floating' },
    {
      id: 'center-float',
      x: 0,
      y: 4.4,
      width: 4.6,
      height: 0.35,
      style: 'moving',
      moving: { axis: 'x', amplitude: 2.0, speed: 0.018, phase: 0 },
    },
    { id: 'top-float', x: 0, y: 6.5, width: 3.4, height: 0.35, style: 'floating' },
  ],
  blastZones: { left: -14, right: 14, top: 12.5, bottom: -7 },
  spawns: [
    { x: -4.8, y: 6.9, facing: 1 },
    { x: 4.8, y: 6.9, facing: -1 },
    { x: -1.2, y: 7.2, facing: 1 },
    { x: 1.2, y: 7.2, facing: -1 },
  ],
  cameraBounds: { minX: -10, maxX: 10, minY: 0.5, maxY: 9 },
  hazard: {
    type: 'laser',
    x: 0,
    y: 3.2,
    radius: 4.8,
    interval: 360,
    warning: 60,
    duration: 24,
    damage: 10,
    angle: 90,
    baseKnockback: 30,
    knockbackGrowth: 70,
  },
  theme: {
    skyTop: 0x06010f,
    skyBottom: 0x1e0538,
    fog: 0x12031f,
    accent: 0x9d4edd,
    accent2: 0xffd319,
    floor: 0x1a0b2a,
    floorEdge: 0x9d4edd,
  },
};

export const PLAYABLE_STAGES: StageDefinition[] = [LAST_FESTIVAL, METRO_0317, CLUB_VERTICALE];

const LOCKED_STAGES: LockedStage[] = [
  {
    id: 'stadium',
    name: 'STADIO DEI COMMENTI',
    subtitle: 'MILESTONE 5',
    description: 'A stadium built from screens and opinions. Every seat is a reply. In development.',
    playable: false,
    accent: 0xff6b35,
  },
  {
    id: 'studio-9b',
    name: 'STUDIO 9B',
    subtitle: 'MILESTONE 5',
    description: 'A film set where the scenery moves and the explosions are always practical. In development.',
    playable: false,
    accent: 0xffd319,
  },
  {
    id: 'mall-of-tomorrow',
    name: 'MALL OF TOMORROW',
    subtitle: 'MILESTONE 5',
    description: 'An infinite mall with escalators that only go up. In development.',
    playable: false,
    accent: 0x39f6ff,
  },
  {
    id: 'neon-rodeo',
    name: 'NEON RODEO',
    subtitle: 'MILESTONE 5',
    description: 'A neon western arena with a mechanical bull that has opinions. In development.',
    playable: false,
    accent: 0xff2d95,
  },
  {
    id: 'pit-lane',
    name: 'PIT LANE',
    subtitle: 'MILESTONE 5',
    description: 'A suspended racetrack stage where the pit crew joins the fight. In development.',
    playable: false,
    accent: 0xff4d3d,
  },
];

export const STAGES: StageEntry[] = [...PLAYABLE_STAGES, ...LOCKED_STAGES];

export function getStageDefinition(id: string): StageDefinition | undefined {
  return PLAYABLE_STAGES.find((stage) => stage.id === id);
}

export function getStageEntry(id: string): StageEntry | undefined {
  return STAGES.find((stage) => stage.id === id);
}
