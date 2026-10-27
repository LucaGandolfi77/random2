# 19 — Prototype Notes

## What exists now

- Pure TypeScript sim with fixed timestep, circle/AABB movement, plates, doors, ghosts, rewind, undo, reset.
- Guard AI: patrol paths, vision cones with line-of-sight, suspicion, alarms, noise investigation, echo following, and confused pauses.
- Whistle/noise events recorded into echo tapes and replayed by ghosts.
- Headless replay validator (`replayTracks`) used by tests and the Worker. It now simulates guards, cameras, levers, doors, plates, lasers, gems, walls, and the exit.
- Solution-tape pipeline: `vault-01` through `vault-10` ship with verified tapes, checked by CI and `pnpm validate:vaults`.
- Vault content: “The Gallery” (plate/door), “The Night Watch” (guard/echo decoy), “Two Hands” (two plates, two echoes), “The Whistle” (echo whistles to pull a guard off his post), “The Archive” (camera + hold lever), “Red Lines” (dash through timed lasers), “The Long Way” (one-way gate), “The Handoff” (gem carry with two plate echoes), “Double Watch” (two guards, two baits), and “The Vault Door” (two plates + camera lever finale).
- Phaser rectangle prototype: drag to move, E/ACT, Shift or Space/DASH, R/REWIND, U/UNDO, P/PREVIEW, Backspace/RESET, 1–0 for the vaults.
- Meta shell: level select with chapter cards, sequential unlock, localStorage best time/rank, results screen, hint toast after failed loops, and an in-HUD echo timeline.
- Daily heist: a deterministic UTC plan drawn from the vault list, four safe modifiers (Blackout, Short Fuse, No Sprint, Solo Loop), a daily card in the menu, and a saved best per date. A content test replays every modifier/vault pair against an existing solution tape so the daily is always solvable. The web client tries `GET /api/daily` first and falls back to the local plan offline; daily wins are posted to `POST /api/run`, and the results screen shows the verified server rank or a local-only note.
- Rank rule: S at par echoes, A at par + 1, B at par + 2, C beyond. Best run is the fastest time, then the fewest echoes.
- Echo timeline: each recorded echo is a colored segment proportional to its tape length, with a moving playhead for the current run.
- Ghost preview: P or the ▶ CREW button replays the recorded echoes at 2× without the player. The run state is snapshotted and restored exactly when preview stops.
- Leaderboard: the daily card opens today's top 100, highlights the local player, supports a saved nickname, and falls back to an offline message when the Worker is unavailable.
- Placeholder feedback: WebAudio synth sketches for rewind, undo, plates, doors, levers, gems, dash, alarms, wins, and preview, plus haptics on rewind, plates, gems, alarms, and wins. The sound toggle persists; haptics respect `prefers-reduced-motion`. These are sketches, not the final commissioned audio.
- PWA manifest/service worker via `vite-plugin-pwa`.
- Cloudflare Worker: daily config from the shared plan, modifier-aware run replay, leaderboard, player nickname, unlock, Lemon Squeezy webhook. The web client submits daily runs and shows the verified rank.
- D1 schema.
- Generated PWA icons (192/512/maskable) and Apple touch icon.

## What the prototype proves

A player can walk to a plate, rewind, and let the echo hold the door while they escape. The ghost tape length matters: if you rewind too early, the echo disappears before you reach the exit. That is the first real design lesson.

The guard sandbox and “The Night Watch” prove the second: a guard who sees an echo follows it, ignores the player while distracted, and pauses with a confused “?” when the echo vanishes. Noise can pull a guard off a patrol route.

“Two Hands” proves the third: a door can require multiple plates, so the player has to build a crew of echoes before the final run.

“The Whistle” proves the fourth: a ghost's recorded whistle can pull a guard off his post, letting the player take a route that would otherwise be watched.

“The Archive” proves the fifth: a sweeping camera watches the corridor, and a hold lever disables it. The player has to leave an echo on the lever; the camera, levers, and closed doors are now included in headless replay validation.

“Red Lines” proves the sixth: timed lasers demand a dash, while an echo holds the plate that keeps the vault door open. Lasers and dash are included in replay validation.

“The Long Way” proves the seventh: a one-way gate lets an echo into an alcove to hold a plate, while the player takes the long route. One-way doors are enforced in movement and replay.

“The Handoff” proves the eighth: two echoes hold two plates, and the player carries the gem through both doors to the exit. Gem pickup/drop and gem-aware replay validation are in.

“Double Watch” proves the ninth: two guards watch the same corridor from different posts. Two echoes pull them away, then the player follows the gap. The recording shows that an echo tape is also a distraction timer.

“The Vault Door” proves the tenth: two plates open a vault door while a third echo holds the camera lever. It is the first three-job finale and the end of chapter 2.

## Next implementation tasks

1. Replace rectangle rendering with the pixel-art kit for one vault (vertical slice).
2. Commission the final SFX/music pass and replace the synth sketches.
3. Add the in-game store + entitlement flow.
4. Add PWA install prompt, offline test, and share card.
