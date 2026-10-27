import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-14');
if (!vault) throw new Error('vault-14 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: hold the plate that keeps the vault door open.
step(sim, { ...idle, moveX: 1 }, 60);
step(sim, { ...idle, moveY: -1 }, 10);
step(sim, idle, 800);
console.log('loop 1', sim.state.status, sim.state.plates[0]?.pressed);
if (!sim.rewind().ok) throw new Error('first rewind failed');

// Echo 2: hold the lower beam offline.
step(sim, { ...idle, moveX: -1 }, 60);
step(sim, { ...idle, moveY: -1 }, 10);
step(sim, idle, 800);
console.log('loop 2', sim.state.status, sim.state.levers[0]?.pressed);
if (!sim.rewind().ok) throw new Error('second rewind failed');

// Final run: approach the upper beam, wait for the off window, dash through.
step(sim, idle, 120);
step(sim, { ...idle, moveY: -1 }, 68);
step(sim, idle, 22);
step(sim, { ...idle, moveY: -1, dash: true }, 20);
step(sim, { ...idle, moveY: -1 }, 150);
console.log(
  'final',
  sim.state.status,
  sim.state.lasers.map((laser) => laser.active),
  sim.state.player,
);

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-14.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
