import { FIGHTERS } from '../data/fighters';

const KEY = 'gigant-battle:save';
export const SAVE_VERSION = 2;

export interface SaveData {
  version: number;
  wins: number;
  arcadeBest: number;
  matchesPlayed: number;
  musicVolume: number;
  sfxVolume: number;
  quality: 'low' | 'medium' | 'high';
  storyChapter: number;
  storyFlags: string[];
  unlockedById: string[];
  morale: number;
  endings: string[];
}

const DEFAULTS: SaveData = {
  version: SAVE_VERSION, wins: 0, arcadeBest: 0, matchesPlayed: 0,
  musicVolume: 0.45, sfxVolume: 0.8, quality: 'high',
  storyChapter: 0, storyFlags: [], unlockedById: [], morale: 0, endings: []
};

export class Progression {
  data: SaveData = { ...DEFAULTS };

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version === 1) {
        // v1 -> v2 migration: keep earned wins and settings, add fresh story state
        this.data = {
          ...DEFAULTS,
          wins: parsed.wins ?? 0,
          arcadeBest: parsed.arcadeBest ?? 0,
          matchesPlayed: parsed.matchesPlayed ?? 0,
          musicVolume: parsed.musicVolume ?? 0.45,
          sfxVolume: parsed.sfxVolume ?? 0.8,
          quality: parsed.quality ?? 'high'
        };
        this.save();
        return;
      }
      if (parsed.version === SAVE_VERSION) {
        this.data = {
          ...DEFAULTS,
          ...parsed,
          storyFlags: Array.isArray(parsed.storyFlags) ? parsed.storyFlags : [],
          unlockedById: Array.isArray(parsed.unlockedById) ? parsed.unlockedById : [],
          endings: Array.isArray(parsed.endings) ? parsed.endings : []
        };
      }
    } catch { /* corrupted or unavailable storage: keep defaults */ }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* private mode */ }
  }

  isUnlocked(id: string): boolean {
    const f = FIGHTERS.find((x) => x.id === id);
    return !!f && (this.data.wins >= f.unlockAfter || this.data.unlockedById.includes(id));
  }

  unlockFighter(id: string): boolean {
    if (this.data.unlockedById.includes(id)) return false;
    this.data.unlockedById.push(id);
    this.save();
    return true;
  }

  unlockedCount(): number { return FIGHTERS.filter((f) => this.isUnlocked(f.id)).length; }

  recordMatch(won: boolean, seed: number) {
    this.data.matchesPlayed++;
    if (won) {
      this.data.wins++;
      this.data.arcadeBest = Math.max(this.data.arcadeBest, seed);
    }
    this.save();
  }

  saveStory(chapter: number, flags: string[], morale: number) {
    this.data.storyChapter = chapter;
    this.data.storyFlags = flags;
    this.data.morale = morale;
    this.save();
  }

  recordEnding(id: string) {
    if (!this.data.endings.includes(id)) {
      this.data.endings.push(id);
      this.save();
    }
  }
}
