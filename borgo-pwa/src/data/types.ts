export type Language = 'it' | 'en';

export interface Localized {
  it: string;
  en: string;
}

export type NpcId = 'ada' | 'elio' | 'marta' | 'nino';

export type QuestId = 'bread' | 'letters' | 'flowers' | 'bell';

export type QuestPhase = 'locked' | 'available' | 'active' | 'objective' | 'done';

export type WallTone = 'cream' | 'white' | 'rose' | 'ochre' | 'stone';

export type RoofTone = 'terracotta' | 'brown' | 'slate';

export type BuildingStyle = 'house' | 'shop' | 'cafe' | 'hall' | 'church' | 'tower';

export type DoorSide = 'n' | 's' | 'e' | 'w';

export interface BuildingSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  style: BuildingStyle;
  door: DoorSide;
  wall: WallTone;
  roof: RoofTone;
  sign?: string;
  chimney?: boolean;
}

export type PropKind =
  | 'olive'
  | 'cypress'
  | 'lantern'
  | 'bench'
  | 'pot'
  | 'table'
  | 'chair'
  | 'cart'
  | 'wall'
  | 'arch'
  | 'telescope'
  | 'laundry'
  | 'planter'
  | 'fountain';

export interface PropSpec {
  id: string;
  kind: PropKind;
  x: number;
  z: number;
  rot?: number;
  w?: number;
  d?: number;
  h?: number;
  scale?: number;
}

export interface PathSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  tone?: 'stone' | 'earth';
}

export interface ZoneSpec {
  id: string;
  name: Localized;
  x: number;
  z: number;
  r: number;
}

export interface Spot {
  id: string;
  x: number;
  z: number;
}

export interface NpcSpec {
  id: NpcId;
  x: number;
  z: number;
  facing: number;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DialogueContext {
  quests: Record<QuestId, QuestPhase>;
  letters: number;
  flowers: number;
  tiles: number;
  rank: number;
  finaleSeen: boolean;
}

export type DialogueAction =
  | 'close'
  | 'accept-bread'
  | 'accept-letters'
  | 'accept-flowers'
  | 'accept-bell'
  | 'complete-letters'
  | 'complete-flowers';

export interface DialogueChoice {
  label: Localized;
  action: DialogueAction;
}

export interface Conversation {
  speaker: string;
  lines: Localized[];
  choices?: DialogueChoice[];
}
