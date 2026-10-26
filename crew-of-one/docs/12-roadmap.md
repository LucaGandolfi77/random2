# 12 — Roadmap

## Assumptions

- One human + AI agents.
- Full-time: 12–14 weeks to full launch.
- Part-time: 16–20 weeks.
- Pixel artist commissioned for the vertical slice and final art.
- Sound designer for final music/SFX.
- Web checkout at launch; Android soft launch; iOS full launch.

## Phase 0 — Setup and prototype (weeks 1–2)

- Monorepo, `AGENTS.md`, CI, docs.
- Pure sim skeleton: fixed timestep, input, collision.
- Record/replay one ghost.
- One room: plate, door, exit.
- Fun gate: 3 of 5 playtesters say “oh!” and want more.

**Ship:** rectangle prototype, tests, playtest notes.

## Phase 1 — Vertical slice (weeks 3–5)

- One polished pixel-art vault.
- Art bible + sample room + character kit.
- Floating joystick, tap interaction, rewind button.
- Guard vision, noise, echo decoy.
- Audio engine: SFX + one adaptive loop.
- PWA shell: manifest, service worker, offline, install.
- Dev tools: level select, timeline, solution recorder.
- Art gate: screenshot looks commercial at phone size.

**Ship:** installable vertical slice on a staging URL.

## Phase 2 — Content and backend (weeks 6–8)

- 8 vaults, solution tapes.
- Daily config, leaderboard, D1 schema.
- Replay validation in the Worker.
- Entitlements, web checkout, in-game store.
- Demo/paywall architecture.
- Backend gate: forged tape rejected; offline fallback works.

**Ship:** daily leaderboard + store on staging.

## Phase 3 — Commercial shell (weeks 9–10)

- 15 vaults, challenge modifiers.
- Cosmetics, supporter pack.
- Mobile wrapper (Capacitor), RevenueCat, haptics, push.
- Legal: terms, privacy, IAP policy, trademark.
- Store assets: icon, screenshots, trailer, press kit.
- Demo gate: >60% demo completion, >10% purchase intent.

**Ship:** release candidates for web/Android/iOS.

## Phase 4 — Soft launch (weeks 11–12)

- Web + Android soft launch in 2–3 English-speaking markets.
- Measure: conversion, ARPPU, D1/D7, crashes, refunds.
- Fix onboarding and paywall.
- Press and creator outreach.
- Launch gate: crash-free >99.5%, refunds <5%, D1 >25%.

## Phase 5 — Full launch (weeks 13–14)

- iOS launch.
- Launch discount, Product Hunt, Show HN, Reddit, press.
- Community: Discord, daily share cards.
- Post-launch: weekly patch, monthly content, “Send a Ghost” update.

## Content roadmap after launch

- Month 1: bug fixes, accessibility, balance.
- Month 2: “Send a Ghost” asynchronous co-op.
- Month 3: new challenge vaults + cosmetic pack.
- Quarter 2: level editor or community vaults, if demand.

## Kill/pivot criteria

- Prototype not fun after 3 iterations → change the mechanic.
- Demo conversion <2% after soft launch → rethink pricing/content.
- Art gate not met → hire/iterate before producing 15 vaults.
- Backend validation too slow/costly → simplify to signed runs + spot checks.
