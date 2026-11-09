# Ashen Crown — A Tale of Elarion

An original, browser-based dark fantasy CRPG built with TypeScript, React, Phaser 3, Zustand, and Vite. It is set in **Elarion**, a world held together by a thousand-year covenant that is beginning to fail. You wake in the **Fallen Bastion** with a mark on your soul, a stranger named Kaelen watching you, and a question that every faction in the vale wants to answer for you: *who gets to decide what the world remembers?*

This is Chapter One: **The Crown of Cinders** — a complete playable campaign chapter with a beginning, recruitable companions, tactical battles, branching quests, four endings, and a secret ending.

No external game assets are used. All portraits, maps, props, effects, icons, music, and sound effects are generated at runtime or by the included build scripts.

---

## At a Glance

| Content | Implemented |
| --- | --- |
| Playable chapter | Chapter One: The Crown of Cinders |
| Classes | 6 — Warrior, Rogue, Mage, Cleric, Ranger, Warlock |
| Ancestries | 6 — Erdan, Aelborn, Cindral, Tidewrought, Stoneborn, Wraithmarked |
| Backgrounds | 5 — Soldier, Scholar, Outcast, Pilgrim, Artisan |
| Recruitable companions | 5 — Kaelen, Nyx, Ilyra, Oren, Sable |
| Major regions | 5 — Fallen Bastion, Greymoor Village, Whispering Woods, Sunken Temple, Ashen Citadel |
| Maps / interiors | 10 total (major regions plus inn, manor, shop, chapel, and ruins) |
| Quests | 13, including five companion arcs |
| Dialogue trees | 36, with checks, requirements, approvals, and branching consequences |
| Abilities | 58 player/enemy abilities |
| Status effects | 20 |
| Items | 54 |
| Enemies | 15 stat blocks |
| Encounters | 11 |
| Boss encounters | 4 — Ash-Warden, Antlered Silence, Drowned Saint, Crownbound Veyra |
| Specializations | 12 — two per class, chosen at level 3 |
| Endings | 4 — Reforge, Shatter, Bear, and the secret Unwritten |
| Save slots | 1 autosave + 3 manual chronicles |
| Persistence | IndexedDB with a localStorage fallback |
| Audio | Procedural Web Audio music and SFX, no audio files |
| Offline | Installable PWA with precached build, fonts, icons, and manifest |

---

## Originality

Elarion, the Covenant, the Nine Shapers, the Ashen Choir, the Rootbound, the Ashen Crown, and every character, faction, location, line of dialogue, item, ending, and piece of art in this project are original to this game. The project is inspired by the structure and feel of party-based fantasy CRPGs, but it does not use Baldur's Gate, Dungeons & Dragons, or any other copyrighted setting, characters, text, maps, or assets from another game or franchise.

Mechanical concepts such as d20 checks, armor class, proficiency, and turn-based action points are common tabletop-RPG conventions and are implemented here with original rules and content.

---

## Playing the Game

### Requirements

- Node.js 20+ recommended (Node 22 was used during development)
- npm
- A modern browser. Chrome was used for the recorded smoke tests; current Chromium-based browsers are the primary target.

### Install and run

```bash
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```

The production build includes the PWA service worker and precache manifest.

### Tests

```bash
npm run typecheck
npm test
```

Optional browser smoke scripts require `playwright-core` and a Chrome executable. They are developer tools, not part of the app bundle:

```bash
npm install --no-save playwright-core

# Production preview smoke test (start `npm run preview` first)
ASHEN_URL=http://localhost:4173 CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/smoke.mjs

# Development-integrated smoke test (start `npm run dev` first)
ASHEN_URL=http://localhost:5173 CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/deep-smoke.mjs

# Mobile layout and combat smoke test (start `npm run dev` first)
ASHEN_URL=http://localhost:5173 CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/mobile-smoke.mjs

# Specializations, combat actions, and settings persistence (start `npm run dev` first)
ASHEN_URL=http://localhost:5173 CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/upgrade-smoke.mjs

# PWA/offline smoke test (start `npm run preview` first)
ASHEN_URL=http://localhost:4173 CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/offline-smoke.mjs
```

The dev build exposes a `window.__ASHEN_STORE__` handle for these tests and for debugging. It is omitted from production builds by Vite's `import.meta.env.DEV` replacement.

---

## Controls

### Exploration — desktop

| Input | Action |
| --- | --- |
| Click ground | Walk to a tile |
| Click a glowing marker | Walk toward it and interact |
| Mouse wheel | Zoom the camera |
| `WASD` / arrow keys | Move on the isometric grid |
| `F` | Search the area for hidden objects and traps |
| `R` | Rest the party |
| `I` | Inventory |
| `J` | Journal |
| `C` | Character sheet |
| `P` | Party roster |
| `M` | Map and fast travel |
| `H` | Help |
| `Esc` | Close the current screen / open Settings |

### Exploration — touch

- Drag the left joystick to move.
- **Interact** uses the nearest visible interactable within reach, or tells you if there is none.
- **Search** scans for hidden objects within four tiles.
- **Rest** restores the party.
- The HUD provides Journal, Inventory, Character, Party, Map, and Settings on touch screens.

### Combat

| Input | Action |
| --- | --- |
| Click/tap a reachable tile | Move the current character |
| Click/tap an enemy with no ability selected | Basic attack |
| Select an ability, then click/tap a target | Use the ability |
| `1`–`6` | Select an ability |
| `Space` | End the current turn |
| `Esc` | Cancel the selected ability |
| End Turn button | End the current turn |
| Actions row | Dash, Disengage, Shove, or Help |

Shove and Help are targeted: choose the action, then click an adjacent enemy or ally. Dash adds movement equal to your speed. Disengage prevents opportunity attacks for the turn. Help grants Blessed to an ally or stabilises a downed one.

Combat is turn-based. Each turn grants **3 AP** and a movement allowance. Moving consumes movement, not AP. Abilities consume AP and class resource. Cover raises AC against ranged attacks and surfaces interact with damage types. **Downed** allies can be brought back by a cleric's *Call Back the Lost* (or healed after the battle with rest and potions).

---

## Systems

### Character creation

- Name, ancestry, class, background, difficulty, appearance, and an attribute spread using a 27-point pool.
- Ancestry bonuses are layered on top of the base spread.
- Six portrait hair styles, swatches for skin/hair/eye colour, markings, and randomisation.
- Three difficulties: Story, Balanced, Tactician.
- Class resources: Resolve, Guile, Arcana, Faith, Instinct, Pact.
- Twelve level-3 specializations, two per class, each granting a unique ability and a passive identity bonus.

### Exploration

- Isometric, procedural maps with depth-sorted props, animated foliage, water, ash, rain, fireflies, dust, braziers, and weather.
- Click-to-path movement using breadth-first search, keyboard movement, camera follow, zooming, and an on-screen touch joystick.
- Interactables include NPCs, companions, chests, hidden caches, traps, runes, shrines, camps, merchants, doors, exits, puzzles, notes, and enemies.
- Clicking a distant marker auto-walks the protagonist to the nearest valid approach tile before interacting.
- Hidden objects can be found by area search or by noticing faint glimmers; searching uses the best party member for the relevant skill.
- The rune sequence (Root → Moth → Crown) and the three temple seals are derived from flags rather than a fragile scripted order.

### Dialogue and skill checks

- 36 branching dialogue trees with speaker portraits, tags, availability requirements, and tone markers.
- Checks roll **d20 + attribute modifier + proficiency** against a DC. Natural 20 always succeeds; natural 1 always fails.
- Checks can gate class, ancestry, companion, item, or flag-specific options.
- Choices can grant approval/disapproval, quest stages, gold, items, XP, recruits, flags, combat, travel, shops, rests, or endings.
- One-time dialogue rewards are deduplicated so conversations cannot be farmed for infinite gold or experience.
- A check overlay shows the die, modifiers, DC, result, critical outcomes, and a short consequence line.

### Tactical combat

- Initiative order, 3 AP, movement, abilities, cooldowns, resources, statuses, and AI turns.
- Nine-direction movement pathfinding and reachable-tile highlighting.
- Abilities cover melee, ranged, area damage, healing, buffs, debuffs, control, summons, and surface interaction.
- Combat actions: **Dash**, **Disengage**, **Shove**, and **Help**. Help grants Blessed or stabilises a downed ally; Shove can push enemies into hazards or Stun them against obstacles.
- **Opportunity attacks** punish movement away from adjacent combatants. Disengage prevents them for the turn, and reactions refresh when their owner’s turn begins.
- Surfaces: water, fire, oil, ice, ash, blood, and holy. Lightning arcs through water; cold freezes water; fire ignites oil and barrels.
- Cover from walls, trees, rubble, and props increases AC against ranged attacks.
- Boss phases, support AI, enemy healing, summons, downed party members, and difficulty scaling.
- Combat log, initiative rail, ability bar, AP pips, resource display, item use, hover range previews, animated damage numbers, hit bursts, and screen shake.

### Companions and progression

- Five companions with portraits, personalities, secrets, approvals, personal quests, and combat builds.
- Active party of four; recruited companions can be swapped from the Party screen outside combat.
- Kaelen Voss — the Grey Knight
- Nyx Ardent — the Knife in the Choir
- Ilyra Morn — the Archivist of Absences
- Oren Hale — the Village Prayer
- Sable — the Shadow of the Woods
- Levels 1–8 with XP thresholds, HP growth, resource growth, new abilities, and attribute increases at levels 4, 6, and 8.
- Player specializations are chosen at level 3 from two class paths. Companions automatically follow their own path from level 3 onward.
- Approval changes based on choices and has narrative consequences.

### Inventory, equipment, and economy

- 54 items across weapons, armor, shields, helmets, accessories, potions, scrolls, quest items, and materials.
- Five equipment slots per character.
- Class restrictions, equipment stat modifiers, tooltips, rarity colours, and comparison notes.
- Consumables outside and inside combat.
- Merchant UI with buy/sell tabs, stock counts, prices, and gold display.
- Gold is party-wide and stored on the protagonist.

### Saves

- Autosave before battles, after victories, on travel, after the prologue, and on rest.
- Three manual chronicle slots plus autosave.
- IndexedDB storage with a localStorage fallback.
- Versioned saves and checksums to reject corrupted or incompatible data.
- Save metadata includes character name, level, location, play time, and timestamp.

### Presentation

- React UI overlay over a Phaser canvas.
- Original procedural SVG portraits for player, companions, and NPCs.
- Isometric procedurally drawn tiles, walls, trees, ruins, houses, braziers, statues, and props.
- CSS design system using Cinzel and EB Garamond (bundled through Fontsource).
- Web Audio procedural music tracks for menu, bastion, village, chapel, forest, ruins, temple, citadel, combat, boss, final boss, and ending.
- Procedural SFX for UI, checks, travel, loot, combat, abilities, rest, runes, victory, defeat, and the ending.
- Music and effects volume controls, mute, text scaling, reduced motion, low-effects mode, and dice-detail toggle.
- Settings persist across sessions in browser storage, independently of save files.

### PWA and offline

- `public/manifest.webmanifest` with 192px, 512px, and maskable icons.
- `vite-plugin-pwa` generates a Workbox service worker with an app-shell navigation fallback.
- Build assets, fonts, icons, and the manifest are precached.
- Service worker is configured to claim clients and skip waiting for updates.
- The game can be installed to the home screen or desktop and launched offline after the first successful load.
- Saves remain local to the browser even offline.

---

## Campaign Structure

Spoiler-light:

1. **The Fallen Bastion** — wake, meet Kaelen, clear the courtyard, break the Ash-Warden, and open the road.
2. **Greymoor Village** — navigate the Reeve, the Inquisitor, the Choir, the silent bell, and the village's competing truths.
3. **The Whispering Woods** — meet Sable, walk the rune order, face the Antlered Silence, and open the Rootbound Ruins.
4. **The Sunken Temple** — solve the three seals, survive the guardians, and face the Drowned Saint.
5. **The Ashen Citadel** — confront Veyra, break the Crownbound, and decide the fate of the Crown.

The secret **Unwritten** ending requires all five companion quests, the Hollow Merchant thread, the archive truth, and the Crown's own truth. It is not offered by default.

---

## Architecture

```text
ashen-crown-rpg/
├── index.html
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── scripts/
│   ├── generate-icons.mjs
│   ├── smoke.mjs
│   ├── deep-smoke.mjs
│   ├── mobile-smoke.mjs
│   ├── upgrade-smoke.mjs
│   └── offline-smoke.mjs
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── audio/
│   │   └── AudioDirector.ts
│   ├── core/
│   │   ├── gameStore.ts      # Zustand orchestration
│   │   ├── rng.ts
│   │   └── types.ts
│   ├── data/                 # Maps, dialogues, quests, items, enemies, subclasses, etc.
│   ├── game/
│   │   ├── BootScene.ts
│   │   ├── ExplorationScene.ts
│   │   ├── CombatScene.ts
│   │   ├── GameCanvas.tsx
│   │   ├── bus.ts
│   │   └── iso.ts
│   ├── screens/              # Menu, creation, intro, game, ending
│   ├── systems/
│   │   ├── character.ts
│   │   ├── checks.ts
│   │   ├── combat.ts
│   │   ├── gameState.ts
│   │   └── save.ts
│   ├── ui/                   # HUD, dialogue, combat UI, modals, portrait
│   └── styles/               # Design system and screen styles
└── tests/                    # Vitest unit, data-integrity, and campaign tests
```

### Data flow

- **Zustand store** owns screen state, the active game, dialogue runtime, combat runtime, modals, saves, settings, toasts, and the ending.
- **Phaser scenes** subscribe to the store. Exploration handles map rendering, movement, markers, weather, and interactions. Combat handles tiles, units, highlights, effects, and click targeting.
- **React** renders the menu, character creation, prologue, HUD, dialogue, combat controls, modals, save screens, and endings.
- **Systems** are pure or nearly pure TypeScript: checks, progression, combat resolution, inventory, quests, and save serialisation.
- **Data** is declarative. Quests, dialogues, maps, abilities, items, enemies, encounters, companions, and endings are plain typed objects.

---

## Verification Performed

The following checks were actually run in this repository:

1. **TypeScript**: `npm run typecheck` — passed.
2. **Unit/integration tests**: `npm test` — 32 tests in 9 files passed, including:
   - character creation, ancestry bonuses, equipment-derived AC, leveling without mutating the previous record, specialization statistics and companion paths;
   - deterministic skill checks and critical success/failure;
   - combat creation, reachable tiles, attack resolution, victory detection, enemy-turn rejection, targeted ally healing and revival, Dash/Disengage/Shove/Help, and opportunity attacks;
   - inventory stacking, companion recruitment, quest idempotence, derived flags, rest;
   - dialogue integration, one-time reward deduplication, peaceful Choir resolution, interior door travel;
   - full campaign simulation from a new Aelborn Mage to the secret **Unwritten** ending, including all five companion quests, the Hollow Merchant thread, the runes, all three temple seals, all major combats, and the final choice;
   - the level-3 specialization store flow and persistence of the chosen path.
3. **Production build**: `npm run build` — passed; Vite emitted the PWA service worker and precache manifest.
4. **Browser smoke tests** (headless Chrome via Playwright, 1440×900 and 390×844 mobile emulation):
   - menu, New Chronicle, four-step creation, prologue, exploration;
   - marker click, auto-walk, dialogue choices, recruitment;
   - inventory, journal, party, character sheet, map, shop purchase;
   - combat scene, scaled battle board, action bar, Dash/Shove selection, victory overlay, defeat overlay, autosave retry;
   - specialization sheet, specialization selection, and mobile specialization/combat layouts;
   - settings persistence across a full page reload;
   - save write / mutate / load round-trip;
   - ending screen;
   - mobile combat victory and ending layouts;
   - service worker registration.
5. **Offline/PWA test**:
   - loaded the production build online, waited for the service worker to control the page, set the browser context offline, and reloaded successfully from cache;
   - verified the manifest returns HTTP 200 with three icons and that the primary icon returns HTTP 200.
6. **Console/page errors**: the smoke runs reported no page errors and no console errors in the tested flows.

The Phaser canvas itself is exercised by these browser smoke tests rather than by DOM unit tests. Combat and game-state rules are covered independently in Vitest.

---

## Known Limitations

- This is **Chapter One**, not the entire multi-chapter saga. The story reaches a complete ending, but there is no post-ending free roam or New Game+.
- Art is procedural and stylised. There are no hand-painted portraits, 3D models, cinematics, or voice acting.
- Audio is procedurally synthesised; it is intentionally atmospheric and minimal.
- English only, as required for this build.
- No cloud saves, accounts, multiplayer, gamepad support, or controller remapping.
- Saves are local to the browser profile. Clearing site data deletes them. The localStorage fallback is not a substitute for a backup.
- Mobile combat uses a zoomed isometric board on portrait screens; extreme edge tiles may sit outside the initial view. The board centres the main engagement and auto-approach handles exploration markers, but there is no dedicated pinch-to-zoom gesture yet.
- Opportunity attacks are resolved automatically rather than through a reaction-prompt window.
- The canvas world is not fully screen-reader accessible. UI overlays use semantic buttons and labels, and comfort settings are provided.
- Browser testing used Chrome desktop and Chrome mobile emulation. Safari, Firefox, and physical-device matrix testing were not performed.
- No visual regression test suite is included; screenshots were inspected manually during development.
- PWA install/offline support requires HTTPS (or localhost) and a browser that supports service workers.
- Build size is large because Phaser is bundled. Phaser, React, and app code are split into separate vendor chunks, and the entire build is precached for offline play.

---

## Credits

- Design, code, writing, maps, portraits, procedural art, combat rules, and original music/SFX: project implementation.
- Fonts: **Cinzel** and **EB Garamond**, distributed through Fontsource under the SIL Open Font License.
- Engine: **Phaser 3** (MIT).
- UI: **React** (MIT), **Zustand** (MIT).
- Build: **Vite** (MIT), **vite-plugin-pwa** (MIT), **Workbox** (MIT).
- Icons are generated from the game's crowned-sigil motif by `scripts/generate-icons.mjs` using Sharp.

---

*“The Crown remembers everything — even the things you would rather forget.”*
