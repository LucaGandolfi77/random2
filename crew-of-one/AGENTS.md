# AGENTS.md — CREW OF ONE

This file is the contract for every AI agent working in this repository. Read it before changing anything. If a task conflicts with this file, stop and ask the human.

## Mission

Build a commercial, mobile-first pixel-art puzzle game called **CREW OF ONE**: a one-screen time-loop heist where the player's recorded runs become ghost crew members.

## Non-negotiables

1. **The simulation is pure TypeScript.** `packages/sim` must not import Phaser, the DOM, or any browser-only API. It runs in the browser, in Vitest, and in a Cloudflare Worker.
2. **The simulation is deterministic.** Fixed timestep, no `Math.random` at runtime, stable iteration order. Seed anything that needs variety.
3. **Record transforms and events, not physics inputs.** Ghosts are scripted performers. Do not reintroduce a physics engine into the sim.
4. **Ghosts are helpers, never obstacles.** They must not block the player, push the player, or create soft-locks.
5. **Every vault has a solution tape.** CI replays it headlessly and asserts a win. A vault without a passing solution tape is not done.
6. **Tests are the contract.** New gameplay rules need unit tests. New API behavior needs integration tests.
7. **No direct pushes to `main`.** Work in a branch or worktree. Open a PR. CI must pass. A human reviews.
8. **Never commit secrets.** No API keys, license keys, webhook secrets, or store credentials.
9. **Do not touch monetization, legal, privacy, or store-submission files without explicit human approval.**
10. **Final art and audio are human-made or commissioned.** AI may draft concepts, moodboards, UI mockups, marketing images, code, docs, QA scripts, and level candidates. AI-generated final pixel art, animation, music, or SFX is not allowed unless the human explicitly approves it in writing.

## Architecture

```
apps/web          Phaser view, input, audio, PWA shell, DOM menus/store
apps/api          Cloudflare Worker, D1, KV, entitlements, leaderboard
packages/sim      Pure simulation: world, player, ghosts, guards, validation
packages/content  Vault JSON, strings, schema, solution tapes
packages/shared   Shared types, analytics events, entitlement helpers
```

### Sim/render split

- `packages/sim` owns all game rules and state.
- `apps/web` owns rendering, input translation, audio, particles, and UI.
- The view reads sim state and interpolates for smoothness. The view never mutates sim state.
- `apps/api` imports `@crew-of-one/sim` to validate submitted runs with the exact same rules.

### Fixed timestep

- Simulation step: **60 Hz**.
- Record at **30 Hz** (every second tick).
- The view accumulates real time and calls `sim.tick()` N times; it interpolates rendering.
- Clamp delta to avoid spiral-of-death after tab suspension.

### Data flow

```
input → sim.tick() → SimState → renderer
                ↓
         run tape (frames + events)
                ↓
      POST /api/run → Worker → sim replay → leaderboard
```

## Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm dev:web
pnpm dev:api
pnpm validate:vaults
```

## Definition of done

A task is done only when:

- The change is implemented and type-checks.
- Unit tests cover the new behavior (or the PR explains why not).
- Relevant vault solution tapes still pass.
- No performance regression on a low-end phone profile.
- Accessibility notes are updated if UI changed.
- Analytics events are added if the change affects the funnel.
- The PR description includes what changed, why, and how it was tested.

## Task template

```md
## Goal
One sentence.

## Context
Links to docs, related PRs, constraints.

## Acceptance criteria
- [ ] Specific, testable behavior.
- [ ] Tests added.
- [ ] No regression in existing vault tapes.

## Files likely touched
- packages/sim/...
- apps/web/...

## Out of scope
- ...

## Risks / notes
- ...
```

## Review rules for agents

- Prefer small PRs. One behavior per PR.
- Do not refactor unrelated code.
- Do not add dependencies without justification and human approval.
- Do not invent game rules that are not in `docs/01-game-design.md`; propose a doc change first.
- If a test fails, fix the cause. Do not skip or weaken the test.
- If a vault is unsolvable, fix the vault or the rule; do not lower the win condition silently.

## Agent roles

See `docs/11-ai-agent-workflow.md` for the full role briefs and prompts. The short version:

| Agent | Owns |
|---|---|
| Producer | Roadmap, tasks, acceptance criteria, blockers |
| Sim | Deterministic simulation, ghosts, guards, validation, tests |
| Phaser | Scenes, rendering, input, PWA, performance |
| Backend | Worker, D1, KV, entitlements, leaderboard, anti-cheat |
| Level | Vault candidates, solution tapes, difficulty curves |
| Art | Concepts, moodboards, UI mockups, marketing images (not final art) |
| Audio | Synth sketches, SFX variations (not final mix) |
| QA | Fuzzing, Playwright, device checklist, bug reports |
| Marketing | Devlogs, store copy, press kit, social drafts |
| Legal/Ops | Checklists and drafts; human/attorney review required |

## Current phase

Phase 0 — rectangle prototype. The first goal is not art. It is proving that walking to a plate, rewinding, and letting your echo hold the door is fun.
