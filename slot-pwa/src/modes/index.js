/* Game-mode registry. The three built-in modes are handled directly in main.js. */
import * as tournament from './tournament.js';
import * as rush from './rush.js';
import * as quest from './quest.js';

export const EXTRA_MODES = [tournament, rush, quest];
export const MODE_BY_ID = Object.fromEntries(EXTRA_MODES.map((m) => [m.id, m]));
export const getExtraMode = (id) => MODE_BY_ID[id] || null;

export { tournament, rush, quest };
