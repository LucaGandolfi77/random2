export type Language = 'it' | 'en';

export interface Localized {
  it: string;
  en: string;
}

export type NpcId = 'ada' | 'elio' | 'marta' | 'nino' | 'beppe' | 'lidia' | 'sara';

export type VehicleKind = 'car' | 'bike';

export type FestivalPhase = 'locked' | 'ready' | 'active' | 'procession' | 'done';

export type QuestId =
  | 'bread'
  | 'letters'
  | 'flowers'
  | 'newspaper'
  | 'book'
  | 'coffee'
  | 'bell';

export type QuestPhase = 'locked' | 'available' | 'active' | 'objective' | 'done';

export type PropKind =
  | 'olive'
  | 'plane'
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

export interface VehicleSpec {
  id: string;
  kind: VehicleKind;
  name: Localized;
  x: number;
  z: number;
  heading: number;
  color: number;
}

export interface NpcSpec {
  id: NpcId;
  x: number;
  z: number;
  facing: number;
}

export interface DiscoverySpec {
  id: string;
  name: Localized;
  description: Localized;
  x: number;
  z: number;
  radius: number;
  /** Set for discoveries that exist only inside an interior scene. */
  interior?: string;
}

export interface DeliverySpec {
  id: string;
  quest: QuestId;
  label: Localized;
  x: number;
  z: number;
  radius: number;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface FestivalContext {
  phase: FestivalPhase;
  lanterns: number;
  musicians: number;
  branches: number;
  garland: boolean;
  guest: boolean;
  canStartProcession: boolean;
}

export interface DialogueContext {
  quests: Record<QuestId, QuestPhase>;
  letters: number;
  flowers: number;
  tiles: number;
  rank: number;
  finaleSeen: boolean;
  festival: FestivalContext;
}

export type DialogueAction =
  | 'close'
  | 'accept-bread'
  | 'accept-letters'
  | 'accept-flowers'
  | 'accept-newspaper'
  | 'accept-book'
  | 'accept-coffee'
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
