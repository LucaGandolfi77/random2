# Umbra Sort — Color Shift Puzzle

Umbra Sort è un PWA originale di color-sort puzzle. Sposta i blocchi attraverso una fabbrica di luce, portali nei collettori con lo stesso colore e simbolo, e sopravvivi a generatori, ascensori e zone blackout.

Il progetto prende ispirazione dalle meccaniche generali dei puzzle di ordinamento dei blocchi, ma **non usa codice, marchi, testi, suoni, illustrazioni o livelli di giochi esistenti**.

## Come si gioca

1. Trascina un blocco attraverso le celle vuote.
2. Raggiungi il collettore con lo stesso colore e simbolo.
3. Libera spazio prima che i generatori producano nuovi blocchi.
4. Gli ascensori scambiano le righe; i blackout bloccano temporaneamente alcune zone.
5. Le combo ricaricano il prisma: usalo sui blocchi grigi per assegnargli un colore.

Non tutti i livelli hanno un limite di mosse. Le aree avanzate possono introdurre sfide più rigide.

### Controlli

| Input | Azione |
| --- | --- |
| Drag / touch / mouse / penna | Sposta il blocco selezionato |
| Tap sul blocco + tap su cella adiacente | Movimento alternativo |
| `[` / `]` | Seleziona il blocco precedente / successivo |
| Frecce | Sposta il blocco selezionato |
| `H` | Mostra un suggerimento |
| `Z` | Annulla l'ultima mossa |
| `P` / `Esc` | Pausa |

Ogni colore ha anche un simbolo, quindi il gioco non dipende soltanto dalla percezione cromatica.

## Contenuti

- 100 livelli deterministici in cinque aree
- Ascensori, generatori e zone blackout
- Blocchi incolori e prisma ricaricabile
- Sfida giornaliera con seed condiviso
- Punteggio, combo, stelle e record locale
- Undo e suggerimenti
- Salvataggio locale e ripresa della partita
- Audio sintetizzato, senza file audio
- Interfaccia responsive per telefono, tablet e desktop
- Installazione PWA e gioco offline

## Privacy

- Nessun account
- Nessun tracker
- Nessuna risorsa remota a runtime
- Nessun upload
- Progressi e salvataggi restano in `localStorage`

## Architettura

- JavaScript ES modules, Canvas 2D e CSS
- Nessun build step e nessuna dipendenza runtime
- Motore deterministico e senza DOM in `src/engine.js`
- Generazione dei livelli in `src/levels.js`
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
├── scripts/gen-icons.py
├── src/
│   ├── main.js
│   ├── config.js
│   ├── levels.js
│   ├── engine.js
│   ├── render.js
│   ├── audio.js
│   └── storage.js
├── tests/
│   ├── engine.test.mjs
│   ├── levels.test.mjs
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
node umbra-sort-pwa/smoke.mjs http://localhost:8099/umbra-sort-pwa/
```

Lo smoke test usa il client DevTools della repository e si salta automaticamente se Chromium non è disponibile.

Per rigenerare le icone PNG senza dipendenze:

```bash
python3 umbra-sort-pwa/scripts/gen-icons.py
```
