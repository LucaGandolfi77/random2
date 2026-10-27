import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-12');
if (!vault) throw new Error('vault-12 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: hit the left relay.
step(sim, { ...idle, moveX: -1 }, 60);
step(sim, { ...idle, moveY: -1 }, 80);
step(sim, { ...idle, interact: true }, 1);
step(sim, idle, 600);
console.log('loop 1', sim.state.status, sim.state.levers.map((lever) => lever.pressed));
if (!sim.rewind().ok) throw new Error('first rewind failed');

// Echo 2: hit the right relay.
step(sim, { ...idle, moveX: 1 }, 60);
step(sim, { ...idle, moveY: -1 }, 80);
step(sim, { ...idle, interact: true }, 1);
step(sim, idle, 600);
console.log(
  'loop 2',
  sim.state.status,
  sim.state.levers.map((lever) => lever.pressed),
  sim.state.doors[0]?.open,
);
if (!sim.rewind().ok) throw new Error('second rewind failed');

// Final run: wait for the overlap, then take the middle corridor.
step(sim, idle, 190);
step(sim, { ...idle, moveY: -1 }, 230);
console.log('final', sim.state.status, sim.state.doors[0]?.open, sim.state.player);

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-12.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
