# BROS. SAGA

A mobile-first 2D role-playing game inspired by the DS-era "two brothers" adventures:
explore an overworld controlling **two siblings at once**, then win turn-based battles
with **timed Action Commands** and cooperative **Bros. Attacks**.

Characters, names, areas and art are original. No Nintendo assets or characters are used.

## Directory

```
bros-saga-pwa/
├── index.html, package.json, tsconfig.json, vite.config.ts
├── manifest.webmanifest, sw.js, public/icon.svg
├── src/
│   ├── main.ts
│   ├── game/      Types, constants and the game orchestrator
│   ├── data/      Brothers, enemies, areas, items, moves
│   ├── systems/   Overworld and battle systems, audio
│   ├── render/    Procedural pixel-art sprites and canvas renderer
│   ├── input/     Keyboard and touch controls
│   └── ui/        Menus, HUD, dialogue and battle interface
├── tests/         Logic tests, browser smoke test and screenshots
└── dist/          Production build (generated)
```

## Technology

TypeScript · Vite · Canvas 2D · Web Audio API · localStorage · Service Worker.
No runtime dependencies, no external assets: every sprite and sound is generated at runtime.

## Install and run

```bash
cd bros-saga-pwa
npm install
npm run dev        # http://localhost:5175/
npm run build
npm run preview
```

## Controls

### Touch
- **D-pad** — move the leading brother; the other follows.
- **A** — leader action: jump, open chests, strike enemies first (pre-emptive battle).
- **B** — rear brother action (hammer).
- **SWAP** — change the leading brother.
- **MENU** — pause.

### Desktop
Arrows/WASD move · J/Space/Enter = A · K/X = B · Tab/Shift = SWAP · Esc = menu.
In battle, number keys 1-9 pick commands; J/Space performs the timed press.

## Gameplay

- **Overworld**: two brothers move together through nine areas. Enemies roam; touching one starts a battle. Hitting one with A gives a pre-emptive strike.
- **Powers**: double jump, ground pound, elemental dashes, Bros. Shield and hover spin unlock by level and also become battle moves with BP costs.
- **Battle**: each brother acts on his own turn. Choose JUMP, HAMMER, an elemental HAND, a Bros. Attack (spends BP), or an item. A cursor crosses a bar: press A inside the yellow window for extra damage; a perfect press deals 1.5× and can grant extra hits.
- **Defence**: when an enemy attacks, press A inside the window to dodge and counter.
- **Status effects**: burn, shock, stun and defence-down from power attacks.
- **Items**: Mushroom heals, Pepper boosts attack for the battle, 1-UP revives a fainted brother.
- **Minigames**: Coin Rush, Hammer Toss, Jump Rope, Recipe Dash and Card Match award coins, BP, items and badges.
- **Badges**: six equippable accessories (max two) modify stats, timing window, HP, loot and perfect-hit power. Buy them with coins.
- **Progression**: XP levels up each brother independently up to level 20; choose POWER, DEFENCE or SPEED. Defeat ten bosses and restore the star.
- **Long-term play**: New Game+ with stronger enemies and a secret final boss, four challenge modes (including Iron Man and Timer Attack), endless dungeon, boss rush, daily seeded challenges with local leaderboards, six side quests, achievements and collectibles.

## Content

Thirteen areas, twenty-two enemies, ten bosses, thirteen badges, six side quests, five minigames, six powers, achievements, collections and an ending — plus New Game+ and endless replay modes.

## PWA installation

Open in Android Chrome or iOS Safari and choose **Install app** / **Add to Home Screen**.
After the first load the service worker caches the game for offline play.

## Testing

```bash
npm test              # 16/16 logic tests passing
npm run test:browser  # headless Chrome CDP smoke test (needs Chrome on macOS)
```

The smoke test uses touch emulation and covers: menu, challenge selection, overworld HUD, touch
controls, a minigame and its reward, a battle with a power move and burn status, a timed attack,
victory, badge purchase/equip, achievements, collections, quest log, endless dungeon start,
save data, an offline reload and a check for uncaught runtime exceptions. Screenshots are in
`tests/screenshots/`.

Verified here: production build, 16/16 unit tests and every browser smoke check passing.

## Known limitations

- This is a compact tribute, not a port of the original game; story and locations are original.
- Bosses are single-phase encounters with telegraphed attacks rather than full scripted phases.
- Maps are procedurally generated tilemaps rather than hand-crafted campaign levels.
