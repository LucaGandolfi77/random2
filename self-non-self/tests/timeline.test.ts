import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  DURATION,
  chapterAt,
  clinicalAt,
  cueAt,
  formatTime,
  shotAt,
} from '../src/film/timeline';
import { CLINICAL, CUES } from '../src/film/script';

describe('SELF / NON-SELF — the timeline', () => {
  it('runs exactly thirteen minutes', () => {
    expect(DURATION).toBe(780);
    expect(CHAPTERS[0]!.start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1]!.end).toBe(DURATION);
  });

  it('has ten contiguous chapters with no gaps or overlaps', () => {
    expect(CHAPTERS).toHaveLength(10);
    for (let i = 0; i < CHAPTERS.length; i++) {
      const chapter = CHAPTERS[i]!;
      expect(chapter.end).toBeGreaterThan(chapter.start);
      if (i > 0) expect(chapter.start).toBe(CHAPTERS[i - 1]!.end);
    }
  });

  it('resolves a chapter for every moment of the film', () => {
    for (let t = 0; t < DURATION; t += 3.17) {
      const chapter = chapterAt(t);
      expect(t).toBeGreaterThanOrEqual(chapter.start);
      expect(t).toBeLessThan(chapter.end);
    }
    expect(chapterAt(-10).id).toBe('prologue');
    expect(chapterAt(DURATION).id).toBe('garden');
  });

  it('keeps every shot inside its chapter and covers it completely', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.shots.length).toBeGreaterThanOrEqual(3);
      expect(chapter.shots[0]!.start).toBe(chapter.start);
      expect(chapter.shots[chapter.shots.length - 1]!.end).toBe(chapter.end);
      for (let i = 0; i < chapter.shots.length; i++) {
        const shot = chapter.shots[i]!;
        expect(shot.end).toBeGreaterThan(shot.start);
        if (i > 0) expect(shot.start).toBe(chapter.shots[i - 1]!.end);
      }
    }
  });

  it('finds the right shot and local time', () => {
    const atStart = shotAt(0);
    expect(atStart.shot.id).toBe('p1');
    expect(atStart.local).toBe(0);
    const atResidents = shotAt(340);
    expect(atResidents.chapter.id).toBe('residents');
    expect(atResidents.shot.id).toBe('r1');
    expect(atResidents.local).toBeCloseTo(5, 5);
    expect(shotAt(DURATION).shot.id).toBe('z3');
  });

  it('keeps every cue inside its chapter and free of overlaps', () => {
    const sorted = [...CUES].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length; i++) {
      const cue = sorted[i]!;
      const chapter = chapterAt(cue.start);
      expect(cue.start).toBeGreaterThanOrEqual(chapter.start);
      expect(cue.end).toBeLessThanOrEqual(chapter.end);
      expect(cue.end).toBeGreaterThan(cue.start);
      if (i > 0) expect(cue.start).toBeGreaterThanOrEqual(sorted[i - 1]!.end);
    }
  });

  it('has a line in every chapter and no long empty stretches', () => {
    for (const chapter of CHAPTERS) {
      expect(CUES.some((cue) => cue.start >= chapter.start && cue.end <= chapter.end)).toBe(true);
    }
    const sorted = [...CUES].sort((a, b) => a.start - b.start);
    let previous = 0;
    for (const cue of sorted) {
      expect(cue.start - previous).toBeLessThan(32);
      previous = cue.end;
    }
    expect(DURATION - previous).toBeLessThan(12);
  });

  it('has both languages for every cue, chapter title and clinical label', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.title.en.trim().length).toBeGreaterThan(0);
      expect(chapter.title.it.trim().length).toBeGreaterThan(0);
    }
    for (const cue of CUES) {
      expect(cue.text.en.trim().length).toBeGreaterThan(0);
      expect(cue.text.it.trim().length).toBeGreaterThan(0);
      expect(cue.text.en.length).toBeLessThan(260);
      expect(cue.text.it.length).toBeLessThan(280);
    }
    for (const overlay of CLINICAL) {
      expect(overlay.label.trim().length).toBeGreaterThan(0);
      expect(overlay.value.trim().length).toBeGreaterThan(0);
    }
  });

  it('uses speakers honestly', () => {
    for (const cue of CUES) {
      if (cue.kind === 'dialogue') {
        expect(['messenger', 'resident']).toContain(cue.speaker);
      } else {
        expect(cue.speaker).toBe('none');
      }
    }
  });

  it('resolves cues exactly at boundaries', () => {
    expect(cueAt(5)?.id).toBe('p01');
    expect(cueAt(4.999)).toBeNull();
    expect(cueAt(11)).toBeNull();
    expect(cueAt(779.5)?.id).toBe('z03');
    expect(cueAt(DURATION)).toBeNull();
  });

  it('keeps the clinical countdown inside the film and in order', () => {
    for (let i = 0; i < CLINICAL.length; i++) {
      const overlay = CLINICAL[i]!;
      expect(overlay.start).toBeGreaterThanOrEqual(0);
      expect(overlay.end).toBeLessThanOrEqual(DURATION);
      expect(overlay.end).toBeGreaterThan(overlay.start);
      if (i > 0) expect(overlay.start).toBeGreaterThanOrEqual(CLINICAL[i - 1]!.end);
    }
    expect(clinicalAt(170)?.id).toBe('c01');
    expect(clinicalAt(171)?.id).toBe('c01');
    expect(clinicalAt(180)).toBeNull();
  });

  it('formats film time as MM:SS', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(59.6)).toBe('01:00');
    expect(formatTime(754)).toBe('12:34');
    expect(formatTime(DURATION)).toBe('13:00');
  });
});
