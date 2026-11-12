import { beforeEach, describe, expect, it } from 'vitest';
import { FILM, sceneAtTime, sceneStarts } from '../src/data/film';
import { validateFilm } from '../src/data/validate';
import { FilmTimeline } from '../src/engine/FilmTimeline';
import {
  clearProgress,
  formatTime,
  isResumable,
  loadProgress,
  saveProgress
} from '../src/engine/Persistence';

function installStorage(): void {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    }
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true
  });
}

describe('film data', () => {
  it('has a valid 25-minute timeline and no gaps', () => {
    const issues = validateFilm(FILM);
    expect(issues).toEqual([]);
    expect(FILM.scenes).toHaveLength(12);
    expect(FILM.duration).toBe(1500);
    const total = FILM.scenes.reduce((sum, scene) => sum + scene.duration, 0);
    expect(total).toBe(1500);
  });

  it('has 79 real shots, each inside its scene', () => {
    let shots = 0;
    for (const scene of FILM.scenes) {
      let cursor = 0;
      for (const shot of scene.shots) {
        shots += 1;
        expect(shot.start).toBeCloseTo(cursor, 5);
        expect(shot.duration).toBeGreaterThan(0);
        expect(shot.camera.length).toBeGreaterThan(0);
        cursor += shot.duration;
      }
      expect(cursor).toBeCloseTo(scene.duration, 5);
    }
    expect(shots).toBe(79);
  });

  it('has unique scene ids and contiguous starts', () => {
    const ids = FILM.scenes.map((scene) => scene.id);
    expect(new Set(ids).size).toBe(ids.length);
    const starts = sceneStarts();
    expect(starts[0]).toBe(0);
    expect(starts[starts.length - 1]).toBe(1380);
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i]).toBe((starts[i - 1] ?? 0) + (FILM.scenes[i - 1]?.duration ?? 0));
    }
  });

  it('maps time boundaries to the correct scene', () => {
    expect(sceneAtTime(0).index).toBe(0);
    expect(sceneAtTime(89.9).index).toBe(0);
    expect(sceneAtTime(90).index).toBe(1);
    expect(sceneAtTime(1229.9).index).toBe(9);
    expect(sceneAtTime(1230).index).toBe(10);
    expect(sceneAtTime(1499.9).index).toBe(11);
  });

  it('keeps every subtitle inside its scene and readable', () => {
    for (const scene of FILM.scenes) {
      let previous = -1;
      for (const cue of scene.subtitles) {
        expect(cue.start).toBeGreaterThanOrEqual(previous);
        expect(cue.end).toBeGreaterThan(cue.start);
        expect(cue.end).toBeLessThanOrEqual(scene.duration);
        expect(cue.text.trim().length).toBeGreaterThan(0);
        const cps = cue.text.length / (cue.end - cue.start);
        expect(cps).toBeLessThanOrEqual(22);
        previous = cue.start;
      }
    }
  });
});

describe('FilmTimeline', () => {
  let now = 0;
  const newTimeline = () => new FilmTimeline(1500, () => now, null, null);

  beforeEach(() => {
    now = 0;
  });

  it('plays, advances and pauses without losing time', () => {
    const timeline = newTimeline();
    timeline.seek(10);
    expect(timeline.getState().time).toBe(10);
    timeline.play();
    now = 11_000;
    timeline.tick(now);
    expect(timeline.getState().time).toBeCloseTo(21, 5);
    timeline.pause();
    const pausedAt = timeline.getState().time;
    now = 20_000;
    expect(timeline.getState().time).toBe(pausedAt);
    expect(timeline.getState().playing).toBe(false);
  });

  it('seeks, clamps and restarts correctly', () => {
    const timeline = newTimeline();
    timeline.seek(-10);
    expect(timeline.getState().time).toBe(0);
    timeline.seek(9999);
    expect(timeline.getState().time).toBe(1500);
    expect(timeline.getState().ended).toBe(true);
    timeline.restart();
    expect(timeline.getState().time).toBe(0);
    expect(timeline.getState().ended).toBe(false);
    timeline.seek(599);
    now = 1000;
    timeline.play();
    now = 3500;
    timeline.tick(now);
    expect(timeline.getState().time).toBeCloseTo(601.5, 3);
    expect(timeline.getState().sceneIndex).toBe(5);
  });

  it('ends exactly at the film duration', () => {
    const timeline = newTimeline();
    timeline.seek(1499);
    timeline.play();
    now = 2000;
    timeline.tick(now);
    const state = timeline.getState();
    expect(state.ended).toBe(true);
    expect(state.playing).toBe(false);
    expect(state.time).toBe(1500);
  });

  it('notifies subscribers on seek and state changes', () => {
    const timeline = newTimeline();
    const values: number[] = [];
    const unsubscribe = timeline.subscribe((state) => values.push(state.time));
    timeline.seek(42);
    timeline.pause();
    unsubscribe();
    timeline.seek(50);
    expect(values).toContain(0);
    expect(values).toContain(42);
    expect(values).not.toContain(50);
  });
});

describe('persistence', () => {
  beforeEach(() => {
    installStorage();
    clearProgress();
  });

  it('saves and restores a resumable position', () => {
    const saved = saveProgress(300);
    expect(saved.time).toBe(300);
    expect(saved.sceneId).toBe('s03');
    const loaded = loadProgress();
    expect(loaded?.time).toBe(300);
    expect(loaded?.completed).toBe(false);
    expect(isResumable(loaded)).toBe(true);
  });

  it('clamps out-of-range positions and rejects corrupted data', () => {
    const saved = saveProgress(99999);
    expect(saved.time).toBe(1500);
    expect(loadProgress()?.time).toBe(1500);
    localStorage.setItem('neve-ferro-progress-v1', 'not-json');
    expect(loadProgress()).toBeNull();
    localStorage.setItem('neve-ferro-progress-v1', JSON.stringify({ version: 1, time: 'x' }));
    expect(loadProgress()).toBeNull();
  });

  it('does not offer resume for a completed film', () => {
    saveProgress(1500, true);
    const loaded = loadProgress();
    expect(loaded?.completed).toBe(true);
    expect(isResumable(loaded)).toBe(false);
  });

  it('formats elapsed time', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(1500)).toBe('25:00');
  });
});
