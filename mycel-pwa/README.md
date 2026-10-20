# MYCEL

> A branching fungal network in dark soil. More tips, one finger per tendril.
> The body is persistent: growing costs biomass, parasites eat the network,
> and toxic zones erode it. Nothing respawns, so the shape you build is the
> shape you keep.

No build step. No dependencies. No art assets — the soil, the hyphae, the
spores and the parasites are drawn procedurally.

**Play it:** <https://lucagandolfi77.github.io/random2/mycel-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/mycel-pwa/
```

---

## The one rule

**The body is a persistent graph, not a respawning snake.**

You steer several live growing tips at once — touch claims the nearest
unclaimed tip, one finger per tendril — and growth is a **biomass economy on a
persistent shape**: every point you grow costs, every spore you eat pays, and
every branch is an investment with descendants. Disable a tip and it kills all
its descendants, recursively: the network frays from where you cut it.

## The systems

| | Rule, as implemented |
|---|---|
| **Growth cost** | 0.4 biomass per point, paid when `t.acc` reaches `SPACING (7)`. If a tip cannot pay, it simply stops |
| **Spores** | +14 each inside 15px. Respawn 6s after being eaten |
| **Branching** | −45 biomass and 1 of `MAX_TIPS (4)`. The new tip spawns at the midpoint of the longest tip's path |
| **Parasites** | 4, homing at 62px/s, popping path points within 26px for −0.2 biomass each; die after eating 140 |
| **Toxic zones** | 6 zones, r 110–155. Inside: −16 biomass/s *and* −13px/s of tip erosion. The only thing that shortens the body |
| **Rocks** | 12, r 30–58, blocking growth. Tips probe-repel 30px ahead |
| **Bots** | 3 named rivals, respawning 3s after death; they branch on their own once biomass allows |
| **Minimap** | bottom-left, screen-space: spores, toxics, rocks, parasites, every network's tips and the viewport rectangle |

### Graphics notes

Procedural soil pattern (256px tile) · cached radial gradients for toxic zones
(+ drifting motes inside) · two-tone rock shading · wobbling worm trails with a
pulsing head · screen shake on severed tips · cached vignette · glow via
`shadowBlur` on network strokes only.

## The numbers

Map 2400×2400 · `SPEED 95`, `TURN 3.4` rad/s · `START_B 120` · `SPACING 7` ·
80 spores · 12 rocks · 6 toxic zones · camera zoom
`clamp(760/(spread+420), 0.34, 0.9)` · `dt` clamped to 0.05.

## How it's built

```
mycel-pwa/
├── game.js     the network, the biology, the camera — one file
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

The interesting detail is in the growth accumulator. Growth distance is
accumulated in `t.acc` rather than measured from the last saved point each
frame, because at variable `dt` that would read exactly `speed·dt` and never
reach `SPACING`. The comment in the source flags the trap.

Touch→tip assignment is rebuilt bidirectionally every frame so `t.claim`
indices stay valid across `touches.splice()` — the usual off-by-one in a
re-assigned hand is absent.

## Controls

| Action | Touch | Mouse |
|---|---|---|
| Steer | drag; each finger claims the nearest free tip | all tips follow the cursor |
| Branch | the 🌿 Ramo button | same |
| Sound | header button | same |

Pointer only — **no keyboard input at all**.

## Saving

`localStorage["mycel-best"]` (best length) and
`R2.saveJSON("mycel-pwa", {highScore})`. **No mid-run state** — a reload
restarts the network from nothing.

## Known limits

- 🟡 **No resume.** The whole body lives in memory; only the best-length record
  survives.
- 🟡 No keyboard input.
- 🟡 No `R2.stats.run`, so runs never reach `stats-pwa`.
- ⚪ `state.shake` is initialised and never set to a non-zero value anywhere.

## What's next

- 🟠 **Persist the network.** Serialising nodes + tips is small; the whole
  point of a persistent body is that it outlives the session.
- 🟠 **Report runs.** Length at death, tips maintained, spores eaten — the data
  the dashboard already wants.
- 🟡 Keyboard: WASD steers the focused tip, `B` branches, `Tab` cycles tips.
- 🟡 A genetics layer: two spores combining into a third with merged traits,
  so the network you grow is a lineage.
- 🟢 Sound: a soft granular noise for growth, a filtered click on branching.
- 🟢 A "view a finished network" mode — the persistent body deserves to be
  looked at, not just built.
- ⚪ Remove `state.shake`, or add the camera shake it was for.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
