# BORGO SAN DONNINO — La Passeggiata

An open-world walk through **Fidenza** at golden hour, built with the same low-poly visual language as the original BORGO. You arrive in Piazza Duomo, meet seven townsfolk, run six errands, collect twelve mosaic tiles and help the town prepare its evening walk — on foot, by bicycle, by car, over the rooftops in free flight, or beside the scheduled train at the station. Ring the bell, then light the **Festa di San Donnino**: lanterns, market stalls, a band, a procession and four postcards to keep.

The walk now reaches the northern agricultural and railway district, **Le Azalee**, the southern sports district, the western district of **Luce** and the **Parco dello Stirone**: **Monica, San Lazzaro, Gran Madre, Museo Musini, Parco Vittorio Veneto, Parco della Pace, Corea, Luce, San Paolo, Sant’Antonio, Parco dello Stirone, Bosco dei Pioppi, Le Azalee, Centro Commerciale Fidenza, Parco delle Azalee, Skatepark Fidenza, Aermacchi MB-326, Centro Sportivo Cigala, Stadio Ballotta, Centro Sportivo Ballotta, PalaPratizzoli, Piscina coperta, Piazza La Pira, Giardino di Charlie, Istituto Agrario “S.Solari”, Scalo di Fidenza and Parco Nord**. Nineteen **Timbri del Pellegrino** reward the new districts, while the historic centre, the twelve mosaic memories and the seven main characters stay intact.

The city layout, street names and public landmarks are derived from **OpenStreetMap** data (© OpenStreetMap contributors, **ODbL 1.0**). Characters, dialogue, descriptions, code, textures and all 3D geometry are original.

## Play

- Live: `../borgo-pwa/` (deployed by the repository's Pages workflow)
- Local: `npm install && npm run dev`

## The walk

- Start in **Piazza Duomo**, facing the cathedral.
- Meet **Ada, Elio, Marta, Beppe, Lidia, Sara** and **Nino**.
- Complete six errands across the centre, from the Teatro Magnani to the station.
- Three core errands unlock the **dusk bell** in the campanile beside the Duomo.
- Find **12 mosaic tiles** and discover **35 places**: the eight historic landmarks plus Monica, San Lazzaro, Gran Madre, Museo Musini, Parco Vittorio Veneto, Parco della Pace, Corea, Luce, San Paolo, Sant’Antonio, Parco dello Stirone, Bosco dei Pioppi, Le Azalee, Centro Commerciale Fidenza, Parco delle Azalee, Skatepark Fidenza, Aermacchi MB-326, Centro Sportivo Cigala, Stadio Ballotta, Centro Sportivo Ballotta, PalaPratizzoli, Piscina coperta, Piazza La Pira, Giardino di Charlie, Istituto Agrario “S.Solari”, Scalo di Fidenza and Parco Nord.
- Earn **19 Timbri del Pellegrino** by exploring the new districts; the two southern parks share one stamp.
- Hospitality points raise your rank from *Forestiero* to *Cittadino onorario*.
- After the dusk bell, a golden lantern in Piazza Duomo opens the **Festa di San Donnino**: 5 lanterns, 3 musicians, Marta’s olive garland and a traveller from the station. Three activities are enough to start the procession, the band and the lantern release.
- The feast leaves the square decorated and adds **four postcards** to the journal; it never touches the twelve mosaic tiles.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Walk | `WASD` / arrows | left joystick |
| Run | hold `Shift` | `CORRI` toggle |
| Jump | `Space` | — |
| Interact / advance / get on / get off / land | `E` or `Enter` | `OK` button |
| Drive or cycle | `W` `S` accelerate/reverse, `A` `D` steer, `Space` brake | joystick + `FRENO` |
| Horn / bicycle bell | `H` | — |
| Reset a stuck vehicle | `R` | `RIPARA` |
| Free flight | `F` to take off or land; `Space` climb, `Shift` descend, `WASD` steer | `VOLO`, then `SU` / `GIÙ` and joystick |
| Map | `M` | map button |
| Journal | `J` | journal button |
| Pause | `Esc` | pause button |
| Look around | drag / scroll | drag the scene |

Cars, bicycles and the jetpack are always available. Vehicles are parked around the centre and their position is saved. The train is an ambient service on the real Fidenza siding: it dwells at the platform, departs, returns on a deterministic timetable, and shows the next departure on a 3D board and the HUD when you are near the station. Flight ignores building collisions above the rooftops but never allows landing inside geometry.

## Tech

- Vite 7 + TypeScript (strict) + Three.js 0.180.
- **2,840 × 2,000 m** playable area, about 2,801 buildings, 1,375 street runs, the Stirone waterways and the eastern, southern and northern districts extracted from the OSM snapshot.
- Polygon collision with an 8 m spatial hash, plus the original box/circle colliders for props.
- City buildings split into 240 m chunks for frustum culling; a larger ground plane, extended fog, camera range and an adaptive shadow map that follows the player across the new districts.
- City geometry: extruded footprints, hip/flat roofs, street-facing windows and doors, landmark models, real street ribbons, piazza paving, trees and furniture.
- Full map with two zoom levels, waterways, vehicle markers and collision-aware labels.
- Procedural canvas textures and WebAudio synthesis — no downloaded game assets.
- **Festa di San Donnino**: a one-time evening event in Piazza Duomo with merged stalls, a bandstand, string lights, a moving procession, fireworks and ambient crowd.
- **Peripheral Fidenza**: OSM east, south, west and north districts, twenty-seven new places, nineteen pilgrim stamps, Le Azalee with its piazza, park, shopping centre, skatepark and MB-326 monument, the Cigala sports centre, the southern Stadio Ballotta, PalaPratizzoli, indoor pool, Piazza La Pira and Giardino di Charlie, and the northern Istituto Agrario, Scalo di Fidenza and Parco Nord, park gates, a bus shelter, the Luce artwork, the churches of San Paolo and Sant’Antonio, the Stirone river park, hedgerows and poplar rows as natural map edges.
- **12 cars and 12 bicycles** with arcade physics, dynamic parked-vehicle colliders and saved positions.
- **Free jetpack flight** with altitude HUD, map bounds, rooftop-safe landing checks and a custom low-poly pack.
- **Animated regional train** with a 76-second dwell/depart/arrive cycle, platform, shelter, waiting passengers, synthesized whistle and a canvas departure board.
- Versioned `localStorage` save (`borgo.save.v4`) with migration from `borgo.save.v3`, `borgo.save.v2` and `borgo.save.v1`; quest progress, vehicles, postcards and feast progress survive, while an in-progress drive or flight restarts safely on the ground.
- Installable PWA with an offline service worker.
- Bilingual UI and dialogue (Italian default, English toggle).

## Map data

`src/data/fidenza.json` is generated by:

```sh
node scripts/build-fidenza.mjs
```

The script reads the tracked OSM-derived snapshot `fidenza-city-v3/data/city.json` and `fidenza-city-v3/maps/fidenza/map.json`, clips the playable centre, simplifies footprints and writes a compact 2,801-building database with roads, areas, trees, furniture and waterways. It does not use the network and never runs in the browser.

- **Source:** [OpenStreetMap](https://www.openstreetmap.org/) via Overpass, snapshot from `fidenza-city-v3/data/city.json`.
- **License:** [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — the derived database remains subject to ODbL.
- **Attribution:** “© OpenStreetMap contributors” is shown in the title screen, map, pause menu and README.
- **Data changes:** the derived database is `src/data/fidenza.json`; the source snapshot and its full attribution are in `fidenza-city-v3/data/ATTRIBUTION.md`.
- Public street and landmark names come from OSM; businesses and characters are fictional.

## Structure

```
scripts/build-fidenza.mjs   OSM snapshot → compact game data
src/
  app/app.ts                scene, loop, state machine, interactions
  data/fidenza.json         derived city database with waterways (ODbL)
  data/stamps.ts            nineteen pilgrim stamps mapped to discoveries
  data/town.ts              NPCs, quests, collectibles, zones
  data/dialogue.ts          original bilingual conversations
  game/                     pure quest state, sanitising, persistence
  player/                   movement, polygon collision, camera, input
  world/city.ts             buildings, roads, waterways, piazzas, landmarks, signs
  world/                    sky, lighting, props, NPCs, waypoint
  ui/                       HUD, city map, journal, dialogue, touch controls
tests/                      collision, reachability, quests, saves, strings, data
```

## Commands

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

The layout tests perform a breadth-first walk over the real collision grid, from Piazza Duomo to every character, collectible, delivery point and landmark, and check that every parked vehicle sits on free ground. The expanded map is checked as one 2,840 × 2,000 m walkable rectangle, including the eastern, southern and northern districts. The physics tests cover acceleration, braking, steering, walls, map bounds, jetpack ceiling and the deterministic train cycle. The feast tests cover unlock, lanterns, musicians, garland, guest, the closed procession loop and the festival colliders. The stamp tests cover all nineteen districts, the two-park requirement, the Le Azalee, southern and northern groups and the Stirone bridge crossing.

## PWA

`public/manifest.webmanifest` and `public/sw.js` are copied into `dist/` by Vite. The service worker precaches the shell and caches hashed assets on first use; the page reports its used resources to the worker so even the first session is available offline.

## Deployment

The GitHub Pages workflow builds this folder and publishes `dist/` at `/borgo-pwa/`. The source folder is excluded from the repository-wide `rsync` so `node_modules` and the Vite source are never served.
