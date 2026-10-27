import type { VaultDef } from './types';

export type ModifierId = 'fog' | 'short-loop' | 'no-dash' | 'one-echo' | 'fast-guards';

export type ModifierDef = {
  id: ModifierId;
  name: string;
  description: string;
  eligible: (vault: VaultDef) => boolean;
};

export const MODIFIERS: ModifierDef[] = [
  {
    id: 'fog',
    name: 'Blackout',
    description: 'Vision cones are hidden. Read the guards and cameras by their bodies.',
    eligible: (vault) => vault.guards.length > 0 || vault.cameras.length > 0,
  },
  {
    id: 'short-loop',
    name: 'Short Fuse',
    description: 'The loop is ten seconds shorter. Move like you mean it.',
    eligible: () => true,
  },
  {
    id: 'no-dash',
    name: 'No Sprint',
    description: 'The dash is offline. Time every crossing on foot.',
    eligible: (vault) => vault.lasers.length === 0,
  },
  {
    id: 'one-echo',
    name: 'Solo Loop',
    description: 'One echo only. Make the first recording count.',
    eligible: (vault) => vault.parEchoes <= 1,
  },
  {
    id: 'fast-guards',
    name: 'Double Time',
    description: 'Guards patrol faster and see farther.',
    eligible: (vault) => vault.guards.length > 0,
  },
];

/** Modifiers that can be safely generated for the daily heist. */
export const DAILY_MODIFIER_IDS: ModifierId[] = ['fog', 'short-loop', 'no-dash', 'one-echo'];

export const modifierById = (id: ModifierId): ModifierDef | undefined =>
  MODIFIERS.find((modifier) => modifier.id === id);

const cloneVault = (vault: VaultDef): VaultDef => ({
  ...vault,
  playerStart: { ...vault.playerStart },
  exit: { ...vault.exit },
  walls: vault.walls.map((wall) => ({ ...wall })),
  plates: vault.plates.map((plate) => ({ ...plate, targets: [...plate.targets] })),
  doors: vault.doors.map((door) => ({ ...door })),
  guards: vault.guards.map((guard) => ({
    ...guard,
    path: guard.path.map((point) => ({ ...point })),
  })),
  cameras: vault.cameras.map((camera) => ({ ...camera })),
  levers: vault.levers.map((lever) => ({ ...lever, targetIds: [...lever.targetIds] })),
  lasers: vault.lasers.map((laser) => ({ ...laser })),
  gem: vault.gem ? { ...vault.gem } : undefined,
  hints: [...vault.hints],
});

export const applyModifier = (vault: VaultDef, id: ModifierId): VaultDef => {
  const next = cloneVault(vault);
  switch (id) {
    case 'fog':
      next.fog = true;
      break;
    case 'short-loop':
      next.loopSeconds = Math.max(15, next.loopSeconds - 10);
      break;
    case 'no-dash':
      next.dashEnabled = false;
      break;
    case 'one-echo':
      next.maxEchoes = Math.min(next.maxEchoes, 1);
      next.parEchoes = Math.min(next.parEchoes, 1);
      break;
    case 'fast-guards':
      next.guards = next.guards.map((guard) => ({
        ...guard,
        speed: guard.speed * 1.3,
        visionRange: guard.visionRange * 1.1,
      }));
      break;
  }
  return next;
};

export const eligibleVaultsForModifier = (
  vaults: VaultDef[],
  id: ModifierId,
): VaultDef[] => {
  const modifier = modifierById(id);
  if (!modifier) return [];
  return vaults.filter((vault) => modifier.eligible(vault));
};
