import type { GhostTrack } from '@crew-of-one/sim';
import type { DailyConfig, LeaderboardEntry } from '@crew-of-one/shared';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const PLAYER_KEY = 'crew-of-one:player-id';
const NICKNAME_KEY = 'crew-of-one:nickname';

const canUseStorage = (): boolean => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

const createPlayerId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `p-${crypto.randomUUID()}`;
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getNickname = (): string => {
  if (!canUseStorage()) return '';
  try {
    return (localStorage.getItem(NICKNAME_KEY) ?? '').slice(0, 16);
  } catch {
    return '';
  }
};

export const rememberNickname = (nickname: string): void => {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(NICKNAME_KEY, nickname.slice(0, 16));
  } catch {
    // Keep the in-memory nickname.
  }
};

export const getPlayerId = (): string => {
  if (!canUseStorage()) return createPlayerId();
  try {
    const existing = localStorage.getItem(PLAYER_KEY);
    if (existing && existing.length >= 8) return existing;
    const created = createPlayerId();
    localStorage.setItem(PLAYER_KEY, created);
    return created;
  } catch {
    return createPlayerId();
  }
};

const timeoutSignal = (ms: number): AbortSignal | undefined => {
  if (typeof AbortController === 'undefined') return undefined;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

const parseJson = async <T>(response: Response): Promise<T | null> => {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const fetchDailyConfig = async (): Promise<DailyConfig | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/daily`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: timeoutSignal(2500),
    });
    if (!response.ok) return null;
    return await parseJson<DailyConfig>(response);
  } catch {
    return null;
  }
};

export type RunSubmission = {
  dailyId: string;
  playerId: string;
  vaultId: string;
  echoes: number;
  timeMs: number;
  alarms: number;
  tracks: GhostTrack[];
};

export type RunResponse =
  | { ok: true; runId: string; dailyId: string; rank: number | null; timeMs: number }
  | { ok: false; error: string };

export const submitRun = async (body: RunSubmission): Promise<RunResponse | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: timeoutSignal(8000),
    });
    const parsed = await parseJson<RunResponse>(response);
    if (parsed) return parsed;
    return { ok: false, error: `http-${response.status}` };
  } catch {
    return null;
  }
};


export type LeaderboardResponse = {
  dailyId: string;
  entries: LeaderboardEntry[];
  playerRank: number | null;
};

export const fetchLeaderboard = async (
  dailyId: string,
  playerId: string,
): Promise<LeaderboardResponse | null> => {
  try {
    const params = new URLSearchParams({ daily: dailyId, player: playerId });
    const response = await fetch(`${API_BASE}/api/leaderboard?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: timeoutSignal(4000),
    });
    if (!response.ok) return null;
    return await parseJson<LeaderboardResponse>(response);
  } catch {
    return null;
  }
};

export const saveNickname = async (
  playerId: string,
  nickname: string,
): Promise<boolean> => {
  rememberNickname(nickname);
  try {
    const response = await fetch(`${API_BASE}/api/player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, nickname }),
      signal: timeoutSignal(4000),
    });
    return response.ok;
  } catch {
    return false;
  }
};
