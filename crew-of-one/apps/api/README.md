# Crew of One API

Cloudflare Worker for the daily heist, leaderboard, entitlements, and web checkout.

## Local setup

```bash
pnpm install
pnpm --filter @crew-of-one/api dev
```

Copy `.dev.vars.example` to `.dev.vars` and fill in the secrets for local testing.

## D1 / KV

Create the resources once:

```bash
wrangler d1 create crew-of-one
wrangler kv namespace create DAILY
```

Put the returned IDs into `wrangler.toml`, then apply the schema:

```bash
wrangler d1 execute crew-of-one --file=schema.sql
```

Publish a daily config:

```bash
wrangler kv key put --binding=DAILY daily:current '{"dailyId":"2026-10-27","vaultId":"vault-07","modifier":"short-loop","loopSeconds":20,"maxEchoes":3,"startsAt":0,"endsAt":0}'

`modifier` is one of `fog`, `short-loop`, `no-dash`, `one-echo`. If the KV key is missing or points at a different UTC date, the Worker falls back to the deterministic plan from `@crew-of-one/content`. The Worker applies the modifier before replay validation, so the tape must win under the exact daily rules.
```

## Endpoints

- `GET /api/health`
- `GET /api/daily`
- `POST /api/run`
- `GET /api/leaderboard?daily=YYYY-MM-DD&player=...`
- `POST /api/player`
- `POST /api/unlock`
- `POST /api/webhook/lemonsqueezy`

## Notes

`POST /api/run` validates the submitted ghost tracks with the shared deterministic sim before writing to D1. The current replay validator covers walls, speed, doors, plates, and the exit; guards/cameras/lasers are added when those mechanics land.
