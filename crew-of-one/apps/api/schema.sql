CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  nickname TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  daily_id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  echoes INTEGER NOT NULL,
  time_ms INTEGER NOT NULL,
  alarms INTEGER NOT NULL,
  tape_hash TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS leaderboard (
  daily_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  best_echoes INTEGER NOT NULL,
  best_time_ms INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (daily_id, player_id)
);

CREATE TABLE IF NOT EXISTS entitlements (
  email TEXT PRIMARY KEY,
  license_key TEXT,
  platform TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank
  ON leaderboard (daily_id, best_echoes, best_time_ms);

CREATE INDEX IF NOT EXISTS idx_runs_player_daily
  ON runs (player_id, daily_id);
