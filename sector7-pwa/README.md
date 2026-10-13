# SECTOR 7

> A low-poly space combat game for your pocket. Harvest energy, shoot pirates,
> dock at the station and upgrade your ship — **against the sector, not a clock.**

No build step. No dependencies. No art assets. Everything you see is drawn
procedurally on a canvas from a few hundred numbers.

---

## Play

```bash
git clone https://github.com/LucaGandolfi77/random2.git
cd random2
python3 -m http.server 8080
# open http://localhost:8080/sector7-pwa/
```

Installable as an app: open it, add it to your home screen, and it runs
fullscreen and fully offline.

| Control | Touch | Keyboard |
|---|---|---|
| Fly | left thumb, anywhere — the stick appears where you press | `WASD` / arrows |
| Blaster | `FIRE` (hold to keep firing) | `Space` |
| Missiles | `MSL` — one press, one salvo | `M` |
| Mines | `MINE` — drops behind you | `B` |
| Dock | hold `DOCK` inside the station ring | hold `E` |
| Aim assist | toggle under the pads | same |

Missiles and mines are **edge-triggered**: one press, one salvo. Holding the
button would empty the whole magazine into a single hull every cooldown, which
is not what a salvo is for.

---

## The loop

**Energy** buys module upgrades and pays the docking fee. It lives on your ship
and it dies with your ship — when you are wrecked, every point of it hits the
deck where you fell, and you have to fly back out and scoop it up before it
expires.

**Crystals** are banked the instant you touch them and can never be lost. They
are your score, they are the escalation dial — the sector only spawns NPC tiers
you have earned the right to fight — and they are what opens new sectors and
buys permanent refits.

That is the whole tension. Energy is the fuel, crystals are the score, and
every crystal you bank brings something heavier out of the dark.

### The station

Hold `DOCK` inside the ring around the station. Docking is a loan, not a gift —
a slice of your energy is the fee, charged on launch.

The station has four tabs.

| Tab | What it is for |
|---|---|
| **Modules** | The energy economy. Seven tracks, ten levels each. |
| **Contracts** | Three rotating objectives that pay in crystals. |
| **Refits** | Permanent perks bought with crystals, never refunded. |
| **Sectors** | Pick your map. |

#### Modules — paid for with energy

| Module | Effect |
|---|---|
| **Blaster** | Bigger hits, shorter gaps between shots |
| **Shield** | More hull, plus regen once you are past level 2 |
| **Armor** | Flat damage cut — useless against scrap, decisive against warlords |
| **Processor** | Lifts the energy you pull out of every wreck |
| **Thruster** | Speed *and* a tighter turn |
| **Missiles** | Lock-on burst. Splash damage cuts through armour. |
| **Mines** | Proximity mines. The only defence that works while you flee. |

A level-1 ship is always what you respawn with, so there is never a dead end
and never a soft-lock.

#### Contracts — paid for with crystals

Three objectives per sector, seeded per sector, so the board is the same every
time you visit and you can plan around it rather than reroll for free. Five
kinds: break rich rocks, destroy pirates, open crates, bank crystals, and
survive without wrecking.

Progress is tracked while you fly — there is a compact strip above the left
thumb, so the board is visible out in the field and not only when you dock.
Finishing a contract replaces it with something else from the same seeded pool,
so the easiest one cannot be farmed over and over.

#### Refits — permanent, bought with crystals

Refits are the reason crystals are a decision and not just a rising number.
Each one changes how the rest of the game behaves rather than adding to a stat.

| Refit | Effect |
|---|---|
| **Salvage Rig** | Recovers 14% of the energy you would have lost on a wreck, per level. What it recovers is banked, so a rigged wreck still costs you the tank. |
| **Frame Plating** | +4% max hull per level, multiplicative on top of Shield. |
| **Tractor Field** | +35% pickup radius per level. |
| **Survey Suite** | Contracts pay +20% per level. |
| **Broker Contact** | Bounty values +30% per level. |

They are paid for out of the same crystal balance that contracts pay into.
There is deliberately no second "refit budget" — the quote and the purchase
read the same number, or the station would show an affordable price and then
quietly refuse.

### Bounties

Every so often the sector sends a named hunter after you specifically. It knows
where you are from the moment it appears, it carries missiles and lays mines,
and **its price climbs the longer it lives** — so ignoring it is a real option
and fighting it is a real decision. Kill it and the bounty is paid out
immediately, in crystals, with a banner and a kill-feed line. It is the
largest single crystal event in a run.

The hunter you killed last time is remembered, so a rival that killed you
yesterday comes back.

### Sectors

Four maps, each with its own rock field, palette, NPC cap, payout multiplier
and hazard. They open in order, gated on **lifetime** crystals — never the
spendable balance, because a sector that relocked itself the moment you bought
something would be a trap rather than a goal.

| Sector | Tier cap | Payout | Hazard |
|---|---|---|---|
| **ROOK** — outer shelf | 3 | ×1.00 | none. Learn the sector here. |
| **KESTREL** — ion shelf | 5 | ×1.35 | Ion storms that make the stick lie |
| **VANTA** — dead nebula | 7 | ×1.80 | Nebulae that eat your regeneration |
| **MAW** — the gravity well | 8 | ×2.40 | Wells that bend every trajectory |

Each sector draws from its own part of the seed space, so two maps never roll
the same rock field, and the station always sits dead centre in every one of
them. Modules, crystals, refits and energy all carry across when you travel —
the cost of a harder sector is that it is harder, and the gate already made you
earn the right to go there.

---

## How it looks

There is no WebGL here and no 3D engine. The whole game is Canvas 2D, drawing
flat-shaded facet meshes through an **oblique projection**.

Every hull, rock, crate and the station itself is a small mesh assembled from
two primitives (`box`, `prism`) by build-time transforms — scale, offset,
rotate, merge. Nothing is loaded; nothing is art-directed by hand except the
five hull silhouettes.

Two things make that read as low-poly rather than as flat shapes:

1. **Per-face lighting from one dot product.** Each face gets its own constant
   brightness from `dot(faceNormal, keyLight)`. Because the projection is
   linear, a constant 3D normal maps to a constant screen gradient — so
   per-face lighting is mathematically exact and costs one multiply per face.
   No per-pixel work, no shaders.

2. **A sheared view vector.** The projection is
   `sx = x + yaw·z`, `sy = ySquash·y − zTilt·z`. Without the `yaw` shear, faces
   pointing along `x` project to exactly zero width and every box renders as
   two polygons and an outline. With it, one side face opens up and solids read
   as solids. The view vector is derived from the projection itself
   (`config.js`), so back-face culling can never drift out of sync with what is
   actually on screen.

Map orientation never rotates — north stays north — so lining up the blaster
never fights the camera. That is the one thing this shares with real Darkorbit
and the one thing it gives up to get the low-poly look.

---

## Architecture

```
sector7-pwa/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js          cache-first, unique CACHE_NAME
├── scripts/gen-icons.mjs      SVG → PNG via sharp; dev-only, never runs in CI
├── icons/                     SVG sources + committed PNGs
├── src/
│   ├── config.js              all tuning, palette, module + refit tables, math
│   ├── storage.js             ship / stats / settings under `sector7.v1.*`
│   ├── sectors.js             the sector table and its gating rules
│   ├── world.js               entities, pools, collision, hazards, events
│   ├── stations.js            docking rules, the energy economy, refits
│   ├── contracts.js           the rotating board, progress and payout
│   ├── bounty.js              hunters, escalating bounties, persistence
│   ├── render.js              mesh factory, facet renderer, camera, minimap
│   ├── player.js              steering, soft auto-aim, docking state machine
│   ├── npcs.js                patrol / attack / flee AI, tier rolling
│   ├── input.js               thumb-anchored stick, action pads, keyboard
│   ├── audio.js               WebAudio, every sound synthesised at runtime
│   ├── ui.js                  HUD, station panel, kill feed, screens
│   └── main.js                loop and state machine
└── tests/
    ├── sim.test.js            headless simulation and economy invariants
    ├── render.test.js         headless render smoke test
    ├── boot.test.js           headless boot of the whole app against a fake DOM
    └── content.test.js        sectors, hazards, weapons, contracts, refits
```

Loaded as plain scripts (no modules, no bundler), all reading one `window.S7`
namespace, exactly like the rest of the arcade.

`world.js` does not know what a sector *is* — it reads `world.sector` and the
counts, caps and palette off it. Adding a fifth map is one row in
`sectors.js`.

### Rules that hold everywhere

- **Every collection that churns is a fixed pool** allocated once: bullets,
  missiles, mines, pickups, particles, floaters. The draw path and the sim path
  allocate nothing. Mobile GC pauses are the biggest single cause of jank in a
  canvas game.
- **Nothing reaches the renderer without a view vector.** Sort keys and cull
  tests both come from `PROJ`.
- **No living ship is ever at zero hull.** Bullets kill through their own path
  so the kill feed knows the shooter; `world.js` also carries a safety net that
  kills anything the last point of hull reached by any other route.
- **Failed purchases mutate nothing.** Every station transaction returns
  `{ok, spent}` and only touches the ship on success — asserted directly.
- **Quotes and purchases read the same number.** The station showed an
  affordable Frame Plating price and then refused, because the quote checked
  `ship.crystals` and the purchase charged a separate `refits.crystals` pool
  that was always zero. One balance, one truth.
- **Loot adds up.** Energy dropped on death is split into a capped number of
  chunks, and flooring the per-chunk value silently destroyed up to
  `chunks - 1` energy. The remainder is spread one point at a time; a test
  asserts `spilled + banked === tank`.
- **Crystals are banked on pickup**, not on death, so a bad end to a run can
  never cost progress.

---

## Tests

```bash
node sector7-pwa/tests/sim.test.js       # 156 checks
node sector7-pwa/tests/render.test.js    #  84 checks
node sector7-pwa/tests/boot.test.js      #  50 checks
node sector7-pwa/tests/content.test.js   # 141 checks
```

`sim.test.js` runs the real world/AI/station modules with no browser: sector
determinism, purchase invariants as a property test across every module and
price band, save/load round-trips including deliberately corrupt saves, pool
integrity under sustained fire, the docking round-trip, the death-and-loot
loop, and the damage model.

It also runs a **difficulty-curve test**: one minute of play across eight
seeds, twice — once as a rookie (no crystals, so the sector is all tier-1
raiders) and once as a banked pilot (700 crystals, so the sector rolls heavy
tiers). The current numbers, stable over a dozen consecutive runs:

```
rookie:  11 kills/min,  0/8 runs ended in a wreck
veteran: 5 kills/min,   6/8 runs ended in a wreck
```

The assertion is on the **contrast** between the two profiles, not on absolute
counts — spawn points and loot scatter use `Math.random`, so a bare count
threshold on a handful of runs is a coin flip. The intro has to be survivable,
the late game has to bite, and the second must be strictly worse than the
first. If a balance change breaks any of that, the suite says so.

`render.test.js` stands in a recording 2D context and makes very sure nothing
reaching it is `NaN`, then goes further: it pushes known meshes through the
real `drawMesh` and compares **every drawn polygon** against an independent
projection of the same mesh.

That comparison is the most valuable check in the repo. The vertex stride bug
it was written for (`o += 1` where the reader indexed `vertex * 3`) made every
hull render slightly soft — which read as an art choice, not a bug — while
turning the station into an unreadable smear of screen-filling polygons. No
assertion about NaN, counts or screen-bounds would have flagged it. Comparing
geometry against the projection itself does.

It also pins the framing invariants the difficulty curve depends on: a point on
the camera lands at the centre of the screen, the fitted zoom really delivers
the promised view span, **no NPC can engage from further away than the player
can see**, and the player ship still reads at a sane size.

`boot.test.js` boots `main.js` against a fake DOM built from the real
`index.html` and drives the animation loop by hand: menu → launch → touch
steering → dock → buy an upgrade → repair → undock → die → relaunch → menu, with
no `AudioContext` available. It exists because the other two suites
deliberately skip the browser layer, so an element id rename or a wiring typo
would otherwise only surface by opening a browser and clicking.

It also asserts that **every `<button>` in `index.html` has a listener
attached**. That check exists because the station's `LAUNCH` button shipped
with no handler at all — the only way out of the station was "Back to menu" —
and nothing else in the suite noticed, because a test only clicks the buttons
it already knows about.

Its fake DOM queries the real `index.html` by class, not just the element's
own `innerHTML`, so a query that reaches into static markup works the same way
it does in a browser.

`content.test.js` covers everything added after the core loop: the sector table
and its gating ladder, sector-driven generation, hazard geometry and behaviour,
missiles and mines, the contract board, bounty hunters and refits. It is the
suite that would have caught the two worst bugs in the project:

- **The weapons were dead.** `pressWeapon` built its edge flag by appending
  `"Edge"` to the *held* flag's name, raising `missileHeldEdge`, which nothing
  ever read. The pads looked right, the pad buttons existed, and no test
  clicked them. A browser pass that held the button and counted live missiles
  found it in one run.
- **The bounty never spawned.** A namespace rewrite turned `S.World.spawnPoint()`
  into `S.World.world.spawnPoint()`, which is not a function. It threw inside
  the animation frame, where nothing logs.

Both are the kind of defect that reads as "this feature is just not very fun"
until you go looking for the actual cause.

---

## Mobile performance

- Device pixel ratio capped at **2**. A 3× panel triples fill cost and buys
  nothing you can see on a moving ship.
- **Quality auto-detects**: the first ~90 frames are sampled and the tier drops
  to `low` (one star layer, no outlines, no nebulae, a quarter of the particles)
  if 60fps is being missed. Measuring beats guessing from a user-agent string,
  which lies.
- Per-frame work is bounded: pooled entities, a reused render list with an
  insertion sort (nearly ordered frame to frame), and screen-bbox face culling.
- `touch-action: none` everywhere, plus `preventDefault` on every gesture, so
  the canvas always gets the drag and iOS never zooms or shows a callout.

---

## Roadmap

Built: bounty NPCs · mines · missiles · a spendable crystal sink (refits) ·
four sectors · ion storms, dead nebulae and gravity wells · damage-direction
indicators and hit flash · off-screen station markers · marked rich rocks.

Everything below is a real TODO, in the order it would actually be built.
Open a PR and tick one.

### Next up

- [ ] **Elite encounter.** A roaming `Pirate Lord` with a shield phase and a
      capture/minion mechanic, appearing above a crystal threshold. The bounty
      hunter is already a named special-case spawn; this is a bigger one.
- [ ] **Named rivals with memory.** `bounty.js` remembers the hunter you
      killed last time. The full version: the specific pilot that wrecked you
      respawns hunting *you* until you kill them back. LUMEN's grudge system is
      the model.
- [ ] **Target types.** Rocks are one flavour. Turret platforms that shoot
      back, derelict hulks worth boarding, cargo containers with better caches.
- [ ] **Pets / drone companions.** Bought at the station, follows and shoots,
      has its own upgrade track.
- [ ] **More sectors.** Four exist; `sectors.js` is one row each and `world.js`
      reads everything off it. Five and six would be more hazard shapes rather
      than new machinery.

### Feel

- [ ] **Sound design pass.** The engine bed is a filtered-noise loop and the
      blaster is a square blip; both are placeholders that work. Salvos, mines
      and the bounty alarm were added later and are rougher than the rest. A
      real pass would add weapon variants per tier, impact-by-material, and a
      music layer that escalates with the sector threat level.
- [ ] **NPC variety.** Three hull silhouettes across eight tiers already; more
      silhouettes, and formations (a heavy flying with two escorts that break
      formation when it dies).
- [ ] **Gamepad support.**

### Platform

- [ ] **Save export / import.** A JSON download and upload so a device change
      does not cost a run. Straightforward given the storage layer.
- [ ] **Settings panel.** Quality is currently auto-detected with no manual
      override exposed; sound and aim assist are there, the rest is not.
- [ ] **Localisation.** The UI is a single English string set, and the
      kill feed interpolates user-typed callsigns, so any XSS surface has to be
      closed before a second language lands.
- [ ] **Accessibility.** `prefers-reduced-motion` is honoured for UI animation
      but not for camera shake or screen flash. A shake toggle belongs here.

---

## Credits

Not affiliated with Bigpoint or *Darkorbit* — this is an original game in the
same genre, written from scratch for this repo.