# Snake

> Swipe to turn, collect, and survive. Three modes with different rules —
> classic, timed, and a **daily** where the board is seeded from the date, so
> everyone gets the same fruit in the same place.

*A creative Snake.* Themes, power-ups, particles, synthesized WebAudio, touch
controls, install prompt and offline support. No dependencies, no art assets.

**Play it:** <https://lucagandolfi77.github.io/random2/snake-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/snake-pwa/
```

---

## The one rule

**The tick rate is speed-scaled, so the snake gets harder to steer exactly as
it gets longer to control.**

`tickAccumulator >= 1/(8 + (level−1)·0.8)`, and the accumulator itself is
multiplied by `level` and by 1.2 in time mode. Speed and length rise together.

`level = floor(score/100) + 1`, checked when `score % 100 === 0`. Each level
adds obstacles — up to `level − 1`, one per chance roll of 0.3/tick.

## The systems

| | Rule, as implemented |
|---|---|
| **Food** | +10 × level. Seven food emoji |
| **Power-ups** | 20% chance after each food, lives 15 ticks: rainbow +150, star +50, clock +10s |
| **Modes** | classic (walls kill), time (60s clock), daily (seeded board) |
| **Daily** | food, power-ups and obstacles all come from `mulberry32(dailySeed + eaten·7919)` (+104729·obstacles for obstacles). Fully reproducible |
| **Win** | the board is full — `placeFood()` finds no empty cell and sets `gameOver` |

## The numbers

Canvas 400×400, cell 20 → a 20×20 grid · `initialLength 4` · `foodScore 10` ·
`powerupScore 50` · 3 power-up types · 4 themes · 60s in time mode · 20px
swipe threshold.

## How it's built

```
snake-pwa/
├── game.js     state, input, fixed-timestep loop, rendering — one IIFE
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

Daily-mode reproducibility is the nice part: the food cell is chosen by
indexing the *full list of free cells* with
`floor(mulberry32(seed) · empty.length)`, so the same seed replays the same
board all day, for every player.

Sound is `R2.makeSound()` — declarative maps like
`{ eat: [220, 0.06, "triangle"] }` — which is the pattern every simple game in
the repo uses.

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Turn | swipe (＞20px), one turn per swipe | arrows / WASD |
| Pause | — | `Space` |

Installable and offline-capable once installed.

## Saving

`localStorage["snake-pwa"]` → `{highScore, theme, mode}` ·
`localStorage["snake-daily"]` → `{date, high}` via `R2.saveJSON` ·
`snake-install-dismissed`.

Runs are logged through
`R2.stats.run({slug:"snake-pwa/", score, durMs, wave:level, outcome:"loss",
meta:{mode, eaten}})`, so the daily-mode streak shows up in `stats-pwa`.

## Known limits

- ⚪ `DOME.swipeHint` caches `#swipe-hint` — an element that does not exist in
  this page (it exists in `pokemon-go-pwa`). A permanently null reference.
- ⚪ `state.paused` also means "dead": `die()` sets it true, so the death
  overlay and the pause overlay share one flag.
- 🟡 The daily high score is only written on death, never mid-run.
- 🟡 No tests.

## What's next

- 🟠 **Daily streaks.** The daily seed is already there and reproducible; a
  streak counter and a "come back tomorrow" surface would turn a mode into a
  habit.
- 🟠 **Tests.** The seeded board is deterministic, which makes the food
  placement and RNG contract exactly the kind of thing a unit test pins.
- 🟡 Distinct `dead` and `paused` states — the shared flag is the only reason
  the overlays share a look.
- 🟡 Chase and tail-chase game modes; the seeded daily board makes them fair.
- 🟢 Animated skin transitions between themes rather than an instant swap.
- ⚪ Remove the `#swipe-hint` reference.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
