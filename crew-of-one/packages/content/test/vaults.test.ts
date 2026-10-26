import { describe, expect, it } from 'vitest';
import { vaults } from '../src';

describe('vault content', () => {
  it('loads at least one vault', () => {
    expect(vaults.length).toBeGreaterThan(0);
  });

  it('has unique vault ids and entity ids', () => {
    const vaultIds = new Set<string>();
    for (const vault of vaults) {
      expect(vaultIds.has(vault.id)).toBe(false);
      vaultIds.add(vault.id);

      const entityIds = [
        ...vault.plates.map((p) => p.id),
        ...vault.doors.map((d) => d.id),
      ];
      expect(new Set(entityIds).size).toBe(entityIds.length);
    }
  });

  it('keeps every plate target valid', () => {
    for (const vault of vaults) {
      const doorIds = new Set(vault.doors.map((door) => door.id));
      for (const plate of vault.plates) {
        for (const target of plate.targets) {
          expect(doorIds.has(target)).toBe(true);
        }
      }
    }
  });

  it('fits the room inside its tile grid', () => {
    for (const vault of vaults) {
      const width = vault.tilesX * vault.tileSize;
      const height = vault.tilesY * vault.tileSize;
      expect(vault.playerStart.x).toBeGreaterThan(0);
      expect(vault.playerStart.y).toBeGreaterThan(0);
      expect(vault.playerStart.x).toBeLessThan(width);
      expect(vault.playerStart.y).toBeLessThan(height);
    }
  });
});
