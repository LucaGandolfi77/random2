# Pixel Ants: Eat the Picture

A portrait-first pixel-erosion puzzle. Load any photo and the game turns it into a wall of 540, 2,160, 4,860 or 8,640 coloured pixels. Send a bucket of ants to the exposed edge and they carry pixels home one at a time. Every theft leaves a hole, and every hole opens a new route deeper into the picture.

An original browser game about erosion, routes and a very patient colony. No assets or code from another game are used.

## How to Play

1. **Load a colour.** Tap a palette colour to put its bucket on the rail. Ants crawl out to the exposed border and each bites one matching pixel, preferring the outermost available ring before moving deeper.
2. **Open the picture.** Stolen pixels leave permanent holes on a neutral substrate. Pixels beside a hole become exposed, so the picture erodes inward from all four sides. There is no gravity and no sharp photo underneath.
3. **Empty the frame.** A bucket closes when it fills, when its colour is gone, or when you tap it to recall. The picture is complete only when every pixel has reached a bucket and every ant has come home.

A colour with no exposed pixel is **walled in**. It waits until another bucket opens a route to its edge. There is no timer and no fail state — only the order in which you dig.

### Controls

| Input | Action |
| --- | --- |
| Tap a palette cup | Send ants for that colour |
| Tap a bucket on the rail | Recall it; its ants finish their trip |
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

### Pixel Count

| Detail | Grid | Pixels | Feel |
| --- | ---: | ---: | --- |
| Coarse | 20 x 27 | 540 | Big bites, broad shapes, a quick run |
| Standard | 40 x 54 | 2,160 | The original grain and the balanced run |
| Fine | 60 x 81 | 4,860 | A finer picture with longer routes and a longer run |
| Ultra | 80 x 108 | 8,640 | The sharpest wall and the longest campaign |

Every size keeps the picture's 20:27 portrait shape. Bucket capacity and ant
limits scale with the wall, so a fine picture is not just a slower crawl.

### Difficulty

| Mode | Colours | Buckets on the rail |
| --- | ---: | ---: |
| Calm | 4 | 4 |
| Classic | 6 | 4 |
| Dense | 8 | 5 |

In Classic and Dense there are fewer rails than colours, so at least one colour has to wait. Recall a bucket to bring in another.

## Your Photo Stays Yours

- Decoding, cropping, quantizing and playing happen entirely in the browser.
- There is no upload, no fetch, no tracker and no account.
- The last custom picture is remembered as a 360 x 486 JPEG thumbnail and its pixel count in `localStorage` (`pixel-ants-last-image`) so it can be played again. **Forget my saved photo** in the menu removes it.
- Invalid, huge or undecodable files fail with a message instead of breaking the game.

The 3:4 center crop is intentional: the picture frame is portrait. The full photo is never resized up or sent anywhere.

## How the Image Becomes a Puzzle

1. The photo is center-cropped to 3:4 and scaled to 600 x 810.
2. It is sampled down to the chosen grid: 20 x 27, 40 x 54, 60 x 81 or 80 x 108. Cells stay square on the 600 x 810 picture.
3. Median cut plus a few k-means iterations in CIE Lab reduce the cells to 4, 6 or 8 colours.
4. Near-duplicate and rare colours are merged, then the palette is refilled by splitting the widest cluster. A monochrome upload becomes a set of tonal variants, so it is still playable.
5. A 3 x 3 majority filter removes single-cell speckle, keeping regions readable.
6. The board marks only pixels on the outer edge as exposed. Stealing one clears the cell and exposes any occupied orthogonal neighbours, so the cleared region grows inward. There is no gravity: holes stay where they were bitten.
7. Ants pathfind through the empty cells and around the outside of the frame. Each ant reserves a target, carries exactly one pixel back to its bucket, and then the target is gone for good.

Every colour also carries a number and a pattern (stripe, dots, cross, chevron, ring) on the cups and buckets, so the game does not rely on colour vision alone.

## Features

- Four-sided pixel erosion with permanent holes and route opening, worked from the outermost ring inward
- Four pixel counts (540, 2,160, 4,860 or 8,640) with matching bucket and ant limits
- Any local image as the picture and the palette
- Bucket ants that pathfind, reserve targets and carry one pixel each
- Recallable buckets; carried pixels are never lost
- Deterministic levels: the same picture and seed behave the same way
- 1–3 stars based on elapsed time plus idle ant-seconds
- Best score and stars per built-in picture and per custom image hash, tracked separately at each pixel count
- Run history through the shared `../shared/arcade.js` stats layer
- Offline install, safe-area-aware portrait layout, reduced-motion support
- Sound and haptics through the shared arcade settings
- Synthesized WebAudio effects, no audio files

## Technical Details

- Vanilla JavaScript ES modules, Canvas 2D and CSS. No build step and no dependencies.
- Fixed-step engine in `src/engine.js`; it has no DOM and is tested in Node.
- `src/board.js` owns exposure, reservations and stealing. `src/path.js` is a small BFS pathfinder over the holes and the outside ring.
- The renderer in `src/render.js` is stateless with respect to the rules. It paints one scene canvas: mosaic, substrate, rails, buckets, ants and effects. Cell size is derived from the selected grid, so every pixel count shares the same code.
- Quantization in `src/quantize.js` is pure and deterministic.
- Photograph handling is isolated in `src/image-import.js`.
- The service worker precaches the whole shell, including every ES module.

### File Structure

```
pixel-ants-pwa/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── icons/
│   ├── icon-192.svg
│   └── icon-512.svg
├── src/
│   ├── main.js          # boot, menus, input, persistence, audio
│   ├── engine.js        # buckets, ants, carrying, scoring, stars
│   ├── board.js         # exposed edge, holes, reservations
│   ├── path.js          # BFS over holes and the outside ring
│   ├── quantize.js      # lab colour, median cut, k-means, smoothing
│   ├── image-import.js  # decode, crop, board build, recent thumbnail
│   ├── artworks.js      # four procedural source pictures
│   └── render.js        # mosaic, substrate, ants, buckets, effects
├── tests/
│   ├── quantize.test.mjs
│   ├── board.test.mjs
│   ├── path.test.mjs
│   ├── engine.test.mjs
│   ├── resolution.test.mjs
│   └── assets.test.mjs
├── smoke.mjs
└── README.md
```

## Development

Serve the repository root with any static server, then open `/pixel-ants-pwa/`:

```bash
python3 -m http.server 8080
# http://localhost:8080/pixel-ants-pwa/
```

Do not open `index.html` through `file://`: ES modules and the service worker need an HTTP origin.

Run the tests:

```bash
node --test pixel-ants-pwa/tests/*.test.mjs
node pixel-ants-pwa/smoke.mjs http://localhost:8080/pixel-ants-pwa/
```

The smoke test skips itself when Playwright is not installed.
