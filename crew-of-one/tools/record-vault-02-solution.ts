import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-02');
if (!vault) throw new Error('vault-02 not found');

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

const sim = new HeistSim(vault);

// Echo 1: walk into the guard's light, then rewind before the alarm.
step(sim, { ...idle, moveY: -1 }, 100);
console.log('loop 1', sim.state.status, sim.state.guards[0]?.suspicion, sim.state.guards[0]?.mode);
const rewind = sim.rewind();
if (!rewind.ok) throw new Error(`Rewind failed: ${rewind.reason}`);

// Final run: use the echo as a decoy, slip through the gap, reach the exit.
step(sim, { ...idle, moveY: -1 }, 125);
step(sim, { ...idle, moveX: 1 }, 95);
step(sim, { ...idle, moveY: -1 }, 105);
step(sim, { ...idle, moveX: 1 }, 45);
console.log('loop 2', sim.state.status, sim.state.guards[0]?.mode, sim.state.guards[0]?.suspicion);

if (sim.state.status !== 'won') {
  throw new Error(`Solution failed: ${sim.state.status}`);
}

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-02.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
