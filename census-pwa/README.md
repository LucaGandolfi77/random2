# CENSUS

> You are the chief enumerator. Nobody will tell you how many people live in
> the city until after you have committed a number to paper. Everything on
> screen is real sampling arithmetic.

No build step. No dependencies. No art assets — every figure, ward and panel
is drawn on a canvas from primitives. The statistics are the textbook ones,
decorated with nothing.

**Play it:** <https://lucagandolfi77.github.io/random2/census-pwa/>

- **Android / Chrome** — menu ⋮ → *Install app*
- **iPhone / Safari** — Share → *Add to Home Screen*

```bash
python3 -m http.server 8080
# open http://localhost:8080/census-pwa/
```

---

## The one rule

**A ward that will not answer is not an empty ward.**

Non-response is the whole game. Every ward has a baseline willingness to open
the door, and refusal rises with household size — so in a ward where the
large houses are reluctant, your sample skews small, your mean people-per-house
sits below the truth, and your population estimate lands *systematically* low.
No number of extra enumerators fixes that while the bias is there. It only
narrows the interval around a wrong answer.

The engine draws household sizes from `u^0.55` — a right skew, many small
houses and a tail of large ones — and normalises it by `SKEW_NORM = 1.55` so
the mean is exactly `householdSize`. Against a *uniform* draw, a
size-dependent refusal moves the sample mean by about one percent: real, but
far too small to be worth a game. The skew is what gives the bias a sign.

## The systems

| | Rule, as implemented |
|---|---|
| **Margin of error** | `z · √(p(1−p)/n)` over the *households that answered*, not the doors knocked on |
| **Second variance term** | `HH_CV / √answered = 0.2449/√answered`, combined in quadrature — the spread of household sizes is a real source of doubt |
| **Unanimous clamp** | `p` is floored at `0.5/n`, so a perfect sample of 10 lands at `z/n` rather than 0. A sample that came back 10 of 10 must not be reported as certain |
| **Refusal** | `P(answer) = response − selectivity·(size/mean − 1)`, clamped to [0,1] |
| **The estimator** | ratio estimator: `perHousehold × trueHouseholds`. Note what is **not** there — no division by the response rate. Non-response does not shrink a district; it corrupts the sample only when the refusers differ from the answerers |
| **Missing wards** | omitted from the total entirely, and **named on screen**. The page says which ones and what they'd add "if they are average" |
| **Confidence** | claim 80/90/95/99%. The Board accepts a more confident claim. The interval widens — and a wider interval can rescue an estimate that would otherwise fail |

## The numbers

Five levels, 1841→1881. `minDistricts` means "wards the Board requires you to
count", and it is never above the day budget, because **one survey costs one
day** — a level asking for more wards than it had days would be a puzzle with
no solution.

| Year | Level | Budget | Days | Wards | Required | Within |
|---|---|---|---|---|---|---|
| 1841 | First Enumeration | £1,100 | 4 | 4 | — | 12% |
| 1851 | By Ward | £2,400 | 6 | 6 | 6 | 10% |
| 1861 | The Hill Problem | £3,400 | 7 | 7 | 7 | 9% |
| 1871 | By Inference | £4,200 | 8 | 8 | 8 | 8% |
| 1881 | The Great Census | £6,400 | 10 | 10 | 10 | 7% |

Ten ward kinds, from the Harbour (9,400 people, 5.2 per house, 90% answer) to
The Refuge (1,400 people, 2.2 per house, 52% answer, selectivity 0.30). The
Hill Wards are the trap: 3,600 people, response 0.46, **selectivity 0.34**.

## The arithmetic is honest — and here is the measurement

`census-pwa/sim.test.mjs` runs a 60-seed coverage check, because a stated
confidence level that is not true teaches the opposite of what the game is
about:

| | Coverage of a claimed 95% interval |
|---|---|
| Nothing selective | **~92%** ✅ |
| Selective non-response | **~75%** |

That gap is the game. An interval covers sampling error and *cannot* cover a
bias — which is precisely what the Board's verdict message tells you.

## How it's built

```
census-pwa/
├── sim.js          every distribution and formula; no DOM, no canvas
├── game.js         drawing and input only
├── index.html      page shell
├── styles.css      paper-and-ink palette, mobile-first
├── manifest.json
├── service-worker.js
├── icons/          SVG + maskable
├── sim.test.mjs    130 checks — hand-checked values, coverage, bias
├── smoke.mjs       Playwright: briefing→survey→publish, geometry, overspend
└── shot.mjs        writes shots/ for review
```

`sim.js` is a separate file on purpose: the maths can be unit-tested without a
canvas, which is how the coverage numbers above are measured rather than
asserted.

The layout is derived from the canvas size, not fixed at 900×620. An earlier
version used a hardcoded pixel layout that looked correct in one window and
overlapped itself in another — the toolbar sat on the header, and the strip
along the bottom fell off the canvas. `computeRects()` now divides the frame
proportionally and stacks the panel under the map below 720px.

## Controls

| Action | |
|---|---|
| Select a ward | tap it |
| Set enumerators | the `−` / `+` stepper (steps of 5), or **fewer** / **more** |
| Send them | tap the middle of the stepper |
| Change confidence | **Claim** (levels 4–5 only) |
| File the return | **File the return** |

Each visit costs `visitCost × n` and one day of the deadline. An unaffordable
batch is refused with the reason, not clamped — spending into a survey you
cannot pay for is the exact error the game is about.

## Saving

`localStorage["census-save"]` → `{level, unlocked}`, written on
`visibilitychange`. **The survey itself is not saved** — money, days, districts
and rolls are all in memory, so a reload restarts the round.

The run log is written through `R2.stats.run({slug:"census-pwa/", ...})`, which
is what `stats-pwa/` charts.

## Tests

```bash
node census-pwa/sim.test.mjs    # 130 checks
node census-pwa/smoke.mjs       # in-browser, needs a local server + playwright
```

`smoke.mjs` drives a small test seam on `window.__census` rather than guessing
pixel coordinates, which is how it was catching layout changes as failures.

## Known limits

- 🔴 **No level progression.** `unlocked` is always `state.levelIndex`, and
  `levelIndex` is never advanced, so after clearing level 1 the level list only
  ever offers level 1.
- 🟡 **No audio.** `shared/chart.js` is loaded but unused, and there is no
 AudioContext anywhere. (The root README used to claim "Canvas 2D + WebAudio"
  — that was wrong, and is fixed.)
- 🟡 **The confidence lock is decorative.** Levels 1–3 refuse the Claim button
  and flash a message rather than locking the value.
- 🟡 Pointer only — no keyboard path past the help dialog, no ARIA on the
  canvas controls.
- ⚪ `CensusSim.advanceDay()` is exported but never called.
- ⚪ `boot()`'s restore check reads `if (i < stored.unlocked)`, which means a
  saved level equal to the unlocked index is never restored.

## What's next

- 🔴 **Level progression** — write `metro-pwa`'s `PROGRESS_KEY` equivalent:
  advance `levelIndex` on an accepted return, persist it, unlock the next year.
- 🟠 **Persist the survey.** Money, day, per-ward `sampled`/`answered`/
  `counted`. Without it the game cannot be left and resumed, which is the one
  thing an offline-first PWA should do.
- 🟡 **Make the confidence lock bite** on levels 1–3, or delete it.
- 🟡 **A "what would have happened" epilogue** — replay the same seed under a
  stratified plan, so a player who just lost can see the counterfactual.
- 🟢 Sound: a soft tick per door answered, a paper-stamp on publish.
- 🟢 Keyboard: arrow keys through wards, Enter to send.
- ⚪ Remove the unused `../shared/chart.js` include, or use its sparkline for
  the per-ward error table.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).

No fonts are fetched, no third-party asset is attributed, no network request
is made anywhere.
