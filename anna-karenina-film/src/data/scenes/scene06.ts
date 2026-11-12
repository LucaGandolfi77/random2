import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene06: SceneDef = {
  id: 's06',
  index: 5,
  title: 'Le corse',
  duration: 120,
  palette: 'sun',
  environment: 'racecourse',
  music: { id: 'race-tension', root: 41, mode: 'minor', tempo: 88, intensity: 0.66, darkness: 0.55 },
  ambience: ['crowd', 'horses'],
  transition: 'fade',
  shots: [
    shot(
      's06-stand',
      0,
      18,
      'racecourse',
      [cam(0, 960, 540, 1.02), cam(18, 960, 560, 1.12)],
      [
        track('anna', [
          actor(0, 760, 1030, 0.9, 'stand', 'fear', { gaze: { x: 2, y: 0 } }),
          actor(18, 770, 1030, 0.9, 'turn', 'fear', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('karenin', [
          actor(0, 1140, 1020, 0.9, 'stand', 'cold', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(18, 1130, 1020, 0.9, 'turn', 'cold', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'frock'),
        track('society', [
          actor(0, 500, 1040, 0.68, 'stand', 'neutral', { opacity: 0.45 }),
          actor(18, 510, 1040, 0.68, 'turn', 'neutral', { opacity: 0.45 })
        ], 'a'),
        track('society', [
          actor(0, 1400, 1040, 0.68, 'stand', 'neutral', { opacity: 0.45 }),
          actor(18, 1390, 1040, 0.68, 'turn', 'neutral', { opacity: 0.45 })
        ], 'c')
      ],
      {
        effects: [{ type: 'dust', intensity: 0.5 }],
        sfx: [sfx(1, 'crowd', 0.5), sfx(4, 'horses', 0.4)]
      }
    ),
    shot(
      's06-horse',
      18,
      18,
      'racecourse',
      [cam(0, 960, 500, 1.2), cam(18, 960, 480, 1.3)],
      [],
      {
        effects: [{ type: 'dust', intensity: 0.8 }],
        sfx: [sfx(1, 'horses', 0.7), sfx(2, 'crowd', 0.5)],
        props: [{ id: 'horse', x: 960, y: 920, scale: 0.9 }]
      }
    ),
    shot(
      's06-vronsky',
      36,
      16,
      'racecourse',
      [cam(0, 960, 420, 1.35), cam(16, 960, 400, 1.5)],
      [
        track('vronsky', [
          actor(0, 960, 1080, 0.95, 'ride', 'fear', { gaze: { x: 1, y: 0 } }),
          actor(16, 960, 1070, 0.98, 'ride', 'anger', { gaze: { x: 2, y: 0 } })
        ], 'riding')
      ],
      {
        effects: [{ type: 'dust', intensity: 0.7 }],
        sfx: [sfx(1, 'crowd', 0.4), sfx(2, 'horses', 0.5)]
      }
    ),
    shot(
      's06-anna-cry',
      52,
      16,
      'racecourse',
      [cam(0, 960, 430, 1.55), cam(16, 960, 410, 1.7)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.3, 'recoil', 'fear', { gaze: { x: -1, y: 0 } }),
          actor(16, 960, 1120, 1.32, 'cover', 'fear', { gaze: { x: -2, y: 0 } })
        ], 'gown')
      ],
      {
        effects: [{ type: 'dust', intensity: 0.4 }],
        sfx: [sfx(1, 'gasp', 0.6), sfx(1, 'thud', 0.5), sfx(2, 'crowd', 0.4)]
      }
    ),
    shot(
      's06-reproach',
      68,
      16,
      'racecourse',
      [cam(0, 960, 480, 1.3), cam(16, 960, 460, 1.4)],
      [
        track('anna', [
          actor(0, 800, 1020, 0.95, 'stand', 'shame', { gaze: { x: 2, y: 0 } }),
          actor(16, 805, 1020, 0.95, 'turn', 'grief', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('karenin', [
          actor(0, 1120, 1020, 0.95, 'stand', 'anger', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(16, 1115, 1020, 0.95, 'turn', 'cold', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'frock')
      ],
      { effects: [{ type: 'dust', intensity: 0.2 }], sfx: [sfx(1, 'crowd', 0.3)] }
    ),
    shot(
      's06-crowd',
      84,
      20,
      'racecourse',
      [cam(0, 960, 540, 1.12), cam(20, 960, 560, 1.04)],
      [
        track('anna', [
          actor(0, 900, 1020, 0.9, 'stand', 'shame', { gaze: { x: -1, y: 0 } }),
          actor(20, 890, 1020, 0.9, 'turn', 'grief', { gaze: { x: -2, y: 0 } })
        ], 'gown'),
        track('society', [
          actor(0, 650, 1030, 0.7, 'stand', 'neutral', { opacity: 0.35 }),
          actor(20, 640, 1030, 0.7, 'turn', 'neutral', { opacity: 0.35 })
        ], 'a'),
        track('society', [
          actor(0, 1200, 1030, 0.7, 'stand', 'neutral', { opacity: 0.35 }),
          actor(20, 1210, 1030, 0.7, 'turn', 'neutral', { opacity: 0.35 })
        ], 'b')
      ],
      { effects: [{ type: 'dust', intensity: 0.2 }], sfx: [sfx(2, 'crowd', 0.4)] }
    ),
    shot(
      's06-rain',
      104,
      16,
      'train',
      [cam(0, 960, 540, 1.05), cam(16, 960, 560, 1.12)],
      [
        track('anna', [
          actor(0, 960, 1020, 0.9, 'stand', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(16, 960, 1020, 0.9, 'turn', 'cold', { gaze: { x: -2, y: 0 } })
        ], 'travel')
      ],
      {
        effects: [{ type: 'rain', intensity: 0.7 }],
        sfx: [sfx(1, 'rain', 0.5), sfx(2, 'carriage', 0.4), sfx(3, 'wind', 0.3)]
      }
    )
  ],
  subtitles: [
    line('s06-a1', 2, 10, 'ANNA', 'Non guardarmi.'),
    line('s06-k1', 11, 18, 'KARENIN', 'Non sono io che ti sto guardando.'),
    line('s06-k2', 70, 78, 'KARENIN', 'Hai reso pubblica la tua vergogna.'),
    line('s06-a2', 79, 87, 'ANNA', 'Ho reso pubblica la tua indifferenza.'),
    line(
      's06-n1',
      90,
      100,
      'NARRAZIONE',
      'Fu il momento in cui la società smise di guardarla come una donna e cominciò a guardarla come una colpa.',
      'narration'
    ),
    line('s06-a3', 106, 114, 'ANNA', 'Non posso fingere.')
  ]
};
