import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchDailyConfig,
  fetchLeaderboard,
  saveNickname,
  submitRun,
} from '../src/api';

const jsonResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => data,
  }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('web API client', () => {
  it('parses the server daily config', async () => {
    const daily = {
      dailyId: '2026-10-27',
      vaultId: 'vault-09',
      modifier: 'short-loop',
      loopSeconds: 20,
      maxEchoes: 4,
      startsAt: 0,
      endsAt: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(daily));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDailyConfig()).resolves.toEqual(daily);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/daily',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns null when the API is offline or serves non-JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(fetchDailyConfig()).resolves.toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'text/html' },
        json: async () => ({}),
      } as Response),
    );
    await expect(fetchDailyConfig()).resolves.toBeNull();
  });

  it('loads the leaderboard with the daily and player ids', async () => {
    const payload = { dailyId: '2026-10-27', entries: [], playerRank: 4 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLeaderboard('2026-10-27', 'p-test')).resolves.toEqual(payload);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('/api/leaderboard?');
    expect(url).toContain('daily=2026-10-27');
    expect(url).toContain('player=p-test');
  });

  it('saves a nickname and posts a run', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(saveNickname('p-test', 'Nightjar')).resolves.toBe(true);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      playerId: 'p-test',
      nickname: 'Nightjar',
    });

    await expect(
      submitRun({
        dailyId: '2026-10-27',
        playerId: 'p-test',
        vaultId: 'vault-09',
        echoes: 2,
        timeMs: 5000,
        alarms: 0,
        tracks: [],
      }),
    ).resolves.toEqual({ ok: true });
  });
});
