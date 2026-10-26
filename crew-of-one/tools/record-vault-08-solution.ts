import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-08');
if (!vault) throw new Error('vault-08 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: hold the left plate.
step(sim, { ...idle, moveX: -1 }, 50);
step(sim, { ...idle, moveY: -1 }, 100);
step(sim, idle, 1050);
console.log('loop 1', sim.state.status, sim.state.plates[0]?.pressed);
if (!sim.rewind().ok) throw new Error('first rewind failed');

// Echo 2: hold the right plate.
step(sim, { ...idle, moveX: 1 }, 50);
step(sim, { ...idle, moveY: -1 }, 100);
step(sim, idle, 1050);
console.log('loop 2', sim.state.status, sim.state.plates[1]?.pressed);
if (!sim.rewind().ok) throw new Error('second rewind failed');

// Final run: both doors are open. Grab the gem, take it through the exit.
step(sim, { ...idle, moveX: -1 }, 30);
step(sim, { ...idle, moveY: -1 }, 230);
step(sim, { ...idle, moveX: -1 }, 10);
sim.tick({ ...idle, interact: true });
console.log('gem holder', sim.state.gem?.holder);
step(sim, { ...idle, moveY: 1 }, 230);
step(sim, { ...idle, moveX: 1 }, 90);
step(sim, { ...idle, moveY: -1 }, 230);
step(sim, { ...idle, moveX: 1 }, 20);
console.log('loop 3', sim.state.status, sim.state.gem?.holder, sim.state.player.carryingGem);

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-08.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
