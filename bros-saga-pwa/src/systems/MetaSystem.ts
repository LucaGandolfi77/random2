import { ACHIEVEMENTS } from '../data/achievements';
import { COLLECTIONS, totalCollectibles } from '../data/collections';
import { ENEMY_BY_ID } from '../data/enemies';
import { QUEST_BY_ID } from '../data/quests';

export interface MetaData {
  stats: Record<string, number>;
  achievements: string[];
  collected: Record<string, string[]>;
  quests: Record<string, number>;
  questsDone: string[];
  leaderboard: { daily: Record<string, number>; endless: number; bossRush: number };
  dailyDate: string;
  dailySeed: number;
  ngPlus: boolean;
  challenge: string;
}

const defaults = (): MetaData => ({
  stats: { wins: 0, bosses: 0, minigames: 0, badges: 0, quests: 0, endless: 0, dailies: 0, ngplus: 0 },
  achievements: [],
  collected: Object.fromEntries(COLLECTIONS.map((c) => [c.id, []])),
  quests: {},
  questsDone: [],
  leaderboard: { daily: {}, endless: 0, bossRush: 0 },
  dailyDate: '',
  dailySeed: 0,
  ngPlus: false,
  challenge: 'normal'
});

function hashDate(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class MetaSystem {
  data: MetaData = defaults();

  reset() { this.data = defaults(); }

  restore(raw: Partial<MetaData> | undefined) {
    if (!raw) return;
    const d = defaults();
    this.data = {
      ...d,
      ...raw,
      stats: { ...d.stats, ...(raw.stats ?? {}) },
      collected: { ...d.collected, ...(raw.collected ?? {}) },
      quests: { ...(raw.quests ?? {}) },
      questsDone: [...(raw.questsDone ?? [])],
      achievements: [...(raw.achievements ?? [])],
      leaderboard: { ...d.leaderboard, ...(raw.leaderboard ?? {}) }
    };
  }

  bump(key: string, amount = 1) {
    this.data.stats[key] = (this.data.stats[key] ?? 0) + amount;
  }

  unlock(category: string, id: string) {
    if (!this.data.collected[category]) this.data.collected[category] = [];
    if (!this.data.collected[category].includes(id)) this.data.collected[category].push(id);
  }

  registerWin(enemyId: string) {
    this.bump('wins');
    const def = ENEMY_BY_ID[enemyId];
    if (def?.boss) this.bump('bosses');
    this.unlock('enemies', enemyId);
  }

  questProgress(questId: string, amount = 1): boolean {
    const q = QUEST_BY_ID[questId];
    if (!q || this.data.questsDone.includes(questId)) return false;
    this.data.quests[questId] = (this.data.quests[questId] ?? 0) + amount;
    if (this.data.quests[questId] < q.needed) return false;
    this.data.questsDone.push(questId);
    this.bump('quests');
    return true;
  }

  /** Returns the ids of achievements unlocked by this call. */
  evaluateAchievements(): string[] {
    const fresh: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (this.data.achievements.includes(a.id)) continue;
      if ((this.data.stats[a.key] ?? 0) >= a.goal) {
        this.data.achievements.push(a.id);
        fresh.push(a.id);
      }
    }
    return fresh;
  }

  daily(): { date: string; seed: number } {
    const date = new Date().toISOString().slice(0, 10);
    if (this.data.dailyDate !== date) {
      this.data.dailyDate = date;
      this.data.dailySeed = hashDate(date);
    }
    return { date, seed: this.data.dailySeed };
  }

  submitScore(kind: 'daily' | 'endless' | 'bossRush', score: number, date = '') {
    if (kind === 'daily') {
      const prev = this.data.leaderboard.daily[date] ?? 0;
      if (score > prev) this.data.leaderboard.daily[date] = score;
    } else if (kind === 'endless') this.data.leaderboard.endless = Math.max(this.data.leaderboard.endless, score);
    else this.data.leaderboard.bossRush = Math.max(this.data.leaderboard.bossRush, score);
  }

  completion(): number {
    let owned = 0;
    for (const c of COLLECTIONS) for (const id of c.entries) if (this.data.collected[c.id]?.includes(id)) owned++;
    return Math.round((owned / totalCollectibles()) * 100);
  }
}
