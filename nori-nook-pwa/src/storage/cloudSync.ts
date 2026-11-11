import type { SaveGame } from '@/types/game';

export interface CloudSyncStatus {
  available: boolean;
  connected: boolean;
  lastSyncedAt?: number;
  message: string;
}

export interface CloudSyncAdapter {
  status: () => CloudSyncStatus;
  push: (save: SaveGame) => Promise<CloudSyncStatus>;
  pull: () => Promise<SaveGame | null>;
}

export const localOnlySync: CloudSyncAdapter = {
  status: () => ({
    available: false,
    connected: false,
    message: 'Local save only. Cloud sync is an optional future adapter; no account is required.',
  }),
  push: async () => localOnlySync.status(),
  pull: async () => null,
};
