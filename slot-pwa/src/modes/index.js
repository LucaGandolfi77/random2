/* Game-mode registry. The built-in modes are handled directly in main.js. */
import * as tournament from './tournament.js';
import * as rush from './rush.js';
import * as quest from './quest.js';
import * as bonusHunt from './bonus-hunt.js';
import * as boss from './boss.js';
import * as chase from './chase.js';
import * as cascade from './cascade.js';
import * as roulette from './roulette.js';
import * as highRoller from './high-roller.js';

export const EXTRA_MODES = [
  tournament, rush, bonusHunt, boss, chase, cascade, roulette, highRoller, quest,
];
export const MODE_BY_ID = Object.fromEntries(EXTRA_MODES.map((m) => [m.id, m]));
export const getExtraMode = (id) => MODE_BY_ID[id] || null;

export { tournament, rush, quest };
