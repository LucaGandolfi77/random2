# The Library — A Collection of Melancholic Visual Novels

A PWA anthology of literary classics adapted as contemplative visual novels. Each story explores the deepest questions of human existence: guilt, redemption, memory, art, faith, and time.

## Works in the Library (26)

**The Classics (12)** — each opens with a playable bilingual scene inside the anthology, then links to its standalone PWA:

- **Les Miserables** (Victor Hugo) — justice, redemption, the enduring human spirit
- **Crime and Punishment** (Fyodor Dostoevsky) — guilt, conscience, the possibility of forgiveness
- **A la recherche** (Marcel Proust) — involuntary memory, lost time, art as recovery
- **The Brothers Karamazov** (Fyodor Dostoevsky) — faith, doubt, freedom, suffering
- **Divina Commedia** (Dante Alighieri) — Hell, Purgatory, Paradise, transcendence
- **The Trial** (Franz Kafka) — the absurd, guilt without crime, unknown justice
- **Anna Karenina** (Leo Tolstoy) — love, fate, society, the cost of freedom
- **Death of Ivan Ilyich** (Leo Tolstoy) — mortality, the meaning of a correct life
- **The Picture of Dorian Gray** (Oscar Wilde) — beauty, art, moral decay
- **Invisible Cities** (Italo Calvino) — imagination, memory, the inferno of the living
- **Notes from Underground** (Fyodor Dostoevsky) — isolation, consciousness as disease
- **The Bible** (Scripture) — creation, covenant, prophecy, redemption, revelation

**The Multiverse (14)** — alternative realities of the classics, playable entirely inside the anthology:

Cyber-Paris 2089 · Crime: The Data Heist · Recherche: Lost in the Feed · Karamazov: The AI Brothers · Anna Karenina: The Algorithm · Death: The Digital Legacy · Invisible Cities: The Network · The Trial: The Mirror · The Trial: Algorithmic Justice · Divina: The Galaxy · Recherche: The Archive · Crime: The Echo · Anna Karenina: The Mirror · Divina: The Simulation

## Dialogue Scenes

Every work has a bilingual dialogue scene (`src/scenes.js`), played in the built-in reader:

- Lines advance by tap, click, Space, Enter or →; Escape returns to the library
- Each scene ends with a branching choice; choices move the work's stats — **Memory, Melancholy, Art** — and are logged as notes
- After the choice, a reply passage and an outro line close the scene
- The language switch (Italiano / English) works live inside the reader
- Finishing a scene marks the work as **read** on its library card and advances the "Scenes read" counter; progress persists on the device
- The classics offer an "Open the full story" link to their **Act II scene** — every book PWA now plays a continuation scene of its own (The Factory Door, The Cana of Galilee, Acheron, The Attic Offices, The Race, The Black Sack, The Confession of Basil, Euphemia, Liza), built on the shared reader `shared/scene-reader.js`
- Language choice is shared between the anthology and the book PWAs

## How to Play

Select a work from the library — a dialogue scene opens immediately. You can return to the library at any time to explore another story. All works are fully bilingual (English / Italian) and work completely offline once installed.

## Technical Details

- PWA with service worker, manifest, responsive design
- Scene engine: `src/scenes.js` (data) + reader in `src/main.js`
- Statistics tracking: Memory, Melancholy, Art (per work and cumulative)
- Synthesized audio, canvas-based visuals
- No external dependencies; shared arcade.js library
- Device-local save and notes

Based on the same PWA architecture as SECTOR 7, this library is a complete, offline-capable, installable anthology — a digital library of contemplative literature, now with playable scenes for every work.
