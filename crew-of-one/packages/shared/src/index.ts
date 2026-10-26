export type Entitlement =
  | 'prologue'
  | 'chapter-2'
  | 'chapter-3'
  | 'chapter-4'
  | 'full-campaign'
  | 'cosmetics'
  | 'supporter';

export type EntitlementToken = {
  playerId: string;
  entitlements: Entitlement[];
  issuedAt: number;
  expiresAt: number;
  signature: string;
};

export type DailyConfig = {
  dailyId: string;
  vaultId: string;
  modifier: string;
  loopSeconds: number;
  maxEchoes: number;
  startsAt: number;
  endsAt: number;
};

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  nickname: string;
  echoes: number;
  timeMs: number;
  alarms: number;
  verified: boolean;
};

export const ANALYTICS_EVENTS = [
  'app_open',
  'vault_start',
  'loop_rewind',
  'vault_complete',
  'vault_fail',
  'hint_used',
  'paywall_view',
  'purchase_start',
  'purchase_complete',
  'install_prompt_view',
  'install_accepted',
  'daily_play',
  'daily_submit',
  'leaderboard_view',
  'share',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export type AnalyticsPayload = {
  event: AnalyticsEvent;
  playerId: string;
  ts: number;
  props?: Record<string, string | number | boolean>;
};
