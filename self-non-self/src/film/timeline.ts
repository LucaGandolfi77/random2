import { CLINICAL, CUES } from './script';
import type { Chapter, ClinicalOverlay, Cue, Shot } from './types';

export const DURATION = 780;
export const STAGE_W = 720;
export const STAGE_H = 1280;

export const CHAPTERS: Chapter[] = [
  {
    id: 'prologue',
    index: 0,
    roman: 'PROLOGUE',
    start: 0,
    end: 60,
    title: { en: 'The Country', it: 'Il Paese' },
    accent: '#e8b46a',
    shots: [
      { id: 'p1', start: 0, end: 12 },
      { id: 'p2', start: 12, end: 32 },
      { id: 'p3', start: 32, end: 48 },
      { id: 'p4', start: 48, end: 60 },
    ],
  },
  {
    id: 'watch',
    index: 1,
    roman: 'I',
    start: 60,
    end: 160,
    title: { en: 'The Watch', it: 'La Veglia' },
    accent: '#d98a5f',
    shots: [
      { id: 'w1', start: 60, end: 78 },
      { id: 'w2', start: 78, end: 96 },
      { id: 'w3', start: 96, end: 116 },
      { id: 'w4', start: 116, end: 136 },
      { id: 'w5', start: 136, end: 160 },
    ],
  },
  {
    id: 'silence',
    index: 2,
    roman: 'II',
    start: 160,
    end: 245,
    title: { en: 'The First Silence', it: 'Il Primo Silenzio' },
    accent: '#8fa3b0',
    shots: [
      { id: 's1', start: 160, end: 178 },
      { id: 's2', start: 178, end: 196 },
      { id: 's3', start: 196, end: 214 },
      { id: 's4', start: 214, end: 232 },
      { id: 's5', start: 232, end: 245 },
    ],
  },
  {
    id: 'breach',
    index: 3,
    roman: 'III',
    start: 245,
    end: 335,
    title: { en: 'The Breach', it: 'La Breccia' },
    accent: '#8fae6a',
    shots: [
      { id: 'b1', start: 245, end: 262 },
      { id: 'b2', start: 262, end: 280 },
      { id: 'b3', start: 280, end: 300 },
      { id: 'b4', start: 300, end: 318 },
      { id: 'b5', start: 318, end: 335 },
    ],
  },
  {
    id: 'residents',
    index: 4,
    roman: 'IV',
    start: 335,
    end: 430,
    title: { en: 'The Residents', it: 'I Residenti' },
    accent: '#7b9f8e',
    shots: [
      { id: 'r1', start: 335, end: 352 },
      { id: 'r2', start: 352, end: 370 },
      { id: 'r3', start: 370, end: 392 },
      { id: 'r4', start: 392, end: 412 },
      { id: 'r5', start: 412, end: 430 },
    ],
  },
  {
    id: 'signal',
    index: 5,
    roman: 'V',
    start: 430,
    end: 525,
    title: { en: 'The Last Signal', it: 'L’Ultimo Segnale' },
    accent: '#c9555f',
    shots: [
      { id: 'g1', start: 430, end: 448 },
      { id: 'g2', start: 448, end: 466 },
      { id: 'g3', start: 466, end: 484 },
      { id: 'g4', start: 484, end: 502 },
      { id: 'g5', start: 502, end: 525 },
    ],
  },
  {
    id: 'empty',
    index: 6,
    roman: 'VI',
    start: 525,
    end: 615,
    title: { en: 'The Empty City', it: 'La Città Vuota' },
    accent: '#9b8a7a',
    shots: [
      { id: 'e1', start: 525, end: 540 },
      { id: 'e2', start: 540, end: 558 },
      { id: 'e3', start: 558, end: 576 },
      { id: 'e4', start: 576, end: 594 },
      { id: 'e5', start: 594, end: 615 },
    ],
  },
  {
    id: 'surface',
    index: 7,
    roman: 'VII',
    start: 615,
    end: 695,
    title: { en: 'The Surface', it: 'La Superficie' },
    accent: '#d9d2c0',
    shots: [
      { id: 'u1', start: 615, end: 632 },
      { id: 'u2', start: 632, end: 650 },
      { id: 'u3', start: 650, end: 668 },
      { id: 'u4', start: 668, end: 695 },
    ],
  },
  {
    id: 'apoptosis',
    index: 8,
    roman: 'VIII',
    start: 695,
    end: 750,
    title: { en: 'Apoptosis', it: 'Apoptosi' },
    accent: '#e8b46a',
    shots: [
      { id: 'a1', start: 695, end: 708 },
      { id: 'a2', start: 708, end: 722 },
      { id: 'a3', start: 722, end: 736 },
      { id: 'a4', start: 736, end: 750 },
    ],
  },
  {
    id: 'garden',
    index: 9,
    roman: 'IX',
    start: 750,
    end: 780,
    title: { en: 'The Garden', it: 'Il Giardino' },
    accent: '#9fbf7a',
    shots: [
      { id: 'z1', start: 750, end: 762 },
      { id: 'z2', start: 762, end: 772 },
      { id: 'z3', start: 772, end: 780 },
    ],
  },
];

const LAST_CHAPTER = CHAPTERS[CHAPTERS.length - 1]!;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function chapterAt(time: number): Chapter {
  const t = clamp(time, 0, DURATION);
  if (t >= DURATION) return LAST_CHAPTER;
  for (const chapter of CHAPTERS) {
    if (t >= chapter.start && t < chapter.end) return chapter;
  }
  return LAST_CHAPTER;
}

export function shotAt(time: number): { chapter: Chapter; shot: Shot; local: number } {
  const t = clamp(time, 0, DURATION);
  const chapter = chapterAt(t);
  const shots = chapter.shots;
  const last = shots[shots.length - 1]!;
  if (t >= chapter.end) {
    return { chapter, shot: last, local: last.end - last.start };
  }
  for (const shot of shots) {
    if (t >= shot.start && t < shot.end) {
      return { chapter, shot, local: t - shot.start };
    }
  }
  return { chapter, shot: last, local: t - last.start };
}

export function cueAt(time: number): Cue | null {
  for (const cue of CUES) {
    if (time >= cue.start && time < cue.end) return cue;
  }
  return null;
}

export function clinicalAt(time: number): ClinicalOverlay | null {
  for (const overlay of CLINICAL) {
    if (time >= overlay.start && time < overlay.end) return overlay;
  }
  return null;
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function chapterProgress(time: number): number {
  return clamp(time / DURATION, 0, 1);
}
