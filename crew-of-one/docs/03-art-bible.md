# 03 — Art Bible

## Direction

**Blueprint pixel noir.** A heist story told on graph paper, lit by flashlights and brass.

## Specs

- Base resolution: **360 × 640** portrait.
- Tile size: **32 × 32**.
- Room: **10 × 16 tiles** (320 × 512), one screen.
- Character sprite: **32 × 48**, feet collision footprint ~24 × 24.
- Props: 32 × 32; doors 32 × 64; vault door 64 × 64; gem 16 × 16; plates 32 × 32; levers 16 × 32.
- Palette: **24 colors** (see below).
- Font: OFL pixel font for HUD; DOM text for menus. Self-host WOFF2.

## Palette

| Role | Hex |
|---|---|
| Ink / background | `#0B132B` |
| Deep blue | `#1C2541` |
| Slate | `#3A506B` |
| Bone | `#F4F1DE` |
| Paper | `#E0DCC7` |
| Brass / gold | `#E9C46A` |
| Dark brass | `#B08A3E` |
| Alarm red | `#E63946` |
| Dark red | `#8C1C26` |
| Ghost cyan | `#5BC0EB` |
| Pale cyan | `#A8E0F0` |
| Guard yellow | `#F6C85F` |
| Wood | `#6B4F3A` |
| Shadow | `#050912` |

Fill the remaining slots with tints and two skin tones. Use 1px dithering for shadows and vision cones.

## Room language

- Floor: subtle grid, 1px lines, small imperfections.
- Walls: thick ink blocks with a 1px brass or bone highlight on the top edge.
- Furniture: desks, statues, plants, crates, vents, rope, rugs.
- Security: brass plates, camera housings, laser emitters, vault gears.
- Exit: a lit doorway with a gold frame.

## Characters

- **Thief:** trench coat, flat cap, glowing ChronoSafe watch. Simple silhouette; readable at 1×.
- **Guard:** cap, flashlight, broad shoulders. Vision cone is part of the silhouette.
- **Ghost:** same frames as the thief, cyan palette swap, alpha, scanlines, afterimage trail, symbol badge (circle/triangle/square/diamond/star/cross).

## Animation

- Walk: 4 frames at 8 fps, 4 directions.
- Idle: 2 frames at 2 fps.
- Interact: 3 frames, non-looping.
- Dash: 2 frames + squash.
- Caught: 2 frames.
- Guard: walk 4, look 2, investigate 2, alert 2.
- Doors/plates/levers: 2–3 frames.
- FX: dust 2×2/4×4 pixels, gem sparkle, scanlines, paper grain.

## UI

- Tape-reel rewind button, REC dot, timer as a tape counter.
- Stencil labels, rank stamps, blueprint vault map.
- 9-slice panels; 1px borders; no smooth gradients.
- HUD: timer, echo slots, objective, pause. Bottom: joystick zone, rewind.
- Store: in-game, same visual language; no misleading badges or fake timers.

## Scaling

- Integer camera zoom (2×/3×/4×) based on device.
- Letterbox with a patterned midnight background.
- DOM overlay for menus/results/store; safe-area insets.
- Phaser: `pixelArt: true`, `antialias: false`, `roundPixels: true`, 1px atlas padding, `NEAREST`.

## AI policy

AI may produce moodboards, palette studies, UI mockups, and marketing drafts. Final sprites, tiles, animations, logo, key art, and store screenshots are human-made or commissioned. Record every asset’s source, license, and human edits in `art/ASSET_LEDGER.md`.

## Asset list

- Tiles: floor variants, wall variants, door frame, rug, vent, stairs.
- Props: desk, chair, statue, plant, crate, rope, camera, laser emitter, plate, lever, vault door, exit.
- Characters: thief, guard.
- Items: gem, keycard, watch, noise ripple.
- UI: buttons, panels, icons, echo symbols, rank stamps, tape reels.
- FX: dust, sparkle, scanlines, rewind lines, alarm flash.
- Marketing: icon, key art, OG image, store screenshots.

## Quality bar

At phone size, a screenshot should communicate: thief, guard, vision cone, plate, door, ghost, gem. If it doesn’t, simplify.
