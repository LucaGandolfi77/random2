import { describe, expect, it } from 'vitest';
import {
  formatTime,
  isVaultUnlocked,
  rankFor,
  recordResult,
  type SaveData,
} from '../src/progress';

const empty = (): SaveData => ({ version: 1, vaults: {} });

describe('rankFor', () => {
  it('awards S at or under par', () => {
    expect(rankFor(1, 1)).toBe('S');
    expect(rankFor(2, 2)).toBe('S');
  });

  it('steps down for each extra echo', () => {
    expect(rankFor(2, 1)).toBe('A');
    expect(rankFor(3, 1)).toBe('B');
    expect(rankFor(4, 1)).toBe('C');
  });
});

describe('progress records', () => {
  it('records the first clear as a new best', () => {
    const data = empty();
    const result = recordResult(data, 'vault-01', 6000, 2, 1);
    expect(result.isBest).toBe(true);
    expect(result.rank).toBe('A');
    expect(data.vaults['vault-01']?.completed).toBe(true);
    expect(data.vaults['vault-01']?.bestTimeMs).toBe(6000);
  });

  it('keeps the faster clear and counts attempts', () => {
    const data = empty();
    recordResult(data, 'vault-01', 6000, 2, 1);
    const slower = recordResult(data, 'vault-01', 7000, 1, 1);
    expect(slower.isBest).toBe(false);
    expect(slower.best.bestTimeMs).toBe(6000);
    expect(slower.best.attempts).toBe(2);

    const faster = recordResult(data, 'vault-01', 5000, 2, 1);
    expect(faster.isBest).toBe(true);
    expect(faster.best.bestTimeMs).toBe(5000);
    expect(faster.best.attempts).toBe(3);
  });

  it('unlocks the next vault only after a clear', () => {
    const data = empty();
    const ids = ['vault-01', 'vault-02'];
    expect(isVaultUnlocked(0, ids, data)).toBe(true);
    expect(isVaultUnlocked(1, ids, data)).toBe(false);
    recordResult(data, 'vault-01', 6000, 2, 1);
    expect(isVaultUnlocked(1, ids, data)).toBe(true);
  });
});

describe('formatTime', () => {
  it('formats seconds and empty values', () => {
    expect(formatTime(5817)).toBe('5.82s');
    expect(formatTime(0)).toBe('--');
  });
});
