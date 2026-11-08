# Original asset workspace

This build ships with zero external art or audio files. Characters, arenas, UI artwork, music and sound effects are generated at runtime:

- Fighters: procedural Three.js low-poly rigs (`src/app/render/fighterModels.ts`).
- Stages: procedural Three.js sets (`src/app/render/StageView.ts`).
- Music/SFX: Web Audio API synthesis (`src/audio/AudioEngine.ts`).
- UI: CSS, HTML and generated canvas textures.

The folders below are reserved for future hand-authored assets:

- `characters/` — optional original GLB fighters. Load with `src/fighters/visuals/glbModelLoader.ts`.
- `stages/` — optional original GLB stage props or environments.
- `audio/` — optional open-licensed music/SFX. Document every license.
- `textures/` — optional original textures.
- `ui/` — optional original logo/portrait assets.

Do not add assets from Nintendo, other commercial fighters, or unlicensed sources. If you add third-party assets, update the Licenses section of the root README.
