# Pipeline Blender — Fidenza realistica v4.1

Questa cartella contiene gli script che ricostruiscono Fidenza come modello 3D
PBR e lo esportano in un GLB per Three.js.

## Flusso

Dalla root di `fidenza-city-v4`:

```bash
# 1. Dati effettivi (override editor + altezze Arnis), come li applica il gioco
node tools/export-render-data.mjs

# 2. Modellazione, texture, AO bake ed export con Blender 5.3 headless
BLENDER="/Volumes/PortableSSD/Programs/Blender.app/Contents/MacOS/Blender"
"$BLENDER" -b --python tools/blender/build_blender_city.py -- \
  --data data/render-city.json \
  --terrain data/terrain.json \
  --map data/map.json \
  --out assets/3d/blender-city \
  --ao-samples 16 --preview
```

Il bake AO in vertex color richiede qualche minuto (Cycles CPU, ~16 sample).
Per iterazioni rapide usare `--no-ao`: l'AO viene approssimato in base
all'altezza. `--preview` genera `preview-realistic.png`, una vista dall'alto
di controllo.

## Script

- `textures.py`: genera albedo + normal map **procedurali** 256×256 con
  `mathutils.noise` (mattoni, intonaco, pietra, cemento, tegole, asfalto,
  pavimentazione, erba, campo, legno, acqua). Nessun asset esterno. Scrive
  anche un atlas 4×4 di riferimento, non usato dalla runtime.
- `build_blender_city.py`: costruisce terreno, strade con marciapiedi e
  cordoli, zebra, aree, corsi d'acqua, binari, 4.214 edifici con finestre,
  porte, persiane, balconi, cornicioni, comignoli e tetti, alberi a chioma
  organica. Ogni faccia ha UV own-world e un materiale dedicato con texture.
- `build_landmarks.py`: costruisce 10 landmark PBR come nodi separati
  (`landmark-<id>`), posizionati da `map.json`.
- Finestre in tre gruppi (`finestre-warm/cool/dark`), tende, neve sui tetti
  (`neve-tetti`) e mesh LOD (`quartiere-*-hi` / `-lo`).

## Output

- `fidenza-realistic.glb`: ~22 MB, **Draco compresso**, unico file. Contiene
  una mesh per materiale e un nodo `finestre` separato per le luci notturne.
- `manifest.json` (versione 2): punta al GLB e indica `windowObject: "finestre"`.
- `textures/*.png`: le texture procedurali usate (embed date nel GLB).
- I vecchi 8 GLB low-poly restano come fallback della manifest v1.

## Coordinate

I dati di gioco usano Three.js: `x` e `z` a terra, `y` in alto. Blender è Z-up
e l'exporter glTF converte in Y-up. Ogni punto viene scritto in Blender come
`(x, -z, y)`; dopo l'export Three.js legge `(x, y, z)`.

## Runtime

- `js/blender-world.js` carica il GLB con `GLTFLoader` + `DRACOLoader`
  (decoder in `vendor/draco/`) e restituisce `windowMeshes`.
- `js/world.js` assegna `this.windowMeshes` e pilota colore + emissive delle
  finestre nel ciclo giorno/notte. Il materiale delle finestre è clonato per
  non illuminare tutta la città.
- Le parti del gameplay (collisioni, minimappa, missioni, quartieri,
  traffico) leggono sempre `data/city.json`: il GLB è solo il livello visivo.
- `?legacy=1` ripristina la città procedurale v3 con ortofoto.
