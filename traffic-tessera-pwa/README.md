# Traffic Tessera — Traffic Puzzle

Traffic Tessera è un PWA originale di puzzle di parcheggi e smistamento. Seleziona navette, tram e bus colorati, falli scorrere nella loro corsia e portali al terminale corrispondente.

Il progetto usa solo meccaniche generali dei puzzle di traffico: **non usa marchi, asset, testi, suoni o livelli di giochi esistenti**.

## Come si gioca

1. Seleziona un veicolo sulla griglia.
2. Trascinalo lungo la sua direzione, orizzontale o verticale.
3. Raggiungi il bordo nella direzione del terminale dello stesso colore.
4. Smista tutti i veicoli per liberare il distretto.

I veicoli non cambiano corsia. Un bus occupa tre celle, una navetta due. Le celle terminale sono riservate e i blocchi di cemento sono ostacoli permanenti.

## Contenuti

- **100 livelli** in 10 distretti
- Griglie da 6×6 a 8×8
- Da 6 a 13 veicoli
- Navette e bus lunghi
- Terminali multipli per colore
- Corsie a senso unico e terminali che richiedono di arrivare fino al bordo
- Blocchi di cemento
- Simboli distintivi per ogni colore
- Soluzioni memorizzate e validate da un solver A*
- Sfida giornaliera deterministica
- Tre stelle in base a mosse e booster

I parcheggi di base sono costruiti inserendo i veicoli in ordine inverso di uscita. Le regole speciali vengono poi applicate e ogni configurazione è verificata dalle regole e dal solver, che deve trovare almeno un riposizionamento nei livelli oltre il tutorial.

## Booster

- **Annulla** — ripristina l'ultima mossa
- **Carro attrezzi** — rimuove un veicolo bloccato
- **Rimescola** — passa a una configurazione alternativa già validata
- **Suggerimento** — seleziona il veicolo della prossima mossa del solver

I booster non sono necessari per completare i livelli.

## Grafica e controlli

- Canvas 2D con vista dall'alto
- Veicoli pastello con simboli e finestre distintivi
- Terminali luminosi e griglia urbana
- Particelle di uscita e movimento interpolato
- Touch, mouse e tastiera
- Simboli accessibili su veicoli e terminali
- Modalità movimento ridotto

Scorciatoie: frecce per muovere, Invio per uscire, Q/E per cambiare veicolo, U per annullare, H per suggerimento, P per pausa.

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
- Service worker con cache namespace `traffic-tessera-*`

```text
traffic-tessera-pwa/
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
# apri http://localhost:8099/traffic-tessera-pwa/
```

Test:

```bash
node --test traffic-tessera-pwa/tests/*.test.mjs
node traffic-tessera-pwa/scripts/validate-levels.mjs
node traffic-tessera-pwa/smoke.mjs http://localhost:8099/traffic-tessera-pwa/
```

Lo smoke test usa il client DevTools della repository e si salta automaticamente se Chromium non è disponibile.

Per rigenerare le icone PNG senza dipendenze:

```bash
python3 traffic-tessera-pwa/scripts/gen-icons.py
```
