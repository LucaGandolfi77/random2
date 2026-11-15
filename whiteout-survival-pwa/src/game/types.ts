export const RESOURCE_KEYS = ['wood', 'coal', 'rawMeat', 'meals', 'iron'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];
export type Resources = Record<ResourceKey, number>;

export type FacilityId =
  | 'furnace'
  | 'lumberMill'
  | 'coalMine'
  | 'huntersHut'
  | 'cookhouse'
  | 'shelter'
  | 'clinic'
  | 'ironSeam';

export type WorkerFacilityId = Exclude<FacilityId, 'furnace' | 'shelter'>;

export type WeatherPhase = 'calm' | 'warning' | 'blizzard';
export type FurnaceMode = 'off' | 'normal' | 'overdrive';
export type DayPhase = 'work' | 'eat' | 'sleep';
export type DecreeId = 'balanced' | 'extended_shifts' | 'hearty_meals';
export type TechId =
  | 'insulation'
  | 'efficient_burn'
  | 'saw_blades'
  | 'deep_shafts'
  | 'trapping'
  | 'field_medicine'
  | 'stew_pot'
  | 'expedition_gear';

export type TabId = 'city' | 'survivors' | 'heroes' | 'tech';
export type HeroId = 'bryn' | 'ada' | 'mira';
export type HeroClass = 'tank' | 'marksman' | 'support';

export interface BuildingState {
  built: boolean;
  level: number;
}

export interface Survivor {
  id: string;
  name: string;
  health: number;
  /** 0 is fed, 100 is starving. */
  hunger: number;
  /** 0 is freezing, 100 is warm. */
  warmth: number;
  happiness: number;
  sick: boolean;
  job: WorkerFacilityId | null;
}

export interface FurnaceState {
  level: number;
  mode: FurnaceMode;
  /** Stored heat, from 0 to the level's capacity. */
  heat: number;
  /** The city's current indoor temperature in Celsius. */
  temperature: number;
}

export interface WeatherState {
  phase: WeatherPhase;
  /** Seconds left in the current weather phase. */
  remaining: number;
  /** Blizzard strength, 0.8 to 1.25. */
  intensity: number;
  /** Current ambient temperature in Celsius. */
  ambient: number;
  blizzards: number;
}

export interface HeroState {
  recruited: boolean;
  level: number;
  xp: number;
}

export interface ExpeditionState {
  maxStage: number;
  selectedStage: number;
  firstClears: number[];
  runs: number;
}

export interface GameStats {
  daysSurvived: number;
  blizzardsSurvived: number;
  mealsEaten: number;
  survivorsLost: number;
  survivorsRecruited: number;
  expeditionsWon: number;
  expeditionsLost: number;
  resourcesGained: number;
  upgradesBuilt: number;
  totalOfflineSeconds: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastSeen: number;
  day: number;
  /** In-game minutes since midnight, 0–1439. */
  clock: number;
  resources: Resources;
  buildings: Record<FacilityId, BuildingState>;
  survivors: Survivor[];
  furnace: FurnaceState;
  weather: WeatherState;
  decree: DecreeId;
  tech: Record<TechId, boolean>;
  heroes: Record<HeroId, HeroState>;
  expedition: ExpeditionState;
  stats: GameStats;
  lastMealDay: number;
  nextArrivalDay: number;
  tutorialDone: boolean;
  rng: number;
}

export interface ResourceDelta {
  wood: number;
  coal: number;
  rawMeat: number;
  meals: number;
  iron: number;
}

export type BattleStatus = 'fighting' | 'victory' | 'defeat';
export type CombatSide = 'hero' | 'beast';

export interface Combatant {
  id: string;
  name: string;
  side: CombatSide;
  heroClass: HeroClass | 'beast' | 'boss';
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  interval: number;
  nextAt: number;
  actionCount: number;
  shield: number;
  tauntUntil: number;
  alive: boolean;
}

export interface BattleLogEntry {
  id: number;
  time: number;
  text: string;
  kind: 'attack' | 'skill' | 'heal' | 'down' | 'info' | 'win' | 'lose';
}

export interface BattleState {
  stage: number;
  status: BattleStatus;
  elapsed: number;
  heroes: Combatant[];
  enemies: Combatant[];
  log: BattleLogEntry[];
  rng: number;
  reward: Resources | null;
  xp: number;
  firstClear: boolean;
  awarded: boolean;
}

export interface TickResult {
  events: string[];
  deaths: Survivor[];
  arrivals: Survivor[];
  mealsServed: number;
  mealsMissed: number;
  blizzardsStarted: number;
  survivorsSickened: number;
}

export interface OfflineReport {
  seconds: number;
  creditedSeconds: number;
  capped: boolean;
  gained: ResourceDelta;
  consumed: ResourceDelta;
  mealsServed: number;
  mealsMissed: number;
  survivorsLost: number;
  survivorsSick: number;
  blizzards: number;
  days: number;
  newSurvivors: number;
}

export interface ProductionRates {
  rates: ResourceDelta;
  rawMeatConsumed: number;
  activeWorkers: number;
  idleWorkers: number;
  sickWorkers: number;
  healing: number;
}

export interface SaveEnvelope {
  game: GameState;
  savedAt: number;
}
