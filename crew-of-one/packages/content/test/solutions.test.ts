import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { replayTracks, validateTracks } from '@crew-of-one/sim';
import type { GhostTrack } from '@crew-of-one/sim';
import { vaults } from '../src';

describe('solution tapes', () => {
  for (const vault of vaults) {
    it(`${vault.id} has a verified solution`, () => {
      const raw = readFileSync(
        new URL(`../solutions/${vault.id}.json`, import.meta.url),
        'utf8',
      );
      const tracks = JSON.parse(raw) as GhostTrack[];

      expect(validateTracks(vault, tracks)).toEqual([]);
      const replay = replayTracks(vault, tracks);
      expect(replay.won).toBe(true);
      expect(replay.timeMs).toBeGreaterThan(0);
    });
  }
});
