# Fumetti — Sentinelle

An offline comic reader and two original Italian superhero noir issues:

- **#1 — La città senza luci**: four blackouts, three young heroes, and a man
  who steals the light of Milan.
- **#2 — L'uomo senza ombra**: a stage magician without a shadow starts
  collecting Milan's shadows, and the memories that come with them.

Vanilla JavaScript, Canvas 2D, no dependencies, no external images, no build
step.

- Two complete issues, each with its own cover, bookmark and resume state
- Page-by-page reader: swipe, arrows, Page Up/Down, Space, Home/End
- Reading progress saved on the device and resumed from either issue card
- Full transcript dialog for accessibility and low-light reading
- Every panel painted procedurally (city, characters, rain, halftone, ink)
- Real DOM lettering: selectable, screen-reader friendly, never baked into a canvas
- Installable PWA with a versioned service-worker precache
- Optional page-turn sound synthesised with Web Audio

## Read it

```bash
python3 -m http.server 8080
# open http://localhost:8080/fumetti-pwa/
```

Each issue is data in `src/issues/`. Adding another means adding a module and
one entry in `src/comics.js`; the shelf builds its card and the reader picks up
pages, layouts, balloons and credits from the same schema.

## Files

`index.html`, `styles.css`, `src/` (`main`, `reader`, `art`, `art-core`,
`art-backgrounds`, `art-characters`, `art-fx`, `comics`, `progress`, `issues/`),
`manifest.json`, `service-worker.js`, `icons/`, `tests/`.

## The issues

### #1 — La città senza luci

1. **Rooftops** — Milan, 02:13, the city stops blinking.
2. **Capolinea 1** — four blackouts, no faults, and a voice in the dark.
3. **The depot** — three rules, three powers, a trail of black glass.
4. **Porta Volta** — the man who steals light, and knows their names.
5. **Niguarda, 2019** — the night Ettore Valli stayed in the dark.
6. **One thread** — Volt recharges the grid, Muro holds the storm, Luce gathers the city.
7. **Dawn** — the lights return, the newspapers find a name.
8. **Bar Centrale** — coffee, a donation, and a man with no shadow.

### #2 — L'uomo senza ombra

1. **Galleria** — a volunteer steps forward, and her shadow does not come back.
2. **Niguarda** — the city starts forgetting names and faces.
3. **Linea gialla** — a chase along the metro walls, and a 1987 playbill.
4. **Teatro Ombra** — Silvio Ombra's last performance, and the theft of Marta's shadow.
5. **Casa Neri** — photographs, projectors and the effort to remember a father.
6. **L'ultimo spettacolo** — the Galleria crowd turns its phone lights into a memory.
7. **Alba** — the shadows return, and one shadow does not belong to anyone.
8. **Bar Centrale** — coffee, a new writing on the wall, and a promise.

## Test

```bash
npm test
```

The suite validates both issues against the art vocabulary, the manifest icons,
the service-worker precache and the independent progress save/load contract.
