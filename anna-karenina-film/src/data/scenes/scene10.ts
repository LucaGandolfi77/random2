import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene10: SceneDef = {
  id: 's10',
  index: 9,
  title: 'La vita che resta',
  duration: 120,
  palette: 'green',
  environment: 'country',
  music: { id: 'slow-happiness', root: 53, mode: 'major', tempo: 72, intensity: 0.35, darkness: 0.1 },
  ambience: ['birds', 'insects'],
  transition: 'fade',
  shots: [
    shot(
      's10-field',
      0,
      22,
      'country',
      [cam(0, 960, 540, 1.02), cam(22, 960, 560, 1.12)],
      [
        track('levin', [
          actor(0, 900, 1020, 0.95, 'walk', 'soft', { gaze: { x: 1, y: 0 } }),
          actor(22, 930, 1020, 0.95, 'stand', 'soft', { gaze: { x: 2, y: 0 } })
        ], 'country')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.3 }],
        sfx: [sfx(1, 'birds', 0.4), sfx(2, 'wind', 0.2)]
      }
    ),
    shot(
      's10-arrival',
      22,
      20,
      'country',
      [cam(0, 960, 520, 1.1), cam(20, 960, 500, 1.2)],
      [
        track('levin', [
          actor(0, 760, 1020, 0.9, 'turn', 'joy', { gaze: { x: 2, y: 0 } }),
          actor(20, 770, 1020, 0.9, 'walk', 'joy', { gaze: { x: 3, y: 0 } })
        ], 'country'),
        track('kitty', [
          actor(0, 1180, 1020, 0.9, 'walk', 'wonder', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(20, 1120, 1020, 0.9, 'stand', 'joy', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'country')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.25 }],
        sfx: [sfx(2, 'steps', 0.3), sfx(3, 'birds', 0.3)]
      }
    ),
    shot(
      's10-work',
      42,
      22,
      'country',
      [cam(0, 960, 540, 1.08), cam(22, 960, 550, 1.15)],
      [
        track('kitty', [
          actor(0, 800, 1020, 0.9, 'reach', 'joy', { gaze: { x: 2, y: 0 } }),
          actor(22, 810, 1020, 0.9, 'stand', 'tender', { gaze: { x: 3, y: 0 } })
        ], 'country'),
        track('levin', [
          actor(0, 1100, 1020, 0.9, 'reach', 'joy', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(22, 1090, 1020, 0.9, 'stand', 'tender', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'country')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.2 }],
        sfx: [sfx(1, 'insects', 0.25), sfx(3, 'birds', 0.2)]
      }
    ),
    shot(
      's10-table',
      64,
      20,
      'izba',
      [cam(0, 960, 500, 1.18), cam(20, 960, 510, 1.25)],
      [
        track('kitty', [
          actor(0, 780, 1020, 0.9, 'stand', 'tender', { gaze: { x: 2, y: 0 } }),
          actor(20, 790, 1020, 0.9, 'turn', 'joy', { gaze: { x: 3, y: 0 } })
        ], 'country'),
        track('levin', [
          actor(0, 1120, 1020, 0.9, 'stand', 'joy', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(20, 1110, 1020, 0.9, 'turn', 'tender', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'country')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.15 }],
        sfx: [sfx(1, 'samovar', 0.25), sfx(3, 'glass', 0.2)]
      }
    ),
    shot(
      's10-window',
      84,
      20,
      'izba',
      [cam(0, 960, 430, 1.4), cam(20, 960, 420, 1.5)],
      [
        track('kitty', [
          actor(0, 850, 1120, 1.15, 'turn', 'tender', { gaze: { x: 2, y: 0 } }),
          actor(20, 860, 1120, 1.15, 'stand', 'joy', { gaze: { x: 3, y: 0 } })
        ], 'country'),
        track('levin', [
          actor(0, 1080, 1120, 1.15, 'reach', 'tender', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(20, 1070, 1120, 1.15, 'stand', 'tender', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'country')
      ],
      { effects: [{ type: 'motes', intensity: 0.1 }], sfx: [sfx(2, 'fire', 0.2)] }
    ),
    shot(
      's10-dawn',
      104,
      16,
      'country',
      [cam(0, 960, 540, 1.05), cam(16, 960, 560, 1.12)],
      [
        track('kitty', [
          actor(0, 800, 1020, 0.9, 'embrace', 'joy', { gaze: { x: 2, y: 0 } }),
          actor(16, 810, 1020, 0.9, 'stand', 'tender', { gaze: { x: 3, y: 0 } })
        ], 'country'),
        track('levin', [
          actor(0, 1120, 1020, 0.9, 'embrace', 'tender', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(16, 1110, 1020, 0.9, 'stand', 'joy', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'country')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.3 }],
        sfx: [sfx(1, 'birds', 0.3), sfx(2, 'wind', 0.2)]
      }
    )
  ],
  subtitles: [
    line('s10-l0', 4, 12, 'LEVIN', "La terra non ha fretta."),
    line('s10-k0', 23, 30, 'KITTY', "Noi ne abbiamo avuta troppa."),
    line('s10-t1', 40, 45.5, 'LEVIN', "In campagna il tempo non guariva le ferite. Insegnava a portarle.", 'thought'),
    line('s10-k1', 46, 54, 'KITTY', 'Non volevo una vita straordinaria. Volevo una vita che restasse.'),
    line('s10-l1', 55, 63, 'LEVIN', 'La terra non mente. Ti dà ciò che le dai.'),
    line('s10-k3', 64, 72, 'KITTY', "Anna mi ha scritto."),
    line('s10-l3', 73, 80, 'LEVIN', "Cosa dice?"),
    line('s10-k4', 81, 85.5, 'KITTY', "Che è felice. Non le ho creduto."),
    line('s10-l2', 86, 94, 'LEVIN', 'Il lavoro, la terra, tu. Non so se è poco o molto. So che è vero.'),
    line('s10-k2', 95, 103, 'KITTY', 'Allora basta.'),
    line(
      's10-n1',
      106,
      114,
      'NARRAZIONE',
      "Nello stesso tempo, in un altro punto della Russia, due persone imparavano una felicità più lenta.",
      'narration'
    )
  ]
};
