import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene11: SceneDef = {
  id: 's11',
  index: 10,
  title: "L'ultima stazione",
  duration: 150,
  palette: 'iron',
  environment: 'station',
  music: { id: 'last-station', root: 38, mode: 'minor', tempo: 58, intensity: 0.55, darkness: 0.9 },
  ambience: ['wind', 'train'],
  transition: 'black',
  musicStopAt: 124,
  shots: [
    shot(
      's11-arrival',
      0,
      20,
      'station',
      [cam(0, 960, 540, 1.02), cam(20, 960, 560, 1.12)],
      [
        track('anna', [
          actor(0, 800, 1020, 0.9, 'walk', 'grief', { gaze: { x: 1, y: 0 } }),
          actor(20, 830, 1020, 0.9, 'turn', 'grief', { gaze: { x: 2, y: 0 } })
        ], 'winter')
      ],
      {
        effects: [{ type: 'snow', intensity: 0.8 }, { type: 'steam', intensity: 0.5 }],
        sfx: [sfx(0, 'train', 0.7), sfx(2, 'steps', 0.35), sfx(6, 'whistle', 0.3)]
      }
    ),
    shot(
      's11-crowd',
      20,
      20,
      'station',
      [cam(0, 700, 540, 1.12), cam(20, 1100, 540, 1.12)],
      [
        track('anna', [
          actor(0, 900, 1020, 0.9, 'walk', 'fear', { gaze: { x: 1, y: 0 } }),
          actor(20, 930, 1020, 0.9, 'turn', 'grief', { gaze: { x: 2, y: 0 } })
        ], 'winter'),
        track('society', [
          actor(0, 500, 1030, 0.68, 'stand', 'neutral', { opacity: 0.35 }),
          actor(20, 470, 1030, 0.68, 'turn', 'neutral', { opacity: 0.3 })
        ], 'a'),
        track('society', [
          actor(0, 1300, 1030, 0.68, 'stand', 'neutral', { opacity: 0.35 }),
          actor(20, 1330, 1030, 0.68, 'turn', 'neutral', { opacity: 0.3 })
        ], 'c')
      ],
      {
        effects: [{ type: 'snow', intensity: 0.6 }, { type: 'steam', intensity: 0.4 }],
        sfx: [sfx(2, 'crowd', 0.4), sfx(4, 'clock', 0.25)]
      }
    ),
    shot(
      's11-clock',
      40,
      20,
      'station',
      [cam(0, 960, 450, 1.3), cam(20, 960, 430, 1.4)],
      [
        track('anna', [
          actor(0, 1000, 1120, 1.15, 'stand', 'grief', { gaze: { x: -2, y: 0 } }),
          actor(20, 1000, 1120, 1.16, 'turn', 'fear', { gaze: { x: -3, y: 0 } })
        ], 'winter')
      ],
      { effects: [{ type: 'snow', intensity: 0.4 }], sfx: [sfx(1, 'clock', 0.4), sfx(2, 'wind', 0.25)] }
    ),
    shot(
      's11-memory-ball',
      60,
      8,
      'ballroom',
      [cam(0, 960, 380, 1.6), cam(8, 960, 370, 1.7)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.3, 'embrace', 'desire', { gaze: { x: 1, y: 0 } }),
          actor(8, 960, 1120, 1.3, 'turn', 'joy', { gaze: { x: 2, y: 0 } })
        ], 'gown'),
        track('vronsky', [
          actor(0, 1080, 1120, 1.3, 'embrace', 'tender', { gaze: { x: -1, y: 0 }, flip: true }),
          actor(8, 1080, 1120, 1.3, 'turn', 'joy', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'motes', intensity: 0.2 }], sfx: [sfx(1, 'glass', 0.2)] }
    ),
    shot(
      's11-memory-train',
      68,
      8,
      'train',
      [cam(0, 960, 400, 1.55), cam(8, 960, 390, 1.65)],
      [
        track('anna', [
          actor(0, 860, 1120, 1.2, 'stand', 'desire', { gaze: { x: 1, y: 0 } }),
          actor(8, 860, 1120, 1.2, 'turn', 'joy', { gaze: { x: 2, y: 0 } })
        ], 'travel'),
        track('vronsky', [
          actor(0, 1080, 1120, 1.2, 'reach', 'tender', { gaze: { x: -1, y: 0 }, flip: true }),
          actor(8, 1080, 1120, 1.2, 'stand', 'tender', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'uniform')
      ],
      { effects: [{ type: 'snow', intensity: 0.2 }], sfx: [sfx(1, 'train', 0.5)] }
    ),
    shot(
      's11-memory-child',
      76,
      8,
      'palace',
      [cam(0, 960, 500, 1.18), cam(8, 960, 490, 1.26)],
      [
        track('anna', [
          actor(0, 900, 1100, 1.1, 'clasp', 'tender', { gaze: { x: 2, y: 0 } }),
          actor(8, 900, 1100, 1.1, 'stand', 'joy', { gaze: { x: 3, y: 0 } })
        ], 'night'),
        track('seryozha', [
          actor(0, 1080, 1080, 0.7, 'stand', 'joy', { gaze: { x: -1, y: 0 }, flip: true }),
          actor(8, 1080, 1080, 0.7, 'turn', 'joy', { gaze: { x: -2, y: 0 }, flip: true })
        ], 'night')
      ],
      { effects: [{ type: 'embers', intensity: 0.1 }], sfx: [sfx(1, 'baby', 0.25)] }
    ),
    shot(
      's11-rails',
      84,
      20,
      'station',
      [cam(0, 960, 500, 1.15), cam(20, 960, 520, 1.25)],
      [
        track('anna', [
          actor(0, 900, 1020, 0.9, 'walk', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(20, 920, 1020, 0.9, 'turn', 'fear', { gaze: { x: -2, y: 0 } })
        ], 'winter')
      ],
      {
        effects: [{ type: 'snow', intensity: 0.7 }, { type: 'steam', intensity: 0.5 }],
        sfx: [sfx(1, 'train', 0.7), sfx(3, 'whistle', 0.4)]
      }
    ),
    shot(
      's11-face',
      104,
      20,
      'station',
      [cam(0, 960, 400, 1.6), cam(20, 960, 380, 1.8)],
      [
        track('anna', [
          actor(0, 960, 1140, 1.35, 'stand', 'grief', { gaze: { x: -1, y: 0 } }),
          actor(20, 960, 1140, 1.37, 'cover', 'fear', { gaze: { x: -2, y: 0 } })
        ], 'winter')
      ],
      { effects: [{ type: 'snow', intensity: 0.3 }], sfx: [sfx(2, 'clock', 0.25)] }
    ),
    shot(
      's11-light',
      124,
      14,
      'station',
      [cam(0, 960, 420, 1.4), cam(14, 960, 400, 1.55)],
      [
        track('anna', [
          actor(0, 960, 1120, 1.2, 'turn', 'fear', { gaze: { x: -1, y: 0 } }),
          actor(14, 960, 1120, 1.22, 'cover', 'grief', { gaze: { x: -2, y: 0 } })
        ], 'winter')
      ],
      { effects: [{ type: 'snow', intensity: 0.2 }], sfx: [sfx(1, 'train', 0.8), sfx(2, 'whistle', 0.4)] }
    ),
    shot(
      's11-aftermath',
      138,
      12,
      'station',
      [cam(0, 960, 540, 1.05), cam(12, 960, 560, 1.1)],
      [],
      { effects: [{ type: 'snow', intensity: 0.25 }], sfx: [sfx(1, 'wind', 0.6), sfx(2, 'clock', 0.2)] }
    )
  ],
  subtitles: [
    line(
      's11-n1',
      2,
      10,
      'NARRAZIONE',
      "La stazione era l'unico luogo in cui Anna non doveva spiegare perché stava andando via.",
      'narration'
    ),
    line(
      's11-a1',
      42,
      50,
      'ANNA',
      'Forse il silenzio non è la fine. Forse è l\'unico posto dove non devo spiegarmi.'
    ),
    line('s11-a2', 106, 116, 'ANNA', 'Forse ho solo bisogno che il rumore finisca.'),
    line(
      's11-n2',
      118,
      126,
      'NARRAZIONE',
      'Non cercava la morte. Cercava un luogo dove il rumore finisse.',
      'narration'
    ),
    line('s11-n3', 140, 148, 'NARRAZIONE', 'La neve continuò a cadere.', 'narration')
  ]
};
