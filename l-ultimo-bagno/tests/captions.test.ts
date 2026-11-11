import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileScreenplay } from '../src/data/compileScreenplay';
import type { CameraCuesData, ScreenplayData } from '../src/data/types';

const root = path.resolve(__dirname, '..');
const readJson = (relative: string) =>
  JSON.parse(readFileSync(path.join(root, relative), 'utf8'));

const screenplay = readJson('src/data/screenplay.json') as ScreenplayData;
const cues = readJson('src/data/camera-cues.json') as CameraCuesData;
const captionsFile = readJson('src/subtitles/captions.it.json') as {
  language: string;
  title: string;
  duration: number;
  captions: Array<{
    start: number;
    end: number;
    speaker: string;
    text: string;
  }>;
};

const film = compileScreenplay(screenplay, cues);

describe('file captions generato', () => {
  it('è in italiano e allineato al film', () => {
    expect(captionsFile.language).toBe('it');
    expect(captionsFile.title).toBe('L\'ULTIMO BAGNO');
    expect(captionsFile.duration).toBeCloseTo(film.duration, 2);
    expect(captionsFile.captions).toHaveLength(film.captions.length);
  });

  it('corrisponde esattamente alla sceneggiatura compilata', () => {
    captionsFile.captions.forEach((caption, index) => {
      const source = film.captions[index];
      expect(caption.speaker).toBe(source.speaker);
      expect(caption.text).toBe(source.text);
      expect(caption.start).toBeCloseTo(source.start, 3);
      expect(caption.end).toBeCloseTo(source.end, 3);
    });
  });

  it('non contiene testi vuoti', () => {
    for (const caption of captionsFile.captions) {
      expect(caption.text.trim().length).toBeGreaterThan(0);
      expect(caption.end).toBeGreaterThan(caption.start);
    }
  });
});
