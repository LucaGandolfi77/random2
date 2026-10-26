import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-06');
if (!vault) throw new Error('vault-06 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: hold the plate under the laser corridor.
step(sim, { ...idle, moveX: 1 }, 120);
step(sim, idle, 1080);
console.log('loop 1', sim.state.status, sim.state.plates[0]?.pressed);
if (!sim.rewind().ok) throw new Error('rewind failed');

// Final run: cross to the plate, wait for the beams to blink off, dash through.
step(sim, { ...idle, moveX: 1 }, 120);
step(sim, { ...idle, moveY: -1 }, 43);
step(sim, idle, 29);
step(sim, { ...idle, moveY: -1, dash: true }, 18);
step(sim, { ...idle, moveY: -1 }, 144);
step(sim, { ...idle, moveX: 1 }, 20);
console.log('loop 2', sim.state.status, sim.state.lasers.map((laser) => laser.active));

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-06.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
