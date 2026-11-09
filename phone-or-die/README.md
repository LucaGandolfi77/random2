# PHONE OR DIE

An original browser psychological-horror survival game about a young woman walking home alone at night — and the road that refuses to let her arrive.

**Every step brings them closer. Call to push them back. Get home before 6:00 AM.**

No real phone numbers, contacts, cameras, microphones, or notification permissions are used. All characters, writing, art, and sound are original to this project.

---

## Contents

- [What is in the game](#what-is-in-the-game)
- [The quest](#the-quest)
- [Technology](#technology)
- [Requirements](#requirements)
- [Install and run](#install-and-run)
- [Controls](#controls)
- [How to survive the road](#how-to-survive-the-road)
- [Saving and offline play](#saving-and-offline-play)
- [Project structure](#project-structure)
- [Testing performed](#testing-performed)
- [Known limitations](#known-limitations)
- [Credits and licenses](#credits-and-licenses)

---

## What is in the game

- **A complete night journey, 10:00 PM to 6:00 AM**, across six city districts.
- **A walkable night city**: forty-six by thirty-four tiles of streets, sidewalks, alleys, a park, shopfronts, streetlights, parked cars, bus shelters, and a distant porch light.
- **Two origins**: Emma can be coming home from a late shift at the copy shop or from a late dinner with Daniel. The choice changes her opening narration, first messages, and a small amount of contact trust.
- **A working smartphone interface**: home screen, nine contacts, twenty-six branching conversations, thirty messages, live call screen, call history, and battery management.
- **Nine contacts** with relationships, availability windows, trust levels, secrets, and repeat conversations.
- **Fourteen road events**, including a payphone that rings with no area code, headlights that follow at walking pace, a street that repeats, a bus shelter knock, a voicemail from someone who should be asleep, and the last message from 5:59 AM.
- **Step-driven shadow pursuit** with five visual stages. Every tile walked brings the shadows closer; lit streets slow them, dark parks and alleys accelerate them, and standing still becomes dangerous after a short grace period. A dynamic stalker silhouette and screen-edge tendrils make the distance visible.
- **Calls as repellent.** A successful conversation pushes the shadows back and grants a shield measured in footsteps. The shield is consumed as Emma walks, so staying on the phone is never infinite safety.
- **Battery system.** Calls and the flashlight drain the phone. An all-night kiosk, a lost-and-found power bank, and an alley stash can keep her connected.
- **Six endings**, five final approaches, and a final survival phase after the last call at the porch.
- **A four-slot save system**: three manual slots plus autosave, with metadata, checksums, and corruption detection.
- **Main menu, origin-aware intro, difficulty selection, pause menu, settings, help, credits, game-over screen, and ending screen.**
- **Desktop and touch controls**: keyboard + mouse, or an on-screen joystick and action buttons.
- **PWA/offline support**: installable manifest, icons, service worker precache, and offline play after the first load.
- **Procedural audio**: synthesized drone, heartbeat, rain, street ambience, ringtones, impacts, and interface sounds. No audio files are bundled.

### The nine voices

Sophie, Mom, Dad, Daniel, Alex, Jessica, Mike, Priya, and the unknown number with no area code.

### The six endings

The game tracks who answered, who trusted Emma, which pieces of the road she found, and what she chose at the porch. Names are listed below; details are left for play.

1. The Porch Light
2. Everyone Is Safe
3. The Road Back
4. The Shape Under the Road
5. The Name Under the Name
6. The Quiet

---

## The quest

Emma is out too late. She has missed the last bus and decided to walk home instead of accepting a ride. The Mercer house is on the other side of the old quarter. The route should take thirty minutes. Tonight, the street has other plans.

The objective is to **get home before 6:00 AM**.

- The HUD shows the current district, whether Emma is standing under a streetlight, and the approximate blocks and compass bearing to home.
- The front door will not recognise her until she has gathered **four pieces of the road**: clues about the shift, the route, the old line, and what the street is doing tonight.
- If Emma reaches the porch early with enough pieces, the road “swallows the hours”: the clock jumps to 5:30 AM and the final choice begins. This keeps the return home central and avoids waiting around for an arbitrary timer.
- If she is still on the road at 6:00 AM, the road wins.

The six districts are:

1. **Clock-Out Corner** — the copy shop and the first empty blocks.
2. **Lantern Avenue** — the safest-looking street, though the lights are unreliable.
3. **Mercer Park** — a dark cut through trees, with fewer lamps and more footsteps.
4. **Night Bus Row** — the bus that never arrives, the payphone, and the route map.
5. **The Old Quarter** — narrower streets, older buildings, and the junction box.
6. **Home Lane** — the porch, the old line, and the last call.

Some routes are lit and longer; others are dark shortcuts. The park and the alleys are the fastest way home. They are also where the street has the most room to move.

### The choice of origin

On the first intro slide Emma can be:

- **coming home from a late shift** at the Night Owl Copy shop; or
- **coming home from a late dinner** with Daniel, after refusing a ride.

This changes the opening narration, delivers a different first message, and gives a small initial trust bonus to Priya or Daniel respectively. Both origins lead into the same road and the same endings.

---

## Technology

| Layer | Choice |
| --- | --- |
| Build tool | Vite 6 |
| Language | TypeScript 5.7 |
| World rendering | Phaser 3.90 |
| Interface | React 18 + TypeScript |
| State | Zustand 5 |
| Audio | Web Audio API synthesis |
| Saves | IndexedDB with a localStorage fallback |
| Offline/PWA | `vite-plugin-pwa` + Workbox |
| Tests | Vitest + Playwright Core smoke scripts |

All art is drawn procedurally with SVG, CSS, and Phaser graphics. Fonts are bundled from Fontsource. No external image, audio, or horror assets are downloaded at runtime.

---

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A modern browser with WebGL (Chrome or Chromium recommended)
- Optional for the smoke scripts: Google Chrome installed locally, or set `PLAYWRIGHT_CHROME_PATH`

The production game has no runtime server dependency. It is a static site.

---

## Install and run

All commands below should be run from this `phone-or-die/` directory.

### Install

```bash
npm install
```

### Development server

```bash
npm run dev
```

Open the printed URL. The dev server binds to your local network by default, so you can also open the LAN URL on a phone on the same network.

### Production build

```bash
npm run build
```

Output is written to `dist/`.

### Preview the production build

```bash
npm run preview
```

The preview server also binds to the local network. Service-worker installation and “Add to Home Screen” require a secure context: `localhost` or HTTPS. A plain `http://192.168.x.x` LAN address is not a secure context, so use a tunnel or an HTTPS host for a real phone PWA test.

### Tests

```bash
npm run typecheck
npm test
```

### Browser smoke tests (optional)

The smoke scripts use a locally installed Chrome through Playwright Core.

```bash
# In one terminal:
npm run dev -- --port 5199 --strictPort

# In another:
npm run smoke

# Production/offline test:
npm run build
npm run preview -- --port 5200 --strictPort

# In another terminal:
npm run offline:test
```

If Chrome is not at the default macOS path, set:

```bash
PLAYWRIGHT_CHROME_PATH="/path/to/chrome" npm run smoke
```

### Mobile access

1. Start `npm run dev -- --host` on your computer.
2. Connect your phone to the same Wi-Fi network.
3. Open `http://YOUR-COMPUTER-IP:5173/` (or the port shown by Vite).
4. For install/offline testing, deploy the `dist/` folder to static hosting with HTTPS, or use an HTTPS tunnel.

### Deploying

Deploy the generated `dist/` folder to any static host. The PWA assumes the game is served from the site root (`/`). If you deploy under a subpath, adjust Vite’s `base` and the manifest `start_url`/`scope`.

The build is a single-page app; configure the host to fall back to `index.html` for unknown routes (the service worker already handles this for cached navigation).

---

## Controls

### Desktop

| Input | Action |
| --- | --- |
| `WASD` / arrow keys | Walk |
| `E` or `Space` | Interact with a nearby object |
| `Tab` | Open/close the phone |
| `F` | Toggle flashlight (after finding it) |
| `Escape` | Close phone / close modal / pause |
| Click | Click glowing markers to interact |

### Touch

- Drag the on-screen joystick to walk.
- Use the four round buttons for Light, Phone, Use, and Pause.
- The phone is a full-screen interface with a close button and four tabs.

The game auto-detects coarse pointers/small screens and shows the mobile controls. Both input methods remain available on desktop.

---

## How to survive the road

The core loop is simple, but every resource is connected:

1. **Every step matters.** Walking adds fear. A lit sidewalk adds less; an open dark street adds more; the park and alleys add the most.
2. **Call to push them back.** A successful conversation lowers fear and grants a shield measured in steps. The shield is spent as Emma walks, so she must keep calling different people.
3. **Wean yourself off the line.** An active call helps, but silence, missed calls, a dead battery, and too many calls to the same person all make the road stronger. Standing still is only safe for a few seconds before the shadows notice.
4. **Manage the battery.** Calls cost battery, and the flashlight drains it slowly. The all-night kiosk has two charges, a power bank waits behind the laundromat window, and spare batteries are in an alley dumpster. A dead phone cannot call.
5. **Keep moving toward home.** The HUD shows the district, the approximate number of steps behind, the blocks to the porch, and a compass bearing. Do not let the warning “CALL SOMEONE” stay on screen.
6. **Find four pieces of the road.** Explore the shopfront, the bus stop, the payphone, the park, and the old quarter. Clues are written into your notes and displayed on the HUD.
7. **Reach the porch.** The house is north-east of Clock-Out Corner. The HUD gives the distance and bearing. The front door will recognise Emma once she has four pieces of the road.
8. **Make the last call.** At the porch, choose how to spend the final half hour, then survive until 6:00 AM. The ending depends on who answered, who trusted Emma, which clues she found, and what she chose.

### Useful details

- Repeated calls to the same person have diminishing returns; rotate through the people who will still answer.
- The shadow distance shrinks with every step. A successful call can buy roughly fifteen to forty steps depending on contact, trust, and fatigue.
- A missed call adds fear. On Nightmare, a missed call can be enough to finish the night early.
- Contacts are not always awake; their availability windows matter.
- Events can raise or lower fear. Read the consequences before choosing.
- The unknown number is never required for a basic survival run, but it is required for some endings.
- Pausing stops the simulation. Browsing the phone does not.
- If the phone battery reaches 0%, the flashlight turns off and calls become impossible.
- The street can swallow the hours. If the porch is reached early with enough pieces of the road, the clock jumps to 5:30 AM and the final choice begins.

---

## Saving and offline play

### Saves

- Autosave is written at the start of the night, at chapter changes, after calls and events, on final choices, and when the tab is hidden.
- Three manual slots are available in the pause menu: `Save Night` and `Load Night`.
- The menu’s `Continue` loads the most recent save across slots; `Load Night` lets you choose.
- Saves use schema version 3 and include a timestamp, metadata, a full game-state snapshot, and a checksum.
- Corrupt or incompatible saves are rejected with an error instead of being partially loaded. Saves from the earlier house-based version are intentionally incompatible.
- Primary storage is IndexedDB. If IndexedDB is unavailable, the game falls back to localStorage.
- Clearing browser data removes saves. There is no cloud sync.

The game does **not** request access to your real contacts, phone, camera, microphone, or notifications.

### PWA/offline

After the first successful production load, the service worker precaches the app shell, JavaScript, CSS, fonts, icons, and manifest. Reloading or launching the installed app offline serves the cached game. The smoke test verifies this by disabling the network, reloading, starting a new night, and confirming that the Phaser canvas and game screen still initialize.

---

## Project structure

```text
phone-or-die/
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig*.json
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── scripts/
│   ├── generate-icons.mjs
│   ├── icon.svg
│   ├── smoke.mjs
│   └── offline.mjs
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── audio/
│   │   └── AudioDirector.ts
│   ├── core/
│   │   ├── gameStore.ts
│   │   ├── rng.ts
│   │   └── types.ts
│   ├── data/
│   │   ├── calls.ts
│   │   ├── chapters.ts
│   │   ├── contacts.ts
│   │   ├── endings.ts
│   │   ├── events.ts
│   │   ├── final.ts
│   │   ├── messages.ts
│   │   └── road.ts
│   ├── game/
│   │   ├── BootScene.ts
│   │   ├── GameCanvas.tsx
│   │   ├── RoadScene.ts
│   │   └── bus.ts
│   ├── screens/
│   │   ├── EndingScreen.tsx
│   │   ├── GameOverScreen.tsx
│   │   ├── GameScreen.tsx
│   │   ├── IntroScreen.tsx
│   │   └── MenuScreen.tsx
│   ├── styles/
│   │   ├── index.css
│   │   ├── base.css
│   │   ├── portrait.css
│   │   ├── menu.css
│   │   ├── intro.css
│   │   ├── game.css
│   │   ├── phone.css
│   │   ├── events.css
│   │   └── ending.css
│   ├── systems/
│   │   ├── calls.ts
│   │   ├── clock.ts
│   │   ├── save.ts
│   │   └── threat.ts
│   ├── ui/
│   │   ├── EventModal.tsx
│   │   ├── FinalChoiceModal.tsx
│   │   ├── GameGuide.tsx
│   │   ├── GameModals.tsx
│   │   ├── HUD.tsx
│   │   ├── ModalShell.tsx
│   │   ├── PhoneUI.tsx
│   │   ├── Portrait.tsx
│   │   ├── SaveList.tsx
│   │   ├── SettingsForm.tsx
│   │   └── Toasts.tsx
│   └── utils.ts
└── tests/
    ├── setup.ts
    ├── support.ts
    ├── data.test.ts
    ├── endings.test.ts
    ├── save.test.ts
    ├── store.test.ts
    ├── survival.test.ts
    └── systems.test.ts
```

---

## Testing performed

These are the checks actually run for this delivery.

### TypeScript and unit/data tests

```text
npm run typecheck   → passed
npm test            → 6 test files, 63 tests passed
```

Coverage includes:

- Contact, call, event, message, ending, and final-choice data integrity.
- Every call-node reference, reachable branch, and terminal node.
- Every road interactable placed next to a walkable tile; every district and the home porch reachable from the starting shop.
- A BFS route from the copy shop to the porch using only legal movement tiles.
- Threat stages, fear per step, streetlight relief, dark-terrain penalty, idle escalation, step shields, difficulty scaling, barricades, and capture.
- A complete legal walk from the copy shop to the porch using the BFS route while calling when the shadows close in.
- Clock formatting and chapter boundaries.
- Call availability, answer chances, and diminishing protection.
- All six ending-resolution paths.
- Store flows: origin selection, movement, flashlight pickup, full branching calls with every contact, missed calls, hang-up protection, every event choice, final choices, capture, dawn resolution, save/load, and all five final choices.
- Home-door gating: four-piece requirement, early-arrival time skip, and failed dawn when the porch is not reached.
- IndexedDB/localStorage fallback save/load, checksum rejection, version rejection.
- A full automated survival loop from 10:00 PM to 6:00 AM using calls, battery pickups, events, and the final choice. Result: reached dawn with the `the_truth` ending, 42 calls answered, 30 clues, 42% battery, and 0 threat.
- A full route walk with the new step pressure: reached the porch with 2 calls, 91% battery, 3.4 threat, and 5 shield steps remaining.

### Production build

```text
npm run build → passed
PWA precache: 23 entries (about 2.2 MB)
```

### Browser smoke test

Run with Chrome headless through Playwright Core at 1440×900 and 390×844, with zero console errors or page errors:

- Menu, difficulty selection, origin selection, and intro.
- Road scene, Phaser canvas creation, movement, flashlight pickup, pause/resume.
- Phone home, contacts, contact detail, messages, and history.
- Starting a call, forcing the answer, walking a branching conversation, and completing it.
- Random event modal and resolution.
- Step-pressure check: walking raises fear and triggers the `CALL SOMEONE` warning; high-threat stalker/tendril visuals screenshotted.
- Reaching the porch, early-arrival time skip to 5:30 AM, final-choice modal, and final phase.
- Saving to `slot1` through real browser IndexedDB, mutating state, loading the save, and verifying restoration.
- Ending screen and game-over screen.
- Mobile viewport: full-screen phone, call screen, joystick movement (verified 3 tiles), and mobile final-choice layout.
- Toasts, overlays, responsive HUD, and the road/porch visuals checked in screenshots.

### Offline/PWA test

- Manifest HTTP 200 and all three icons HTTP 200.
- Service worker registered and controlling the page.
- Workbox precache present with the app shell and game assets.
- Network set offline, page reloaded, menu loaded, new night started, and the game canvas initialized from cache.
- Zero console errors during the offline run.

### What was not tested

To be accurate rather than optimistic:

- **Audio was verified only for runtime correctness**, not subjective mix quality or loudness on real speakers/headphones. The procedural score is intentionally sparse and may sound different on different devices.
- **Only Chromium/Chrome was used** for browser automation (Chrome on macOS). Safari, Firefox, and real iOS/Android hardware were not tested.
- **The service worker and install prompt** were tested on `localhost` only. A real HTTPS deployment or home-screen installation was not tested.
- **Physical touch hardware** was not used; mobile was tested with an emulated 390×844 viewport and mouse-generated pointer events.
- **Long-session soak testing** (multiple hours, many tabs, repeated saves) was not performed.
- **Screen-reader and full keyboard-only accessibility audits** were not performed. A basic accessibility pass was implemented (labels, focusable controls, text-size/contrast/reduced-motion settings).
- **Balance has not been tuned through human playtesting.** An automated survival run completes, but a human may find the pacing, clue hunt, or battery economy harder or easier.
- **The dawn survival run still places the player at the porch for the final encounter.** A separate automated route walk now crosses the map under step pressure and calls for help, but no human-paced full walkthrough was recorded.
- **No real phone, contacts, camera, microphone, or notification permissions** were accessed or tested; the game is intentionally self-contained.

---

## Known limitations

- The project is tuned for Chromium/WebGL. Phaser may fall back to Canvas on other browsers, but that path is not verified.
- Audio begins after the first user gesture, as required by browser autoplay policies. The menu is otherwise silent.
- All saves live in the browser profile. Private browsing, storage eviction, or clearing site data can remove them.
- Saves are local-only; there is no account, cloud sync, or cross-device transfer.
- The PWA is configured for deployment at a site root. Subpath deployments need configuration changes.
- The game has no localization beyond English.
- Some visual set dressing is procedural and intentionally abstract; character portraits are stylized SVG rather than hand-painted art.
- The unknown caller’s two conversations are finite; after both are completed, the unknown contact has no further scripted call. Other contacts remain callable through their repeat conversations.
- The road's time-skip is a deliberate horror device, not a real-time simulation. Reaching the porch early with four pieces jumps the clock to 5:30 AM.
- Step pressure and call-shield balance were tuned through automated simulations, not human playtests. Individual contacts may feel easier or harder than intended.
- Playwright smoke scripts are development tools. They expect a running dev/preview server and a local Chrome installation; they are not required to play.

---

## Credits and licenses

**PHONE OR DIE** is an original production. Story, characters, dialogue, interface, procedural art, and synthesized audio were created for this project.

Third-party software and fonts:

- Phaser — MIT License
- React / React DOM — MIT License
- Zustand — MIT License
- Vite, Vitest, vite-plugin-pwa, Workbox — MIT License
- Cormorant Garamond, IBM Plex Mono, Inter — SIL Open Font License, via Fontsource
- Sharp — Apache-2.0 (used only to generate PWA icons)

No copyrighted horror assets, real contact data, or third-party audio recordings are included.

---

> “A voice on the line is a kind of light.”
