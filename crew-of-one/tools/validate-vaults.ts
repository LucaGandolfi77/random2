import { readFileSync } from 'node:fs';
import { vaults } from '../packages/content/src/index';
import { replayTracks, validateTracks } from '../packages/sim/src/index';
import type { GhostTrack } from '../packages/sim/src/index';

let failures = 0;

for (const vault of vaults) {
  const solutionPath = `packages/content/solutions/${vault.id}.json`;
  try {
    const raw = readFileSync(solutionPath, 'utf8');
    const tracks = JSON.parse(raw) as GhostTrack[];
    const issues = validateTracks(vault, tracks);
    if (issues.length > 0) {
      failures += 1;
      console.error(`FAIL ${vault.id}: tape validation`);
      for (const issue of issues) {
        console.error(`  - ${issue.code}: ${issue.message}`);
      }
      continue;
    }

    const replay = replayTracks(vault, tracks);
    if (!replay.won) {
      failures += 1;
      console.error(`FAIL ${vault.id}: replay did not win`);
      for (const issue of replay.issues) {
        console.error(`  - ${issue.code}: ${issue.message}`);
      }
      continue;
    }

    console.log(
      `PASS ${vault.id}: ${tracks.length} tracks, ${replay.timeMs.toFixed(0)}ms, ${vault.name}`,
    );
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL ${vault.id}: ${message}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} vault(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${vaults.length} vault(s) passed.`);
