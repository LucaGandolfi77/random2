import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-15');
if (!vault) throw new Error('vault-15 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: hold the camera lever.
step(sim, { ...idle, moveX: 1 }, 60);
step(sim, { ...idle, moveY: -1 }, 10);
step(sim, idle, 900);
console.log('loop 1', sim.state.status, sim.state.levers[0]?.pressed);
if (!sim.rewind().ok) throw new Error('first rewind failed');

// Echo 2: hold the blackout lever.
step(sim, { ...idle, moveX: -1 }, 60);
step(sim, idle, 900);
console.log('loop 2', sim.state.status, sim.state.levers[1]?.pressed);
if (!sim.rewind().ok) throw new Error('second rewind failed');

// Echo 3: cross the beam window, take the vent, hold the safe-room plate.
step(sim, idle, 84);
step(sim, { ...idle, moveY: -1 }, 53);
step(sim, { ...idle, moveX: -1 }, 40);
step(sim, { ...idle, moveY: -1 }, 68);
step(sim, { ...idle, moveX: -1 }, 20);
step(sim, idle, 900);
console.log('loop 3', sim.state.status, sim.state.plates[0]?.pressed);
if (!sim.rewind().ok) throw new Error('third rewind failed');

// Echo 4: cross the beam window and hold the right plate.
step(sim, { ...idle, moveX: 1 }, 60);
step(sim, idle, 24);
step(sim, { ...idle, moveY: -1 }, 130);
step(sim, idle, 900);
console.log('loop 4', sim.state.status, sim.state.plates[1]?.pressed);
if (!sim.rewind().ok) throw new Error('fourth rewind failed');

// Final run: take the gem, wait for the crew and the beam, then dash through.
step(sim, { ...idle, moveY: -1 }, 10);
step(sim, { ...idle, interact: true }, 1);
step(sim, { ...idle, moveX: 1 }, 10);
step(sim, idle, 243);
step(sim, { ...idle, moveY: -1, dash: true }, 20);
step(sim, { ...idle, moveY: -1 }, 180);
console.log(
  'final',
  sim.state.status,
  sim.state.gem?.holder,
  sim.state.levers.map((lever) => lever.pressed),
  sim.state.plates.map((plate) => plate.pressed),
  sim.state.player,
);

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-15.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
