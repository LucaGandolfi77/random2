import type { InteractableDef, StoryEffect, ZoneDef } from '@/core/types';

export const CITY_WIDTH = 46;
export const CITY_HEIGHT = 34;
export const TILE = 44;

export const START_POSITION = { x: 10, y: 28, zone: 'work' };
export const HOME_DOOR = { x: 37, y: 3 };

export const horizontalRoads = [
  { y: 4, h: 4 },
  { y: 12, h: 4 },
  { y: 20, h: 4 },
  { y: 28, h: 4 }
];

export const verticalRoads = [
  { x: 4, w: 4 },
  { x: 13, w: 4 },
  { x: 22, w: 4 },
  { x: 31, w: 4 },
  { x: 40, w: 4 }
];

const grid: string[][] = Array.from({ length: CITY_HEIGHT }, () =>
  Array.from({ length: CITY_WIDTH }, () => '#')
);

// Lay down the road grid. Outer sidewalk rings surround two-lane asphalt roads.
for (let y = 0; y < CITY_HEIGHT; y++) {
  for (let x = 0; x < CITY_WIDTH; x++) {
    const hBand = horizontalRoads.find((road) => y >= road.y && y < road.y + road.h);
    const vBand = verticalRoads.find((road) => x >= road.x && x < road.x + road.w);
    if (!hBand && !vBand) continue;
    const asphalt =
      (hBand && y > hBand.y && y < hBand.y + hBand.h - 1) ||
      (vBand && x > vBand.x && x < vBand.x + vBand.w - 1);
    grid[y][x] = asphalt ? '.' : 's';
  }
}

// A small park cuts through the centre of the city.
for (let y = 16; y <= 19; y++) {
  for (let x = 26; x <= 30; x++) {
    grid[y][x] = 'p';
  }
}
for (const [x, y] of [
  [27, 16],
  [30, 18],
  [26, 19],
  [29, 19]
] as const) {
  grid[y][x] = 'x';
}

// Two narrow alleys: one behind the bus rows, one beneath the old quarter.
for (let y = 24; y <= 27; y++) grid[y][19] = 'a';
for (let y = 8; y <= 11; y++) grid[y][37] = 'a';

// A few shortcuts through the park are intentionally unmarked and dark.
for (const [x, y] of [
  [27, 17],
  [28, 17],
  [28, 18],
  [29, 16]
] as const) {
  if (grid[y][x] === 'p') grid[y][x] = 'p';
}

// Doors and landmark facades.
grid[27][10] = 'D';
grid[3][37] = 'H';

// Street furniture and solid props.
const solids: [number, number, string][] = [
  [9, 30, 'o'],
  [36, 29, 'o'],
  [30, 14, 'o'],
  [42, 22, 'o'],
  [28, 17, 'o'],
  [19, 25, 'o'],
  [25, 15, 'o'],
  [37, 29, 'o'],
  [7, 18, 'o'],
  [18, 21, 'o'],
  [33, 13, 'o'],
  [41, 9, 'o']
];
for (const [x, y, ch] of solids) {
  if (grid[y]?.[x] !== undefined) grid[y][x] = ch;
}

export const cityRows = grid.map((row) => row.join(''));

export const zones: ZoneDef[] = [
  { id: 'work', name: 'Clock-Out Corner', x: 0, y: 20, w: 13, h: 14 },
  { id: 'lantern', name: 'Lantern Avenue', x: 0, y: 0, w: 22, h: 20 },
  { id: 'park', name: 'Mercer Park', x: 22, y: 0, w: 9, h: 20 },
  { id: 'bus', name: 'Night Bus Row', x: 13, y: 20, w: 18, h: 14 },
  { id: 'old-quarter', name: 'The Old Quarter', x: 31, y: 20, w: 15, h: 14 },
  { id: 'home-lane', name: 'Home Lane', x: 31, y: 0, w: 15, h: 20 }
];

export const zoneAt = (x: number, y: number): string => {
  for (const zone of zones) {
    if (x >= zone.x && x < zone.x + zone.w && y >= zone.y && y < zone.y + zone.h) return zone.id;
  }
  return 'work';
};

export const zoneName = (id: string): string => zones.find((zone) => zone.id === id)?.name ?? 'The street';

const walkableCharacters = new Set(['.', 's', 'p', 'a', 'c']);

export const isWalkableTile = (x: number, y: number): boolean => {
  if (x < 0 || y < 0 || x >= CITY_WIDTH || y >= CITY_HEIGHT) return false;
  return walkableCharacters.has(cityRows[y][x]);
};

export const distanceToHome = (x: number, y: number): number =>
  Math.abs(HOME_DOOR.x - x) + Math.abs(HOME_DOOR.y - y);

export const homeProgress = (x: number, y: number): number => {
  const start = distanceToHome(START_POSITION.x, START_POSITION.y);
  const remaining = distanceToHome(x, y);
  return Math.max(0, Math.min(1, 1 - remaining / start));
};

export const interactables: InteractableDef[] = [
  {
    id: 'work_door',
    label: 'The Copy Shop',
    zone: 'work',
    x: 10,
    y: 27,
    kind: 'note',
    prompt: 'The shutters are down. Your shift is over. The street is waiting.',
    once: true,
    effects: [
      { type: 'clue', id: 'clocked_out', text: 'Emma clocked out at 10:00 PM. The last bus left without her.' },
      { type: 'message', id: 'msg_shift' },
      { type: 'flag', id: 'clocked_out' },
      { type: 'time', amount: 2 }
    ]
  },
  {
    id: 'work_vending',
    label: 'Staff Vending Machine',
    zone: 'work',
    x: 12,
    y: 27,
    kind: 'vending',
    prompt: 'A vending machine hums against the shutter. The power is still on.',
    once: true,
    effects: [
      { type: 'battery', amount: 16 },
      { type: 'flag', id: 'found_vending' },
      { type: 'clue', id: 'vending', text: 'A dusty vending machine, still lit from inside.' }
    ]
  },
  {
    id: 'parked_car_flashlight',
    label: 'Parked Car',
    zone: 'work',
    x: 9,
    y: 30,
    kind: 'car',
    prompt: 'The driver’s door is unlocked. There is a heavy flashlight under the seat.',
    once: true,
    effects: [
      { type: 'flashlight' },
      { type: 'flag', id: 'found_flashlight' },
      { type: 'clue', id: 'flashlight', text: 'A steel flashlight from an unlocked car. The battery still works.' }
    ]
  },
  {
    id: 'community_board',
    label: 'Community Noticeboard',
    zone: 'work',
    x: 8,
    y: 24,
    kind: 'sign',
    prompt: 'Rain has made the paper soft. One missing-person notice is newer than the others.',
    once: true,
    effects: [
      { type: 'clue', id: 'missing_poster', text: 'A missing-person notice for a woman last seen walking home from the night bus.' },
      { type: 'message', id: 'msg_missing' },
      { type: 'flag', id: 'found_missing_poster' }
    ]
  },
  {
    id: 'laundromat_window',
    label: 'Laundromat Window',
    zone: 'lantern',
    x: 10,
    y: 11,
    kind: 'television',
    prompt: 'A television left on inside an empty laundromat. The signal is only static and a voice.',
    once: true,
    effects: [
      { type: 'clue', id: 'broadcast', text: 'A looping emergency broadcast: “If you are walking home, keep a voice on the line.”' },
      { type: 'message', id: 'msg_broadcast' }
    ]
  },
  {
    id: 'kiosk_charger',
    label: 'All-Night Kiosk',
    zone: 'park',
    x: 25,
    y: 10,
    kind: 'kiosk',
    prompt: 'The kiosk window is open. A charging cable hangs over the counter.',
    maxUses: 2,
    effects: [
      { type: 'battery', amount: 34 },
      { type: 'time', amount: 4 },
      { type: 'flag', id: 'used_kiosk' }
    ]
  },
  {
    id: 'powerbank_window',
    label: 'Laundromat Power Bank',
    zone: 'lantern',
    x: 17,
    y: 11,
    kind: 'powerbank',
    prompt: 'A power bank sits in the lost-and-found box behind the glass.',
    once: true,
    effects: [
      { type: 'battery', amount: 38 },
      { type: 'clue', id: 'powerbank', text: 'A power bank in the lost-and-found. It is still warm.' }
    ]
  },
  {
    id: 'payphone',
    label: 'Street Payphone',
    zone: 'park',
    x: 25,
    y: 15,
    kind: 'payphone',
    prompt: 'The payphone is ringing. No one else is on this block.',
    once: true,
    effects: [
      { type: 'clue', id: 'payphone_ring', text: 'A payphone rings at 1:00 AM even though its cable has been cut.' },
      { type: 'message', id: 'msg_payphone' },
      { type: 'flag', id: 'heard_payphone' },
      { type: 'threat', amount: 2 }
    ]
  },
  {
    id: 'bus_stop',
    label: 'Night Bus Stop',
    zone: 'bus',
    x: 25,
    y: 23,
    kind: 'busstop',
    prompt: 'The timetable is soaked. The next bus was due forty minutes ago.',
    once: true,
    effects: [
      { type: 'clue', id: 'night_bus', text: 'The last bus on the route never arrived.' },
      { type: 'message', id: 'msg_bus' },
      { type: 'trust', id: 'priya', amount: 1 },
      { type: 'time', amount: 2 }
    ]
  },
  {
    id: 'bus_schedule',
    label: 'Route Map',
    zone: 'bus',
    x: 26,
    y: 23,
    kind: 'sign',
    prompt: 'A laminated route map, scratched over with a pen.',
    once: true,
    effects: [
      { type: 'clue', id: 'route_map', text: 'Someone has circled the old quarter and written: “DO NOT WALK THE CUT.”' },
      { type: 'flag', id: 'found_route' },
      { type: 'message', id: 'msg_route' }
    ]
  },
  {
    id: 'puddle',
    label: 'Rain Puddle',
    zone: 'bus',
    x: 17,
    y: 29,
    kind: 'puddle',
    prompt: 'The streetlight makes a mirror of the puddle. Your reflection is a half-second late.',
    once: true,
    effects: [
      { type: 'clue', id: 'late_reflection', text: 'Emma’s reflection moved after she did.' },
      { type: 'threat', amount: 2 },
      { type: 'flag', id: 'saw_reflection' }
    ]
  },
  {
    id: 'bench_note',
    label: 'Park Bench',
    zone: 'park',
    x: 28,
    y: 17,
    kind: 'bench',
    prompt: 'A note is folded between the slats, damp but still readable.',
    once: true,
    effects: [
      { type: 'message', id: 'msg_wiring' },
      { type: 'clue', id: 'cut_old_line', text: 'Cut the old line while someone is speaking to break the house’s connection.' },
      { type: 'flag', id: 'found_wiring' }
    ]
  },
  {
    id: 'dumpster',
    label: 'Alley Dumpster',
    zone: 'bus',
    x: 19,
    y: 25,
    kind: 'dumpster',
    prompt: 'The lid is open. Something inside is still warm.',
    once: true,
    effects: [
      { type: 'battery', amount: 16 },
      { type: 'clue', id: 'alley_batteries', text: 'A handful of loose batteries in a takeaway bag.' },
      { type: 'flag', id: 'found_spare_batteries' }
    ]
  },
  {
    id: 'street_breaker',
    label: 'Streetlight Junction Box',
    zone: 'old-quarter',
    x: 37,
    y: 20,
    kind: 'breaker',
    prompt: 'The junction box has been forced open. The streetlights are waiting for someone to choose.',
    once: true,
    effects: [
      { type: 'power' },
      { type: 'flag', id: 'power_on' },
      { type: 'clue', id: 'power_surge', text: 'The breaker did not trip. Something outside pulled the streetlights dark.' },
      { type: 'time', amount: 3 }
    ]
  },
  {
    id: 'old_line',
    label: 'Old Manhole',
    zone: 'lantern',
    x: 19,
    y: 6,
    kind: 'note',
    prompt: 'A rusted manhole cover hums under your feet. A phone line is tied around its handle.',
    once: true,
    effects: [
      { type: 'clue', id: 'line_in_foundation', text: 'An old phone line runs beneath the road and into the foundation of the house.' },
      { type: 'message', id: 'msg_dad_line' },
      { type: 'flag', id: 'found_old_line' }
    ]
  },
  {
    id: 'shop_window',
    label: 'Shuttered Shop Window',
    zone: 'home-lane',
    x: 35,
    y: 11,
    kind: 'window',
    prompt: 'Behind the shutters, a radio is still playing to an empty shop.',
    once: true,
    effects: [
      { type: 'clue', id: 'radio_voice', text: 'Between stations, a woman repeats: “They are not outside. They are in the line.”' },
      { type: 'message', id: 'msg_radio' },
      { type: 'threat', amount: -1 }
    ]
  },
  {
    id: 'home_photo',
    label: 'Front Porch Photograph',
    zone: 'home-lane',
    x: 39,
    y: 3,
    kind: 'photo',
    prompt: 'A photograph is wedged under the porch rail. The house in it has one more window than the real one.',
    once: true,
    effects: [
      { type: 'clue', id: 'old_house', text: 'A photograph of the house as it looked before the road changed.' },
      { type: 'message', id: 'msg_old_house' },
      { type: 'trust', id: 'jessica', amount: 1 }
    ]
  },
  {
    id: 'home_door',
    label: 'Front Door',
    zone: 'home-lane',
    x: HOME_DOOR.x,
    y: HOME_DOOR.y,
    kind: 'home',
    prompt: 'The house is waiting. The road still owes you four pieces of the truth.',
    effects: []
  }
];

export const interactableById = Object.fromEntries(interactables.map((entry) => [entry.id, entry]));

export const nearestInteractable = (x: number, y: number): InteractableDef | null => {
  let best: { entry: InteractableDef; distance: number } | null = null;
  for (const entry of interactables) {
    const distance = Math.max(Math.abs(entry.x - x), Math.abs(entry.y - y));
    if (distance <= 1 && (!best || distance < best.distance)) best = { entry, distance };
  }
  return best?.entry ?? null;
};

export const lamps = [
  { x: 7, y: 4, color: 0xffb66b, radius: 105 },
  { x: 19, y: 4, color: 0xffb66b, radius: 105 },
  { x: 28, y: 4, color: 0xffb66b, radius: 105 },
  { x: 37, y: 4, color: 0xffcf8f, radius: 105 },
  { x: 43, y: 4, color: 0xffb66b, radius: 105 },
  { x: 7, y: 12, color: 0xffb66b, radius: 105 },
  { x: 16, y: 12, color: 0xffb66b, radius: 105 },
  { x: 25, y: 12, color: 0xa9cad2, radius: 105 },
  { x: 34, y: 12, color: 0xffb66b, radius: 105 },
  { x: 43, y: 12, color: 0xa9cad2, radius: 105 },
  { x: 7, y: 20, color: 0xffb66b, radius: 105 },
  { x: 16, y: 20, color: 0xa9cad2, radius: 105 },
  { x: 25, y: 20, color: 0xffb66b, radius: 105 },
  { x: 34, y: 20, color: 0xffb66b, radius: 105 },
  { x: 43, y: 20, color: 0xa9cad2, radius: 105 },
  { x: 7, y: 28, color: 0xffb66b, radius: 105 },
  { x: 16, y: 28, color: 0xa9cad2, radius: 105 },
  { x: 25, y: 28, color: 0xffb66b, radius: 105 },
  { x: 34, y: 28, color: 0xffb66b, radius: 105 },
  { x: 43, y: 28, color: 0xa9cad2, radius: 105 },
  { x: 4, y: 8, color: 0xa9cad2, radius: 125 },
  { x: 22, y: 8, color: 0xffb66b, radius: 105 },
  { x: 31, y: 16, color: 0xffb66b, radius: 135 },
  { x: 40, y: 24, color: 0xa9cad2, radius: 125 }
];

export const isLitAt = (x: number, y: number, powerOn = true): boolean => {
  if (!powerOn) return false;
  return lamps.some((lamp) => {
    const reach = Math.max(1, lamp.radius / TILE);
    return Math.max(Math.abs(lamp.x - x), Math.abs(lamp.y - y)) <= reach;
  });
};

export const isAlleyTile = (x: number, y: number): boolean => cityRows[y]?.[x] === 'a';

export const shadowSpots = [
  { x: 27, y: 18, stage: 1, side: 'inside' },
  { x: 29, y: 16, stage: 1, side: 'inside' },
  { x: 19, y: 26, stage: 1, side: 'inside' },
  { x: 8, y: 16, stage: 2, side: 'west' },
  { x: 37, y: 9, stage: 2, side: 'inside' },
  { x: 41, y: 24, stage: 2, side: 'east' },
  { x: 5, y: 6, stage: 2, side: 'north' },
  { x: 24, y: 30, stage: 3, side: 'south' },
  { x: 33, y: 16, stage: 3, side: 'inside' },
  { x: 14, y: 22, stage: 3, side: 'inside' },
  { x: 39, y: 30, stage: 3, side: 'inside' },
  { x: 26, y: 6, stage: 4, side: 'inside' },
  { x: 42, y: 22, stage: 4, side: 'east' },
  { x: 10, y: 22, stage: 4, side: 'inside' }
];

export const streetProps = [
  { type: 'car', x: 9, y: 30, color: 0x28353c },
  { type: 'car', x: 36, y: 29, color: 0x3b282a },
  { type: 'car', x: 30, y: 14, color: 0x2b2f36 },
  { type: 'car', x: 42, y: 22, color: 0x343a31 },
  { type: 'bench', x: 28, y: 17, color: 0x4c3929 },
  { type: 'dumpster', x: 19, y: 25, color: 0x2f3b38 },
  { type: 'phone', x: 25, y: 15, color: 0x3a4446 },
  { type: 'car', x: 37, y: 29, color: 0x32282d },
  { type: 'bin', x: 7, y: 18, color: 0x343532 },
  { type: 'hydrant', x: 18, y: 21, color: 0x6d312d },
  { type: 'bin', x: 33, y: 13, color: 0x333735 },
  { type: 'car', x: 41, y: 9, color: 0x2c3238 },
  { type: 'tree', x: 27, y: 16 },
  { type: 'tree', x: 30, y: 18 },
  { type: 'tree', x: 26, y: 19 },
  { type: 'tree', x: 29, y: 19 }
] as const;

export const HOME_CLUES_REQUIRED = 4;

export const homeGlow = { x: HOME_DOOR.x, y: HOME_DOOR.y + 1 };

export const storyEffectsForInteraction = (effects: StoryEffect[]): StoryEffect[] => effects;
