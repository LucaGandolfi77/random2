# Mustang PWA

A vertical-scrolling WWII air shooter for the browser. Mechanics follow Capcom's
*1942* (1984): the aerial loop, POW crates dropped by destroyed formations, side
fighters, Yashichi medals, bomber scoring chains, sector boss planes and the
shoot-down bonus tally. Two fronts, 32 stages each.

No build step, no dependencies, no binary assets. Every aircraft, tank, warship
and landscape is drawn procedurally on a 2D canvas; every sound is synthesised
with WebAudio.

## Run it

The game uses a service worker with root-absolute paths, so it must be served
from the root of a host (opening `index.html` over `file://` will not work).

```bash
cd mustang-pwa
python3 -m http.server 8080
# then open http://localhost:8080
```

## Controls

| | Touch | Keyboard |
|---|---|---|
| Move | drag anywhere on the playfield | arrow keys or `WASD` |
| Shoot | automatic while playing | hold `Z` or `Space` |
| Aerial loop | the **LOOP** button | `X` or `Shift` |
| Pause | the **PAUSE** button | `P` or `Esc` |
| Next stage / start | tap the playfield | `Enter` |

The loop is the signature move: it makes you briefly invulnerable, but you
cannot shoot while rolling, and each stage gives you only three. Whatever you
do not spend is worth 1,000 points each at the end of the stage.

## Mechanics

**Difficulty.** Three presets, chosen on the title screen and remembered between
runs. *Recruit* softens enemy speed, toughness, rate of fire, bullet speed and
wave density. *Arcade* is the neutral preset, the one the original cabinet ran.
*Ace* turns all of them up.

**Two fronts.** *Operation Overlord* (Europe, 1944) flies the P-51 Mustang
against the Luftwaffe. *Operation Rising Sun* (Pacific, 1942) flies the A6M
Zero against the USAAF and USN. Each front runs 32 stages numbered 32 down to 1,
across eight named sectors.

**POW crates.** Destroy a formation and a crate drops on a parachute. Each
colour is a different effect:

| Crate | Effect |
|---|---|
| Green | firepower up, two guns become four |
| White | smart bomb, wipes every enemy aircraft on screen |
| Grey | two side fighters join your flanks |
| Orange | enemy guns jammed for nine seconds |
| Yellow | one extra aerial loop this stage |
| Black | 1 UP |
| Red | 1,000 points |

**Yashichi.** A slow green plane drifts up from a bottom corner on stages 29,
25, 21, 17, 13, 09, 05 and 01. Shoot it and it drops a medal worth 5,000.

**Music.** A marching bassline with kick and hats plays while you fly and stops
everywhere else: briefing, tally, pause, game over. Mute it with the speaker
button.

**Bomber chains.** Big bombers climb up the screen from the bottom, shooting
back with a tail gun. The first is worth 2,000, each successive one 500 more, up
to a 9,000 cap. Dying resets the chain.

**Boss planes** appear at the end of stages 26, 18, 10 and 02, worth 20,000,
30,000, 40,000 and 50,000. Higher tiers add spread shots, rotating barrage and
escort fighters.

**End of stage bonus** is based on your shoot-down rate, plus 1,000 per unused
loop. 100% pays a 50,000 SPECIAL bonus. The rate is weighted by what you shot
down, not by how accurately you shoot: a Zero counts 1, a B-24 counts 6, a boss
counts 20, and anything that escapes counts against you.

## Tests

No dependencies needed, plain `node`:

```bash
node --check src/data.js && node --check src/audio.js && node --check src/art.js && node --check src/game.js
node tests/run-all.mjs         # everything below, with a summary
node tests/check-data.mjs      # 1494 assertions over stage, enemy, music, difficulty, bonus tables
node tests/smoke.mjs           # boots the game headless and plays it, 150 assertions
node tests/check-wiring.mjs    # DOM ids, asset paths, portability, precache list, manifest
```

The canvas-call counters in `smoke.mjs` print on every run, so a performance
regression shows up as a number changing rather than as a vague feeling.

`tests/smoke.mjs` stubs the DOM and the canvas context, then drives the real game
loop frame by frame: it starts a run, drags the plane with touch input, fires,
uses a loop, collects every POW type, plays a stage to the shoot-down tally,
fights and kills a boss, loses three lives to reach game over, and finally plays
all 64 stages of both fronts to prove none of them can stall.

## Layout

```
index.html              markup and DOM contract shared with the other PWAs in this repo
styles.css              four themes (olive, retro, night, sepia) driven by [data-theme]
manifest.json           installable metadata
service-worker.js       cache-first precache, versioned by CACHE_NAME
icons/                  hand-written SVG airframe
src/data.js             config, palettes, enemy archetypes, POW table, 32+32 stage tables
src/audio.js            WebAudio synthesis for every sound effect, plus the music scheduler
src/art.js              procedural drawing: airframes, armour, warships, terrain, crates
src/game.js             state, loop, input, AI, collisions, stage flow, HUD, storage
scripts/gen-icons.mjs   raster icon generator, standard library only
tests/                  node-only checks, no framework
```

## Notes on the terrain

The playfield is a scrolling tape of segments, each either sea, beach or land.
A segment covering world coordinates `[s, s+len]` is on screen wherever
`offset - (s+len) <= H` and `offset - s >= 0`, because `offset` grows as the
tape moves down. Terrain is baked into offscreen tiles per theme, so the
scrolling sea and the fields cost blits rather than geometry.

## Notes on the build

The four files under `src/` are plain scripts sharing one global namespace,
loaded in dependency order from `index.html`. `data.js` also exports through
`module.exports` so the test scripts can load it under Node without a browser.

The game loop clamps `dt` to 50 ms, so returning to a backgrounded tab never
teleports the world forward. Player shots are auto-fired on touch, and drag
movement is relative, so your thumb never covers the aircraft.

---

# TODO

Improvements found while reviewing the code, grouped by area and ordered by
severity inside each group. The four blocking bugs at the top were found by
probing the running game, not by reading it; everything below is static
analysis unless a probe is mentioned.

## 🔴 Blocking

Fixed, and covered by the regression block in `tests/smoke.mjs`:

- [x] **Stage softlock.** A wave whose biome did not match the terrain blocked
      the entire queue forever, because `updateScroll` only ends a stage once
      `waveIndex` reaches the end of the plan. **6 of the 64 stages could never be
      completed.** Two defences now: `buildWavePlan` predicts the biome at each
      wave's scheduled time and only draws compatible units, and a wave blocked
      for more than 2.5 s is forced into an air unit.
- [x] **Formation farming.** Formations that simply flew off the top of the
      screen were treated as cleared, awarding the 500 point bonus and dropping
      the POW crate without a single shot. Despawn now calls `releaseFormation`,
      which decrements without paying out.
- [x] **Shoot-down rate above 100%.** Side fighter hits were counted in
      `shotsHit` but their shots were not counted in `shotsFired`, pushing the
      rate to 240% and making the 50,000 SPECIAL bonus free.
- [x] **Wrong sound at stage start.** `startStage` played the stage-clear
      fanfare; there is now a dedicated two-note briefing sting.

## 🟠 Fidelity to 1942

- [x] Background music. A marching bassline with kick and hats, driven by a
      look-ahead scheduler that queues about four beats at a time so a throttled
      background tab cannot make it stutter. It plays only while flying: silent
      on the briefing screen, the stage tally, the pause screen and game over.
- [x] Carrier landing at the end of a stage: the ship comes up from the bottom
      and the aircraft settles onto her deck with a touchdown line, before the
      tally fades in.
- [x] The two fronts no longer share a formation vocabulary or a rhythm.
      Overlord flies tighter, line-heavy formations with a slow land cadence and
      echelon entries; Rising Sun flies wider V wedges with a faster sea cadence
      and heavier column drops. A sixth shape, the echelon, was added.
- [x] Shoot-down rate now weights target size, matching the original. It used to
      be shots hit over shots fired, which measured trigger discipline rather
      than the shoot-down rate the arcade paid a bonus for. Every archetype
      carries a weight, from 1 for a Zero to 20 for a boss. Enemies that fly
      away unscored count against you, exactly as they did on the cabinet.
- [x] Aerial loop. Steering during a roll already worked, but the loop did not
      *carry* the aircraft: with no input the plane just spun in place. It now
      travels forward on the heading it entered with, at reduced steering
      authority, so pressing the button always buys you ground. Steering is 35%
      of normal while looping, full outside it.
- [x] Pilot rank at the end of a run, from Rookie to Triple Ace.
- [x] Ground and sea targets no longer spawn over the wrong terrain. The biome
      check now samples the whole formation column rather than only its lead
      member, and the stage planner predicts the terrain at the moment each wave
      is due and only draws compatible units.

## 🟡 Mobile and iOS

- [x] `apple-touch-icon` pointed at an SVG, which **iOS ignores**, so the home
      screen icon fell back to a screenshot. `scripts/gen-icons.mjs` now writes
      real PNGs with a hand-rolled encoder: PNG container, CRC32 and a 3x3
      supersampled rasteriser, using nothing but the standard library.
- [x] The manifest declares four PNG icons including a maskable pair, plus `id`,
      `scope`, `categories` and `lang`.
- [x] The aircraft banks while dragging. Horizontal drag velocity now drives
      the same roll the keyboard did.
- [ ] Landscape layout. The 2:3 canvas letterboxes to a narrow strip.
- [ ] The playfield is a fixed 2:3 and wastes about a third of a modern phone. A
      390x844 screen renders the game 585 px tall and leaves 259 px unused. Going
      to 400x740 would fill the display, but it is invasive: the terrain tape,
      formation layout, boss positions and every movement budget are tuned for
      400x600 and have to be rebalanced together. Treat it as its own project.
      Everything else in this list is now done; this is the biggest one left.
- [x] Wake lock, so a long mission does not put the screen to sleep. Released and
      re-taken with the page.
- [x] `visualViewport` is watched as well as `resize`, so the canvas follows the
      collapsing iOS URL bar instead of ending up taller than the screen.
- [x] Long-press callout, text selection and the context menu are all suppressed
      on the canvas itself.
- [x] A controls hint over the playfield on the first run only, remembered in
      localStorage. The pause screen still carries the full list.

## 🟡 Performance

`tests/smoke.mjs` counts every canvas call, so these numbers are measured rather
than estimated. A full sea screen went from **1368 path operations per frame to
247**, with terrain itself now costing zero path operations on either band. The
remaining cost is aircraft, armour and the HUD, which is the actual content.

- [x] `drawSea` was issuing over 1100 `lineTo` calls plus a `Math.sin` each,
      every frame. The wave field is baked once per theme into an offscreen tile
      and scrolled with `drawImage`. **1102 path ops -> 0**, 15 blits.
- [x] `drawLand` re-hashed about 200 cells per frame and redrew every crop row.
      Baked into an offscreen tile too. **62 path ops -> 0**, 24 blits.
- [x] `ctx.shadowBlur` was set per bullet. Player rounds now use a cached glow
      sprite instead. Zero shadow assignments per frame.
- [x] `createLinearGradient` was allocated every frame for each sea band. The
      water gradient is now a 1x64 strip cached per theme and stretched.
      Zero gradients per frame.
- [x] `Art.schemeFor()` allocated a fresh colour object per enemy per frame. It
      is now a `(theatre, unit)` lookup table, so the common draw path allocates
      nothing.
- [x] `Sound.hit()` and `enemyShot()` were firing on every single impact, which
      stacks dozens of audio nodes per second. Both are now rate limited to one
      every 45 and 50 milliseconds.
- [x] `burst()` built a fresh `BufferSource`, filter and gain for every bang. One
      looping noise source behind one filter and one gain is created at startup
      now, and explosions only move its envelope.
- [x] Object pools for player shots, enemy shots, particles and floaters, so a
      long stage settles into a steady heap instead of sawtoothing.
- [x] `hudTick` was rewriting five DOM nodes every frame forever, including on
      the menu. It now only touches the DOM when a value actually changes, and
      the loop itself stops while paused.

## 🟢 Accessibility

- [x] POW crates now carry a letter as well as a colour, the way the arcade
      crate did: P firepower, B smart bomb, W wingmen, J jam, L loop, U 1 UP,
      + points. The seven colours are also all distinct.
- [x] `prefers-reduced-motion` is honoured: no screen shake, no hit-stop and
      particle bursts capped at three.
- [x] HUD text is 12 px and the bar is a pixel taller, which suits the denser
      screens the game runs on most.
- [x] The sound toggle carries `aria-pressed`, the scoreboard is an `aria-live`
      region, the loop button advertises its shortcut, and there is a skip link
      to the controls with visible focus rings throughout.
- [x] Nothing is carried by sound alone any more. The jam state is a countdown
      on the HUD, the bomber chain reads `BOMBER x3`, and every power-up prints
      its effect as text.

## 🟢 Feel and balance

- [x] Difficulty option. Three presets, Recruit, Arcade and Ace, scaling enemy
      speed, toughness, rate of fire, bullet speed and wave density. Arcade is
      the neutral one and the default, so the game plays like the original
      unless you ask otherwise.
- [ ] Checkpoint or continue, so one bad stage is not a full restart.
- [x] Screen shake on every kill, a harder shake and a hit-stop on boss hits and
      on your own death. Hit-stop is deliberately **not** applied to ordinary
      kills: in a game this dense it made the whole screen stutter every time a
      formation dropped.
- [x] The stage tally now auto-advances after five and a half seconds, with a
      countdown on screen. Tapping still skips it.
- [x] Bomber chain counter, shown as `BOMBER x3` while the chain is running.
- [x] The late stages were not actually harder: enemy speed only reached 1.37
      across the whole 32 stage run, so nearly all the ramp came from wave
      density and stage 3 felt like stage 32. The curve is steeper now, so the
      end of a run genuinely outpaces the start.

## ⚪ Code hygiene

- [x] Dead fields removed: `config.loopInvuln`, `config.shotSideSpeed`,
      `state.yashichiSpawned`, `boss.speed`, `artShapes.twin`.
- [x] `art.js` no longer defaults its own width; it reads the real canvas width
      out of `data.js` and the tile caches key off the theme.
- [x] `buildSegments` accumulates as it builds instead of re-summing the array
      on every pass.
- [x] Every asset path is relative now: the markup, the service worker
      registration, the precache list, `start_url` and `scope`. This game can be
      served from a sub-path, unlike the other four PWAs in the repo.
- [x] `data.js` documents the shape of everything it exports.

## ⚪ Tests and tooling

- [x] `node tests/run-all.mjs` runs syntax checks on all five JS files plus the
      three suites, and reports a summary.
- [x] `check-data.mjs` now asserts the v-formation and Yashichi schedules, and
      that both fronts share them.
- [x] `tests/smoke.mjs` counts every canvas call and asserts budgets: terrain
      must draw no per-point paths, no gradient may be rebuilt per frame, and
      no `shadowBlur` may be set per bullet. Numbers are printed on every run.
- [x] Both fronts are now played all the way to stage 1 and through to the
      surrender screen.
- [ ] The repository root README still does not index any of its projects. Left
      alone deliberately: none of the other projects are listed either, so adding
      this one alone would be inconsistent. Worth doing for all six at once.