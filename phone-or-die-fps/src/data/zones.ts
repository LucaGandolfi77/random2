export type ZoneKind = 'home' | 'street' | 'park' | 'interior' | 'bar' | 'shop' | 'cemetery' | 'harbour' | 'metro' | 'hospital' | 'mall' | 'campus';

export interface ZoneExit {
  at: [number, number];
  label: string;
  target: string;
  spawn?: string;
  requires?: string;
}

export interface ZoneProp {
  kind: 'clue' | 'charger' | 'powerbank' | 'note' | 'photo';
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

/** Fifteen connected areas: the house, a larger night-time neighbourhood and five new districts. */
export const ZONES: ZoneDef[] = [
  {
    id: 'home', name: 'EMMA\'S HOUSE', kind: 'home',
    subtitle: 'The only place that used to feel safe',
    description: 'The house is the same. The garden behind it is not.',
    spawn: [0, 1], bounds: [-13, -11, 13, 12],
    exits: [{ at: [0, -5.5], label: 'Leave the house', target: 'street', spawn: 'home' }],
    props: [], lights: [], shadowSpawns: [[-11, 10], [11, 10], [-11, -9], [11, -9]],
    palette: { ground: '#5a4a45', wall: '#b9b1a2', accent: '#ffd9a8', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'street', name: 'OAKLANE STREET', kind: 'street',
    subtitle: 'The neighbourhood, after midnight',
    description: 'Longer blocks, darker side streets. Every window is dark except the ones that should be.',
    spawn: [0, 12], bounds: [-40, -20, 40, 20],
    exits: [
      { at: [-14, 3.6], label: 'Sophie\'s apartment', target: 'sophie', spawn: 'street' },
      { at: [-7, 3.6], label: 'Your parents\' house', target: 'parents', spawn: 'street' },
      { at: [0, 3.6], label: 'Back home', target: 'home', spawn: 'street' },
      { at: [7, 3.6], label: 'Daniel\'s old apartment', target: 'daniel', spawn: 'street' },
      { at: [14, 3.6], label: 'The Lantern Bar', target: 'bar', spawn: 'street' },
      { at: [-22, -16], label: 'Night Market', target: 'market', spawn: 'street' },
      { at: [22, -16], label: 'Wellness Block', target: 'wellness', spawn: 'street' },
      { at: [0, 18], label: 'Maple Park', target: 'park', spawn: 'street' },
      { at: [30, -16], label: 'Old Cemetery', target: 'cemetery', spawn: 'street' },
      { at: [-34, -16], label: 'Harbour', target: 'harbour', spawn: 'street' },
      { at: [34, -16], label: 'Metro Station', target: 'metro', spawn: 'street' },
      { at: [-34, 16], label: 'St. Anne Hospital', target: 'hospital', spawn: 'street' },
      { at: [34, 16], label: 'Grand Mall', target: 'mall', spawn: 'street' },
      { at: [0, -18], label: 'School Campus', target: 'campus', spawn: 'street' }
    ],
    props: [
      { kind: 'clue', at: [-12, -8], label: 'Inspect the parked car', reveal: 'street_tracks', text: 'The windshield is frosted from the inside. Someone was sitting here watching the house.' },
      { kind: 'charger', at: [19, 2], label: 'Use the street charging point' },
      { kind: 'powerbank', at: [-28, 12], label: 'Take the lost power bank' }
    ],
    lights: [{ at: [-24, 3, 0], color: 0xffcf94, power: 1.7 }, { at: [0, 3, 0], color: 0xffcf94, power: 1.7 }, { at: [24, 3, 0], color: 0xffcf94, power: 1.7 }],
    shadowSpawns: [[-36, -18], [36, -18], [0, -19], [-36, 18], [36, 18], [0, 19]],
    palette: { ground: '#232b33', wall: '#2c3540', accent: '#ffd9a8', sky: 0x080d18, fog: 0x0a101c },
    car: true
  },
  {
    id: 'park', name: 'MAPLE PARK', kind: 'park',
    subtitle: 'Too quiet for a public place',
    description: 'The lake is frozen at the edges. The playground moves in the wind. Nothing else does.',
    spawn: [0, 18], bounds: [-35, -22, 35, 22],
    exits: [{ at: [0, 20], label: 'Back to the street', target: 'street', spawn: 'park' }],
    props: [
      { kind: 'clue', at: [-14, -6], label: 'Examine the bench', reveal: 'park_bench', text: 'Two coffee cups, still warm. One of them has your name written on it.' },
      { kind: 'powerbank', at: [18, -10], label: 'Take the abandoned power bank' },
      { kind: 'clue', at: [0, -14], label: 'Look across the frozen lake', reveal: 'park_lake', text: 'Something is standing on the ice. It does not cast a shadow.' },
      { kind: 'charger', at: [-22, 10], label: 'Use the park charger' }
    ],
    lights: [{ at: [-14, 3, 0], color: 0xa8d0c0, power: 1.2 }, { at: [16, 3, -6], color: 0xa8d0c0, power: 1.2 }],
    shadowSpawns: [[-30, -18], [30, -18], [0, -20], [-30, 18], [30, 18]],
    palette: { ground: '#1e3024', wall: '#2a3a2c', accent: '#9fe8bd', sky: 0x06101a, fog: 0x08131c }
  },
  {
    id: 'sophie', name: 'SOPHIE\'S APARTMENT', kind: 'interior',
    subtitle: 'Her kettle is still warm',
    description: 'Bigger than you remember. Or maybe you never really looked.',
    spawn: [0, 5], bounds: [-10, -8, 10, 9],
    exits: [{ at: [0, -7.4], label: 'Back to the street', target: 'street', spawn: 'sophie' }],
    props: [
      { kind: 'clue', at: [-6, 2], label: 'Read Sophie\'s note', reveal: 'sophie_note', text: '"Call me the second you get here. Whatever you do, do not answer the landline."' },
      { kind: 'charger', at: [6, -3], label: 'Charge the phone' },
      { kind: 'photo', at: [6, 5], label: 'Inspect the photograph' }
    ],
    lights: [{ at: [0, 2.5, 1], color: 0xffc98a, power: 2 }, { at: [-6, 2.5, 4], color: 0xffc98a, power: 1.5 }],
    shadowSpawns: [[-9, 7], [9, 7]], reveal: 'sophie_away',
    palette: { ground: '#6b5a4d', wall: '#c2b3a6', accent: '#ffd9a8', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'parents', name: 'THE OLD FAMILY HOUSE', kind: 'interior',
    subtitle: 'Nothing has moved since 1998',
    description: 'The photographs stop at the year everything changed.',
    spawn: [0, 5], bounds: [-10, -8, 10, 9],
    exits: [{ at: [0, -7.4], label: 'Back to the street', target: 'street', spawn: 'parents' }],
    props: [
      { kind: 'clue', at: [-6, 2], label: 'Look at the family photograph', reveal: 'family_photo', text: 'A woman is standing behind your mother in every picture. Her face is scratched away.' },
      { kind: 'clue', at: [6, 4], label: 'Read your grandmother\'s journal', reveal: 'journal_city', text: '"When the line goes quiet, the dark learns your name. Keep a voice in the room."' },
      { kind: 'charger', at: [-6, -4], label: 'Use the old charger' }
    ],
    lights: [{ at: [0, 2.5, 0], color: 0xffd9a8, power: 2 }],
    shadowSpawns: [[-9, 7], [9, 7]], reveal: 'family_house',
    palette: { ground: '#5a4a45', wall: '#b9b1a2', accent: '#ffd9a8', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'daniel', name: 'DANIEL\'S OLD APARTMENT', kind: 'interior',
    subtitle: 'The ex who knew too much',
    description: 'His drawers are empty. The walls are covered in notes about the Shadows.',
    spawn: [0, 5], bounds: [-10, -8, 10, 9],
    exits: [{ at: [0, -7.4], label: 'Back to the street', target: 'street', spawn: 'daniel' }],
    props: [
      { kind: 'clue', at: [-6, 2], label: 'Read Daniel\'s last note', reveal: 'daniel_note', text: '"I was right about all of it. Keep the phone charged and do not trust the voice in the garden."' },
      { kind: 'powerbank', at: [6, -2], label: 'Take Daniel\'s power bank' },
      { kind: 'note', at: [6, 6], label: 'Look at the mirror', reveal: 'daniel_mirror', text: 'Your reflection is facing the wrong way.' }
    ],
    lights: [{ at: [0, 2.5, 1], color: 0xa8b0ff, power: 1.6 }],
    shadowSpawns: [[-9, 7], [9, 7]], reveal: 'daniel_apartment',
    palette: { ground: '#4a4458', wall: '#9a95ad', accent: '#c0b8ff', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'bar', name: 'THE LANTERN BAR', kind: 'bar',
    subtitle: 'A crowd is a kind of shelter',
    description: 'Music, laughter, twenty people talking at once. The Shadows dislike it here.',
    spawn: [0, 5], bounds: [-11, -8, 11, 10],
    exits: [{ at: [0, -7.4], label: 'Back to the street', target: 'street', spawn: 'bar' }],
    props: [
      { kind: 'charger', at: [-7, -3], label: 'Charge behind the bar' },
      { kind: 'clue', at: [7, 2], label: 'Ask the bartender', reveal: 'bar_rumour', text: '"Nobody comes in after two. Except that one guy who never orders anything. He just watches the door."' },
      { kind: 'note', at: [-7, 6], label: 'Read the chalkboard', reveal: 'bar_board', text: 'Tonight: NO PHONES. It was written over something else.' }
    ],
    lights: [{ at: [-6, 2.5, 0], color: 0xffb060, power: 2.2 }, { at: [6, 2.5, 0], color: 0xd060ff, power: 1.8 }],
    shadowSpawns: [], reveal: 'bar_safe', safe: true,
    palette: { ground: '#3a2a30', wall: '#6b4a52', accent: '#ffb060', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'market', name: 'NIGHT MARKET', kind: 'shop',
    subtitle: 'Open all night, apparently',
    description: 'Every checkout is empty. The freezers are humming something almost like a voice.',
    spawn: [0, 6], bounds: [-12, -9, 12, 10],
    exits: [{ at: [0, -8.4], label: 'Back to the street', target: 'street', spawn: 'market' }],
    props: [
      { kind: 'powerbank', at: [-8, -3], label: 'Take the emergency power bank' },
      { kind: 'charger', at: [8, -4], label: 'Use the staff charger' },
      { kind: 'clue', at: [0, -4], label: 'Check the last receipt', reveal: 'market_receipt', text: 'A single item: ONE PHONE CARD. The time printed on it is 05:59 AM.' },
      { kind: 'note', at: [8, 6], label: 'Inspect the freezer', reveal: 'market_freezer', text: 'The frost inside forms a phone number. It is your own.' }
    ],
    lights: [{ at: [-4, 3, 1], color: 0xc8f0ff, power: 2.4 }, { at: [5, 3, 1], color: 0xc8f0ff, power: 2.4 }],
    shadowSpawns: [[-11, 8], [11, 8]], reveal: 'market_visited',
    palette: { ground: '#6b7078', wall: '#c0c8d0', accent: '#c8f0ff', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'wellness', name: 'WELLNESS BLOCK', kind: 'shop',
    subtitle: 'Gym, salon and boutique — all closed',
    description: 'The mirrors are covered. Someone left a charging cable under the reception desk.',
    spawn: [0, 5], bounds: [-11, -8, 11, 10],
    exits: [{ at: [0, -7.4], label: 'Back to the street', target: 'street', spawn: 'wellness' }],
    props: [
      { kind: 'clue', at: [-7, 2], label: 'Look under the salon cover', reveal: 'salon_mirror', text: 'The mirror is not reflecting the room. It is reflecting a woman standing behind you.' },
      { kind: 'charger', at: [7, -3], label: 'Use the reception charger' },
      { kind: 'note', at: [7, 6], label: 'Check the locker room', reveal: 'wellness_locker', text: 'There is a phone inside, still ringing. It has no battery.' }
    ],
    lights: [{ at: [0, 2.5, 1], color: 0xffd8f0, power: 2 }],
    shadowSpawns: [[-10, 8], [10, 8]], reveal: 'wellness_visited',
    palette: { ground: '#5a5060', wall: '#c8b9cc', accent: '#ffd8f0', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'cemetery', name: 'OLD CEMETERY', kind: 'cemetery',
    subtitle: 'Where the rule began',
    description: 'The graves are arranged in a circle around an empty stone bench.',
    spawn: [0, 18], bounds: [-30, -20, 30, 22],
    exits: [{ at: [0, 20], label: 'Back to the street', target: 'street', spawn: 'cemetery' }],
    props: [
      { kind: 'clue', at: [0, -8], label: 'Read the oldest headstone', reveal: 'cemetery_name', text: 'Your name is carved here. The date is tonight.' },
      { kind: 'powerbank', at: [-14, 4], label: 'Take the cemetery power bank' },
      { kind: 'note', at: [15, -10], label: 'Look inside the mausoleum', reveal: 'cemetery_crypt', text: 'A phone is charging on a stone shelf. Someone knew you would come.' }
    ],
    lights: [{ at: [0, 3, -4], color: 0x9fb7d8, power: 1.4 }],
    shadowSpawns: [[-26, -18], [26, -18], [0, -19]],
    palette: { ground: '#2c3430', wall: '#4c5850', accent: '#c0d8c8', sky: 0x05080c, fog: 0x070b10 }
  },
  {
    id: 'harbour', name: 'GREYSTONE HARBOUR', kind: 'harbour',
    subtitle: 'The sea is very still tonight',
    description: 'Fog over the water. Somewhere out there, a boat is calling you by name.',
    spawn: [0, 16], bounds: [-38, -18, 38, 20],
    exits: [{ at: [0, 18], label: 'Back to the street', target: 'street', spawn: 'harbour' }],
    props: [
      { kind: 'clue', at: [-18, -8], label: 'Inspect the mooring rope', reveal: 'harbour_rope', text: 'The rope is tied from the inside. Something came ashore here.' },
      { kind: 'powerbank', at: [22, -10], label: 'Take the dock worker\'s battery' },
      { kind: 'charger', at: [-26, 8], label: 'Use the harbour charger' }
    ],
    lights: [{ at: [-18, 3, 0], color: 0xa8c8e8, power: 1.5 }, { at: [18, 3, -4], color: 0xa8c8e8, power: 1.5 }],
    shadowSpawns: [[-34, -16], [34, -16], [0, -17]], reveal: 'harbour_visited',
    palette: { ground: '#1e2c38', wall: '#2f4152', accent: '#a8c8e8', sky: 0x060c16, fog: 0x091420 }
  },
  {
    id: 'metro', name: 'OAKLANE METRO', kind: 'metro',
    subtitle: 'The last train never arrived',
    description: 'The tunnel lights blink in sequence. Something is walking between them.',
    spawn: [0, 9], bounds: [-16, -10, 16, 12],
    exits: [{ at: [0, 10], label: 'Back to the street', target: 'street', spawn: 'metro' }],
    props: [
      { kind: 'clue', at: [-10, 2], label: 'Read the departure board', reveal: 'metro_board', text: 'Every service is cancelled. Except one: 06:00, platform zero.' },
      { kind: 'charger', at: [10, 2], label: 'Use the platform charger' },
      { kind: 'note', at: [10, 8], label: 'Look down the tunnel', reveal: 'metro_tunnel', text: 'Two red lights are moving toward you. They are too low to be a train.' }
    ],
    lights: [{ at: [-8, 3, 0], color: 0xb0c8e0, power: 1.8 }, { at: [8, 3, 0], color: 0xb0c8e0, power: 1.8 }],
    shadowSpawns: [[-14, -8], [14, -8]], reveal: 'metro_visited',
    palette: { ground: '#2b3038', wall: '#414a58', accent: '#b0c8e0', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'hospital', name: 'ST. ANNE HOSPITAL', kind: 'hospital',
    subtitle: 'Nobody is admitted after midnight',
    description: 'The corridors are too long. The doors all open inward.',
    spawn: [0, 11], bounds: [-18, -12, 18, 14],
    exits: [{ at: [0, 12], label: 'Back to the street', target: 'street', spawn: 'hospital' }],
    props: [
      { kind: 'clue', at: [-12, 2], label: 'Read the patient bracelet', reveal: 'hospital_bracelet', text: 'It has your name on it. The date of admission is tonight.' },
      { kind: 'charger', at: [12, -4], label: 'Use the ward charger' },
      { kind: 'powerbank', at: [-12, 8], label: 'Take the emergency battery' }
    ],
    lights: [{ at: [-8, 3, 0], color: 0xc8e8ff, power: 2 }, { at: [8, 3, 0], color: 0xc8e8ff, power: 2 }],
    shadowSpawns: [[-16, -10], [16, -10]], reveal: 'hospital_visited',
    palette: { ground: '#4a585c', wall: '#b8c8cc', accent: '#c8e8ff', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'mall', name: 'GRAND MALL', kind: 'mall',
    subtitle: 'Open twenty-four hours, they said',
    description: 'Every shop shutter is down. The food court lights are still on.',
    spawn: [0, 14], bounds: [-24, -16, 24, 18],
    exits: [{ at: [0, 16], label: 'Back to the street', target: 'street', spawn: 'mall' }],
    props: [
      { kind: 'clue', at: [-16, 2], label: 'Check the information desk', reveal: 'mall_desk', text: 'The map has one location marked: EXIT. It is not on any wall.' },
      { kind: 'powerbank', at: [16, -6], label: 'Take the lost power bank' },
      { kind: 'charger', at: [16, 10], label: 'Use the food court charger' },
      { kind: 'note', at: [-16, 10], label: 'Look in the closed cinema', reveal: 'mall_cinema', text: 'Every screen shows the same thing: an empty chair and a ringing phone.' }
    ],
    lights: [{ at: [-12, 3, 0], color: 0xffe0b8, power: 2.2 }, { at: [12, 3, 0], color: 0xffe0b8, power: 2.2 }],
    shadowSpawns: [[-22, -14], [22, -14], [0, -15]], reveal: 'mall_visited',
    palette: { ground: '#6a6270', wall: '#b9b0c4', accent: '#ffe0b8', sky: 0x05070c, fog: 0x080b12 }
  },
  {
    id: 'campus', name: 'WESTFIELD CAMPUS', kind: 'campus',
    subtitle: 'School is out. Forever, apparently.',
    description: 'The sports field is empty. The library windows are full of silhouettes.',
    spawn: [0, 18], bounds: [-36, -20, 36, 24],
    exits: [{ at: [0, 20], label: 'Back to the street', target: 'street', spawn: 'campus' }],
    props: [
      { kind: 'clue', at: [-18, -6], label: 'Read the noticeboard', reveal: 'campus_notice', text: 'A missing-person flyer. The photograph is of you, dated tomorrow.' },
      { kind: 'powerbank', at: [20, -10], label: 'Take the sports bag battery' },
      { kind: 'charger', at: [-22, 10], label: 'Use the library charger' }
    ],
    lights: [{ at: [-16, 3, 0], color: 0xffd9a8, power: 1.6 }, { at: [16, 3, 0], color: 0xffd9a8, power: 1.6 }],
    shadowSpawns: [[-32, -18], [32, -18], [0, -19]], reveal: 'campus_visited',
    palette: { ground: '#2c3a2c', wall: '#5c6b5c', accent: '#ffd9a8', sky: 0x070d14, fog: 0x0a1218 }
  }
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<string, ZoneDef>;
export const TAXI_COST = 6;
export const TAXI_SECONDS = 45;

/** Longer trips cost more battery; the city is now much larger. */
export function taxiCost(fromId: string, toId: string): number {
  const a = ZONE_BY_ID[fromId], b = ZONE_BY_ID[toId];
  if (!a || !b) return TAXI_COST;
  const dx = a.spawn[0] - b.spawn[0];
  const dz = a.spawn[1] - b.spawn[1];
  return Math.min(18, TAXI_COST + Math.round(Math.hypot(dx, dz) / 14));
}
