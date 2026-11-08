export type StagePropType =
  | 'screen'
  | 'speaker'
  | 'neonSign'
  | 'pillar'
  | 'barrier'
  | 'crate'
  | 'tree'
  | 'lamp'
  | 'billboard'
  | 'ring'
  | 'car'
  | 'tower'
  | 'discoBall'
  | 'camera'
  | 'piano'
  | 'scaffold'
  | 'statue'
  | 'fountain'
  | 'arch'
  | 'flag'
  | 'checkerFlag';

export interface StageProp {
  type: StagePropType;
  x: number;
  y?: number;
  z: number;
  scale?: number;
  rotation?: number;
  color?: string;
  glow?: boolean;
}

export interface StagePalette {
  skyTop: string;
  skyBottom: string;
  floor: string;
  floorLine: string;
  wall: string;
  neonA: string;
  neonB: string;
  fog: string;
  ambient: string;
  sun: string;
  crowdA: string;
  crowdB: string;
}

export interface StageDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  timeOfDay: 'day' | 'sunset' | 'night' | 'neon';
  musicMotif: string;
  palette: StagePalette;
  crowd: { count: number; rows: number };
  props: StageProp[];
  bounds: number;
  cameraBias: number;
}

export const STAGES: StageDefinition[] = [
  {
    id: 'the-last-festival',
    name: 'THE LAST FESTIVAL',
    subtitle: 'Main Stage',
    description: 'L’ultimo festival prima che la terra diventi un contenuto. Il prato è finto, il fango è reale.',
    timeOfDay: 'sunset',
    musicMotif: 'festival',
    palette: {
      skyTop: '#2b1055',
      skyBottom: '#ff6b6b',
      floor: '#3d2b1f',
      floorLine: '#ffd166',
      wall: '#1b1026',
      neonA: '#ff2e63',
      neonB: '#08d9d6',
      fog: '#2b1055',
      ambient: '#7f5aa8',
      sun: '#ffb347',
      crowdA: '#ffd166',
      crowdB: '#ff6b6b'
    },
    crowd: { count: 80, rows: 3 },
    bounds: 7.2,
    cameraBias: 0,
    props: [
      { type: 'screen', x: 0, y: 2.4, z: -6.5, scale: 2.2, color: '#ff2e63', glow: true },
      { type: 'speaker', x: -4.2, z: -5.6, scale: 1.4 },
      { type: 'speaker', x: 4.2, z: -5.6, scale: 1.4 },
      { type: 'scaffold', x: -6.2, z: -6.8, scale: 1.8, color: '#4a4a4a' },
      { type: 'scaffold', x: 6.2, z: -6.8, scale: 1.8, color: '#4a4a4a' },
      { type: 'flag', x: -3.4, y: 1.6, z: -7.4, scale: 1.2, color: '#ff2e63' },
      { type: 'flag', x: 3.4, y: 1.6, z: -7.4, scale: 1.2, color: '#08d9d6' }
    ]
  },
  {
    id: 'metro-0317',
    name: 'METRO 0317',
    subtitle: 'Linea Fantasma',
    description: 'L’ultima corsa della notte. Il convoglio non ferma mai, il pubblico nemmeno.',
    timeOfDay: 'neon',
    musicMotif: 'metro',
    palette: {
      skyTop: '#05060d',
      skyBottom: '#101a2e',
      floor: '#1b1f2a',
      floorLine: '#4ad9d9',
      wall: '#0b0f18',
      neonA: '#4ad9d9',
      neonB: '#ff4d6d',
      fog: '#0b1220',
      ambient: '#2a4a6b',
      sun: '#4ad9d9',
      crowdA: '#4ad9d9',
      crowdB: '#ff4d6d'
    },
    crowd: { count: 60, rows: 2 },
    bounds: 7,
    cameraBias: 0.4,
    props: [
      { type: 'arch', x: 0, y: 2.2, z: -6.8, scale: 2.1, color: '#4ad9d9', glow: true },
      { type: 'pillar', x: -5.4, z: -5.2, scale: 1.8, color: '#2b3445' },
      { type: 'pillar', x: 5.4, z: -5.2, scale: 1.8, color: '#2b3445' },
      { type: 'neonSign', x: 0, y: 3.2, z: -7.2, scale: 1.4, color: '#ff4d6d', glow: true },
      { type: 'crate', x: -3.2, z: -3.8, scale: 0.8, color: '#3a4356' },
      { type: 'crate', x: 3.6, z: -3.6, scale: 0.7, color: '#3a4356' },
      { type: 'lamp', x: 0, y: 3.8, z: -4.8, scale: 1.2, color: '#d8f6ff', glow: true }
    ]
  },
  {
    id: 'club-verticale',
    name: 'CLUB VERTICALE',
    subtitle: 'Sala Specchi',
    description: 'Un club così esclusivo che la fila è più lunga del set. Gli specchi ricordano chi ha ballato male.',
    timeOfDay: 'neon',
    musicMotif: 'club',
    palette: {
      skyTop: '#120019',
      skyBottom: '#3a0050',
      floor: '#150b1f',
      floorLine: '#c77dff',
      wall: '#0d0514',
      neonA: '#c77dff',
      neonB: '#ff2ef5',
      fog: '#24003a',
      ambient: '#5a3a8a',
      sun: '#ff2ef5',
      crowdA: '#c77dff',
      crowdB: '#ff2ef5'
    },
    crowd: { count: 70, rows: 3 },
    bounds: 6.8,
    cameraBias: 0,
    props: [
      { type: 'discoBall', x: 0, y: 4.6, z: -2.4, scale: 1.3, glow: true },
      { type: 'screen', x: 0, y: 2.6, z: -6.4, scale: 2.4, color: '#ff2ef5', glow: true },
      { type: 'speaker', x: -4.6, z: -5.2, scale: 1.6 },
      { type: 'speaker', x: 4.6, z: -5.2, scale: 1.6 },
      { type: 'barrier', x: -2.8, z: -3.6, scale: 1, color: '#c77dff', glow: true },
      { type: 'barrier', x: 2.8, z: -3.6, scale: 1, color: '#c77dff', glow: true },
      { type: 'neonSign', x: -5.8, y: 2.6, z: -4.2, scale: 1.1, color: '#ff2ef5', glow: true }
    ]
  },
  {
    id: 'stadio-dei-commenti',
    name: 'STADIO DEI COMMENTI',
    subtitle: 'Tribuna Digitale',
    description: 'Ottantamila persone, tutte con un’opinione. Il campo è sacro, la chat è tossica, il VAR è un bot.',
    timeOfDay: 'day',
    musicMotif: 'stadium',
    palette: {
      skyTop: '#5aa9e6',
      skyBottom: '#d9f0ff',
      floor: '#2e7d32',
      floorLine: '#f5f5f5',
      wall: '#1b3b2a',
      neonA: '#ffd166',
      neonB: '#ef476f',
      fog: '#b9dcf0',
      ambient: '#cfe8ff',
      sun: '#fff4d6',
      crowdA: '#ef476f',
      crowdB: '#ffd166'
    },
    crowd: { count: 110, rows: 4 },
    bounds: 8,
    cameraBias: 0,
    props: [
      { type: 'screen', x: 0, y: 3, z: -8.2, scale: 2.8, color: '#ffd166', glow: true },
      { type: 'tower', x: -7.2, z: -6.4, scale: 1.8, color: '#d9d9d9' },
      { type: 'tower', x: 7.2, z: -6.4, scale: 1.8, color: '#d9d9d9' },
      { type: 'flag', x: -4.4, y: 1.4, z: -7.6, scale: 1.3, color: '#ef476f' },
      { type: 'flag', x: 4.4, y: 1.4, z: -7.6, scale: 1.3, color: '#ffd166' },
      { type: 'camera', x: 0, y: 1.2, z: -5.4, scale: 1, color: '#333333' },
      { type: 'barrier', x: -3, z: -4.4, scale: 1, color: '#f5f5f5' },
      { type: 'barrier', x: 3, z: -4.4, scale: 1, color: '#f5f5f5' }
    ]
  },
  {
    id: 'studio-9b',
    name: 'STUDIO 9B',
    subtitle: 'Diretta Non Autorizzata',
    description: 'Lo studio più piccolo della televisione, il segnale più forte. La regia è occupata, il pubblico è in piedi.',
    timeOfDay: 'night',
    musicMotif: 'tv',
    palette: {
      skyTop: '#0a0a12',
      skyBottom: '#1b1b2f',
      floor: '#262636',
      floorLine: '#ffd166',
      wall: '#11111c',
      neonA: '#ffd166',
      neonB: '#ff4d6d',
      fog: '#10101c',
      ambient: '#3a3a5a',
      sun: '#ffd166',
      crowdA: '#ffd166',
      crowdB: '#ff4d6d'
    },
    crowd: { count: 50, rows: 2 },
    bounds: 6.6,
    cameraBias: 0.2,
    props: [
      { type: 'camera', x: -4.2, y: 1.4, z: -3.8, scale: 1.2, color: '#222222' },
      { type: 'camera', x: 4.2, y: 1.4, z: -3.8, scale: 1.2, color: '#222222' },
      { type: 'screen', x: 0, y: 2.8, z: -6.2, scale: 2.2, color: '#ff4d6d', glow: true },
      { type: 'neonSign', x: 0, y: 4.2, z: -6.6, scale: 1.5, color: '#ffd166', glow: true },
      { type: 'piano', x: -5.2, z: -5.2, scale: 1, color: '#111111' },
      { type: 'lamp', x: -2.4, y: 3.4, z: -3.2, scale: 1, color: '#fff4d6', glow: true },
      { type: 'lamp', x: 2.4, y: 3.4, z: -3.2, scale: 1, color: '#fff4d6', glow: true }
    ]
  },
  {
    id: 'mall-of-tomorrow',
    name: 'MALL OF TOMORROW',
    subtitle: 'Piano Terra, Negozio Vuoto',
    description: 'Il centro commerciale del futuro: nessun commesso, nessun cliente, solo la musica e i tuoi rimpianti.',
    timeOfDay: 'day',
    musicMotif: 'mall',
    palette: {
      skyTop: '#a8d8ff',
      skyBottom: '#f0f8ff',
      floor: '#d9d9d9',
      floorLine: '#ff8fab',
      wall: '#f5f0e8',
      neonA: '#ff8fab',
      neonB: '#8ecae6',
      fog: '#e8f4ff',
      ambient: '#ffffff',
      sun: '#fffaf0',
      crowdA: '#8ecae6',
      crowdB: '#ff8fab'
    },
    crowd: { count: 40, rows: 2 },
    bounds: 7,
    cameraBias: 0,
    props: [
      { type: 'billboard', x: 0, y: 2.8, z: -6.8, scale: 2.2, color: '#ff8fab', glow: true },
      { type: 'fountain', x: 0, z: -3.6, scale: 1.1, color: '#8ecae6' },
      { type: 'tree', x: -5.2, z: -5.2, scale: 1.4, color: '#6a994e' },
      { type: 'tree', x: 5.2, z: -5.2, scale: 1.4, color: '#6a994e' },
      { type: 'lamp', x: -3.2, y: 2.6, z: -4.2, scale: 1, color: '#fff4d6', glow: true },
      { type: 'lamp', x: 3.2, y: 2.6, z: -4.2, scale: 1, color: '#fff4d6', glow: true },
      { type: 'statue', x: -6.4, z: -6.4, scale: 1.2, color: '#c9c9c9' }
    ]
  },
  {
    id: 'neon-rodeo',
    name: 'NEON RODEO',
    subtitle: 'Polvere e Pixel',
    description: 'Un rodeo dove il cavallo è un ologramma e la polvere è un effetto particellare. Il pubblico paga in attenzione.',
    timeOfDay: 'night',
    musicMotif: 'rodeo',
    palette: {
      skyTop: '#1a0b2e',
      skyBottom: '#ff6b35',
      floor: '#4a2c1a',
      floorLine: '#ffd166',
      wall: '#1b0f1f',
      neonA: '#ffd166',
      neonB: '#ff6b35',
      fog: '#2a1030',
      ambient: '#6b3a5a',
      sun: '#ff9f43',
      crowdA: '#ffd166',
      crowdB: '#ff6b35'
    },
    crowd: { count: 75, rows: 3 },
    bounds: 7.4,
    cameraBias: 0.2,
    props: [
      { type: 'ring', x: 0, y: 0.1, z: -3.2, scale: 2.6, color: '#ffd166', glow: true },
      { type: 'neonSign', x: 0, y: 3.6, z: -7, scale: 1.8, color: '#ff6b35', glow: true },
      { type: 'car', x: -6, z: -6, scale: 1.2, color: '#8b3a3a' },
      { type: 'crate', x: -4.2, z: -4.2, scale: 0.9, color: '#5a3a22' },
      { type: 'crate', x: 4.4, z: -4.4, scale: 0.8, color: '#5a3a22' },
      { type: 'flag', x: -3, y: 1.4, z: -6.4, scale: 1.1, color: '#ffd166' },
      { type: 'flag', x: 3, y: 1.4, z: -6.4, scale: 1.1, color: '#ff6b35' }
    ]
  },
  {
    id: 'pit-lane',
    name: 'PIT LANE',
    subtitle: 'Giro Veloce',
    description: 'La corsia dei box alle tre di notte. Nessun pubblico, solo meccanici che scommettono su di te.',
    timeOfDay: 'neon',
    musicMotif: 'racing',
    palette: {
      skyTop: '#05070d',
      skyBottom: '#0f1b2a',
      floor: '#1a1a1a',
      floorLine: '#ffffff',
      wall: '#0a0a0a',
      neonA: '#e63946',
      neonB: '#ffd166',
      fog: '#0a1018',
      ambient: '#2a3a4a',
      sun: '#e63946',
      crowdA: '#e63946',
      crowdB: '#ffd166'
    },
    crowd: { count: 30, rows: 2 },
    bounds: 7.2,
    cameraBias: 0.6,
    props: [
      { type: 'car', x: -5.4, z: -4.6, scale: 1.3, color: '#e63946' },
      { type: 'car', x: 5.4, z: -4.6, scale: 1.3, color: '#ffd166' },
      { type: 'screen', x: 0, y: 2.6, z: -6.8, scale: 2.4, color: '#e63946', glow: true },
      { type: 'tower', x: -6.8, z: -6.2, scale: 1.6, color: '#2a2a2a' },
      { type: 'tower', x: 6.8, z: -6.2, scale: 1.6, color: '#2a2a2a' },
      { type: 'lamp', x: -3.4, y: 3, z: -3.8, scale: 1.1, color: '#ffffff', glow: true },
      { type: 'lamp', x: 3.4, y: 3, z: -3.8, scale: 1.1, color: '#ffffff', glow: true },
      { type: 'checkerFlag', x: 0, y: 4, z: -7.4, scale: 1.4, color: '#ffffff' }
    ]
  }
];

export const STAGE_BY_ID: Record<string, StageDefinition> = Object.fromEntries(
  STAGES.map((stage) => [stage.id, stage])
);

export function getStage(id: string): StageDefinition {
  return STAGE_BY_ID[id] ?? STAGES[0];
}

export function getRandomStage(): StageDefinition {
  return STAGES[Math.floor(Math.random() * STAGES.length)];
}
