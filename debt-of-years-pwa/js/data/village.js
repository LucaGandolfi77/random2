export const MAP_SIZE = { width: 720, height: 1600 };

export const PLAYER_START = { x: 360, y: 1205 };

export const RIVER = { x: 693, y: 800, w: 54, h: 1600 };

export const FENCE = { x: 360, y: 1268, w: 720, h: 24 };

export const BUILDINGS = [
  { id: 'gate', type: 'gate', x: 360, y: 105, w: 660, h: 90, label: 'THE GATE', labelY: 132, solid: true },
  { id: 'bakery', type: 'bakery', x: 155, y: 355, w: 190, h: 130, label: 'BAKERY', labelY: 406, solid: true },
  { id: 'dock', type: 'dock', x: 615, y: 335, w: 100, h: 70, label: 'THE DOCK', labelY: 356, solid: false },
  { id: 'charter', type: 'archive', x: 600, y: 225, w: 130, h: 80, label: 'CHARTER HOUSE', labelY: 278, solid: true },
  { id: 'well', type: 'well', x: 145, y: 640, w: 70, h: 70, label: 'THE WELL', labelY: 661, solid: true },
  { id: 'chapel', type: 'chapel', x: 565, y: 700, w: 170, h: 170, label: 'CHAPEL', labelY: 771, solid: true },
  { id: 'mayor', type: 'house', x: 160, y: 900, w: 190, h: 140, label: 'THE ALDERMAN', labelY: 956, solid: true },
  { id: 'shop', type: 'shop', x: 575, y: 970, w: 150, h: 120, label: 'SEAMSTRESS', labelY: 1016, solid: true },
  { id: 'nel-house', type: 'ribbon-house', x: 320, y: 1030, w: 140, h: 100, label: 'NEL\'S HOUSE', labelY: 1066, solid: true }
];

export const ROADS = [
  { x: 360, y: 700, w: 64, h: 1100 },
  { x: 258, y: 470, w: 206, h: 44 },
  { x: 488, y: 455, w: 256, h: 44 },
  { x: 252, y: 725, w: 216, h: 40 },
  { x: 463, y: 825, w: 206, h: 40 },
  { x: 260, y: 1020, w: 200, h: 40 },
  { x: 468, y: 1090, w: 216, h: 40 },
  { x: 235, y: 1155, w: 250, h: 40 }
];

export const VILLAGER_POSITIONS = {
  maren: { x: 155, y: 475 },
  ivo: { x: 610, y: 430 },
  wick: { x: 145, y: 715 },
  sable: { x: 480, y: 230 },
  mayor: { x: 160, y: 1020 },
  nessa: { x: 625, y: 855 },
  tomas: { x: 240, y: 230 },
  lira: { x: 575, y: 1085 },
  nel: { x: 320, y: 1130 },
  perrin: { x: 435, y: 1130 },
  joss: { x: 655, y: 520 },
  ottil: { x: 535, y: 285 },
  orin: { x: 505, y: 795 }
};

export const LOCATIONS = [
  {
    id: 'gate',
    kind: 'gate',
    x: 360,
    y: 260,
    radius: 105,
    label: 'The Gate',
    prompt: 'Open the gate'
  },
  {
    id: 'road',
    kind: 'road',
    x: 110,
    y: 1150,
    radius: 95,
    label: 'The Road',
    prompt: 'Walk the road',
    labelY: 1108
  },
  {
    id: 'chapel',
    kind: 'chapel',
    x: 565,
    y: 805,
    radius: 55,
    label: 'The Chapel',
    prompt: 'Enter the chapel'
  },
  {
    id: 'charter',
    kind: 'charter',
    x: 600,
    y: 280,
    radius: 55,
    label: 'The Charter House',
    prompt: 'Enter the Charter House'
  },
  {
    id: 'ferry',
    kind: 'ferry',
    x: 655,
    y: 520,
    radius: 55,
    label: 'The Ferry',
    prompt: 'Speak to the ferryman'
  }
];

export const OBSTACLES = [
  ...BUILDINGS.filter((building) => building.solid).map((building) => ({
    x: building.x,
    y: building.y,
    w: building.w,
    h: building.h
  })),
  RIVER,
  FENCE
];
