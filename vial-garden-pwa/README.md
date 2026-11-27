# Vial Garden — Water Sort Puzzle

Vial Garden è un PWA originale di water-sort puzzle. Ordina le tinture nelle fiale, completa ogni colore e fai fiorire un giardino botanico.

Il progetto riprende meccaniche generali dei water-sort puzzle, ma **non usa marchi, asset, testi, suoni o livelli di giochi esistenti**.

## Come si gioca

1. Seleziona una fiala piena.
2. Seleziona una destinazione vuota oppure con lo stesso colore in cima.
3. La sequenza continua dello stesso colore viene versata automaticamente.
4. Completa tutte le fiale con un solo colore ciascuna.

## Contenuti

- **100 livelli** in 10 giardini
- Da 4 a 8 colori
- Fiale con capacità di 4 unità
- Soluzioni memorizzate e validate da un solver A*
- Sfida giornaliera deterministica
- Tre stelle in base a mosse e booster
- Undo limitato
- Rimescola con stato risolvibile
- Fiala extra
- Suggerimenti calcolati dal solver

## Grafica

- Fiale di vetro disegnate in Canvas
- Tinture pastello
- Animazioni di versamento
- Particelle al completamento dei colori
- Simboli oltre ai colori per l'accessibilità
- Movimento ridotto opzionale

## Privacy

- Nessun account
- Nessun tracker
- Nessuna risorsa remota a runtime
- Progressi e salvataggi restano in `localStorage`

## Architettura

- JavaScript ES modules, Canvas 2D e CSS
- Nessun build step e nessuna dipendenza runtime
- Regole pure in `src/rules.js`
- Motore in `src/engine.js`
- Solver A* in `src/solver.js`
- 100 configurazioni validate in `src/level-data.js`
- Renderer isolato in `src/render.js`
- Audio Web Audio in `src/audio.js`
- Storage locale in `src/storage.js`
- Service worker con cache namespace `vial-garden-*`

```text
vial-garden-pwa/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── icons/
├── scripts/
│   ├── gen-icons.py
│   └── validate-levels.mjs
├── src/
│   ├── main.js
│   ├── config.js
│   ├── rules.js
│   ├── levels.js
│   ├── level-data.js
│   ├── solver.js
│   ├── engine.js
│   ├── render.js
│   ├── audio.js
│   └── storage.js
├── tests/
│   ├── rules.test.mjs
│   ├── solver.test.mjs
│   ├── engine.test.mjs
│   ├── storage.test.mjs
│   └── assets.test.mjs
├── smoke.mjs
└── README.md
```

## Sviluppo

Servi la repository da HTTP:

```bash
python3 -m http.server 8099
# apri http://localhost:8099/vial-garden-pwa/
```

Test:

```bash
node --test vial-garden-pwa/tests/*.test.mjs
node vial-garden-pwa/scripts/validate-levels.mjs
node vial-garden-pwa/smoke.mjs http://localhost:8099/vial-garden-pwa/
```

Lo smoke test usa il client DevTools della repository e si salta automaticamente se Chromium non è disponibile.

Per rigenerare le icone PNG senza dipendenze:

```bash
python3 vial-garden-pwa/scripts/gen-icons.py
```
