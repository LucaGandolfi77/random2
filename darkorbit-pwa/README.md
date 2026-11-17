# Deep Orbit

A mobile-first, offline-first space combat game inspired by the mechanics of
DarkOrbit. Fly a ship, hunt alien swarms, haul ore back to the station, upgrade
your loadout and jump through gates into harder sectors.

Everything runs in the browser with **zero binary art assets** — ships, aliens,
stations, portals and effects are drawn procedurally on canvas. Installable as
a PWA on iOS and Android; works offline once installed.

## Play

- **Live:** <https://lucagandolfi77.github.io/random2/darkorbit-pwa/>
- Local: serve the repo root and open `/darkorbit-pwa/`.

## Controls

| Action | Mobile | Desktop |
| --- | --- | --- |
| Fly | Left joystick (or drag the left half of the screen) | WASD / arrows |
| Fire | Hold the red FIRE button | Hold Space |
| Lock target | Tap an alien | Click an alien |
| Change ammo | X4 button | Q |
| Abilities | BOOST / SHIELD / REPAIR buttons | 1 / 2 / 3 |
| Dock & sell | DOCK button when in range | E |
| Jump gate | JUMP button when in range | J |
| Pause | ⏸ button | P / Esc |
| Sound | Menu / Pause | M |

The layout adapts to **both portrait and landscape**, respects iOS safe areas,
and uses haptics + WebAudio through the shared `R2` arcade library.

## Longevity

- **Weekly challenge:** one seed per week (derived from the date) fixes the map
  and ship for everyone. Scores go into a local top-10 leaderboard with a
  Web Share / clipboard result button.
- **Ghost replay:** your best run's trajectory is recorded at 30 Hz and flown
  again as a translucent ship on later runs — a pace setter without a server.
- **Galaxy Reset:** at level 10, reset level, credits and upgrades for a
  permanent +10% damage / shield / cargo prestige tier (stacking).

## Economy & campaign

- **Refining & assembly:** refine 3 raw ore into 1 refined unit worth 3× at the
  station (no cargo space used), then assemble Nanite Repair, Barrier Cells,
  Ore Magnets and Overdrive Cores from refined materials.
- **Story missions:** 12 authored objectives across four chapters with
  briefings, tracked progress and credit/urium rewards — from the first swarm
  in Alpha Sector to the far side of Zeta Oblivion.
- **Six sectors, eight ships:** Epsilon Veil and Zeta Oblivion join the map,
  with the Ranger (critical-hit specialist) and Monolith (fortress gunship),
  plus Void Lancers and the Swarm Queen boss.

## Gate mode & elites

- **Galaxy Gate:** launch a 90-second arena from the station — three escalating
  waves ending in a boss, with a live wave/timer HUD. Clear it for credits,
  urium and a guaranteed Astral Cache; run out of time and you return empty-handed.
- **Elite affixes:** Armored, Swift, Regenerator and Splitter enemies have
  distinct visual tells, tougher stats and 1.5–1.8× loot. Splitters burst into
  fragments when destroyed.
- **Boss phase 2:** at half health bosses enrage — faster fire, summoned adds,
  a red aura and screen flash, and a spike in the adaptive soundtrack.

## Meta progression

- **Continue Run:** the simulation is saved every 5 s and on tab hide — closing
  the app never loses a run.
- **Offline Dispatch:** send a retriever on a 2/4/8 hour mission; collect the
  reward when you return. Purely local, using the device clock.
- **Daily contracts:** three deterministic goals per day via `R2.dailySeed`,
  with automatic rewards and a 7-day streak bonus.
- **Achievements:** 12 milestones with credit rewards, tracked in the menu.
- **Pilot skills:** spend a point per level on Lasers, Shields, Drones or
  Logistics; each branch changes your derived stats.

A **Settings** screen (menu / pause) controls effects quality (Auto/High/Low),
frame rate (60/30 power-save), joystick sensitivity, a colorblind-safe palette,
HUD size, sound, music and haptics. The first launch includes a short 3-step
onboarding, replayable from Settings. Add `?debug=1` to the URL for a live FPS /
tier / particle counter.

## Game loop

- **Station safe haven.** Inside the station ring enemies stop chasing, firing
  and ramming, steer back outside a wider standoff radius, and hostile bullets
  fizzle at the boundary. Shields recharge 6× faster; weapons are locked so the
  station can't be abused as a free kill zone.
- **Shields first, hull second.** Lasers strip the shield before damaging hull;
  shields regenerate after a lull in combat (immediately while docked).
- **Five ammo types with real trade-offs.** X4/X6/X7 escalation, plus a PLT
  rocket with splash damage and a PIB infection round that deals damage over
  time. Five-way ammo selector; light homing on every shot.
- **Enemies & bosses.** Swarm drones, scouts, sentinels, raiders, evasive Nebula
  Wisps, armoured Siege Crawlers, cloaking Phase Phantoms and three bosses
  (Leviathan, Star Devourer, Void Obelisk), with chase/strafe AI, charge
  telegraphs and spread fire.
- **Loot & economy.** Kills drop ore crates, boxes and field pickups (Repair
  Kit, Ore Magnet, Overdrive). Cargo is limited — fly into the station to sell.
- **Progression.** XP and levels, six ships (two with unique perks), eight
  upgrade tracks, up to four combat drones and three active abilities.
- **Sectors.** Alpha → Beta → Gamma → Delta → Epsilon, gated by level, each with
  its own palette, enemies, hazard level and loot table (including Phantomite).
- **Visuals.** Procedural low-poly 2.5D hulls: every ship, enemy and drone is a
  faceted 3D mesh with backface culling, depth sorting and flat shading, drawn
  on Canvas 2D with no WebGL or art assets. Parallax stars, drifting asteroids,
  distant planets, glow, shield domes, shockwaves, floating damage numbers,
  screen shake and an animated radar — all procedural, reduced-motion aware.
- **Performance.** Adaptive quality (hysteresis-based FPS monitor dips DPR,
  particles and glow on weak devices), pooled projectiles/particles, cached
  gradients, optional 30 fps power-save, and a procedural adaptive soundtrack
  that intensifies with nearby enemies.
- **Permadeath-lite.** Destruction loses carried cargo but keeps your ship,
  upgrades and progress; respawn at the station.

## Development

```sh
npm test      # pure simulation + config tests (node --test)
npm run smoke # browser smoke test via tools/cdp.mjs (needs a server on :8099)
npm run icons # regenerate PNG icons from scripts/generate-icons.py
```

Serve the repo root (the game imports `../shared/arcade.js`):

```sh
python3 -m http.server 8099
```

### Files

```
index.html          HUD, responsive layout, touch controls, overlays
styles.css          portrait + landscape themes, safe-area handling
src/config.js       all content and tuning tables
src/sim.js          pure simulation (movement, combat, AI, loot, economy)
src/render.js       canvas renderer, camera, minimap, procedural art
src/input.js        joystick, fire/ability buttons, tap targeting, keyboard
src/ui.js           HUD updates, hangar, menus, toasts
src/storage.js      validated localStorage profile
src/main.js         fixed-timestep loop and phase machine
scripts/            dependency-free PNG icon generator
tests/              node test suite
smoke.mjs           Chromium end-to-end checks
```

## Notes

Deep Orbit is an original game inspired by DarkOrbit's mechanics. It does not
use Bigpoint's trademarks, art, sound assets or servers; all names, visuals and
balance here are original.
