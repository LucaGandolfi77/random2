# CINDER BELT

*A single-player .io salvage war in a dying ring.* ☄️

**Play:** <https://lucagandolfi77.github.io/random2/cinder-belt-pwa/>
**Source:** <https://github.com/LucaGandolfi77/random2/tree/main/cinder-belt-pwa>

CINDER BELT is a 15-minute objective run through four concentric zones. Mine
ore, bank it, upgrade your hull, take the relays and break the Corsair Nexus
before the ring collapses. It is single-player, works offline as a PWA, and
has no build step, no frameworks and no binary art or audio assets.

---

## The run

You start docked at the **Anchorage** with a tier-1 Sparrow, an empty hold and
a 15-minute clock. The Corsair **Nexus** sits at the edge of the Scab behind a
regenerating shield.

There are two ways to win:

1. **Hold two of the three relays.** Their capture rings are in the Scab.
   Holding two drops the Nexus shield and exposes its hull.
2. **Kill the Leviathan.** The boss drops a **Singularity Core**. Carry it
   into the Nexus to breach the shield instantly.

Lose by letting the Anchorage fall, or by being behind on score when the ring
collapses. Score is banked ore, kills and relay captures.

## The map

The belt is a set of rings around a black hole:

| Zone | Law | Character |
|---|---|---|
| **Anchorage** | Safe bubble, turrets online | Drill, drydock, starter mining field |
| **Verdant Drift** | PvE frontier | Aliens hunt here; shooting a pilot marks you OUTLAW |
| **The Scab** | Open PvP | Relays, richer ore, the Nexus |
| **The Maw** | PvP hazard | Black-hole gravity, 3× ore, 3× bounty |
| **The Void** | Ring break | Outside the playable ring; turn back |

## The law

Firing on another ship in the **Drift** is a crime. You become **OUTLAW** for a
while: the Anchorage refuses to dock you and its turrets shoot on sight. The
Scab and the Maw are always free fire. A clean pilot cannot be hit inside the
Anchorage bubble; an outlaw can.

## Hulls

Tier 1 is the shared **Sparrow**. At the first upgrade you pick one of three
doctrines, then the line runs straight to tier 6:

| Doctrine | Role | Feel |
|---|---|---|
| **Lance** | Interceptor | Fast, precise, fragile; phase dash |
| **Bulwark** | Line holder | Big shields, flak spread, aegis field |
| **Harvester** | Industrial | Huge hold, mining beam and salvage pulse |

Docking banks your cargo, repairs the hull and opens the drydock. The drydock
**freezes the match clock**; undocking resumes it.

## AI and wingmen

The free fleet, neutral haulers and corsair raiders all run the same economy
you do: mine, return, bank, upgrade, fight. They are personalities rather than
difficulty tiers, including the corsair ace **VEX-9**. Your three wingmen take
orders with **1** mine, **2** attack, **3** defend, **4** follow.

Feral aliens spawn in the Drift, raid the Anchorage in waves, and eventually
the Leviathan surfaces.

## Controls

| Action | Keyboard / mouse | Touch |
|---|---|---|
| Thrust | WASD / arrows | Left stick |
| Aim | Mouse | Right stick |
| Fire / mine | Hold left click (or **F** to toggle) | Right stick |
| Ability | **Space** | ABILITY button |
| Boost | **Shift** | BOOST button |
| Dock / undock | **E** | DOCK button |
| Pause | **Esc** / **P** | Pause button |
| Wingman order | **1–4** | — |

Docking is automatic when you press **E** inside the Anchorage dock ring, and
the drydock is a safe, frozen screen until you undock.

## PWA and offline

The game ships a manifest, generated PNG/SVG icons, an OG cover, and a
cache-first service worker. Once loaded it runs with the network off. All
graphics are drawn procedurally on Canvas 2D and all sound is synthesised with
WebAudio — there is nothing to download after the first visit.

## Development

There is no build. Serve the repository root and open the folder:

```bash
python3 -m http.server 8080
# http://localhost:8080/cinder-belt-pwa/
```

Run the headless suites:

```bash
node cinder-belt-pwa/tests/sim.test.js
node cinder-belt-pwa/tests/content.test.js
node cinder-belt-pwa/tests/boot.test.js
```

- `sim.test.js` — deterministic seeds, mining/banking, zone law, relays and
  shield, the Leviathan core, the upgrade tree, AI economy, end conditions and
  a five-minute stability run.
- `content.test.js` — config integrity, the full hull tree, bot personalities,
  persistence in a fresh VM, DOM-id wiring, manifest and service-worker asset
  coverage.
- `boot.test.js` — boots the real scripts against a fake DOM built from
  `index.html` and drives menu → launch → fly → dock → upgrade → pause →
  undock → win → retry → abandon.

### Files

```
cinder-belt-pwa/
  index.html          markup, meta, PWA hooks
  styles.css          desktop HUD + phone/touch layout
  manifest.json       install metadata and icons
  service-worker.js   offline cache (bump CACHE_NAME on release)
  icons/              generated PNG/SVG icons + OG cover
  src/
    config.js         all tuning: zones, hulls, economy, bot roster
    rng.js            seeded mulberry32
    storage.js        profile and run persistence
    audio.js          procedural WebAudio
    input.js          keyboard, mouse and twin-stick touch
    shipyard.js       hull tree, costs, runtime stat application
    zones.js          zone lookup and the law
    world.js          simulation core: movement, combat, mining, relays,
                      stations, pickups, end conditions
    ai.js             bot economy and combat state machine
    npcs.js           aliens, raids and the Leviathan
    render.js         procedural Canvas 2D renderer
    minimap.js        circular tactical map
    ui.js             menu, HUD, drydock, feed, modals
    main.js           boot, fixed-step frame loop, run lifecycle
  tests/
    harness.js        shared headless loader and assertions
    sim.test.js
    content.test.js
    boot.test.js
```

## License

Same as the parent repository: see [`../LICENSE`](../LICENSE).
