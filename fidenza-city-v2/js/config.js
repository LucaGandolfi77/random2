export const VERSION = '2.23.1';
export const SAVE_KEY = 'fidenza-da-giocare-v1';

export const COLORS = {
  paper: '#f4ebda',
  ink: '#1b241e',
  green: '#2f4a3c',
  terracotta: '#c2684b',
  gold: '#e7b95a',
  blue: '#4f8fa8'
};

export const WORLD = {
  origin: { lat: 44.8665, lon: 10.0612 },
  mPerDegLat: 111132.0,
  mPerDegLon: 111320.0 * Math.cos(44.8665 * Math.PI / 180),
  // Area giocabile: centro storico + espansione est/sud-est di Coduro.
  bounds: { minX: -1870, maxX: 3730, minZ: -2040, maxZ: 3540 },
  // Aree in cui il terreno viene appiattito sotto la città.
  flat: { minX: -1550, maxX: 2100, minZ: -1650, maxZ: 1750 },
  flatZones: [
    // Tutta l'area giocabile resta a quota 0: case, strade e piazze non
    // possono galleggiare sui rilievi fuori dal vecchio centro.
    { minX: -1870, maxX: 3730, minZ: -2040, maxZ: 3540 }
  ],
  spawn: { x: -312, z: 12, yaw: 1.99 },
  terrain: {
    widthKm: 9.2,
    segments: 260
  },
  sky: {
    dayTop: '#6fa8c8',
    dayBottom: '#d9e6df',
    nightTop: '#0b1320',
    nightBottom: '#20303c',
    sunsetTop: '#5e748e',
    sunsetBottom: '#e8b27b'
  }
};

export const ROAD_STYLE = {
  motorway:      { color: '#3f4447', sidewalk: false },
  trunk:         { color: '#42474a', sidewalk: true },
  primary:       { color: '#4a4f51', sidewalk: true },
  secondary:     { color: '#505557', sidewalk: true },
  tertiary:      { color: '#575c5d', sidewalk: true },
  residential:   { color: '#626666', sidewalk: true },
  living_street: { color: '#6a6d6a', sidewalk: true },
  unclassified:  { color: '#5c6060', sidewalk: true },
  service:       { color: '#777a76', sidewalk: false },
  pedestrian:    { color: '#b9a98e', sidewalk: false },
  footway:       { color: '#bfb29b', sidewalk: false },
  path:          { color: '#a89a80', sidewalk: false },
  cycleway:      { color: '#8d8170', sidewalk: false },
  track:         { color: '#94866f', sidewalk: false },
  steps:         { color: '#b0a28b', sidewalk: false }
};

export const AREA_STYLE = {
  park:      { color: '#6f9a5a', edge: '#5a8149' },
  grass:     { color: '#82a866', edge: '#6d9255' },
  forest:    { color: '#4f7748', edge: '#3f6239' },
  farmland:  { color: '#b3a46f', edge: '#9a8c5c' },
  cemetery:  { color: '#8b9b7b', edge: '#748566' },
  industrial:{ color: '#a4a39a', edge: '#8a8a82' },
  urban:     { color: '#cfc5b2', edge: '#b8ad99' },
  water:     { color: '#4f8fa8', edge: '#3f748a' },
  square:    { color: '#d9c9ad', edge: '#c5b394' },
  parking:   { color: '#777974', edge: '#62645f' },
  school:    { color: '#c2b9a3', edge: '#a99f89' },
  hospital:  { color: '#d7d2c7', edge: '#bdb7aa' },
  platform:  { color: '#b9b3a8', edge: '#9e988d' },
  sport:     { color: '#7fa05c', edge: '#668245' }
};

export const BUILDING_DEFAULTS = {
  wall: '#e4d5bd',
  roof: '#b48b6f',
  church: '#d7c6a8',
  churchRoof: '#9b6b52'
};

export const PLAYER = {
  radius: 0.44,
  height: 1.75,
  walkSpeed: 4.4,
  runSpeed: 8.2,
  acceleration: 34,
  deceleration: 22,
  turnSpeed: 12,
  cameraDistance: 7.8,
  cameraHeight: 2.8,
  cameraMinPitch: -0.05,
  cameraMaxPitch: 0.85,
  flySpeed: 13,
  flyBoost: 30
};

export const VEHICLES = {
  car: {
    name: 'Auto',
    maxSpeed: 24,
    reverseSpeed: 6.5,
    acceleration: 12,
    brake: 20,
    drag: 1.8,
    steer: 1.65,
    radius: 1.35,
    length: 4.1,
    width: 1.85,
    enterRadius: 3.2,
    horn: 392
  },
  vespa: {
    name: 'Vespa',
    maxSpeed: 12.2,
    reverseSpeed: 3.2,
    acceleration: 6.6,
    brake: 12,
    drag: 2.2,
    steer: 2.3,
    radius: 0.85,
    length: 1.85,
    width: 0.8,
    enterRadius: 2.4,
    horn: 523
  },
  bike: {
    name: 'Bici',
    maxSpeed: 8,
    reverseSpeed: 2,
    acceleration: 5.2,
    brake: 10,
    drag: 0.8,
    steer: 2.9,
    radius: 0.5,
    length: 1.7,
    width: 0.75,
    enterRadius: 2.1,
    horn: 880
  }
};

export const SCORE = {
  star: 100,
  place: 250,
  mission: 600,
  missionTimeBonus: 3,
  placeBonus: 100,
  npc: 25
};

export const MISSION_TYPES = {
  ambulance: { icon: '✚', label: 'Ambulanza', color: '#c2684b' },
  chase:     { icon: '➤', label: 'Inseguimento', color: '#9a4a34' },
  pizza:     { icon: '◕', label: 'Pizza in Vespa', color: '#c99a3f' },
  taxi:      { icon: '◈', label: 'Taxi', color: '#3f748a' },
  photo:     { icon: '▣', label: 'Fotografo', color: '#4f7748' },
  pilgrim:   { icon: '✦', label: 'Pellegrino', color: '#8a6a3a' },
  delivery:  { icon: '▤', label: 'Consegna', color: '#3f748a' },
  tour:      { icon: '◈', label: 'Giro turistico', color: '#7a5a8a' },
  train:     { icon: '⇄', label: 'Coincidenza', color: '#3f748a' },
  night:     { icon: '☾', label: 'Notturna', color: '#3a4a6a' },
  bus:       { icon: '▤', label: 'Navetta', color: '#2f6b4f' },
  custom:    { icon: '★', label: 'Personalizzata', color: '#7a5a8a' }
};

export const CONTROLS = {
  desktop: 'WASD muovi · Shift corri · Mouse guarda · E interagisci · F missioni · N mappa · M audio · Esc pausa',
  mobile: 'Levetta per muoverti · trascina per guardare · ▶ per interagire'
};

export const ATTRIBUTION = {
  map: '© OpenStreetMap contributors (ODbL)',
  terrain: 'AWS Open Data — Terrain Tiles (Mapzen / EU-DEM Copernicus)',
  region: '© Regione Emilia-Romagna'
};
