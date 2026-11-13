import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene12: SceneDef = {
  id: 's12',
  index: 11,
  title: 'Dopo la neve',
  duration: 120,
  palette: 'black',
  environment: 'tracks',
  music: { id: 'after-snow', root: 45, mode: 'dorian', tempo: 52, intensity: 0.28, darkness: 0.3 },
  ambience: ['wind', 'birds'],
  transition: 'black',
  shots: [
    shot(
      's12-platform',
      0,
      22,
      'station',
      [cam(0, 960, 540, 1.02), cam(22, 960, 560, 1.1)],
      [],
      {
        effects: [{ type: 'snow', intensity: 0.7 }, { type: 'steam', intensity: 0.2 }],
        sfx: [sfx(1, 'wind', 0.35), sfx(3, 'clock', 0.25)]
      }
    ),
    shot(
      's12-glove',
      22,
      20,
      'tracks',
      [cam(0, 960, 620, 1.25), cam(20, 960, 600, 1.35)],
      [],
      {
        effects: [{ type: 'snow', intensity: 0.5 }],
        sfx: [sfx(1, 'wind', 0.35)],
        props: [{ id: 'redGlove', x: 960, y: 880, scale: 1.1 }]
      }
    ),
    shot(
      's12-train',
      42,
      22,
      'tracks',
      [cam(0, 960, 540, 1.05), cam(22, 960, 560, 1.15)],
      [],
      {
        effects: [{ type: 'snow', intensity: 0.5 }],
        sfx: [sfx(4, 'train', 0.6), sfx(5, 'whistle', 0.35)]
      }
    ),
    shot(
      's12-family',
      64,
      24,
      'country',
      [cam(0, 960, 540, 1.02), cam(24, 960, 560, 1.12)],
      [
        track('kitty', [
          actor(0, 800, 1020, 0.9, 'clasp', 'tender', { gaze: { x: 2, y: 0 } }),
          actor(24, 810, 1020, 0.9, 'turn', 'joy', { gaze: { x: 3, y: 0 } })
        ], 'country'),
        track('levin', [
          actor(0, 1140, 1020, 0.9, 'stand', 'joy', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(24, 1130, 1020, 0.9, 'turn', 'tender', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'country')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.3 }],
        sfx: [sfx(2, 'birds', 0.35), sfx(3, 'wind', 0.2)],
        props: [{ id: 'babyBundle', x: 800, y: 720, scale: 0.55 }]
      }
    ),
    shot(
      's12-horizon',
      88,
      20,
      'country',
      [cam(0, 960, 480, 1.2), cam(20, 960, 460, 1.32)],
      [
        track('kitty', [
          actor(0, 850, 1020, 0.9, 'turn', 'tender', { gaze: { x: 2, y: 0 } }),
          actor(20, 860, 1020, 0.9, 'stand', 'joy', { gaze: { x: 3, y: 0 } })
        ], 'country'),
        track('levin', [
          actor(0, 1100, 1020, 0.9, 'stand', 'tender', { gaze: { x: -1, y: 0 }, flip: true }),
          actor(20, 1110, 1020, 0.9, 'turn', 'wonder', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'country')
      ],
      { effects: [{ type: 'motes', intensity: 0.2 }], sfx: [sfx(1, 'birds', 0.25)] }
    ),
    shot(
      's12-tracks',
      108,
      12,
      'tracks',
      [cam(0, 960, 540, 1.05), cam(12, 960, 560, 1.12)],
      [],
      { effects: [{ type: 'snow', intensity: 0.4 }], sfx: [sfx(1, 'wind', 0.4), sfx(2, 'train', 0.3)] }
    )
  ],
  subtitles: [
    line('s12-n1', 4, 12, 'NARRAZIONE', 'La neve copre i binari. Non il rumore.', 'narration'),
    line('s12-t1', 14, 22, 'KITTY', "La neve copriva i binari. Sotto, la vita continuava a fare rumore.", 'thought'),
    line('s12-k0', 66, 74, 'KITTY', "Hai sentito?"),
    line('s12-l0', 75, 82, 'LEVIN', "Sì."),
    line('s12-k1b', 83, 89, 'KITTY', "Non è giusto."),
    line('s12-k1', 90, 98, 'KITTY', 'Perché?'),
    line('s12-l1', 99, 107, 'LEVIN', 'Non lo so. Ma è qui che dobbiamo vivere.'),
    line(
      's12-n2',
      110,
      118,
      'NARRAZIONE',
      'Resta la neve. Resta il rumore. Resta la domanda.',
      'narration'
    )
  ]
};
