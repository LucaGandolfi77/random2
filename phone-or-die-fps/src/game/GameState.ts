import { CONTACT_IDS } from '../data/contacts';
import type { ContactId, Difficulty, Quality } from '../data/types';
import { CHAPTERS, NIGHT_END, NIGHT_REAL_SECONDS, NIGHT_START } from '../data/chapters';
import { CONFIG } from './GameConfig';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'captured' | 'ending';

export interface HistoryEntry { name: string; at: number; missed?: boolean }

export interface StateSnapshot {
  version: number;
  elapsed: number;
  chapter: number;
  threat: number;
  battery: number;
  difficulty: Difficulty;
  quality: Quality;
  flags: string[];
  reveals: string[];
  relationships: Record<string, number>;
  callCounts: Record<string, number>;
  lastCallAt: Record<string, number>;
  history: HistoryEntry[];
  eventsDone: string[];
  position: [number, number, number];
  yaw: number;
  pitch: number;
  slots: Record<string, boolean>;
  savedAt: number;
  label: string;
}

const zeroRecord = (value: number): Record<string, number> =>
  Object.fromEntries(CONTACT_IDS.map((id) => [id, value]));

export class GameState {
  phase: GamePhase = 'menu';
  elapsed = 0;
  chapter = 1;
  threat = 0;
  battery = 100;
  difficulty: Difficulty = 'normal';
  quality: Quality = 'high';
  flags = new Set<string>();
  reveals = new Set<string>();
  relationships: Record<string, number> = zeroRecord(0);
  callCounts: Record<string, number> = zeroRecord(0);
  lastCallAt: Record<string, number> = zeroRecord(-999);
  history: HistoryEntry[] = [];
  eventsDone: string[] = [];
  position: [number, number, number] = [0, CONFIG.eyeHeight, 0];
  yaw = 0;
  pitch = 0;
  /** true when the player has picked up the emergency power bank */
  slots: Record<string, boolean> = { powerBank: false, flashlight: false, chargerUsed: false };
  activeEnding: string | null = null;
  lastChapterSeen = 0;
  shieldSec = 0;
  flashlightOn = false;
  phoneOpen = false;
  muted = false;
  invertY = false;
  musicVolume = 0.5;
  sfxVolume = 0.8;
  subtitles = true;
  textScale = 1;

  /** current hour in the 22:00 -> 06:00 window, as a decimal (e.g. 23.5) */
  get hour(): number {
    return NIGHT_START + (this.elapsed / NIGHT_REAL_SECONDS) * (NIGHT_END - NIGHT_START);
  }

  get timeString(): string {
    const h = Math.floor(this.hour) % 24;
    const m = Math.floor((this.hour - Math.floor(this.hour)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  get remainingSeconds(): number {
    return Math.max(0, NIGHT_REAL_SECONDS - this.elapsed);
  }

  get chapterData() {
    return CHAPTERS[Math.min(this.chapter, CHAPTERS.length) - 1];
  }

  get difficultyFactor() {
    return CONFIG.difficulty[this.difficulty];
  }

  hasFlag(flag: string): boolean { return this.flags.has(flag); }
  addFlag(flag: string) { this.flags.add(flag); }

  reveal(id: string): boolean {
    if (!id || this.reveals.has(id)) return false;
    this.reveals.add(id);
    return true;
  }

  relation(id: ContactId): number { return this.relationships[id] ?? 0; }

  addRelation(id: ContactId, delta: number) {
    this.relationships[id] = Math.max(-5, Math.min(10, (this.relationships[id] ?? 0) + delta));
  }

  /** effectiveness decays when the same person is called again too soon */
  callEffectiveness(id: ContactId): number {
    const count = this.callCounts[id] ?? 0;
    return Math.max(0.28, 1 / (1 + count * 0.42));
  }

  addHistory(name: string, missed = false) {
    this.history.unshift({ name, at: this.elapsed, missed });
    if (this.history.length > 30) this.history.pop();
  }

  snapshot(label = 'Autosave'): StateSnapshot {
    return {
      version: 1,
      elapsed: this.elapsed,
      chapter: this.chapter,
      threat: this.threat,
      battery: this.battery,
      difficulty: this.difficulty,
      quality: this.quality,
      flags: [...this.flags],
      reveals: [...this.reveals],
      relationships: { ...this.relationships },
      callCounts: { ...this.callCounts },
      lastCallAt: { ...this.lastCallAt },
      history: this.history.slice(0, 30),
      eventsDone: [...this.eventsDone],
      position: [...this.position] as [number, number, number],
      yaw: this.yaw,
      pitch: this.pitch,
      slots: { ...this.slots },
      savedAt: Date.now(),
      label
    };
  }

  restore(data: StateSnapshot) {
    if (!data || data.version !== 1) throw new Error('Unsupported save version');
    this.elapsed = Math.max(0, Number(data.elapsed) || 0);
    this.chapter = Math.min(6, Math.max(1, Number(data.chapter) || 1));
    this.threat = Math.min(100, Math.max(0, Number(data.threat) || 0));
    this.battery = Math.min(100, Math.max(0, Number(data.battery) ?? 100));
    this.difficulty = ['easy', 'normal', 'hard'].includes(data.difficulty) ? data.difficulty : 'normal';
    this.quality = ['low', 'medium', 'high'].includes(data.quality) ? data.quality : 'high';
    this.flags = new Set(Array.isArray(data.flags) ? data.flags : []);
    this.reveals = new Set(Array.isArray(data.reveals) ? data.reveals : []);
    this.relationships = { ...zeroRecord(0), ...(data.relationships || {}) };
    this.callCounts = { ...zeroRecord(0), ...(data.callCounts || {}) };
    this.lastCallAt = { ...zeroRecord(-999), ...(data.lastCallAt || {}) };
    this.history = Array.isArray(data.history) ? data.history.slice(0, 30) : [];
    this.eventsDone = Array.isArray(data.eventsDone) ? data.eventsDone : [];
    this.position = Array.isArray(data.position) && data.position.length === 3 ? data.position : [0, CONFIG.eyeHeight, 0];
    this.yaw = Number(data.yaw) || 0;
    this.pitch = Number(data.pitch) || 0;
    this.slots = { powerBank: false, flashlight: false, chargerUsed: false, ...(data.slots || {}) };
    this.lastChapterSeen = this.chapter;
    this.phase = 'playing';
    this.activeEnding = null;
    this.shieldSec = 0;
  }

  reset() {
    this.elapsed = 0;
    this.chapter = 1;
    this.threat = 0;
    this.battery = 100;
    this.flags.clear();
    this.reveals.clear();
    this.relationships = zeroRecord(0);
    this.callCounts = zeroRecord(0);
    this.lastCallAt = zeroRecord(-999);
    this.history = [];
    this.eventsDone = [];
    this.position = [0, CONFIG.eyeHeight, 0];
    this.yaw = 0;
    this.pitch = 0;
    this.slots = { powerBank: false, flashlight: false, chargerUsed: false };
    this.activeEnding = null;
    this.lastChapterSeen = 0;
    this.shieldSec = 0;
    this.flashlightOn = false;
    this.phoneOpen = false;
    this.phase = 'playing';
  }
}

export function contactAvailability(state: GameState, id: ContactId): 'ok' | 'busy' | 'off' {
  // story-driven availability
  if (id === 'jessica' && state.chapter < 2) return 'off';
  if (id === 'unknown' && state.chapter < 2) return 'off';
  if (id === 'mike' && state.chapter >= 6) return 'off';
  if (id === 'dad' && state.hasFlag('father_confession') && state.chapter >= 5 && state.relation('dad') < 0) return 'off';
  if (state.eventsDone.includes('event_wrong_number') && id === 'mom' && state.chapter >= 5) return 'busy';
  const cd = state.lastCallAt[id];
  if (state.elapsed - cd < 16) return 'busy';
  return 'ok';
}
