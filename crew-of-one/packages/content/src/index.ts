import type { VaultDef } from '@crew-of-one/sim';
import vault01Json from '../vaults/vault-01.json';
import vault02Json from '../vaults/vault-02.json';
import vault03Json from '../vaults/vault-03.json';
import vault04Json from '../vaults/vault-04.json';
import vault05Json from '../vaults/vault-05.json';
import vault06Json from '../vaults/vault-06.json';
import vault07Json from '../vaults/vault-07.json';
import vault08Json from '../vaults/vault-08.json';
import vault09Json from '../vaults/vault-09.json';
import vault10Json from '../vaults/vault-10.json';
import vault11Json from '../vaults/vault-11.json';
import vault12Json from '../vaults/vault-12.json';
import vault13Json from '../vaults/vault-13.json';
import vault14Json from '../vaults/vault-14.json';
import vault15Json from '../vaults/vault-15.json';
import { parseVault } from './schema';

export * from './schema';
export * from './daily';

export const vaults: VaultDef[] = [parseVault(vault01Json), parseVault(vault02Json), parseVault(vault03Json), parseVault(vault04Json), parseVault(vault05Json), parseVault(vault06Json), parseVault(vault07Json), parseVault(vault08Json), parseVault(vault09Json), parseVault(vault10Json), parseVault(vault11Json), parseVault(vault12Json), parseVault(vault13Json), parseVault(vault14Json), parseVault(vault15Json)];

export const vaultById = (id: string): VaultDef | undefined =>
  vaults.find((vault) => vault.id === id);

export const freeVaultIds = ['vault-01', 'vault-02', 'vault-03', 'vault-04', 'vault-05', 'vault-06', 'vault-07', 'vault-08', 'vault-09', 'vault-10', 'vault-11', 'vault-12', 'vault-13', 'vault-14', 'vault-15'];
