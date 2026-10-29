# Plane Arcade

> A one-thumb, portrait-mode neon shoot-'em-up. Drag to fly, auto-fire upward,
> collect power-ups, and survive escalating waves and bosses.

Built with the same procedural visual language as the repo's
[`plane-pwa`](../plane-pwa/): a 400×600 playfield, 20px grid, four neon palettes,
gradient triangle plane, glowing circular bullets and enemies, particle bursts,
and the same neon panel UI. No bitmap art, no external fonts.

**Play**

```bash
python3 -m http.server 8080
# open http://localhost:8080/plane-arcade-pwa/
```

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Fly | Drag anywhere on the playfield | Arrows / WASD |
| Fire | Automatic | Automatic |
| Bomb | Bomb button | `Space` |
| Pause / resume | Pause button | `P` / `Esc` |
| Mute | Speaker button | `M` |

Movement is relative to the drag anchor, so your thumb does not cover the
plane. The plane is confined to the lower part of the playfield.

## Systems

| System | Rule |
|---|---|
| Lives | 3. A hit costs one life, grants 1.8s invulnerability, and clears nearby bullets. Shield absorbs one hit. |
| Bombs | 2 charges. Clears all enemy bullets, deals 8 damage to every enemy, and grants brief invulnerability. |
| Combo | Kills within 2.5s build a chain. Multiplier caps at x5 and resets on a hit or an enemy escaping. |
| Waves | About 20s each. First boss on wave 5, then every 5 waves. Max 12 active enemies. |
| Enemies | Drifter (straight), Weaver (sine), Diver (tracks you), Gunner (stops and shoots aimed bullets), Boss. |
| Power-ups | 12% drop chance: Spread, Rapid (10s), Shield (one hit), Bomb (+1 charge, max 3). |
| Score | Base value × combo, plus 50 × wave on wave clear. High score and best wave persist. |
| Difficulty | Speed +6% per wave, extra HP at waves 8/12/16, faster firing later; capped. |

**Enemy values:** Drifter 10 · Weaver 20 · Diver 30 · Gunner 40 · Boss 500.

## Saving

`localStorage["plane-arcade-pwa"]` stores `{highScore, bestWave, theme, muted,
tutorialSeen, installDismissed}`. Runs are also recorded through
`R2.stats.run({slug:"plane-arcade-pwa/", ...})` when the shared arcade helper is
available.

## Development notes

- Vanilla JS, Canvas 2D, no build step.
- Design space is 400×600; the canvas is scaled to fit the stage, backing store
  uses up to 2× DPR.
- Fixed 60Hz simulation with a clamped frame delta; rendering runs on
  `requestAnimationFrame`.
- Entity caps: 12 enemies, 24 player bullets, 60 enemy bullets, 220 particles.
- `?debug=1` shows FPS/entity counts and enables `G` (god mode), `N` (skip wave)
  and `B` (add bomb).

## Files

```
index.html          app shell, HUD, canvas, overlays
styles.css          neon chrome, safe areas, portrait layout
game.js             simulation, renderer, input, PWA hooks
manifest.json       installable PWA metadata
service-worker.js   offline cache
icons/              plane icons reused from plane-pwa
```

## Credits

Visual language adapted from `plane-pwa` in this repository (MIT). Game code
and design for Plane Arcade are released under the repository's MIT licence.
