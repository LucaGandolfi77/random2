# ALVEARE

> You are the mind of the hive. The scouts discover the flowering fields; you
> **draw the waggle dance** to route the workers — angle off the sun is
> direction, length of the stroke is distance. Honey, seasons, and winters
> that have to be survived.

*Waggle Dance.* No build step, no dependencies. No art assets — the meadow, the
dance floor and the bees are drawn on canvas from primitives.

**Play it:** <https://lucagandolfi77.github.io/random2/alveare-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/alveare-pwa/
```

---

## The one rule

**The dance you draw is the order.**

There is no "send workers to field 4". You physically draw a stroke on the dance
floor: its angle from the sun icon encodes direction, its length encodes
distance. `evalDance()` scores it as `0.6·accA + 0.4·accL`, where
`accA = 1 − angErr/45` and `accL = 1 − lenErr/0.6`, and recruits
`floor(idle × acc)` bees. Above 0.35 the squad flies to the real patch; below
it, it flies into empty space. The distance rings are drawn at 300/600/900/1200m
so the stroke can be judged against something.

After the dance is evaluated the *true* vector is drawn as a green dashed line,
which is the moment you find out how good your aim was.

## The systems

| | Rule, as implemented |
|---|---|
| **Squad cycle** | `2·d/BEE_SPEED + FORAGE_T (6s)`. Yield = `bees × patchRateEff × eff × FORAGE_T` |
| **Hornets** | patches 3 and 9 of 15 are always `vespaio`. 2 bees die per cycle |
| **Pesticide** | makes a patch *toxic*: rate ×0.2, and 1 bee/cycle at 50% chance |
| **Seasons** | 100/120/100/110 seconds at ×1.00 / ×1.10 / ×0.75 / **×0.00**. Winter produces nothing and keeps consuming — and entering it wipes `state.squads` |
| **Consumption** | `pop × 0.015 × (1 + 0.08(year−1))` per second. Below zero, starvation costs 1 bee every 3s |
| **Wasp raid** | 0.004/frame: −12% honey, −1 bee. Summer and autumn only |
| **Scouts** | 2 at start, max 3, £60 each |

## The numbers

World 1600×1600, hive at centre · 15 patches, 5 flower types (+1 wasp type with
rate [0,0]) · `BEE_SPEED 140` · `FORAGE_T 6` · `DIST_PER_PX 8.6` ·
`SLOTS_MAX 22` · start honey 40, pop 10, slots 10 · brood 25 (18s) · expand £80
for +4 slots · report queue max 4 · starts in spring, year 1.

Score is `totalHoney + 150(year−1) + pop·4`.

## How it's built

```
alveare-pwa/
├── game.js     the meadow, the dance floor, the economy — one file
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

`updateScouts()` carries an explicit bug-fix comment: the outbound step is
applied only in phase `"out"`, because a returning scout would otherwise cancel
it and hang forever. Worth reading if you are writing a two-way respawn.

## Controls

| Action | |
|---|---|
| Draw a dance | drag on the dance-floor canvas (start within 55px of centre, ≥3 points, ≥12px) |
| Info | single tap on the meadow shows a toast |
| Dance / brood / cells / scout | four dock buttons |

Pointer only — no keyboard input.

## Saving

**None but the high score.** `localStorage["alveare-best"]` and
`R2.saveJSON("alveare-pwa", {highScore})`. No game state is ever written.

## Known limits

- 🟡 **Complete absence of persistence.** Closing the tab abandons the run with
  no way to resume, on a game whose loops are measured in minutes and seasons.
- 🟡 **Winter wipes your squads** with no consent from the player.
- 🟡 Squad bees can exceed the idle pool the dance was computed from.
- ⚪ The *esploratrice* scout reuses `Sound.expand` rather than its own cue.

## What's next

- 🟠 **Persist the hive.** Population, honey, slots, scouts, year and season.
  Without it there is no multi-session colony, only a demo of one.
- 🟠 **Warn before winter.** A "the swarms are out, they will be lost" prompt
  would turn the wipe into a decision.
- 🟡 Bees at work: a squad's size should visibly draw down the idle pool.
- 🟡 A second dance type — a *round* dance for "nearby" without a vector, the
  way real bees do it.
- 🟢 Keyboard: arrows set the angle, `[`/`]` the length, Enter to confirm.
- 🟢 Sound for the dance evaluation — the accuracy read as a rising or falling
  interval.
- ⚪ Give the scout its own sound cue.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
