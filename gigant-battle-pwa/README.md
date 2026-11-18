# GIGANT BATTLE PWA

A mobile-first 2D arena fighter PWA inspired by the DS-era team battle games
(such as *One Piece: Gigant Battle!*). It clones the **mechanics**: side-view arena
fighting, platform stages, team supports, specials and an eight-battle arcade route.
It uses **original archetypes and procedurally generated art/audio only** — no official
characters, names, artwork or music are included.

## Directory

```
gigant-battle-pwa/
├── index.html, package.json, tsconfig.json, vite.config.ts
├── manifest.webmanifest, sw.js, public/icon.svg
├── src/
│   ├── main.ts
│   ├── game/        Game loop, constants, shared types
│   ├── data/        Fighters, stages, enemy classes, story chapters and dialogue
│   ├── entities/    Fighter, Projectile, Assist
│   ├── systems/     Combat, AI, Rounds, Progression, Story, Dialogue
│   ├── input/       Keyboard and touch input
│   ├── render/      Pixel-art sprite factory, stages, renderer
│   ├── audio/       Web Audio synthesis + chiptune loop
│   └── ui/          Menus, dialogue screen, HUD, touch controls
├── tests/           Logic tests, browser smoke test, screenshots
└── dist/            Production build (generated)
```

## Technology

TypeScript · Vite · Canvas 2D (480×270 logical resolution, scaled with pixel-perfect
`image-rendering: pixelated`) · Web Audio API · localStorage · Service Worker.
No runtime dependencies, no external game assets, no backend.

## Install and run

Requires Node 20.19+ (Node 22 tested).

```bash
cd gigant-battle-pwa
npm install
npm run dev        # http://localhost:5174/
npm run build      # type-check + production build into dist/
npm run preview    # http://localhost:4174/
```

## Controls

### Touch (primary target)

Left joystick: move horizontally, push up to jump. Right-side buttons:
**LIGHT** (three-hit chain), **HEAVY** (launcher), **SPECIAL** (spends energy),
**DODGE**, **BLOCK**, **SUP 1** / **SUP 2** (call support fighters).
Landscape is recommended; portrait is still usable. Safe-area insets and gesture
prevention are handled.

### Keyboard

A/D move · W jump · J light · K heavy · L special · Shift dodge · B block ·
U/O supports · Esc pause.

## Features

- Sixteen playable archetypes with different power, speed, defense, reach, specials and support names.
- Original support team mechanic: pick two partners, each with an eight-second cooldown and a one-hit strike.
- Eight arenas (archipelago, iron depths, dockyard, floating market, volcanic forge, sky fortress, frozen wharf, ancient ruins), each with its own platforms and parallax backdrop.
- Five enemy classes — Grunt, Brute, Trickster, Sentinel and a two-phase Boss — with distinct AI profiles for aggression, reaction time, range, blocking, dodging and special usage.
- Ten-chapter Story Mode: pre/post-battle dialogue with pixel portraits, typewriter text and branching choices that unlock fighters, change morale, reveal the truth and reach four different endings.
- Combat with startup/active/recovery frames, hurtboxes, hitstop, screen shake,
  combo scaling, knockback, launching, blocking, dodge invulnerability, projectiles and energy.
- AI with reaction delay, spacing, blocking, jumping, specials and support usage; difficulty rises each arcade battle.
- Best-of-three rounds with a 60-second timer; eight-battle arcade route with unlocks saved locally.
- Save system v2 stores arcade wins, story chapter, flags, morale, unlocked fighters and endings, and migrates v1 saves automatically.
- Procedural pixel sprites, particle hits, synthesised SFX and a chiptune loop.
- PWA manifest, service worker and offline cache; settings for music, SFX and graphics quality.

## PWA installation

Open the game in Android Chrome or iPhone Safari, then choose **Install app** or
**Add to Home Screen**. After the first online load the service worker caches the app
shell and assets, so the game reopens offline.

## Testing

```bash
npm test              # 21/21 logic tests passing
npm run test:browser  # headless Chrome CDP smoke test (needs Chrome on macOS)
```

The browser smoke test runs with touch emulation and covers: menu, Story Mode dialogue,
a story battle with an enemy class, a story victory dialogue and chapter advancement,
fighter/support select with 16 cards, arcade route, HUD, touch controls, a special
attack, a forced match victory, advancing to battle 2, an offline reload through the
service worker, and a check for uncaught runtime exceptions. Screenshots are written to
`tests/screenshots/`.

Verified in this environment: production build, 21/21 unit tests and every browser
smoke check passing, including the story flow, offline reload and zero uncaught exceptions.

## Known limitations

- This is a compact 1v1 fighter with two assists per side, not a four-character simultaneous brawler.
- No online multiplayer; local keyboard play and single-device touch play only.
- Characters, stages and sounds are intentionally original rather than licensed One Piece assets.
- Pixel sprites are generated from simple palettes: expressive but deliberately minimal.
- The headless smoke test advances the real game-step function directly because
  animation frames are heavily throttled in headless browsers.
