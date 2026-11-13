import { describe, expect, it } from 'vitest';
import { CHAPTERS, DURATION, chapterAt, formatTime } from '../src/film/timeline';

describe('Le Fil d’Or timeline', () => {
  it('runs exactly twenty minutes', () => {
    expect(DURATION).toBe(1200);
    expect(CHAPTERS[0].start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1].end).toBe(DURATION);
  });

  it('has no gaps or overlaps between chapters', () => {
    for (let i = 0; i < CHAPTERS.length; i++) {
      const chapter = CHAPTERS[i];
      expect(chapter.end).toBeGreaterThan(chapter.start);
      if (i > 0) expect(chapter.start).toBe(CHAPTERS[i - 1].end);
    }
  });

  it('resolves a chapter for every second of the film', () => {
    for (let t = 0; t < DURATION; t += 7.31) {
      const chapter = chapterAt(t);
      expect(t).toBeGreaterThanOrEqual(chapter.start);
      expect(t).toBeLessThan(chapter.end);
    }
    expect(chapterAt(DURATION).id).toBe(CHAPTERS[CHAPTERS.length - 1].id);
  });

  it('keeps every cue inside its chapter and free of overlaps', () => {
    const all = CHAPTERS.flatMap((chapter) =>
      chapter.cues.map((cue) => ({ ...cue, chapter: chapter.id })),
    );
    for (const cue of all) {
      const chapter = CHAPTERS.find((c) => c.id === cue.chapter)!;
      expect(cue.start).toBeGreaterThanOrEqual(chapter.start);
      expect(cue.end).toBeLessThanOrEqual(chapter.end);
      expect(cue.end).toBeGreaterThan(cue.start);
    }
    const sorted = [...all].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].start).toBeGreaterThanOrEqual(sorted[i - 1].end);
    }
  });

  it('has bilingual text for every cue', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.title.en.trim().length).toBeGreaterThan(0);
      expect(chapter.title.it.trim().length).toBeGreaterThan(0);
      for (const cue of chapter.cues) {
        expect(cue.text.en.trim().length).toBeGreaterThan(0);
        expect(cue.text.it.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('formats film time as MM:SS', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(754)).toBe('12:34');
    expect(formatTime(DURATION)).toBe('20:00');
  });

  it('keeps every act substantial and the prologue/epilogue brief', () => {
    for (const chapter of CHAPTERS) {
      const length = chapter.end - chapter.start;
      if (chapter.id === 'prologue') expect(length).toBe(90);
      else if (chapter.id === 'epilogue') expect(length).toBe(40);
      else expect(length).toBeGreaterThanOrEqual(80);
    }
  });
});
