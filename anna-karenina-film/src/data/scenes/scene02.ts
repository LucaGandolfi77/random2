import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene02: SceneDef = {
  id: 's02',
  index: 1,
  title: "L'incontro",
  duration: 120,
  palette: 'iron',
  environment: 'train',
  music: { id: 'train-encounter', root: 43, mode: 'minor', tempo: 62, intensity: 0.4, darkness: 0.5 },
  ambience: ['train', 'wind'],
  transition: 'fade',
  shots: [
    shot(
      's02-compartment',
      0,
      20,
      'train',
      [cam(0, 960, 520, 1.08), cam(20, 980, 500, 1.2)],
      [
        track('anna', [
          actor(0, 860, 1060, 1.0, 'stand', 'soft', { gaze: { x: -2, y: 0 } }),
          actor(20, 850, 1055, 1.02, 'turn', 'soft', { gaze: { x: -3, y: 0 } })
        ], 'travel')
      ],
      {
        effects: [{ type: 'snow', intensity: 0.22 }, { type: 'motes', intensity: 0.26 }],
        sfx: [sfx(0, 'train', 0.7), sfx(3, 'wind', 0.3)]
      }
    ),
    shot(
      's02-corridor',
      20,
      22,
      'train',
      [cam(0, 960, 520, 1.2), cam(22, 960, 500, 1.3)],
      [
        track('anna', [
          actor(0, 850, 1060, 1.0, 'walk', 'neutral', { gaze: { x: 2, y: 0 } }),
          actor(22, 870, 1055, 1.0, 'turn', 'soft', { gaze: { x: 3, y: 0 } })
        ], 'travel'),
        track('vronsky', [
          actor(0, 1100, 1060, 1.0, 'walk', 'soft', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(22, 1080, 1055, 1.0, 'turn', 'desire', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'uniform')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.24 }],
        sfx: [sfx(3, 'steps', 0.4), sfx(8, 'door', 0.3)]
      }
    ),
    shot(
      's02-two-shot',
      42,
      22,
      'train',
      [cam(0, 960, 460, 1.34), cam(22, 920, 440, 1.44)],
      [
        track('anna', [
          actor(0, 800, 1060, 0.98, 'turn', 'desire', { gaze: { x: 3, y: 0 } }),
          actor(22, 810, 1055, 0.98, 'stand', 'desire', { gaze: { x: 3, y: 0 } })
        ], 'travel'),
        track('vronsky', [
          actor(0, 1490, 1120, 1.25, 'stand', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.92, blur: 1.35 }),
          actor(22, 1480, 1115, 1.25, 'turn', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.9, blur: 1.35 })
        ], 'uniform', { back: true })
      ],
      { effects: [{ type: 'motes', intensity: 0.18 }] }
    ),
    shot(
      's02-reflection',
      64,
      20,
      'train',
      [cam(0, 980, 410, 1.64), cam(20, 960, 395, 1.78)],
      [
        track('anna', [
          actor(0, 640, 1180, 1.5, 'stand', 'neutral', { gaze: { x: 2, y: 0 }, opacity: 0.88, blur: 0.9 }),
          actor(20, 645, 1175, 1.5, 'turn', 'neutral', { gaze: { x: 2, y: 0 }, opacity: 0.86, blur: 0.9 })
        ], 'travel', { back: true }),
        track('vronsky', [
          actor(0, 1070, 1120, 1.25, 'reach', 'tender', { gaze: { x: -3, y: 0 }, flip: true }),
          actor(20, 1065, 1115, 1.25, 'stand', 'desire', { gaze: { x: -4, y: 0 }, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'motes', intensity: 0.16 }] }
    ),
    shot(
      's02-glove',
      84,
      18,
      'train',
      [cam(0, 960, 500, 1.58), cam(18, 1020, 500, 1.7)],
      [
        track('anna', [
          actor(0, 840, 1100, 1.2, 'stand', 'shame', { gaze: { x: 2, y: 0 } }),
          actor(18, 845, 1095, 1.2, 'turn', 'desire', { gaze: { x: 3, y: 0 } })
        ], 'travel'),
        track('vronsky', [
          actor(0, 1080, 1120, 1.25, 'reach', 'tender', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(18, 1070, 1115, 1.25, 'stand', 'tender', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'uniform')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.14 }],
        sfx: [sfx(2, 'glass', 0.2)]
      }
    ),
    shot(
      's02-platform',
      102,
      18,
      'station',
      [cam(0, 960, 470, 1.25), cam(18, 960, 540, 1.05)],
      [
        track('anna', [
          actor(0, 800, 1020, 0.95, 'walk', 'soft', { gaze: { x: 2, y: 0 } }),
          actor(18, 770, 1020, 0.95, 'turn', 'soft', { gaze: { x: 3, y: 0 } })
        ], 'winter'),
        track('vronsky', [
          actor(0, 1120, 1020, 0.95, 'stand', 'desire', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(18, 1150, 1020, 0.95, 'turn', 'tender', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'uniform')
      ],
      {
        effects: [{ type: 'snow', intensity: 0.8 }, { type: 'steam', intensity: 0.55 }],
        sfx: [sfx(0, 'train', 0.8), sfx(1, 'whistle', 0.55), sfx(4, 'steps', 0.35)]
      }
    )
  ],
  subtitles: [
    line('s02-a1', 45, 53, 'ANNA', 'Non guardarmi come se avessi già deciso per me.'),
    line('s02-v1', 54, 61, 'VRONSKIJ', 'E se fosse la prima cosa che vedo di te?'),
    line('s02-a2', 66, 74, 'ANNA', 'Non sai nulla di me.'),
    line('s02-v2', 75, 82, 'VRONSKIJ', 'Lo scoprirò.'),
    line('s02-a3', 87, 94, 'ANNA', 'Non è un gioco.'),
    line('s02-v3', 95, 102, 'VRONSKIJ', 'Lo so.'),
    line(
      's02-n1',
      106,
      114,
      'NARRAZIONE',
      "Non fu amore, all'inizio. Fu la sensazione di essere guardata.",
      'narration'
    ),
    line('s02-n2', 115, 119, 'NARRAZIONE', 'E di non poter più tornare invisibile.', 'narration')
  ]
};
