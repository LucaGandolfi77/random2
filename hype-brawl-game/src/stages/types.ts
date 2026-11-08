export interface PlatformDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: 'main' | 'floating' | 'ledge' | 'moving';
  moving?: {
    axis: 'x' | 'y';
    amplitude: number;
    speed: number;
    phase: number;
  };
}

export interface BlastZones {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SpawnPoint {
  x: number;
  y: number;
  facing: 1 | -1;
}

export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface StageHazard {
  type: 'speaker' | 'train' | 'laser';
  x: number;
  y: number;
  radius: number;
  interval: number;
  warning: number;
  duration: number;
  damage: number;
  angle: number;
  baseKnockback: number;
  knockbackGrowth: number;
}

export interface StageTheme {
  skyTop: number;
  skyBottom: number;
  fog: number;
  accent: number;
  accent2: number;
  floor: number;
  floorEdge: number;
}

export interface StageDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  playable: true;
  platforms: PlatformDefinition[];
  blastZones: BlastZones;
  spawns: SpawnPoint[];
  cameraBounds: CameraBounds;
  theme: StageTheme;
  music: 'festival' | 'metro' | 'club';
  hazard?: StageHazard;
}

export interface LockedStage {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  playable: false;
  accent: number;
}

export type StageEntry = StageDefinition | LockedStage;
