# PHONE OR DIE

A first-person 3D psychological horror survival game for desktop and mobile browsers.

**10:00 PM. You are alone. A message appears: "They only come when you are alone."**
Something is standing outside your window. The phone starts ringing. A distorted voice whispers:
*"Keep talking. Don't let them get close."* Survive until 6:00 AM.

The telephone is the survival mechanic. The Shadows get bolder every time the line falls silent.
Explore the house, find chargers and a flashlight, secure doors, call the right people, and decide
who is telling the truth before dawn.

Everything in the game is in English. Nothing contacts the network: all calls, contacts, audio and
assets are simulated and generated locally.

---

## Directory

```
phone-or-die-fps/
├── index.html, package.json, tsconfig.json, vite.config.ts
├── manifest.webmanifest, sw.js, public/icon.svg
├── src/
│   ├── main.ts
│   ├── game/          Game orchestrator, state, configuration
│   ├── renderer/      Scene, lighting, procedural meshes and textures
│   ├── player/        First-person controller, raycast interactions, touch input
│   ├── world/         House, furniture, doors, windows, navigation nodes
│   ├── enemies/       Shadow meshes, AI states, waypoint navigator, manager
│   ├── systems/       Threat, phone, calls, battery, events, story, audio, saves
│   ├── ui/            HUD, phone interface, menus and endings
│   ├── data/          Contacts, dialogue, chapters, events, endings
│   └── styles.css
├── tests/             Logic tests, browser smoke test and captured screenshots
└── dist/              Production build (generated)
```

## Technology

Three.js · TypeScript · Vite · Web Audio API · WebGL 2 · localStorage · Service Worker.
No external game assets, no backend, no real telephony, no third-party runtime services.

## Installation

Requires Node.js 20.19+ (Node 22 tested).

```bash
cd phone-or-die-fps
npm install
```

## Development server

```bash
npm run dev
```

Open `http://localhost:5173/`.

## Production build

```bash
npm run build     # type-check + production bundle into dist/
npm run preview   # serve the production build at http://localhost:4173/
```

## Controls

### Desktop

| Input | Action |
| --- | --- |
| WASD / arrows | Move |
| Mouse | Look around (click the game to lock the pointer) |
| Shift | Sprint |
| Ctrl / C | Crouch |
| E | Interact with the object under the crosshair |
| F | Flashlight (must be picked up in the storage room) |
| TAB | Open / close the phone |
| 1 / 2 / 3 | Pick a dialogue response during a call |
| ESC | Pause / close the phone |

### Mobile

Left virtual joystick moves. Swipe on the right side to look. Large buttons: **RUN**, **USE**,
**DUCK**, **PHONE**, **LIGHT**, **MENU**. Landscape is recommended; portrait remains playable.
Touch controls also appear automatically on the first touch on hybrid devices.

## PWA installation

Open the game in Android Chrome or iPhone Safari, then use the browser's **Add to Home Screen**
(or **Install app**) action. After the first online load, the service worker caches the app shell
and all requested assets, so the game starts offline.

## Content

- 9 explorable areas: hallway, living room, kitchen, bedroom, bathroom, garage/storage, front and back entrances, garden and front yard.
- 8 fully written contacts with branching calls, cooldowns, diminishing returns and individual benefits.
- 6 chapters from 22:00 to 06:00, 8 weighted random events, 6 reachable endings.
- Threat bands from SAFE to CAPTURE, four Shadow archetypes (Watcher, Crawler, Tall One, Mimic)
  with stalking, approaching, investigating, hunting, ambushing and attacking behaviours.
- Battery, flashlight, wall charger, power bank, lockable doors, light switches, photographs and
  environmental revelations.
- Three graphics presets, autosave, three manual save slots, settings and credits.

## Testing

```bash
npm test              # 10/10 logic tests passing
npm run test:browser  # headless Chrome end-to-end smoke test (needs Chrome on macOS)
```

The browser smoke test drives the real game through: main menu, introduction, first-person scene,
phone, contacts, ringing, a connected call, a branching response, movement, pickups, flashlight,
door interaction, high-threat Shadow spawning, save/load, the 06:00 ending, the capture sequence,
game over, and a mobile touch-emulated viewport. It fails on any uncaught runtime exception.
Screenshots from the latest run are in `tests/screenshots/`.

Verified in this environment: TypeScript type-check, production build, 10/10 unit tests, and all
browser smoke checks passing (including mobile layout and zero runtime exceptions).

## Known limitations

- Art direction is stylized low-poly with procedural geometry and canvas textures; there are no
  photorealistic assets and no Blender-authored GLB files.
- Reflections in mirrors and windows are approximated with materials rather than real-time planar reflection.
- The house is a single level with flat floors; stairs are not implemented.
- Content volume is intentionally compact (one night, one house, eight contacts) in exchange for all
  systems being implemented and playable end to end.
- Headless browsers throttle animation frames heavily, so the smoke test advances the real call
  system clock directly instead of waiting for wall-clock time.
- Positional audio uses Web Audio panners; some mobile browsers require a first user gesture before sound starts.
