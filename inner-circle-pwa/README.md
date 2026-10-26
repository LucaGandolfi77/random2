# Inner Circle - Drop Your Friends. Grow the Circle.

A portrait-first merge game in the Suika tradition, built around your own
people. Eleven round photo stickers fall into a glass circle; two friends of
the same tier merge into the next friendship stage, from **New Face** all the
way to **The Whole Crew**.

An original browser game. No code or assets from Suika are used.

## How to Play

1. **Aim and drop.** Drag across the jar (or use the arrow keys) and release.
   The current friend falls, and the next one slides into your hand.
2. **Match two.** Two discs of the same tier merge into the next stage. A
   merge in quick succession continues the chain multiplier, up to x9.
3. **Stay below the line.** If anyone rests above the dashed danger line for
   too long, the circle is officially too crowded and the run ends.
4. **Reach The Whole Crew.** Two Whole Crew discs make a legendary group-photo
   bonus worth 6,000 × your chain, then the run continues.
5. **Spend Hype.** Merges fill the Hype meter. Party tricks cost Hype and can
   rescue a bad pile.

### Controls

| Input | Action |
| --- | --- |
| Drag / move mouse | Aim |
| Release / tap | Drop |
| `←` `→` | Aim one nudge |
| `Space` / `Enter` | Drop |
| `1` / `2` / `3` | Switch / Group Hug / Plus One |
| `P` / `Esc` | Pause |

Touch is the primary control: hold, drag, release. The canvas is keyboard
focusable and the page announces merges and danger through an aria live region.

## The Three Party Tricks

| Trick | Cost | What it does |
| --- | ---: | --- |
| **Switch** | 20 Hype | Swap the friend in your hand with the next one. |
| **Group Hug** | 45 Hype | Shake the jar and jostle the whole pile. |
| **Plus One** | 100 Hype | Turn the next drop into a rainbow wildcard that joins the first friend it touches and advances that tier. |

Hype is earned from every merge, with a small bonus for higher tiers. The
wildcard reaching The Whole Crew triggers the legendary group-photo bonus.

## Circle Stories

### The group chat

Each friend has an optional **vibe** (Sunshine, Chaos, Deadpan, Feral, Softie,
Hype) and a **signature line** in the Photo Booth. During a run they react to
merges, chains, danger, party tricks and legendary moments — a little speech
bubble on mobile, a running chat panel on desktop, and a live region for screen
readers. The chat can be muted from the pause menu or from the panel header.
Messages are local text; nothing is sent anywhere.

### Yearbook

The Yearbook collects:

- circles made, best score, best chain and dares won;
- all-time superlatives: top friend, most merged, favourite trick, daily streak
  and custom-photo count;
- a memory wall of the last 30 runs, with the top friend, score, mode, chain
  and date;
- a local dare log with wins, losses and exact ties.

It is built from local run history only. Old saves migrate to the new shape.

### Circle Wrapped

**Share Wrapped** draws a 1080 × 1350 recap poster with your top friend, most
merged friend, biggest chain, favourite trick, dare record and full circle. It
uses the same local photos and Web Share fallback as the postcard.

### Dare a friend

After any run, **Dare a friend** generates a link containing only:

- the run seed,
- the target score,
- the player's display name,
- the mode and daily-rule id when relevant.

Opening the link shows a challenge card on the home screen. Accepting it starts
a **Friend Dare** with the exact same drop sequence. Beat the target and the
result records a win in your local rival log; tie or lose and you can dare them
back. **No photos, roster names or account data are in the link.** There is no
server and no global leaderboard.

## Your Friends, Locally

- **Eleven custom slots**, one for each tier. Add a photo one at a time, drag
  files onto a card, paste a clipboard image, or bulk-fill every empty slot.
  Each slot can also hold a display name, a vibe and a signature line.
- **Circular crop editor** with drag to pan, zoom (slider, +/−, wheel), and
  arrow-key nudging. The round mask is visible before you commit.
- **Optional names** for each friend, shown in the squad and on the postcard.
- Photos are decoded in the tab, re-encoded to a 320 × 320 WebP (JPEG fallback)
  thumbnail and stored in `localStorage`. **Originals are discarded.**
- There is no upload, no fetch, no account and no tracker. **Reset to demo
  faces** removes the squad from this browser. Export/share only happens when you tap
  the postcard button, and the image is generated in that same tab.
- Eleven illustrated friends are drawn procedurally, so the repository still
  ships zero binary art assets. The default cast has no relation to your photos.

## Daily Circle and Records

The **Daily Circle** uses a date-seeded queue and one of five rules:

- **Hype Train** — start with 45 Hype.
- **Tiny Table** — only small friends drop.
- **Combo Club** — the chain window is twice as long.
- **Double Hype** — every merge earns double Hype.
- **Small but Mighty** — small friends plus a head start.

The local daily best and a consecutive-day streak are stored per device. The
main menu also keeps a local top-five hall of fame, best score, best chain, top
tier and ten achievement stickers. There is no server and no global leaderboard.

At the end of a run, **Share postcard** draws a 1080 × 1350 photo finish with
your top tier, score and the full circle. It uses the Web Share API with files
when available, and downloads a PNG otherwise.

## Feature Summary

- Deterministic, fixed-step circle physics: gravity, walls, floor, pair
  impulses, stacking, merge chains and no upside-down faces
- Seeded drop queue with current + next preview; weighted tiers 1-5
- Chain scoring, danger timer, auto-pause on a hidden tab
- Hype economy and three usable special moves
- Eleven custom round photo slots with local-only compression and a circular
  crop editor, plus names, vibes and signature lines
- Live group-chat reactions, a local Yearbook with superlatives and a memory
  wall, and a shareable Circle Wrapped poster
- Seed-and-target **Dare a friend** links with a local rival log
- Local top runs, daily rule/streak, ten badges
- Shareable canvas postcard and wrapped recap
- Synthesized WebAudio, haptics and global sound settings via
  [`../shared/arcade.js`](../shared/arcade.js)
- Offline PWA with a precached shell, safe areas, reduced motion, keyboard
  controls and non-colour tier cues (ring patterns and numbers)
- No dependencies and no build step

## Technical Details

- Vanilla JavaScript ES modules, Canvas 2D and CSS.
- `src/engine.js` is DOM-free and deterministic: tests can simulate hundreds
  of drops without a browser.
- `src/render.js` reads a state snapshot and a small event stream; it never
  changes the score.
- `src/portrait.js` owns decode, crop geometry, compression and photo loading.
- `src/faces.js` draws the illustrated demo cast procedurally.
- `src/roster.js` is the shared tier/vibe/name/colour/badge table.
- `src/chat.js` is a pure group-chat line selector.
- `src/dare.js` is a pure base64url challenge codec.
- `src/postcard.js` and `src/wrapped.js` draw the two share cards.
- User photos never enter the service-worker cache.

### File Structure

```
inner-circle-pwa/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── icons/
│   ├── icon-192.svg
│   └── icon-512.svg
├── src/
│   ├── main.js          # screens, input, storage, audio, sharing
│   ├── engine.js        # physics, merges, queue, powers, scoring
│   ├── roster.js        # tiers, vibes, storage keys, badges
│   ├── faces.js         # procedural illustrated friends
│   ├── portrait.js      # local decode/crop/compress
│   ├── render.js        # jar, discs, effects, previews
│   ├── postcard.js      # result postcard
│   ├── chat.js          # group-chat line selection
│   ├── dare.js          # seeded challenge link codec
│   └── wrapped.js       # Circle Wrapped poster
├── tests/
│   ├── engine.test.mjs
│   ├── roster.test.mjs
│   └── assets.test.mjs
├── smoke.mjs
└── README.md
```

## Development

Serve the repository root with any static server, then open
`/inner-circle-pwa/`:

```bash
python3 -m http.server 8080
# http://localhost:8080/inner-circle-pwa/
```

Do not open `index.html` through `file://`: ES modules and the service worker
need an HTTP origin.

Run the headless rules suite:

```bash
node --test inner-circle-pwa/tests/*.test.mjs
```

Run the in-browser smoke test (skips cleanly if no Chromium is available):

```bash
python3 -m http.server 8099 &
node inner-circle-pwa/smoke.mjs http://localhost:8099/inner-circle-pwa/
```

The smoke test boots the real page, closes the tutorial, drops a merged pair
through the engine, checks the HUD and canvas changed, exercises the squad
screen and verifies the results modal and local progress.

## Privacy

- Photos are read with `FileReader`/`createImageBitmap` and drawn to a local
  canvas. They are never sent anywhere.
- The saved data is a 320px thumbnail per tier, a short optional name, a vibe
  id and a signature line.
- The original file, EXIF metadata and any larger version are not retained.
- The postcard and Circle Wrapped card are only generated after an explicit tap.
- A dare link contains a seed, target score, display name and mode/rule id. It
  does not contain photos, roster names or any account identity.
- No analytics, ads, cookies, remote fonts, scripts or network assets.
