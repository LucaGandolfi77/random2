import {
  applyModifier,
  DAILY_MODIFIER_IDS,
  eligibleVaultsForModifier,
  modifierById,
  type ModifierDef,
  type ModifierId,
  type VaultDef,
} from '@crew-of-one/sim';

export type DailyPlan = {
  date: string;
  modifier: ModifierDef;
  baseVault: VaultDef;
  vault: VaultDef;
};

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const utcDate = (now = new Date()): string => now.toISOString().slice(0, 10);

export const dailyPlan = (date: string, vaultList: VaultDef[]): DailyPlan | null => {
  const candidates: Array<{ modifierId: ModifierId; vault: VaultDef }> = [];
  for (const modifierId of DAILY_MODIFIER_IDS) {
    for (const vault of eligibleVaultsForModifier(vaultList, modifierId)) {
      candidates.push({ modifierId, vault });
    }
  }
  if (candidates.length === 0) return null;

  const candidate = candidates[hashString(date) % candidates.length];
  if (!candidate) return null;
  const modifier = modifierById(candidate.modifierId);
  if (!modifier) return null;

  const vault = applyModifier(candidate.vault, candidate.modifierId);
  vault.id = `daily-${date}`;
  vault.name = `Daily · ${candidate.vault.name}`;
  vault.hints = [
    `${modifier.name}: ${modifier.description}`,
    candidate.vault.hints[0] ?? 'You know the vault. Now do it under pressure.',
  ];

  return {
    date,
    modifier,
    baseVault: candidate.vault,
    vault,
  };
};
