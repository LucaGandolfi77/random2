import type { CompiledFilm } from '../data/types';
import { mulberry32 } from '../utils/math';

export interface MusicEvent {
  time: number;
  frequency: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  pan: number;
  attack: number;
  release: number;
}

const SCALE = [98, 110, 130.81, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63];

export function generateScore(film: CompiledFilm): MusicEvent[] {
  const random = mulberry32(0x5a1d0d);
  const events: MusicEvent[] = [];

  const holdBeat = film.beats.find((beat) => beat.id === 'a6_08_silenzio');
  const finalLine = film.beats.find((beat) => beat.id === 'a6_09_sguardo');

  for (let actIndex = 0; actIndex < film.acts.length; actIndex += 1) {
    const act = film.acts[actIndex];
    const root = SCALE[(actIndex * 2) % SCALE.length] / 2;

    events.push({
      time: act.start + 0.8,
      frequency: root,
      duration: Math.min(11, act.duration * 0.45),
      gain: 0.026,
      type: 'sine',
      pan: 0,
      attack: 2.4,
      release: 4.5,
    });

    let cursor = act.start + 3 + random() * 4;
    while (cursor < act.end - 2) {
      const insideHold =
        holdBeat !== undefined && cursor > holdBeat.start - 1 && cursor < holdBeat.end + 0.5;
      const atVeryEnd = actIndex === film.acts.length - 1 && cursor > act.end - 10;

      if (!insideHold && !atVeryEnd) {
        const frequency = SCALE[Math.floor(random() * SCALE.length)];
        events.push({
          time: cursor,
          frequency: random() < 0.25 ? frequency / 2 : frequency,
          duration: 1.6 + random() * 2.8,
          gain: 0.014 + random() * 0.018,
          type: random() < 0.2 ? 'triangle' : 'sine',
          pan: (random() - 0.5) * 0.6,
          attack: 0.6 + random() * 1.2,
          release: 2 + random() * 2.5,
        });
      }

      cursor += 3.2 + random() * 5.2;
    }
  }

  if (finalLine) {
    events.push({
      time: finalLine.start + 3.2,
      frequency: 55,
      duration: 5,
      gain: 0.035,
      type: 'sine',
      pan: 0,
      attack: 1.2,
      release: 6,
    });
  }

  return events.sort((a, b) => a.time - b.time);
}
