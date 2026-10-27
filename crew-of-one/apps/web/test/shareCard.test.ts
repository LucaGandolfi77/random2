import { describe, expect, it } from 'vitest';
import { buildShareLines, rankedColor, renderShareCard } from '../src/shareCard';

describe('share card', () => {
  it('builds the text lines for a campaign win', () => {
    const lines = buildShareLines({
      vaultName: 'The Gallery',
      timeMs: 5817,
      echoes: 2,
      parEchoes: 1,
      rank: 'A',
    });
    expect(lines[0]).toBe('CREW OF ONE');
    expect(lines[1]).toBe('The Gallery');
    expect(lines[2]).toBe('A RANK');
    expect(lines[3]).toBe('5.82s · 2 echoes · par 1');
    expect(lines.at(-1)).toBe('THE CREW IS YOU');
  });

  it('adds the daily modifier line', () => {
    const lines = buildShareLines({
      vaultName: 'Double Watch',
      timeMs: 5733,
      echoes: 2,
      parEchoes: 3,
      rank: 'S',
      daily: { date: '2026-10-27', modifier: 'Short Fuse' },
    });
    expect(lines.some((line) => line.includes('DAILY 2026-10-27 · SHORT FUSE'))).toBe(true);
  });

  it('uses distinct rank colors', () => {
    expect(rankedColor('S')).not.toBe(rankedColor('A'));
    expect(rankedColor('A')).not.toBe(rankedColor('B'));
    expect(rankedColor('B')).not.toBe(rankedColor('C'));
  });

  it('returns null when canvas is unavailable', async () => {
    await expect(
      renderShareCard({
        vaultName: 'The Gallery',
        timeMs: 1000,
        echoes: 1,
        parEchoes: 1,
        rank: 'S',
      }),
    ).resolves.toBeNull();
  });
});
