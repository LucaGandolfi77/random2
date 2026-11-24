import type { Localized } from './types';

export type InteriorId = 'museo' | 'centro' | 'stazione' | 'pala' | 'piscina' | 'teatro';

export interface InteriorSpec {
  id: InteriorId;
  name: Localized;
  discoveryId: string;
  exterior: { x: number; z: number };
  room: { x: number; z: number; w: number; d: number; h: number };
  spawn: { x: number; z: number; rot: number; yaw: number };
  exit: { x: number; z: number; radius: number };
}

export const INTERIORS: InteriorSpec[] = [
  {
    id: 'museo',
    name: { it: 'Museo Musini', en: 'Musini Museum' },
    discoveryId: 'museo-interno',
    exterior: { x: 370, z: 185 },
    room: { x: 4000, z: 0, w: 22, d: 14, h: 4.4 },
    spawn: { x: 4000, z: 2.5, rot: 0, yaw: 0 },
    exit: { x: 4000, z: 6.1, radius: 1.8 }
  },
  {
    id: 'centro',
    name: { it: 'Centro Commerciale', en: 'Shopping Centre' },
    discoveryId: 'centro-interno',
    exterior: { x: 950, z: 855 },
    room: { x: 4100, z: 0, w: 34, d: 22, h: 5.2 },
    spawn: { x: 4100, z: 7.0, rot: 0, yaw: 0 },
    exit: { x: 4100, z: 10.2, radius: 2.0 }
  },
  {
    id: 'stazione',
    name: { it: 'Stazione di Fidenza', en: 'Fidenza Station' },
    discoveryId: 'stazione-interno',
    exterior: { x: 175, z: -100 },
    room: { x: 4200, z: 0, w: 30, d: 16, h: 4.6 },
    spawn: { x: 4200, z: 3.8, rot: 0, yaw: 0 },
    exit: { x: 4200, z: 7.3, radius: 1.8 }
  },
  {
    id: 'pala',
    name: { it: 'PalaPratizzoli', en: 'PalaPratizzoli' },
    discoveryId: 'pala-interno',
    exterior: { x: -492, z: 1306 },
    room: { x: 4300, z: 0, w: 30, d: 20, h: 7.0 },
    spawn: { x: 4300, z: 6.2, rot: 0, yaw: 0 },
    exit: { x: 4300, z: 9.3, radius: 1.9 }
  },
  {
    id: 'piscina',
    name: { it: 'Piscina coperta', en: 'Indoor Swimming Pool' },
    discoveryId: 'piscina-interno',
    exterior: { x: -478, z: 1292 },
    room: { x: 4400, z: 0, w: 28, d: 18, h: 6.0 },
    spawn: { x: 4400, z: 5.8, rot: 0, yaw: 0 },
    exit: { x: 4400, z: 8.2, radius: 1.8 }
  },
  {
    id: 'teatro',
    name: { it: 'Teatro Girolamo Magnani', en: 'Teatro Girolamo Magnani' },
    discoveryId: 'teatro-interno',
    exterior: { x: -94, z: 44 },
    room: { x: 4500, z: 0, w: 26, d: 22, h: 8.0 },
    spawn: { x: 4500, z: 7.8, rot: 0, yaw: 0 },
    exit: { x: 4500, z: 10.2, radius: 1.9 }
  }
];

export const INTERIOR_BY_ID = new Map(INTERIORS.map((interior) => [interior.id, interior]));
