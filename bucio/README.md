# 🕳️ BUCIO — *divora tutto*

Sei un **buco nero low-poly** caduto dal cielo su **Portomarina**, una
cittadina italiana schiacciata tra la collina e il mare. Hai 120 secondi per
divorarla: gelati, vespette, ombrelloni, barche, turisti, palazzi… e i tuoi
quattro rivali.

Installabile, offline, su desktop e telefono. Nessun asset binario nel bundle:
tutta la grafica è procedurale e tutto l'audio è sintetizzato.

> 📈 **Prossimo passo:** piano per aggiungere account, login e livelli →
> [PLAN-ACCOUNTS-LIVELLI.md](PLAN-ACCOUNTS-LIVELLI.md)

---

## Gioca

```bash
npm install
npm run dev      # http://localhost:5173
```

Build di produzione (PWA completa, pronta da pubblicare):

```bash
npm run build    # -> dist/
npm run preview  # verifica la build, incluso il service worker
```

La cartella `dist/` è statica: si può servire da qualsiasi hosting
(GitHub Pages, Netlify, Cloudflare Pages, un banalissimo `python -m http.server`).

## Comandi

| Azione | Tastiera | Mouse | Touch | Gamepad |
|---|---|---|---|---|
| Muovi | `WASD` / frecce | punta e tiri | joystick | stick sinistro |
| Ondata di gravità | `Spazio` | — | tasto ◉ | `A` |
| Pausa | `P` / `Esc` | — | — | — |
| Muto | `M` | — | — | — |

Parametro utile per provare la grafica: `?q=low`, `?q=med`, `?q=high`.

## Le due modalità

Si scelgono dal menu (e restano scelte: `?m=continente` per provarle al volo).

| | 🏙️ Città | 🌍 Continente |
|---|---|---|
| Mappa | 108 di semi-lato | **194** — quasi doppia, ~4600 oggetti |
| Durata | 120 s | 180 s |
| Morso a un rivale | perde il 38% della massa e scappa | **è eliminato per sempre** |
| Chi viene morso | torna subito in partita | sparisce dalla mappa e dalla classifica dei vivi |
| Fine | allo scadere del tempo | allo scadere **o** quando rimane un buco solo |

In Continente i rivali sono anche più coraggiosi: ti vengono a cercare invece di
aspettarti, e con un po' di vantaggio in meno (il 15% di massa invece del 30%)
puoi divorarli — perché in un continente inseguire un rivale deve valere la
corsa. Se ti prendono, la partita finisce lì.

## Come funziona

- **Divori tutto ciò che è più piccolo di te.** Ogni oggetto ha una massa: più
  ne mangi, più cresci, e la camera si allontana mostrando sempre più paese.
- **Cresci con rendimenti decrescenti** (`r = 1.15 · massa^0.42`) e arrivi a
  un tetto di ~15 m: oltre non cresci più, ma continui a mangiare (a metà
  punti, perché a quel punto la partita si decide fra rivali).
- **I quattro rivali** hanno un cervello a stati (caccia / fuga / caccia-rivali
  / vagabondaggio), memoria del bersaglio e un'interfaccia di pancia: dopo
  aver divorato qualcuno non ti ricacca subito.
- **Se sei più grosso** puoi mangiare un buco rivale e fregagli metà dei
  punti; se ti morde perdi il 34% della massa e viene respinto.
- **L'Oro** (gelato gigante, statua del Nettuno, bus turistico) vale 500 punti
  e sparisce dopo 16 secondi.
- La città **si ricostruisce** da sola: quello che divori torna dopo qualche
  secondo, quindi la partita non si sposa mai.

### Le quattro fasi

| Livello | Da | Cosa sblocchi |
|---|---|---|
| 1 · Ossetto | 0 m | sei appena caduto dal cielo |
| 2 · Fame | 2.3 m | +20% punti |
| 3 · Attrazione | 4.2 m | risucchi roba quasi troppo grande |
| 4 · Boccone | 6.6 m | divorare i rivali vale il triplo |
| 5 · Ondata | 9.6 m | onda di gravità (`Spazio`) |

## Struttura

```
src/
├─ main.js            bootstrap, stato di gioco, loop
├─ pwa.js             service worker, prompt d'installazione, wake lock
├─ styles.css         tutta la UI (HUD, menu, risultati)
├─ core/
│  ├─ engine.js       renderer, preset di qualità, loop
│  ├─ input.js        tastiera, mouse, touch, gamepad
│  ├─ audio.js        effetti sonori sintetizzati (WebAudio)
│  └─ utils.js        RNG deterministico, matematica, storage
├─ world/
│  ├─ layout.js       la mappa di Portomarina: riva, strade, piazza, confini
│  ├─ terrain.js      terreno, spiaggia, mare, schiuma, marciapiedi
│  ├─ sky.js          cupola a gradiente, nuvole, luci
│  ├─ palette.js      colori e materiali condivisi
│  ├─ geometry.js     primitive low-poly e fusione delle geometrie
│  ├─ props.js        catalogo di 35 oggetti (vespe, palazzi, barche…)
│  └─ propworld.js    InstancedMesh, griglia spaziale, divoramento, respawn
├─ game/
│  ├─ modes.js        modalità: dimensione mondo, durata, regole del morso
│  ├─ hole.js         il buco: crescita, input, onde, tier
│  ├─ ai.js           cervello dei rivali
│  ├─ director.js     timer, regole, scontri, oro, classifica
│  ├─ camera.js       inseguimento e zoom
│  └─ effects.js      particelle, onde d'urto, numeri che salgono
└─ ui/                hud.js · screens.js · joystick.js
```

## Test

```bash
npm test    # smoke test headless: mondo grande, knockout, partite complete
```

Simula il gioco senza render e verifica che il Continente sia davvero più
grande, che i rivali divorati spariscano, che l'ultimo buco in piedi chiuda la
partita e che la modalità Città sia rimasta identica a prima.

### Perché è veloce

- Ogni tipo di oggetto è **una geometria fusa e un `InstancedMesh`**:
  ~1.800 oggetti in ~30 draw call.
- Gli oggetti mangiati non vengono cancellati: si spegne l'istanza e la
  città li ricrea in un altro punto.
- Una **griglia spaziale** ( celle da 12 m ) risponde a "cosa c'è vicino al
  buco?" sia per il giocatore sia per l'IA.
- I palazzi hanno una griglia di occupazione separata: condividere quella di
  sedie e lampioni non lascerebbe spazio per costruire niente.
- Tre preset di qualità (Alta / Media / Bassa) che cambiano densità,
  pixel ratio e ombre.

## PWA

- Service worker con precache e aggiornamento automatico.
- Manifest con icone normali e *maskable*, due screenshot, tema scuro.
- Prompt "Installa BUCIO" (e suggerimento dedicato su iOS).
- Funziona offline, wake lock durante la partita, feedback aptico.

## Personalizzare

- **Mappa**: `src/world/layout.js` (dimensioni, riva, strade, piazza, spawn).
- **Oggetti e pesi**: `src/world/props.js` (`mass` = quanto ingrassa, `count`
  = quanti in città, `zone` = dove compaiono).
- **Difficoltà**: gli `skill` dei rivali sono in `src/main.js`.
- **Colori**: `src/world/palette.js`.
- **Icone e key-art**: `npm run icons` (SVG → PNG con sharp).

## Crediti

Tutto generato da codice: `three.js` per il rendering, geometrie e suoni
scritti a mano. Nessuna immagine, nessun file audio, nessun font esterno.