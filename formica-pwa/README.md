# FORMICA

Un `.io` del formicaio su un tavolo di legno.

> **Camminare dipinge. Di notte, qualcuno viene a riprendersi il tavolo.**

Sei una colonia di formiche. Ogni formica che cammina depista feromone: le
celle del tavolo diventano tue, la classifica misura quanto legno hai
conquistato, e le briciole che trascini al nido si trasformano in nuove
formiche. Quando cala la notte, le colonie nemiche marciano.

## La regola da cui pende tutto

Il territorio è una griglia di celle feromone (`owner` + `strength`):

- **Neutro** → si conquista al primo passaggio
- **Tuo** → si mantiene (cappato a 1.4, così non esplode)
- **Nemico** → si ruba, ma a metà velocità del neutro

E tutte le celle **decadono**: il proprio cala piano, quello confinante con
il nemico cala più in fretta. Un territorio abbandonato si scioglie da solo —
quindi possedere non basta, va mantenuto. Rubare è sempre più lento che
dipingere sul neutro: la conquista costa.

## Giocare

| Input | Azione |
|---|---|
| Trascina (mouse / dito) | Guida la colonia — camminare dipinge |
| Secondo dito / tasto SCATTO / `Spazio` / `Shift` | Scatto: brucia briciole, velocità ×1.6 |
| Frecce / `WASD` | Sterza (desktop) |

## Il ciclo

1. **Dipingi** — la testa e le formiche in coda depongono feromone; più
   formiche, più coda, più tavolo al secondo
2. **Nutri** — tocca una briciola per prenderla (resta sulla testa), portala
   al nido per depositarla. Ogni 7 punti di briciole depositate = +1 formica
   (max 22)
3. **Difendi** — la colonia parcheggiata sul nido è un anello di difesa: le
   formiche d'assalto che entrano nel raggio vengono azzannate e respinte
   prima di toccare il cratere. Una colonia numerosa morde più forte
   (fino a 3 danni per contatto)
4. **Anneti** — azzera una colonia (corpo a corpo o nido distrutto) e il suo
   nido diventa un bottino di briciole-insetto, il suo territorio si sgretola
   verso il neutro

## Le razzie notturne

Di notte (42% di un ciclo da ~108 s) ogni colonia nemica lancia ondate di 5
formiche d'assalto. Le formiche:

- marciano **dritte al nido bersaglio**, con errore e vagabondaggio
- sono veloci solo **sui feromoni del padrone**: fuori dalla loro rete
  rallentano al 55% e vagano di più — i feromoni sono la loro autostrada, e
  tagliar loro la strada dipingendoci sopra è una tattica vera
- annegano nelle gocce come tutti
- nell'anello di difesa perdono 1-3 hp per morso e vengono respinte: 4 hp
  totali, cd 0.22 s

Se una raggiunge il cratere (raggio 40): −24 hp al nido, −30% delle briciole
rubate, e un intervallo di 1.3 s prima che la successiva possa colpire. hp a
zero = colonia annessa dal razziatore. Di giorno il nido si ripara (+2.2/s).

Le colonie nemiche **tornano a casa** quando una razzia marca verso il loro
nido: il tavolo non si svuota, le nemiche imparano.

## Pericoli del tavolo

| Pericolo | Effetto |
|---|---|
| 💧 Goccia | −1 formica, cancella i feromoni in un raggio di 70, evapora e rinasce altrove |
| 🖤 Pozza d'inchiostro | −2 formiche, brucia il territorio attorno a sé, blocca la pittura |
| 🪨 Sasso | Rallenta al 62% (non uccide) |

## Le zone del tavolo

| Zona | Legno | Briciole | Zucchero | Inchiostro |
|---|---|---|---|---|
| **Angolo del Pane** | chiaro | ★★★ | ★ | ★ |
| **Macchia d'Inchiostro** | viola scuro | ★ | ★ | ★★★ |
| **Zona d'Ombra** | marrone spento | ★★ | ★★ | ★ |
| **Tavola Calda** | caldo | ★★ | ★★★ | ★ |

I confini sfumano su 420 px — la tinta del legno si mescola, non taglia.

## Le nemiche

Cinque colonie persistenti, generate da seed e congelate: gli stessi nomi
(`Colonia Rossa_77`, `Colonia Corazzata404`…) ogni sessione. Ognuna è una
miscela di cinque caratteri — **espansione, agricoltura, razzia, difesa,
cautela** — che decide davvero come gioca:

- espansione spinge verso il confine del vicino, non nel vuoto
- agricoltura spazza briciole e le porta a casa
- razzia marcia sui nidi (di notte, e di più se ha un rancore con te)
- difesa torna al nido e ci resta
- cautela evita gocce e inchiostri con sonde lungo la rotta

I **rancori** sopravvivono tra le sessioni (`formica.v1.grudges`): annetti una
colonia e quella ti caccia; se una ti sfonda il nido, la prossima partita
viene a cercarti. I rancori decadono lentamente (×0.985 a partita).

## File

- `index.html` — canvas, HUD (italiano), menu, morte, install prompt
- `styles.css` — legno caldo, safe-area, motion ridotto rispettato
- `src/config.js` — tuning, palette, RNG (mulberry32), wander
- `src/zones.js` — le 4 zone, tinta del legno, giorno/notte
- `src/storage.js` — roster, stats, rancori, impostazioni, publish per l'hub
- `src/world.js` — griglia feromoni, colonie, briciole, pericoli, razzie
- `src/render.js` — camera, grana del legno tileabile, territorio, formiche
- `src/player.js` — input unificato (pointer + tastiera + pad)
- `src/bots.js` — percezione, scelta modalità, sterzata, ciclo di vita
- `src/audio.js` — tutto sintetizzato (niente file)
- `src/ui.js` — HUD, classifica, feed, schermate, banner razzie
- `src/main.js` — loop, stati (menu → partita → spettacolo → morto)
- `tests/sim.test.js` — 65 check headless: `node formica-pwa/tests/sim.test.js`

Zero asset binari, zero build step, zero rete: tutto Canvas 2D + WebAudio,
funziona offline una volta installata.
