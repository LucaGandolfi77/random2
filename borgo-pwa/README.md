# BORGO — La Passeggiata

An original third-person exploration game set in a fictional Apulian hill town at golden hour. You arrive as a guest, meet four townsfolk, run small errands and help the town prepare its evening walk.

Everything in this folder is original: the layout, names, dialogue, low-poly geometry, textures and sounds. Nothing is copied from another game, and no map data, external assets, fonts or runtime network requests are used.

## Play

- Live: `../borgo-pwa/` (deployed by the repository's Pages workflow)
- Local: `npm install && npm run dev`

## Loop

- Talk to Ada, Elio and Marta and accept their errands.
- Find three lost letters, pick five wildflowers, deliver a warm loaf.
- Collect six mosaic tiles hidden around the town.
- When the town is ready, ask Nino to let you ring the dusk bell.
- Hospitality points raise your rank from *Forestiero* to *Cittadino onorario*.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Walk | `WASD` / arrows | left joystick |
| Run | `Shift` | push the joystick fully |
| Jump | `Space` | — |
| Interact / advance | `E` or `Enter` | `OK` button |
| Map | `M` | map button |
| Journal | `J` | journal button |
| Pause | `Esc` | pause button |
| Look around | drag / scroll | drag the scene |

## Tech

- Vite 7 + TypeScript (strict) + Three.js 0.180.
- Static town merged into a handful of draw calls; instanced-style props, static shadow map, blob shadows for characters.
- Procedural canvas textures and WebAudio synthesis — no binary assets.
- Versioned `localStorage` save (`borgo.save.v1`), sanitised on load.
- Installable PWA with an offline service worker.
- Bilingual UI and dialogue (Italian default, English toggle).

## Structure

```
src/
  app/app.ts          scene, loop, state machine, interactions
  data/               town layout, dialogue, quests, UI strings
  game/               pure state machine, sanitising, persistence
  player/             movement, collision, camera, input
  world/              merged geometry, buildings, props, sky, lighting, NPCs
  ui/                 HUD, map, journal, dialogue, touch controls
tests/
  collision, quests, save, layout reachability, strings, originality
```

## Commands

```sh
npm install
npm run dev        # local server
npm test           # 53 unit tests
npm run typecheck
npm run build      # typecheck + production bundle
npm run preview
```

The layout tests walk the actual collision grid, so a building placed over a door or a collectible behind a wall fails the suite before it reaches a browser.

## PWA

`public/manifest.webmanifest` and `public/sw.js` are copied into `dist/` by Vite. The service worker precaches the shell and caches hashed assets on first use; a navigation falls back to the cached document when offline.

## Deployment

The GitHub Pages workflow builds this folder and publishes `dist/` at `/borgo-pwa/`. The source folder is excluded from the repository-wide `rsync` so `node_modules` and the Vite source are never served.
