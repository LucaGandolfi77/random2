import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileScreenplay, validateFilm } from '../src/data/compileScreenplay';
import type { CameraCuesData, ScreenplayData } from '../src/data/types';

const root = path.resolve(__dirname, '..');
const screenplay = JSON.parse(
  readFileSync(path.join(root, 'src/data/screenplay.json'), 'utf8'),
) as ScreenplayData;
const cues = JSON.parse(
  readFileSync(path.join(root, 'src/data/camera-cues.json'), 'utf8'),
) as CameraCuesData;

const film = compileScreenplay(screenplay, cues);

describe('timeline e sceneggiatura', () => {
  it('compila senza errori di validazione', () => {
    expect(validateFilm(film)).toEqual([]);
  });

  it('ha sei atti e una durata tra cinque e otto minuti', () => {
    expect(film.acts).toHaveLength(6);
    expect(film.duration).toBeGreaterThanOrEqual(300);
    expect(film.duration).toBeLessThanOrEqual(480);
    expect(film.stages.length).toBeGreaterThanOrEqual(6);
  });

  it('copre ogni istante senza buchi tra gli atti', () => {
    let cursor = 0;
    for (const act of film.acts) {
      expect(act.start).toBeCloseTo(cursor, 3);
      expect(act.end).toBeGreaterThan(act.start);
      cursor = act.end;
    }
    expect(cursor).toBeCloseTo(film.duration, 3);
  });

  it('mantiene esattamente i dialoghi richiesti', () => {
    const text = film.dialogue.map((line) => line.text);
    expect(text).toContain('Devo fare pipì.');
    expect(text).toContain('Da quando hai smesso di parlare delle tasse.');
    expect(text).toContain('Il mio tempio è allagato.');
    expect(text).toContain('La ventunesima pecora non è ancora arrivata.');
    expect(text).toContain('VOGLIO UN MINUTO SENZA ESSERI UMANI!');
    expect(text).toContain('Aspettiamo.');
    expect(text).toContain('Anche voi siete ancora qui?');
    expect(film.dialogue).toHaveLength(137);
  });

  it('produce una battuta per ogni riga sottotitolata', () => {
    expect(film.captions).toHaveLength(film.dialogue.length);
    film.dialogue.forEach((line, index) => {
      const caption = film.captions[index];
      expect(caption.speaker).toBe(line.speaker);
      expect(caption.text).toBe(line.text);
      expect(caption.start).toBeCloseTo(line.start, 3);
      expect(caption.end).toBeCloseTo(line.end, 3);
    });
  });

  it('non sovrappone i sottotitoli', () => {
    for (let index = 1; index < film.captions.length; index += 1) {
      expect(film.captions[index].start).toBeGreaterThanOrEqual(
        film.captions[index - 1].end - 0.001,
      );
    }
  });

  it('rispetta il finale esteso con quindici secondi di silenzio', () => {
    const hold = film.beats.find((beat) => beat.id === 'a6_08_silenzio');
    const finalLine = film.dialogue.find((line) => line.text === 'Anche voi siete ancora qui?');
    expect(hold).toBeDefined();
    expect(hold!.duration).toBeGreaterThanOrEqual(15);
    expect(finalLine).toBeDefined();
    expect(finalLine!.start).toBeGreaterThan(hold!.end - 0.001);
  });

  it('usa telecamere esistenti e ambienti coerenti', () => {
    for (const beat of film.beats) {
      const shot = cues.shots[beat.camera];
      expect(shot, `telecamera mancante: ${beat.camera}`).toBeDefined();
      expect(shot.environment).toBe(beat.scene);
    }
  });

  it('include le gag ricorrenti del bagno negli ambienti', () => {
    const source = ['Piazza.ts', 'Park.ts', 'Countryside.ts', 'Hill.ts']
      .map((file) => readFileSync(path.join(root, 'src/environments', file), 'utf8'))
      .join('\n');
    expect(source).toContain('CHIUSO PER APERTURA');
    expect(source).toContain('BAGNO INTERIORE');
    expect(source).toContain('NON C’È SEGNALE');
    expect(source).toContain('FINALMENTE SOLO');
    expect(source).toContain('BAGNO FUORI SERVIZIO');
  });
});
