import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene07: SceneDef = {
  id: 's07',
  index: 6,
  title: 'Il perdono',
  duration: 120,
  palette: 'candle',
  environment: 'bedroom',
  music: { id: 'forgiveness', root: 44, mode: 'minor', tempo: 50, intensity: 0.32, darkness: 0.35 },
  ambience: ['fire', 'wind', 'clock'],
  transition: 'fade',
  shots: [
    shot(
      's07-fever',
      0,
      22,
      'bedroom',
      [cam(0, 960, 540, 1.02), cam(22, 960, 560, 1.1)],
      [
        track('anna', [
          actor(0, 960, 1080, 0.95, 'turn', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(22, 960, 1080, 0.96, 'cover', 'fear', { gaze: { x: -2, y: 0 } })
        ], 'night'),
        track('karenin', [
          actor(0, 1250, 1020, 0.9, 'stand', 'cold', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(22, 1240, 1020, 0.9, 'turn', 'grief', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'frock')
      ],
      {
        effects: [{ type: 'embers', intensity: 0.2 }],
        sfx: [sfx(1, 'heartbeat', 0.45), sfx(2, 'fire', 0.25)]
      }
    ),
    shot(
      's07-threshold',
      22,
      20,
      'bedroom',
      [cam(0, 940, 470, 1.35), cam(20, 910, 455, 1.46)],
      [
        track('anna', [
          actor(0, 760, 1080, 0.98, 'turn', 'fear', { gaze: { x: 3, y: 0 } }),
          actor(20, 770, 1075, 0.98, 'stand', 'grief', { gaze: { x: 3, y: 0 } })
        ], 'night'),
        track('karenin', [
          actor(0, 1490, 1120, 1.3, 'stand', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.9, blur: 1.4 }),
          actor(20, 1480, 1115, 1.3, 'turn', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.88, blur: 1.4 })
        ], 'frock', { back: true })
      ],
      { effects: [{ type: 'embers', intensity: 0.15 }], sfx: [sfx(2, 'fire', 0.2)] }
    ),
    shot(
      's07-shadow',
      42,
      20,
      'bedroom',
      [cam(0, 960, 480, 1.2), cam(20, 960, 470, 1.3)],
      [
        track('anna', [
          actor(0, 780, 1080, 0.95, 'stand', 'shame', { gaze: { x: 2, y: 0 } }),
          actor(20, 790, 1080, 0.95, 'turn', 'fear', { gaze: { x: 3, y: 0 } })
        ], 'night'),
        track('karenin', [
          actor(0, 1020, 1020, 0.95, 'stand', 'cold', { gaze: { x: -1, y: 0 }, flip: true }),
          actor(20, 1010, 1020, 0.95, 'turn', 'grief', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'frock'),
        track('vronsky', [
          actor(0, 1260, 1020, 0.9, 'stand', 'shame', { gaze: { x: -1, y: 0 }, opacity: 0.65, flip: true }),
          actor(20, 1270, 1020, 0.9, 'turn', 'grief', { gaze: { x: -1, y: 0 }, opacity: 0.5, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'embers', intensity: 0.1 }] }
    ),
    shot(
      's07-hand',
      62,
      20,
      'bedroom',
      [cam(0, 960, 430, 1.5), cam(20, 960, 420, 1.62)],
      [
        track('anna', [
          actor(0, 850, 1100, 1.15, 'reach', 'tender', { gaze: { x: 2, y: 0 } }),
          actor(20, 855, 1100, 1.15, 'clasp', 'tender', { gaze: { x: 3, y: 0 } })
        ], 'night'),
        track('karenin', [
          actor(0, 1080, 1100, 1.15, 'reach', 'grief', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(20, 1075, 1100, 1.15, 'clasp', 'grief', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'frock')
      ],
      { effects: [{ type: 'embers', intensity: 0.15 }], sfx: [sfx(2, 'heartbeat', 0.35)] }
    ),
    shot(
      's07-baby',
      82,
      20,
      'bedroom',
      [cam(0, 960, 500, 1.2), cam(20, 960, 490, 1.3)],
      [
        track('anna', [
          actor(0, 820, 1080, 0.95, 'clasp', 'tender', { gaze: { x: 1, y: 0 } }),
          actor(20, 830, 1080, 0.95, 'turn', 'grief', { gaze: { x: 2, y: 0 } })
        ], 'night'),
        track('karenin', [
          actor(0, 1120, 1020, 0.95, 'stand', 'grief', { gaze: { x: -1, y: 0 }, flip: true }),
          actor(20, 1110, 1020, 0.95, 'turn', 'cold', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'frock')
      ],
      { effects: [{ type: 'embers', intensity: 0.1 }], sfx: [sfx(1, 'baby', 0.3), sfx(2, 'fire', 0.2)] }
    ),
    shot(
      's07-face',
      102,
      18,
      'bedroom',
      [cam(0, 960, 400, 1.55), cam(18, 960, 390, 1.7)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.25, 'turn', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(18, 960, 1120, 1.27, 'cover', 'tender', { gaze: { x: -2, y: 0 } })
        ], 'night')
      ],
      { effects: [{ type: 'embers', intensity: 0.1 }], sfx: [sfx(2, 'wind', 0.25)] }
    )
  ],
  subtitles: [
    line('s07-k0', 3, 10, 'KARENIN', "Il medico dice che è febbre. Io dico che è una verità."),
    line('s07-a0', 12, 19, 'ANNA', "Seryozha..."),
    line('s07-k1', 24, 32, 'KARENIN', 'Ti ho odiata. Eppure non posso desiderare la tua morte.'),
    line('s07-a1', 33, 41, 'ANNA', 'Se potessi tornare indietro...'),
    line('s07-a3', 43, 50, 'ANNA', "Perché mi curi?"),
    line('s07-k3', 52, 60, 'KARENIN', "Perché non so odiarti abbastanza."),
    line(
      's07-k2',
      64,
      72,
      'KARENIN',
      'Non ti perdono perché sono buono. Ti perdono perché non so fare altrimenti.'
    ),
    line('s07-a2', 73, 81, 'ANNA', 'Allora siamo entrambi prigionieri.'),
    line('s07-t1', 84, 92, 'KARENIN', "Il perdono mi sembrò una stanza vuota. Ci entrai comunque.", 'thought'),
    line(
      's07-n1',
      104,
      114,
      'NARRAZIONE',
      'Per un istante, il perdono sembrò una stanza in cui tutti potevano stare.',
      'narration'
    )
  ]
};
