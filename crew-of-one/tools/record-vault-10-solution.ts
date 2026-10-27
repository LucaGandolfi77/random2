import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-10');
if (!vault) throw new Error('vault-10 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: hold the left plate.
step(sim, { ...idle, moveX: -1 }, 60);
step(sim, { ...idle, moveY: -1 }, 120);
step(sim, idle, 700);
console.log('loop 1', sim.state.status, sim.state.plates[0]?.pressed, sim.state.plates[1]?.pressed);
if (!sim.rewind().ok) throw new Error('first rewind failed');

// Echo 2: hold the right plate.
step(sim, { ...idle, moveX: 1 }, 60);
step(sim, { ...idle, moveY: -1 }, 120);
step(sim, idle, 700);
console.log('loop 2', sim.state.status, sim.state.plates[0]?.pressed, sim.state.plates[1]?.pressed);
if (!sim.rewind().ok) throw new Error('second rewind failed');

// Echo 3: hold the camera lever.
step(sim, { ...idle, moveX: -1 }, 60);
step(sim, { ...idle, moveY: -1 }, 30);
step(sim, idle, 700);
console.log(
  'loop 3',
  sim.state.status,
  sim.state.levers[0]?.pressed,
  sim.state.cameras[0]?.disabled,
);
if (!sim.rewind().ok) throw new Error('third rewind failed');

// Final run: wait for all three echoes, then walk the middle corridor.
step(sim, idle, 200);
step(sim, { ...idle, moveY: -1 }, 260);
console.log('final', sim.state.status, sim.state.doors[0]?.open, sim.state.cameras[0]?.disabled);

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-10.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
