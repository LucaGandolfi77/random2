import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults[0];
if (!vault) throw new Error('No vault content found.');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: reach the plate and stay long enough for a useful tape.
step(sim, { ...idle, moveY: -1 }, 100);
step(sim, idle, 1100);
const rewind = sim.rewind();
if (!rewind.ok) throw new Error(`Rewind failed: ${rewind.reason}`);

// Final run: cross to the door, go through, reach the exit.
step(sim, { ...idle, moveX: 1 }, 115);
step(sim, { ...idle, moveY: -1 }, 230);
step(sim, { ...idle, moveX: 1 }, 25);

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-01.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
