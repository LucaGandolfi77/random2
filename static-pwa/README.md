# STATIC

> A pirate TV signal running along a network of dead cables. Movement is not
> free — you are a point sliding along a wire, and at each junction you take
> the cable most aligned with where you want to go. Eat packets, seize TVs,
> outrun the censors. **A VHS copy of an .io.**

*Segnale pirata.* No build step, no dependencies. No art assets — the CRT
wobble, the chromatic ghosting and the noise tiles are all procedural.

**Play it:** <https://lucagandolfi77.github.io/random2/static-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/static-pwa/
```

---

## The one rule

**You are constrained to the graph.**

`player` is a `t ∈ [0,1]` sliding along an edge, and at every node
`playerChoose()` picks the neighbour with the highest dot product against your
`want` vector, ignoring any with `dot ≤ −0.55`. There is no flight, no dodge —
there is *choosing the right junction* and committing to the time it takes to
get there. That constraint is the whole feel of the game.

The lattice is 7×10, each link dropped with 13% probability, then isolated
nodes force-relinked so the network stays connected. It is regenerated on every
reload.

## The systems

| | Rule, as implemented |
|---|---|
| **Seizing a TV** | within 30px, `prog += dt/1.2`; at 1 → +100 score and +1 signal (max 3). Leaving decays progress ×0.8/s |
| **Censors** | 3, `speed = min(210, 95 + time·1.8)`, idle 0.5–1.5s then hunt. On a hit: signal −, 2s invulnerability, glitch flash, and the censor is teleported to the node **farthest** from you |
| **Signal** | `STRENGTH_MAX 3`. At 0 → `endGame()` |
| **Packets** | 26 alive at all times, +10 each, instantly respawning on a random edge. Bots eat them too |
| **Bots** | *Pirate-7* and *ANALOG* greedily steer toward unseized TVs within 500px and nearby packets, at speed 135 |
| **Leaderboard** | top 5 by score, with remote rows from other tabs |

## The VHS chain

An offscreen canvas holds the frame, then a post-pass applies a 9-slice wobble
shift, chromatic ghosting (`drawImage(fx, ±2.2)` in `"lighter"`), a scanline
pattern, 140×140 noise tiles at alpha `0.05 + burst·1.6`, a tracking band and a
vignette. On a hit `burst` spikes, so the whole picture physically glitches —
the aesthetic and the feedback are the same signal.

## The "cross-tab" feature

`📡 Attiva ON AIR` runs `setupBroadcast()` → `Notification.requestPermission()`
— and **whether or not it is granted** it calls `enableBroadcast()`, which sets
`onair`, unhides the 🔴 badge, opens `new BroadcastChannel("static-io")` and
starts an interval posting `{type:"score", name, score}` every 2s (plus on each
capture and each hit).

Inbound messages land in `remoteScores[name]`, are pruned after 10s, and merge
into the HUD leaderboard as `"📡 <name>"` rows.

`notify()` fires a Notification **only** when
`onair && permission === "granted" && document.hidden` — so notifications tell
you about a game you have left running, not one you are looking at.

This is strictly local. The intro modal says plainly that a relay server would
be needed for cross-device play; this is the real, offline-web version of that
idea.

## The numbers

World 870×1245 · `SPEED 155` · 70 nodes (7×10) with 13% of links dropped ·
8 TVs, 400 placement tries at ≥300px apart · 26 packets at 70–140 speed ·
3 censors · 2 bots at 135 · 2s invulnerability.

## Controls

| Action | Touch / Mouse | Keyboard |
|---|---|---|
| Choose direction | drag sets the `want` vector | arrows / WASD |
| Sound | header button | same |

Pointer and keyboard both work here — unusually for this repo.

## Saving

`localStorage["static-best"]` and
`R2.saveJSON("static-pwa", {highScore})`. No mid-run state.

## Known limits

- 🟡 **Every remote tab broadcasts the same name.** All tabs post
`"questo segnale"`, so `remoteScores` has one key and remote leaderboard rows
  overwrite each other. The feature works; it can only ever show one rival.
- 🟡 No resume — the graph is regenerated on reload.
- ⚪ `input.dash` is written on mouse down/up and read nowhere.
- ⚪ `R2.markPlayed` / `trackPlaytime` are called but there is no `stats.run`,
  so runs never reach `stats-pwa`.

## What's next

- 🟠 **Per-tab identity.** A short random name per tab fixes the remote
  leaderboard with a few lines and turns the whole BroadcastChannel demo into
  something worth showing.
- 🟠 **Report runs.** Seized TVs, peak signal, time survived.
- 🟡 A *shared* seed: derive the graph from `R2.dailySeed()` so two tabs live
  in the same city rather than two different ones.
- 🟡 Sound is the biggest missing sense: a carrier hum whose fidelity tracks
  signal strength would make the whole VHS concept land.
- 🟢 A "ghost" of your last run etched onto the board.
- ⚪ Remove `input.dash`, or implement the dash it was for.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
