# Duomo HD — asset sorgente

`duomo-hd.bin` e `duomo-hd.json` sono la versione compressa del modello 3D del
Duomo di San Donnino fornito per il progetto. **Non vengono più caricati dal
gioco**: restano come riferimento di colore e sorgente offline per la palette e
le texture del Duomo low-poly solido.

Il file sorgente `idol-seed42-262144-3b8df9a4.ply` **non viene pubblicato**:
resta un sorgente locale, escluso dal repository e dalla cache PWA. Il PLY è una
nuvola Gaussian Splatting da 262.144 splat (circa 17,8 MB), non una mesh con
facce.

## Formato dell'asset compresso

`fidenza-splat-v1`, little endian, 20 byte per splat:

| Byte | Tipo | Significato |
| --- | --- | --- |
| 0-3 | float32 | `x` |
| 4-7 | float32 | `y` (base a 0) |
| 8-11 | float32 | `z` |
| 12-14 | uint8 | `r`, `g`, `b` |
| 15 | uint8 | opacità |
| 16-19 | float32 | dimensione lineare dello splat |

Il gioco usa il **Duomo low-poly solido** e applica colori/texture procedurali
derivati dalle zone illuminate di questo modello. La palette è definita in
`js/landmarks.js` (`DUOMO_*`). Il binario non viene precachato né richiesto a
runtime.

Caratteristiche dell'asset corrente:

- **260.305 splat** (1.839 filtrati per opacità troppo bassa);
- **5,21 MB**;
- bbox normalizzato **0,69 × 0,98 × 0,95**;
- asse Y invertito rispetto al PLY originale, così la base è a `y = 0`;
- record ordinati per `x` crescente (ordine back-to-front per la vista dalla
  piazza, conservato nel sorgente);
- la facciata è sul lato **+X** del modello.

## Rigenerazione

Il convertitore legge il PLY locale e riscrive binario e metadati:

```bash
node tools/build-duomo-splat.mjs
```

È possibile passare un input o un output diverso:

```bash
node tools/build-duomo-splat.mjs \
  --input assets/3d/idol-seed42-262144-3b8df9a4.ply \
  --out assets/3d/duomo-hd.bin
```

## Provenienza

La rappresentazione 3D del Duomo è stata fornita dall'autore del progetto per
l'integrazione nel gioco. Il PLY sorgente non è ridistribuito in questo
repository; l'asset compresso è pubblicato solo come parte del gioco.
