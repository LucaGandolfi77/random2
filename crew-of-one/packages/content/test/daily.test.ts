import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyModifier,
  DAILY_MODIFIER_IDS,
  eligibleVaultsForModifier,
  replayTracks,
  type GhostTrack,
  type ModifierId,
} from '@crew-of-one/sim';
import { dailyPlan, utcDate, vaults } from '../src';

const solutionFor = (vaultId: string): GhostTrack[] =>
  JSON.parse(
    readFileSync(new URL(`../solutions/${vaultId}.json`, import.meta.url), 'utf8'),
  ) as GhostTrack[];

describe('daily heist plan', () => {
  it('is deterministic for a UTC date', () => {
    const date = '2026-10-27';
    const first = dailyPlan(date, vaults);
    const second = dailyPlan(date, vaults);
    expect(first?.vault.id).toBe(`daily-${date}`);
    expect(first?.modifier.id).toBe(second?.modifier.id);
    expect(first?.baseVault.id).toBe(second?.baseVault.id);
  });

  it('returns a plan for today', () => {
    const plan = dailyPlan(utcDate(), vaults);
    expect(plan).not.toBeNull();
    expect(plan?.vault.name.startsWith('Daily · ')).toBe(true);
  });

  it('keeps every generated daily solvable with an existing tape', () => {
    for (const modifierId of DAILY_MODIFIER_IDS) {
      for (const base of eligibleVaultsForModifier(vaults, modifierId)) {
        const tracks = solutionFor(base.id);
        const modified = applyModifier(base, modifierId);
        const result = replayTracks(modified, tracks);
        expect(result.won, `${base.id} + ${modifierId}`).toBe(true);
        expect(tracks.length - 1).toBeLessThanOrEqual(modified.maxEchoes);
        expect(result.timeMs).toBeLessThanOrEqual(modified.loopSeconds * 1000);
        if (modifierId === 'no-dash') {
          const usedDash = tracks.some((track) =>
            track.frames.some((frame) => frame.anim === 'dash'),
          );
          expect(usedDash).toBe(false);
        }
      }
    }
  });

  it('never selects a modifier that cannot be applied to the vault', () => {
    const seen = new Set<ModifierId>();
    for (let day = 1; day <= 28; day += 1) {
      const date = `2026-11-${String(day).padStart(2, '0')}`;
      const plan = dailyPlan(date, vaults);
      expect(plan).not.toBeNull();
      if (!plan) continue;
      seen.add(plan.modifier.id);
      expect(plan.modifier.eligible(plan.baseVault)).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(0);
  });
});
