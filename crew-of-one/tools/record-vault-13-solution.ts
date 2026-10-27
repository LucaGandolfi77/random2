import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-13');
if (!vault) throw new Error('vault-13 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: take the vent into the safe room and hold the left plate.
step(sim, { ...idle, moveX: -1 }, 40);
step(sim, { ...idle, moveY: -1 }, 120);
step(sim, { ...idle, moveX: -1 }, 20);
step(sim, idle, 900);
console.log('loop 1', sim.state.status, sim.state.plates[0]?.pressed);
if (!sim.rewind().ok) throw new Error('first rewind failed');

// Echo 2: hold the right plate.
step(sim, { ...idle, moveX: 1 }, 60);
step(sim, { ...idle, moveY: -1 }, 130);
step(sim, idle, 900);
console.log('loop 2', sim.state.status, sim.state.plates[1]?.pressed);
if (!sim.rewind().ok) throw new Error('second rewind failed');

// Echo 3: hold the camera lever.
step(sim, { ...idle, moveX: 1 }, 60);
step(sim, { ...idle, moveY: -1 }, 10);
step(sim, idle, 900);
console.log('loop 3', sim.state.status, sim.state.levers[0]?.pressed);
if (!sim.rewind().ok) throw new Error('third rewind failed');

// Final run: grab the gem, wait for the crew, then take the middle.
step(sim, { ...idle, moveY: -1 }, 10);
step(sim, { ...idle, interact: true }, 1);
step(sim, idle, 210);
step(sim, { ...idle, moveX: 1 }, 10);
step(sim, { ...idle, moveY: -1 }, 250);
console.log('final', sim.state.status, sim.state.gem?.holder, sim.state.doors[1]?.open, sim.state.player, sim.state.cameras[0]?.disabled, sim.state.plates.map((p) => p.pressed));

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-13.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
