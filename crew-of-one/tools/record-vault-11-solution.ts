import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-11');
if (!vault) throw new Error('vault-11 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: take the power lever and hold the lights down.
step(sim, { ...idle, moveX: -1 }, 30);
step(sim, { ...idle, moveY: -1 }, 10);
step(sim, idle, 700);
console.log('loop 1', sim.state.status, sim.state.levers[0]?.pressed, sim.state.guards[0]?.visionRange);
if (!sim.rewind().ok) throw new Error('rewind failed');

// Final run: let the echo kill the lights, then cross the gap.
step(sim, idle, 50);
step(sim, { ...idle, moveX: 1 }, 40);
step(sim, { ...idle, moveY: -1 }, 230);
console.log('final', sim.state.status, sim.state.guards[0]?.visionRange, sim.state.player);

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-11.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
