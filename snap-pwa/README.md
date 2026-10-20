# 👻 Snap PWA — a camera with filters

A real-time camera in the browser, with **face lenses** (MediaPipe
FaceLandmarker, 478 landmarks) and **retro filters**. The snaps stay on the
device (IndexedDB) — no server, no account, no upload.

## The catalogue

**Face lenses** — drawn on the landmarks, so they follow the face at any
distance and mirror correctly on the front camera.

| | | | |
|---|---|---|---|
| 🐶 Dog | 😎 Sunglasses | 👑 Crown | 😍 Hearts |
| 🐱 Cat | 🐰 Bunny | 🤖 Robot | 🤠 Cowboy |
| 😈 Devil | 😇 Angel | 🌸 Blush | 🤮 Rainbow |
| 🦊 Fox | 🐼 Panda | 🧛 Vampire | 🧙 Wizard |
| 🐝 Bee | 🎩 Top Hat & Monocle | 🧔 Wig | 🥸 Moustache |
| 🏴 Eyepatch | 🫧 Bubbles | | |

**Forehead quizzes** — the card spins the answers and then locks onto one.
The draw comes from the clock, so the preview and the photo always agree.

| 🐾 Which animal? | 🍽️ Which food? | ⚡ Which mood? |
|---|---|---|

**Frames** — drawn on the overlay, so they cost nothing per frame and land
in the photo exactly as they looked in the preview.

| | | | |
|---|---|---|---|
| 🌑 Vignette | 🎞️ Grain | 📼 VHS | ☁️ Dream (bloom) |
| 💫 Light Leak | 📆 Instant Film | 🎞️ Cinema | 🧊 Frost |
| ⚡ Glitch | 🌈 Prism | 🎟️ Ticket | 🔲 Corners |
| 🎞️ Film strip | ✨ Dust | 🌟 Rim light | |

**Colour grades** — baked into the pixels of the photo, with a CSS
equivalent for the live preview.

| | | | |
|---|---|---|---|
| ⚪ B/N | 🎩 Noir | 🟤 Sepia | 🌈 Vivid |
| 🧊 Cold | 🔥 Warm | 🌓 Negative | 🟣 Duotone |
| 🟪 Neon | 💙 Cyanotype | 🌡️ Thermal | 🌀 Psychedelic |
| ☀️ Solarized | 🌿 Infrared | 📟 Amber | 🔀 Cross |
| 🟪 Mosaic | | | |

**Looks** — a lens, a frame and a grade in one tap. They sit in their own
row above the carousel, because they are combinations and not filters.

| | | | | |
|---|---|---|---|---|
| 🪩 Disco | 🎩 Noir | 🎞️ Cinema | 🌊 Wave |
| 👸 Ice Queen | | | | |

## The games

Two minigames that use the body instead of the fingers. They need the face
landmarks the lenses already use, so nothing extra is downloaded.

- 🥁 **Drums** — a kit at the bottom of the frame. Move your head over a
  pad and open your mouth to hit it. Tilt your head for the crash, blink
  for the hi-hat. The score counts the hits and the combo counts the
  ones in a row.
- 🦆 **Duck** — a rubber duck swims across the frame. Open your mouth when
  it is in front of you to catch it. Three ducks get away and the game is
  over.

Their sounds are synthesised: a kick is a sine that falls, a snare is a
burst of noise through a bandpass, a quack is a sawtooth with a fast
vibrato. There is no asset to download and none to licence.

## Requirements

- **HTTPS** (required by `getUserMedia`) — GitHub Pages is fine
- The face filters load the MediaPipe engine from `vendor/` on first use
  (~15 MB, already published with the site and cached by the service
  worker); from the second opening they work offline too
- iOS Safari 16.4+ is recommended (the base for MediaPipe Tasks Vision)

## What it does

- Front and back camera, with the mirror on the front
- A screen flash (phones do not have a front light… some do 👻)
- Shot → caption → save to **Memories**, download or share
- **Memories**: a grid, a viewer, deletion, download
- **Import a photo** from the device and run it through the same lens,
  frame and grade
- **Photo booth**: four shots in a row, composed into one strip
- A countdown before the shot, a composition guide, a hold-to-compare
  button, haptics and a photo quality setting
- Installable: **Share → Add to Home**

## The code

```
snap-pwa/
├── index.html          the markup
├── styles.css          the styles, with the token scale at the top
├── app.js              the camera, the shot, the memories
├── filters.js          the filter registry, the lenses, the frames
├── minigames.js        the drum kit and the duck
├── ui.js               the bottom sheet, the settings, the favourites
├── manifest.json
├── service-worker.js   the shell, and the engine on first use
├── icons/              SVG, like every other project here
└── vendor/             the MediaPipe engine, vendored
```

No build step, no dependencies, no binary art. The only heavy thing in the
repository is the vendored engine, and it is there so the app never has to
reach the internet.

---

# TODO — future work

Everything below is a real next step, not a wish list. The order is roughly
the order of how much it would be worth doing.

## Effects and lenses

- [ ] **A lens that follows the head, not the face.** The landmarks give a
      pose, so a hat could sit on the skull instead of the forehead. The
      projector already carries the angle; it needs a second one for the
      tilt.
- [ ] **Two lenses at once.** The registry draws one lens per filter, so
      "sunglasses and a crown" means a list of lenses instead of a single
      one — and a decision about which one wins the overlap.
- [ ] **A "no face found" state that says so.** Right now the frame is
      simply empty, which reads as a broken filter rather than a missing
      face.
- [ ] **An animated lens.** The hair and the rainbow do not move with the
      face; the landmarks are not tracked between frames, only within one.
- [ ] **A lens for the hands.** The tracker only gives a face. The
      vendored bundle has the HandLandmarker and the PoseLandmarker in it,
      but not the models: the hand model is ~7.5 MB and the pose one ~6 MB,
      and the app promises never to reach the internet, so they would have
      to be vendored too. That is a decision about the size of the
      repository, not about the code.
- [ ] **A minigame that uses the hands**, once there is a hand model: the
      drums would be better with hands than with a mouth.

## Frames

- [ ] **The kaleidoscope, done properly.** It has to redraw the video into
      the canvas, and the canvas is where the face lenses are drawn. It
      wants a separate layer.
- [ ] **A frame that reads the photo's own histogram**, so the border
      matches the picture instead of being a fixed colour.
- [ ] **A frame counter that counts frames**, not the clock. Right now it
      is `time × 24`, which is a number that looks like a frame count and
      is not one.
- [ ] **A frame that knows the time of day**, and one that knows where the
      photo was taken — which needs a permission the app does not ask for
      today, and might never be worth asking for.

## Interface

- [ ] **A scrubber for the video.** Pick a moment, shoot that. The camera
      is a stream, not a recording, so this needs a rolling buffer.
- [ ] **The viewer in the bottom sheet**, so the memories grid is not a
      separate screen and the back gesture is one place.
- [ ] **A sticker layer**: pin an emoji on the photo, in the frame.
- [ ] **Searchable captions** in the memories grid. The captions are
      already stored; there is just no way to look for one.
- [ ] **Landscape.** The app is portrait only, and the manifest says so.
- [ ] **A theme.** The app is dark only, on purpose, but the settings
      sheet would be the natural place for it.

## Storage and sharing

- [ ] **A storage guard.** The photos are blobs in IndexedDB, so a hundred
      of them is a hundred of megabytes. The settings sheet says how much
      is on the device, but nothing stops it from filling up.
- [ ] **Export the memories as a zip.** No dependencies means writing the
      zip format by hand — a page of work, and a page of work that has to
      be right.
- [ ] **Share a strip of four**, not one.
- [ ] **A caption in the share sheet**, so the caption travels with the
      picture.

## Quality and performance

- [ ] **The photo is not the preview.** The photo is rendered at 1080
      pixels wide whatever the camera gives, and the preview is the
      device's width: on a high-DPI screen the two are not identical.
- [ ] **The video recording does not adapt.** It is 720 wide at 30 fps on
      every device, and a slow phone records a slow film.
- [ ] **The detection throttle tops out at every other frame.** A slow
      device could do every third.
- [ ] **A frame budget test.** How long a frame takes, asserted — the
      same idea as the draw-call budget in IRONFALL, and it would catch a
      lens that costs more than it looks like it does.
- [ ] **The thermal filter is a 1/6 copy scaled up.** It is cheap, and it
      is also blurry, and the blur is the point of the filter.

## Deliberately not doing

- [ ] **No server, no account, no upload.** Everything stays on the device
      and that is the whole promise of the app.
- [ ] **No analytics.** A camera app that measures you is a camera app that
      is looking at something else.
- [ ] **No binary art.** The icons are SVG and everything else is drawn by
      code, like the rest of the repository.
- [ ] **No dependencies.** The MediaPipe engine is vendored instead, which
      is 15 MB in the repository and zero requests at runtime.
- [ ] **No cloud fallback for the engine.** There used to be one, for a
      partial deploy. It means the app reaches the internet when it should
      not, and the only version worth shipping is the one where the engine
      is always local.

## Known limits

- The face engine is ~15 MB and is cached on the first use: the first face
  filter is slow, and it says so.
- The camera needs HTTPS, and the permission flow on iOS is Safari's, not
  the app's.
- The photo is 1080 pixels wide whatever the camera gives.
- The preview runs at the display's refresh rate, and the face detection
  is throttled on top of it.
- There is no test suite. The parts that can be tested without a camera
  (the filter registry, the drawing functions against a synthetic face)
  are the parts that would be worth testing first.
