# Prism Blocks — Color Block Puzzle

Prism Blocks è un PWA originale di block puzzle. Posiziona i pezzi geometrici su una griglia 8×8, completa righe e colonne e costruisci combo.

Il progetto riprende meccaniche generali dei block puzzle, ma **non usa marchi, asset, testi, suoni o livelli di giochi esistenti**.

## Come si gioca

1. Trascina un pezzo dal vassoio alla griglia.
2. In alternativa, seleziona un pezzo e tocca la cella di destinazione.
3. Usa **Ruota** per cambiare l'orientamento.
4. Righe e colonne complete vengono cancellate insieme.
5. Cancellazioni consecutive aumentano la combo.
6. La partita termina quando nessuno dei tre pezzi può essere posizionato.

## Modalità

- **Endless** — partita libera con record locale
- **Giornaliero** — sfida deterministica che cambia ogni giorno
- **30 sfide** — obiettivi progressivi a stelle, con sblocco sequenziale

Obiettivi disponibili:

- Numero di linee completate
- Punteggio minimo
- Numero di pezzi posizionati

## Controlli

| Input | Azione |
| --- | --- |
| Drag / touch / mouse / penna | Sposta il pezzo sulla griglia |
| Tap sul pezzo + tap sulla griglia | Posizionamento alternativo |
| `1` / `2` / `3` | Seleziona uno dei tre pezzi |
| `R` | Ruota il pezzo |
| Frecce | Sposta l'ancora della tastiera |
| `Invio` | Piazza il pezzo sull'ancora |
| `U` | Annulla |
| `H` | Suggerimento |
| `P` / `Esc` | Pausa |

## Caratteristiche

- Griglia 8×8
- Dieci forme di pezzo con due orientamenti
- Cancellazione simultanea di righe e colonne
- Bonus di intersezione e combo
- Undo limitato
- Suggerimenti intelligenti
- 30 sfide validabili tramite bot
- Sfida giornaliera deterministica
- Grafica pastello e audio sintetizzato
- Simboli oltre ai colori per l'accessibilità
- Salvataggio locale e ripresa della partita
- PWA offline con icone PNG e maskable

## Privacy

- Nessun account
- Nessun tracker
- Nessuna risorsa remota a runtime
- Progressi e salvataggi restano in `localStorage`

## Architettura

- JavaScript ES modules, Canvas 2D e CSS
- Nessun build step e nessuna dipendenza runtime
- Motore deterministico in `src/engine.js`
- Generazione dei pezzi in `src/pieces.js`
- Livelli e seed in `src/levels.js`
- Renderer isolato in `src/render.js`
- Audio Web Audio in `src/audio.js`
- Storage locale in `src/storage.js`
- Service worker con cache namespace `prism-blocks-*`

```text
prism-blocks-pwa/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── icons/
├── scripts/gen-icons.py
├── src/
│   ├── main.js
│   ├── config.js
│   ├── pieces.js
│   ├── levels.js
│   ├── engine.js
│   ├── render.js
│   ├── audio.js
│   └── storage.js
├── tests/
│   ├── engine.test.mjs
│   ├── levels.test.mjs
│   ├── storage.test.mjs
│   └── assets.test.mjs
├── smoke.mjs
└── README.md
```

## Sviluppo

Servi la repository da HTTP:

```bash
python3 -m http.server 8099
# apri http://localhost:8099/prism-blocks-pwa/
```

Test:

```bash
node --test prism-blocks-pwa/tests/*.test.mjs
node prism-blocks-pwa/smoke.mjs http://localhost:8099/prism-blocks-pwa/
```

Lo smoke test usa il client DevTools della repository e si salta automaticamente se Chromium non è disponibile.

Per rigenerare le icone PNG senza dipendenze:

```bash
python3 prism-blocks-pwa/scripts/gen-icons.py
```
