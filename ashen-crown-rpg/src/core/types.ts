export type AttributeKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type Attributes = Record<AttributeKey, number>;

export type AncestryId = 'erdan' | 'aelborn' | 'cindral' | 'tidewrought' | 'stoneborn' | 'wraithmarked';
export type ClassId = 'warrior' | 'rogue' | 'mage' | 'cleric' | 'ranger' | 'warlock';
export type BackgroundId = 'soldier' | 'scholar' | 'outcast' | 'pilgrim' | 'artisan';
export type Screen = 'menu' | 'creation' | 'intro' | 'game' | 'ending';
export type ModalKind =
  | 'inventory'
  | 'journal'
  | 'party'
  | 'character'
  | 'map'
  | 'settings'
  | 'save'
  | 'load'
  | 'help'
  | 'levelup'
  | 'loot'
  | 'shop'
  | 'subclass'
  | null;

export interface Appearance {
  seed: number;
  skin: string;
  hair: string;
  hairStyle: number;
  eyes: string;
  marking: string;
  accent: string;
  outfit: string;
}

export interface CharacterRecord {
  id: string;
  name: string;
  ancestry: AncestryId;
  classId: ClassId;
  background: BackgroundId;
  level: number;
  xp: number;
  attributes: Attributes;
  hp: number;
  resource: number;
  gold?: number;
  abilities: string[];
  proficiencies: string[];
  equipment: Partial<Record<EquipmentSlot, string>>;
  inventory?: string[];
  isPlayer: boolean;
  companionId?: string;
  subclass?: string;
  approval: number;
  recruited: boolean;
  alive: boolean;
  portrait: Appearance;
  notes?: string;
}

export type EquipmentSlot = 'weapon' | 'offhand' | 'armor' | 'helmet' | 'accessory';

export interface ItemStack {
  itemId: string;
  quantity: number;
}

export type QuestStatus = 'hidden' | 'active' | 'completed' | 'failed';
export interface QuestState {
  status: QuestStatus;
  stage: number;
  flags: Record<string, boolean>;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  textScale: number;
  reducedMotion: boolean;
  lowEffects: boolean;
  showRolls: boolean;
}

export interface WorldState {
  locationId: string;
  x: number;
  y: number;
  discovered: string[];
  defeated: string[];
  opened: string[];
  visited: string[];
  flags: Record<string, string | number | boolean>;
  companionParty: string[];
}

export interface GameState {
  version: number;
  createdAt: number;
  updatedAt: number;
  difficulty: 'story' | 'balanced' | 'tactician';
  playerId: string;
  characters: Record<string, CharacterRecord>;
  party: string[];
  inventory: ItemStack[];
  quests: Record<string, QuestState>;
  world: WorldState;
  settings: GameSettings;
  playTime: number;
  ending: string | null;
  lastSaveLabel?: string;
}

export interface MapTile {
  ground: string;
  height: number;
  blocked: boolean;
  prop?: string;
  surface?: SurfaceType;
  barrel?: boolean;
  cover?: boolean;
}

export type SurfaceType = 'none' | 'fire' | 'water' | 'oil' | 'ice' | 'ash' | 'blood' | 'holy';

export interface InteractableDef {
  id: string;
  x: number;
  y: number;
  kind:
    | 'npc'
    | 'chest'
    | 'shrine'
    | 'exit'
    | 'note'
    | 'trap'
    | 'rune'
    | 'door'
    | 'loot'
    | 'enemy'
    | 'puzzle'
    | 'camp'
    | 'merchant';
  label: string;
  dialogueId?: string;
  toMap?: string;
  toX?: number;
  toY?: number;
  encounterId?: string;
  itemId?: string;
  gold?: number;
  hidden?: boolean;
  once?: boolean;
  requiresFlag?: string;
  dc?: number;
  stat?: AttributeKey;
  hint?: string;
  questId?: string;
  flagSet?: string;
  isExit?: boolean;
  minimapIcon?: string;
}

export interface MapDefinition {
  id: string;
  name: string;
  region: string;
  width: number;
  height: number;
  rows: string[];
  heights?: number[][];
  props?: { x: number; y: number; kind: string }[];
  interactables: InteractableDef[];
  start: { x: number; y: number };
  ambience: 'bastion' | 'village' | 'forest' | 'temple' | 'citadel';
  music: string;
  weather?: 'ash' | 'rain' | 'fireflies' | 'dust' | 'none';
  travelNode?: boolean;
  dark?: boolean;
}

export interface AncestryDef {
  id: AncestryId;
  name: string;
  epithet: string;
  description: string;
  bonuses: Partial<Attributes>;
  traitName: string;
  trait: string;
  dialogueTag: string;
  palette: string;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  role: string;
  description: string;
  primary: AttributeKey;
  secondary: AttributeKey;
  hpBase: number;
  hpPerLevel: number;
  resourceName: string;
  resourceBase: number;
  savingThrows: AttributeKey[];
  proficiencies: string[];
  startingAbilities: string[];
  armor: string;
  weapon: string;
  icon: string;
}

export interface BackgroundDef {
  id: BackgroundId;
  name: string;
  description: string;
  proficiencies: string[];
  bonus: string;
}

export type AbilityTarget = 'enemy' | 'ally' | 'self' | 'ground';
export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'shadow' | 'holy' | 'nature' | 'psychic';

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  classId?: ClassId | 'enemy' | 'ancestry' | 'item';
  level?: number;
  resourceCost: number;
  apCost: number;
  range: number;
  radius?: number;
  target: AbilityTarget;
  damageType?: DamageType;
  dice?: string;
  flat?: number;
  healing?: string;
  status?: string;
  statusDuration?: number;
  cooldown?: number;
  scaling?: AttributeKey;
  animation?: string;
  icon: string;
  tags?: string[];
  requiresLineOfSight?: boolean;
  noAttackRoll?: boolean;
  ai?: number;
}

export interface StatusDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  damagePerTurn?: number;
  damageType?: DamageType;
  acMod?: number;
  speedMod?: number;
  attackMod?: number;
  skipTurn?: boolean;
  duration: number;
  beneficial?: boolean;
}

export interface SubclassDef {
  id: string;
  classId: ClassId;
  name: string;
  epithet: string;
  description: string;
  trait: string;
  abilityId: string;
  bonuses: {
    hp?: number;
    ac?: number;
    attack?: number;
    resource?: number;
    initiative?: number;
    attributes?: Partial<Attributes>;
  };
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: 'weapon' | 'armor' | 'shield' | 'helmet' | 'accessory' | 'potion' | 'scroll' | 'quest' | 'material';
  slot?: EquipmentSlot;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value: number;
  icon: string;
  stats?: {
    attack?: number;
    damage?: string;
    ac?: number;
    hp?: number;
    resource?: number;
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
    initiative?: number;
  };
  effect?: {
    heal?: string;
    resource?: number;
    status?: string;
    damageType?: DamageType;
  };
  stackable?: boolean;
  classes?: ClassId[];
}

export type EnemyRole = 'melee' | 'archer' | 'mage' | 'assassin' | 'summoner' | 'elite' | 'boss';
export interface EnemyDef {
  id: string;
  name: string;
  role: EnemyRole;
  description: string;
  hp: number;
  ac: number;
  attackBonus: number;
  damage: string;
  initiativeBonus: number;
  speed: number;
  abilities: string[];
  ai: 'aggressive' | 'tactical' | 'ranged' | 'support' | 'boss';
  color: string;
  portraitIcon: string;
  xp: number;
  boss?: boolean;
  phases?: number;
}

export interface EncounterDef {
  id: string;
  name: string;
  mapTheme: 'bastion' | 'village' | 'forest' | 'temple' | 'citadel';
  width: number;
  height: number;
  rows: string[];
  enemies: { enemyId: string; x: number; y: number; name?: string; bossPhase?: number }[];
  objective: string;
  rewardGold: number;
  rewardXp: number;
  rewardItems?: string[];
  boss?: boolean;
  music: string;
  intro?: string;
  victoryText?: string;
}

export interface CompanionDef {
  id: string;
  name: string;
  classId: ClassId;
  ancestry: AncestryId;
  title: string;
  description: string;
  personality: string;
  secret: string;
  questId: string;
  approvalLikes: string[];
  approvalDislikes: string[];
  recruitFlag: string;
  abilities: string[];
  subclass?: string;
  portrait: Appearance;
  baseAttributes: Attributes;
}

export interface DialogueChoice {
  id: string;
  text: string;
  tag?: string;
  requiresFlag?: string;
  forbidsFlag?: string;
  requiresCompanion?: string;
  requiresClass?: ClassId;
  requiresAncestry?: AncestryId;
  requiresItem?: string;
  check?: { stat: AttributeKey; dc: number; proficiency?: string; label?: string };
  next?: string;
  successNext?: string;
  failureNext?: string;
  effects?: DialogueEffect[];
  successEffects?: DialogueEffect[];
  failureEffects?: DialogueEffect[];
  hiddenIfUnavailable?: boolean;
  tone?: 'kind' | 'cruel' | 'clever' | 'bold' | 'faith' | 'neutral' | 'romance';
}

export interface DialogueEffect {
  type:
    | 'flag'
    | 'approval'
    | 'quest'
    | 'questStage'
    | 'questComplete'
    | 'questFail'
    | 'item'
    | 'gold'
    | 'heal'
    | 'xp'
    | 'recruit'
    | 'leave'
    | 'startCombat'
    | 'end'
    | 'travel'
    | 'ending'
    | 'unlock'
    | 'note'
    | 'shop'
    | 'rest'
    | 'damage'
    | 'resource'
    | 'discover';
  id?: string;
  value?: string | number | boolean;
  amount?: number;
}

export interface DialogueNode {
  /** Optional; nodes are keyed by id inside their dialogue definition. */
  id?: string;
  speaker: string;
  portrait?: string;
  text: string;
  choices?: DialogueChoice[];
  effects?: DialogueEffect[];
  next?: string;
  auto?: boolean;
  tag?: string;
  combat?: string;
}

export interface DialogueDef {
  id: string;
  title: string;
  start: string;
  nodes: Record<string, DialogueNode>;
  background?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  type: 'main' | 'side' | 'companion' | 'hidden';
  act: number;
  description: string;
  stages: { title: string; description: string; objectives?: string[] }[];
  rewardXp?: number;
  rewardGold?: number;
  rewardItems?: string[];
  consequences?: string;
}

export interface CombatUnit {
  id: string;
  charId?: string;
  enemyId?: string;
  name: string;
  side: 'party' | 'enemy';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ac: number;
  attackBonus: number;
  damage: string;
  power: number;
  initiative: number;
  ap: number;
  maxAp: number;
  movement: number;
  maxMovement: number;
  speed: number;
  resource: number;
  maxResource: number;
  abilities: string[];
  cooldowns: Record<string, number>;
  statuses: { id: string; duration: number; source?: string }[];
  downed: boolean;
  color: string;
  icon: string;
  role: string;
  bossPhase?: number;
  summoned?: boolean;
  reactionUsed?: boolean;
}

export type CombatAction = 'shove' | 'help';

export interface CombatLogEntry {
  id: number;
  text: string;
  kind: 'info' | 'damage' | 'heal' | 'check' | 'status' | 'victory' | 'defeat' | 'system';
}

export interface CombatState {
  encounterId: string;
  encounterName: string;
  round: number;
  order: string[];
  turnIndex: number;
  units: CombatUnit[];
  tiles: MapTile[][];
  log: CombatLogEntry[];
  phase: 'active' | 'victory' | 'defeat';
  selectedAbility: string | null;
  selectedAction?: CombatAction | null;
  selectedUnitId: string | null;
  hoveredTile: { x: number; y: number } | null;
  rewards: { xp: number; gold: number; items: string[] };
  objective: string;
  waitingForAi: boolean;
  difficulty: 'story' | 'balanced' | 'tactician';
  lastDamage?: { x: number; y: number; amount: number; type: DamageType; unitId: string; heal?: boolean };
}

export interface SaveMeta {
  slot: string;
  name: string;
  timestamp: number;
  location: string;
  level: number;
  playTime: number;
  auto: boolean;
}

export interface SkillCheckResult {
  stat: AttributeKey;
  die: number;
  modifier: number;
  proficiency: number;
  total: number;
  dc: number;
  success: boolean;
  critical: 'success' | 'failure' | null;
  label: string;
}
