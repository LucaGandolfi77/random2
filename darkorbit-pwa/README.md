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

## Game loop

- **Shields first, hull second.** Lasers strip the shield before damaging hull;
  shields regenerate after a lull in combat.
- **Ammo with trade-offs.** X4 (fast, light), X6 (medium) and X7 (heavy, slow)
  with escalating cooldowns and light homing.
- **Enemies & bosses.** Swarm drones, scouts, sentinels, raiders and two bosses,
  with chase/strafe AI and spread-fire attacks.
- **Loot & economy.** Kills drop ore crates; boxes drop credits, urium and
  shield repairs. Cargo is limited — fly into the station to sell it.
- **Progression.** XP and levels, four ships, five upgrade tracks, up to four
  combat drones, and three active abilities.
- **Sectors.** Alpha → Beta → Gamma → Delta, gated by level, each with its own
  palette, enemies, hazard level and loot table.
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
