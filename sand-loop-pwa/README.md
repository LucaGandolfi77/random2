# Sand Loop: Color Sort Puzzle

A portrait-first colour-sort puzzle where the picture itself is the sand. Load any photo and the game turns it into a mosaic of coloured grains. Buckets ride a loop, the hopper pours one colour at a time, and every grain you catch takes a cell from the bottom three rows. The cells above fall one row, so the sharp photo is revealed from the top until the whole picture is back.

An original browser implementation inspired by sand-sort puzzles. No assets or code from the original game are used.

## How to Play

1. **Load the colour.** The hopper pours a single colour. Tap that colour in the tray and a bucket rides the loop into place. The loop turns automatically. Dimmed colours are buried and will surface as the picture drops.
2. **Keep the loop stocked.** A bucket fills and leaves on its own. Load another before the next run, and tap a bucket to recycle it if the loop is full.
3. **Clear the picture.** A matching bucket takes a cell from the three bottom rows. The cells above drop one row and the photo is revealed from the top. Sand that misses falls into the spill tray. Fill the tray and the run ends.

There is no timer. Pause whenever you like. The only pressure is the spill tray.

### Controls

| Input | Action |
| --- | --- |
| Tap a palette cup | Put a bucket of that colour on the loop |
| Tap a bucket on the loop | Recycle it (the sand already caught is kept) |
| `1`–`8` | Deploy the matching palette colour |
| `Esc` / `P` | Pause or resume |
| `M` | Mute / unmute |

## Pictures

Four built-in pictures are drawn procedurally at runtime, so the repository still ships no binary art:

- **Dune Sunset** — warm ridges and a low sun
- **Koi Pond** — slow fish under dark water
- **Alpine Bloom** — snow, stone and a meadow
- **Paper Moth** — ink, rust and warm paper

You can also load a JPG, PNG, WebP, AVIF, GIF (first frame) or BMP by picking a file, dropping it on the page, or pasting it from the clipboard.

### Difficulty

| Mode | Colours | Buckets on the loop |
| --- | ---: | ---: |
| Calm | 4 | 4 |
| Classic | 6 | 5 |
| Dense | 8 | 6 |

The loop always holds one fewer bucket than there are colours in Classic and Dense, so something has to wait in the tray.

## Your Photo Stays Yours

- Decoding, cropping, quantizing and playing happen entirely in the browser.
- There is no upload, no fetch, no tracker and no account.
- The last custom picture is remembered as a 360 x 480 JPEG thumbnail in `localStorage` (`sand-loop-last-image`) so it can be played again. **Forget my saved photo** in the menu removes it.
- Invalid, huge or undecodable files fail with a message instead of breaking the game.

The 3:4 center crop is intentional: the artwork frame is portrait. The full photo is never resized up or sent anywhere.

## How the Image Becomes a Puzzle

1. The photo is center-cropped to 3:4 and scaled to 600 x 800.
2. It is sampled down to a 60 x 80 grid of cells.
3. Median cut plus a few k-means iterations in CIE Lab reduce the cells to 4, 6 or 8 sand colours.
4. Near-duplicate and rare colours are merged, then the palette is refilled by splitting the widest cluster. A monochrome upload becomes a set of tonal variants, so it is still playable.
5. A 3 x 3 majority filter removes single-cell speckle, keeping the sand regions readable.
6. The board stores the picture as one bottom-up stack per column. A capture may only take a cell from the three bottom rows; the cells above fall one row, the top becomes empty and the sharp photo shows through.

Every colour also carries a number and a pattern (stripe, dots, cross, chevron, ring) on the cups, so the game does not rely on colour vision alone.

## Features

- Loop-and-bucket sand sorting with continuous falling sand
- Any local image as the artwork and the palette
- Progressive reveal of the original photo
- Deterministic levels: the same picture and seed behave the same way
- 1–3 stars based on how much sand reaches the tray
- Best score and stars per built-in picture and per custom image hash
- Run history through the shared `../shared/arcade.js` stats layer
- Offline install, safe-area-aware portrait layout, reduced-motion support
- Sound and haptics through the shared arcade settings
- Synthesized WebAudio effects, no audio files

## Technical Details

- Vanilla JavaScript ES modules, Canvas 2D and CSS. No build step and no dependencies.
- Fixed-step engine in `src/engine.js`; it has no DOM and is tested in Node.
- The renderer in `src/render.js` is stateless with respect to the rules.
- Quantization in `src/quantize.js` is pure and deterministic.
- Photograph handling is isolated in `src/image-import.js`.
- The service worker precaches the whole shell, including every ES module.

### File Structure

```
sand-loop-pwa/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── icons/
│   ├── icon-192.svg
│   └── icon-512.svg
├── src/
│   ├── main.js          # boot, menus, input, persistence, audio
│   ├── engine.js        # pour, loop, buckets, spill, score
│   ├── board.js         # bottom-up columns, gravity, reveal progress
│   ├── quantize.js      # lab colour, median cut, k-means, smoothing
│   ├── image-import.js  # decode, crop, board build, recent thumbnail
│   ├── artworks.js      # four procedural source pictures
│   └── render.js        # art, sand, loop, buckets, effects
├── tests/
│   ├── quantize.test.mjs
│   ├── board.test.mjs
│   ├── engine.test.mjs
│   └── assets.test.mjs
├── smoke.mjs
└── README.md
```

## Development

Serve the repository root with any static server, then open `/sand-loop-pwa/`:

```bash
python3 -m http.server 8080
# http://localhost:8080/sand-loop-pwa/
```

Do not open `index.html` through `file://`: ES modules and the service worker need an HTTP origin.

Run the tests:

```bash
node --test sand-loop-pwa/tests/*.test.mjs
node sand-loop-pwa/smoke.mjs http://localhost:8080/sand-loop-pwa/
```

The smoke test skips itself when Playwright is not installed.
