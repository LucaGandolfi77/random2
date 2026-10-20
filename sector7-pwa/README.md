# SECTOR 7

> A low-poly space combat game for your pocket. Fill a cargo hold, dock to
> bank it, shoot the right gun — **against the sector, not a clock.**

No build step. No dependencies. No art assets. Everything you see is drawn
procedurally on a canvas from a few hundred numbers.

---

## Play

It is already deployed. There is nothing to run, install or host — the game is
a folder of static files served over HTTPS, and the only thing a server was
ever needed for is that a `file://` page is not allowed to register a service
worker.

**Play it on your phone:** <https://lucagandolfi77.github.io/random2/sector7-pwa/>

- **Android / Chrome** — open the link, then menu ⋮ → *Install app*. The
  browser offers the native install prompt because the manifest asks for
  `display: standalone`.
- **iPhone / Safari** — open the link, then Share → *Add to Home Screen*. This
  has to be Safari; the other iOS browsers are not allowed to install.
- Either way it then launches fullscreen with no browser chrome, and from the
  first load onward it is **fully offline** — the service worker is
  cache-first, so the network is consulted once and never again needed.

The hub listing every game in the repo is at
<https://lucagandolfi77.github.io/random2/>.

To run it locally instead:

```bash
git clone https://github.com/LucaGandolfi77/random2.git
cd random2
python3 -m http.server 8080
# open http://localhost:8080/sector7-pwa/
```

The local server exists only so the page is served over `http://localhost`,
which is a secure context. Anything else serving the folder works — `npx
serve`, `php -S`, an nginx root — because there is no build step to satisfy.

### Deploying

Pushing to `main` is the whole deploy. `.github/workflows/pages.yml` rsyncs the
repo into `_site/` and publishes it to Pages; the only `npm` that runs is
BUCIO's, and it runs on GitHub's machine, not yours. This folder is copied
as-is.

| Control | Touch | Keyboard | Mouse |
|---|---|---|---|
| Fly | left thumb, anywhere — the stick appears where you press | `WASD` / arrows | click the map to fly there |
| Blaster | `FIRE` (hold to keep firing) | `Space` | `Space` |
| Ammo | `AMMO` — one press, one capacitor round | `X` | `X` |
| Plasma | `PLS` — one press, one piercing round | `V` | `V` |
| Mining beam | `BEAM` — hold it on a rock | hold `C` | hold `C` |
| Missiles | `MSL` — one press, one salvo | `M` | `M` |
| Mines | `MINE` — drops behind you | `B` | `B` |
| CPU | `CPU` — fires whatever is fitted | `F` | `F` |
| Target | tap the right of the screen to lock or clear | `T` to cycle | click a ship to lock it, click it again to let it go |
| Lock-on shot | — | `Ctrl` — fires at the locked ship | `Ctrl` |
| Dock | hold `DOCK` inside the station ring | hold `E` | hold `E` |
| Aim assist | toggle under the pads | same | same |

Missiles, ammo, plasma and the CPU are **edge-triggered**: one press, one
shot. Holding the button would empty the whole magazine into a single hull
every cooldown, which is not what a salvo is for. The mining beam is a
**hold**, because it is a tool you keep on a rock rather than a shot you
spend.

**The mouse and the touch screen are two different games of the same
ship.** A mouse click is never a thumb press: the stick ignores the mouse
entirely, and a click on the map means one of two things depending on
where it landed — on a hull it locks that ship, on empty space it is an
order to fly there. The minimap is the same map at a wider scale, so a
click on it is the same order read through a different projection. The
lock-on shot is the one weapon that ignores the turret arc, so it can
reach a target behind you; it needs the target inside `attackRange`, and
it runs on its own cooldown so it never queues behind the blaster.

---

## The loop

**Energy is cargo.** It is not a number on a ship, it is a load: you scoop it
into the hold, the hold banks into your tank when you dock, and the hold goes
onto the deck when you die. Everything you were carrying is recoverable
loot — you can fly back out and scoop it — but only if you get there first.

**Crystals** are banked the instant you touch them and can never be lost.
They are your score, they are the escalation dial — the sector only spawns
NPC tiers you have earned the right to fight — and they are what opens new
sectors and buys permanent refits.

That is the whole tension. Greed is a number on a bar: a fuller hold means a
bigger trip and a bigger wreck, and the sector answers both.

### The mining beam

**The beam is a tool, not a weapon.** It cuts rock and nothing else — it
cannot hurt a ship, not even by accident. That is the whole point of it: a
free beam that also hurt ships would be a free gun, and the laser and
capacitor round tracks would be dead on arrival. The Ammo track in
particular only exists because a shield is a real problem.

Hold it and point the **ship** at a rock. The energy comes out of the rock
and into your hold directly, so the Cargo track is legible from the
cockpit: you watch the hold fill, and you watch it refuse to fill any
further. The crystal cache still drops as a pickup, because crystals are
banked the moment they are touched and must never be carried where they
can be lost.

**Per material.** A rock's grade is how much crystal it hides, and the beam
extracts faster from a richer one — the cutter's pitch and the colour of
its light both rise with the grade, so the material is readable without a
number on the screen. A grade-1 rock yields its whole energy across the
whole cut; a grade-4 rock yields it in the first quarter, and the rest of
that cut is a rich rock's cache waiting to be worth a detour.

**Why it is free.** The beam costs no energy, has no magazine and never
runs out. That is what makes it safe to turn the guns into consumables
later: a player can always mine, so a player can always be solvent. The
whole economy of the endgame rests on this one button.

### Shields and armour are two different problems

Every ship has **two** pools. Shields absorb, and refill once you have been
out of the fight. Armour never comes back on its own.

Every shot carries two numbers instead of one: some damage to shields, some
to armour. **The armour component is held off entirely while any shield
remains.** That single rule is what makes the second pool worth anything — a
fast armour weapon cannot simply kill through a shield wall, it has to be
answered with shield damage.

| Weapon | vs shields | vs armour | Role |
|---|---|---|---|
| **Blaster** (laser) | ×0.25 | ×1.00 | Free, on every ship. Fast. Chews armour. |
| **Ammo** (capacitor round) | ×3.00 | ×0.65 | The answer to a shield. Slow between shots. |
| **Plasma** | ×0.60 | ×1.50 | **Pierces.** Its armour lands through a shield. Slow, and worse than the laser against a bare hull. |
| **Missiles** | ×0.60 | ×1.10 | Lock-on burst, splash. |
| **Mines** | ×2.00 | ×0.50 | Drains shields. The defence that works while fleeing. |

The blaster is bolted to every ship and costs nothing, so the Ammo track is
never a straight upgrade — it is a tool for one specific problem. Against
something with no shields at all it is dead weight, and it has a cooldown
floor it can never beat.

**The plasma round is the third answer, and it is the one exception to the
rule above.** A piercing shot's armour component is not held off by a shield,
so it is the only gun that answers a shielded hull *and* hurts it. It is
bounded by being slow — its damage per second against a bare hull is below
the laser's at every level, and a test asserts that, because a weapon that
beat the laser at everything would kill two tracks at once.

### The hangar

Eight hulls, each with one passive that changes what the ship **is** rather
than adding to a number. Upgrades, refits, crystals and CPUs are shared
across the whole garage — only the hull and its fit-out are per-ship, so an
eight-ship garage is not eight times the energy bill.

| Hull | Passive | What it changes |
|---|---|---|
| **WASP** — free | *Needle* | Hold −35%, speed +20%, turn +35% |
| **HAULER** — 700 ⚡ | *Deep Hold* | Hold +65%, shield −22%, speed −10% |
| **WARDEN** — 900 ⚡ | *Recovery* | Shield regen ×2.1, hull −8% |
| **BULWARK** — 1300 ⚡ | *Plated* | Hull +28%, +6 armour, speed −14% |
| **VANDAL** — 1500 ⚡ | *Overbore* | Every gun +6, shield −20%, hull +6% |
| **LANCE** — 2000 ⚡ | *Close Cover* | Shield +15%, regen +20%, speed +6% |
| **HOUND** — 2400 ⚡ | *Brawler* | Hull +15%, turn +20%, hold −15% |
| **ORACLE** — 2800 ⚡ | *Prospector* | Energy +35%, hold +20%, shield −10% |

Three slots, three components each — 216 fit-outs:

| Slot | Options |
|---|---|
| **Engine** | *Needle* (fast, small hold) · *Hauler Drive* (huge hold, slow) · *Anvil* (tanky, sluggish) |
| **Laser** | *Pulse* (rate ×1.61) · *Rail* (rate ×0.65, damage ×1.85) · *Splitter* (the all-rounder) |
| **Shield** | *Deflector* (big pool, slow refill) · *Reactive* (small pool, ×2.3 refill) · *Ablative* (barely any pool, +4 armour) |

**Buying a component installs it. Swapping is free and you can swap as often
as you like** — the same rule as the CPUs, and for the same reason: a choice
you cannot take back is not a choice. Owned components follow you between
hulls, so the Needle you bought for the Wasp is there when you switch to the
Warden.

#### The one rule the hangar is built around

**A weapon part may change rate and damage freely, but it must apply the
same factors to every gun on the mount** — the blaster, the capacitor round
and the plasma round. Because every build then scales identically, the
laser-versus-round comparison cannot move.

It is also what these parts physically mean — the laser slot is the weapon
*mount*, and it upgrades everything bolted to it. An earlier draft made Pulse
and Rail speed up the blaster alone, and the matrix test caught it in one
run: **90 of 135 fit-outs** had the round stop being worth buying, purely
because of which gun a cosmetic part happened to buff. `content.test.js`
walks all 216 and requires the winner to flip between raiders and aliens in
every single one.

### Factions

Hostile hulls are coloured by faction, so the map reads at a glance instead
of being a confetti bag. The three are mutually hostile and will open fire on
each other, which is why a quiet corner of the sector runs its own war while
you are docked.

| Faction | Shield pool | What wants to kill it |
|---|---|---|
| **Raider** — amber | none at all | The laser. The round is a waste of energy. |
| **Pirate** — red | half its hull | Either gun. This is the crossover, on purpose. |
| **Alien** — violet | 80% of its hull | Ammo. Lasers bounce. |

Which factions turn up is a function of tier, and the mix shifts toward
Demaner the deeper you fly. So escalation is not only "bigger numbers" — it
is also "more of the thing that punishes the build you already have".

### The station

Hold `DOCK` inside the ring around the station. Docking is a loan, not a gift —
a slice of your energy is the fee, charged on launch.

The station has five tabs, plus a hangar you reach from either the station
or the main menu.

| Tab | What it is for |
|---|---|
| **Modules** | The energy economy. Ten tracks, ten levels each. |
| **Contracts** | Three rotating objectives that pay in crystals. |
| **CPUs** | Active abilities. Buy once, fit one. |
| **Refits** | Permanent perks bought with crystals, never refunded. |
| **Sectors** | Pick your map. |

#### Modules — paid for with energy

| Module | Effect |
|---|---|
| **Blaster** | Bigger laser hits, shorter gaps between shots |
| **Ammo** | Heavier capacitor round, shorter cycle |
| **Shield** | Bigger shield pool *and* hull, plus faster refill |
| **Armor** | Flat damage cut — useless against scrap, decisive against warlords |
| **Processor** | Lifts the energy you pull out of every wreck and crate |
| **Thruster** | Speed *and* a tighter turn |
| **Cargo** | How much energy one trip can carry |
| **Missiles** | Lock-on burst, splash damage |
| **Mines** | Proximity mines |
| **Plasma** | A heavier piercing round — armour that goes through shields |

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

#### CPUs — paid for with energy

One is fitted at a time. **Buying installs it and fits it; swapping between
CPUs you already own is free, and you can swap as often as you like.** That is
not a limitation to work around — it is the decision. Which tool you are
carrying when you undock is a choice, so it has to be reversible.

| CPU | Effect |
|---|---|
| **Insta-Shield** | Three seconds of total invulnerability |
| **Radar** | Every hostile on the minimap, including ones you cannot see |
| **Cloak** | Nine seconds in which nothing can see you |
| **Warp** | 300-unit jump along your nose, brief immunity in transit |
| **Energy Leech** | A quarter of everything you damage comes back as shield |
| **Repair Patch** | Patches the hull while you keep flying |

Radar is the one worth noticing: with it off, the minimap only shows hostiles
you could plausibly see on screen, using the same `viewSpan` the camera is
fitted to. It can never promise contact the view will not deliver.

**Cloak is a perception effect, not a shield.** Anything that has to
*acquire* a target cannot see a cloaked ship, and an NPC already fighting you
forgets you on its next think tick — so it does not have to be fired at the
moment the fight starts to be worth having. But a round already in the air
still lands. The distinction is the whole point of it: a player who reads it
as "I am invulnerable" will fly straight into a turret they were never hit by.

#### Refits — permanent, bought with crystals

Each one changes how the rest of the game behaves rather than adding to a stat.

| Refit | Effect |
|---|---|
| **Salvage Rig** | Recovers part of what you were carrying when you wrecked — tank *and* hold, which makes it worth buying early |
| **Frame Plating** | +4% max hull per level, multiplicative on top of Shield |
| **Tractor Field** | +35% pickup radius per level |
| **Survey Suite** | Contracts pay +20% per level |
| **Broker Contact** | Bounty values +30% per level |

They are paid for out of the same crystal balance that contracts pay into.
There is deliberately no second "refit budget" — the quote and the purchase
read the same number, or the station would show an affordable price and then
quietly refuse.

### Bounties

Every so often the sector sends a named hunter after you specifically. It knows
where you are from the moment it appears, it carries missiles and lays mines,
and **its price climbs the longer it lives** — so ignoring it is a real option
and fighting it is a real decision. Kill it and the bounty is paid out
immediately, in crystals, with a banner and a kill-feed line.

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
| **VANTA** — dead nebula | 7 | ×1.80 | Nebulae that eat your regeneration, shields included |
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
│   ├── config.js              tuning, weapon profiles, hulls, parts, factions, CPUs
│   ├── storage.js             ship / hangar / stats under `sector7.v2.*`
│   ├── sectors.js             the sector table and its gating rules
│   ├── world.js               entities, pools, damage resolution, hazards, events
│   ├── stations.js            docking, the energy economy, refits, CPUs
│   ├── contracts.js           the rotating board, progress and payout
│   ├── bounty.js              hunters, escalating bounties, persistence
│   ├── render.js              mesh factory, facet renderer, camera, minimap
│   ├── player.js              steering, targeting, docking state machine
│   ├── npcs.js                patrol / attack / flee AI, faction war, tier rolling
│   ├── input.js               thumb-anchored stick, action pads, tap-to-lock
│   ├── audio.js               WebAudio, every sound synthesised at runtime
│   ├── ui.js                  HUD, target panel, station panel, kill feed, screens
│   └── main.js                loop and state machine
└── tests/
    ├── sim.test.js            headless simulation and economy invariants
    ├── render.test.js         headless render smoke test
    ├── boot.test.js           headless boot of the whole app against a fake DOM
    └── content.test.js        sectors, weapons, factions, cargo, CPUs, contracts
```

Loaded as plain scripts (no modules, no bundler), all reading one `window.S7`
namespace, exactly like the rest of the arcade.

`world.js` does not know what a sector *is* — it reads `world.sector` and the
counts, caps and palette off it. Adding a fifth map is one row in
`sectors.js`.

The hangar is stored under its own key and **projected onto the flat ship
object** that everything downstream already reads. `player.create`, the
station and all four test suites keep seeing `{ modules, refits, crystals,
… }` with `hullId` and `parts` added. That is what turned a multi-ship game
into a storage change rather than a rewrite.

### Rules that hold everywhere

- **Every collection that churns is a fixed pool** allocated once: bullets,
  ammo rounds, missiles, mines, pickups, particles, floaters. The draw path
  and the sim path allocate nothing. Mobile GC pauses are the biggest single
  cause of jank in a canvas game.
- **Nothing reaches the renderer without a view vector.** Sort keys and cull
  tests both come from `PROJ`.
- **No living ship is ever at zero hull.** Bullets kill through their own path
  so the kill feed knows the shooter; `world.js` also carries a safety net that
  kills anything the last point of hull reached by any other route.
- **A shot that a shield swallows entirely still counts as being hit.** It
  used to return early, before resetting `sinceHit`, so a pilot facing
  sustained fire regenerated their shield straight through it and the second
  pool became decoration. `sim.test.js` asserts this.
- **Failed purchases mutate nothing.** Every station transaction returns
  `{ok, spent}` and only touches the ship on success — asserted directly.
- **Quotes and purchases read the same number.** The station showed an
  affordable Frame Plating price and then refused, because the quote checked
  `ship.crystals` and the purchase charged a separate `refits.crystals` pool
  that was always zero. One balance, one truth.
- **Loot adds up.** Energy dropped on death is split into a capped number of
  chunks, and flooring the per-chunk value silently destroyed up to
  `chunks - 1` energy. The remainder is spread one point at a time; a test
  asserts `spilled + banked === tank + hold`.
- **A full hold refuses rather than destroys.** Crates and loose energy are
  left on the ground when there is no room, so the player can see the loot
  they could not carry and go and dock. The mining beam is bound by the same
  rule: a full hold takes nothing out of the rock, and the rock keeps it.
- **A rock's energy is never created and never destroyed.** It is in the hold,
  on the ground, or still in the rock — and the three always add up. The beam
  moves energy out of the rock and into the hold; a rock broken by gunfire
  drops all of it, because gunfire never touched the pool.
- **The mining beam cannot hurt a ship.** It is a tool. A free beam that also
  fought would be a free gun, and the laser and capacitor round tracks would
  be dead on arrival — the Ammo track in particular only exists because a
  shield is a real problem. Asserted directly.
- **No hull or part can change what a gun is for.** Damage packets are rebuilt
  from raw damage after every multiplier, and every weapon part applies the
  same factor to the blaster, the capacitor round and the plasma round. Two
  hundred and sixteen fit-outs are walked in the test suite to keep it that
  way.
- **A save never grants what was not bought.** Hulls are owned by presence in
  the save, fitted parts must exist *and* be owned, and a fitted CPU the pilot
  does not own is dropped on load.
- **Crystals are banked on pickup**, not on death, so a bad end to a run can
  never cost progress.
- **CPU ownership is never granted by a save.** `storage.js` drops a fitted CPU
  the pilot does not own, or one whose key no longer exists.

### Saves

The game is on `sector7.v2.*`. v1 is not read, and `wipe()` removes the v1 keys
too. Shields, the hold, the ammo track, factions and CPUs all changed the shape
of a ship, and there is no honest way to read an old save into them — the old
`energy` number has no single new home, because part of it is now a hold that
has to be docked. Starting fresh is the only conversion that cannot silently
lose a pilot's record, so the old keys are dropped rather than half-read.

The hold itself is never persisted: energy is banked at the dock, and a
half-full hold is only ever lost energy. Saving it would let a crash return
loot the player never docked.

---

## Tests

```bash
node sector7-pwa/tests/sim.test.js       # 886 checks
node sector7-pwa/tests/render.test.js    # 121 checks
node sector7-pwa/tests/boot.test.js      # 108 checks
node sector7-pwa/tests/content.test.js   # 292 checks
```

`sim.test.js` runs the real world/AI/station modules with no browser: sector
determinism, purchase invariants as a property test across every module and
price band, save/load round-trips including deliberately corrupt saves, pool
integrity under sustained fire, the docking round-trip, the death-and-loot
loop, the damage model, the lock-on shot, the cloak, the plasma round and the
mining beam.

It also runs a **difficulty-curve test**: one minute of play across sixteen
seeds, three times — as a rookie (no crystals, so the sector is all tier-1
raiders), as a banked pilot (700 crystals, so the sector rolls heavy tiers),
and as a banked pilot carrying the Ammo track. The current numbers, and
**identical on every run**:

```
rookie:  10 kills/min, 14/48 runs ended in a wreck
veteran:  6 kills/min, 46/48 runs ended in a wreck
gunner:   9 kills/min, 44/48 runs ended in a wreck   (ammo build)
```

The measurement is **deterministic**. The world's own RNG is seeded, but the
loot scatter and the particle scatter reach for `Math.random` directly, so two
runs of the same seed used to be two different runs — and the survival
assertion flaked on the sample size rather than on the game, roughly one run
in ten. A seeded stand-in for `Math.random` during the measurement turned it
from a coin flip into a regression test.

The assertion is on the **contrast** between the rookie and veteran profiles
as well as on the counts: the intro has to be survivable, the late game has
to bite, and the second must be strictly worse than the first.

Notice what that table does *not* claim. It would be easy to read the gunner
row as "ammo is better" and add an assertion that it wrecks strictly less
often. That assertion is not here because it cannot be trusted: both veteran
profiles sit at 7/8 and 8/8, because a level-1 hull in the starting sector
dies to almost everything. The metric is saturated and a one-run difference
between them is noise dressed up as a result. The ammo build is in this suite
for *coverage* — the capacitor round, its pool, its collision path and the leech
hook all run under sustained fire — and the actual claim it supports lives in
`content.test.js`, where it is deterministic.

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

It then scripts the systems that are mostly UI: a loaded hold docking into the
tank, a CPU being bought, swapped and fired from the pad, the ammo button
lofting a round, and a tap on the right of the canvas locking and clearing a
target.

It scripts the hangar the same way — buying a hull through the rendered card,
fitting two components into one slot, toggling the sandbox off and firing a
grant that was rendered while it was on (which is the only way to reach the
guard inside the handler), and then undocking to prove the new configuration
reaches the live ship. That last one matters: undocking does not rebuild the
ship, so without an explicit re-apply a hull bought two minutes earlier
would still fly the old silhouette and the old hold.

It also asserts that **every `<button>` in `index.html` has a listener
attached**. That check exists because the station's `LAUNCH` button shipped
with no handler at all — the only way out of the station was "Back to menu" —
and nothing else in the suite noticed, because a test only clicks the buttons
it already knows about.

Its fake DOM queries the real `index.html` by class, not just the element's
own `innerHTML`, so a query that reaches into static markup works the same way
it does in a browser. Its `querySelector` cache is dropped whenever `innerHTML`
is assigned, because a real DOM re-queries — and the station panels rebuild
their whole markup on every purchase, so a cache there silently returned the
previous generation of buttons with the previous generation's handlers.

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
indicators and hit flash · off-screen station markers · marked rich rocks ·
**a cargo hold** · **a shield/armour split with a weapon that counters it** ·
**a third gun that pierces it** · **factions, faction colour and faction
wars** · **six CPUs, one slot, one of them a cloak** · **an explicit target
lock and a target panel** · **a hangar of eight hulls with passives and 216
fit-outs** · **a sandbox cheat** · **click-to-move, click-to-select and a
lock-on shot** · **a free mining beam that is a tool and never a weapon**.

Everything below is a real TODO, in the order it would actually be built.
Open a PR and tick one.

### Next up

- [ ] **A munitions hangar.** Everything stockable, bought at the station and
      carried from a loadout step: laser rounds, plasma rounds, missiles,
      mines. The stockpile lives in the hangar blob, and the carry limit
      ties into the Cargo track so that track finally has a visible verb.
      **The mining beam is the prerequisite and it now exists**: a player can
      always mine, so a player can always be solvent, so no stockout can be
      a soft-lock. The one thing to watch is the beam's own rate — it must
      never out-mine a blaster build, or the laser track becomes a wasted
      level for anyone who cares about the hold.
- [ ] **More hulls and parts.** Eight of each is enough to make the choice
      legible; a tenth hull would be a colour swap. If the garage grows, the
      thing worth adding is a slot, not a row.
- [ ] **Hull-gated hardware.** Right now every hull is available from the
      first minute. A Bulwark that only unlocks in VANTA would make the
      sector gate mean something beyond "the sector is nastier".
- [ ] **Xenomit.** A third currency, rarer than crystals, from Demaner drops and
      rich rocks. Crystals currently do four jobs at once — score, escalation
      dial, sector gate and refit budget — and a premium sink would give the
      rare drops a purpose that is not "a bigger number, which makes the sector
      harder".
- [ ] **A deeper mining beam.** The beam exists and it carries the whole
      endgame on its shoulders, but it is one grade of richness and one
      fixed rate. A material table — a dense seam that pays out over a
      longer cut, a brittle rock that shatters instead of being ground
      down — would give the rock field the kind of variety the ships have.
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
      blaster is a square blip; both are placeholders that work. Salvos, mines,
      the capacitor round and the bounty alarm were added later and are rougher
      than the rest. A real pass would add weapon variants per tier,
      impact-by-material, and a music layer that escalates with the sector
      threat level.
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

---

## Copyright & licence

**© 2026 Luca Gandolfi. All rights reserved.** The code is released under the
**MIT** licence; see [`LICENSE`](../../LICENSE) in the repository root for the
full text.

Every asset in this game is either generated by script in this folder or drawn
live onto the canvas:

| Asset | Source |
|---|---|
| Icons | `icons/*.svg`, hand-authored; PNGs are rasterised from them by `scripts/gen-icons.mjs` |
| Social card | `og-cover.svg`, generated by `scripts/gen-og-cover.mjs`; `og-cover.png` is committed |
| Type | System `ui-monospace` stack. Nothing is fetched from a font CDN |
| Art | Drawn on canvas from `box()` and `prism()` primitives plus build-time transforms |

Because of that there is no third-party asset to attribute, no font licence to
honour, and no external request anywhere in the game — which is also why it
runs offline with a single service worker.

If you fork or ship a modification, the MIT licence asks only that the
copyright line above travels with the source.