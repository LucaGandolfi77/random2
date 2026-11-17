/* Content tables for Machine Hunt. Pure data, no DOM. */

export const SAVE_KEY = "lego-horizon-game-v1";
/* The view (canvas logical size) and the actual game world are separate: the
 * camera follows the player across the much larger WORLD. */
export const ARENA = Object.freeze({ width: 600, height: 1080 });
export const WORLD = Object.freeze({ width: 1800, height: 3240 });
export const WAVES_PER_HUNT = 3;

export const UPGRADES = Object.freeze({
  bow: {
    label: "Bow",
    blurb: "Sharper arrows, more damage",
    costs: [12, 28, 55],
  },
  quiver: {
    label: "Quiver",
    blurb: "Faster shots, stronger charged shot",
    costs: [10, 24, 48],
  },
  armour: {
    label: "Armour",
    blurb: "More hearts for each hunt",
    costs: [10, 25, 50],
  },
  boots: {
    label: "Boots",
    blurb: "Move faster across the arena",
    costs: [8, 20, 40],
  },
});

export const PLOTS = Object.freeze({
  workshop: { label: "Workshop", blurb: "+15% arrow damage", cost: 30 },
  garden: { label: "Garden", blurb: "+2 cores after each hunt", cost: 25 },
  banner: { label: "Banner", blurb: "+25% companion power", cost: 35 },
  lookout: { label: "Lookout", blurb: "Longer enemy telegraphs", cost: 20 },
});

export const COMPANIONS = Object.freeze({
  bruiser: { label: "Bruiser", blurb: "Draws enemies and hits in a ring", cost: 20 },
  mender: { label: "Mender", blurb: "Heals you every few seconds", cost: 28 },
  gunner: { label: "Gunner", blurb: "Fires bolts at nearby machines", cost: 32 },
});

export const ENEMIES = Object.freeze({
  scout: { label: "Scout", hp: 3, speed: 64, radius: 18, damage: 1, cores: 2, score: 10, resistances: {} },
  grazer: { label: "Grazer", hp: 7, speed: 42, radius: 26, damage: 1, cores: 4, score: 25, resistances: { freeze: 0.5 } },
  lancer: { label: "Lancer", hp: 5, speed: 52, radius: 20, damage: 1, cores: 3, score: 22, resistances: { shock: 0.5 } },
  bulwark: { label: "Bulwark", hp: 12, speed: 30, radius: 30, damage: 2, cores: 6, score: 40, resistances: { stun: 0.8 } },
  burrower: { label: "Burrower", hp: 6, speed: 70, radius: 20, damage: 2, cores: 5, score: 32, resistances: { burn: 0.5 } },
  stalker: { label: "Stalker", hp: 4, speed: 88, radius: 16, damage: 1, cores: 3, score: 18, resistances: {} },
  flyer: { label: "Flyer", hp: 5, speed: 74, radius: 18, damage: 1, cores: 4, score: 26, resistances: { shock: 0.4 } },
  charger: { label: "Charger", hp: 9, speed: 54, radius: 26, damage: 2, cores: 6, score: 38, resistances: { freeze: 0.4 } },
  boss: { label: "Tallneck", hp: 34, speed: 26, radius: 52, damage: 2, cores: 18, score: 200, boss: true, resistances: { freeze: 0.6, shock: 0.6, burn: 0.6, stun: 0.9 } },
  thunderjaw: { label: "Thunderjaw", hp: 60, speed: 30, radius: 60, damage: 3, cores: 30, score: 400, boss: true, resistances: { freeze: 0.5, shock: 0.5, burn: 0.5, stun: 0.85 } },
  rockbreaker: { label: "Rockbreaker", hp: 52, speed: 36, radius: 54, damage: 3, cores: 28, score: 380, boss: true, resistances: { freeze: 0.7, shock: 0.6, burn: 0.4, stun: 0.9 } },
  corrupted: { label: "Corrupted Prime", hp: 70, speed: 28, radius: 62, damage: 3, cores: 35, score: 500, boss: true, resistances: { freeze: 0.5, shock: 0.5, burn: 0.5, stun: 0.9 } },
});

export const BOSS_TYPES = Object.freeze(["boss", "thunderjaw", "rockbreaker", "corrupted"]);

export const BIOMES = Object.freeze({
  jungle: { label: "Jungle Ruins", hazards: ["spikes", "quicksand"], sky: ["#16332c", "#3f7048", "#c7b169"] },
  village: { label: "Village Outskirts", hazards: ["spikes"], sky: ["#2b3b5c", "#d8733f", "#f4c46b"] },
  desert: { label: "Desert Canyon", hazards: ["lava", "spikes"], sky: ["#5a2f2a", "#d76b39", "#f2c14e"] },
  cauldron: { label: "Cauldron Depths", hazards: ["ice", "quicksand"], sky: ["#08151f", "#12303f", "#0a1924"] },
});

/* RPG progression tables (Phase B). */
export const SKILLS = Object.freeze({
  combat: { label: "Combat", blurb: "+6% damage per tier", max: 5 },
  survival: { label: "Survival", blurb: "+1 heart per tier", max: 5 },
  crafting: { label: "Crafting", blurb: "+10% material gain per tier", max: 5 },
});

export const MATERIALS = Object.freeze(["scrap", "bricks", "parts"]);

export const GEAR = Object.freeze({
  ironBow: { label: "Iron Bow", slot: "weapon", rarity: "common", damage: 2, cost: { scrap: 12, bricks: 4 } },
  brickSpear: { label: "Brick Spear", slot: "weapon", rarity: "rare", damage: 4, pierce: 1, cost: { scrap: 20, bricks: 8, parts: 1 } },
  platedArmour: { label: "Plated Armour", slot: "armour", rarity: "common", maxHp: 2, cost: { scrap: 16, bricks: 6 } },
  focusCharm: { label: "Focus Charm", slot: "trinket", rarity: "rare", charged: 0.25, cost: { scrap: 10, parts: 2 } },
});

export const STORY = Object.freeze([
  {
    title: "Chapter I · The Broken Village",
    text: "Mother's Heart is still rebuilding. The elders argue over one question: should the village spend its last bricks on defences, or on a festival to lift everyone's spirits?",
    choices: [
      { label: "Build defences", result: "The walls rise. The village feels safer.", bonus: { compPower: 0.08 } },
      { label: "Hold a festival", result: "Laughter returns to the streets, and cores are shared.", bonus: { cores: 30 } },
    ],
  },
  {
    title: "Chapter II · The Red Sands",
    text: "A trader offers rare parts from the desert, but the caravan needs guards. Varl volunteers; Teersa worries the village cannot spare him.",
    choices: [
      { label: "Send Varl", result: "He returns with parts and stories.", bonus: { parts: 3 } },
      { label: "Keep him home", result: "The village keeps its strength close.", bonus: { maxHp: 1 } },
    ],
  },
  {
    title: "Chapter III · The Deep Signal",
    text: "A strange signal pulses beneath the Cauldron. The hunters want to investigate; the builders want to seal it and forget.",
    choices: [
      { label: "Investigate", result: "You discover a hidden cache of scrap.", bonus: { scrap: 60 } },
      { label: "Seal it", result: "The village sleeps easier knowing it is closed.", bonus: { defense: 0.1 } },
    ],
  },
  {
    title: "Chapter IV · A World Rebuilt",
    text: "With the machines pushed back, Mother's Heart must decide what it wants to become. A fortress, or a home for everyone?",
    choices: [
      { label: "A fortress", result: "The banners of the hunt fly forever.", bonus: { damage: 0.1 } },
      { label: "A home", result: "Every traveller is welcome at the great hall.", bonus: { coreMult: 0.15 } },
    ],
  },
]);

export const SEASONS = Object.freeze([
  { label: "Festival of Bricks", effect: { cores: 12 }, blurb: "Cores are shared in the streets" },
  { label: "Wandering Merchant", effect: { scrap: 30 }, blurb: "A trader visits the village" },
  { label: "Machine Migration", effect: { scoreBonus: 0.1 }, blurb: "Machines roam in greater numbers" },
  { label: "Quiet Season", effect: { bricks: 10 }, blurb: "Builders work without hurry" },
]);

export const ACHIEVEMENTS = Object.freeze({
  firstHunt: { label: "First Blood", desc: "Finish your first hunt", check: "totalHunts", target: 1 },
  century: { label: "Century", desc: "Defeat 100 machines", check: "totalKills", target: 100 },
  flawless: { label: "Untouched", desc: "Clear a hunt without damage", check: "flawless", target: 1 },
  bossSlayer: { label: "Boss Slayer", desc: "Defeat five bosses", check: "bossKills", target: 5 },
  crafter: { label: "Crafter", desc: "Craft three gear pieces", check: "crafted", target: 3 },
  dailyStreak: { label: "Streak Keeper", desc: "Reach a 3-day daily streak", check: "dailyStreak", target: 3 },
  champion: { label: "Champion", desc: "Clear the campaign", check: "campaignCleared", target: 8 },
});

export const SEASON = Object.freeze({
  weeks: 10,
  perWeek: 200,
  rewards: [
    { week: 1, reward: { cores: 20 } },
    { week: 3, reward: { scrap: 40 } },
    { week: 5, reward: { parts: 2 } },
    { week: 7, reward: { bricks: 30 } },
    { week: 10, reward: { cores: 100, prestige: 1 } },
  ],
});

export const QUESTS = Object.freeze({
  firstCraft: { label: "First Craft", desc: "Craft your first piece of gear", target: 1, reward: { xp: 30, scrap: 10 }, stat: "crafted" },
  hunter: { label: "Seasoned Hunter", desc: "Defeat 40 machines", target: 40, reward: { xp: 50, parts: 1 }, stat: "totalKills" },
  chapter: { label: "Story Runner", desc: "Clear 3 campaign chapters", target: 3, reward: { xp: 60, bricks: 8 }, stat: "campaignCleared" },
  companion: { label: "Two Is Better", desc: "Bring two companions on a hunt", target: 1, reward: { xp: 40, parts: 1 }, stat: "duoHunts" },
  boss: { label: "Machine Slayer", desc: "Defeat a boss", target: 1, reward: { xp: 70, parts: 2 }, stat: "bossKills" },
});

export const XP = Object.freeze({ kill: 2, win: 20, daily: 10 });

export const MODES = Object.freeze({
  campaign: { label: "Campaign", blurb: "Story hunts across four biomes" },
  daily: { label: "Daily", blurb: "One seeded hunt for everyone today" },
  endless: { label: "Endless", blurb: "Survive ever-hardening waves" },
  bossrush: { label: "Boss Rush", blurb: "Three bosses back to back" },
});

export const CAMPAIGN_HUNTS = Object.freeze([
  { name: "First Steps", biome: "jungle", level: 1, reward: 12 },
  { name: "Green Ruins", biome: "jungle", level: 2, reward: 16 },
  { name: "Tallneck Watch", biome: "jungle", level: 3, reward: 24, boss: true },
  { name: "Lantern Roads", biome: "village", level: 4, reward: 28 },
  { name: "Homestead Siege", biome: "village", level: 5, reward: 34 },
  { name: "Red Sands", biome: "desert", level: 6, reward: 40 },
  { name: "Canyon Hunter", biome: "desert", level: 7, reward: 48, boss: true },
  { name: "Deep Cauldron", biome: "cauldron", level: 8, reward: 60, boss: true },
]);

export const HAZARDS = Object.freeze({
  lava: { label: "Lava vent", damage: 0.8, telegraph: 0.8, active: 1.4, color: "#e8733c" },
  quicksand: { label: "Quicksand", slow: 0.45, color: "#9c8c78" },
  ice: { label: "Ice patch", slide: 0.55, color: "#9fd8e8" },
  spikes: { label: "Spike trap", damage: 1, telegraph: 0.9, active: 0.5, color: "#d9e2e8" },
});

/* Seeded wave modifiers, unlocked by hunt level. */
export const MODIFIERS = Object.freeze({
  swift: { label: "Swift machines", blurb: "Enemies move 25% faster", minLevel: 2, speed: 1.25 },
  armoured: { label: "Armoured machines", blurb: "Enemies have 50% more health", minLevel: 3, hp: 1.5 },
  swarm: { label: "Swarm", blurb: "Two extra machines each wave", minLevel: 4, count: 2 },
});

export const BASE = Object.freeze({
  damage: 2,
  fireInterval: 0.62,
  chargedMultiplier: 2.2,
  maxHp: 5,
  speed: 152,
  telegraph: 0.45,
});

/* Persistent missions. Progress is tracked in save.stats and rewards are
 * claimed automatically when the target is reached. */
export const MISSIONS = Object.freeze({
  firstBlood: { label: "First Blood", desc: "Defeat 10 machines", target: 10, reward: 15, stat: "totalKills" },
  sharpshooter: { label: "Sharpshooter", desc: "Land 100 shots", target: 100, reward: 20, stat: "hits" },
  flawless: { label: "Flawless", desc: "Clear a hunt without taking a hit", target: 1, reward: 40, stat: "flawless" },
  together: { label: "Together", desc: "Clear a hunt with a companion", target: 1, reward: 25, stat: "companionWins" },
  dailyHunter: { label: "Daily Hunter", desc: "Complete 3 daily hunts", target: 3, reward: 30, stat: "dailyWins" },
});

export const DAILY = Object.freeze({ baseLevel: 3, levelSpan: 5 });

export const SCHEMES = Object.freeze({
  drag: { label: "Drag", blurb: "Drag anywhere to move, tap to charge" },
  stick: { label: "Stick", blurb: "Left thumb stick + charge button" },
  onehand: { label: "One-hand", blurb: "Everything on the right side" },
});

export const PALETTES = Object.freeze({
  default: { label: "Original", blurb: "Brick-world colours" },
  colorblind: { label: "High clarity", blurb: "Shape markers on every machine" },
  contrast: { label: "High contrast", blurb: "Brighter edges and outlines" },
});

/* Village grid: five columns by three rows inside the visible hub canvas. */
export const GRID = Object.freeze({
  x: 50, y: 196, cols: 6, rows: 4, cellW: 84, cellH: 62,
});

/* Extra decorations beyond the original stat plots. Costs are in cores unless
 * a material cost is also listed. Bonuses are aggregated by statsFromSave. */
export const VILLAGE_ITEMS = Object.freeze({
  workshop: { label: "Workshop", blurb: "+15% arrow damage", cost: 30, damage: 0.15 },
  garden: { label: "Garden", blurb: "+2 cores after each hunt", cost: 25, coreBonus: 2 },
  banner: { label: "Banner", blurb: "+25% companion power", cost: 35, compPower: 0.25 },
  lookout: { label: "Lookout", blurb: "Longer enemy telegraphs", cost: 20, telegraph: 0.35 },
  lantern: { label: "Lantern", blurb: "Night glow · +1 core per hunt", cost: 18, coreBonus: 1 },
  statue: { label: "Statue", blurb: "+5% score from every hunt", cost: 40, scoreBonus: 0.05 },
  foundry: { label: "Foundry", blurb: "+5% damage", cost: 26, damage: 0.05 },
  granary: { label: "Granary", blurb: "+1 scrap per hunt", cost: 20, scrapBonus: 1 },
  beacon: { label: "Beacon", blurb: "+0.1s telegraph", cost: 22, telegraph: 0.1 },
  market: { label: "Market", blurb: "+10% core gain", cost: 30, coreMult: 0.1 },
  library: { label: "Library", blurb: "+10% XP from hunts", cost: 34, xpBonus: 0.1 },
  infirmary: { label: "Infirmary", blurb: "+1 heart", cost: 32, maxHp: 1 },
  armoury: { label: "Armoury", blurb: "+5% damage", cost: 28, damage: 0.05 },
  tradingpost: { label: "Trading Post", blurb: "+10% material gain", cost: 36, materialBonus: 0.1 },
  greathall: { label: "Great Hall", blurb: "+5% companion power", cost: 38, compPower: 0.05 },
  bridge: { label: "Bridge", blurb: "+5% score", cost: 18, scoreBonus: 0.05 },
  windmill: { label: "Windmill", blurb: "+1 brick per hunt", cost: 24, brickBonus: 1 },
  bakery: { label: "Bakery", blurb: "+1 core per hunt", cost: 20, coreBonus: 1 },
  watchfire: { label: "Watchfire", blurb: "+0.1s telegraph", cost: 16, telegraph: 0.1 },
  totem: { label: "Totem", blurb: "+5% XP", cost: 26, xpBonus: 0.05 },
});

export const JOBS = Object.freeze({
  hunter: { label: "Hunter", produces: "cores", rate: 0.6 },
  guard: { label: "Guard", produces: "bricks", rate: 0.4, defense: 0.05 },
  crafter: { label: "Crafter", produces: "scrap", rate: 0.8 },
  gardener: { label: "Gardener", produces: "bricks", rate: 0.7 },
});

export const VILLAGERS = Object.freeze({
  aloy: { label: "Aloy", x: 150, y: 158, lines: ["The machines won't hunt themselves.", "A charged shot goes straight through a Bulwark's shield."] },
  varl: { label: "Varl", x: 450, y: 162, lines: ["I'll draw the big ones toward me.", "Bring me along and I'll keep the grazers busy."] },
  teersa: { label: "Teersa", x: 300, y: 180, lines: ["A little patience keeps hearts full.", "The Garden plot means more cores after every hunt."] },
});

/* Rotating community-board bounties, chosen by the daily seed. */
export const BOUNTIES = Object.freeze({
  scouts: { label: "Scout cleanup", desc: "Defeat 8 Scouts in one hunt", target: 8, reward: 18, stat: "scout" },
  waves: { label: "Wave runner", desc: "Reach the boss in one hunt", target: 3, reward: 20, stat: "waves" },
  flawless: { label: "Untouched", desc: "Clear a hunt without taking damage", target: 1, reward: 35, stat: "flawless" },
  together: { label: "Buddy system", desc: "Clear a hunt with a companion", target: 1, reward: 28, stat: "companion" },
  cores: { label: "Collector", desc: "Gather 20 cores in one hunt", target: 20, reward: 22, stat: "cores" },
});
