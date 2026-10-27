# CORE 9: NETWORK — Nuclear Idle Tycoon

> The previous director left in a hurry. The reactor still works, the fence
> still has a hole in it, and the city needs power by Friday. Then the next
> valley calls.

**CORE 9: NETWORK** is a low-poly idle tycoon about rebuilding a decommissioned
nuclear plant and turning it into a three-site grid. You do not buy a list of
abstract upgrades: you build the heat chain. The reactor makes heat, the towers
reject it, the turbine hall turns it into megawatts, and the switchyard sells it
to a grid that never stops asking for more.

Installable, playable offline, no trackers, no build step, no runtime
dependencies. Every building, plume, portrait and sound is generated in the
browser.

**Play it:** <https://lucagandolfi77.github.io/random2/core9-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/core9-pwa/
```

---

## The one rule

**Heat in, megawatts out — and every bottleneck is visible on the map.**

```
reactor thermal output
  × cooling throttle (cooling capacity ÷ heat)
  × turbine efficiency
  = gross MW
  × waste-vault throttle
  × battery / crew / isotope / event multipliers
  = net MW
  × grid price
  = credits per second
```

If heat outruns cooling, output is throttled and the HUD turns red. If the
waste vault fills, the plant throttles itself again. There is no game over:
the reactor scrambles to a safe floor, the player can always recover, and a
new generation is the way out rather than a wall.

## The network

| Site | Theme | Modifier | Unique plot |
|---|---|---|---|
| **CORE 9 — River Valley** | Green industrial valley | Balanced, river cooling | **Pump station**: water reserve and extra cooling |
| **SOLARIS 4 — Desert Basin** | Sand, heat, high grid prices | Cooling −15%, grid price +20%, sandstorms | **Solar field**: site output and battery charging |
| **GLACIER 2 — Arctic Shelf** | Snow, aurora, expensive logistics | Cooling +25%, build cost +12%, blizzards | **Geothermal well**: reactor heat with seismic risk |

- **Twelve plots per site**: the ten systems + **Battery yard** + the site's
  unique auxiliary.
- **Credits, banks, waste, zones, generation, batteries and prestige are per
  site.** Research, data, isotopes, missions, crew, achievements and Director XP
  are global.
- **Inactive sites produce at 25%** while the active site runs at 100%.
- Unlock sites with **Director level + isotopes**; travel from the **World** tab.
- Per-site prestige thresholds: **100 MW** River, **300 MW** Desert, **600 MW**
  Arctic. Isotopes remain global.

## The loop

1. **Build** the cooling circuit, turbine hall and switchyard.
2. **Collect** credits banked at the switchyard — or automate collection from
   the control centre at level 5.
3. **Upgrade** the reactor and the rest of the chain. Every level adds a
   visible detail; every stage threshold changes the silhouette.
4. **Open** the next plot: battery, control, fuel, waste, lab, security, admin,
   and the site's unique auxiliary.
5. **Hire and assign crew**: passives on a preferred plot, active abilities on
   a cooldown.
6. **Resolve events**: crises, opportunities, inspections, strikes, storms and
   character-specific choices.
7. **Prestige** a site at its MW threshold into a new generation. Isotopes,
   research, crew and the rest of the network stay.

## The plant

Fourteen plot definitions; each site chooses twelve.

| Plot | What it does | What it becomes |
|---|---|---|
| **Reactor** | Thermal output | Pad → containment dome → secondary loop → glowing core → next-gen stack → molten-salt crown |
| **Cooling towers** | Heat rejection | One tower → two → three → four → a cooling canyon |
| **Turbine hall** | Conversion efficiency | One bay → two bays → rotors → glass hall → generator cathedral |
| **Switchyard** | Grid price | Transformer and poles → switchyard → arcing coils → national interconnect |
| **Control centre** | Automation, offline rate | Site office → bunker → operations floor → autonomous deck |
| **Fuel store** | Overclock length, waste rate | Shed → casks → pond and crane → fuel-cycle campus |
| **Waste vault** | Waste capacity | Barrels → dry vault → deep store → transmutation ring |
| **Research lab** | Data production | Container → glass lab → research dome → quantum simulation hall |
| **Security post** | Softens bad events | Booth → cameras → watchtower → fortress gate |
| **Administration** | Offline cap, crew slots | Trailer → HQ → directorate tower → corporate campus |
| **Battery yard** | Stores surplus, discharges into peaks | One container → grid-scale block → district buffer |
| **Pump station** (River) | Water reserve and cooling | Intake pipe → reservoir → closed-loop water campus |
| **Solar field** (Desert) | Site output and battery charging | Four panels → tracker field → solar-thermal crown |
| **Geothermal well** (Arctic) | Reactor heat | Capped well → twin-well field → volcanic heat ring |

Twenty-five levels, eight visual stages per plot, plus a readable prop on every
level in between. The site itself evolves: roads, fences, trees, snow poles,
rocks and power lines appear as the plant comes back to life.

## Crew

Fifteen named operators, each with a passive, an active ability, five levels and
a preferred plot. A preferred assignment gets the full passive; anywhere else
gets half.

Examples:

- **Mara Voss** — Reactor Engineer: +12% reactor heat; *Flux Shim* (+25% output).
- **Ilya Petrov** — Cooling Specialist: +18% cooling; *Emergency Purge*.
- **Nadia Chen** — Grid Broker: +10% grid price; *Peak Contract*.
- **Dr. Elena Ruiz** — Research Director: +20% data; *Data Burst*.
- **Bruno Salvi** — Safety Officer: −25% event penalties; *Inspection Pass*.
- **Kira Singh** — Waste Handler: +20% waste capacity; *Vent Vault*.
- **Tomas Berg** — Logistics Chief: +10% offline; *Priority Shipment*.
- **Aya Nakamura** — Communications: +12% collection; *Town Hall*.
- **Victor Hale** — Security Chief: −20% event penalties; *Lockdown*.
- **Lena Fischer** — Automation: +15% collection; *Hands Off*.
- **Omar Haddad** — Fuel Specialist: +5s overclock; *Hot Rod*.
- **Dario Bianchi** — Battery Engineer: +25% capacity; *Discharge*.
- **Nina Costa** — HR Lead: +25% crew XP; *Double Shift*.
- **Samira El-Sayed** — Solar Specialist: +12% site output; *Sandstorm Shield*.
- **Sam Okafor** — Turbine Mechanic: +8% efficiency; *Overspeed*.

Hiring is deterministic: milestones reveal candidates; credits and data hire
them. No gacha, no duplicate shards. Crew slots come from Administration and
the Director level (up to 8). Assigned operators appear on the map as low-poly
figures with role-coloured hard hats.

## Events

Thirty-plus events across grid, safety, staff, research, environment and site
categories. Automatic events modify the plant for a short window; choice events
wait for a response. A decision timer falls back to a default outcome, so an
idle player is never trapped.

- **Crises**: pump failure, blackout, cyberattack, fuel delay, reactor anomaly,
  contamination scare, earthquake, blizzard, ice dam.
- **Opportunities**: demand spike, research grant, celebrity tour, investor,
  research breakthrough, solar flare, aurora, anniversary.
- **Staff and society**: strike, union overtime, protest, charity, key worker.
- **Site-specific**: sandstorm, drought, solar flare, blizzard, geothermal vent,
  wildlife in the intake.
- **Character-specific choices** unlock when the right operator is assigned.

Effects are a small vocabulary: credits, data, Director XP, crew XP, waste,
battery charge, timed buffs, cancelling or delaying the next event. The event
log keeps the last 20 outcomes.

## Systems

| System | Rule |
|---|---|
| **Credits** | Per site, banked at the switchyard. Collect manually for a bonus, or automate from Control level 5 |
| **Heat** | Reactor output ÷ cooling capacity. Below 100% the plant throttles |
| **Waste** | Produced per megawatt. The vault recycles slowly; when full, output drops to 55% |
| **Battery** | Stores surplus, discharges for a 30-second output boost; capacity and charge are per site |
| **Overclock** | +50% thermal output for 30–60 seconds, then a cooldown. It can push you into the heat limit |
| **Research** | 24 global, permanent upgrades. Data from every lab and from missions |
| **Missions** | 60 global objectives, three visible at a time, credits + data + Director XP |
| **Crew** | 15 characters, passives, actives, XP, preferred plots, 8 slots |
| **Events** | 30+ auto/choice events with map filters, timers, character requirements and a log |
| **Director** | Levels 1–30, global XP, unlock sites and crew slots |
| **Offline** | Per site: active at 60% (upgradeable), inactive at 25%, 8-hour cap |
| **Prestige** | Per site at 100/300/600 MW. Isotopes are global and never reset |
| **Achievements** | 30 permanent goals across sites, crew and generations |

## Controls

| Action | Touch | Desktop |
|---|---|---|
| Select a plot | Tap it, or use **Plant** | Click it |
| Pan | One-finger drag | Drag / arrow keys |
| Zoom | Pinch | Wheel / `+` / `−` |
| Rotate the map | ⟳ button | `R` |
| Collect | **Collect** button | `C` |
| Close the top layer | Close button / browser back | `Esc` |

Tabs: **Map · Plant · Crew · Research · World**. World contains site travel,
goals, event log and achievements. The sheet and panels are pointer-first;
`prefers-reduced-motion` and the in-game setting turn off travelling steam.

## Saving

`localStorage["core9-pwa-save"]`, versioned schema **v2**. It stores global data,
isotopes, research, missions, crew, achievements, Director XP and events; each
site stores credits, bank, waste, zones, generation, battery, overclock and its
maximum MW. `lastSeen` drives offline income.

A **v1 save migrates automatically** into the River Valley site; the old reactor,
credits, research, missions and stats are preserved. Export and import are in
**Settings**. A corrupt save opens as a safe fresh state rather than throwing.

The high score is mirrored to `localStorage["core9-pwa"]` for the hub records
panel.

## How it is built

```
core9-pwa/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── icons/
├── src/
│   ├── main.js
│   ├── audio.js
│   ├── input.js
│   ├── data/
│   │   ├── zones.js        14 plot definitions, 8 stages
│   │   ├── sites.js        3 layouts, palettes, modifiers
│   │   ├── crew.js         15 characters, abilities, portraits
│   │   ├── events.js       30+ auto/choice events
│   │   ├── achievements.js 30 permanent goals
│   │   ├── copy.js
│   │   └── progression.js  24 research, 60 missions
│   ├── sim/
│   │   ├── state.js        v2 shape, migration, director XP
│   │   ├── economy.js      site-aware chain, crew/buff aggregation, prestige
│   │   ├── crew.js         hiring, assignment, passives, actives, XP
│   │   ├── events.js       trigger, choices, resolution, log
│   │   └── save.js
│   ├── render/
│   │   ├── primitives.js
│   │   ├── models.js       14 builders, site palettes, 8 stages
│   │   ├── particles.js
│   │   └── scene.js        3 terrains, static cache, crew sprites
│   └── ui/
│       └── ui.js           HUD, sheets, crew, world, events
├── tests/
│   ├── economy.test.mjs
│   ├── content.test.mjs
│   ├── crew.test.mjs
│   ├── events.test.mjs
│   ├── save.test.mjs
│   ├── crew.test.mjs
│   ├── events.test.mjs
│   ├── save.test.mjs
│   ├── render.test.mjs
│   ├── balance.test.mjs
│   └── pwa.test.mjs
└── tools/make_icons.py
```

- **No WebGL.** The map is a small software renderer: world-space low-poly
  faces, an isometric projection, flat shading and painter's-algorithm sorting.
- **One image, then the moving bits.** Terrain, plots, pipes, buildings and
  signs are rendered into an offscreen canvas and rebuilt only when the camera,
  site, plant levels or an upgrade animation changes. A player standing still
  pays for a blit and a few steam puffs, not thousands of polygons.
- **Data-driven.** Sites, zones, crew, events, missions, research and
  achievements are tables. The renderer knows nothing about nuclear plants.
- **The simulation is DOM-free.** `sim/` imports nothing from the browser, which
  is why the balance bot can play a full network in Node.
- **Sound is synthesised.** A low reactor bed follows output; clanks, invoices,
  alarms and the prestige chord are WebAudio oscillators and noise.
- **Offline-first PWA.** Manifest, standalone display, safe-area CSS and a
  precache service worker. The full game shell is cached on first load.

## Tests

```bash
node --test core9-pwa/tests/*.test.mjs
```

The suite covers the v1→v2 migration, site-aware economy, 25% inactive
production, battery charge/discharge, per-site prestige, crew assignment and
abilities, event choices and default resolution, all 14 zone builders at all
25 levels, eight distinct silhouettes per zone, all three site palettes, the
PWA asset contract, and a balance bot that must reach the first prestige in a
sensible session, unlock Solaris and build its chain.

## Known limits

- 🟡 The first site prestige is intentionally short; later sites and Director
  levels are where the network and crew choices start to matter.
- 🟡 The high-level reactor can outrun a max-level cooling circuit unless heat
  exchanger research or a cooling specialist is installed. The intended final
  pressure, but the HUD could explain it more directly.
- 🟡 There is no cloud save or account. The export button is the backup.
- 🟡 Events are resolved while the app is open; offline income uses base
  production and does not replay event choices.
- ⚪ The maps are curated plots, not free placement. A nuclear plant is a place,
  not a shopping mall.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../LICENSE).
