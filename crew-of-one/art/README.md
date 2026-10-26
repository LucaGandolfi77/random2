# Art

## Pipeline

1. Concept and direction in `docs/03-art-bible.md`.
2. Aseprite source files in `art/source/`.
3. Export PNG + JSON frames.
4. Pack into an atlas with TexturePacker or a free packer.
5. Copy generated atlas + JSON to `apps/web/public/assets/`.
6. Record every final asset in `ASSET_LEDGER.md`.

## Specs

- Base resolution: 360 × 640.
- Tile: 32 × 32.
- Characters: 32 × 48.
- Palette: 24 colors.
- Filtering: nearest neighbor; 1px atlas padding.

## AI policy

AI may draft moodboards, palettes, UI concepts, and marketing images. Final sprites, tiles, animations, logo, key art, and store screenshots are human-made or commissioned. No final AI-generated art without written human approval and a license review.
