# ❄️ DOTTOR GELO — Il Giardino di Metallo

> *Costruisci androidi. Addestra i tuoi figli. Affronta i Buoni. Impara a lasciare andare.*

Un **idle tycoon narrativo 3D low-poly** ambientato nel laboratorio sotterraneo
del Dottor Gelo. Costruisci e potenzia dieci stanze, crea cyborg, assegnane uno
a ogni impianto, addestrali, mandali contro i Buoni di Dragon Ball e scegli che
cosa fare quando il laboratorio comincia a cadere a pezzi.

La storia è malinconica e parla di lutto, paternità e cose che non si possono
ricostruire. Non è un power fantasy: è un gioco sulla difficoltà di lasciare
andare.

> **Fan game non ufficiale e non commerciale.** Nessun asset, logo, musica,
> doppiaggio o modello ufficiale. Tutta la grafica è generata proceduralmente
> con Three.js. I nomi restano dei rispettivi proprietari.

---

## Gioca

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # simulazione pura, senza browser
npm run build    # icone + Vite + PWA -> dist/
npm run preview  # verifica la build e il service worker
```

Installabile su Android/iOS dalla home screen. Dopo il primo caricamento
funziona offline. Nessuna pubblicità, nessun acquisto in-app, nessun server,
nessun tracker.

---

## Il loop

- **Energia:** il Reattore produce MW, ogni stanza ne consuma. Se il laboratorio
  assorbe più di quanto produce, la produzione cala e le luci diventano rosse.
  Puoi mettere una stanza in standby o potenziare il Reattore.
- **Produzione:** Fonderia → Rottami, Sala Circuiti → Circuiti, Incubatrice →
  Cellule. La Fonderia è la prima catena; la Sala Circuiti si sblocca con la
  Fonderia al livello 2; l’Incubatrice con la Sala Circuiti al livello 2.
- **Costruzione:** le stanze sigillate si aprono usando risorse; ogni stanza ha
  15 livelli e 5 stadi visivi. Ai livelli 5, 10 e 15 sblocchi i moduli.
- **Cyborg:** creati da progetti o da telaio + nucleo, con tratti casuali.
  Hanno Forza, Precisione, Sintesi e Lealtà, un rango, un livello e un affetto.
  Assegnane uno come supervisore a una stanza: se è la sua stanza preferita, il
  bonus cresce.
- **Addestramento:** la Sala Addestramento apre postazioni e programmi. Ogni
  programma aumenta una statistica e l’affetto. A livelli 5/10/15/20/25 puoi
  aumentare il rango con Cellule e Circuiti.
- **Protocollo Silenzio:** dopo il capitolo 5 puoi cancellare la memoria di un
  cyborg per ottenere potenza di combattimento. La storia se ne ricorda.
- **Collaudi:** l’Arena affronta i Buoni in scontri automatici. Serve potenza
  sufficiente; il Sovraccarico dà +20% a un collaudo e poi va in ricarica.
- **Spedizioni:** 15 minuti, 1 ora o 4 ore. Continuano anche a app chiusa.
- **Eco di memoria:** un bagliore appare nel laboratorio. Toccalo per ottenere
  una manciata di produzione e una piccola frattura nella routine.
- **Prestige:** la Sala Memoria permette di riavvolgere il nastro. Perdi
  laboratorio, risorse e livelli; mantieni storia, finali, frammenti e albero
  dei Ricordi. Gelo lo ha già fatto altre volte.

Cap offline: 4 ore base, fino a 12 ore con il Pozzo e l’albero dei Ricordi.
La produzione offline è al 50%, al 100% con il nodo “Turno automatico”.

---

## La storia

Dodici capitoli, tre scelte importanti, tre finali. La narrazione si sblocca
con traguardi di produzione, aree, addestramento e collaudi. Il Diario resta
consultabile. Le scelte non si cancellano con il prestige.

- **Gevo**, il figlio perduto di Gelo, è il centro di tutto.
- **Sedici** è costruito a sua immagine e rifiuta di combattere.
- **Vento** e **Neve** se ne vanno senza rompere niente.
- **Cell/Omega** è la “perfezione” che divora il laboratorio.
- I **Buoni** non sanno di esistere. È questo che fa più male.

Finali: **La neve**, **Il giardino**, **L’eterno**.

Contiene temi di lutto, perdita di un figlio e isolamento.

---

## Struttura

```
src/
├── main.js          bootstrap, loop, azioni, storia, salvataggi
├── data.js          aree, cyborg, nemici, capitoli, finali, memoria
├── sim.js           simulazione pura: economia, potenza, offline, prestige
├── ui.js            DOM, pannelli, HUD, minimappa, storia
├── styles.css       tutta la UI
├── pwa.js           service worker, install prompt, wake lock
├── core/
│   ├── engine.js    renderer, qualità, loop
│   ├── audio.js     drone, ninna nanna, effetti WebAudio
│   ├── input.js     pan, pinch, tap
│   └── utils.js     numeri, formattazione, vibrazione
└── world/
    ├── lab.js       diorama, stanze, supervisori, battaglie, eco
    ├── models.js    modelli low-poly procedurali
    ├── materials.js palette e materiali condivisi
    ├── camera.js    camera ortografica isometrica
    ├── fx.js        particelle a pool
    └── minimap.js   minimappa 2D dai dati delle stanze
```

`sim.js` non importa Three.js né tocca il DOM: i test Node giocano la stessa
economia del browser. `world/` è l’unico strato che conosce Three.js.

---

## Test

```bash
npm test
```

Coprono: stato iniziale, catena di sblocco, sovraccarico energetico,
produzione, offline, addestramento, incubazione, campagna, trigger narrativi,
scelte, finali, prestige, albero dei Ricordi, spedizioni, sanitizzazione del
salvataggio e assenza di NaN dopo un’ora simulata.

---

## Qualità e mobile

- Camera ortografica isometrica, nessuna rotazione libera.
- Tre preset grafici (Alta/Media/Bassa) con DPR, ombre e particelle diverse.
- Geometrie statiche per stanza, materiali condivisi, particelle a pool.
- Pausa del loop quando la scheda è nascosta; gestione della perdita del
  contesto WebGL.
- `prefers-reduced-motion` rispettato dalla UI.
- Salvataggio in `localStorage` con autosave, export/import e fallback su
  salvataggio corrotto.
