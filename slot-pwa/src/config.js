/*
 * Global configuration shared by every machine: palettes, wallet defaults,
 * VIP tiers, prizes and storage keys. Machine-specific data lives in src/machines.
 */

export const THEMES = {
  neon: {
    label: 'Neon', bg: '#08060f', panel: '#140d24', metal: '#2b1d4d',
    edge: '#ffcc00', glow: '#ffcc00', accent: '#ff5ec4', text: '#fff6d8', motif: '#ffcc0022',
  },
  retro: {
    label: 'Retro', bg: '#000000', panel: '#0a0a0a', metal: '#151515',
    edge: '#00ffff', glow: '#00ffff', accent: '#ff007f', text: '#e6ffff', motif: '#00ffff18',
  },
  forest: {
    label: 'Forest', bg: '#040f06', panel: '#0b1f0e', metal: '#123d1c',
    edge: '#00ff88', glow: '#00ff88', accent: '#a3e635', text: '#eaffef', motif: '#00ff8818',
  },
  ocean: {
    label: 'Ocean', bg: '#030a18', panel: '#071732', metal: '#0e2c5c',
    edge: '#38bdf8', glow: '#38bdf8', accent: '#22d3ee', text: '#e6f7ff', motif: '#38bdf818',
  },
  egypt: {
    label: 'Egyptian Gold', bg: '#160d02', panel: '#2a1a05', metal: '#5a3c0a',
    edge: '#ffd34d', glow: '#ffb300', accent: '#ff7b29', text: '#fff3cf', motif: '#ffd34d20',
  },
  cosmic: {
    label: 'Cosmic Violet', bg: '#080318', panel: '#160a35', metal: '#2d1466',
    edge: '#b78cff', glow: '#9d4edd', accent: '#ff6ec7', text: '#f0e6ff', motif: '#b78cff20',
  },
  candy: {
    label: 'Candy Pink', bg: '#1a0512', panel: '#330a24', metal: '#66144a',
    edge: '#ff7ac6', glow: '#ff4fae', accent: '#ffe066', text: '#fff0f8', motif: '#ff7ac620',
  },
  norse: {
    label: 'Norse Ice', bg: '#041219', panel: '#082631', metal: '#0d4759',
    edge: '#7dd3fc', glow: '#38bdf8', accent: '#a7f3d0', text: '#eafaff', motif: '#7dd3fc20',
  },
  samurai: {
    label: 'Samurai Red', bg: '#150304', panel: '#2c0709', metal: '#590d12',
    edge: '#ff5252', glow: '#ff2d2d', accent: '#ffd166', text: '#ffeded', motif: '#ff525220',
  },
  safari: {
    label: 'Safari Amber', bg: '#140d03', panel: '#2a1c07', metal: '#594011',
    edge: '#fbbf24', glow: '#f59e0b', accent: '#84cc16', text: '#fff7e0', motif: '#fbbf2420',
  },
  barblue: {
    label: 'Bar Blu', bg: '#030a1c', panel: '#071634', metal: '#0e2c66',
    edge: '#3fa9ff', glow: '#0066ff', accent: '#7ce0ff', text: '#eaf6ff', motif: '#3fa9ff22',
  },
  girobar: {
    label: 'Giro dei Bar', bg: '#160502', panel: '#2c0c05', metal: '#5c1c0d',
    edge: '#ff7043', glow: '#ff3d00', accent: '#ffd166', text: '#fff0e6', motif: '#ff704320',
  },
  armata: {
    label: 'Armata Gialloblù', bg: '#0a0c1a', panel: '#141a3d', metal: '#25347a',
    edge: '#ffd400', glow: '#0055ff', accent: '#ffd400', text: '#ffffff', motif: '#ffd40022',
  },
  sinibbio: {
    label: 'Sinibbio Reale', bg: '#0c0d12', panel: '#1a1c26', metal: '#34384d',
    edge: '#f5f5ff', glow: '#c7d2fe', accent: '#ff9fc4', text: '#ffffff', motif: '#ffffff1e',
  },
  agente: {
    label: 'Agente Zero', bg: '#03100c', panel: '#072119', metal: '#0d4433',
    edge: '#39ff9e', glow: '#00e676', accent: '#b8ff4d', text: '#eafff5', motif: '#39ff9e20',
  },
  principina: {
    label: 'Principina a Mare', bg: '#041018', panel: '#08263a', metal: '#0e4a6b',
    edge: '#7fe0ff', glow: '#29b6f6', accent: '#ffe0a3', text: '#f2fbff', motif: '#7fe0ff20',
  },
};

export const GLOBAL_JACKPOTS = {
  mini: { key: 'mini', name: 'MINI', base: 50, rate: 0.005, color: '#4ade80' },
  minor: { key: 'minor', name: 'MINOR', base: 250, rate: 0.002, color: '#5ec8ff' },
  major: { key: 'major', name: 'MAJOR', base: 1500, rate: 0.0005, color: '#c084fc' },
  grand: { key: 'grand', name: 'GRAND', base: 10000, rate: 0.0001, color: '#ffcc00' },
};

export const BET_STEPS = [1, 2, 5, 10, 25];
export const LINE_OPTIONS = [1, 5, 10, 20];
export const DEFAULT_LINES = 20;

export const CANVAS = { width: 540, height: 920 };

export const STORAGE_KEY = 'slot-pwa-v3';
export const JACKPOT_KEY = 'slot-jackpot-v2';

/* XP needed to reach each VIP level (index = level - 1). */
export const VIP_LEVELS = [0, 100, 300, 700, 1400, 2600, 5000, 8000, 12000, 17000, 23000];
export const VIP_NAMES = [
  'Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend',
  'Champion', 'Master', 'Grandmaster', 'Icon',
];
export const XP_PER_WAGER = 0.1; // 10 credits wagered = 1 XP

/* Seven-day reward ladder: credits + free spins. */
export const CALENDAR_REWARDS = [
  { credits: 200, free: 0 },
  { credits: 300, free: 0 },
  { credits: 400, free: 2 },
  { credits: 600, free: 0 },
  { credits: 800, free: 3 },
  { credits: 1000, free: 0 },
  { credits: 2000, free: 5 },
];

/* Symbol collection sets — discover symbols to earn set bonuses. */
export const COLLECTIONS = [
  { id: 'fruits', name: 'Fruit Basket', symbols: ['cherry', 'lemon', 'orange', 'grape'], reward: 500 },
  { id: 'luck', name: 'Lucky Charms', symbols: ['clover', 'star', 'coin', 'wild'], reward: 1200 },
  { id: 'royals', name: 'Royal Flush', symbols: ['bell', 'crown', 'gem', 'seven'], reward: 2000 },
  { id: 'cosmos', name: 'Cosmic Traveler', symbols: ['rocket', 'planet', 'alien', 'moon'], reward: 2500 },
  { id: 'ancient', name: 'Ancient Secrets', symbols: ['ankh', 'scarab', 'pyramid', 'eye'], reward: 2500 },
  { id: 'sweets', name: 'Sweet Tooth', symbols: ['candy', 'lollipop', 'donut', 'icecream'], reward: 2000 },
  { id: 'norse', name: 'Valhalla', symbols: ['rune', 'thor', 'odein', 'horn'], reward: 2500 },
];

export const MISSIONS = [
  { id: 'spins25', name: 'Warm Up', desc: 'Play 25 spins', goal: 25, stat: 'spins', reward: 500 },
  { id: 'lines30', name: 'Line Dancer', desc: 'Win 30 paylines', goal: 30, stat: 'linesWon', reward: 800 },
  { id: 'scatter6', name: 'Gift Hunter', desc: 'Land 6 scatters', goal: 6, stat: 'scatters', reward: 1000 },
  { id: 'cascade5', name: 'Chain Reaction', desc: 'Get a 5-step cascade', goal: 5, stat: 'bestCascade', reward: 1500 },
  { id: 'wildline3', name: 'Joker', desc: 'Win 3 lines with wilds', goal: 3, stat: 'wildLines', reward: 1200 },
  { id: 'wager10k', name: 'High Roller', desc: 'Wager 10,000 credits', goal: 10000, stat: 'totalWagered', reward: 2000 },
  { id: 'machines3', name: 'Explorer', desc: 'Play 3 different machines', goal: 3, stat: 'machinesPlayed', reward: 1500 },
  { id: 'holdwin', name: 'Vault Cracker', desc: 'Complete a Hold & Win round', goal: 1, stat: 'holdWins', reward: 2000 },
];

export const ACHIEVEMENTS = [
  { id: 'firstWin', name: "Beginner's Luck", desc: 'Win your first payline' },
  { id: 'bigWin', name: 'Big Winner', desc: 'Win 1,000 credits in one spin' },
  { id: 'megaWin', name: 'Mega Winner', desc: 'Win 10,000 credits in one spin' },
  { id: 'freeSpins', name: 'Free Rider', desc: 'Trigger free spins' },
  { id: 'jackpot', name: 'Jackpot!', desc: 'Win a progressive jackpot' },
  { id: 'allLines', name: 'Full Board', desc: 'Play all 20 paylines' },
  { id: 'daily7', name: 'Loyal Player', desc: 'Claim a 7-day daily streak' },
  { id: 'collector', name: 'Collector', desc: 'Complete a symbol collection' },
  { id: 'vip3', name: 'VIP', desc: 'Reach VIP level 3' },
  { id: 'gamble5', name: 'Daredevil', desc: 'Win 5 gambles in a row' },
  { id: 'challenge', name: 'Challenger', desc: 'Complete a daily challenge' },
];

/* ---------- Game modes ---------- */

export const TOURNAMENT = {
  spins: 10,
  rivals: 8,
  prizeLadder: [5000, 3000, 2000, 1200, 800, 500, 300, 150, 100],
};

export const RUSH = {
  duration: 60,       // seconds
  step: 10,           // multiplier step interval
  multipliers: [1, 1.5, 2, 2.5, 3, 4],
  rewardPerPoint: 2,
};

/* Quest chapters. Objectives are evaluated against a single spin result. */
export const QUESTS = [
  {
    id: 'q1', chapter: 1, name: 'First Spins',
    desc: 'Get 5 wins on any machine',
    type: 'wins', target: 5, reward: 600, trophy: 'q1',
  },
  {
    id: 'q2', chapter: 1, name: 'Gift Hunter',
    desc: 'Land 3 scatters in a single spin',
    type: 'scatters', target: 3, reward: 900, trophy: 'q2',
  },
  {
    id: 'q3', chapter: 1, name: 'Chain Master',
    desc: 'Reach a 3-step cascade',
    type: 'cascade', target: 3, reward: 1200, trophy: 'q3',
  },
  {
    id: 'q4', chapter: 2, name: 'Desert Gold',
    desc: 'Win 800 credits in one spin on Pharaoh\'s Fortune',
    type: 'winAmount', target: 800, machineId: 'pharaoh', reward: 1800, trophy: 'q4',
  },
  {
    id: 'q5', chapter: 2, name: 'Cosmic Ways',
    desc: 'Win on Nebula Nine with a ways win',
    type: 'machineWin', target: 1, machineId: 'nebula', reward: 1800, trophy: 'q5',
  },
  {
    id: 'q6', chapter: 2, name: 'Sugar High',
    desc: 'Land a 7+ cluster on Sugar Rush',
    type: 'cluster', target: 7, machineId: 'sugar-rush', reward: 2200, trophy: 'q6',
  },
  {
    id: 'q7', chapter: 3, name: 'Vault Cracker',
    desc: 'Complete a Hold & Win round on Vault Breaker',
    type: 'hold', target: 1, machineId: 'vault', reward: 3000, trophy: 'q7',
  },
  {
    id: 'q8', chapter: 3, name: 'Winds of War',
    desc: 'Win 2,000 credits in one spin on Samurai Spirit',
    type: 'winAmount', target: 2000, machineId: 'samurai', reward: 4000, trophy: 'q8',
  },
  {
    id: 'q9', chapter: 3, name: 'Legend',
    desc: 'Reach VIP level 5',
    type: 'vip', target: 5, reward: 5000, trophy: 'q9',
  },
];

export const TROPHIES = [
  { id: 'q1', name: 'First Spins', icon: '🎯', desc: 'Complete chapter 1 quest 1' },
  { id: 'q2', name: 'Gift Hunter', icon: '🎁', desc: 'Complete chapter 1 quest 2' },
  { id: 'q3', name: 'Chain Master', icon: '🔗', desc: 'Complete chapter 1 quest 3' },
  { id: 'q4', name: 'Desert Gold', icon: '🔺', desc: 'Complete chapter 2 quest 1' },
  { id: 'q5', name: 'Cosmic Ways', icon: '🪐', desc: 'Complete chapter 2 quest 2' },
  { id: 'q6', name: 'Sugar High', icon: '🍬', desc: 'Complete chapter 2 quest 3' },
  { id: 'q7', name: 'Vault Cracker', icon: '💎', desc: 'Complete chapter 3 quest 1' },
  { id: 'q8', name: 'Winds of War', icon: '⚔️', desc: 'Complete chapter 3 quest 2' },
  { id: 'q9', name: 'Legend', icon: '👑', desc: 'Complete chapter 3 quest 3' },
  { id: 'tourney', name: 'Champion', icon: '🏆', desc: 'Finish a tournament in the top 3' },
  { id: 'rush', name: 'Speed Demon', icon: '⚡', desc: 'Score 5,000 in a Spin Rush' },
];

export const MODE_TABS = [
  { id: 'play', name: 'Play', icon: '🎰' },
  { id: 'challenge', name: 'Daily', icon: '📅' },
  { id: 'tournament', name: 'Tournament', icon: '🏆' },
  { id: 'rush', name: 'Spin Rush', icon: '⚡' },
  { id: 'bonus-hunt', name: 'Bonus Hunt', icon: '🎁' },
  { id: 'boss', name: 'Boss Battle', icon: '👾' },
  { id: 'chase', name: 'Jackpot Chase', icon: '🪙' },
  { id: 'cascade', name: 'Cascade', icon: '🔗' },
  { id: 'roulette', name: 'Roulette', icon: '🎲' },
  { id: 'high-roller', name: 'High Roller', icon: '💎' },
  { id: 'quest', name: 'Quests', icon: '🗺️' },
  { id: 'profile', name: 'Profile', icon: '👤' },
];

export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function vipLevel(xp) {
  let level = 1;
  for (let i = 0; i < VIP_LEVELS.length; i++) if (xp >= VIP_LEVELS[i]) level = i + 1;
  return level;
}
