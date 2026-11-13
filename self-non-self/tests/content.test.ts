import { describe, expect, it } from 'vitest';
import { heartRate, oxygenLevel } from '../src/film/cells';
import { CUES, THESIS_LINES } from '../src/film/script';
import { DURATION } from '../src/film/timeline';

describe('SELF / NON-SELF — the body', () => {
  it('the heart slows and stops', () => {
    expect(heartRate(0)).toBeGreaterThan(60);
    expect(heartRate(200)).toBeLessThan(heartRate(0));
    expect(heartRate(500)).toBeLessThan(heartRate(200));
    expect(heartRate(700)).toBeLessThan(30);
    expect(heartRate(780)).toBeGreaterThan(0);
  });

  it('oxygen falls monotonically and never comes back', () => {
    let previous = oxygenLevel(0);
    for (let t = 0; t <= DURATION; t += 5) {
      const current = oxygenLevel(t);
      expect(current).toBeLessThanOrEqual(previous + 0.0001);
      expect(current).toBeGreaterThanOrEqual(0);
      expect(current).toBeLessThanOrEqual(1);
      previous = current;
    }
    expect(oxygenLevel(780)).toBe(0);
  });

  it('keeps the lines that matter', () => {
    const all = CUES.map((cue) => `${cue.text.en} ${cue.text.it}`).join(' ');
    for (const line of THESIS_LINES) {
      const enSentences = line.en.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 15);
      const itSentences = line.it.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 15);
      for (const sentence of enSentences) expect(all).toContain(sentence);
      for (const sentence of itSentences) expect(all).toContain(sentence);
    }
    expect(all).toContain('come in');
    expect(all).toContain('entra');
    expect(all).toContain('garden');
    expect(all).toContain('giardino');
  });

  it('does not pretend the body survives', () => {
    const ending = CUES.filter((cue) => cue.start >= 695).map((cue) => cue.text.en).join(' ');
    expect(ending.toLowerCase()).not.toContain('cured');
    expect(ending.toLowerCase()).not.toContain('saved');
    expect(ending.toLowerCase()).toContain('garden');
  });

  it('has a pronoun arc from I to you to we/they', () => {
    const early = CUES.filter((cue) => cue.start < 430).map((cue) => cue.text.en).join(' ');
    const late = CUES.filter((cue) => cue.start >= 430).map((cue) => cue.text.en).join(' ');
    expect(early.match(/\bI\b/g)?.length ?? 0).toBeGreaterThan(3);
    expect(late).toContain('you');
    expect(`${early} ${late}`).toContain('come in');
  });
});
