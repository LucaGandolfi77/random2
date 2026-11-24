import { FIDENZA_WORLD } from './fidenza';
import type {
  DiscoverySpec,
  DeliverySpec,
  NpcSpec,
  PropSpec,
  Spot,
  VehicleSpec,
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

export const STIRONE_BRIDGE = { x: -1231.6, z: -40, halfWidth: 15, halfDepth: 11.5 };
export const STIRONE_CENTER = { x: -1230, z: -40 };

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'car-station',
    kind: 'car',
    name: { it: 'Auto crema', en: 'Cream car' },
    x: 150,
    z: -95,
    heading: Math.PI / 2,
    color: 0xd8c9a8
  },
  {
    id: 'car-garibaldi',
    kind: 'car',
    name: { it: 'Auto blu', en: 'Blue car' },
    x: -2,
    z: -48,
    heading: 0.15,
    color: 0x557387
  },
  {
    id: 'car-emilia',
    kind: 'car',
    name: { it: 'Auto verde', en: 'Green car' },
    x: -140,
    z: 20,
    heading: Math.PI / 2,
    color: 0x6f7f58
  },
  {
    id: 'bike-duomo',
    kind: 'bike',
    name: { it: 'Bici rossa', en: 'Red bike' },
    x: -305,
    z: 10,
    heading: Math.PI / 2,
    color: 0xb9553b
  },
  {
    id: 'bike-teatro',
    kind: 'bike',
    name: { it: 'Bici gialla', en: 'Yellow bike' },
    x: -45,
    z: 100,
    heading: -Math.PI / 2,
    color: 0xc2a23f
  },
  {
    id: 'bike-station',
    kind: 'bike',
    name: { it: 'Bici blu', en: 'Blue bike' },
    x: 155,
    z: -105,
    heading: Math.PI / 2,
    color: 0x4f7e93
  },
  {
    id: 'car-sanlazzaro',
    kind: 'car',
    name: { it: 'Auto di San Lazzaro', en: 'San Lazzaro car' },
    x: 540,
    z: 150,
    heading: Math.PI / 2,
    color: 0x8a6f55
  },
  {
    id: 'car-corea',
    kind: 'car',
    name: { it: 'Auto di Corea', en: 'Corea car' },
    x: 600,
    z: 860,
    heading: 0,
    color: 0x5f766a
  },
  {
    id: 'bike-pace',
    kind: 'bike',
    name: { it: 'Bici del Parco', en: 'Park bike' },
    x: 260,
    z: 780,
    heading: -Math.PI / 2,
    color: 0xc2a23f
  },
  {
    id: 'bike-monica',
    kind: 'bike',
    name: { it: 'Bici di Monica', en: 'Monica bike' },
    x: 300,
    z: -150,
    heading: Math.PI,
    color: 0x4f7e93
  },
  {
    id: 'car-luce',
    kind: 'car',
    name: { it: 'Auto di Luce', en: 'Luce car' },
    x: -760,
    z: 240,
    heading: Math.PI / 2,
    color: 0x8a7b61
  },
  {
    id: 'car-santantonio',
    kind: 'car',
    name: { it: "Auto di Sant'Antonio", en: "Sant'Antonio car" },
    x: -660,
    z: -250,
    heading: 0,
    color: 0x5f766a
  },
  {
    id: 'bike-sanpaolo',
    kind: 'bike',
    name: { it: 'Bici di San Paolo', en: 'San Paolo bike' },
    x: -680,
    z: 370,
    heading: -Math.PI / 2,
    color: 0xb9553b
  },
  {
    id: 'bike-luce',
    kind: 'bike',
    name: { it: 'Bici di Luce', en: 'Luce bike' },
    x: -730,
    z: 300,
    heading: Math.PI / 2,
    color: 0xc2a23f
  },
  {
    id: 'car-stirone',
    kind: 'car',
    name: { it: 'Auto del Parco', en: 'Park car' },
    x: -1150,
    z: -20,
    heading: Math.PI / 2,
    color: 0x6f7a5f
  },
  {
    id: 'bike-stirone',
    kind: 'bike',
    name: { it: 'Bici dello Stirone', en: 'Stirone bike' },
    x: -1120,
    z: -30,
    heading: -Math.PI / 2,
    color: 0xb9553b
  },
  {
    id: 'car-azalee',
    kind: 'car',
    name: { it: 'Auto delle Azalee', en: 'Azalee car' },
    x: 930,
    z: 860,
    heading: Math.PI,
    color: 0x8e5b45
  },
  {
    id: 'bike-azalee',
    kind: 'bike',
    name: { it: 'Bici delle Azalee', en: 'Azalee bike' },
    x: 870,
    z: 440,
    heading: Math.PI / 2,
    color: 0x4f8a8b
  },
  {
    id: 'car-cigala',
    kind: 'car',
    name: { it: 'Auto del Cigala', en: 'Cigala car' },
    x: 1010,
    z: 1000,
    heading: -Math.PI / 2,
    color: 0x6b7d8c
  },
  {
    id: 'bike-skate',
    kind: 'bike',
    name: { it: 'Bici dello Skatepark', en: 'Skatepark bike' },
    x: 1020,
    z: 650,
    heading: 0,
    color: 0xc2603f
  }
];

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
  },
  {
    id: 'monica',
    name: { it: 'Monica e la stazione est', en: 'Monica and the east station' },
    description: {
      it: 'Oltre i binari, Fidenza cambia passo: valigie, officine e le prime case del quartiere Monica.',
      en: 'Beyond the tracks, Fidenza changes pace: suitcases, workshops and the first houses of Monica.'
    },
    x: 300,
    z: -160,
    radius: 34
  },
  {
    id: 'sanlazzaro',
    name: { it: 'San Lazzaro', en: 'San Lazzaro' },
    description: {
      it: 'Villette con giardino, la scuola e i negozi di quartiere: la periferia est che sembra un paese.',
      en: 'Houses with gardens, the school and local shops: the eastern outskirts that feel like a village.'
    },
    x: 560,
    z: 160,
    radius: 34
  },
  {
    id: 'granmadre',
    name: { it: 'Santuario della Gran Madre', en: 'Sanctuary of the Gran Madre' },
    description: {
      it: 'La cupola del santuario si alza sopra il quartiere. Qui la città si raccoglie e guarda verso est.',
      en: 'The sanctuary dome rises above the neighbourhood. Here the town gathers and looks east.'
    },
    x: 415.6,
    z: 148.1,
    radius: 24
  },
  {
    id: 'musini',
    name: { it: 'Museo civico Musini', en: 'Musini Civic Museum' },
    description: {
      it: 'Una stanza della memoria fidentina, tra Risorgimento, fotografie e storie di famiglia.',
      en: 'A room of Fidenza’s memory, between the Risorgimento, photographs and family stories.'
    },
    x: 379.6,
    z: 185.9,
    radius: 20
  },
  {
    id: 'parco-vittorio',
    name: { it: 'Parco Vittorio Veneto', en: 'Vittorio Veneto Park' },
    description: {
      it: 'Un polmone verde a sud del centro, con vialetti, panchine e il rumore lontano della città.',
      en: 'A green lung south of the centre, with paths, benches and the distant sound of the town.'
    },
    x: -234.1,
    z: 614.4,
    radius: 36
  },
  {
    id: 'parco-pace',
    name: { it: 'Parco della Pace', en: 'Peace Park' },
    description: {
      it: 'Prato, giochi e filari: il parco largo della periferia sud-est, dove il cielo sembra più grande.',
      en: 'Lawns, play areas and tree rows: the wide south-eastern park where the sky seems larger.'
    },
    x: 278.5,
    z: 798.1,
    radius: 40
  },
  {
    id: 'corea',
    name: { it: 'Corea', en: 'Corea' },
    description: {
      it: 'Viali alberati e case basse ai margini della pianura. La fermata della corriera è il centro del quartiere.',
      en: 'Tree-lined avenues and low houses at the edge of the plain. The bus stop is the heart of the neighbourhood.'
    },
    x: 600,
    z: 880,
    radius: 34
  },
  {
    id: 'luce',
    name: { it: 'Luce', en: 'Luce' },
    description: {
      it: 'Il quartiere a ovest, tra viali larghi, scuole, negozi e piccoli giardini. La città qui rallenta.',
      en: 'The western neighbourhood, among wide avenues, schools, shops and small gardens. The town slows down here.'
    },
    x: -800,
    z: 260,
    radius: 62
  },
  {
    id: 'sanpaolo',
    name: { it: 'San Paolo', en: 'San Paolo' },
    description: {
      it: 'La chiesa di San Paolo e il suo sagrato, punto di ritrovo del quartiere sud-ovest.',
      en: 'The church of San Paolo and its parvis, the meeting point of the south-western neighbourhood.'
    },
    x: -694.2,
    z: 390.5,
    radius: 26
  },
  {
    id: 'santantonio',
    name: { it: "Sant'Antonio Abate", en: "Sant'Antonio Abate" },
    description: {
      it: 'Una chiesa raccolta a nord-ovest, tra le case e i campi che portano verso lo Stirone.',
      en: 'A small church in the north-west, among houses and fields leading towards the Stirone.'
    },
    x: -676.1,
    z: -239.6,
    radius: 24
  },
  {
    id: 'stirone',
    name: { it: 'Parco dello Stirone', en: 'Stirone Park' },
    description: {
      it: 'Il torrente scorre tra argini, pioppi e sentieri. Un ponte di legno collega le due rive e il rumore dell’acqua accompagna il cammino.',
      en: 'The stream runs between banks, poplars and paths. A wooden bridge links the two banks and the sound of water follows the walk.'
    },
    x: -1270,
    z: -40,
    radius: 58
  },
  {
    id: 'pioppi',
    name: { it: 'Bosco dei Pioppi', en: 'Poplar Grove' },
    description: {
      it: 'Un bosco leggero di pioppi e salici, con radure, panche e una piccola torretta per guardare la pianura.',
      en: 'A light wood of poplars and willows, with clearings, benches and a small outlook over the plain.'
    },
    x: -1320,
    z: 110,
    radius: 56
  },
  {
    id: 'azalee',
    name: { it: 'Le Azalee', en: 'Le Azalee' },
    description: {
      it: 'Il quartiere residenziale a est: viali larghi, villette con giardino, negozi di vicinato e una piazza nuova.',
      en: 'The residential district to the east: wide avenues, villas with gardens, local shops and a new square.'
    },
    x: 900,
    z: 420,
    radius: 52
  },
  {
    id: 'centro-commerciale',
    name: { it: 'Centro Commerciale Fidenza', en: 'Fidenza Shopping Centre' },
    description: {
      it: 'Il grande centro commerciale della periferia est, con parcheggi, vetrine e il viavai dei sabati.',
      en: 'The large shopping centre on the eastern edge, with car parks, shop windows and Saturday bustle.'
    },
    x: 980,
    z: 850,
    radius: 60
  },
  {
    id: 'parco-azalee',
    name: { it: 'Parco delle Azalee', en: 'Azalee Park' },
    description: {
      it: 'Un giardino di quartiere tra il centro commerciale e le case: prato, giochi, panchine e aiuole fiorite.',
      en: 'A neighbourhood garden between the shopping centre and the houses: lawn, playground, benches and flower beds.'
    },
    x: 900,
    z: 790,
    radius: 50
  },
  {
    id: 'skatepark',
    name: { it: 'Skatepark Fidenza', en: 'Fidenza Skatepark' },
    description: {
      it: 'Rampa, bowl e graffiti: il punto di ritrovo dei ragazzi della periferia est.',
      en: 'Ramps, bowls and graffiti: the meeting point for the kids of the eastern edge.'
    },
    x: 1045,
    z: 676,
    radius: 42
  },
  {
    id: 'aermacchi',
    name: { it: 'Aermacchi MB-326', en: 'Aermacchi MB-326' },
    description: {
      it: 'Un jet militare su un piedistallo, memoria dell’industria aeronautica fidentina, accanto allo skatepark.',
      en: 'A military jet on a pedestal, remembering Fidenza’s aeronautical industry, beside the skatepark.'
    },
    x: 978,
    z: 672,
    radius: 30
  },
  {
    id: 'cigala',
    name: { it: 'Centro Sportivo “Cigala Andrea”', en: 'Cigala Andrea Sports Centre' },
    description: {
      it: 'Campi da calcio, spogliatoi e famiglie sui bordi: lo sport di quartiere al margine sud-est della città.',
      en: 'Football pitches, changing rooms and families on the sidelines: local sport at the south-eastern edge of town.'
    },
    x: 1053,
    z: 1040,
    radius: 50
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
  },
  {
    id: 'monica',
    name: { it: 'Monica e Stazione Est', en: 'Monica and East Station' },
    x: 300,
    z: -165,
    r: 72
  },
  {
    id: 'san-lazzaro',
    name: { it: 'San Lazzaro', en: 'San Lazzaro' },
    x: 560,
    z: 160,
    r: 72
  },
  {
    id: 'gran-madre',
    name: { it: 'Gran Madre e Museo', en: 'Gran Madre and Museum' },
    x: 405,
    z: 165,
    r: 54
  },
  {
    id: 'parco-vittorio',
    name: { it: 'Parco Vittorio Veneto', en: 'Vittorio Veneto Park' },
    x: -234,
    z: 614,
    r: 62
  },
  {
    id: 'parco-pace',
    name: { it: 'Parco della Pace', en: 'Peace Park' },
    x: 278,
    z: 798,
    r: 66
  },
  {
    id: 'corea',
    name: { it: 'Corea', en: 'Corea' },
    x: 600,
    z: 880,
    r: 72
  },
  {
    id: 'luce',
    name: { it: 'Luce', en: 'Luce' },
    x: -780,
    z: 260,
    r: 105
  },
  {
    id: 'san-paolo',
    name: { it: 'San Paolo', en: 'San Paolo' },
    x: -694,
    z: 390,
    r: 58
  },
  {
    id: 'sant-antonio',
    name: { it: "Sant'Antonio", en: "Sant'Antonio" },
    x: -676,
    z: -240,
    r: 52
  },
  {
    id: 'stirone',
    name: { it: 'Parco dello Stirone', en: 'Stirone Park' },
    x: -1250,
    z: -30,
    r: 120
  },
  {
    id: 'pioppi',
    name: { it: 'Bosco dei Pioppi', en: 'Poplar Grove' },
    x: -1320,
    z: 110,
    r: 72
  },
  {
    id: 'azalee',
    name: { it: 'Le Azalee', en: 'Le Azalee' },
    x: 900,
    z: 470,
    r: 110
  },
  {
    id: 'fidenza-est',
    name: { it: 'Fidenza Est', en: 'East Fidenza' },
    x: 1030,
    z: 800,
    r: 210
  },
  {
    id: 'cigala',
    name: { it: 'Cigala', en: 'Cigala' },
    x: 1053,
    z: 1020,
    r: 82
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


/** Platform beside the OSM siding east of the station. */
export const TRAIN_PLATFORM = { x: 230.1, z: -161.9, radius: 58 };
