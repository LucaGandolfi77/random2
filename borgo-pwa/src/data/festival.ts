import type { Localized, NpcId } from './types';

export interface FestivalSpot {
  id: string;
  x: number;
  z: number;
  label: Localized;
}

export interface FestivalStallSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  color: number;
  label: Localized;
}

export interface FestivalPostcardSpec {
  id: string;
  title: Localized;
  description: Localized;
  color: string;
}

/** The golden lantern that starts the evening. */
export const FESTIVAL_STARTER = { x: -300, z: -18 };

export const FESTIVAL_LANTERNS: FestivalSpot[] = [
  { id: 'lantern-west', x: -313, z: 14, label: { it: 'Lanterna del forno', en: 'Bakery lantern' } },
  { id: 'lantern-north', x: -310, z: 10, label: { it: 'Lanterna del portico', en: 'Portico lantern' } },
  { id: 'lantern-south', x: -296, z: -24, label: { it: 'Lanterna del campanile', en: 'Bell-tower lantern' } },
  { id: 'lantern-east', x: -288, z: 20, label: { it: 'Lanterna del Duomo', en: 'Cathedral lantern' } },
  { id: 'lantern-piazza', x: -278, z: -24, label: { it: 'Lanterna della piazza', en: 'Square lantern' } }
];

export const FESTIVAL_MUSICIANS: FestivalSpot[] = [
  { id: 'musician-porta', x: -300, z: -42, label: { it: 'Il contrabbassista alla Porta', en: 'The double-bass player at the gate' } },
  { id: 'musician-teatro', x: -100, z: 84, label: { it: 'La fisarmonica del Teatro', en: 'The theatre accordionist' } },
  { id: 'musician-station', x: 216, z: -148, label: { it: 'Il clarinettista della stazione', en: 'The station clarinettist' } }
];

export const FESTIVAL_BRANCHES: FestivalSpot[] = [
  { id: 'branch-parco', x: 24, z: 126, label: { it: 'Ramo del Parco', en: 'Park branch' } },
  { id: 'branch-oratorio', x: -225, z: 110, label: { it: 'Ramo di San Giorgio', en: 'San Giorgio branch' } },
  { id: 'branch-sanpietro', x: -250, z: 185, label: { it: 'Ramo di San Pietro', en: 'San Pietro branch' } }
];

export const FESTIVAL_GUEST = {
  id: 'festival-guest',
  x: 219,
  z: -151,
  label: { it: 'Il viaggiatore con la valigia', en: 'The traveller with the suitcase' }
} as const;

export const FESTIVAL_STAGE = { x: -300, z: 16, w: 4.6, d: 3.2 };

export const FESTIVAL_STALLS: FestivalStallSpec[] = [
  { id: 'stall-bread', x: -301, z: 6, w: 2.6, d: 2.1, color: 0xb25840, label: { it: 'Pane di Ada', en: "Ada's bread" } },
  { id: 'stall-flowers', x: -305, z: -4, w: 2.3, d: 2.2, color: 0x6f7f4f, label: { it: 'Fiori di Marta', en: "Marta's flowers" } },
  { id: 'stall-books', x: -284, z: -25, w: 2.4, d: 2.1, color: 0x557387, label: { it: 'Libri di Lidia', en: "Lidia's books" } },
  { id: 'stall-coffee', x: -290, z: -24, w: 2.4, d: 2.1, color: 0xd9a441, label: { it: 'Caffè di Sara', en: "Sara's coffee" } },
  { id: 'stall-news', x: -274, z: 20, w: 2.4, d: 2.1, color: 0x8b6b45, label: { it: 'Giornali di Beppe', en: "Beppe's news" } }
];

/** The named cast moves to these spots while the festival is open. */
export const FESTIVAL_NPC_POSITIONS: Record<NpcId, { x: number; z: number; facing: number }> = {
  ada: { x: -303, z: 8, facing: 0.4 },
  elio: { x: -302, z: 3, facing: 1.1 },
  marta: { x: -307, z: -2, facing: -1.9 },
  nino: { x: -299, z: -24.5, facing: 2.6 },
  beppe: { x: -302, z: 12, facing: 0.1 },
  lidia: { x: -289, z: -22, facing: -2.4 },
  sara: { x: -282, z: -19, facing: 1.5 }
};

/** A short, safe loop inside Piazza Duomo. */
export const FESTIVAL_PROCESSION_PATH = [
  { x: -312, z: 16 },
  { x: -296, z: 8 },
  { x: -296, z: -18 },
  { x: -274, z: -18 },
  { x: -294, z: -20 }
];

export const FESTIVAL_POSTCARDS: FestivalPostcardSpec[] = [
  {
    id: 'postcard-piazza',
    title: { it: 'La piazza addobbata', en: 'The decorated square' },
    description: {
      it: 'Lanterne, teli colorati e il profumo del pane: Piazza Duomo non era mai stata così viva.',
      en: 'Lanterns, coloured cloths and the smell of bread: Piazza Duomo had never felt so alive.'
    },
    color: '#d9a441'
  },
  {
    id: 'postcard-lanterns',
    title: { it: 'Le lanterne di Sara', en: "Sara's lanterns" },
    description: {
      it: 'Cinque luci accese una dopo l’altra, come una frase che la piazza aspettava di dire.',
      en: 'Five lights lit one after another, like a sentence the square had been waiting to say.'
    },
    color: '#e8b05c'
  },
  {
    id: 'postcard-procession',
    title: { it: 'La processione', en: 'The procession' },
    description: {
      it: 'Fidenza cammina insieme sotto le lanterne, dal Duomo alla Porta e ritorno.',
      en: 'Fidenza walks together under the lanterns, from the cathedral to the gate and back.'
    },
    color: '#c2603f'
  },
  {
    id: 'postcard-group',
    title: { it: 'La foto di gruppo', en: 'The group photo' },
    description: {
      it: 'Sette voci, una piazza, una sera che nessuno vuole lasciare andare.',
      en: 'Seven voices, one square, an evening nobody wants to let go.'
    },
    color: '#6f7f4f'
  }
];
