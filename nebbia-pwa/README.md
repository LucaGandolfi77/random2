# NEBBIA

> The cartographers' guild, sixteen hundred, on a continent wrapped in fog. The
> true world exists underneath it. **Your** map has transcription errors:
> shifted, omitted, invented. Your clients' ships sail on your maps, and a
> forgotten reef is a wreck. The wreck reveals the truth.

No build step. No dependencies. No art assets — the chart paper, the ink, the
coastlines and the ships are drawn on canvas.

**Play it:** <https://lucagandolfi77.github.io/random2/nebbia-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/nebbia-pwa/
```

---

## The one rule

**You sell a map that is deliberately wrong, and only your own map protects
you.**

The truth layer — `state.truth`, six islands, twelve rocks, five shoals, three
ports — exists and is never rendered. The player only ever sees `state.marks`,
their own transcription. A ship's avoidance loop steers around `state.marks`
and never around `state.truth`, so a hazard you marked correctly saves your
client and a hazard you forgot kills them. Under-marking sinks ships;
over-marking only wastes the verifiers' time.

Selling early is the tension: a map drawn from a hasty survey brings money now
and a wreck later, and the wreck is what forces you to correct it.

## The systems

| | Rule, as implemented |
|---|---|
| **Fog of war** | 50px cells (32×24 = 768), revealed by `reveal(x,y,r)` from an expedition's ship |
| **Wrecks** | −15 reputation, −€150. The hazard is then stamped *into* `state.marks` — the wreck is an investigation |
| **Near-misses** | −3 reputation at 60% chance, and they auto-correct the map |
| **Verification** | €40, radius 160px. Snaps shifted marks (>12px off) onto the truth, adds missing features, deletes phantoms. +2 reputation |
| **Wreck odds** | the hazard is pre-computed at spawn from the truth, but only *chosen* when it is not correctly marked, and then fires at 75% — "forgotten reef" and "lucky ships" are decided before the voyage begins |
| **Contracts** | 2 per day from `R2.dailySeed()` — survey a bay at 55% coverage, or sell 4 editions. Expiry −12 reputation |
| **Price** | €20–110. Ship arrivals scale `clamp(1.5 − price/90, 0.15, 1)` × reputation factor |
| **Crew** | max 3, starting with one (Maestro Anselmo, skill 0.55). Transcription takes 9s per draft |

## The numbers

Map 1600×1200 · 6 islands (r 90–200) · 12 rocks (r 7–12) · 5 shoals (r 16–26) ·
3 ports (r 52–68) · SURVEY_R 160 · EXP_BASE_COST 80 (+0.12× distance from
centre) · VERIFY_COST 40 · SHIP_SPEED 62 · EXP_SPEED 110 · TRANSCRIBE_T 9 ·
START_REP 55 · €120 to start · day = 150s with €15 upkeep · bankruptcy below
−€250 · max 4 ships, respawning every 7–13s.

## How it's built

```
nebbia-pwa/
├── game.js     the guild, the world, the rendering — one IIFE
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

Cartographic aesthetic: cream paper, brown ink, hand-drawn hatching. The fog is
a grid of cells rather than a per-pixel mask, which keeps the reveal test to a
single integer division.

## Controls

| Action | |
|---|---|
| Dispatch an expedition | pick *Spedizione*, tap a point |
| Verify an area | pick *Verifica*, tap a point |
| Hire / fire | the Crew modal |
| Set price | the dock slider |

Pointer only — no keyboard.

## Saving

`localStorage["nebbia-best"]` — total earnings as a string.
`R2.saveJSON("nebbia-pwa", {highScore, rep})`, but `save()` is only called from
`verifyArea()` and `ensureContracts()`. Day, money and marks are **not**
persisted.

## Known limits

- 🔴 **The transcription loop is dead code.** Expeditions push drafts to
  `state.surveys`, but nothing ever pushes to `state.queue` — and
  `applyTranscription()` is only reachable through the queue. So your
  cartographers never work, and surveying never generates a single mark. Marks
  only ever arrive from verification, wrecks and near-misses.
- 🔴 **Consequence: the "sell 4 editions" contract can never complete.**
  `state.editionsSold` is only ever decremented (line 411) and never
  incremented.
- 🟠 **Map price has no revenue effect at all.** Price drives arrivals but never
  the amount paid.
- 🟡 No resume, no keyboard, no test files.

## What's next

- 🔴 **Reconnect the transcription loop.** Push from `state.surveys` into
  `state.queue` on expedition return, so crew turn drafts into marks. This is
  the missing half of the core loop — the game currently has sell-and-wreck but
  no sell-and-survey.
- 🟠 **Sell editions.** Increment `editionsSold` in the sale path and make
  contract 2 completable.
- 🟠 **Price → revenue.** Wire the slider into the sale amount.
- 🟡 **Copies propagate errors.** A map copied from a map should inherit and
  compound its errors — the guild's stated fantasy, not yet in the code.
- 🟡 Client names, letters from survivors, naval-league inquiries: the feedback
  that turns a number into a consequence.
- 🟢 Keyboard, and a resume.
- 🟢 Unit tests for `reveal()`, `correctlyMarked()` and the wreck decision.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).

No fonts are fetched, no third-party asset is attributed, no network request is
made anywhere.
