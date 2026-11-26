# Umbra Sort — Color Shift Puzzle

Umbra Sort è un PWA originale di color-sort puzzle. Sposta i blocchi attraverso una fabbrica di luce, portali nei collettori con lo stesso colore e simbolo, e sopravvivi a generatori, ascensori, zone blackout e boss.

Il progetto prende ispirazione dalle meccaniche generali dei puzzle di ordinamento dei blocchi, ma **non usa codice, marchi, testi, suoni, illustrazioni o livelli di giochi esistenti**.

## Come si gioca

1. Trascina un blocco attraverso le celle vuote.
2. Raggiungi il collettore con lo stesso colore e simbolo.
3. Libera spazio prima che i generatori producano nuovi blocchi.
4. Gli ascensori scambiano le righe; i blackout bloccano temporaneamente alcune zone.
5. Le combo ricaricano il prisma: usalo sui blocchi grigi per assegnargli un colore.
6. Nei boss, sopravvivi agli attacchi e completa i collettori prima che la macchina ti fermi.

### Abilità

| Abilità | Effetto |
| --- | --- |
| **Prisma** | Assegna un colore a un blocco grigio |
| **Pulse** | Congela ascensori, generatori e blackout per alcuni secondi |
| **Spinta** | Spinge un blocco adiacente e libera il passaggio |
| **Scansione** | Rivela temporaneamente i blocchi nascosti dal blackout |

Le abilità si ricaricano con le combo e possono essere potenziate con gli ingranaggi.

### Controlli

| Input | Azione |
| --- | --- |
| Drag / touch / mouse / penna | Sposta il blocco selezionato |
| Tap sul blocco + tap su cella adiacente | Movimento alternativo |
| `[` / `]` | Seleziona il blocco precedente / successivo |
| Frecce | Sposta il blocco selezionato |
| `1` / `2` / `3` / `4` | Pulse / Spinta / Scansione / Prisma |
| `H` | Mostra un suggerimento |
| `Z` | Annulla l'ultima mossa |
| `P` / `Esc` | Pausa |

Ogni colore ha anche un simbolo, quindi il gioco non dipende soltanto dalla percezione cromatica.

## Contenuti

- **200 livelli campagna** in dieci aree, approvati da un solver
- **10 livelli speciali** con modificatori e requisiti di sblocco
- **10 livelli boss** con tre fasi e attacchi deterministici
- Blocchi pastello ad alto contrasto su una lavagna scura
- Ascensori, generatori e zone blackout
- Blocchi incolori e prisma ricaricabile
- Ingranaggi, cinque pedine compagno e potenziamenti
- Sfida giornaliera basata su un livello validato
- Punteggio, combo, stelle e record locale
- Undo e suggerimenti
- Salvataggio locale e ripresa della partita
- Audio sintetizzato, senza file audio
- Interfaccia responsive per telefono, tablet e desktop
- Installazione PWA e gioco offline

## Pedine

- **Luma** — mostra il countdown dei blackout
- **Flux** — +1 carica Pulse iniziale
- **Magnete** — +1 carica Spinta ogni tre livelli
- **Tessera** — +10% ingranaggi
- **Prisma** — +1 carica iniziale del prisma

Si equipaggia una pedina alla volta.

## Privacy

- Nessun account
- Nessun tracker
- Nessuna risorsa remota a runtime
- Nessun upload
- Progressi e salvataggi restano in `localStorage`
- Migrazione automatica dai salvataggi v1 a v2

## Architettura

- JavaScript ES modules, Canvas 2D e CSS
- Nessun build step e nessuna dipendenza runtime
- Motore deterministico e senza DOM in `src/engine.js`
- Generazione dei livelli in `src/levels.js`
- Solver di validazione in `src/solver.js`
- Speciali e boss definiti in moduli separati
- Progressione e sblocchi in `src/progression.js`
- Renderer isolato in `src/render.js`
- Audio Web Audio in `src/audio.js`
- Storage versionato in `src/storage.js`
- Service worker con cache namespace `umbra-sort-*`

```text
umbra-sort-pwa/
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
│   ├── levels.js
│   ├── level-seeds.js
│   ├── special-levels.js
│   ├── boss-levels.js
│   ├── progression.js
│   ├── solver.js
│   ├── engine.js
│   ├── render.js
│   ├── audio.js
│   └── storage.js
├── tests/
│   ├── engine.test.mjs
│   ├── levels.test.mjs
│   ├── progression.test.mjs
│   ├── storage.test.mjs
│   └── assets.test.mjs
├── smoke.mjs
└── README.md
```

## Sviluppo

Servi la repository da HTTP:

```bash
python3 -m http.server 8099
# apri http://localhost:8099/umbra-sort-pwa/
```

Test:

```bash
node --test umbra-sort-pwa/tests/*.test.mjs
node umbra-sort-pwa/scripts/validate-levels.mjs
node umbra-sort-pwa/smoke.mjs http://localhost:8099/umbra-sort-pwa/
```

Lo smoke test usa il client DevTools della repository e si salta automaticamente se Chromium non è disponibile.

Per rigenerare le icone PNG senza dipendenze:

```bash
python3 umbra-sort-pwa/scripts/gen-icons.py
```
