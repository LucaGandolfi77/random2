import { describe, expect, it } from 'vitest';
import { dailyPlan, vaults } from '@crew-of-one/content';
import { DAILY_MODIFIER_IDS } from '@crew-of-one/sim';
import { defaultDaily, isModifierId } from '../src/index';

describe('worker daily config', () => {
  it('matches the shared deterministic daily plan', () => {
    for (const date of ['2026-10-27', '2026-11-01', '2027-01-15']) {
      const plan = dailyPlan(date, vaults);
      expect(plan).not.toBeNull();
      if (!plan) continue;
      const config = defaultDaily(date);
      expect(config.dailyId).toBe(date);
      expect(config.vaultId).toBe(plan.baseVault.id);
      expect(config.modifier).toBe(plan.modifier.id);
      expect(config.loopSeconds).toBe(plan.vault.loopSeconds);
      expect(config.maxEchoes).toBe(plan.vault.maxEchoes);
    }
  });

  it('accepts only implemented modifiers', () => {
    for (const modifier of DAILY_MODIFIER_IDS) {
      expect(isModifierId(modifier)).toBe(true);
    }
    expect(isModifierId('standard')).toBe(false);
    expect(isModifierId('nope')).toBe(false);
  });

  it('uses the current UTC date by default', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(defaultDaily().dailyId).toBe(today);
  });
});
