import type { VaultDef } from '@crew-of-one/sim';
import vault01Json from '../vaults/vault-01.json';
import vault02Json from '../vaults/vault-02.json';
import vault03Json from '../vaults/vault-03.json';
import vault04Json from '../vaults/vault-04.json';
import vault05Json from '../vaults/vault-05.json';
import vault06Json from '../vaults/vault-06.json';
import vault07Json from '../vaults/vault-07.json';
import vault08Json from '../vaults/vault-08.json';
import { parseVault } from './schema';

export * from './schema';

export const vaults: VaultDef[] = [parseVault(vault01Json), parseVault(vault02Json), parseVault(vault03Json), parseVault(vault04Json), parseVault(vault05Json), parseVault(vault06Json), parseVault(vault07Json), parseVault(vault08Json)];

export const vaultById = (id: string): VaultDef | undefined =>
  vaults.find((vault) => vault.id === id);

export const freeVaultIds = ['vault-01', 'vault-02', 'vault-03', 'vault-04', 'vault-05', 'vault-06', 'vault-07', 'vault-08'];
