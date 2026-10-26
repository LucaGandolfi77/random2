import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-03');
if (!vault) throw new Error('vault-03 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: hold plate A for the rest of the loop.
step(sim, { ...idle, moveY: -1 }, 100);
step(sim, idle, 1100);
if (!sim.rewind().ok) throw new Error('first rewind failed');

// Echo 2: hold plate B for the rest of the loop.
step(sim, { ...idle, moveX: 1 }, 115);
step(sim, { ...idle, moveY: -1 }, 100);
step(sim, idle, 885);
if (!sim.rewind().ok) throw new Error('second rewind failed');

// Final run: both plates are held; cross the door and reach the exit.
step(sim, { ...idle, moveX: 1 }, 115);
step(sim, { ...idle, moveY: -1 }, 230);
step(sim, { ...idle, moveX: 1 }, 25);

console.log('result', sim.state.status, 'echoes', sim.state.tracks.length);
if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-03.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
