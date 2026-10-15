# Isola Resort

> A low-poly isometric resort. Boats bring guests carrying a desire; you build
> and upgrade the services that satisfy it. **Population is a feedback loop:
> reputation drives arrivals, arrivals drive revenue, revenue buys what raises
> reputation.** Weather and a day/night cycle reprice all of it.

*Isola Resort Tycoon.* Vanilla Canvas 2D + `shared/arcade.js`. No build, no
dependencies, no art assets: every palm, boat and guest is drawn procedurally
and every sound is WebAudio.

**Play it:** <https://lucagandolfi77.github.io/random2/resort-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/resort-pwa/
```

---

## The one rule

**Growth is a reputation loop, not a purchase list.**

`arrivalT = (6 + rand(4)) × clamp(65/rep, 0.55, 1.9)` — the arrival interval is
literally divided by your reputation. Reputation rises when a guest gets what
they wanted and falls when they run out of patience, so the *only* way to grow
is to keep people happy, and the only way to lose is to build past your service
capacity. Reputation clamps to 10–100 and never falls out of the game.

`chooseTarget()` picks the least-loaded matching building
(`score = load·100 + manhattan distance`), which means a queue is a real
cost, not a decoration. Guests have patience
`20 + rand(8) + beauty·0.15` seconds; −4 reputation for each that runs out
(−8 for a VIP).

## The systems

| | Rule, as implemented |
|---|---|
| **Pricing** | `price × (1 + 0.25(level−1))`, ×4 for VIPs, plus a 25% tip when rep ≥ 80 |
| **Day cycle** | 100s day + 25s night. Night arrivals ×0.25; hotels accrue `level·8`/s overnight, paid at dawn |
| **Weather** | 3 states at weights 55/27/18, multiplying arrivals, prices and tips |
| **Daily events** | separate table, applying their own multipliers |
| **Offline income** | capped at 8 hours, at 0.4× rate, ignored if away under 120s |
| **Missions** | 10, rewards £100→£1,500 |
| **Expansion** | 16×16 grid, two rings at 6.4 and 7.4, costing £650 and £1,600 |

## The numbers

8 catalog types (umbrella / snack / bar / pool / cabana / hotel / palm /
torch) · max level 3 · caps [1,2,3] per type · `MAX_GUESTS 40` ·
`GUEST_SPEED 1.7` tiles/s · 80 stars, 130 raindrops, 5 skins, 7 outfits ·
start 180 coins and reputation 55 · autosave every 6s.

## How it's built

```
resort-pwa/
├── game.js     the iso engine, the city, the guests — one IIFE
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

The iso engine rotates the **projection**, not the logical grid:
`rotPt()`/`invRotPt()` remap `N-1−x`/`y` for the four orientations and
`tileList` is re-sorted by rotated depth on each rotation. That is a small,
clean way to do camera rotation that avoids carrying a rotated logical grid
through the game rules.

There is also a generative calypso sequencer whose tempo (310/370/440ms) and
scale follow the weather and the time of day — which is the kind of detail that
makes a game feel inhabited rather than simulated.

## Controls

| Action | Touch / Mouse |
|---|---|
| Place / select | tap a chip, then tap a tile |
| Upgrade / sell | tap a placed building |
| Pan / zoom | one-finger drag, two-finger pinch, or the wheel |
| Rotate camera | header button |
| Export / import save | header buttons |

Pointer only — **no keyboard controls at all**.

## Saving

`localStorage["resort-pwa-save"]` → `{v:1, coins, rep, day, dayTime, ringIndex,
lastSeen, dailySeed, dayEarned, dayServed, missionIdx, stats{served,lost,earned,
vipServed}, buildings[{t,x,y,l,i}]}`. Plus `resort-pwa` for the high score.

This is a **complete** save, with an offline-income model built on `lastSeen`.

## Known limits

- 🟡 **No lose condition.** Nothing can end the run.
- 🟡 **No keyboard.** Everything is a pointer gesture.
- 🟡 Offline income only counts hotels and servable buildings — decor
  contributes nothing, so closing the app with a beautiful island earns
  nothing.
- 🟡 No `R2.stats.run`, so nothing reaches `stats-pwa`.
- ⚪ The welcome text carries a typo: "mejorarla" (line 69).

## What's next

- 🟠 **Report runs.** Day reached, money earned, guests served, VIPs served —
  the stats object already accumulates all of it.
- 🟠 **A lose condition.** Bankruptcy, or a day where reputation falls below
  the point new guests stop arriving. A tycoon with no floor is a toy.
- 🟡 Keyboard: `1`–`8` to pick a building, arrows to move the cursor, `Z`/`X`
  to rotate, `+`/`−` to zoom.
- 🟡 A seasonal economy — high season and off season — which the weather
  machinery is already 80% able to express.
- 🟢 Sound is there but the music is the star: extend the generative calypso
  with a night-time mode.
- ⚪ Fix the "mejorarla" typo.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
