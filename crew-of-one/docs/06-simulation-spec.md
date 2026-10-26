# 06 — Simulation Specification

## Goals

- Deterministic.
- Testable without a browser.
- Shared by the game and the leaderboard validator.
- Small enough to run in a Cloudflare Worker.

## Fixed step

- `DT = 1/60`.
- `sim.tick(input)` advances exactly one step.
- The view calls tick in a loop based on accumulated real time.
- No wall-clock time inside the sim.
- No `Math.random` at runtime. Use a seeded RNG for authored variation only.

## Entities

- **Player:** position, radius, facing, state, dash cooldown, carryingGem.
- **Ghost:** track id, symbol, color, current frame, position, state, active.
- **Guard:** position, patrol path, waypoint index, wait timer, facing, suspicion, state (`patrol`, `investigate`, `follow`, `alert`).
- **Plate:** position, radius, pressedBy, mode (`hold` or `latch`).
- **Door:** rect, open state, openedBy, mode.
- **Lever:** position, on, toggledBy.
- **Camera:** position, sweep arc, vision cone.
- **Laser:** segment, on/off cycle, source lever.
- **Gem:** position, holder (`world`, `player`, ghost id).
- **Exit:** rect.

## Tick order

1. Apply player input; move; collide.
2. Advance ghost playback; apply ghost events.
3. Resolve plates, doors, levers, cameras, lasers, gem.
4. Update guards: patrol, vision, suspicion, noise.
5. Check alarm, win, timer.
6. Record player frame at 30 Hz.
7. Increment tick.

Stable order by entity id for deterministic events.

## Recording

```ts
type GhostFrame = {
  t: number;              // ms from loop start
  x: number;
  y: number;
  dir: 0 | 1 | 2 | 3;
  anim: 'idle' | 'walk' | 'dash' | 'interact';
  events?: GhostEvent[];
};

type GhostEvent =
  | { type: 'interact'; targetId: string }
  | { type: 'noise'; radius: number }
  | { type: 'grab'; targetId: string }
  | { type: 'drop'; targetId: string };

type GhostTrack = {
  id: string;
  symbol: 'circle' | 'triangle' | 'square' | 'diamond' | 'star' | 'cross';
  color: number;
  frames: GhostFrame[];
  durationMs: number;
};
```

- Record at 30 Hz; interpolate positions for rendering.
- The final successful loop records the player as a track for submission.
- Rewind truncates the current take at the rewind tick and appends it as a ghost.
- Undo removes the last track and restarts the loop.

## Ghost rules

- Ghosts are scripted performers. No physics.
- They do not collide with the player.
- They interact via events at recorded times.
- They can press plates, hold doors, pull levers, whistle, and carry the gem.
- They are seen by guards; guards investigate/follow them.
- They never trigger the alarm.
- If a tape ends, the ghost fades and releases anything it held.
- Gem grab: first available actor wins. If the gem is already held, the action mimes and fails.

## Guard AI

- Patrol: move along waypoints; pause; face movement direction.
- Vision: cone angle + range + raycast against walls.
- Player seen: suspicion increases; decays when line-of-sight breaks.
- Full suspicion: alarm; loop ends.
- Ghost seen: state `follow`; move toward the ghost; if reached, pause with “?”, then return.
- Noise: pick the loudest event within hearing radius; investigate its position.
- Deterministic tie-breaks by distance, then entity id.

## Win / lose

- Win: player reaches exit with the gem.
- Lose: alarm fills. The loop ends; rewind is offered.
- Timer: auto-rewind at loop length.
- Echo cap: cannot rewind beyond `maxEchoes`.
- Soft-lock prevention: ghosts never block; reset and undo are always available.

## Snapshots

- On loop start, restore the initial snapshot: doors, plates, levers, gem, guards, alarm, timer.
- Ghost tracks persist across loops.
- The player starts at `playerStart`.
- The world is identical each loop except for ghost behavior and player input.

## Validation

The server must verify:

- Track count ≤ `maxEchoes + 1`.
- Each track ≤ loop length.
- Per-frame displacement ≤ max speed.
- Positions never inside walls.
- Interactions within range and line-of-sight.
- Events at valid times.
- The replay wins within the loop.
- Echo/time/alarm metadata matches the replay.
- Tape hash is unique.

## Debug tools

- Timeline scrubber.
- Ghost path overlay.
- Guard vision cones with raycast lines.
- Infinite timer toggle.
- Record solution button.
- State export/import.
- Headless replay CLI.
