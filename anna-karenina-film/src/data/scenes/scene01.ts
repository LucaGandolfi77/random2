import { actor, cam, line, sfx, shot, track } from '../helpers';
import type { SceneDef } from '../types';

export const scene01: SceneDef = {
  id: 's01',
  index: 0,
  title: 'La neve e il ferro',
  duration: 90,
  palette: 'ice',
  environment: 'rail',
  music: { id: 'snow-rail', root: 45, mode: 'minor', tempo: 54, intensity: 0.34, darkness: 0.6 },
  ambience: ['wind', 'train'],
  transition: 'fade',
  shots: [
    shot(
      's01-rail-wide',
      0,
      20,
      'rail',
      [cam(0, 960, 540, 1.04), cam(20, 960, 570, 1.13)],
      [],
      {
        effects: [{ type: 'snow', intensity: 0.85 }],
        sfx: [sfx(0, 'wind', 0.5), sfx(11, 'whistle', 0.22)]
      }
    ),
    shot(
      's01-station',
      20,
      18,
      'station',
      [cam(0, 760, 530, 1.08), cam(18, 1080, 560, 1.15)],
      [
        track(
          'stationmaster',
          [actor(0, 1540, 1030, 0.8, 'stand', 'cold'), actor(18, 1510, 1030, 0.8, 'turn', 'cold')]
        ),
        track('society', [
          actor(0, 520, 1040, 0.68, 'stand', 'neutral', { opacity: 0.42 }),
          actor(18, 470, 1040, 0.68, 'walk', 'neutral', { opacity: 0.42 })
        ], 'b')
      ],
      {
        effects: [{ type: 'snow', intensity: 0.7 }, { type: 'steam', intensity: 0.55 }],
        sfx: [sfx(2, 'steam', 0.6), sfx(10, 'bell', 0.45)]
      }
    ),
    shot(
      's01-ballroom',
      38,
      18,
      'ballroom',
      [cam(0, 960, 540, 1.02), cam(18, 960, 570, 1.12)],
      [
        track('society', [
          actor(0, 500, 1030, 0.7, 'stand', 'neutral', { opacity: 0.5 }),
          actor(18, 490, 1030, 0.7, 'turn', 'neutral', { opacity: 0.5 })
        ], 'a'),
        track('society', [
          actor(0, 760, 1040, 0.66, 'stand', 'neutral', { opacity: 0.4 }),
          actor(18, 770, 1040, 0.66, 'turn', 'neutral', { opacity: 0.4 })
        ], 'b'),
        track('society', [
          actor(0, 1200, 1040, 0.7, 'stand', 'neutral', { opacity: 0.45 }),
          actor(18, 1180, 1040, 0.7, 'turn', 'neutral', { opacity: 0.45 })
        ], 'c'),
        track('society', [
          actor(0, 1460, 1030, 0.68, 'stand', 'neutral', { opacity: 0.4 }),
          actor(18, 1480, 1030, 0.68, 'turn', 'neutral', { opacity: 0.4 })
        ], 'a')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.6 }],
        sfx: [sfx(2, 'crowd', 0.5), sfx(9, 'glass', 0.3)]
      }
    ),
    shot(
      's01-anna-entrance',
      56,
      20,
      'ballroom',
      [cam(0, 1000, 460, 1.32), cam(20, 930, 440, 1.5)],
      [
        track('anna', [
          actor(0, 960, 1060, 1.0, 'stand', 'soft', { gaze: { x: -1, y: 0 } }),
          actor(20, 960, 1050, 1.02, 'turn', 'soft', { gaze: { x: -2, y: 0 } })
        ], 'gown'),
        track('society', [
          actor(0, 500, 1030, 0.68, 'stand', 'neutral', { opacity: 0.35 }),
          actor(20, 470, 1030, 0.68, 'turn', 'neutral', { opacity: 0.35 })
        ], 'b'),
        track('society', [
          actor(0, 1450, 1030, 0.7, 'stand', 'neutral', { opacity: 0.35 }),
          actor(20, 1480, 1030, 0.7, 'turn', 'neutral', { opacity: 0.35 })
        ], 'c')
      ],
      {
        effects: [{ type: 'motes', intensity: 0.5 }],
        sfx: [sfx(3, 'crowd', 0.32), sfx(12, 'glass', 0.22)]
      }
    ),
    shot(
      's01-anna-close',
      76,
      14,
      'ballroom',
      [cam(0, 960, 380, 1.55), cam(14, 960, 360, 1.75)],
      [
        track('anna', [
          actor(0, 960, 1160, 1.45, 'turn', 'soft', { gaze: { x: -1, y: 0 } }),
          actor(14, 960, 1150, 1.48, 'stand', 'desire', { gaze: { x: -2, y: 0 } })
        ], 'gown')
      ],
      { effects: [{ type: 'motes', intensity: 0.42 }] }
    )
  ],
  subtitles: [
    line(
      's01-n1',
      3,
      12,
      'NARRAZIONE',
      "A Pietroburgo l'inverno non finisce: si ritira dietro i vetri e aspetta.",
      'narration'
    ),
    line('s01-c1', 15, 22, 'CAPOSTAZIONE', "Il treno da Mosca è in ritardo."),
    line('s01-s1', 23, 30, 'SOCIETÀ', "Come tutte le cose importanti."),
    line('s01-s2', 31, 39, 'SOCIETÀ', "Dicono che porti una donna sola."),
    line(
      's01-n2',
      41,
      50,
      'NARRAZIONE',
      'La società aveva una superficie perfetta. Come il ghiaccio, non perdonava chi la incrinava.',
      'narration'
    ),
    line(
      's01-n3',
      58,
      67,
      'NARRAZIONE',
      "Anna entrò nella sala come si entra in una fotografia: tutti la videro. Nessuno la guardò.",
      'narration'
    ),
    line('s01-t1', 68, 76, 'ANNA', "Sorrido. È l'unica cosa che so fare con una stanza piena di occhi.", 'thought'),
    line('s01-a1', 79, 88, 'ANNA', 'Non avevo chiesto di essere guardata.')
  ]
};
