import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  clearProgress,
  formatTime,
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
} from '../src/utils/storage';
import type { Settings } from '../src/utils/storage';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe('impostazioni e progresso', () => {
  it('carica i valori predefiniti', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadProgress()).toBeNull();
  });

  it('salva e ricarica le impostazioni', () => {
    const settings: Settings = {
      quality: 'low',
      subtitles: false,
      subtitleSize: 'large',
      voices: false,
      volume: 0.35,
      muted: true,
      speed: 1.25,
      cinema: true,
    };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it('salva, ricarica e cancella il progresso', () => {
    saveProgress({ time: 123.4, actId: 'atto3', completed: false, updatedAt: 999 });
    expect(loadProgress()).toEqual({
      time: 123.4,
      actId: 'atto3',
      completed: false,
      updatedAt: 999,
    });
    clearProgress();
    expect(loadProgress()).toBeNull();
  });

  it('ignora dati corrotti', () => {
    localStorage.setItem('lultimobagno.v1.settings', '{invalid');
    localStorage.setItem('lultimobagno.v1.progress', '{"time":"no"}');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadProgress()).toBeNull();
  });

  it('formatta il tempo', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
  });
});
