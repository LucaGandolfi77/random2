import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene03: SceneDef = {
  id: 's03',
  index: 2,
  title: 'Il ballo',
  duration: 120,
  palette: 'brass',
  environment: 'ballroom',
  music: { id: 'ball-waltz', root: 50, mode: 'minor', tempo: 84, intensity: 0.6, darkness: 0.25, meter: 3 },
  ambience: ['crowd'],
  transition: 'fade',
  shots: [
    shot(
      's03-waiting',
      0,
      18,
      'ballroom',
      [cam(0, 960, 540, 1.02), cam(18, 960, 560, 1.12)],
      [
        track('kitty', [
          actor(0, 700, 1030, 0.9, 'stand', 'wonder', { gaze: { x: 2, y: 0 } }),
          actor(18, 710, 1030, 0.9, 'turn', 'wonder', { gaze: { x: 3, y: 0 } })
        ], 'ball'),
        track('society', [
          actor(0, 1200, 1040, 0.68, 'stand', 'neutral', { opacity: 0.45 }),
          actor(18, 1220, 1040, 0.68, 'turn', 'neutral', { opacity: 0.45 })
        ], 'a')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.6 }],
        sfx: [sfx(2, 'crowd', 0.4), sfx(6, 'glass', 0.25)]
      }
    ),
    shot(
      's03-vronsky-enters',
      18,
      18,
      'ballroom',
      [cam(0, 1050, 540, 1.12), cam(18, 900, 520, 1.2)],
      [
        track('kitty', [
          actor(0, 720, 1030, 0.9, 'turn', 'joy', { gaze: { x: 2, y: 0 } }),
          actor(18, 730, 1030, 0.9, 'stand', 'joy', { gaze: { x: 3, y: 0 } })
        ], 'ball'),
        track('vronsky', [
          actor(0, 1200, 1030, 0.95, 'walk', 'soft', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(18, 1110, 1030, 0.95, 'turn', 'tender', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'uniform'),
        track('society', [
          actor(0, 1460, 1040, 0.68, 'stand', 'neutral', { opacity: 0.38 }),
          actor(18, 1470, 1040, 0.68, 'turn', 'neutral', { opacity: 0.38 })
        ], 'b')
      ],
      { effects: [{ type: 'motes', intensity: 0.5 }], sfx: [sfx(2, 'steps', 0.3), sfx(4, 'crowd', 0.3)] }
    ),
    shot(
      's03-waltz',
      36,
      22,
      'ballroom',
      [cam(0, 960, 540, 1.12), cam(22, 960, 560, 1.2)],
      [
        track('anna', [
          actor(0, 880, 1030, 0.95, 'embrace', 'desire', { gaze: { x: 2, y: 0 } }),
          actor(22, 890, 1030, 0.95, 'turn', 'desire', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1040, 1030, 0.95, 'embrace', 'desire', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(22, 1030, 1030, 0.95, 'turn', 'tender', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'uniform'),
        track('kitty', [
          actor(0, 680, 1030, 0.9, 'stand', 'wonder', { gaze: { x: 2, y: 0 } }),
          actor(22, 690, 1030, 0.9, 'turn', 'grief', { gaze: { x: 2, y: 0 } })
        ], 'ball'),
        track('society', [
          actor(0, 500, 1040, 0.68, 'stand', 'neutral', { opacity: 0.35 }),
          actor(22, 510, 1040, 0.68, 'turn', 'neutral', { opacity: 0.35 })
        ], 'a'),
        track('society', [
          actor(0, 1400, 1040, 0.68, 'stand', 'neutral', { opacity: 0.35 }),
          actor(22, 1390, 1040, 0.68, 'turn', 'neutral', { opacity: 0.35 })
        ], 'c')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.5 }],
        sfx: [sfx(2, 'applause', 0.25), sfx(8, 'glass', 0.2)]
      }
    ),
    shot(
      's03-close-two',
      58,
      20,
      'ballroom',
      [cam(0, 960, 400, 1.55), cam(20, 960, 390, 1.68)],
      [
        track('anna', [
          actor(0, 900, 1120, 1.2, 'embrace', 'desire', { gaze: { x: 2, y: 0 } }),
          actor(20, 905, 1115, 1.2, 'turn', 'desire', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1500, 1180, 1.35, 'stand', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.85, blur: 1.2 }),
          actor(20, 1490, 1175, 1.35, 'turn', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.82, blur: 1.2 })
        ], 'uniform', { back: true })
      ],
      { effects: [{ type: 'motes', intensity: 0.3 }] }
    ),
    shot(
      's03-kitty-reaction',
      78,
      18,
      'ballroom',
      [cam(0, 960, 430, 1.6), cam(18, 960, 420, 1.72)],
      [
        track('kitty', [
          actor(0, 960, 1120, 1.35, 'stand', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(18, 960, 1120, 1.36, 'turn', 'grief', { gaze: { x: -2, y: 0 } })
        ], 'ball'),
        track('society', [
          actor(0, 600, 1100, 0.78, 'stand', 'neutral', { opacity: 0.2 }),
          actor(18, 610, 1100, 0.78, 'turn', 'neutral', { opacity: 0.2 })
        ], 'b'),
        track('society', [
          actor(0, 1300, 1100, 0.78, 'stand', 'neutral', { opacity: 0.2 }),
          actor(18, 1290, 1100, 0.78, 'turn', 'neutral', { opacity: 0.2 })
        ], 'c')
      ],
      { effects: [{ type: 'motes', intensity: 0.2 }] }
    ),
    shot(
      's03-mirror',
      96,
      14,
      'ballroom',
      [cam(0, 960, 380, 1.45), cam(14, 960, 370, 1.55)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.3, 'turn', 'shame', { gaze: { x: -1, y: 0 } }),
          actor(14, 960, 1120, 1.32, 'stand', 'grief', { gaze: { x: -1, y: 0 } })
        ], 'gown')
      ],
      { effects: [{ type: 'motes', intensity: 0.2 }] }
    ),
    shot(
      's03-empty',
      110,
      10,
      'ballroom',
      [cam(0, 960, 540, 1.18), cam(10, 960, 560, 1.08)],
      [
        track('society', [
          actor(0, 600, 1030, 0.7, 'stand', 'neutral', { opacity: 0.2 }),
          actor(10, 570, 1030, 0.7, 'turn', 'neutral', { opacity: 0.18 })
        ], 'a'),
        track('society', [
          actor(0, 1320, 1030, 0.7, 'stand', 'neutral', { opacity: 0.2 }),
          actor(10, 1350, 1030, 0.7, 'turn', 'neutral', { opacity: 0.18 })
        ], 'b')
      ],
      { effects: [{ type: 'motes', intensity: 0.15 }] }
    )
  ],
  subtitles: [
    line('s03-k1', 22, 29, 'KITTY', 'Ti ho aspettato.'),
    line('s03-v1', 30, 36, 'VRONSKIJ', 'Mi dispiace.'),
    line('s03-a1', 60, 68, 'ANNA', 'Non avrei dovuto venire.'),
    line('s03-v2', 69, 77, 'VRONSKIJ', 'Sei qui.'),
    line(
      's03-n1',
      80,
      88,
      'NARRAZIONE',
      'La felicità di Kitty si spezzò senza rumore, come un cristallo sotto la neve.',
      'narration'
    ),
    line('s03-n2', 98, 106, 'NARRAZIONE', 'Il valzer continuò. Il mondo, no.', 'narration')
  ]
};
