import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { vaults } from '../packages/content/src/index';
import { HeistSim } from '../packages/sim/src/index';
import type { SimInput } from '../packages/sim/src/index';

const vault = vaults.find((candidate) => candidate.id === 'vault-09');
if (!vault) throw new Error('vault-09 not found');

export const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };
export const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};
export const snapshot = (sim: HeistSim, label: string): void => {
  console.log(
    label,
    'status=' + sim.state.status,
    'player=' + sim.state.player.x.toFixed(0) + ',' + sim.state.player.y.toFixed(0),
    sim.state.guards
      .map(
        (guard) =>
          `${guard.id}:${guard.mode}@${guard.x.toFixed(0)},${guard.y.toFixed(0)} face${guard.facing} sus${guard.suspicion.toFixed(2)}`,
      )
      .join(' | '),
  );
};

const sim = new HeistSim(vault);

// Echo 1: pull the lower watch into the bottom-right corner and keep him moving.
step(sim, { ...idle, moveX: 1 }, 70);
step(sim, { ...idle, moveY: -1 }, 15);
step(sim, { ...idle, moveX: 1 }, 60);
step(sim, { ...idle, moveY: 1 }, 20);
step(sim, { ...idle, moveX: -1 }, 120);
step(sim, { ...idle, moveY: -1 }, 20);
step(sim, { ...idle, moveX: 1 }, 120);
step(sim, { ...idle, moveY: 1 }, 20);
step(sim, { ...idle, moveX: -1 }, 120);
step(sim, { ...idle, moveY: -1 }, 20);
step(sim, { ...idle, moveX: 1 }, 120);
step(sim, { ...idle, moveY: 1 }, 20);
step(sim, { ...idle, moveX: -1 }, 120);
snapshot(sim, 'echo1 done');
if (!sim.rewind().ok) throw new Error('first rewind failed');

// Echo 2: slip through the lower gap while the lower watch is busy, then pull the upper watch.
step(sim, { ...idle, moveX: 1 }, 70);
step(sim, { ...idle, moveY: -1 }, 92);
step(sim, { ...idle, moveX: 1 }, 56);
step(sim, { ...idle, moveY: 1 }, 20);
step(sim, { ...idle, moveX: -1 }, 110);
step(sim, { ...idle, moveY: -1 }, 40);
step(sim, { ...idle, moveX: 1 }, 110);
step(sim, { ...idle, moveY: 1 }, 20);
step(sim, { ...idle, moveX: -1 }, 110);
step(sim, { ...idle, moveY: -1 }, 40);
step(sim, { ...idle, moveX: 1 }, 110);
snapshot(sim, 'echo2 done');
if (!sim.rewind().ok) throw new Error('second rewind failed');

// Final run.
step(sim, idle, 60);
step(sim, { ...idle, moveX: 1 }, 70);
step(sim, { ...idle, moveY: -1 }, 240);
snapshot(sim, 'final step');

if (sim.state.status !== 'won') throw new Error(`Solution failed: ${sim.state.status}`);

const submission = sim.getSubmission();
const output = 'packages/content/solutions/vault-09.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(submission.tracks, null, 2)}\n`);
console.log(`Wrote ${output}: ${submission.tracks.length} tracks, ${submission.timeMs.toFixed(0)}ms`);
