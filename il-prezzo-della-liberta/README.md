# IL PREZZO DELLA LIBERTÀ

> Parigi, inverno 2000. Dopo nove anni di carcere, un uomo torna in una città che non lo aspetta.
> Una bambina, una musicassetta, una porta che resta aperta.

Cortometraggio animato 3D low-poly interamente procedurale, realizzato con Three.js e TypeScript.
Durata: **10:25** — 6 atti, 12 ambienti, 106 battute, 102 inquadrature.

## Avvio

Requisiti: Node.js 20+ e un browser con WebGL.

```bash
npm install
npm run dev
```

Aprire `http://localhost:5173` e premere **Guarda il film**.

Build di produzione:

```bash
npm run build
npm run preview
```

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Avvia Vite in sviluppo |
| `npm run build` | Build statica in `dist/` |
| `npm run preview` | Anteprima della build |
| `npm run typecheck` | Controllo TypeScript (`tsc --noEmit`) |
| `npm run test` | Test Vitest (timeline, determinismo, scene, camera, sottotitoli, score) |
| `npm run timeline:emit` | Rigenera `data/timeline.json` da `data/script.it.json` |

## Controlli

- **Spazio**: play / pausa
- **← / →**: cerca di 5 secondi; con **Shift** di 30 secondi
- **C**: sottotitoli on/off
- **F**: schermo intero
- **Esc**: chiude il pannello regolazioni
- Trasporto: ricomincia, atto precedente/successivo, selezione atto, velocità 0.5×–1.5×
- Regolazioni: volumi separati per musica, ambiente e dialoghi; dimensione sottotitoli S/M/L; voci sintetiche on/off
- **Esporta SRT**: scarica i sottotitoli italiani con timecode
- La UI scompare automaticamente in modalità cinema e riappare al movimento del mouse

## Come è fatto

Il film è una **funzione deterministica del tempo**: `Director.apply(t)` ricostruisce scena, attori, camera, luci, sottotitoli e cue audio a partire dai dati. Non esiste stato accumulato: un seek all'indietro ricostruisce esattamente la stessa immagine.

- `data/script.it.json` — sceneggiatura master a beat (`line`, `hold`, `action`) con dialoghi, pose e movimenti.
- `data/timeline.json` — timeline compilata e verificata dai test: tempi assoluti, battute, inquadrature, eventi.
- `data/camera.json` — definizioni delle inquadrature (posizione, sguardo, FOV, easing, handheld).
- `data/lights.json` — palette per atto e override per ambiente.
- `src/scene/builders/` — i 12 ambienti procedurali: carcere, boulangerie, ufficio di collocamento, Belleville, Gare du Nord, cabina telefonica, viale notturno, métro, corridoio e stanza d'ospedale, lavanderia, strada all'alba.
- `src/characters/` — rig umanoidi low-poly e cast (Étienne, Renaud, Mina, Aïcha, Madame Rose, comparse).
- `src/animation/` — pose analitiche, camminata, interpolazione dei movimenti e resolver delle cue.
- `src/audio/` — motore Web Audio con bus master/musica/ambiente/SFX, riverbero generato, strumenti procedurali (piano, archi, pad, fisarmonica, basso) e ambience per ambiente.
- `src/subtitles/` — cue, wrapping a massimo due righe, vista sottotitoli ed export SRT.
- `src/ui/` — title screen, trasporto, regolazioni, modalità cinema, end card.

### Dialoghi e voci

Le battute sono in italiano e sempre sottotitolate. Se il sistema/browser dispone di una voce `it-IT`, i dialoghi vengono anche letti con Web Speech API, con intonazione diversa per personaggio; musica e ambiente si abbassano durante le battute. Se non esiste una voce italiana, il film resta completamente godibile tramite i sottotitoli e la UI lo segnala.

La colonna sonora, gli ambienti e gli effetti sono sintetizzati a runtime: il progetto non dipende da file audio esterni.

## Struttura

```
il-prezzo-della-liberta/
├── data/
│   ├── script.it.json      # fonte master
│   ├── timeline.json       # generato da timeline:emit
│   ├── camera.json
│   └── lights.json
├── public/assets/          # struttura asset (tutto è generato a runtime)
├── src/
│   ├── animation/  audio/  camera/  characters/  core/
│   ├── data/  lighting/  scene/  screenplay/  subtitles/  ui/  utils/
│   ├── main.ts
│   └── styles.css
├── tests/
├── tools/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Verifica

La suite controlla: compilazione deterministica, durata 8–12 minuti, continuità di atti e scene, copertura delle inquadrature, coerenza dei sottotitoli e dell'SRT, ricostruzione dello stato dopo seek all'indietro, costruzione headless dei 12 ambienti e dei personaggi, determinismo della camera e della palette luci, score procedurale.

```bash
npm run typecheck
npm run test
npm run build
```

## Note e limiti

- Richiede WebGL; senza accelerazione grafica il film non parte.
- Le voci sintetiche dipendono dal sistema operativo e dal browser: presenza, timbro e durata variano. La sincronizzazione autoriale è affidata ai sottotitoli.
- Gli asset visivi e sonori sono generati in codice; `public/assets/` è predisposta per eventuali sostituzioni future ma non contiene media esterni.
- Il montaggio è pensato per una visione continua; il seek è esatto e deterministico, ma il parlato TTS non viene risincronizzato a metà battuta dopo un salto.

---

Scritto e realizzato come progetto autonomo. Nessun materiale, personaggio o brano de *I Miserabili* è utilizzato: temi e archetipi sono trasposti in una storia originale ambientata nel 2000.
