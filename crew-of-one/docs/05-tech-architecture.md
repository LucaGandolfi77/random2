# 05 — Technical Architecture

## Stack

- **Phaser 3** (or 4 once the ecosystem is ready) + **TypeScript** + **Vite**.
- **vite-plugin-pwa** for manifest/service worker.
- **Cloudflare Pages** for the PWA, **Workers + D1 + KV** for the API.
- **Lemon Squeezy** for web checkout and license keys.
- **RevenueCat** for mobile IAP.
- **Vitest** for unit/integration tests; **Playwright** for e2e.
- **Tiled** for level layout; **Aseprite** for pixel art.
- **pnpm workspaces**; optional Turborepo.

## The sim/render split

The most important decision in the project.

- `packages/sim` is pure TypeScript. No Phaser, no DOM, no browser APIs.
- It runs in the browser, in Vitest, and in a Cloudflare Worker.
- `apps/web` renders `SimState`; it never mutates it.
- `apps/api` replays submitted runs with the same sim to validate leaderboard entries.

This gives deterministic replays, testable level design, server-side anti-cheat, and a future “Send a Ghost” feature.

## Packages

### `packages/sim`
- `types.ts` — state, vault, ghost, input, events.
- `math.ts` — vectors, distance, clamp, seeded RNG.
- `collision.ts` — circle vs AABB, raycast vs walls.
- `world.ts` — vault loading, plates, doors, levers, gem.
- `guards.ts` — patrol, vision, suspicion, noise investigation.
- `recording.ts` — frame sampling, tape validation.
- `sim.ts` — fixed-step tick, rewind, win/lose, snapshot/restore.
- `index.ts` — public API.

### `packages/content`
- Vault JSON + Zod schema.
- Strings/localization.
- Solution tapes for CI.

### `packages/shared`
- Analytics event names and payload types.
- Entitlement types and signed-token helpers.
- Daily config types.

### `apps/web`
- Phaser scenes: Boot, Menu, Heist, Results.
- DOM shell: menus, vault select, store, settings, results, install prompt.
- Input: floating joystick, tap-to-interact, rewind button.
- Render: room, characters, ghosts, lighting, FX.
- Audio: synth engine, adaptive music.
- PWA: service worker registration, install, share, offline.

### `apps/api`
- `GET /api/daily`
- `POST /api/run`
- `GET /api/leaderboard`
- `GET /api/ghost/:runId`
- `POST /api/player`
- `POST /api/unlock`
- `POST /api/webhook/lemonsqueezy`
- `GET /api/health`
- D1 migrations in `schema.sql`.
- Replay validation imports `@crew-of-one/sim`.

## Fixed timestep

- Sim step: 1/60s.
- Record step: 1/30s.
- View accumulates real delta, clamps to 100ms, calls `sim.tick()` in a while loop, interpolates render.
- Pause stops accumulation; resume discards the gap.

## Rendering

- Phaser canvas full-screen.
- Board rendered at 360×640 logical, integer camera zoom.
- Static room pre-rendered to a RenderTexture; dynamic entities on top.
- Object pools for particles, trails, and ghost afterimages.
- DPR cap at 2 (1.5 low-end); `pixelArt: true`, `roundPixels: true`.

## Input

- Phaser Pointer Events; no DOM joystick over the canvas.
- Floating joystick starts anywhere in the playfield; dead zone; normalized vector.
- Tap on interactable → context action.
- Rewind button hold 0.25s.
- Keyboard for desktop: WASD/arrows, E, Space, R.
- Tap-to-move accessibility mode uses A* on the vault grid.

## UI

- DOM overlay for menus, vault select, store, settings, results, install prompt.
- In-game HUD in Phaser (timer, echo slots, objective) or DOM if safe-area handling demands it.
- One event bus between sim, scene, and DOM.
- Safe areas via `env(safe-area-inset-*)`; `100dvh`; `visualViewport` resize.

## Data flow

```
pointer → InputController → sim.step(input)
                              ↓
                         SimState
                        /        \
                 Phaser render   DOM HUD
                              ↓
                         run recorder
                              ↓
                     POST /api/run → validation
```

## Save

- IndexedDB via `idb-keyval`.
- Save schema versioned; migrations are explicit.
- Campaign progress, ranks, settings, entitlements, in-progress heist.
- Export/import JSON for backup.
- `navigator.storage.persist()` where available.

## Analytics

- Privacy-light event names in `packages/shared/analytics.ts`.
- No PII. No IP storage. No third-party cookies.
- Track demo funnel, paywall, purchase, install, daily, share, crashes.

## Performance budgets

- 60 fps target; 30 fps minimum on low-end Android.
- < 5 MB initial install (without optional audio samples).
- < 100 ms input-to-visual latency.
- < 1.5s cold start on a mid-range phone.
- No full-screen shaders; no per-frame allocations in the hot loop.

## Testing

- Unit: sim rules, recording, collision, guards, vault schema.
- Integration: every vault’s solution tape wins headlessly.
- API: entitlement, daily, leaderboard, replay rejection.
- E2E: install, offline, purchase restore, pause/resume.
- Device matrix: iPhone SE, iPhone 15, low-end Android, iPad, desktop.

## Deployment

- Cloudflare Pages: preview per PR; production on `main`.
- Worker: `wrangler deploy`; D1 migrations; secrets via Wrangler.
- Cache headers: hashed assets immutable; service worker no-cache.
- Rollback: previous Pages deployment + Worker version.
