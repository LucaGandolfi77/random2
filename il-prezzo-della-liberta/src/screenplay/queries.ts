import type { CompiledAct, CompiledFilm, CompiledScene, LineCue } from '../data/types';

export function sceneAt(film: CompiledFilm, t: number): CompiledScene {
  const scenes = film.scenes;
  let lo = 0;
  let hi = scenes.length - 1;
  let index = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (scenes[mid].start <= t) {
      index = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return scenes[index];
}

export function actAt(film: CompiledFilm, t: number): CompiledAct {
  const acts = film.acts;
  let lo = 0;
  let hi = acts.length - 1;
  let index = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (acts[mid].start <= t) {
      index = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return acts[index];
}

export function lineAt(film: CompiledFilm, t: number): LineCue | null {
  const lines = film.lines;
  let lo = 0;
  let hi = lines.length - 1;
  let candidate: LineCue | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start <= t) {
      candidate = lines[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (candidate && t < candidate.end) return candidate;
  return null;
}

export function eventTime(film: CompiledFilm, type: string): number | null {
  const event = film.events.find((e) => e.type === type);
  return event ? event.at : null;
}

export function eventsBetween(film: CompiledFilm, from: number, to: number): CompiledFilm['events'] {
  if (to <= from) return [];
  return film.events.filter((event) => event.at > from && event.at <= to);
}

export function shotAt(film: CompiledFilm, t: number): string {
  const shots = film.shots;
  let lo = 0;
  let hi = shots.length - 1;
  let index = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (shots[mid].start <= t) {
      index = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return shots[index].shot;
}
