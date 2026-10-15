// ============================================================
// NEW STAR SOCCER — GLOBAL TYPE ARCHITECTURE
// ============================================================

export interface CoreSkills {
  pace: number;
  power: number;
  technique: number;
  vision: number;
  freeKicks: number;
}

export interface Relationships {
  boss: number;        // 0–100
  teammates: number;   // 0–100
  fans: number;        // 0–100
  partner: number;     // 0–100
}

export interface Club {
  name: string;
  strength: number;    // 30–85, drives simulated results & opponent difficulty
}

export interface Fixture {
  week: number;        // round number, 1–38
  home: string;
  away: string;
  played: boolean;
  hg: number | null;
  ag: number | null;
}

export interface Player {
  name: string;
  age: number;
  retiringAge: number;
  club: string;
  nationality: string;
  position: 'ST' | 'CAM' | 'CM' | 'Winger' | 'Defender';
  value: number;       // transfer value in currency
  salary: number;      // weekly wage
  energy: number;      // 0–100
  skills: CoreSkills;
  goals: number;
  assists: number;
  appearances: number;
  starAppeal: number;  // 0–100
  xp: number;
  level: number;
  money: number;
  peakValue: number;
  careerEarnings: number;
}

export interface MatchEvent {
  minute: number;
  type: 'pass' | 'shoot' | 'freekick' | 'intercept' | 'ticker';
  description: string;
  resolved: boolean;
  success?: boolean;
  xpGain?: number;
  label?: string;      // e.g. "⚽ Goal" for the match timeline
}

export interface MatchState {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  currentEventIndex: number;
  playerRating: number;
  finished: boolean;
  playerGoals: number;   // this match only
  playerAssists: number; // this match only
  benched: boolean;
}

export interface Item {
  id: string;
  name: string;
  category: 'consumable' | 'gear' | 'luxury' | 'gift';
  price: number;
  description: string;
  effect: ItemEffect;
  icon: string;
}

export interface ItemEffect {
  type: 'energy' | 'pace' | 'power' | 'technique' | 'vision' | 'freeKicks' | 'starAppeal' | 'partner' | 'fans' | 'boss' | 'teammates';
  value: number;
  duration?: number; // weeks, undefined = permanent/one-shot
}

export type Screen =
  | 'dashboard'
  | 'career'
  | 'life'
  | 'training'
  | 'relations'
  | 'shop'
  | 'match'
  | 'casino'
  | 'match-result'
  | 'transfers'
  | 'retired';

export interface CasinoGameState {
  game: 'blackjack' | 'slots' | 'roulette' | null;
  bet: number;
}

export interface ActiveEffect {
  itemId: string;
  effect: ItemEffect;
  weeksRemaining: number;
}

export interface WeekLog {
  week: number;          // absolute week counter
  season: number;
  weekOfSeason: number;
  opponent: string;
  result: 'win' | 'draw' | 'loss' | 'bye' | 'benched';
  score?: string;
  rating?: number;
  goals: number;         // this match
  assists: number;       // this match
  moneyDelta: number;    // wage + bonuses + sponsor
}

export interface LeagueEntry {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface TransferOffer {
  from: string;
  fee: number;
  salary: number;
  strength: number;
}

export interface NewsItem {
  week: number;
  text: string;
}

export interface Trophy {
  season: number;
  kind: 'league' | 'topscorer' | 'cup';
  detail: string;
}

export const CLUB_DATA: Club[] = [
  { name: 'Northwich Town', strength: 34 },
  { name: 'Southport United', strength: 38 },
  { name: 'Eastbridge FC', strength: 42 },
  { name: 'Westfield Rovers', strength: 45 },
  { name: 'Central City', strength: 48 },
  { name: 'Riverdale Athletic', strength: 51 },
  { name: 'Hilltop Rangers', strength: 53 },
  { name: 'Coastal Wanderers', strength: 55 },
  { name: 'Ironcastle FC', strength: 58 },
  { name: 'Meadowbrook Spurs', strength: 60 },
  { name: 'Oakwood City', strength: 62 },
  { name: 'Pennygate United', strength: 64 },
  { name: 'Stonewall FC', strength: 66 },
  { name: 'Fairview Rangers', strength: 68 },
  { name: 'Brighton Vale', strength: 70 },
  { name: 'Kingsbridge Town', strength: 72 },
  { name: 'Harborne FC', strength: 74 },
  { name: 'Ashford Athletic', strength: 76 },
  { name: 'Brampton United', strength: 79 },
  { name: 'Drayton Rovers', strength: 82 },
];

export const CLUBS: string[] = CLUB_DATA.map((c) => c.name);

export function clubStrength(name: string): number {
  return CLUB_DATA.find((c) => c.name === name)?.strength ?? 50;
}

export const ITEMS: Item[] = [
  { id: 'energy_drink', name: 'Energy Drink', category: 'consumable', price: 15, description: '+50 Energy instantly', effect: { type: 'energy', value: 50 }, icon: '🥤' },
  { id: 'protein_shake', name: 'Protein Shake', category: 'consumable', price: 25, description: '+30 Energy, +10 Power for 2 weeks', effect: { type: 'power', value: 10, duration: 2 }, icon: '🥛' },
  { id: 'boots_speed', name: 'Lightning Boots', category: 'gear', price: 250, description: '+8 Pace while equipped', effect: { type: 'pace', value: 8, duration: 0 }, icon: '👟' },
  { id: 'boots_tech', name: 'Precision Boots', category: 'gear', price: 300, description: '+8 Technique while equipped', effect: { type: 'technique', value: 8, duration: 0 }, icon: '👟' },
  { id: 'gloves_fk', name: 'Curve Gloves', category: 'gear', price: 280, description: '+8 Free Kicks while equipped', effect: { type: 'freeKicks', value: 8, duration: 0 }, icon: '🧤' },
  { id: 'glasses_vision', name: 'Vision Glasses', category: 'gear', price: 260, description: '+8 Vision while equipped', effect: { type: 'vision', value: 8, duration: 0 }, icon: '🕶️' },
  { id: 'scooter', name: 'Vintage Scooter', category: 'luxury', price: 800, description: '+5 Star Appeal', effect: { type: 'starAppeal', value: 5, duration: 0 }, icon: '🛵' },
  { id: 'sports_car', name: 'Sports Car', category: 'luxury', price: 5000, description: '+20 Star Appeal, +10 Fans', effect: { type: 'starAppeal', value: 20, duration: 0 }, icon: '🏎️' },
  { id: 'apartment', name: 'City Apartment', category: 'luxury', price: 12000, description: '+15 Star Appeal, Energy recovers faster', effect: { type: 'starAppeal', value: 15, duration: 0 }, icon: '🏢' },
  { id: 'mansion', name: 'Coastal Mansion', category: 'luxury', price: 50000, description: '+40 Star Appeal, +20 Fans', effect: { type: 'starAppeal', value: 40, duration: 0 }, icon: '🏰' },
  { id: 'flowers', name: 'Bouquet', category: 'gift', price: 30, description: '+10 Partner', effect: { type: 'partner', value: 10 }, icon: '💐' },
  { id: 'jewelry', name: 'Designer Jewelry', category: 'gift', price: 600, description: '+25 Partner', effect: { type: 'partner', value: 25 }, icon: '💍' },
  { id: 'watch', name: 'Luxury Watch', category: 'luxury', price: 3500, description: '+25 Star Appeal, +10 Boss', effect: { type: 'starAppeal', value: 25, duration: 0 }, icon: '⌚' },
];
