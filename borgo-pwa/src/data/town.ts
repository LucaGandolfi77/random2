import { FIDENZA_WORLD } from './fidenza';
import type {
  DiscoverySpec,
  DeliverySpec,
  NpcSpec,
  PropSpec,
  Spot,
  ZoneSpec
} from './types';

export const WORLD = FIDENZA_WORLD;

/** Piazza Duomo, looking east at the cathedral. */
export const SPAWN = {
  x: -300,
  z: 2,
  rot: Math.PI / 2,
  yaw: -Math.PI / 2
};

export const TITLE_VIEW = {
  x: -255,
  z: 0,
  radius: 60,
  height: 36
};

export const NPCS: NpcSpec[] = [
  { id: 'ada', x: -296, z: 8, facing: Math.PI },
  { id: 'elio', x: 10, z: -25, facing: 0.2 },
  { id: 'marta', x: -30, z: 92, facing: Math.PI },
  { id: 'nino', x: -240, z: 25, facing: 0.1 },
  { id: 'beppe', x: -20, z: 0, facing: 0.9 },
  { id: 'lidia', x: -60, z: 80, facing: -0.8 },
  { id: 'sara', x: 160, z: -100, facing: 0.3 }
];

export const TILES: Spot[] = [
  { id: 'tile-duomo', x: -250, z: 15 },
  { id: 'tile-porta', x: -320, z: -60 },
  { id: 'tile-teatro', x: -82.1, z: 62.1 },
  { id: 'tile-comunale', x: -45, z: 60 },
  { id: 'tile-garibaldi', x: -2, z: 40 },
  { id: 'tile-stazione', x: 186.5, z: -112.4 },
  { id: 'tile-sanpietro', x: -275, z: 185 },
  { id: 'tile-oratorio', x: -228, z: 90 },
  { id: 'tile-verdi', x: -30, z: 120 },
  { id: 'tile-parco', x: 40, z: 140 },
  { id: 'tile-emilia', x: -150, z: 10 },
  { id: 'tile-repubblica', x: 210, z: -90 }
];

export const LETTERS: Spot[] = [
  { id: 'letter-porta', x: -300, z: -30 },
  { id: 'letter-garibaldi', x: 0, z: -30 },
  { id: 'letter-stazione', x: 200, z: -95 }
];

export const FLOWERS: Spot[] = [
  { id: 'flower-parco-1', x: 20, z: 125 },
  { id: 'flower-parco-2', x: 35, z: 140 },
  { id: 'flower-parco-3', x: 15, z: 145 },
  { id: 'flower-verdi-1', x: -25, z: 95 },
  { id: 'flower-verdi-2', x: -40, z: 110 }
];

export const DELIVERIES: DeliverySpec[] = [
  {
    id: 'delivery-bread',
    quest: 'bread',
    label: { it: 'Teatro Magnani', en: 'Teatro Magnani' },
    x: -55,
    z: 95,
    radius: 2.5
  },
  {
    id: 'delivery-newspaper',
    quest: 'newspaper',
    label: { it: 'Stazione di Fidenza', en: 'Fidenza station' },
    x: 175,
    z: -100,
    radius: 2.5
  },
  {
    id: 'delivery-book',
    quest: 'book',
    label: { it: 'Chiesa di San Pietro', en: 'San Pietro church' },
    x: -267,
    z: 182,
    radius: 2.5
  },
  {
    id: 'delivery-coffee',
    quest: 'coffee',
    label: { it: 'Palazzo Comunale', en: 'Town Hall' },
    x: 25,
    z: -52,
    radius: 2.5
  }
];

export const BELL_SPOT = { x: -235, z: 34.5 };
export const BELL_TOWER = { x: -235, z: 30, w: 4, d: 4, h: 20 };
export const OBELISK = { x: 10, z: -25 };

export const PROPS: PropSpec[] = [];

export const DISCOVERIES: DiscoverySpec[] = [
  {
    id: 'duomo',
    name: { it: 'Duomo di San Donnino', en: 'Cathedral of San Donnino' },
    description: {
      it: 'La facciata romanica guarda Piazza Duomo. La pietra racconta secoli di pellegrini sulla Via Francigena.',
      en: 'The Romanesque façade faces Piazza Duomo. Its stone tells centuries of pilgrims on the Via Francigena.'
    },
    x: -267.5,
    z: 2.7,
    radius: 34
  },
  {
    id: 'porta',
    name: { it: 'Porta San Donnino', en: 'Porta San Donnino' },
    description: {
      it: 'La porta medievale segnava l’ingresso al borgo lungo la Via Emilia. Oggi è il confine simbolico del centro.',
      en: 'The medieval gate marked the entrance to the town along the Via Emilia. Today it is the symbolic edge of the centre.'
    },
    x: -305.2,
    z: -47.9,
    radius: 18
  },
  {
    id: 'teatro',
    name: { it: 'Teatro Girolamo Magnani', en: 'Teatro Girolamo Magnani' },
    description: {
      it: 'Il teatro ottocentesco è il salotto della città: colonne, velluto e una platea che sa ancora applaudire.',
      en: 'The nineteenth-century theatre is the town’s drawing room: columns, velvet and an audience that still knows how to applaud.'
    },
    x: -94,
    z: 72.1,
    radius: 26
  },
  {
    id: 'comunale',
    name: { it: 'Palazzo Comunale', en: 'Town Hall' },
    description: {
      it: 'Il palazzo civico affaccia su Piazza Garibaldi, tra l’obelisco e il viavai della città.',
      en: 'The civic palace looks onto Piazza Garibaldi, between the obelisk and the bustle of the town.'
    },
    x: 20.4,
    z: -68.6,
    radius: 24
  },
  {
    id: 'stazione',
    name: { it: 'Stazione di Fidenza', en: 'Fidenza Station' },
    description: {
      it: 'La stazione sulla linea Milano–Bologna è la porta della città: binari, valigie e partenze.',
      en: 'The station on the Milan–Bologna line is the town’s door: tracks, suitcases and departures.'
    },
    x: 175.4,
    z: -124.8,
    radius: 28
  },
  {
    id: 'sanpietro',
    name: { it: 'Chiesa di San Pietro', en: 'Church of San Pietro' },
    description: {
      it: 'Una delle chiese più antiche del centro, appartata rispetto alla Via Emilia e ancora piena di silenzio.',
      en: 'One of the oldest churches in the centre, tucked away from the Via Emilia and still full of silence.'
    },
    x: -267,
    z: 198.8,
    radius: 22
  },
  {
    id: 'garibaldi',
    name: { it: 'Piazza Garibaldi', en: 'Piazza Garibaldi' },
    description: {
      it: 'Il cuore civile di Fidenza, con l’obelisco, il palazzo comunale e le ombre dei platani.',
      en: 'The civic heart of Fidenza, with the obelisk, the town hall and the shadows of the plane trees.'
    },
    x: 14.6,
    z: -21,
    radius: 28
  },
  {
    id: 'oratorio',
    name: { it: 'Oratorio di San Giorgio', en: 'Oratory of San Giorgio' },
    description: {
      it: 'Una chiesa minore tra le case, con la facciata stretta e un campanile che sembra guardare i tetti.',
      en: 'A smaller church among the houses, with a narrow façade and a bell tower that seems to watch the roofs.'
    },
    x: -215.6,
    z: 97.5,
    radius: 20
  }
];

export const ZONES: ZoneSpec[] = [
  {
    id: 'piazza-duomo',
    name: { it: 'Piazza Duomo', en: 'Piazza Duomo' },
    x: -297,
    z: -4,
    r: 42
  },
  {
    id: 'via-emilia',
    name: { it: 'Via Emilia', en: 'Via Emilia' },
    x: -140,
    z: 10,
    r: 70
  },
  {
    id: 'garibaldi',
    name: { it: 'Piazza Garibaldi', en: 'Piazza Garibaldi' },
    x: 14,
    z: -21,
    r: 44
  },
  {
    id: 'teatro',
    name: { it: 'Teatro e Comunale', en: 'Theatre and Town Hall' },
    x: -48,
    z: 82,
    r: 52
  },
  {
    id: 'stazione',
    name: { it: 'Stazione', en: 'Station' },
    x: 175,
    z: -110,
    r: 54
  },
  {
    id: 'porta',
    name: { it: 'Porta San Donnino', en: 'Porta San Donnino' },
    x: -305,
    z: -52,
    r: 40
  },
  {
    id: 'sanpietro',
    name: { it: 'San Pietro', en: 'San Pietro' },
    x: -267,
    z: 190,
    r: 34
  },
  {
    id: 'parco',
    name: { it: "Parco all'aperto", en: 'Open-air Park' },
    x: 26,
    z: 132,
    r: 38
  },
  {
    id: 'oratorio',
    name: { it: 'San Giorgio', en: 'San Giorgio' },
    x: -215,
    z: 97,
    r: 30
  }
];

export const STREET_LABELS: Array<{ name: string; x: number; z: number }> = [
  { name: 'Via Emilia', x: -120, z: 12 },
  { name: 'Piazza Duomo', x: -297, z: -4 },
  { name: 'Piazza Garibaldi', x: 14, z: -21 },
  { name: 'Piazza Verdi', x: -19, z: 105 },
  { name: 'Piazza Matteotti', x: 44, z: 109 },
  { name: 'Piazza della Repubblica', x: 195, z: -103 }
];

