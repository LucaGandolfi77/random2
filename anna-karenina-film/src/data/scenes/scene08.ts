import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene08: SceneDef = {
  id: 's08',
  index: 7,
  title: 'La casa senza porte',
  duration: 150,
  palette: 'honey',
  environment: 'villa',
  music: { id: 'new-life', root: 50, mode: 'dorian', tempo: 60, intensity: 0.38, darkness: 0.35 },
  ambience: ['birds', 'wind'],
  transition: 'fade',
  shots: [
    shot(
      's08-villa',
      0,
      24,
      'villa',
      [cam(0, 960, 540, 1.02), cam(24, 960, 560, 1.12)],
      [
        track('anna', [
          actor(0, 780, 1020, 0.9, 'embrace', 'joy', { gaze: { x: 2, y: 0 } }),
          actor(24, 790, 1020, 0.9, 'turn', 'soft', { gaze: { x: 3, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1120, 1020, 0.9, 'embrace', 'tender', { gaze: { x: -2, y: 0 }, flip: true }),
          actor(24, 1110, 1020, 0.9, 'turn', 'joy', { gaze: { x: -3, y: 0 }, flip: true })
        ], 'civilian')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.5 }],
        sfx: [sfx(2, 'birds', 0.35), sfx(1, 'wind', 0.25)]
      }
    ),
    shot(
      's08-letter',
      24,
      21,
      'villa',
      [cam(0, 960, 440, 1.4), cam(21, 960, 420, 1.52)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.2, 'stand', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(21, 960, 1120, 1.22, 'cover', 'grief', { gaze: { x: -2, y: 0 } })
        ], 'gown')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.2 }],
        sfx: [sfx(2, 'paper', 0.4), sfx(4, 'wind', 0.2)]
      }
    ),
    shot(
      's08-packing',
      45,
      21,
      'villa',
      [cam(0, 960, 520, 1.15), cam(21, 960, 540, 1.08)],
      [
        track('anna', [
          actor(0, 960, 1020, 0.9, 'walk', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(21, 970, 1020, 0.9, 'turn', 'cold', { gaze: { x: -2, y: 0 } })
        ], 'travel')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.15 }],
        sfx: [sfx(2, 'steps', 0.3), sfx(4, 'paper', 0.25)],
        props: [{ id: 'suitcase', x: 960, y: 1080, scale: 0.8 }]
      }
    ),
    shot(
      's08-return',
      66,
      22,
      'train',
      [cam(0, 960, 540, 1.05), cam(22, 960, 560, 1.15)],
      [
        track('anna', [
          actor(0, 800, 1020, 0.9, 'stand', 'cold', { gaze: { x: -1, y: 0 } }),
          actor(22, 810, 1020, 0.9, 'turn', 'grief', { gaze: { x: -2, y: 0 } })
        ], 'winter'),
        track('vronsky', [
          actor(0, 1140, 1020, 0.9, 'stand', 'grief', { gaze: { x: 1, y: 0 }, flip: true }),
          actor(22, 1130, 1020, 0.9, 'turn', 'cold', { gaze: { x: 2, y: 0 }, flip: true })
        ], 'civilian')
      ],
      {
        effects: [{ type: 'snow', intensity: 0.5 }],
        sfx: [sfx(0, 'train', 0.7), sfx(2, 'wind', 0.3)]
      }
    ),
    shot(
      's08-door',
      88,
      22,
      'palace',
      [cam(0, 960, 540, 1.1), cam(22, 960, 560, 1.18)],
      [
        track('anna', [
          actor(0, 960, 1020, 0.9, 'stand', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(22, 960, 1020, 0.9, 'turn', 'cold', { gaze: { x: -2, y: 0 } })
        ], 'winter')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.15 }],
        sfx: [sfx(2, 'door', 0.45), sfx(4, 'clock', 0.3)],
        props: [{ id: 'closedDoor', x: 960, y: 1010, scale: 1.08, opacity: 0.96 }]
      }
    ),
    shot(
      's08-room',
      110,
      22,
      'palace',
      [cam(0, 960, 520, 1.2), cam(22, 960, 500, 1.3)],
      [
        track('anna', [
          actor(0, 900, 1080, 0.95, 'turn', 'grief', { gaze: { x: 2, y: 0 } }),
          actor(22, 910, 1080, 0.95, 'cover', 'grief', { gaze: { x: 3, y: 0 } })
        ], 'winter')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.1 }],
        sfx: [sfx(1, 'paper', 0.2), sfx(4, 'wind', 0.25)],
        props: [{ id: 'toyTrain', x: 1160, y: 1050, scale: 0.7 }]
      }
    ),
    shot(
      's08-alone',
      132,
      18,
      'palace',
      [cam(0, 960, 540, 1.12), cam(18, 960, 560, 1.02)],
      [
        track('anna', [
          actor(0, 960, 1020, 0.9, 'stand', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(18, 950, 1020, 0.9, 'turn', 'cold', { gaze: { x: -2, y: 0 } })
        ], 'winter')
      ],
      { effects: [{ type: 'snow', intensity: 0.2 }], sfx: [sfx(2, 'wind', 0.3)] }
    )
  ],
  subtitles: [
    line('s08-a1', 4, 12, 'ANNA', 'Ho scelto. Ma ogni mattina devo scegliere di nuovo.'),
    line('s08-v1', 13, 20, 'VRONSKIJ', 'Siamo liberi.'),
    line(
      's08-a2',
      21,
      31,
      'ANNA',
      'No. Libera è la parola che usano quelli che non hanno più niente da perdere.'
    ),
    line('s08-v0', 34, 42, 'VRONSKIJ', "Questa casa è nostra."),
    line('s08-a4', 44, 52, 'ANNA', "Nessuna casa è nostra se non possiamo invitare nessuno."),
    line('s08-a5', 54, 62, 'ANNA', "Ho scritto a Seryozha."),
    line('s08-v4', 64, 72, 'VRONSKIJ', "E ti ha risposto?"),
    line('s08-a6', 74, 82, 'ANNA', "La lettera è tornata chiusa."),
    line('s08-t1', 84, 89, 'ANNA', "Avevo lasciato una casa per costruirne un'altra. Avevo dimenticato le porte.", 'thought'),
    line(
      's08-n1',
      90,
      100,
      'NARRAZIONE',
      'La sua nuova vita era una casa senza porte.',
      'narration'
    ),
    line('s08-a7', 102, 110, 'ANNA', "Se ti chiedessi di rinunciare a tutto, lo faresti?"),
    line('s08-a3', 112, 120, 'ANNA', 'Non posso vederlo, vero?'),
    line('s08-a8', 122, 130, 'ANNA', "Voglio vedere mio figlio."),
    line('s08-v5', 131, 135, 'VRONSKIJ', "Non oggi."),
    line(
      's08-n2',
      136,
      146,
      'NARRAZIONE',
      "Aveva scelto l'amore. Scoprì che l'amore, da solo, non basta a costruire una casa.",
      'narration'
    )
  ]
};
