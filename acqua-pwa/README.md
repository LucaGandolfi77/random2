# ACQUA

> Bring water to a Roman city with nothing but gravity. Trace channels along
> the terrain, throw arches across the valleys, bore under the hills — and
> read the water: **the flow is the capacity of your worst segment.** Too flat
> and it stagnates, too steep and the channel erodes away.

*The aqueduct engineer.* No build step, no dependencies. No art assets — the
terrain, the channels and the animated flow lines are drawn on canvas.

**Play it:** <https://lucagandolfi77.github.io/random2/acqua-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/acqua-pwa/
```

---

## The one rule

**Flow is the minimum of the segment capacities, not the average.**

`recomputeFlow()` walks every segment and takes
`min(flow, SOURCE_FLOW · drought · capFactor(seg))`. One badly-sloped segment
chokes the whole aqueduct, which makes the profile a puzzle rather than a
decoration: you cannot fix a weak stretch by strengthening the strong ones.

`capFactor(seg)` returns 0.12 below slope 0.04, 0.55 below 0.09, 1 inside
0.09–0.35, 0.85 up to 0.55, then falls off as
`max(0.3, 0.75 − (s−0.55)·0.6)` — and is scaled by health, by 0.1 when broken,
and docked 50% per unit of stagnation *and* of erosion.

## The systems

| | Rule, as implemented |
|---|---|
| **Degradation** | health −0.0022/s. Worse inside the bad bands: +0.006/s above slope 0.55, +0.004/s below 0.05, floor 0.35. A bad slope physically destroys the channel |
| **Drought** | every 50–110s, 55% chance of a 30–55s drought at half flow |
| **Breakage** | 0.0012/frame that a segment below 0.75 health breaks. Repair costs `40 + len·0.1` |
| **The city** | appears only after the castellum is built. A new building needs growth > 11s, satisfaction > 0.72, and fewer than 24 buildings |
| **Defeat** | `demand > 3` and `satisfaction < 0.4` for 45s (rebellion), or money below −300 |
| **Terrain** | seeded daily from `R2.dailySeed()`, so the hill is the same hill all day for everyone |

## The numbers

World 1720 wide, 640 of elevation · day = 180s across 4 seasons ·
`SOURCE_FLOW 12` · 11 fixed terrain control points plus jitter · castellum must
sit past x = 1100 · minimum placeable slope 0.018 · costs 1.2 ground / 2.0 arch
/ 3.0 tunnel per unit, pillars 0.5 · start money 400 · 4 building types
(demand 2 / 1 / 1.5 / 5) · score `floor(totalWater/10 + buildings·20)`.

## How it's built

```
acqua-pwa/
├── game.js     terrain, hydraulics, city — one file, ~730 lines
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

Flow is rendered as an animated dashed line whose dash offset scales with
`state.flow`, so the water visibly slows down in a bad stretch. The whole world
auto-fits the canvas — no pan, no zoom — because losing sight of the profile is
what makes an engineering puzzle unreadable.

## Controls

| Action | |
|---|---|
| Lay a segment | drag on the elevation profile |
| Repair | tap the segment |

Pointer only — no keyboard.

## Saving

`localStorage["acqua-best"]` and
`R2.saveJSON("acqua-pwa", {highScore})`. **A reload discards the whole
aqueduct.**

## Known limits

- 🟡 **No resume.** Only the high score persists; an in-progress city is lost.
- 🟡 **Seasons are cosmetic.** Nothing in the hydraulics or the city changes per
  season.
- 🟡 `state.discontent` decays but never reaches the HUD, so the drift toward
  rebellion is invisible until it happens.
- 🟡 *"Repair segments"* only selects the last segment rather than the broken
  one.
- ⚪ `dist2()` and `modalOpen()` are defined and never called.

## What's next

- 🟠 **Save the network.** Nodes, segments, buildings, money, year. This is the
  single change that makes it a tycoon rather than a round.
- 🟠 **Make the seasons matter.** A spring melt that raises flow, a summer
  drought that halves it — the data (`SOURCE_FLOW`, `droughtNext`) is already
  there.
- 🟡 Surface `discontent` in the HUD as a bar. A hidden pressure gauge makes a
  rebellion read as arbitrary.
- 🟡 Maintenance the TODOs already name: calcare that narrows channels over
  time, and sediment that has to be cleared.
- 🟢 Sound: a filtered hiss whose bandwidth tracks flow.
- 🟢 Keyboard placement, and an overview that shows flow as a colour ramp along
  the channel.
- ⚪ Remove `dist2()`/`modalOpen()`, or finish the repair selector.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
