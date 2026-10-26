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
wrangler kv key put --binding=DAILY daily:current '{"dailyId":"2026-10-26","vaultId":"vault-01","modifier":"standard","loopSeconds":30,"maxEchoes":3,"startsAt":0,"endsAt":0}'
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
