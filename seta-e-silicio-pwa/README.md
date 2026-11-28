# SETA E SILICIO — I fili che il tempo non spezza

**Un'avventura narrativa low-poly in cinque episodi. Suzhou, 2032.**

Mei torna a casa dopo tre anni in Occidente. Sua nonna Ah-Xiu, ultima maestra di
ricamo Su a doppio lato, sta perdendo la memoria. Hao-7, un androide pubblico di
cura, ha imparato il dialetto di Suzhou e le storie della nonna. In una città che
mette lanterne e intelligenza artificiale sullo stesso canale, Mei scopre di
poter riavvolgere le conversazioni di pochi minuti: ciò che impara resta, le
scelte possono ricominciare.

- **5 episodi**: alba, piazza, giardino della memoria, pioggia, lanterne.
- **3 finali** determinstici, più un finale comunitario nascosto.
- **Riavvolgimento del dialogo** in stile *Life is Strange*: i fatti restano,
  i flag e le scelte tornano indietro.
- **Esplorazione 3D** in terza persona con WASD/frecce, joystick touch, camera
  cinematografica, hotspot e diario.
- **Low-poly procedurale**: nessun asset binario, nessuna texture esterna.
- **Audio procedurale** Web Audio: pad, guzheng sintetico, pioggia e suono di
  riavvolgimento.
- **PWA offline**, bilingue IT/EN, nessun tracker, nessun dato personale.

**Live:** <https://lucagandolfi77.github.io/random2/seta-e-silicio-pwa/>

---

## Avvio

```bash
cd seta-e-silicio-pwa
npm install
npm run dev        # http://localhost:5176
npm test           # 22 test
npm run build      # typecheck + Vite
npm run preview    # http://localhost:4176
```

Requisiti: Node 20.19+ e un browser con WebGL. La build è statica; `dist/` può
essere servita da qualsiasi server HTTP.

## Comandi

| Comando | Azione |
|---|---|
| `npm run dev` | sviluppo Vite |
| `npm run build` | typecheck + build |
| `npm test` | test Vitest del motore narrativo |
| `npm run preview` | anteprima build |
| `npm run typecheck` | solo TypeScript |

### In gioco

- **WASD / frecce** muovono Mei; **trascina** il mouse per orbitare la camera.
- **E** interagisce con l'hotspot più vicino.
- **R** riavvolge il dialogo (anche dopo una scelta sbagliata).
- **J** apre il diario; **Esc** apre/chiude il menu.
- Su mobile: joystick a sinistra, pulsante **Interagisci**, **Riavvolgi** nel
  dialogo.

## Il motore narrativo

`src/game/engine.ts` è puro e deterministico. Lo stato contiene:

- `facts`: ricordi appresi, **preservati** attraverso il riavvolgimento;
- `flags`: scelte e conseguenze, **ripristinati** al punto precedente al dialogo;
- `completed`: dialoghi conclusi;
- `dialogue` / `lastDialogue`: runtime del dialogo attivo o appena concluso;
- `rewinds`: contatore dei riavvolgimenti;
- `finalChoice`: uno dei tre finali.

Il riavvolgimento usa il `baseFlags`/`baseCompleted` catturato all'inizio del
dialogo. È il cuore del gioco: non si tratta di annullare la conoscenza, ma di
usare ciò che si è imparato per scegliere meglio. I test coprono:

- validità di tutti i link e le scelte della storia;
- ogni dialogo giocabile fino alla fine;
- riavvolgimento con fatti preservati e flag ripristinati;
- sblocco del finale comunitario solo con i ricordi e le alleanze giuste;
- tutti e tre i finali;
- salvataggi validi e localizzazione IT/EN.

## Struttura

```
src/
  data/       personaggi, 5 capitoli, dialoghi, diario, finali, stringhe
  game/       motore narrativo puro, salvataggio localStorage
  world/      scene Three.js, personaggi low-poly, props, acqua, pioggia, audio
  ui/         titolo, HUD, dialogo, diario, menu, finale, cartolina PNG
public/       manifest, service worker, icona SVG
tests/        engine, contenuti, salvataggio
```

## Contesto culturale e nota di intenti

Suzhou, la seta, il ricamo *Su Xiu*, il tè, i ponti, la calligrafia e la
robotica di cura sono elementi reali. Il gioco li usa in una storia di fantasia:
non è un documentario, non parla a nome di un paese e non pretende di spiegare
"l'Oriente" o "l'Occidente" in un'unica voce. Le differenze sono raccontate dal
punto di vista di Mei, una giovane che ha vissuto entrambi i mondi e sta
imparando a scegliere cosa portare con sé.

Il tema centrale non è "tradizione contro tecnologia", ma **chi decide cosa
merita di essere ricordato**: un archivio pubblico, una voce registrata, le mani
di un bambino, una lanterna sul fiume.

## Salvataggi

- `seta.save.v1` — stato della storia.
- `seta.lang.v1` — lingua.
- `seta.sound.v1` — audio on/off.
- Nessun dato lascia il browser.

## Licenze

- Codice e testi: MIT, come il resto del repository.
- Three.js: MIT.
- Arte, personaggi, musica ed effetti: generati a runtime, originali.
- Nessun asset binario, nessuna API, nessun font remoto.
