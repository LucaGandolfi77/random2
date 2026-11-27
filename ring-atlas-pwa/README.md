# Ring Atlas — Ring Puzzle

Ring Atlas è un PWA originale di ring puzzle. Ruota anelli concentrici, allinea le fessure e apri il nucleo di ogni costellazione.

Il progetto riprende meccaniche generali dei puzzle di anelli, ma **non usa marchi, asset, testi, suoni o livelli di giochi esistenti**.

## Come si gioca

1. Seleziona un anello.
2. Trascinalo orizzontalmente o usa i pulsanti per ruotarlo.
3. Porta tutte le fessure in alto.
4. Il livello termina quando il nucleo si apre.

## Contenuti

- **100 livelli** in 10 atlanti
- Da 3 a 6 anelli
- Da 6 a 10 segmenti per anello
- Anelli collegati con rotazioni opposte
- Anelli bloccati da dipendenze
- Anelli specchio con controlli invertiti
- Soluzioni memorizzate e validate da un solver A*
- Sfida giornaliera deterministica
- Tre stelle in base a mosse e booster

## Booster

- **Annulla** — ripristina l'ultima rotazione
- **Impulso** — ruota automaticamente l'anello selezionato verso l'obiettivo
- **Rimescola** — passa a una configurazione alternativa già validata
- **Suggerimento** — seleziona l'anello della prossima mossa del solver

I booster non sono necessari per completare i livelli.

## Grafica

- Canvas 2D pseudo-3D
- Anelli metallici pastello
- Fessure luminose
- Nucleo centrale animato
- Campo stellare procedurale
- Particelle di allineamento
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
- Solver A* in `src/solver.js`
- 100 configurazioni validate in `src/level-data.js`
- Renderer isolato in `src/render.js`
- Audio Web Audio in `src/audio.js`
- Storage locale in `src/storage.js`
- Service worker con cache namespace `ring-atlas-*`

```text
ring-atlas-pwa/
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
# apri http://localhost:8099/ring-atlas-pwa/
```

Test:

```bash
node --test ring-atlas-pwa/tests/*.test.mjs
node ring-atlas-pwa/scripts/validate-levels.mjs
node ring-atlas-pwa/smoke.mjs http://localhost:8099/ring-atlas-pwa/
```

Lo smoke test usa il client DevTools della repository e si salta automaticamente se Chromium non è disponibile.

Per rigenerare le icone PNG senza dipendenze:

```bash
python3 ring-atlas-pwa/scripts/gen-icons.py
```
