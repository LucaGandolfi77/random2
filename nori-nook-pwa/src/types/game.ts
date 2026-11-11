export type IngredientCategory = 'rice' | 'fish' | 'vegetable' | 'other' | 'premium';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type IngredientArtKey =
  | 'rice'
  | 'fish'
  | 'shrimp'
  | 'eel'
  | 'crab'
  | 'scallop'
  | 'octopus'
  | 'avocado'
  | 'cucumber'
  | 'carrot'
  | 'mango'
  | 'daikon'
  | 'asparagus'
  | 'nori'
  | 'sesame'
  | 'roe'
  | 'cheese'
  | 'tamago'
  | 'wasabi'
  | 'ginger'
  | 'bottle'
  | 'mayo'
  | 'wagyu'
  | 'truffle'
  | 'uni'
  | 'leaf';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  price: number;
  quality: number;
  rarity: number;
  perishable: boolean;
  premium: boolean;
  seasonal?: Season;
  color: string;
  accent: string;
  art: IngredientArtKey;
  tags: string[];
  unlockLevel: number;
  description: string;
}

export type SushiCategory = 'nigiri' | 'maki' | 'roll' | 'gunkan' | 'bowl' | 'onigiri' | 'special';

export type MiniGameId =
  | 'perfect_rice'
  | 'rice_cooker'
  | 'fan_rice'
  | 'perfect_slice'
  | 'nori_wrap'
  | 'roll_master'
  | 'nigiri_master'
  | 'wasabi_balance'
  | 'plate_art'
  | 'quick_service'
  | 'tea_master'
  | 'delivery_pack';

export interface RecipeIngredient {
  id: string;
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: SushiCategory;
  ingredients: RecipeIngredient[];
  difficulty: number;
  baseReward: number;
  requiredMiniGames: MiniGameId[];
  unlockLevel: number;
  description: string;
  tags: string[];
  seasonal?: Season;
  special?: boolean;
}

export type Personality =
  | 'friendly'
  | 'shy'
  | 'strict'
  | 'playful'
  | 'calm'
  | 'curious'
  | 'elegant'
  | 'mysterious';

export type HairStyle = 'bob' | 'short' | 'long' | 'bun' | 'hat' | 'cap' | 'elder' | 'child';

export type EyeStyle = 'soft' | 'sharp' | 'round' | 'closed';

export interface PortraitConfig {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eye: EyeStyle;
  accessory: 'none' | 'headband' | 'glasses' | 'flower' | 'cap' | 'scarf' | 'ribbon' | 'net';
  outfit: string;
}

export interface Customer {
  id: string;
  name: string;
  title: string;
  personality: Personality;
  preferences: string[];
  dislikes: string[];
  allergies: string[];
  budget: number;
  patience: number;
  rewardMultiplier: number;
  unlockLevel: number;
  neighborhood: string;
  portrait: PortraitConfig;
  greeting: string;
  happy: string;
  neutral: string;
  perfect: string;
  friendship: string[];
  friendshipGift?: string;
  vip?: boolean;
  mystery?: boolean;
}

export type UpgradeEffectKey =
  | 'mini_game_bonus'
  | 'slice_bonus'
  | 'freshness_protection'
  | 'inventory_capacity'
  | 'ambiance'
  | 'rush_seconds'
  | 'rush_slots'
  | 'patience_bonus'
  | 'delivery_bonus'
  | 'xp_bonus';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  art: string;
  maxLevel: number;
  costs: number[];
  effect: UpgradeEffectKey;
  effectPerLevel: number;
  effectLabel: string;
}

export type StaffEffectKey =
  | 'rice_bonus'
  | 'quality_bonus'
  | 'patience_bonus'
  | 'shop_discount'
  | 'reward_bonus';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  cost: number;
  pearlCost: number;
  effect: StaffEffectKey;
  effectPerLevel: number;
  effectLabel: string;
  portrait: PortraitConfig;
  line: string;
}

export type DecorationCategory =
  | 'table'
  | 'chair'
  | 'counter'
  | 'lamp'
  | 'plant'
  | 'art'
  | 'menu'
  | 'noren'
  | 'shelf'
  | 'aquarium'
  | 'tatami'
  | 'sofa'
  | 'window'
  | 'sign'
  | 'garnish'
  | 'vase'
  | 'cushion';

export type DecorationStyle =
  | 'traditional'
  | 'matcha'
  | 'sakura'
  | 'tokyo'
  | 'midnight'
  | 'coastal'
  | 'autumn'
  | 'winter';

export interface Decoration {
  id: string;
  name: string;
  category: DecorationCategory;
  style: DecorationStyle;
  price: number;
  rarity: number;
  width: number;
  height: number;
  art: string;
  color: string;
  accent: string;
  ambiance: number;
  unlockLevel: number;
  placement: 'floor' | 'wall' | 'surface';
  description: string;
}

export interface PlacedDecoration {
  uid: string;
  decorationId: string;
  x: number;
  y: number;
  flip: boolean;
}

export type GradeName = 'Normal' | 'Good' | 'Delicious' | 'Perfect' | 'Masterpiece';

export interface Grade {
  name: GradeName;
  total: number;
  presentation: number;
  match: number;
  freshness: number;
  technique: number;
  accuracy: number;
}

export interface Dish {
  ingredients: RecipeIngredient[];
  recipeId?: string;
  name: string;
  custom: boolean;
}

export interface PlatePlacement {
  id: string;
  kind: 'sushi' | 'decor';
  recipeId?: string;
  color?: string;
  art?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface PlateState {
  background: string;
  placements: PlatePlacement[];
}

export interface MiniGameResult {
  gameId: MiniGameId;
  score: number;
}

export interface Order {
  id: string;
  customerId: string;
  recipeId: string;
  mode: GameMode;
  rewardMultiplier: number;
  note?: string;
  timeLimit?: number;
  bonusCoins?: number;
  bonusXp?: number;
}

export type GameMode =
  | 'story'
  | 'zen'
  | 'rush'
  | 'puzzle'
  | 'merge'
  | 'daily'
  | 'delivery'
  | 'chef'
  | 'studio'
  | 'endless';

export interface KitchenSession {
  id: string;
  mode: GameMode;
  order?: Order;
  puzzleLevelId?: string;
  chefId?: string;
  free: boolean;
  startedAt: number;
  miniGames: MiniGameId[];
  completedMiniGames: MiniGameResult[];
  dish?: Dish;
}

export interface StoryOrder {
  id: string;
  customerId: string;
  recipeId: string;
  objective: string;
  rewardCoins: number;
  rewardXp: number;
}

export interface Neighborhood {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  accent: string;
  atmosphere: string;
  unlockAfter?: string;
  orders: StoryOrder[];
  rewardRecipeIds: string[];
  rewardDecorationIds: string[];
}

export interface PuzzleConstraint {
  kind:
    | 'only_category'
    | 'forbid_ingredient'
    | 'forbid_tag'
    | 'min_ingredients'
    | 'max_ingredients'
    | 'min_value'
    | 'exact_recipe'
    | 'category_count'
    | 'must_include'
    | 'no_duplicates';
  category?: IngredientCategory;
  ingredientId?: string;
  tag?: string;
  count?: number;
  value?: number;
  recipeId?: string;
}

export interface PuzzleLevel {
  id: string;
  number: number;
  title: string;
  description: string;
  difficulty: number;
  constraints: PuzzleConstraint[];
  allowedIngredients: string[];
  solution: RecipeIngredient[];
  rewardCoins: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  targetId?: string;
  rewardCoins: number;
  rewardPearls: number;
}

export type MissionMetric =
  | 'serve_customer'
  | 'perfect_dish'
  | 'play_minigame'
  | 'discover_recipe'
  | 'spend_coins'
  | 'earn_coins'
  | 'use_ingredient'
  | 'cook_recipe'
  | 'decorate'
  | 'friendship';

export interface DailySpecial {
  dateKey: string;
  recipeId: string;
  customerId: string;
  miniGameId: MiniGameId;
  targetGrade: GradeName;
  rewardCoins: number;
  rewardPearls: number;
  objective: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  type: 'seasonal' | 'themed';
  season?: Season;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  missions: Mission[];
  rewardCoins: number;
  rewardPearls: number;
  decorationIds: string[];
  recipeIds: string[];
  color: string;
  accent: string;
  icon: string;
}

export type AchievementMetric =
  | 'level'
  | 'sushi_made'
  | 'nigiri_made'
  | 'customers_served'
  | 'perfects'
  | 'masterpieces'
  | 'coins_earned'
  | 'coins_spent'
  | 'mini_games'
  | 'recipes_discovered'
  | 'ingredients_bought'
  | 'decorations_placed'
  | 'story_orders'
  | 'puzzles_solved'
  | 'merge_best'
  | 'endless_best'
  | 'friendship_max'
  | 'rainbow_rolls'
  | 'daily_streak';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  metric: AchievementMetric;
  target: number;
  rewardCoins: number;
  rewardPearls: number;
}

export interface LeaderboardEntry {
  score: number;
  date: number;
  detail: string;
}

export interface PlayerStats {
  sushiMade: number;
  nigiriMade: number;
  customersServed: number;
  perfects: number;
  masterpieces: number;
  coinsEarned: number;
  coinsSpent: number;
  miniGamesPlayed: number;
  ingredientsBought: number;
  decorationsPlaced: number;
  storyOrders: number;
  rainbowRolls: number;
  eventMissionsClaimed: number;
}

export interface InventoryEntry {
  quantity: number;
  freshness: number;
}

export interface CustomerSave {
  friendship: number;
  visits: number;
  lastOrder?: string;
}

export interface DailySave {
  dateKey: string;
  completed: boolean;
  streak: number;
  bestGrade?: GradeName;
  lastCompletedDate?: string;
}

export interface WeeklySave {
  weekKey: string;
  progress: Record<string, number>;
  claimed: string[];
}

export interface EventProgressSave {
  progress: Record<string, number>;
  claimed: string[];
}

export interface MissionSave {
  dateKey: string;
  missions: Mission[];
  progress: Record<string, number>;
  claimed: string[];
}

export interface ModeSaves {
  puzzles: Record<string, { stars: number; bestScore: number }>;
  merge: LeaderboardEntry[];
  endless: LeaderboardEntry[];
  rush: LeaderboardEntry[];
  delivery: LeaderboardEntry[];
  chef: Record<string, { cleared: boolean; bestScore: number }>;
  zenCreations: number;
}

export interface SaveGame {
  version: number;
  createdAt: number;
  updatedAt: number;
  player: {
    name: string;
    level: number;
    xp: number;
    coins: number;
    pearls: number;
    reputation: number;
  };
  inventory: Record<string, InventoryEntry>;
  discoveredRecipes: string[];
  recipeDiscovery: Record<string, number>;
  bonusRecipes: string[];
  bonusIngredients: string[];
  ownedDecorations: string[];
  customers: Record<string, CustomerSave>;
  restaurant: {
    upgrades: Record<string, number>;
    decorations: PlacedDecoration[];
    style: DecorationStyle;
  };
  staff: {
    hired: string[];
  };
  story: {
    completedOrders: string[];
    completedNeighborhoods: string[];
    seenDialogues: string[];
  };
  daily: DailySave;
  weekly: WeeklySave;
  events: Record<string, EventProgressSave>;
  missions: MissionSave;
  achievements: Record<string, { unlockedAt: number }>;
  modes: ModeSaves;
  stats: PlayerStats;
  tutorial: {
    completed: boolean;
    step: number;
    skipped: boolean;
  };
}

export interface GalleryEntry {
  id: string;
  createdAt: number;
  title: string;
  dataUrl: string;
  recipeIds: string[];
  background: string;
}

export interface OfflineQueueEntry {
  id: string;
  createdAt: number;
  type: string;
}

export interface Preferences {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  noTimer: boolean;
  haptics: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  tone: 'cozy' | 'gold' | 'pink';
  icon?: string;
}

export interface OutcomeNotice {
  id: string;
  kind: 'level' | 'recipe' | 'achievement' | 'reward' | 'friendship' | 'event';
  title: string;
  description: string;
  coins?: number;
  pearls?: number;
  art?: string;
}
