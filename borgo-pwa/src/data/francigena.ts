import type { DiscoverySpec, Localized } from './types';

/** Four shell-marked milestones along the Via Francigena in Fidenza. */
export const FRANCIGENA_STONES: DiscoverySpec[] = [
  {
    id: 'vf-ponte',
    name: { it: 'Pietra del Ponte', en: 'Bridge milestone' },
    description: {
      it: 'La conchiglia incisa nella pietra segna l’ingresso del cammino presso il Ponte Romano.',
      en: 'The shell carved into the stone marks the entrance to the route by the Roman bridge.'
    },
    x: -318,
    z: -52,
    radius: 4
  },
  {
    id: 'vf-porta',
    name: { it: 'Pietra della Porta', en: 'Gate milestone' },
    description: {
      it: 'La seconda tappa aspetta davanti a Porta San Donnino, dove il pellegrino entra in città.',
      en: 'The second stage waits before Porta San Donnino, where the pilgrim enters the town.'
    },
    x: -298,
    z: -40,
    radius: 4
  },
  {
    id: 'vf-duomo',
    name: { it: 'Pietra del Duomo', en: 'Cathedral milestone' },
    description: {
      it: 'Nel cuore di Piazza Duomo, la pietra ricorda la sosta sotto la facciata della cattedrale.',
      en: 'In the heart of Piazza Duomo, the stone recalls the stop beneath the cathedral façade.'
    },
    x: -300,
    z: -10,
    radius: 4
  },
  {
    id: 'vf-matteotti',
    name: { it: 'Pietra di Matteotti', en: 'Matteotti milestone' },
    description: {
      it: 'L’ultima pietra prima della taverna, tra il mercato e le vie che scendono verso sud.',
      en: 'The last stone before the tavern, between the market and the streets heading south.'
    },
    x: 39,
    z: 106,
    radius: 4
  }
];

export interface FrancigenaStage {
  placeId: string;
  name: Localized;
  x: number;
  z: number;
}

/** Four outdoor stones and the taverna, the pilgrim’s final stop. */
export const FRANCIGENA_STAGES: FrancigenaStage[] = [
  ...FRANCIGENA_STONES.map((stone) => ({
    placeId: stone.id,
    name: stone.name,
    x: stone.x,
    z: stone.z
  })),
  {
    placeId: 'taverna-interno',
    name: { it: 'La sosta alla Taverna', en: 'The Taverna stop' },
    x: 74,
    z: 104
  }
];

/** The dotted route shown on the full map, following the town’s streets. */
export const FRANCIGENA_ROUTE: Array<{ x: number; z: number }> = [
  { x: -318, z: -52 },
  { x: -305, z: -42 },
  { x: -298, z: -40 },
  { x: -299, z: -25 },
  { x: -300, z: -10 },
  { x: -276, z: 21 },
  { x: -234, z: 12 },
  { x: -199, z: 9 },
  { x: -155, z: 11 },
  { x: -136, z: 14 },
  { x: -116, z: 46 },
  { x: -83, z: 64 },
  { x: -61, z: 80 },
  { x: -27, z: 101 },
  { x: 19, z: 99 },
  { x: 39, z: 106 },
  { x: 69, z: 119 },
  { x: 74, z: 104 }
];

export const CREDENTIAL_STAMP_ID = 'stamp-credential';
export const CREDENTIAL_PLACE_IDS = FRANCIGENA_STAGES.map((stage) => stage.placeId);
