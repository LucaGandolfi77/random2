import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene09: SceneDef = {
  id: 's09',
  index: 8,
  title: "L'esclusione",
  duration: 120,
  palette: 'black',
  environment: 'opera',
  music: { id: 'exclusion', root: 40, mode: 'minor', tempo: 66, intensity: 0.45, darkness: 0.65 },
  ambience: ['crowd', 'wind'],
  transition: 'fade',
  shots: [
    shot(
      's09-opera',
      0,
      22,
      'opera',
      [cam(0, 940, 470, 1.28), cam(22, 900, 450, 1.4)],
      [
        track('anna', [
          actor(0, 820, 1060, 1.0, 'stand', 'cold', { gaze: { x: 3, y: 0 } }),
          actor(22, 830, 1055, 1.0, 'turn', 'fear', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('society', [
          actor(0, 1490, 1130, 1.28, 'stand', 'neutral', { opacity: 0.7, blur: 1.5 }),
          actor(22, 1480, 1125, 1.28, 'turn', 'neutral', { opacity: 0.65, blur: 1.5 })
        ], 'b', { back: true }),
        track('society', [
          actor(0, 560, 1060, 0.78, 'stand', 'neutral', { opacity: 0.3, blur: 1.1 }),
          actor(22, 550, 1055, 0.78, 'turn', 'neutral', { opacity: 0.26, blur: 1.1 })
        ], 'a')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.2 }],
        sfx: [sfx(2, 'crowd', 0.5), sfx(4, 'glass', 0.25)]
      }
    ),
    shot(
      's09-empty-boxes',
      22,
      20,
      'opera',
      [cam(0, 700, 540, 1.15), cam(20, 1200, 540, 1.15)],
      [
        track('anna', [
          actor(0, 900, 1020, 0.9, 'turn', 'shame', { gaze: { x: 2, y: 0 } }),
          actor(20, 910, 1020, 0.9, 'stand', 'grief', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('society', [
          actor(0, 500, 1030, 0.68, 'stand', 'neutral', { opacity: 0.25 }),
          actor(20, 470, 1030, 0.68, 'turn', 'neutral', { opacity: 0.18 })
        ], 'a'),
        track('society', [
          actor(0, 1400, 1030, 0.68, 'stand', 'neutral', { opacity: 0.25 }),
          actor(20, 1430, 1030, 0.68, 'turn', 'neutral', { opacity: 0.18 })
        ], 'c')
      ],
      { effects: [{ type: 'motes', intensity: 0.15 }], sfx: [sfx(2, 'crowd', 0.35)] }
    ),
    shot(
      's09-salon',
      42,
      20,
      'palace',
      [cam(0, 960, 480, 1.2), cam(20, 960, 500, 1.28)],
      [
        track('anna', [
          actor(0, 760, 1020, 0.9, 'stand', 'shame', { gaze: { x: 2, y: 0 } }),
          actor(20, 770, 1020, 0.9, 'turn', 'cold', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1120, 1020, 0.95, 'stand', 'cold', { gaze: { x: -1, y: 0 }, flip: true }),
          actor(20, 1110, 1020, 0.95, 'turn', 'grief', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'civilian'),
        track('society', [
          actor(0, 1400, 1030, 0.68, 'stand', 'neutral', { opacity: 0.4 }),
          actor(20, 1390, 1030, 0.68, 'turn', 'neutral', { opacity: 0.35 })
        ], 'b')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.15 }],
        sfx: [sfx(2, 'crowd', 0.4), sfx(4, 'glass', 0.2)]
      }
    ),
    shot(
      's09-carriage',
      62,
      20,
      'train',
      [cam(0, 960, 540, 1.1), cam(20, 960, 560, 1.2)],
      [
        track('anna', [
          actor(0, 960, 1020, 0.9, 'stand', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(20, 960, 1020, 0.9, 'cover', 'grief', { gaze: { x: -2, y: 0 } })
        ], 'winter')
      ],
      {
        effects: [{ type: 'rain', intensity: 0.6 }],
        sfx: [sfx(1, 'rain', 0.4), sfx(2, 'carriage', 0.35), sfx(3, 'wind', 0.25)]
      }
    ),
    shot(
      's09-mirror',
      82,
      20,
      'apartment',
      [cam(0, 960, 430, 1.5), cam(20, 960, 410, 1.65)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.2, 'turn', 'shame', { gaze: { x: -1, y: 0 } }),
          actor(20, 960, 1120, 1.22, 'cover', 'grief', { gaze: { x: -2, y: 0 } })
        ], 'gown')
      ],
      { effects: [{ type: 'embers', intensity: 0.1 }], sfx: [sfx(2, 'fire', 0.2)] }
    ),
    shot(
      's09-distance',
      102,
      18,
      'palace',
      [cam(0, 960, 540, 1.08), cam(18, 960, 560, 1.16)],
      [
        track('anna', [
          actor(0, 500, 1020, 0.85, 'stand', 'grief', { gaze: { x: 2, y: 0 } }),
          actor(18, 510, 1020, 0.85, 'turn', 'cold', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1400, 1020, 0.85, 'stand', 'cold', { gaze: { x: -1, y: 0 }, flip: true }),
          actor(18, 1390, 1020, 0.85, 'turn', 'grief', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'civilian'),
        track('society', [
          actor(0, 950, 1030, 0.7, 'stand', 'neutral', { opacity: 0.3 }),
          actor(18, 960, 1030, 0.7, 'turn', 'neutral', { opacity: 0.25 })
        ], 'a')
      ],
      { effects: [{ type: 'motes', intensity: 0.1 }], sfx: [sfx(1, 'crowd', 0.3)] }
    )
  ],
  subtitles: [
    line(
      's09-n1',
      24,
      32,
      'NARRAZIONE',
      'La società non la condannò con un verdetto. Le tolse semplicemente le sedie intorno.',
      'narration'
    ),
    line('s09-d1', 46, 54, 'UNA DAMA', 'Non possiamo riceverla.'),
    line(
      's09-n2',
      84,
      92,
      'NARRAZIONE',
      "Anche l'amore, quando resta solo, comincia a somigliare a una stanza chiusa.",
      'narration'
    ),
    line('s09-a1', 100, 108, 'ANNA', 'Perché mi guardano?'),
    line('s09-v1', 109, 117, 'VRONSKIJ', 'Perché sei più bella di loro.')
  ]
};
