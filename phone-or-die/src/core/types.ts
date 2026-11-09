export type Screen = 'menu' | 'intro' | 'game' | 'gameover' | 'ending';

export type Difficulty = 'story' | 'normal' | 'nightmare';

export type Origin = 'work' | 'appointment';

export type ContactId =
  | 'sophie'
  | 'mom'
  | 'dad'
  | 'daniel'
  | 'alex'
  | 'jessica'
  | 'mike'
  | 'priya'
  | 'unknown';

export type PhoneTab = 'home' | 'contacts' | 'messages' | 'history';

export type ThreatStage = 0 | 1 | 2 | 3 | 4;

export interface PortraitSpec {
  seed: number;
  skin: string;
  hair: string;
  hairStyle: number;
  eyes: string;
  outfit: string;
  accent: string;
  background: string;
}

export interface ContactDef {
  id: ContactId;
  name: string;
  shortName: string;
  relationship: string;
  description: string;
  personality: string;
  portrait: PortraitSpec;
  color: string;
  /** Night minutes (0 = 22:00) during which they are normally reachable. */
  windows: { from: number; to: number }[];
  baseAnswerChance: number;
  callCost: number;
  threatRelief: number;
  protectionSeconds: number;
  trustStart: number;
  special: string;
  secret?: string;
  unknown?: boolean;
}

export interface ContactState {
  trust: number;
  answered: number;
  missed: number;
  lastCallNight: number | null;
  callCount: number;
  voicemails: string[];
  revealed: string[];
  completedCalls: string[];
  lied: boolean;
  unlocked: boolean;
}

export interface StoryEffect {
  type:
    | 'threat'
    | 'shield'
    | 'battery'
    | 'trust'
    | 'flag'
    | 'clue'
    | 'message'
    | 'time'
    | 'barricade'
    | 'power'
    | 'flashlight'
    | 'item'
    | 'objective'
    | 'ending'
    | 'gameover'
    | 'call'
    | 'unlockContact';
  id?: string;
  amount?: number;
  value?: string | number | boolean;
  text?: string;
}

export interface CallChoice {
  id: string;
  text: string;
  next?: string;
  effects?: StoryEffect[];
  tag?: string;
}

export interface CallNode {
  /** Optional; nodes are keyed by id in the call definition. */
  id?: string;
  speaker: string;
  portrait?: ContactId | 'emma' | 'narrator' | 'unknown';
  text: string;
  choices?: CallChoice[];
  next?: string;
  effects?: StoryEffect[];
}

export interface CallDef {
  id: string;
  contactId: ContactId;
  title: string;
  minChapter: number;
  maxChapter: number;
  requiresFlag?: string;
  forbidsFlag?: string;
  once?: boolean;
  start: string;
  nodes: Record<string, CallNode>;
}

export interface EventChoice {
  id: string;
  label: string;
  description?: string;
  effects: StoryEffect[];
}

export interface EventDef {
  id: string;
  title: string;
  kicker: string;
  text: string;
  minChapter: number;
  maxChapter: number;
  weight: number;
  requiresFlag?: string;
  forbidsFlag?: string;
  once?: boolean;
  incoming?: boolean;
  choices: EventChoice[];
}

export interface MessageDef {
  id: string;
  contactId: ContactId | 'unknown' | 'system';
  from: string;
  at: number;
  text: string;
  requiresFlag?: string;
  effects?: StoryEffect[];
}

export interface ChapterDef {
  index: number;
  startMinute: number;
  timeLabel: string;
  title: string;
  subtitle: string;
  objective: string;
  quote: string;
  color: string;
}

export interface ZoneDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type InteractKind =
  | 'charger'
  | 'powerbank'
  | 'battery'
  | 'flashlight'
  | 'laptop'
  | 'television'
  | 'photo'
  | 'note'
  | 'lock'
  | 'panel'
  | 'breaker'
  | 'mirror'
  | 'window'
  | 'garden'
  | 'drawer'
  | 'radio'
  | 'payphone'
  | 'streetlight'
  | 'busstop'
  | 'kiosk'
  | 'car'
  | 'bench'
  | 'sign'
  | 'puddle'
  | 'dumpster'
  | 'vending'
  | 'home';

export interface InteractableDef {
  id: string;
  label: string;
  zone: string;
  x: number;
  y: number;
  kind: InteractKind;
  prompt: string;
  once?: boolean;
  requiresFlag?: string;
  forbidsFlag?: string;
  effects: StoryEffect[];
  repeatable?: boolean;
  maxUses?: number;
}

export interface EndingDef {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  epilogue: string;
  color: string;
  hint: string;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  textSize: number;
  brightness: number;
  reducedMotion: boolean;
  highContrast: boolean;
  showTimers: boolean;
}

export interface CallHistoryEntry {
  id: number;
  contactId: ContactId | 'unknown';
  name: string;
  type: 'outgoing' | 'incoming' | 'missed' | 'voicemail' | 'declined';
  at: number;
  duration: number;
  note?: string;
}

export interface GameStats {
  callsMade: number;
  callsAnswered: number;
  callsMissed: number;
  unknownAnswered: boolean;
  cluesFound: number;
  contactsWarned: number;
  secondsAtHighThreat: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  updatedAt: number;
  difficulty: Difficulty;
  origin: Origin;
  nightMinute: number;
  chapter: number;
  threat: number;
  shieldSeconds: number;
  shieldSteps: number;
  idleSeconds: number;
  battery: number;
  contacts: Record<ContactId, ContactState>;
  callHistory: CallHistoryEntry[];
  readMessages: string[];
  deliveredMessages: string[];
  flags: Record<string, string | number | boolean>;
  clues: string[];
  clueNotes: Record<string, string>;
  completedEvents: string[];
  usedInteractions: string[];
  interactionUses: Record<string, number>;
  player: { x: number; y: number; zone: string };
  flashlightOwned: boolean;
  flashlightOn: boolean;
  powerOn: boolean;
  barricades: { front: boolean; back: boolean; windows: boolean };
  finalChoice: string | null;
  finalPhase: boolean;
  nextEventAt: number;
  stats: GameStats;
  endingId: string | null;
  playTime: number;
}

export interface SaveMeta {
  slot: string;
  savedAt: number;
  chapter: number;
  timeLabel: string;
  difficulty: Difficulty;
  threat: number;
  battery: number;
  playTime: number;
  auto: boolean;
}

export interface CallRuntime {
  callId: string;
  contactId: ContactId;
  nodeId: string;
  connected: boolean;
  startedAt: number;
  choiceHistory: string[];
  visitedNodes: string[];
  ringingStartedAt: number;
  answered: boolean;
}

export interface IncomingCall {
  contactId: ContactId;
  eventId?: string;
  callId: string;
  startedAt: number;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'warning' | 'danger' | 'success' | 'phone' | 'story';
}

export interface PhoneMessage {
  id: string;
  contactId: ContactId | 'system';
  from: string;
  at: number;
  text: string;
  read: boolean;
  incoming: boolean;
}

export const CONTACT_ORDER: ContactId[] = [
  'sophie',
  'mom',
  'dad',
  'daniel',
  'alex',
  'jessica',
  'mike',
  'priya',
  'unknown'
];
