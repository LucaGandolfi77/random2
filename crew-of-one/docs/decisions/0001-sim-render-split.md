# ADR 0001 — Sim/render split

## Status
Accepted.

## Context
We need deterministic replays for both the game and server-side leaderboard validation. Phaser’s scene/physics lifecycle makes that hard to test headlessly.

## Decision
Write the simulation in pure TypeScript in `packages/sim`. Phaser is a view layer that reads `SimState`. The Worker imports the same sim for validation.

## Consequences
- Deterministic tests without a browser.
- Server-side anti-cheat.
- Slight extra plumbing between sim and renderer.
- No Phaser physics in the sim; custom circle/AABB collision.
