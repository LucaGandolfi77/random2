import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene05: SceneDef = {
  id: 's05',
  index: 4,
  title: 'La stanza segreta',
  duration: 150,
  palette: 'bordeaux',
  environment: 'apartment',
  music: { id: 'secret-room', root: 46, mode: 'minor', tempo: 64, intensity: 0.55, darkness: 0.5 },
  ambience: ['fire', 'wind'],
  transition: 'fade',
  shots: [
    shot(
      's05-entry',
      0,
      22,
      'apartment',
      [cam(0, 940, 460, 1.3), cam(22, 900, 440, 1.42)],
      [
        track('anna', [
          actor(0, 780, 1060, 1.0, 'turn', 'desire', { gaze: { x: 3, y: 0 } }),
          actor(22, 790, 1055, 1.0, 'stand', 'desire', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1500, 1120, 1.3, 'stand', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.92, blur: 1.45 }),
          actor(22, 1490, 1115, 1.3, 'turn', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.9, blur: 1.45 })
        ], 'uniform', { back: true })
      ],
      {
        effects: [{ type: 'motes', intensity: 0.4 }, { type: 'embers', intensity: 0.2 }],
        sfx: [sfx(1, 'door', 0.35), sfx(2, 'fire', 0.3)]
      }
    ),
    shot(
      's05-hands',
      22,
      22,
      'apartment',
      [cam(0, 980, 440, 1.65), cam(22, 960, 420, 1.8)],
      [
        track('anna', [
          actor(0, 620, 1180, 1.5, 'stand', 'neutral', { gaze: { x: 2, y: 0 }, opacity: 0.88, blur: 0.8 }),
          actor(22, 625, 1175, 1.5, 'turn', 'neutral', { gaze: { x: 2, y: 0 }, opacity: 0.86, blur: 0.8 })
        ], 'gown', { back: true }),
        track('vronsky', [
          actor(0, 1060, 1120, 1.25, 'reach', 'tender', { gaze: { x: -3, y: 0 }, flip: true }),
          actor(22, 1055, 1115, 1.25, 'embrace', 'desire', { gaze: { x: -4, y: 0 }, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'embers', intensity: 0.3 }], sfx: [sfx(3, 'fire', 0.25)] }
    ),
    shot(
      's05-dance',
      44,
      22,
      'apartment',
      [cam(0, 960, 520, 1.2), cam(22, 960, 500, 1.28)],
      [
        track('anna', [
          actor(0, 900, 1060, 1.0, 'embrace', 'joy', { gaze: { x: 2, y: 0 } }),
          actor(22, 910, 1055, 1.0, 'turn', 'joy', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1040, 1060, 1.0, 'embrace', 'tender', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(22, 1030, 1055, 1.0, 'turn', 'joy', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'motes', intensity: 0.3 }, { type: 'embers', intensity: 0.15 }] }
    ),
    shot(
      's05-reflection',
      66,
      24,
      'apartment',
      [cam(0, 960, 420, 1.55), cam(24, 960, 400, 1.7)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.25, 'turn', 'fear', { gaze: { x: -2, y: 0 } }),
          actor(24, 960, 1115, 1.27, 'stand', 'fear', { gaze: { x: -3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1210, 1100, 1.1, 'stand', 'tender', { gaze: { x: -1, y: 0 }, opacity: 0.62, blur: 0.7, flip: true }),
          actor(24, 1220, 1095, 1.1, 'turn', 'grief', { gaze: { x: -1, y: 0 }, opacity: 0.52, blur: 0.7, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'snow', intensity: 0.2 }], sfx: [sfx(2, 'wind', 0.3)] }
    ),
    shot(
      's05-intimacy',
      90,
      24,
      'apartment',
      [cam(0, 960, 440, 1.55), cam(24, 940, 430, 1.68)],
      [
        track('anna', [
          actor(0, 870, 1120, 1.2, 'embrace', 'desire', { gaze: { x: 2, y: 0 } }),
          actor(24, 875, 1115, 1.2, 'stand', 'tender', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1480, 1150, 1.35, 'stand', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.85, blur: 1.15 }),
          actor(24, 1470, 1145, 1.35, 'turn', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.82, blur: 1.15 })
        ], 'uniform', { back: true })
      ],
      { effects: [{ type: 'embers', intensity: 0.2 }] }
    ),
    shot(
      's05-guilt',
      114,
      20,
      'apartment',
      [cam(0, 960, 400, 1.6), cam(20, 960, 390, 1.72)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.25, 'cover', 'shame', { gaze: { x: -1, y: 0 } }),
          actor(20, 960, 1115, 1.27, 'turn', 'grief', { gaze: { x: -2, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1220, 1120, 1.1, 'stand', 'grief', { gaze: { x: -1, y: 0 }, opacity: 0.45, blur: 0.8, flip: true }),
          actor(20, 1230, 1115, 1.1, 'turn', 'cold', { gaze: { x: -1, y: 0 }, opacity: 0.3, blur: 0.8, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'embers', intensity: 0.15 }], sfx: [sfx(2, 'fire', 0.2)] }
    ),
    shot(
      's05-departure',
      134,
      16,
      'apartment',
      [cam(0, 960, 500, 1.2), cam(16, 960, 540, 1.05)],
      [
        track('anna', [
          actor(0, 820, 1060, 1.0, 'stand', 'grief', { gaze: { x: 2, y: 0 } }),
          actor(16, 810, 1055, 1.0, 'turn', 'cold', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1250, 1060, 1.0, 'turn', 'cold', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(16, 1260, 1055, 1.0, 'stand', 'grief', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'snow', intensity: 0.15 }], sfx: [sfx(3, 'door', 0.3), sfx(2, 'wind', 0.3)] }
    )
  ],
  subtitles: [
    line('s05-a1', 46, 54, 'ANNA', 'Con te non ho paura di essere felice.'),
    line('s05-v1', 55, 63, 'VRONSKIJ', 'Allora non chiudere gli occhi.'),
    line('s05-a2', 64, 72, 'ANNA', 'Li chiudo per non vedere quanto durerà.'),
    line('s05-a3', 92, 100, 'ANNA', 'Se questa è colpa, voglio sapere di cosa sono colpevole.'),
    line('s05-v2', 101, 109, 'VRONSKIJ', 'Di essere viva.'),
    line(
      's05-n1',
      116,
      126,
      'NARRAZIONE',
      "Amare Vronskij era l'unica cosa che le sembrasse vera. Per questo era imperdonabile.",
      'narration'
    ),
    line('s05-a4', 136, 142, 'ANNA', 'Domani?'),
    line('s05-v3', 143, 149, 'VRONSKIJ', 'Domani.')
  ]
};
