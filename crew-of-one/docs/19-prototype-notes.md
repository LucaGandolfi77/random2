# 19 — Prototype Notes

## What exists now

- Pure TypeScript sim with fixed timestep, circle/AABB movement, plates, doors, ghosts, rewind, undo, reset.
- Guard AI: patrol paths, vision cones with line-of-sight, suspicion, alarms, noise investigation, echo following, and confused pauses.
- Whistle/noise events recorded into echo tapes and replayed by ghosts.
- Headless replay validator (`replayTracks`) used by tests and the Worker.
- Solution-tape pipeline: `vault-01` through `vault-08` ship with verified tapes, checked by CI and `pnpm validate:vaults`.
- Vault content: “The Gallery” (plate/door), “The Night Watch” (guard/echo decoy), “Two Hands” (two plates, two echoes), “The Whistle” (echo whistles to pull a guard off his post), “The Archive” (camera + hold lever), “Red Lines” (dash through timed lasers), “The Long Way” (one-way gate), and “The Handoff” (gem carry with two plate echoes).
- Phaser rectangle prototype: drag to move, E/WHISTLE, R/REWIND, U/UNDO, Backspace/RESET, 1–8 for the vaults.
- PWA manifest/service worker via `vite-plugin-pwa`.
- Cloudflare Worker scaffold: daily, run submission, leaderboard, player nickname, unlock, Lemon Squeezy webhook.
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

## Next implementation tasks

1. Add a real echo timeline and a “ghost preview” playback.
2. Add dash and laser mechanics.
3. Author vault 9 (“Double Watch”) with two guards.
4. Author vault 10 (“The Vault Door”) as a chapter finale.
5. Add the echo timeline / ghost preview.
6. Replace rectangle rendering with the pixel-art kit once the fun gate passes.
7. Wire the web app to the Worker for daily/leaderboard.
8. Add the in-game store + entitlement flow.
9. Add PWA install prompt, offline test, and share card.
