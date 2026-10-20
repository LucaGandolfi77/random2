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

## The two games

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

## Games

The minigames are the newest part of the app and the part with the most
headroom: both of them are free play with a score, and neither of them has
a reason to be played twice.

- [ ] **A song to play.** The drum kit is free play: there is a score and
      a combo, but nothing to play *against*. A synthesised backing track
      and a chart of notes to hit would turn it into a rhythm game, and
      this repository has the exact precedent — `pulse-pwa` generates its
      track from a seed and reads the chart back out of the melody.
      *Cost: the chart is the work; the track is another synthesised
      instrument.*
- [ ] **Two hands.** The kit has four pads and one position of the head.
      Two hands means two independent sides, which is the difference
      between a drum kit and four bells. *Cost: a second landmarker, and
      a decision about what the head does when the hands are busy.*
- [ ] **Show the record, and keep it.** `migliore` is already in the game
      state and it is already updated on every combo — and it is never
      shown and never saved, so the best run of the day is thrown away
      when the tab closes. *Cost: ten lines and a localStorage key.*
- [ ] **A time attack.** Thirty seconds, as many ducks as you can catch.
      It is the simplest possible scoring mode and it needs no new
      mechanics, only a clock. *Cost: an hour.*
- [ ] **The ducks in waves.** One duck at a time, at random, is a
      mechanic and not a game. Waves with a rising speed, and a duck that
      dives, are the difference. *Cost: a spawn table and a difficulty
      curve.*
- [ ] **A game on the photos you import.** Find the thing in the
      picture. It connects the import to the games, which are currently
      two halves of the app that never meet. *Cost: the interesting part
      is deciding what "the thing" is.*
- [ ] **The score announced, and the games still under reduced motion.**
      A live region that says "twelve, combo four", and a duck that stops
      bobbing when `prefers-reduced-motion` is on. The page stops its
      animations; the games should too. *Cost: an `aria-live` region and
      a check.*

## Effects and lenses

- [ ] **A lens that follows the head, not the face.** The landmarks give a
      pose, so a hat could sit on the skull instead of the forehead. The
      projector already carries the angle; it needs a second one for the
      tilt. *Cost: the context has to carry the tilt as well, which is
      most of the work.*
- [ ] **Two lenses at once.** The registry draws one lens per filter, so
      "sunglasses and a crown" means a list of lenses instead of a single
      one — and a decision about which one wins the overlap. *Cost: a list
      instead of a string, and an order.*
- [ ] **A "no face found" state that says so.** Right now the frame is
      simply empty, which reads as a broken filter rather than a missing
      face. *Cost: an hour, and a state the renderer has to know about.*
- [ ] **An animated lens.** The hair and the rainbow do not move with the
      face; the landmarks are not tracked between frames, only within one.
      *Cost: tracking between frames, which the landmarks do not give for
      free.*
- [ ] **A lens for the hands.** The tracker only gives a face. The
      vendored bundle has the HandLandmarker and the PoseLandmarker in it,
      but not the models: the hand model is ~7.5 MB and the pose one ~6 MB,
      and the app promises never to reach the internet, so they would have
      to be vendored too. That is a decision about the size of the
      repository, not about the code. *Cost: ~7.5 MB of model in the
      repository.*
- [ ] **A minigame that uses the hands**, once there is a hand model: the
      drums would be better with hands than with a mouth. *Cost: the same
      model, and a game that reads it.*
- [ ] **A lens that reacts to the mouth.** The bubbles are the first lens
      that moves with the face, and the other twenty-one do not. The
      mouth's openness is already read for the games, so the work is the
      drawing and not the measurement. *Cost: one function.*
- [ ] **A before/after wipe.** The compare button shows the raw frame
      while it is held, which is the right answer for a moment and the
      wrong one for a comparison: a wipe you drag across the picture
      shows both at once. *Cost: a slider and a clipped second draw.*
- [ ] **A lens that uses the whole head.** The halos sit on the forehead
      because that is where the landmark is. A halo belongs on the skull,
      and the projector already carries the angle. *Cost: the same work
      as the head-tilt item above, done once.*

## Frames

- [ ] **The kaleidoscope, done properly.** It has to redraw the video into
      the canvas, and the canvas is where the face lenses are drawn. It
      wants a separate layer. *Cost: a second canvas and a full-frame
      draw on every frame.*
- [ ] **A frame that reads the photo's own histogram**, so the border
      matches the picture instead of being a fixed colour. *Cost: a
      histogram pass over the photo before the frame is drawn.*
- [ ] **A frame counter that counts frames**, not the clock. Right now it
      is `time × 24`, which is a number that looks like a frame count and
      is not one. *Cost: a counter, and the recording has to count too.*
- [ ] **A frame that knows the time of day**, and one that knows where the
      photo was taken — which needs a permission the app does not ask for
      today, and might never be worth asking for. *Cost: the clock is
      free; the location is a permission, and the permission is the
      decision.*

## Interface

- [ ] **The games are not playable with a keyboard.** The drums and the
      duck both want a face in front of the camera. Somebody using a
      keyboard, or with a webcam pointed somewhere else, has no way in.
      A tap or a key on each pad is the fallback, and it is also the
      fastest way to test them. *Cost: the games need a second input
      path, which means the input is not the face but the thing the face
      is measuring.*
- [ ] **A scrubber for the video.** Pick a moment, shoot that. The camera
      is a stream, not a recording, so this needs a rolling buffer.
      *Cost: the buffer, and the memory that goes with it.*
- [ ] **The viewer in the bottom sheet**, so the memories grid is not a
      separate screen and the back gesture is one place. *Cost: a day,
      most of it in making the sheet remember where it was.*
- [ ] **A sticker layer**: pin an emoji on the photo, in the frame.
      *Cost: a hit test, and a save format that carries the stickers.*
- [ ] **Searchable captions** in the memories grid. The captions are
      already stored; there is just no way to look for one. *Cost: an
      hour.*
- [ ] **Landscape.** The app is portrait only, and the manifest says so.
      *Cost: the whole layout, and the manifest has to say something
      else.*
- [ ] **A theme.** The app is dark only, on purpose, but the settings
      sheet would be the natural place for it. *Cost: a second palette
      and a check on every colour in it.*
- [ ] **Burst mode.** Three shots in a row, the way every phone camera
      has done it for fifteen years. The shots are already a loop; the
      missing part is keeping the three and letting the user pick one.
      *Cost: an hour, and a decision about which of the three wins.*
- [ ] **The camera's zoom.** The track exposes zoom on most browsers and
      the app never asks for it. A pinch, or a slider, and a telephoto
      that is actually a crop. *Cost: `applyConstraints` and a control.*
- [ ] **Swipe gestures.** Down on the preview to discard, up to open the
      sheet. The buttons all exist; the gestures are what makes the app
      feel like an app and not a form. *Cost: pointer handling, and the
      care not to steal the filter carousel's horizontal swipe.*

## Storage and sharing

- [ ] **A storage guard.** The photos are blobs in IndexedDB, so a hundred
      of them is a hundred of megabytes. The settings sheet says how much
      is on the device, but nothing stops it from filling up. *Cost: a
      size check on every save, and a number in the settings sheet.*
- [ ] **Export the memories as a zip.** No dependencies means writing the
      zip format by hand — a page of work, and a page of work that has to
      be right. *Cost: the zip format, written by hand.*
- [ ] **Share a strip of four**, not one. *Cost: the strip has to exist
      first.*
- [ ] **A caption in the share sheet**, so the caption travels with the
      picture. *Cost: the share payload, and the caption has to go in it
      as text.*
- [ ] **Show which filter each photo used.** The record already stores it
      and the memories grid already shows the caption. One more line on
      the thumbnail, and the grid becomes a history of what you were in
      the mood for. *Cost: ten minutes.*
- [ ] **Re-edit a saved photo.** Open a memory in the editor with the
      filter that made it, change the filter, save it again. The import
      already runs a photo through the whole stack, so the machinery is
      there. *Cost: the import path, reused.*
- [ ] **Save the current combination as a look.** "Make me this". A look
      is a lens, a frame and a grade, and right now the only way to make
      one is to edit the source. *Cost: the looks are already data; this
      is a button that writes it.*

## Quality and performance

- [ ] **The photo is not the preview.** The photo is rendered at 1080
      pixels wide whatever the camera gives, and the preview is the
      device's width: on a high-DPI screen the two are not identical.
      *Cost: the photo has to be rendered at the device's resolution,
      which is the expensive part.*
- [ ] **The video recording does not adapt.** It is 720 wide at 30 fps on
      every device, and a slow phone records a slow film. *Cost: a
      measurement and a table of profiles.*
- [ ] **The detection throttle tops out at every other frame.** A slow
      device could do every third. *Cost: one more step in the throttle.*
- [ ] **A frame budget test.** How long a frame takes, asserted — the
      same idea as the draw-call budget in IRONFALL, and it would catch a
      lens that costs more than it looks like it does. *Cost: a number
      per frame and a ceiling.*
- [ ] **The thermal filter is a 1/6 copy scaled up.** It is cheap, and it
      is also blurry, and the blur is the point of the filter. *Cost: a
      second implementation, and a decision about which one the photo
      gets.*
- [ ] **A test suite for the parts that do not need a camera.** The filter
      registry (every entry has a drawing path, every id is unique) and the
      drawing functions against a synthetic face are both testable in Node
      with a stub canvas, and they are the parts that break silently. A
      lens that throws is a lens that does nothing. *Cost: a day, and a
      fake canvas.*
- [ ] **A budget for the photo path.** The photo is a full-canvas
      per-pixel pass at 1080 wide, and on a slow phone the shutter can
      take a second. How long it takes is not measured anywhere.
      *Cost: a number and a ceiling, and the ceiling is the interesting
      part.*
- [ ] **A quality profile per device.** The photo is 1080 wide and the
      video is 720 at 30 fps on every device, so a slow phone records a
      slow film and a fast one is not using what it has. Measure the
      first few frames and pick. *Cost: a measurement and a table.*

## Deliberately not doing

- **No server, no account, no upload.** Everything stays on the device
  and that is the whole promise of the app.
- **No analytics.** A camera app that measures you is a camera app that is
  looking at something else.
- **No binary art.** The icons are SVG and everything else is drawn by
  code, like the rest of the repository.
- **No dependencies.** The MediaPipe engine is vendored instead, which is
  15 MB in the repository and zero requests at runtime.
- **No cloud fallback for the engine.** There used to be one, for a partial
  deploy. It means the app reaches the internet when it should not, and the
  only version worth shipping is the one where the engine is always local.

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
  are the parts that would be worth testing first — it is the first item
  under *Quality and performance*.
