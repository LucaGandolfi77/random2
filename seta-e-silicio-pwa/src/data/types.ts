export type Lang = "it" | "en";

export interface Localized {
  it: string;
  en: string;
}

export type ChapterId = "alba" | "piazza" | "giardino" | "pioggia" | "lanterne";
export type CharacterId = "mei" | "nainai" | "hao7" | "chen" | "feng" | "shen" | "zhou" | "narrator";
export type EndingId = "archive" | "release" | "community";

export interface Character {
  id: CharacterId;
  name: Localized;
  role: Localized;
  color: number;
  accent: number;
  bio: Localized;
}

export interface Effects {
  facts?: string[];
  flags?: string[];
  removeFlags?: string[];
}

export interface Requirements {
  facts?: string[];
  flags?: string[];
}

export interface StoryChoice {
  id: string;
  text: Localized;
  requires?: Requirements;
  lockedHint?: Localized;
  effects?: Effects;
  next?: string;
  ending?: EndingId;
  tone?: "gentle" | "bold" | "memory" | "final";
}

export interface StoryNode {
  id: string;
  speaker: CharacterId;
  text: Localized;
  effects?: Effects;
  next?: string;
  choices?: StoryChoice[];
  rewindHint?: Localized;
}

export interface Dialogue {
  id: string;
  chapter: ChapterId;
  title: Localized;
  start: string;
  nodes: StoryNode[];
  onEnd?: Effects;
  retryable?: boolean;
}

export interface Hotspot {
  id: string;
  chapter: ChapterId;
  label: Localized;
  hint: Localized;
  position: [number, number, number];
  radius: number;
  dialogueId?: string;
  kind?: "talk" | "look" | "sit" | "journal";
}

export interface ActorPlacement {
  character: CharacterId;
  position: [number, number];
  rotation?: number;
}

export interface ChapterPalette {
  sky: number;
  fog: number;
  ground: number;
  water: number;
  sun: number;
  ambient: number;
  accent: number;
}

export interface Chapter {
  id: ChapterId;
  number: number;
  title: Localized;
  subtitle: Localized;
  location: Localized;
  objective: Localized;
  palette: ChapterPalette;
  weather: "clear" | "rain" | "night";
  spawn: [number, number];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  actors: ActorPlacement[];
  hotspots: Hotspot[];
  dialogues: Dialogue[];
}

export interface JournalEntry {
  id: string;
  title: Localized;
  body: Localized;
  requires?: Requirements;
}

export interface Ending {
  id: EndingId;
  title: Localized;
  kicker: Localized;
  body: Localized;
  epilogue: Localized[];
}

export interface DialogueRuntime {
  dialogueId: string;
  nodeId: string;
  baseFlags: string[];
  baseCompleted: string[];
  rewound: boolean;
}

export interface StoryState {
  version: 1;
  chapter: number;
  facts: string[];
  flags: string[];
  completed: string[];
  rewinds: number;
  dialogue: DialogueRuntime | null;
  lastDialogue: DialogueRuntime | null;
  finalChoice: EndingId | null;
}

export interface ChoiceView {
  choice: StoryChoice;
  locked: boolean;
}
