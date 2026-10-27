# CREW OF ONE

> **The crew is you.**
>
> A one-screen, one-thumb time-loop heist. You have 30 seconds and a watch that rewinds time. Every rewind leaves an echo of your last run — a ghost that repeats everything you did. The vault needs four people. You are one person with five loops.

## Status

**Phase 0 — prototype.** The simulation core, guard AI, solution-tape pipeline, workspace, and product documentation are in place. The current prototype is a ten-vault rectangle slice: plates, doors, guards, noise, cameras, levers, lasers, dash, one-way gates, and gem carrying, each with a verified solution tape, guard-aware headless replay validation, plus a meta shell with level select, saved best runs, ranks, an echo timeline, a 2× ghost-preview playback, and a deterministic daily heist with modifiers.

## What this is

- Mobile-first **PWA** built with **Phaser + TypeScript + Vite**.
- **Top-down pixel-art** stealth puzzle, portrait, one screen per vault.
- **Free prologue + free daily heist.** Revenue comes only from in-game microtransactions: chapter unlocks, the full-campaign bundle, cosmetics, and a supporter pack. No ads, no energy, no loot boxes, no pay-to-win.
- **Web checkout at launch.** In-game store → Lemon Squeezy → Cloudflare entitlement. Mobile uses Apple/Google IAP through RevenueCat.
- **Daily leaderboard** with server-validated replays through a shared, deterministic simulation package.
- **One human + AI agents.** AI drafts code, docs, tests, level candidates, and marketing. Final pixel art, animation, music, and SFX are human-made or commissioned.

## Repository layout

```
crew-of-one/
├── apps/web/          Phaser PWA
├── apps/api/          Cloudflare Worker: daily, leaderboard, entitlements
├── packages/sim/      Pure TypeScript simulation (shared by client + server)
├── packages/content/  Vault definitions, strings, schema
├── packages/shared/   Shared types, analytics events, entitlements
├── docs/              Product, design, technical, and business docs
├── art/               Aseprite sources and exported atlases
└── tools/             Vault validator, solution recorder, atlas helpers
```

## Quick start

```bash
pnpm install
pnpm --filter @crew-of-one/sim test
pnpm --filter @crew-of-one/web dev
```

The web app runs at the URL Vite prints (usually `http://localhost:5173`).

## Core commands

| Command | What it does |
|---|---|
| `pnpm install` | Install workspace dependencies |
| `pnpm test` | Run all unit tests |
| `pnpm typecheck` | Type-check every package |
| `pnpm build` | Build the PWA and API |
| `pnpm dev:web` | Run the Phaser PWA |
| `pnpm dev:api` | Run the Cloudflare Worker locally |
| `pnpm validate:vaults` | Validate vault JSON and replay solution tapes |

## Product docs

Start with [`docs/00-vision.md`](docs/00-vision.md), then the game design and technical architecture. The docs are the source of truth; code follows them.

## Near-term milestones

1. **Fun gate (days 1–3):** rectangle prototype. Walk to a plate, rewind, let the echo hold the door, escape. If this is not fun, stop and redesign.
2. **Vertical slice (weeks 2–5):** one polished pixel-art vault, PWA shell, audio engine, solution tapes, dev tools.
3. **Backend gate (weeks 6–8):** daily leaderboard, replay validation, entitlements, in-game store.
4. **Commercial gate (weeks 9–10):** 15 vaults, cosmetics, mobile wrapper, legal, store assets.
5. **Soft launch (weeks 11–12):** web + Android. Measure demo completion, conversion, retention, crashes.
6. **Full launch (weeks 13–14):** iOS, press, marketing, community.

## License

Proprietary. All rights reserved until a license is chosen. Commissioned art and audio must have full commercial rights assigned in writing.
