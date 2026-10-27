export type Rank = 'S' | 'A' | 'B' | 'C';

export type VaultProgress = {
  completed: boolean;
  bestTimeMs: number;
  bestEchoes: number;
  bestRank: Rank;
  attempts: number;
};

export type DailyStreak = {
  count: number;
  lastDate: string;
};

export type SaveData = {
  version: 1;
  vaults: Record<string, VaultProgress>;
  daily?: DailyStreak;
};

const STORAGE_KEY = 'crew-of-one:progress:v1';
const INTRO_KEY = 'crew-of-one:seen-intro';

const emptySave = (): SaveData => ({ version: 1, vaults: {} });

export const rankFor = (echoes: number, parEchoes: number): Rank => {
  if (echoes <= parEchoes) return 'S';
  if (echoes <= parEchoes + 1) return 'A';
  if (echoes <= parEchoes + 2) return 'B';
  return 'C';
};

const rankValue = (rank: Rank): number => ({ S: 0, A: 1, B: 2, C: 3 })[rank];

const isDailyStreak = (value: unknown): value is DailyStreak => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DailyStreak>;
  return typeof candidate.count === 'number' && typeof candidate.lastDate === 'string';
};

const isVaultProgress = (value: unknown): value is VaultProgress => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VaultProgress>;
  return (
    typeof candidate.completed === 'boolean' &&
    typeof candidate.bestTimeMs === 'number' &&
    typeof candidate.bestEchoes === 'number' &&
    typeof candidate.bestRank === 'string' &&
    typeof candidate.attempts === 'number'
  );
};

export const loadProgress = (): SaveData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1 || !parsed.vaults || typeof parsed.vaults !== 'object') {
      return emptySave();
    }
    const vaults: Record<string, VaultProgress> = {};
    for (const [id, value] of Object.entries(parsed.vaults)) {
      if (isVaultProgress(value)) vaults[id] = value;
    }
    const daily = isDailyStreak(parsed.daily) ? parsed.daily : undefined;
    return { version: 1, vaults, daily };
  } catch {
    return emptySave();
  }
};

const persist = (data: SaveData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable in private mode; progress just stays in memory.
  }
};

export type ResultRecord = {
  rank: Rank;
  isBest: boolean;
  best: VaultProgress;
};

export const recordResult = (
  data: SaveData,
  vaultId: string,
  timeMs: number,
  echoes: number,
  parEchoes: number,
): ResultRecord => {
  const rank = rankFor(echoes, parEchoes);
  const previous = data.vaults[vaultId];
  const isBetter =
    !previous ||
    !previous.completed ||
    timeMs < previous.bestTimeMs ||
    (timeMs === previous.bestTimeMs && echoes < previous.bestEchoes) ||
    (timeMs === previous.bestTimeMs &&
      echoes === previous.bestEchoes &&
      rankValue(rank) < rankValue(previous.bestRank));

  const best: VaultProgress = isBetter
    ? { completed: true, bestTimeMs: timeMs, bestEchoes: echoes, bestRank: rank, attempts: (previous?.attempts ?? 0) + 1 }
    : { ...previous, attempts: previous.attempts + 1 };

  data.vaults[vaultId] = best;
  persist(data);
  return { rank, isBest: isBetter, best };
};

export const recordAttempt = (data: SaveData, vaultId: string): void => {
  const previous = data.vaults[vaultId];
  const attempts = (previous?.attempts ?? 0) + 1;
  data.vaults[vaultId] = previous
    ? { ...previous, attempts }
    : { completed: false, bestTimeMs: 0, bestEchoes: 0, bestRank: 'C', attempts };
  persist(data);
};

export const hasSeenIntro = (): boolean => {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
};

export const markIntroSeen = (): void => {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    // The intro can show again if storage is unavailable.
  }
};

const previousUtcDate = (date: string): string =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) - 86_400_000).toISOString().slice(0, 10);

export const currentDailyStreak = (data: SaveData, today: string): number => {
  if (!data.daily) return 0;
  if (data.daily.lastDate === today) return data.daily.count;
  if (data.daily.lastDate === previousUtcDate(today)) return data.daily.count;
  return 0;
};

export const recordDailyClear = (
  data: SaveData,
  date: string,
): { streak: number; isNew: boolean } => {
  if (data.daily?.lastDate === date) {
    return { streak: data.daily.count, isNew: false };
  }
  const consecutive = data.daily?.lastDate === previousUtcDate(date);
  const count = consecutive ? (data.daily?.count ?? 0) + 1 : 1;
  data.daily = { count, lastDate: date };
  persist(data);
  return { streak: count, isNew: true };
};

export const resetProgress = (): SaveData => {
  const data = emptySave();
  persist(data);
  return data;
};

export const isVaultUnlocked = (
  index: number,
  vaultIds: string[],
  data: SaveData,
): boolean => {
  if (index <= 0) return true;
  const previousId = vaultIds[index - 1];
  if (!previousId) return false;
  return data.vaults[previousId]?.completed === true;
};

export const formatTime = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) return '--';
  return `${(ms / 1000).toFixed(2)}s`;
};

export const formatRank = (rank: Rank): string => rank;
