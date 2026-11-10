# Chunked runtime payload

Il viewer non carica un unico `city.json` da decine di MB. La pipeline
`generate` scrive un payload gerarchico in `data/processed/city/` e lo copia in
`web/public/data/`:

| File | Contenuto | Caricamento |
| --- | --- | --- |
| `manifest.json` | metadati, statistiche, quartieri, indice dei chunk | subito |
| `world.json` | terreno, ortofoto, strade, piazze, arredo | subito |
| `massing.json` | massa LOD1 di tutti gli edifici (tetti compresi) | subito |
| `landmarks.json` | landmark per etichette e schede | subito |
| `detail/chunk_<x>_<z>.json` | descrittori LOD3 completi del chunk | su richiesta |
| `city.json` | fallback monolitico compatto | solo se il chunked payload manca |

Payload dell'ultima esecuzione: 4.585 edifici (4.160 pilot LOD3 + 425
contesto); `manifest.json` 0,13 MB, `world.json` 1,84 MB, `massing.json`
14,6 MB; caricamento iniziale ~16,5 MB (~2,4 MB gzip). I 864 chunk di dettaglio
sommano ~56,5 MB e vengono scaricati solo su richiesta.

## Perché è diviso

- L'area urbana è di circa 5,5 × 5,4 km e contiene migliaia di edifici.
- Il dettaglio LOD3 (aperture, cornici, balconi, persiane, negozi, portali)
  pesa molto più della massa LOD1.
- `massing.json` permette di mostrare subito l'intera città; i chunk di
  dettaglio vengono scaricati solo intorno al giocatore.

## Chunk

- Dimensione figlia: **120 m** (`rendering.chunk_size_m`).
- Dimensione padre: **480 m** (`rendering.parent_chunk_size_m`).
- Ogni edificio dentro la bbox pilot ha `detail: "pilot"` e un campo `chunk`.
- Gli edifici nel buffer di contesto hanno `detail: "context"` e `chunk: null`;
  non ricevono descrittori LOD3 ma entrano nei batch LOD1 padre/figlio.
- Il viewer costruisce subito un batch LOD1 per ogni chunk padre da 480 m, che
  contiene tutti gli edifici (pilot e contesto). Quando la camera si avvicina,
  il padre viene sostituito dai chunk figli da 120 m; i figli mostrano il loro
  batch LOD1 finché il file di dettaglio non è pronto, poi passano a LOD3.
- Gli edifici nel buffer di contesto non hanno un file di dettaglio: restano
  sempre al livello LOD1 del chunk figlio (o del padre, se lontani).

## Streaming e cache

`web/src/viewer/lod-manager.ts`:

1. costruisce subito tutti i batch LOD1;
2. ordina i chunk vicini per distanza;
3. scarica al massimo 1–2 chunk di dettaglio alla volta;
4. tiene visibile il LOD1 finché il chunk LOD3 non è pronto;
5. mantiene al massimo 24 chunk dettagliati su desktop e 12 su mobile;
6. rilascia geometrie e cache oltre il limite.

Preset qualità (`rendering.detail_radius_m`):

| Preset | Raggio LOD3 | Uso |
| --- | --- | --- |
| Alta | 200 m | desktop |
| Media | 140 m | mobile / GPU integrate |
| Bassa | 0 m | solo LOD1, utile su reti lente |

Il preset è selezionabile nel pannello controlli del viewer.

## Rigenerazione

```bash
python -m fidenza_recon.cli fetch
python -m fidenza_recon.cli analyze
python -m fidenza_recon.cli generate
npm run data:sync
```

`generate` cancella e riscrive `data/processed/city/` e la cartella
`web/public/data/detail/`, così i chunk vecchi non restano appesi.
