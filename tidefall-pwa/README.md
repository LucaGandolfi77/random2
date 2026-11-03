# TIDEFALL: Maree di Cenere

TIDEFALL is an offline-first, single-player naval RPG prototype. Every captain, merchant, rival and fleet is simulated locally by deterministic game logic. There is no multiplayer, account or remote service.

## Concept

The Ashen Meridian is an archipelago scarred by a volcanic tide. The player is Captain Mara Vey aboard the small cutter *Lantern Wake*. Three factions compete for the living trade routes: the Tidebound Compact, the Brasswake Syndicate and the Salt Court. AI captains remember encounters, choose goals from their personalities and move between ports. The first playable slice covers the outer sea, combat, loot and an AI merchant convoy.

## Direction

A 2D top-down nautical RPG with inked silhouettes, oxidized copper UI, sea-glass cyan highlights and ember-red threat signals. The art is procedural Canvas 2D so the game has no binary asset dependency and works offline after the first load.

## Run locally

Serve the repository root, then open `/tidefall-pwa/`:

```bash
python3 -m http.server 8080
```

The PWA uses native ES modules and does not require a build step.

## Controls

- Keyboard: `WASD` or arrows to steer, mouse click to set a course, `Space` to fire, `E` to collect nearby loot.
- Touch: hold the left virtual helm to steer, tap the sea to set a course, use `FIRE`, `COLLECT`, `REPAIR` and `DOCK`.
- `R` / `REPAIR`: restore up to 28 hull points (32-second cooldown).
- `AMMO`: cycle round, chain, cinder and harpoon shot. Special stock is limited; resupply at any port.
- `BOUNTY BOARD`: accept one recurring pirate captain bounty.
- Select an AI ship or sea monster by tapping/clicking it. Follow timed treasure marks to their chart location.
- `E` / `COLLECT`: recover nearby loot or a shipwreck. Sail close to chart markers to record their stories.

## Architecture

- `src/config.js`: world, regions, factions, vessel and tuning data.
- `src/math.js`: shared deterministic movement and geometry helpers.
- `src/rng.js`: deterministic seeded random generator.
- `src/storage.js`: IndexedDB save/load with localStorage fallback.
- `src/ai.js`: personality-driven state machine and relationship memory.
- `src/world.js`: fixed-step simulation, movement, collision, combat and loot.
- `src/render.js`: camera-bounded procedural sea, region minimap, islands, wrecks, ships and combat effects.
- `src/input.js`: keyboard, pointer and mobile virtual helm.
- `src/ui.js`: HUD, target panel, event log and touch controls.
- `src/main.js`: application lifecycle and fixed-step loop.

## Milestone 1 acceptance

- [x] Responsive landscape PWA shell and offline cache.
- [x] Inertia-based ship movement with steering, acceleration and drag.
- [x] Tap/click-to-navigate and virtual helm input.
- [x] Animated sea, islands, port, minimap and procedural ship silhouettes.
- [x] AI merchant, pirate and hunter behavior with distinct personalities.
- [x] Target selection, cannon cooldown, projectiles, impact particles and damage.
- [x] Salvage pickup, hull/crew HUD and event feed.
- [x] Special ammunition, field repair, bounties, sea monsters and timed treasure.
- [x] Local save of captain, ship, relationships and world timestamp.

## Planned milestones

1. **Prototype giocabile**: current slice, navigation, combat, AI and HUD.
2. **Gameplay e AI**: ammunition, repairs, missions, inventories, progression and richer memory.
3. **Mondo vivo**: regions, ports, trade routes, factions, wars and dynamic events.
4. **Progressione avanzata**: ten ship classes, equipment, bosses, companions and fleets.
5. **Persistenza**: offline time simulation, import/export and world event journal.
6. **Ottimizzazione e pubblicazione**: mobile profiling, install prompts, accessibility and release QA.
