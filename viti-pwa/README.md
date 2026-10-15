# Viti & Lastre

> Unscrew, move and re-screw the right screws. Plates with no support fall.
> A mechanical puzzle on a hand-rolled rigid-body engine, where the physics is
> not decoration — it is what decides whether the level falls apart.

*Screws & Plates.* No build step. No dependencies. No art assets: every screw,
plate and bench is drawn procedurally.

**Play it:** <https://lucagandolfi77.github.io/random2/viti-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/viti-pwa/
```

---

## The one rule

**A plate becomes dynamic the instant it is no longer structurally tied to the
wall.**

`recompute()` runs a **union-find** over every plate, with the wall as an extra
node, using every screw still on the board. Any plate whose root is not the
wall's is released by `makeDynamic()`. So a screw is never just a screw: it is
what holds a cluster together, and removing one can take a whole tower down.
You are not picking things up; you are re-proving the structure's connectivity
with every tap.

## The physics

A Box2D-lite in ~150 lines: SAT on oriented boxes with a 2-point manifold taken
from the deepest vertices of B, then sequential impulses with restitution 1.12
and friction clamped to ±0.5|j|, plus positional correction at ×0.32. Gravity
1400, 3 substeps, 4 iterations.

The same impulse solver doubles as the **damage system**. `applyPair()` records
each body's peak approach velocity (`A.hit = Math.max(A.hit, -vn)`) and sets
`b.hitMetal` when a *falling metal* plate touches another body. The next
`postPhys()` pass reads those: glass shatters above `BREAK_V = 700` — an instant
loss on `protectGlass` levels — and a falling metal plate pops the screws of
whatever it hits above `POP_V = 450`, with a 0.5s cooldown.

## The systems

| | Rule, as implemented |
|---|---|
| **Colour rule** | a screw only re-screws into a hole of the same colour (B/R/G/A) |
| **Rust** | needs 3 taps |
| **Spring** | as the last screw on a plate, launches it at `vy −640` |
| **Self-tapping** | adopts any hole colour — implemented, but see Known limits |
| **Tray** | capacity 4; a full tray with no accepting hole is a deadlock and loses the level |
| **Rails** | ignore gravity, slide at ±175 px/s |
| **Materials** | wood (HP 20, density 1), metal (22, 1.7), glass (16, 0.8) |
| **Stars** | 3 if ops ≤ par, 2 if ≤ par+3, else 1 |

## The numbers

10 levels, pars 4·4·4·4·6·4·8·4·12·16. Level 9 *La torre*: 12 screws, 5 plates.
Level 10 *Il capannone*: 14 screws, 7 plates. World 420×680, bench at y 600,
wall 8px thick. Screws fly to and from the tray over 0.45s. Level N unlocks when
`stars[N-1] > 0`.

## How it's built

```
viti-pwa/
├── game.js     the engine, the levels and the rendering — one file, ~1000 lines
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

The physics is worth reading as a reference implementation: it is short enough
to follow in one sitting and the contact-solving doubles as the archaeology.

## Controls

| Action | |
|---|---|
| Unscrew | tap the screw head (rusty takes 3 taps) |
| Screw back in | tap a glowing hole |
| Retry / level select / sound | header buttons |

Pointer only — tap radius 20px for screws, 18px for holes. No keyboard input.
Covered screws (a plate with a higher z covering them) are drawn at alpha 0.3
and rejected by `screwAt()`.

## Saving

`R2.saveJSON("viti-pwa", {stars, highScore})`. Per-game high score, per-level
stars, plus the run log with `meta {stars, ops, par}`.

## Known limits

- 🟡 **`selftap` screws are fully implemented and never spawned.** `tryPlace`,
  the "U" tag in `drawScrewHead`, `TYPETAG` — all present, and no level in
  `LEVELS` creates one. A whole mechanic is unused.
- 🟡 No keyboard, no tests.
- ⚪ `pl.jig` (the plate wobble in `drawPlate`) is only ever assigned 0, so the
  animation never runs.
- ⚪ `state.shardsDone` is written and never read.

## What's next

- 🟠 **Use the self-tapping screw.** Four levels that hinge on it would make
  the colour rule a genuine second dimension instead of a memory test.
- 🟠 **A level editor.** The `LEVELS` array is already declarative enough to
  serialise.
- 🟡 Keyboard: `Tab` through screws, `Enter` to unscrew, `1`–`4` to pick from
  the tray.
- 🟡 Sound: a distinct tone per material (metal rings, glass shatters, wood
  thuds) — the engine already knows which is which.
- 🟢 Glass shards as a real particle aftermath, driven by `postPhys()`'s
  closing velocity instead of the current instant.
- 🟢 A "collapse counter": how many plates your last screw took down.
- ⚪ Remove the dead `pl.jig` and `state.shardsDone`, or finish them.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
