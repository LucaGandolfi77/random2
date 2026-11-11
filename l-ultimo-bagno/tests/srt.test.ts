import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { captionsToSrt, formatSrtTime } from '../src/subtitles/srt';
import type { Caption } from '../src/data/types';

const root = path.resolve(__dirname, '..');

const captions: Caption[] = [
  {
    start: 1.2,
    end: 3.45,
    speaker: 'ARTURO',
    text: 'Devo fare pipì.',
    scene: 'piazza',
    actId: 'atto1',
    beatId: 'a1_03_dialogo',
  },
  {
    start: 4,
    end: 6.001,
    speaker: 'GINO',
    text: 'Lo sapevo.',
    scene: 'piazza',
    actId: 'atto1',
    beatId: 'a1_03_dialogo',
  },
];

describe('esportazione SRT', () => {
  it('formatta i tempi con millisecondi', () => {
    expect(formatSrtTime(0)).toBe('00:00:00,000');
    expect(formatSrtTime(61.234)).toBe('00:01:01,234');
    expect(formatSrtTime(3661.99)).toBe('01:01:01,990');
  });

  it('genera un file SRT valido con speaker e testo', () => {
    const srt = captionsToSrt(captions);
    expect(srt).toContain('1\n00:00:01,200 --> 00:00:03,450\nARTURO: Devo fare pipì.');
    expect(srt).toContain('2\n00:00:04,000 --> 00:00:06,001\nGINO: Lo sapevo.');
    expect(srt.trim().endsWith('Lo sapevo.')).toBe(true);
  });

  it('il file statico pubblico esiste ed è coerente', () => {
    const srt = readFileSync(path.join(root, 'public/assets/captions.it.srt'), 'utf8');
    expect(srt.startsWith('1\n00:00:')).toBe(true);
    expect(srt).toContain('ARTURO: Gino.');
    expect(srt).toContain('GINO: Aspettiamo.');
    expect(srt).toContain('ARTURO: Anche voi siete ancora qui?');
  });
});
