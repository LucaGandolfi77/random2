# LINEA ROSSA

> Metro planner. Trace the lines, manage the trains and the fares, and the
> city grows **where you take it**. Gravity-model demand, two interchanges,
> interest-bearing loans — and the congestion you create is yours to live with.

No build step. No dependencies. No art assets — the city, the trains and the
demand flows are drawn on a canvas from primitives.

**Play it:** <https://lucagandolfi77.github.io/random2/metro-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/metro-pwa/
```

---

## The one rule

**Growth is driven by service, and it is reciprocal.**

An unserved district loses population. A served-and-uncrowded one gains it. A
served-but-overcrowded one stalls. So the network you draw is the city's
demographic engine: reach a district and it densifies, which generates further
districts to reach; ignore one and it decays. The effect is explicit and
symmetric — you decide where the city grows, and then you manage the congestion
you caused.

## The systems

| | Rule, as implemented |
|---|---|
| **Demand** | symmetric gravity: `0.0022 · (pop + jobs·0.6)(pop·0.6 + jobs) ÷ (1 + (d/300)^1.6)`. Home→work and work→home are averaged, so a line cannot be profitable merely by sitting between two busy districts |
| **Routing** | BFS over sequences of lines sharing a station, capped at 3 lines (2 interchanges). Each transfer divides flow by `1 + 0.4·transfers` |
| **Under-capacity** | a route delivers `F × minRatio`, where `minRatio` is the **weakest** line on the route. One under-served line somewhere on the path is a real penalty |
| **Capacity** | `trains × 120 × (DAY / (2·len/speed))` — a longer line needs a longer cycle, so it carries fewer passengers per train per day |
| **Commute waves** | four waves: morning ×1.35, midday ×0.7, evening ×1.35, night ×0.15 |
| **Fare elasticity** | multiplier `clamp(2.2 − fare·0.6, 0.25, 1.8)`. Fares above ~1.2 suppress demand; cheap fares fill trains and earn less each |
| **Geography** | 24 samples along each link: ×3.2 in water, ×1.8 inside a bridge radius. Crossing the river is expensive |
| **Growth** | unserved −0.004/day; served & uncrowded +0.032; served & crowded −0.008; jobs at 0.9× |
| **Economy** | fare revenue, minus maintenance `(trains·12 + stations·8 + 25)/DAY` per second, minus loan interest 2–3%/day. Bankruptcy below −£400…−600 |

## The numbers

6 levels · day = 150 real seconds · world 1700×1700 · district counts 6–14 ·
goals 8,000–20,000 pax/day within 14–24 days · fares 1.2–1.4 · LOAN_CAP
£5,000–7,000 · bankruptcy −£400…−600 · 4–6 lines · up to 22 districts.

Level 0 is a procedural city generated from the daily seed, so it is the same
hill every day. Levels 1–5 are hand-drawn with rivers, lakes, bridges and
geology multipliers.

## How it's built

```
metro-pwa/
├── game.js          drawing, input, level flow — one IIFE
├── sim.js           the economy with no DOM              ← used by the labs
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── sim.test.mjs      53 checks
```

**`sim.js` is a deliberate duplication.** `game.js` is one IIFE that mixes the
model with drawing and event wiring, so the balance of a tycoon that can only
be measured by playing it could not be measured at all. `sim.js` is the same
model with the display stripped out, exposing `create(seed)` / `step(dt)` /
`apply(action)` / `snapshot()`, so `tools/balance/run.mjs` can play thousands
of headless sessions and report where the difficulty curve actually sits.

Drift between the two is the risk, and `sim.test.mjs` is the guard: it pins the
demand split, the growth bands, the capacity maths, the line costs, the economy
and the goal adjudication — the behaviours both files are supposed to share.

The balance harness runs 5,000 seeded sessions across three scripted policies
(greedy, random, and a passive baseline that does nothing at all). The passive
policy is the important one: without it there is nothing to prove the goals
are not free.

### What the balance lab found

| | |
|---|---|
| Greedy win rate | **100%** |
| Median day of victory | **2 of the 14–24 day budget** |
| Median margin over target | **2–5×** |
| Decisions needed | **~6** |

The day budgets are far larger than the time a goal needs, and the pax/day
thresholds are not doing much work. Two caveats the report is explicit about:

1. The simulation does **not** charge for the clicks a player spends drawing a
   line station by station, so ~6 decisions may be ~30 real interactions. The
   finding is an upper bound on how easy the goal is.
2. The economics reaching a 20,000 pax/day target on day 2 is a genuine
   statement about the economy, independent of the above.

`tools/balance/report.py` turns this into an HTML report with inline SVG
charts and threshold-generated findings.

## Controls

| Action | |
|---|---|
| Draw a line | tap districts in sequence |
| Select a line | tap it |
| Add a train | dock button |
| Extend a line | tap the line's endpoint |
| Set the fare | slider in the dock |
| Take / repay a loan | dock buttons |

Pointer only — no keyboard, no pan or zoom. The whole map is scaled to fit,
because losing the overview is how a metro planner becomes unplayable.

## Saving

`localStorage["metro-best"]` — total passengers, as a string.
`localStorage["metro-levels"]` via `R2.loadJSON(PROGRESS_KEY, {done:{}, best:{}})`
for progress. Plus the run log through `R2.stats.run(...)` on bankruptcy.

There is no resume of an in-progress city.

## Tests

```bash
node metro-pwa/sim.test.mjs         # 53 checks
python3 tools/balance/report.py     # reads tools/balance/out/runs.csv
```

## Known limits

- 🔴 **There is no win condition.** `goalReached()` and `state.won` exist only
  in `sim.js`. `game.js` has no level-complete path — the only ending is
  bankruptcy.
- 🔴 **Consequence: 5 of the 6 levels are permanently locked.** Because nothing
  writes `metro-levels`.done`, `levelUnlocked(i)` is false for levels 1–5
  forever. The level select offers them and unlocking them is impossible.
- 🟡 `state.lvl` is never assigned, so the run log writes `wave: undefined` and
  `meta.goalPax: null`.
- 🟡 `sim.js` `advance()` owns the day rollover, but `game.js` calls
  `dayRollover()` itself — the same calendar logic in two places.
- ⚪ `segDist()` is defined twice (lines 257 and 671; the second shadows the
  first). `suonoClick()` calls `Sound.click`, which is not in the sound map
  (guarded by `&&`).

## What's next

- 🔴 **The win condition.** Reuse `sim.js`'s `goalReached()`: on a cleared
  level, write `PROGRESS_KEY.done[lvl]` and unlock the next. This is the single
  change that turns six maps into a campaign.
- 🟠 **A parity harness.** A real `check-parity.mjs` that loads both `game.js`
  and `sim.js` under a DOM shim and asserts the two models agree on the same
  inputs — replacing the "keep in sync" comment with an enforced invariant.
- 🟠 **Rebalance from the lab's findings.** Either raise the pax/day targets by
  3–5×, or cut the day limits to match. The report's threshold gates will tell
  you when you've moved enough.
- 🟡 **Persist the city.** Money, districts, lines and day, so a network can be
  left and resumed.
- 🟡 Keyboard: `1`–`6` to pick a line, `+`/`−` for trains, arrows to pan.
- 🟢 A demand overlay toggle — the gravity field as a heatmap rather than
  flowing dots.
- 🟢 Right-of-way costs: two lines sharing a corridor should be cheaper.
- ⚪ Deduplicate `segDist()`; drop the unused `Sound.click`.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).

No fonts are fetched, no third-party asset is attributed, no network request is
made anywhere.
