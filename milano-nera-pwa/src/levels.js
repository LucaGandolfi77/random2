const wall = (x, y, w, h) => ({ x, y, w, h, solid: true, sight: true });
const cover = (type, x, y, w, h, extra = {}) => ({
  type,
  x,
  y,
  w,
  h,
  solid: true,
  cover: true,
  sight: true,
  ...extra
});
const sign = (axis, x, y, w, h, extra = {}) => ({
  type: 'sign',
  axis,
  x,
  y,
  w,
  h,
  solid: false,
  cover: false,
  sight: false,
  sign: true,
  ...extra
});
const decor = (type, x, y, w, h, extra = {}) => ({
  type,
  x,
  y,
  w,
  h,
  solid: false,
  cover: false,
  sight: false,
  decor: true,
  ...extra
});
const enemy = (type, x, y, angle = 0, patrol = null, extra = {}) => ({
  type,
  x,
  y,
  angle,
  patrol,
  ...extra
});

const CASA_WALLS = [
  wall(0, 0, 640, 16),
  wall(0, 344, 640, 16),
  wall(0, 0, 16, 360),
  wall(624, 0, 16, 360),
  wall(200, 16, 16, 118),
  wall(200, 218, 16, 126),
  wall(400, 16, 16, 86),
  wall(400, 188, 16, 156),
  wall(520, 110, 16, 160),
  wall(216, 148, 84, 12),
  wall(430, 96, 64, 12)
];

const CASA = {
  id: 'casa',
  width: 640,
  height: 360,
  theme: 'casa',
  title: 'La Casa Chiusa',
  start: { x: 44, y: 304 },
  walls: CASA_WALLS,
  props: [
    cover('sofa', 60, 192, 52, 20, { color: 'red' }),
    cover('bar', 248, 270, 104, 16),
    cover('table', 432, 254, 54, 18),
    cover('crate', 474, 302, 22, 22),
    cover('crate', 560, 290, 24, 22),
    cover('piano', 300, 42, 48, 20, { color: 'dark' }),
    sign('v', 198, 176, 8, 28, { neon: '#ff7a57', text: 'HOTEL' }),
    sign('h', 448, 108, 34, 8, { neon: '#ffcb67', text: 'CLUB' }),
    sign('v', 512, 26, 8, 30, { neon: '#74e1d2', text: 'BAR' }),
    decor('rug', 240, 200, 120, 54, { color: '#5d2628' }),
    decor('rug', 448, 170, 82, 48, { color: '#5d2628' })
  ],
  enemies: [
    enemy('thug', 128, 250, 0, [[128, 250], [160, 300], [100, 300]]),
    enemy('gunman', 318, 110, 0.3, [[318, 110], [330, 200], [300, 220]]),
    enemy('thug', 440, 300, Math.PI, [[440, 300], [500, 300], [500, 250]]),
    enemy('gunman', 564, 164, -1.1, [[564, 164], [564, 250], [590, 250]]),
    enemy('smg', 300, 300, -0.7, [[300, 300], [370, 210]]),
    enemy('gunman', 86, 106, 0.1, [[86, 106], [160, 80]])
  ],
  pickups: [
    { type: 'smg', x: 334, y: 308 },
    { type: 'health', x: 586, y: 250 }
  ],
  objective: {
    type: 'collect',
    x: 566,
    y: 70,
    label: 'Recupera il nastro',
    item: 'nastro'
  },
  exit: { x: 584, y: 314, w: 30, h: 26 },
  parTime: 95
};

const TORRE_WALLS = [
  wall(0, 0, 640, 16),
  wall(0, 344, 640, 16),
  wall(0, 0, 16, 360),
  wall(624, 0, 16, 360),
  wall(180, 16, 16, 118),
  wall(180, 214, 16, 130),
  wall(380, 16, 16, 88),
  wall(380, 172, 16, 172),
  wall(500, 118, 16, 190),
  wall(520, 174, 104, 12),
  wall(220, 118, 96, 12)
];

const TORRE = {
  id: 'torre',
  width: 640,
  height: 360,
  theme: 'torre',
  title: 'Torre Velasca',
  start: { x: 42, y: 306 },
  walls: TORRE_WALLS,
  props: [
    cover('desk', 238, 262, 88, 18),
    cover('desk', 292, 158, 66, 18),
    cover('desk', 86, 156, 62, 18),
    cover('desk', 460, 270, 100, 18),
    cover('pillar', 460, 92, 18, 34),
    cover('pillar', 552, 118, 18, 34),
    cover('plant', 110, 280, 18, 18),
    cover('plant', 574, 282, 18, 18),
    sign('h', 220, 244, 48, 8, { neon: '#75e3c4', text: 'VELASCA' }),
    sign('v', 372, 232, 8, 32, { neon: '#f5d37a', text: '30' }),
    decor('rug', 410, 206, 90, 40, { color: '#29494c' }),
    decor('rug', 226, 78, 100, 44, { color: '#29494c' })
  ],
  enemies: [
    enemy('gunman', 126, 250, 0.2, [[126, 250], [126, 300], [160, 300]]),
    enemy('smg', 300, 82, 1.4, [[300, 82], [330, 50], [330, 140]]),
    enemy('thug', 250, 310, -0.4, [[250, 310], [340, 310]]),
    enemy('gunman', 560, 304, -0.8, [[560, 304], [560, 250], [540, 250]]),
    enemy('sniper', 586, 62, 2.4),
    enemy('boss', 548, 76, 2.4, null, { boss: true })
  ],
  pickups: [
    { type: 'revolver', x: 300, y: 206 },
    { type: 'health', x: 138, y: 62 }
  ],
  objective: {
    type: 'boss',
    label: 'Elimina Il Ragioniere',
    boss: 'Il Ragioniere'
  },
  exit: { x: 596, y: 20, w: 24, h: 30 },
  parTime: 125
};

const DARSENA_WALLS = [
  wall(0, 0, 520, 16),
  wall(0, 284, 520, 16),
  wall(0, 0, 16, 300),
  wall(504, 0, 16, 300),
  wall(150, 62, 16, 96),
  wall(150, 212, 16, 88),
  wall(342, 16, 16, 80),
  wall(342, 150, 16, 150)
];

const DARSENA = {
  id: 'darsena',
  width: 520,
  height: 300,
  theme: 'darsena',
  title: 'Darsena',
  start: { x: 38, y: 246 },
  walls: DARSENA_WALLS,
  props: [
    cover('container', 226, 190, 78, 30, { color: 'red' }),
    cover('container', 390, 196, 82, 30, { color: 'teal' }),
    cover('crate', 94, 132, 22, 22),
    cover('crate', 250, 88, 24, 22),
    cover('crate', 436, 74, 22, 22),
    cover('car', 380, 238, 56, 24, { color: 'dark' }),
    sign('v', 334, 100, 8, 30, { neon: '#ff5d4f', text: 'NAVIGLI' }),
    sign('h', 180, 40, 42, 8, { neon: '#f5d37a', text: 'DARSENA' }),
    decor('water', 16, 16, 120, 40, { color: '#122630' })
  ],
  enemies: [
    enemy('gunman', 240, 232, -0.2, [[240, 232], [336, 232]]),
    enemy('smg', 414, 116, 2.8),
    enemy('thug', 90, 210, 0, [[90, 210], [120, 90]]),
    enemy('finalBoss', 430, 130, 2.6, null, { boss: true, final: true })
  ],
  pickups: [
    { type: 'revolver', x: 250, y: 120 },
    { type: 'health', x: 70, y: 70 },
    { type: 'molotov', x: 410, y: 248 }
  ],
  objective: {
    type: 'boss',
    label: 'Chiudi i conti con Il Bianco',
    boss: 'Il Bianco',
    autoComplete: true
  },
  exit: null,
  parTime: 160
};


const METRO_WALLS = [
  wall(0, 0, 640, 16),
  wall(0, 344, 640, 16),
  wall(0, 0, 16, 360),
  wall(624, 0, 16, 360),
  wall(170, 16, 16, 100),
  wall(170, 230, 16, 114),
  wall(300, 16, 16, 78),
  wall(300, 190, 16, 154),
  wall(470, 16, 16, 130),
  wall(470, 250, 16, 94),
  wall(186, 250, 80, 12),
  wall(316, 96, 90, 12)
];

const METRO = {
  id: 'metro',
  width: 640,
  height: 360,
  theme: 'metro',
  title: 'Metrò',
  start: { x: 40, y: 304 },
  walls: METRO_WALLS,
  props: [
    cover('bench', 74, 200, 56, 18),
    cover('bench', 224, 292, 54, 18),
    cover('pillar', 246, 104, 18, 30),
    cover('pillar', 418, 194, 18, 30),
    cover('ticket', 88, 112, 42, 22),
    cover('crate', 552, 250, 24, 22),
    sign('v', 164, 160, 8, 30, { neon: '#8ef0d0', text: 'M1' }),
    sign('h', 370, 196, 44, 8, { neon: '#f3d27a', text: 'BINARIO 7' }),
    decor('tiles', 186, 140, 300, 34, { color: '#1b2a33' }),
    decor('rug', 72, 270, 86, 44, { color: '#22323a' })
  ],
  hazards: [
    { type: 'train', y: 142, height: 30, direction: -1, period: 7.6, warnTime: 2.0, activeTime: 1.25, phase: 1.2, label: 'Treno merci' }
  ],
  enemies: [
    enemy('shotgunner', 138, 228, 0.3, [[138, 228], [210, 228]]),
    enemy('smg', 236, 270, 1.2, [[236, 270], [270, 220]]),
    enemy('gunman', 356, 122, 0.1, [[356, 122], [430, 140]]),
    enemy('thug', 536, 252, Math.PI, [[536, 252], [574, 210]]),
    enemy('shotgunner', 520, 162, -1.2, [[520, 162], [430, 162]]),
    enemy('dog', 556, 80, 2.8)
  ],
  pickups: [
    { type: 'lupara', x: 400, y: 288 },
    { type: 'health', x: 66, y: 64 }
  ],
  objective: {
    type: 'collect',
    x: 552,
    y: 70,
    label: 'Recupera il registro',
    item: 'registro'
  },
  exit: { x: 584, y: 314, w: 30, h: 26 },
  parTime: 110
};

const PARCO_WALLS = [
  wall(0, 0, 640, 16),
  wall(0, 344, 640, 16),
  wall(0, 0, 16, 360),
  wall(624, 0, 16, 360),
  wall(150, 58, 18, 108),
  wall(150, 210, 18, 92),
  wall(340, 16, 18, 108),
  wall(340, 178, 18, 166),
  wall(500, 96, 18, 170),
  wall(18, 100, 82, 12),
  wall(368, 92, 70, 12),
  wall(518, 266, 88, 12)
];

const PARCO = {
  id: 'parco',
  width: 640,
  height: 360,
  theme: 'parco',
  title: 'Parco Lambro',
  weather: 'rain',
  start: { x: 40, y: 300 },
  walls: PARCO_WALLS,
  props: [
    cover('fountain', 236, 150, 76, 56, { color: 'teal' }),
    cover('bench', 82, 210, 56, 18),
    cover('bench', 430, 232, 56, 18),
    cover('kiosk', 524, 160, 54, 30, { color: 'red' }),
    cover('crate', 214, 284, 24, 22),
    cover('car', 420, 290, 56, 24, { color: 'dark' }),
    sign('v', 334, 70, 8, 30, { neon: '#f3d27a', text: 'LAMBRO' }),
    sign('h', 172, 178, 42, 8, { neon: '#8ef0d0', text: 'PARCHEGGIO' }),
    decor('water', 222, 140, 104, 74, { color: '#153029' }),
    decor('puddle', 300, 260, 64, 18, { color: '#1b2d31' }),
    decor('puddle', 96, 150, 42, 12, { color: '#1b2d31' })
  ],
  enemies: [
    enemy('dog', 210, 248, 0, [[210, 248], [300, 248]]),
    enemy('dog', 386, 268, 2.8),
    enemy('gunman', 208, 122, 0.4, [[208, 122], [280, 122]]),
    enemy('shotgunner', 468, 210, -0.6, [[468, 210], [550, 210]]),
    enemy('sniper', 584, 214, 2.5),
    enemy('iena', 540, 84, 2.6, null, { boss: true })
  ],
  pickups: [
    { type: 'lupara', x: 306, y: 304 },
    { type: 'health', x: 74, y: 64 },
    { type: 'molotov', x: 492, y: 302 }
  ],
  objective: {
    type: 'boss',
    label: 'Elimina La Iena',
    boss: 'La Iena'
  },
  exit: { x: 584, y: 312, w: 30, h: 26 },
  parTime: 130
};

export const LEVELS = { casa: CASA, torre: TORRE, metro: METRO, parco: PARCO, darsena: DARSENA };

export const CHASE = {
  width: 384,
  height: 216,
  roadLeft: 68,
  roadRight: 316,
  playerY: 164,
  playerSpeed: 92,
  enemyHp: 24,
  trafficEvery: 1.25,
  trafficSpeed: 78,
  enemyFireEvery: 1.45,
  parTime: 45
};
