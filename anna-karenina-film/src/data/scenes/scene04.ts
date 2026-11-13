import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene04: SceneDef = {
  id: 's04',
  index: 3,
  title: "La casa dell'ordine",
  duration: 120,
  palette: 'ice',
  environment: 'palace',
  music: { id: 'cold-order', root: 48, mode: 'minor', tempo: 58, intensity: 0.32, darkness: 0.45 },
  ambience: ['bell', 'fire', 'wind'],
  transition: 'fade',
  shots: [
    shot(
      's04-church',
      0,
      20,
      'church',
      [cam(0, 960, 540, 1.02), cam(20, 960, 560, 1.12)],
      [
        track('anna', [
          actor(0, 800, 1020, 0.9, 'stand', 'soft', { gaze: { x: 2, y: 0 } }),
          actor(20, 810, 1020, 0.9, 'turn', 'grief', { gaze: { x: 2, y: 0 } })
        ], 'wedding'),
        track('karenin', [
          actor(0, 1120, 1020, 0.9, 'stand', 'cold', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(20, 1110, 1020, 0.9, 'turn', 'cold', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'frock')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.5 }, { type: 'embers', intensity: 0.2 }],
        sfx: [sfx(1, 'bell', 0.5), sfx(3, 'fire', 0.3)]
      }
    ),
    shot(
      's04-study',
      20,
      20,
      'palace',
      [cam(0, 1080, 540, 1.08), cam(20, 900, 520, 1.18)],
      [
        track('karenin', [
          actor(0, 980, 1020, 0.95, 'stand', 'cold', { gaze: { x: -1, y: 0 } }),
          actor(20, 960, 1020, 0.95, 'turn', 'grief', { gaze: { x: -1, y: 0 } })
        ], 'frock')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.2 }],
        sfx: [sfx(2, 'clock', 0.35), sfx(6, 'paper', 0.25)]
      }
    ),
    shot(
      's04-family',
      40,
      22,
      'palace',
      [cam(0, 960, 500, 1.15), cam(22, 960, 490, 1.22)],
      [
        track('anna', [
          actor(0, 760, 1020, 0.9, 'stand', 'soft', { gaze: { x: 2, y: 0 } }),
          actor(22, 765, 1020, 0.9, 'turn', 'soft', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('karenin', [
          actor(0, 1160, 1020, 0.9, 'stand', 'cold', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(22, 1150, 1020, 0.9, 'turn', 'neutral', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'frock'),
        track('seryozha', [
          actor(0, 960, 1080, 0.6, 'stand', 'joy', { gaze: { x: 1, y: 0 } }),
          actor(22, 980, 1080, 0.6, 'walk', 'joy', { gaze: { x: 2, y: 0 } })
        ], 'night')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.2 }],
        sfx: [sfx(4, 'glass', 0.2), sfx(9, 'paper', 0.2)]
      }
    ),
    shot(
      's04-window',
      62,
      20,
      'palace',
      [cam(0, 960, 400, 1.45), cam(20, 960, 390, 1.58)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.25, 'turn', 'grief', { gaze: { x: -2, y: 0 } }),
          actor(20, 960, 1120, 1.27, 'stand', 'grief', { gaze: { x: -3, y: 0 } })
        ], 'gown')
      ],
      { effects: [{ type: 'snow', intensity: 0.2 }], sfx: [sfx(1, 'wind', 0.3)] }
    ),
    shot(
      's04-clock',
      82,
      20,
      'palace',
      [cam(0, 940, 470, 1.3), cam(20, 910, 455, 1.4)],
      [
        track('anna', [
          actor(0, 780, 1060, 1.0, 'turn', 'grief', { gaze: { x: 3, y: 0 } }),
          actor(20, 790, 1055, 1.0, 'stand', 'anger', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('karenin', [
          actor(0, 1500, 1120, 1.28, 'stand', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.9, blur: 1.35 }),
          actor(20, 1490, 1115, 1.28, 'turn', 'neutral', { gaze: { x: -1, y: 0 }, opacity: 0.88, blur: 1.35 })
        ], 'frock', { back: true })
      ],
      {
        effects: [{ type: 'motes', intensity: 0.15 }],
        sfx: [sfx(1, 'clock', 0.4)]
      }
    ),
    shot(
      's04-alone',
      102,
      18,
      'palace',
      [cam(0, 960, 540, 1.1), cam(18, 960, 560, 1.02)],
      [
        track('anna', [
          actor(0, 800, 1020, 0.9, 'stand', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(18, 790, 1020, 0.9, 'turn', 'cold', { gaze: { x: -2, y: 0 } })
        ], 'gown')
      ],
      { effects: [{ type: 'snow', intensity: 0.15 }], sfx: [sfx(2, 'wind', 0.3)] }
    )
  ],
  subtitles: [
    line(
      's04-n1',
      3,
      11,
      'NARRAZIONE',
      "Il matrimonio era stato una promessa in una chiesa d'oro. Il resto, una vita di gesti misurati.",
      'narration'
    ),
    line('s04-k0', 14, 21, 'KARENIN', "Il dovere non è una catena, Anna. È una forma di cura."),
    line('s04-a0', 23, 29, 'ANNA', "La cura non dovrebbe chiedere permesso."),
    line('s04-s1', 31, 38, 'SERYOZHA', "Perché papà parla sempre di ciò che è giusto?"),
    line(
      's04-n2',
      42,
      50,
      'NARRAZIONE',
      'Aveva tutto ciò che una donna poteva desiderare. Era la frase che le ripetevano.',
      'narration'
    ),
    line('s04-t1', 52, 60, 'ANNA', "In questa casa ogni cosa aveva un posto. Anche il mio silenzio.", 'thought'),
    line('s04-k2', 64, 72, 'KARENIN', "Il silenzio non è una risposta."),
    line('s04-a2', 74, 82, 'ANNA', "Per me lo è."),
    line('s04-k1', 84, 92, 'KARENIN', 'La nostra vita è ordinata, Anna. È una forma di rispetto.'),
    line('s04-a1', 93, 101, 'ANNA', 'Per chi?'),
    line('s04-n3', 104, 112, 'NARRAZIONE', 'Anna guardò fuori. La neve non rispondeva.', 'narration')
  ]
};
