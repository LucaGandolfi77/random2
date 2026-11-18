export type ZoneKind = 'home' | 'street' | 'park' | 'interior' | 'bar' | 'shop' | 'cemetery';

export interface ZoneExit {
  at: [number, number];
  label: string;
  target: string;
  spawn?: string;
  requires?: string;
}

export interface ZoneProp {
  kind: 'clue' | 'charger' | 'powerbank' | 'note';
  at: [number, number];
  label: string;
  reveal?: string;
  text?: string;
}

export interface ZoneLight {
  at: [number, number, number];
  color: number;
  power: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  kind: ZoneKind;
  subtitle: string;
  description: string;
  spawn: [number, number];
  bounds: [number, number, number, number];
  exits: ZoneExit[];
  props: ZoneProp[];
  lights: ZoneLight[];
  shadowSpawns: [number, number][];
  reveal?: string;
  safe?: boolean;
  palette: { ground: string; wall: string; accent: string; sky: number; fog: number };
  car?: boolean;
}

/** Ten connected areas: the original house plus the night-time neighbourhood. */
export const ZONES: ZoneDef[] = [
  {
    id: 'home', name: 'EMMA\'S HOUSE', kind: 'home',
    subtitle: 'The only place that used to feel safe',
    description: 'The living room is exactly as you left it. The front door is not.',
    spawn: [0, 1], bounds: [-9, -7, 9, 7],
    exits: [{ at: [0, -5.5], label: 'Leave the house', target: 'street', spawn: 'home' }],
    props: [], lights: [], shadowSpawns: [],
    palette: { ground: '#5a4a45', wall: '#b9b1a2', accent: '#ffd9a8', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'street', name: 'OAKLANE STREET', kind: 'street',
    subtitle: 'The neighbourhood, after midnight',
    description: 'Streetlights hum. Every window is dark except the ones that should be.',
    spawn: [0, 7], bounds: [-22, -9, 22, 10],
    exits: [
      { at: [-9, 3.6], label: 'Sophie\'s apartment', target: 'sophie', spawn: 'street' },
      { at: [-4.5, 3.6], label: 'Your parents\' house', target: 'parents', spawn: 'street' },
      { at: [0, 3.6], label: 'Back home', target: 'home', spawn: 'street' },
      { at: [4.5, 3.6], label: 'Daniel\'s old apartment', target: 'daniel', spawn: 'street' },
      { at: [9, 3.6], label: 'The Lantern Bar', target: 'bar', spawn: 'street' },
      { at: [-13, -6], label: 'Night Market', target: 'market', spawn: 'street' },
      { at: [13, -6], label: 'Wellness Block', target: 'wellness', spawn: 'street' },
      { at: [0, -8], label: 'Park gate', target: 'park', spawn: 'street' },
      { at: [19, -6], label: 'Old Cemetery', target: 'cemetery', spawn: 'street' }
    ],
    props: [
      { kind: 'clue', at: [-7, -5], label: 'Inspect the parked car', reveal: 'street_tracks', text: 'The windshield is frosted from the inside. Someone was sitting here watching the house.' },
      { kind: 'charger', at: [11, 2], label: 'Use the street charging point' }
    ],
    lights: [{ at: [-10, 3, 0], color: 0xffcf94, power: 1.7 }, { at: [0, 3, 0], color: 0xffcf94, power: 1.7 }, { at: [10, 3, 0], color: 0xffcf94, power: 1.7 }],
    shadowSpawns: [[-18, -7], [18, -7], [0, -8], [-18, 7], [18, 7]],
    palette: { ground: '#232b33', wall: '#2c3540', accent: '#ffd9a8', sky: 0x080d18, fog: 0x0a101c },
    car: true
  },
  {
    id: 'park', name: 'MAPLE PARK', kind: 'park',
    subtitle: 'Too quiet for a public place',
    description: 'The playground moves in the wind. Nothing else does.',
    spawn: [0, 7], bounds: [-20, -10, 20, 11],
    exits: [{ at: [0, 9], label: 'Back to the street', target: 'street', spawn: 'park' }],
    props: [
      { kind: 'clue', at: [-8, -3], label: 'Examine the bench', reveal: 'park_bench', text: 'Two coffee cups, still warm. One of them has your name written on it.' },
      { kind: 'powerbank', at: [10, -5], label: 'Take the abandoned power bank' }
    ],
    lights: [{ at: [-6, 3, 0], color: 0xa8d0c0, power: 1.2 }, { at: [8, 3, -2], color: 0xa8d0c0, power: 1.2 }],
    shadowSpawns: [[-16, -8], [16, -8], [0, -9]],
    palette: { ground: '#1e3024', wall: '#2a3a2c', accent: '#9fe8bd', sky: 0x06101a, fog: 0x08131c }
  },
  {
    id: 'sophie', name: 'SOPHIE\'S APARTMENT', kind: 'interior',
    subtitle: 'Her kettle is still warm',
    description: 'Sophie said she was home. The lights are on. She is not here.',
    spawn: [0, 3], bounds: [-7, -5, 7, 6],
    exits: [{ at: [0, -4.4], label: 'Back to the street', target: 'street', spawn: 'sophie' }],
    props: [
      { kind: 'clue', at: [-4, 1], label: 'Read Sophie\'s note', reveal: 'sophie_note', text: '"Call me the second you get here. Whatever you do, do not answer the landline."' },
      { kind: 'charger', at: [4, -2], label: 'Charge the phone' }
    ],
    lights: [{ at: [0, 2.5, 1], color: 0xffc98a, power: 2 }, { at: [-4, 2.5, 2], color: 0xffc98a, power: 1.5 }],
    shadowSpawns: [[-6, 4], [6, 4]], reveal: 'sophie_away',
    palette: { ground: '#6b5a4d', wall: '#c2b3a6', accent: '#ffd9a8', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'parents', name: 'THE OLD FAMILY HOUSE', kind: 'interior',
    subtitle: 'Nothing has moved since 1998',
    description: 'The photographs stop at the year everything changed.',
    spawn: [0, 3], bounds: [-7, -5, 7, 6],
    exits: [{ at: [0, -4.4], label: 'Back to the street', target: 'street', spawn: 'parents' }],
    props: [
      { kind: 'clue', at: [-4, 1], label: 'Look at the family photograph', reveal: 'family_photo', text: 'A woman is standing behind your mother in every picture. Her face is scratched away.' },
      { kind: 'clue', at: [4, 2], label: 'Read your grandmother\'s journal', reveal: 'journal_city', text: '"When the line goes quiet, the dark learns your name. Keep a voice in the room."' }
    ],
    lights: [{ at: [0, 2.5, 0], color: 0xffd9a8, power: 2 }],
    shadowSpawns: [[-6, 4], [6, 4]], reveal: 'family_house',
    palette: { ground: '#5a4a45', wall: '#b9b1a2', accent: '#ffd9a8', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'daniel', name: 'DANIEL\'S OLD APARTMENT', kind: 'interior',
    subtitle: 'The ex who knew too much',
    description: 'His draws are empty. The walls are covered in notes about the Shadows.',
    spawn: [0, 3], bounds: [-7, -5, 7, 6],
    exits: [{ at: [0, -4.4], label: 'Back to the street', target: 'street', spawn: 'daniel' }],
    props: [
      { kind: 'clue', at: [-4, 1], label: 'Read Daniel\'s last note', reveal: 'daniel_note', text: '"I was right about all of it. If you are reading this, keep the phone charged and do not trust the voice in the garden."' },
      { kind: 'powerbank', at: [4, -1], label: 'Take Daniel\'s power bank' }
    ],
    lights: [{ at: [0, 2.5, 1], color: 0xa8b0ff, power: 1.6 }],
    shadowSpawns: [[-6, 4], [6, 4]], reveal: 'daniel_apartment',
    palette: { ground: '#4a4458', wall: '#9a95ad', accent: '#c0b8ff', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'bar', name: 'THE LANTERN BAR', kind: 'bar',
    subtitle: 'A crowd is a kind of shelter',
    description: 'Music, laughter, twenty people talking at once. The Shadows dislike it here.',
    spawn: [0, 4], bounds: [-8, -5, 8, 7],
    exits: [{ at: [0, -4.4], label: 'Back to the street', target: 'street', spawn: 'bar' }],
    props: [
      { kind: 'charger', at: [-5, -2], label: 'Charge behind the bar' },
      { kind: 'clue', at: [5, 1], label: 'Ask the bartender', reveal: 'bar_rumour', text: '"Nobody comes in after two. Except that one guy who never orders anything. He just watches the door."' }
    ],
    lights: [{ at: [-4, 2.5, 0], color: 0xffb060, power: 2.2 }, { at: [4, 2.5, 0], color: 0xd060ff, power: 1.8 }],
    shadowSpawns: [], reveal: 'bar_safe', safe: true,
    palette: { ground: '#3a2a30', wall: '#6b4a52', accent: '#ffb060', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'market', name: 'NIGHT MARKET', kind: 'shop',
    subtitle: 'Open all night, apparently',
    description: 'Every checkout is empty. The freezers are humming something almost like a voice.',
    spawn: [0, 5], bounds: [-9, -6, 9, 7],
    exits: [{ at: [0, -5.4], label: 'Back to the street', target: 'street', spawn: 'market' }],
    props: [
      { kind: 'powerbank', at: [-6, -2], label: 'Take the emergency power bank' },
      { kind: 'charger', at: [6, -3], label: 'Use the staff charger' },
      { kind: 'clue', at: [0, -3], label: 'Check the last receipt', reveal: 'market_receipt', text: 'A single item: ONE PHONE CARD. The time printed on it is 05:59 AM.' }
    ],
    lights: [{ at: [-3, 3, 1], color: 0xc8f0ff, power: 2.4 }, { at: [4, 3, 1], color: 0xc8f0ff, power: 2.4 }],
    shadowSpawns: [[-8, 5], [8, 5]], reveal: 'market_visited',
    palette: { ground: '#6b7078', wall: '#c0c8d0', accent: '#c8f0ff', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'wellness', name: 'WELLNESS BLOCK', kind: 'shop',
    subtitle: 'Gym, salon and boutique — all closed',
    description: 'The mirrors are covered. Someone left a charging cable under the reception desk.',
    spawn: [0, 4], bounds: [-8, -5, 8, 7],
    exits: [{ at: [0, -4.4], label: 'Back to the street', target: 'street', spawn: 'wellness' }],
    props: [
      { kind: 'clue', at: [-5, 1], label: 'Look under the salon cover', reveal: 'salon_mirror', text: 'The mirror is not reflecting the room. It is reflecting a woman standing behind you.' },
      { kind: 'charger', at: [5, -2], label: 'Use the reception charger' }
    ],
    lights: [{ at: [0, 2.5, 1], color: 0xffd8f0, power: 2 }],
    shadowSpawns: [[-7, 5], [7, 5]], reveal: 'wellness_visited',
    palette: { ground: '#5a5060', wall: '#c8b9cc', accent: '#ffd8f0', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'cemetery', name: 'OLD CEMETERY', kind: 'cemetery',
    subtitle: 'Where the rule began',
    description: 'The graves are arranged in a circle around an empty stone bench.',
    spawn: [0, 8], bounds: [-18, -10, 18, 11],
    exits: [{ at: [0, 9], label: 'Back to the street', target: 'street', spawn: 'cemetery' }],
    props: [
      { kind: 'clue', at: [0, -4], label: 'Read the oldest headstone', reveal: 'cemetery_name', text: 'Your name is carved here. The date is tonight.' },
      { kind: 'powerbank', at: [-8, 2], label: 'Take the cemetery power bank' }
    ],
    lights: [{ at: [0, 3, -2], color: 0x9fb7d8, power: 1.4 }],
    shadowSpawns: [[-14, -8], [14, -8], [0, -9]], reveal: 'cemetery_truth',
    palette: { ground: '#2c3430', wall: '#4c5850', accent: '#c0d8c8', sky: 0x05080c, fog: 0x070b10 }
  }
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<string, ZoneDef>;
export const TAXI_COST = 8;
export const TAXI_SECONDS = 45;
