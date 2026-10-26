# 09 — Backend and Leaderboard

## Stack

- **Cloudflare Pages** — PWA hosting.
- **Cloudflare Workers** — API.
- **D1** — SQLite at the edge: players, runs, leaderboard, entitlements.
- **KV** — daily config cache, rate limits, feature flags.
- **R2** — optional ghost tape storage.
- **Lemon Squeezy** — web checkout, license keys, merchant of record.
- **RevenueCat** — mobile IAP.

## Why Cloudflare

- Cheap for a one-person studio.
- Global low-latency reads.
- Worker can run the shared TypeScript simulation for validation.
- Pairs cleanly with Pages previews.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/daily` | Current daily config and UTC window |
| POST | `/api/run` | Submit and validate a run |
| GET | `/api/leaderboard` | Top 100, player rank, percentile |
| GET | `/api/ghost/:runId` | Top run tape for Ghost of the Day |
| POST | `/api/player` | Create/update nickname |
| POST | `/api/unlock` | Validate license key; issue entitlement |
| POST | `/api/webhook/lemonsqueezy` | Purchase webhook |
| GET | `/api/health` | Health check |

## Schema

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  nickname TEXT,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE TABLE runs (
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

CREATE TABLE leaderboard (
  daily_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  best_echoes INTEGER NOT NULL,
  best_time_ms INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (daily_id, player_id)
);

CREATE TABLE entitlements (
  email TEXT PRIMARY KEY,
  license_key TEXT,
  platform TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_leaderboard_rank
  ON leaderboard (daily_id, best_echoes, best_time_ms);

CREATE INDEX idx_runs_player_daily
  ON runs (player_id, daily_id);
```

## Daily config

```json
{
  "dailyId": "2026-10-26",
  "vaultId": "vault-04",
  "modifier": "fast-guards",
  "loopSeconds": 30,
  "maxEchoes": 4,
  "startsAt": 1761436800000,
  "endsAt": 1761523200000
}
```

- UTC reset at 00:00.
- Publish a week ahead; cache in KV.
- If the API is down, the client uses the cached daily; leaderboard is disabled.

## Run submission

```json
{
  "dailyId": "2026-10-26",
  "playerId": "uuid",
  "vaultId": "vault-04",
  "echoes": 3,
  "timeMs": 18420,
  "alarms": 0,
  "tracks": [/* GhostTrack[] including the player's final run */]
}
```

## Validation

1. Daily matches today and vault.
2. Track count = echoes + 1, ≤ max.
3. Each track ≤ loop length.
4. Per-frame displacement ≤ max speed.
5. Positions outside walls.
6. Interactions within range and line-of-sight.
7. Replay wins within the loop.
8. Metadata matches replay.
9. Tape hash is unique.
10. Rate limit per player/IP.

Reject invalid runs with a generic error. Log for review. Store only verified runs on the leaderboard.

## Ranking

- Fewest echoes.
- Then fewest alarms.
- Then fastest time.
- Then earliest verified submission.

## UX

- Global top 100, your rank, percentile.
- Daily share card.
- “Ghost of the Day” replay.
- Streak: complete any daily to extend; no punishment.
- Friends leaderboard via share code (v1.1).

## Privacy

- Anonymous player ID; no IP storage.
- Optional nickname; profanity filter; report button.
- Purchase email only for entitlement; deletion on request.
- No third-party ad trackers.
- GDPR/CCPA deletion path.

## Costs

- Workers paid plan: ~$5/month.
- D1/KV free tiers cover early usage.
- Lemon Squeezy fees per transaction.
- R2 optional.
