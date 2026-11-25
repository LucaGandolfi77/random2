import type { DiscoverySpec } from './types';

export interface BelvedereSpot extends DiscoverySpec {
  /** Initial telescope direction. */
  view: { yaw: number; pitch: number };
  marker: { x: number; z: number };
}

export const BELVEDERE_SPOTS: BelvedereSpot[] = [
  {
    id: 'belvedere-centro',
    name: { it: 'Belvedere del Centro', en: 'Town-centre viewpoint' },
    description: {
      it: 'Piazza Garibaldi, l’obelisco, il Palazzo Comunale e i tetti del centro.',
      en: 'Piazza Garibaldi, the obelisk, the Town Hall and the rooftops of the centre.'
    },
    x: 14,
    z: -40,
    radius: 5,
    view: { yaw: Math.PI, pitch: 0.12 },
    marker: { x: 16, z: -38 }
  },
  {
    id: 'belvedere-stirone',
    name: { it: 'Belvedere dello Stirone', en: 'Stirone viewpoint' },
    description: {
      it: 'Il letto del torrente, i pioppi e il ponte che porta il cammino verso ovest.',
      en: 'The stream bed, the poplars and the bridge carrying the route west.'
    },
    x: -1240,
    z: 20,
    radius: 5,
    view: { yaw: -0.149, pitch: 0.12 },
    marker: { x: -1238, z: 18 }
  },
  {
    id: 'belvedere-stazione',
    name: { it: 'Belvedere della Stazione', en: 'Station viewpoint' },
    description: {
      it: 'I binari, il treno regionale e la campagna che si apre verso est.',
      en: 'The tracks, the regional train and the countryside opening to the east.'
    },
    x: 230,
    z: -150,
    radius: 5,
    view: { yaw: -Math.PI / 2, pitch: 0.12 },
    marker: { x: 232, z: -152 }
  },
  {
    id: 'belvedere-parco',
    name: { it: 'Belvedere del Parco', en: 'Park viewpoint' },
    description: {
      it: 'Il Parco della Pace, i prati, i giochi e le chiome degli alberi verso sud.',
      en: 'Parco della Pace, its lawns, playground and the tree canopy to the south.'
    },
    x: 278,
    z: 760,
    radius: 5,
    view: { yaw: Math.PI, pitch: 0.12 },
    marker: { x: 280, z: 762 }
  },
  {
    id: 'belvedere-stadio',
    name: { it: 'Belvedere dello Stadio', en: 'Stadium viewpoint' },
    description: {
      it: 'Il campo del Ballotta, le tribune e il quartiere sportivo del sud.',
      en: 'The Ballotta pitch, the stands and the southern sports district.'
    },
    x: -362,
    z: 1160,
    radius: 5,
    view: { yaw: Math.PI, pitch: 0.12 },
    marker: { x: -360, z: 1162 }
  }
];
