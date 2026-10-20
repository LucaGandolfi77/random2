<div align="center">

# 🛣️ STICKER SQUAD — The Roadmap to Phone Greatness

### *From "cool browser demo" to "the game your friend won't shut up about."*

**North Star:** 🏪 On the App Store & Play Store. 4.8★. Kids love it. Adults secretly love it. Merch sells out.

</div>

---

## 📱 PHASE 1 — "Thumb Armor" · Mobile MVP ✅ SHIPPED
### *Goal: it must feel BORN on a phone, not ported to one.* ⏱️ Weeks 1–4

> ✅ **STATUS: DONE & VERIFIED** — 12/12 automated browser tests passing (headless Chrome, mobile emulation).
> Bonus bug fixed during testing: a follow-cam oscillation where holding W made the player jitter in place (movement is now camera-relative, camera trails behind with `yaw + π`).

### Touch controls (the make-or-break)
- [x] **Virtual joystick** — left thumb, floating (spawns where you touch), analog magnitude → speed, 0.2s fade-out
- [x] **Contextual buttons** — Jump / Stick🧲↔Peel🌀 / Interact⭐🤝👻 morph into whatever's relevant (refreshed ~7×/s)
- [x] **Swipe-up = peel** — while stuck, an upward flick within 400ms = instant buttery peel
- [x] **Tap = interact** — <300ms, <12px movement; drags become camera orbit instead
- [x] **Camera pinch-zoom** (0.55×–1.9×) + one-finger drag orbit + double-tap reset

### Phone feel (the invisible stuff)
- [x] **Haptics** — presets: tick / stick / peel (triple-buzz hero moment) / collect / damage / win fanfare
- [x] **Screen shake** — trauma-based quadratic falloff: landing, damage, boss hits (subtle, never nauseating)
- [x] **Landscape experience** — portrait-rotate overlay on phones, fullscreen + orientation lock attempt on first touch, safe-area insets (notch/Dynamic Island)
- [x] **Battery saver** — Battery API: <20% & unplugged → 30fps cap + shadows off + pixelRatio 1 + 🔋 badge
- [x] **Instant resume** — visibilitychange discards the stale frame delta, audio resumes

### Performance (60fps or bust)
- [x] **InstancedMesh** — carpet tufts (60→2 draw calls), LEGO (17→5), desk rocks (12→1), trees (18→3), maze walls (31→1)
- [x] **Object pooling** — particles, decals (cap 64, LIFO reuse), collectibles recycled across levels
- [x] **Quality presets** — auto device detection: mobile → 1024 shadows, pixelRatio ≤ 1.5; desktop → 2048/2.0
- [x] **Kill the DOM tooltip** — in-scene sprite labels + camera-attached reticle sprite
- [x] **FPS cap in the render loop** — frame-skip accumulator, dt clamped, tab-switch protection

> 🎯 **Exit criteria:** a stranger picks up a phone, plays 60 seconds with zero instruction, and smiles at the first peel. That's the whole phase.

---

## 🎨 PHASE 2 — "More Everything" · Content Explosion
### *Goal: a new delight every 30 seconds.* ⏱️ Month 2

### Six new worlds
- [ ] 🛏️ **The Bed** — trampoline mattress physics, pillow forts, blanket caves (dark = stealth)
- [ ] 🚪 **The Closet** — hanging clothes are swinging vines, shoe boxes are dungeons, Narnia joke included
- [ ] 🛁 **The Bathroom** — soap = ice physics, tile grout = maze, rubber duck = vehicle?! 🦆
- [ ] 🍳 **The Kitchen** — spoon catapults, toaster heat vents, the floor is (actually) lava (jam)
- [ ] 🌿 **The Garden** — ESCAPE THE BEDROOM. Grass jungles, dew-drop diving, ant highways
- [ ] 🚗 **The Garage** — oil slicks, toolbox platforming, remote-control car CHASE level

### Magic decals (decals become power-ups 🤯)
- [ ] 💣 **Bomb sticker** — 3-2-1... opens weak walls
- [ ] 🌀 **Spring sticker** — any surface turns bouncy for 10s
- [ ] 👁️ **Eye sticker** — reveals invisible platforms & secrets
- [ ] 🧲 **Magnet sticker** — vacuums nearby collectibles to you
- [ ] 🔇 **Mute sticker** — stealth mode, dust bunnies can't hear you
- [ ] 🌉 **Bridge sticker** — spawns a paper bridge over gaps
- [ ] 🪞 **Clone sticker** — decoy that enemies chase ("NOT TODAY")

### New hazards & toys
- [ ] 💨 **Fans** — you are a flat object. Physics has opinions about that.
- [ ] 💧 **Spills** — dissolves you (instant restart, generous checkpoints)
- [ ] ✂️ **Scissors** — moving hazard that also cuts your placed decals. *Rude.*
- [ ] 📄 **Crumpled paper** — find the crease, unfold a whole new platform area
- [ ] 🔍 **Magnifying glass** — a roaming death-laser of sunshine

### Modes
- [ ] ⏱️ **Speedruns** — ghost replays, leaderboards, per-world par times
- [ ] 💀 **Nightmare mode** — faster hazards, no checkpoints, ghost heals
- [ ] 🧘 **Zen mode** — no enemies, no timer. Just decorating the bedroom with stickers

---

## 👤 PHASE 3 — "Drip Harder" · Characters & Customization
### *Goal: players should WANT to grind for a skin.* ⏱️ Month 3

### The skin vault
| Rarity | Skin | The Flex |
|--------|------|----------|
| ⚪ Common | Matte Yellow / Red | Clean classics |
| 🟢 Uncommon | **Glitter** Gold / Silver | Particle shimmer trail |
| 🔵 Rare | **Holographic** | Rainbow sheen shifts with camera — *chef's kiss* |
| 🟣 Epic | **Puffy 3D** | Fat edge cylinder, soft shadows, premium feel |
| 🟣 Epic | **Torn Vintage** | Ragged edge, sepia tint, lore unlock |
| 🌟 Legendary | **Neon Vinyl** | Actual emissive glow — BUSTS in the dark Backpack level |
| 🌟 Legendary | **Clear Invisible** | Barely visible. Pure flex. "How are you playing?!" |

### Unlock design (skill > wallet)
- [ ] All 10 stickers in a world → that world's themed skin
- [ ] Beat par time → **Chrome Speedrunner** skin
- [ ] Boss no-damage run → **Gold Foil Perfect** skin
- [ ] 100 decals placed → **Paint Splatter Artist** skin
- [ ] Die 50 times in the Backpack → **"Survivor"** wrinkled skin *(wear your trauma)*

### Personality systems
- [ ] **Dynamic faces** — eyes widen falling, narrow sneaking, spiral when the ghost is near 😵
- [ ] Unlockable faces: cat, robot visor, heart eyes, judgemental eyebrows
- [ ] **Emote wheel** — wave, dance, panic, taunt (crucial for multiplayer)

---

## 🌐 PHASE 4 — "Squad Goals" · Multiplayer
### *Goal: the word "squad" has to MEAN something.* ⏱️ Month 4

### Co-op campaign (2–4)
- [ ] Drop-in/drop-out online co-op via WebRTC
- [ ] **Squad puzzles:** one stickers a button, other runs the gate • chain-bridge across gaps • one baits the ghost, others strike
- [ ] Shared lives pool — one dies, everyone groans (this is good design)

### Competitive modes
- [ ] 🏷️ **Sticker Tag** — stick to someone to pass the curse. Last cursed loses. CHAOS.
- [ ] 👑 **King of the Desk** — hold the center zone for 30s while hazards rain
- [ ] 🎨 **Decal Race** — first to 20 placements wins; sabotage allowed, encouraged
- [ ] 👻 **Ghost Escape** (asymmetric!) — 3 stickers vs 1 player-controlled Dryer Sheet Ghost. *Spooky Saturday nights, here we come.*

### Social glue
- [ ] Friend codes + daily challenge (same seed worldwide, midnight reset)
- [ ] One-tap share screenshots with a custom sticker frame
- [ ] Level codes shareable like Mario Maker

---

## 🏗️ PHASE 5 — "Be the Architect" · Level Editor
### *Goal: a million bedrooms, one game.* ⏱️ Month 5

- [ ] **Terrain brushes** — wood / carpet / glass / tile painting
- [ ] **Object palette** — books, pencils, LEGO, shoes, plants, mugs
- [ ] **Hazard kit** — tassels, bunnies, raindrops, ghost spawners
- [ ] **Lighting studio** — fog color, point lights, time-of-day slider
- [ ] **Trigger logic** — "enter zone → spawn hazard" (simple, powerful, no code)
- [ ] **Test instantly** — one button, zero loading
- [ ] **8-char level codes** + Discovery tab (trending / newest / staff picks)
- [ ] Creator profiles + ratings; **best community levels become official DLC**

---

## 📸 PHASE 6 — "Make It Shareable" · Photo & Clips
### *Goal: this game markets itself on TikTok.* ⏱️ Month 6

- [ ] **Photo mode** — pause, free camera, 20+ sticker poses (peeling mid-air, dab, sleep)
- [ ] **Filters** — Vintage, Neon, Noir, Pixel, Glitch, Hologram
- [ ] **Transparent PNG export** — your sticker becomes a Discord emoji. That's the loop. 🔄
- [ ] **Auto-highlight reel** — 15s cinematic of your best peels, vertical 9:16, TikTok-ready
- [ ] Ghost replay sharing — watch your friend's perfect run and seethe

---

## 💰 PHASE 7 — "Rich Without Evil" · Monetization
### *Goal: full wallets of goodwill before asking for $4.99.*

**The promise (put it on the store page, in bold):**
> ❌ No ads · ❌ No energy timers · ❌ No loot boxes · ✅ Pay once, own everything

- [ ] **$4.99 premium** — all worlds, full campaign, level editor
- [ ] Free demo — World 1 only, full quality, ad-free
- [ ] Cosmetic IAP: skin packs $0.99 · seasonal Sticker Pass $2.99
- [ ] **Tip your favorite level creator** button (creators get a cut)
- [ ] Real-world merch tie-in: holographic sticker packs with QR codes → in-game skins 🤯

---

## 🚀 PHASE 8 — "Ship It" · Store Launch
### *Goal: the buttons are real now.* ⏱️ Month 7–8

- [ ] **Capacitor wrapper** → iOS App Store + Google Play
- [ ] Game Center / Play Games achievements & leaderboards
- [ ] **Cloud saves** across devices
- [ ] Push notifications that don't suck ("Your daily challenge expires in 2h" — never spam)
- [ ] ASO: keywords, screenshots with captions, launch trailer with the peel sound front & center
- [ ] Press kit: GIFs of the peel (30fps, <3MB), the ghost, the squad following
- [ ] Beta via TestFlight / Play Console — 100 testers, feedback form, iterate
- [ ] **Launch day:** Product Hunt, r/WebGames, TikTok trailer, a discount, and zero sleep

---

## 🤪 The "Wouldn't It Be Cool If…" Parking Lot

> Dreams go here. Survivors graduate into the roadmap.

- [ ] 📷 **AR mode** — spawn Glitch on YOUR real desk through the phone camera
- [ ] 🏟️ Tournament mode — weekly brackets, spectator cam, casting mode
- [ ] 👻 **Boss Rush** — every boss, one health bar, one save slot, pure adrenaline
- [ ] 🎃 Seasonal events — Halloween ghost invasion, Xmas present maze, Valentine hearts
- [ ] 💘 Sticker Dating Sim (April Fools, becomes real because it's too funny)
- [ ] 🧸 Plush Glitch with a hidden NFC sticker inside that unlocks an in-game skin
- [ ] 📺 5-min animated YouTube shorts — "Glitch vs. The Vacuum"
- [ ] 🕹️ Speedrun community tools — splits timer, practice mode, per-chapter saves

---

## ✅ 1.0 "Definition of Done"

- [ ] 5+ worlds minimum, each with unique palette, music mood & mechanic
- [ ] Touch controls a stranger can use with zero tutorial
- [ ] **60fps on iPhone 12 / Pixel 6+** (30fps battery mode on weak devices)
- [ ] Zero memory leaks across a 30-minute session
- [ ] App Store + Play Store approved 🏪
- [ ] One beta tester posts an unsolicited TikTok of the peel animation
- [ ] A developer cries watching a kid play it. *(Non-negotiable.)*

---

## 🧭 Right Now, Next 3 Actions

1. ~~Virtual joystick + contextual buttons~~ ✅ done in Phase 1
2. ~~Haptic feedback on peel~~ ✅ done in Phase 1
3. **The Bed world prototype** — trampoline physics will sell the game in one GIF ← *start here*

<div align="center">

## 🟨 The sticker is flat. The vision is not. 🟨

*Pick a checkbox. Open a PR. Let's get weird.*

</div>
