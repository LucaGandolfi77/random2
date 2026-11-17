/* Machine registry. Order defines lobby order and unlock ladder. */
import luckySeven from './lucky-seven.js';
import pharaoh from './pharaoh.js';
import nebula from './nebula.js';
import sugarRush from './sugar-rush.js';
import vault from './vault.js';
import atlantis from './atlantis.js';
import samurai from './samurai.js';
import retro777 from './retro-777.js';
import barBlu from './bar-blu.js';
import giroBar from './giro-bar.js';
import armata from './armata.js';
import sinibbio from './sinibbio.js';
import agente from './agente.js';
import principina from './principina.js';
import cristallo from './cristallo.js';

export const MACHINES = [
  luckySeven, retro777, barBlu, giroBar, pharaoh, nebula, sugarRush,
  vault, atlantis, samurai, armata, sinibbio, agente, principina, cristallo,
];

export const MACHINE_BY_ID = Object.fromEntries(MACHINES.map((m) => [m.id, m]));

export function getMachine(id) {
  return MACHINE_BY_ID[id] || MACHINES[0];
}

export function isUnlocked(machine, vip) {
  return vip >= (machine.unlockLevel || 1);
}

export function unlockedMachines(vip) {
  return MACHINES.filter((m) => isUnlocked(m, vip));
}
