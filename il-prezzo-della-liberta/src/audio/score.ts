import type { CompiledFilm } from '../data/types';

export type Instrument = 'piano' | 'strings' | 'pad' | 'accordion' | 'bass' | 'bell';

export interface ScoreNote {
  at: number;
  dur: number;
  instrument: Instrument;
  pitch: number;
  velocity: number;
  pan: number;
}

const A_MINOR = [57, 60, 64];
const WARM = [53, 57, 60, 64];

export function buildScore(film: CompiledFilm): ScoreNote[] {
  const notes: ScoreNote[] = [];

  const push = (at: number, dur: number, instrument: Instrument, pitch: number, velocity: number, pan = 0): void => {
    notes.push({ at, dur, instrument, pitch, velocity, pan });
  };

  const act = (index: number) => film.acts[index];

  if (act(0)) {
    const start = act(0).start;
    const end = act(0).end;
    const motif = [57, 60, 64, 62, 60, 57, 55, 57];
    let i = 0;
    for (let t = start + 2.5; t < end - 4; t += 7.6) {
      push(t, 3.4, 'piano', motif[i % motif.length], 0.3, -0.08);
      push(t + 0.02, 3.2, 'piano', motif[i % motif.length] - 12, 0.16, 0.1);
      i += 1;
    }
    for (const [offset, pitches] of [[0, [33, 40]], [28, [29, 36]], [56, [31, 38]]] as Array<[number, number[]]>) {
      for (const pitch of pitches) push(start + offset, 26, 'strings', pitch, 0.15, 0);
    }
    push(start + 62, 12, 'pad', 45, 0.1, 0.2);
  }

  if (act(1)) {
    const start = act(1).start;
    const end = act(1).end;
    let i = 0;
    for (let t = start + 3; t < end - 3; t += 9) {
      push(t, 2.4, 'piano', A_MINOR[i % A_MINOR.length] - 4, 0.24, 0.12);
      push(t + 0.45, 2.2, 'piano', A_MINOR[(i + 1) % A_MINOR.length] - 4, 0.18, -0.12);
      i += 1;
    }
    for (let t = start; t < end - 6; t += 18) {
      push(t, 14, 'strings', 41, 0.14, -0.15);
      push(t, 14, 'strings', 48, 0.1, 0.15);
      push(t, 14, 'bass', 29, 0.1, 0);
    }
  }

  if (act(2)) {
    const start = act(2).start;
    const end = act(2).end;
    for (const [offset, pitch] of [[0, 76], [18, 72], [40, 69], [74, 71], [96, 72]] as Array<[number, number]>) {
      if (start + offset < end - 6) push(start + offset, 8, 'strings', pitch, 0.09, 0.2);
    }
    for (const [offset, pitch] of [[12, 45], [48, 41], [86, 43], [112, 45]] as Array<[number, number]>) {
      if (start + offset < end - 6) push(start + offset, 24, 'pad', pitch, 0.09, -0.1);
    }
    for (const [offset, pitch] of [[6, 64], [34, 60], [58, 62], [82, 57], [104, 60]] as Array<[number, number]>) {
      if (start + offset < end - 4) push(start + offset, 2.8, 'piano', pitch, 0.14, 0);
    }
  }

  if (act(3)) {
    const start = act(3).start;
    const end = act(3).end;
    let step = 0;
    for (let t = start + 2; t < end - 3; t += 3.8) {
      push(t, 1.2, 'bass', 33 + (step % 2 === 0 ? 0 : 3), 0.16, 0);
      push(t + 0.15, 0.9, 'piano', 57 + (step % 3 === 0 ? 0 : 3), 0.16, -0.1);
      if (step % 4 === 0) push(t, 6, 'strings', 45, 0.12, 0.15);
      step += 1;
    }
    for (const [offset, pitch] of [[16, 60], [34, 64], [52, 62], [70, 57], [88, 60], [106, 64]] as Array<[number, number]>) {
      if (start + offset < end - 4) push(start + offset, 4, 'pad', pitch, 0.08, 0);
    }
  }

  if (act(4)) {
    const start = act(4).start;
    const end = act(4).end;
    for (let t = start + 2; t < end - 4; t += 12) {
      push(t, 9, 'strings', 45, 0.13, -0.1);
      push(t, 9, 'strings', 52, 0.1, 0.1);
      push(t + 4, 6, 'strings', 41, 0.09, 0);
    }
    for (const [offset, pitch] of [[8, 69], [26, 72], [44, 71], [62, 69], [80, 76], [96, 72]] as Array<[number, number]>) {
      if (start + offset < end - 4) push(start + offset, 3.2, 'piano', pitch, 0.13, 0.1);
    }
  }

  if (act(5)) {
    const start = act(5).start;
    const end = act(5).end;
    let i = 0;
    for (let t = start + 1; t < end - 6; t += 4.4) {
      push(t, 3.8, 'piano', WARM[i % WARM.length] + 12, 0.22, 0.1);
      push(t + 2.2, 2.4, 'piano', WARM[(i + 2) % WARM.length] + 12, 0.15, -0.1);
      if (i % 3 === 0) push(t, 10, 'strings', 45, 0.1, 0);
      i += 1;
    }
    push(start + 6, 20, 'pad', 45, 0.1, -0.2);
    const accStart = end - 34;
    const melody = [69, 72, 74, 72, 69, 65, 67, 69];
    melody.forEach((pitch, index) => {
      push(accStart + index * 3.6, 3.2, 'accordion', pitch, 0.12, 0.08);
    });
    for (let t = end - 20; t < end - 3; t += 8) {
      push(t, 8, 'strings', 41, 0.1, 0);
      push(t, 8, 'strings', 48, 0.08, 0.1);
    }
  }

  notes.sort((a, b) => a.at - b.at || a.pitch - b.pitch);
  return notes;
}

export function notesBetween(notes: ScoreNote[], from: number, to: number): ScoreNote[] {
  return notes.filter((note) => note.at > from && note.at <= to);
}

export function midiToFreq(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}
