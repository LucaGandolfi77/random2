import type { Platform } from '../game/types';

export type StageKind = 'shore' | 'prison' | 'dock' | 'market' | 'forge' | 'sky' | 'frozen' | 'ruins';

export interface StageDef {
  id: string;
  name: string;
  subtitle: string;
  skyTop: string;
  skyBottom: string;
  far: string;
  near: string;
  ground: string;
  groundTop: string;
  platform: string;
  accent: string;
  kind: StageKind;
  platforms: Platform[];
}

const standard: Platform[] = [
  { x: 70, y: 168, w: 96, h: 6 },
  { x: 314, y: 168, w: 96, h: 6 },
  { x: 192, y: 128, w: 96, h: 6 }
];

/** Original arenas with their own platform layouts and colour palettes. */
export const STAGES: StageDef[] = [
  {
    id: 'shore', name: 'SUNSET ARCHIPELAGO', subtitle: 'Where the sky meets the sea',
    skyTop: '#2b3f78', skyBottom: '#f29a6b', far: '#6b5c86', near: '#3c4a6b',
    ground: '#7c6350', groundTop: '#c9a878', platform: '#9a7b5d', accent: '#ffe2a0', kind: 'shore', platforms: standard
  },
  {
    id: 'prison', name: 'IRON DEPTHS', subtitle: 'Six levels below the surface',
    skyTop: '#0d2a2a', skyBottom: '#1e5b4b', far: '#17463e', near: '#0e2f2c',
    ground: '#2d3d38', groundTop: '#6d8c76', platform: '#40564a', accent: '#9fe8bd', kind: 'prison',
    platforms: [{ x: 60, y: 156, w: 120, h: 6 }, { x: 300, y: 156, w: 120, h: 6 }, { x: 180, y: 110, w: 120, h: 6 }]
  },
  {
    id: 'dock', name: 'MARINE DOCKYARD', subtitle: 'Justice has a harbour',
    skyTop: '#3a6fae', skyBottom: '#a8d8f0', far: '#5c7fa2', near: '#2f4d70',
    ground: '#4a5b6b', groundTop: '#9fb3c2', platform: '#5f7488', accent: '#ffffff', kind: 'dock',
    platforms: [{ x: 90, y: 176, w: 110, h: 6 }, { x: 280, y: 176, w: 110, h: 6 }, { x: 186, y: 132, w: 108, h: 6 }]
  },
  {
    id: 'market', name: 'FLOATING MARKET', subtitle: 'Trade never sleeps',
    skyTop: '#5d3a7a', skyBottom: '#e8a46b', far: '#7c5a95', near: '#4a3568',
    ground: '#8a6a4a', groundTop: '#e0b982', platform: '#a8815c', accent: '#ffd98a', kind: 'market',
    platforms: [{ x: 44, y: 160, w: 88, h: 6 }, { x: 180, y: 144, w: 120, h: 6 }, { x: 348, y: 160, w: 88, h: 6 }]
  },
  {
    id: 'forge', name: 'VOLCANIC FORGE', subtitle: 'The fires of the deep',
    skyTop: '#2a1218', skyBottom: '#a83a24', far: '#6a241e', near: '#3a1618',
    ground: '#3c2a28', groundTop: '#8a4a32', platform: '#6a4030', accent: '#ff9a4a', kind: 'forge',
    platforms: [{ x: 56, y: 170, w: 100, h: 6 }, { x: 324, y: 170, w: 100, h: 6 }, { x: 190, y: 116, w: 100, h: 6 }]
  },
  {
    id: 'sky', name: 'SKY FORTRESS', subtitle: 'Above the clouds',
    skyTop: '#2e4f9e', skyBottom: '#c4e5ff', far: '#7c9bd0', near: '#4a6ba8',
    ground: '#5c7292', groundTop: '#d6e8ff', platform: '#8098bd', accent: '#ffffff', kind: 'sky',
    platforms: [{ x: 70, y: 148, w: 96, h: 6 }, { x: 314, y: 148, w: 96, h: 6 }, { x: 192, y: 96, w: 96, h: 6 }]
  },
  {
    id: 'frozen', name: 'FROZEN WHARF', subtitle: 'The sea holds its breath',
    skyTop: '#2b4a6e', skyBottom: '#cae8f5', far: '#6d95b5', near: '#3d6285',
    ground: '#4e6a80', groundTop: '#e0f4ff', platform: '#88b8d0', accent: '#ffffff', kind: 'frozen',
    platforms: [{ x: 80, y: 164, w: 104, h: 6 }, { x: 296, y: 164, w: 104, h: 6 }, { x: 188, y: 120, w: 104, h: 6 }]
  },
  {
    id: 'ruins', name: 'ANCIENT RUINS', subtitle: 'Something still watches here',
    skyTop: '#1d2a3a', skyBottom: '#7a8a86', far: '#4c5c62', near: '#2c3a42',
    ground: '#4a4a42', groundTop: '#9a9a80', platform: '#6c6c58', accent: '#d8e0b0', kind: 'ruins',
    platforms: [{ x: 50, y: 152, w: 110, h: 6 }, { x: 320, y: 152, w: 110, h: 6 }, { x: 185, y: 106, w: 110, h: 6 }]
  }
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<string, StageDef>;
