# Arrow Foundry — Arrow Puzzle

Arrow Foundry è un PWA originale di arrow puzzle. Ogni freccia indica una direzione; può uscire dalla fabbrica solo quando il percorso verso il bordo è libero.

Il progetto riprende meccaniche generali degli arrow puzzle, ma **non usa marchi, asset, testi, suoni o livelli di giochi esistenti**.

## Come si gioca

1. Tocca una freccia.
2. Se il percorso nella sua direzione è libero, la freccia esce dalla griglia.
3. Se incontra un muro, un'altra freccia o una porta chiusa, non può uscire.
4. Completa il livello rimuovendo tutte le frecce.

## Contenuti

- **100 livelli** in 10 fabbriche
- Griglie da 5×5 a 8×8
- Da 12 a 46 frecce
- Muri e ostacoli
- Porte pneumatiche collegate a frecce chiave
- Frecce pesanti da colpire due volte
- Soluzioni memorizzate e validate da un solver A*
- Sfida giornaliera deterministica
- Tre stelle in base a mosse e booster

## Booster

- **Annulla** — ripristina l'ultima mossa
- **Scansione** — evidenzia le frecce attualmente rimovibili
- **Martello** — rimuove una freccia anche se bloccata
- **Suggerimento** — mostra la prossima mossa del solver

I booster non sono necessari per completare i livelli.

## Grafica

- Griglia industriale scura
- Frecce pastello con simboli direzionali
- Animazioni di uscita
- Porte pneumatiche animate
- Particelle e ingranaggi
- Modalità movimento ridotto

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
- Solver A* con stati BigInt in `src/solver.js`
- 100 configurazioni validate in `src/level-data.js`
- Renderer isolato in `src/render.js`
- Audio Web Audio in `src/audio.js`
- Storage locale in `src/storage.js`
- Service worker con cache namespace `arrow-foundry-*`

```text
arrow-foundry-pwa/
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
# apri http://localhost:8099/arrow-foundry-pwa/
```

Test:

```bash
node --test arrow-foundry-pwa/tests/*.test.mjs
node arrow-foundry-pwa/scripts/validate-levels.mjs
node arrow-foundry-pwa/smoke.mjs http://localhost:8099/arrow-foundry-pwa/
```

Lo smoke test usa il client DevTools della repository e si salta automaticamente se Chromium non è disponibile.

Per rigenerare le icone PNG senza dipendenze:

```bash
python3 arrow-foundry-pwa/scripts/gen-icons.py
```
