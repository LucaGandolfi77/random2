# OSM2World spike — 1 km² Duomo tile

Esperimento per capire se OSM2World può migliorare il renderer attuale. Non è
un'integrazione: è un confronto controllato su un tile di 1 km² intorno al Duomo.

## Setup

- OSM2World `0.5.0-SNAPSHOT` (build latest, Java 17+; testato con Java 25).
- Input: **1.079 edifici** del tile locale `[-500, -500, 500, 500]`.
- XML OSM generato dai dati del progetto e arricchito con:
  - `height`, `min_height`
  - `building:levels`
  - `roof:shape`, `roof:height`
  - `roof:colour`, `building:colour`
  - `roof:material`, `building:material`
- Strade escluse dalla conversione di confronto per isolare gli edifici.
- Comando:
  ```bash
  java -jar OSM2World.jar convert \
    -i duomo-buildings-topo.osm \
    -o duomo-buildings-topo.glb \
    --lod=3 --config=standard.properties
  ```

## Risultati

| Metrica | Valore |
|---|---:|
| Edifici di input | 1.079 |
| Tempo di conversione | ~2,4 s |
| GLB prodotto | ~10 MB |
| Mesh | 3.229 |
| Vertici | 103.237 |
| Facce | 42.581 |

Il modello è stato caricato in Three.js per il confronto visivo:
`docs/screenshots/09-osm2world-spike.png`.

## Cosa mostra il confronto

OSM2World:

- genera correttamente volumi, altezze e alcune forme di tetto;
- usa colori e materiali dai tag;
- gestisce molto bene la topologia delle way chiuse;
- ma il risultato è **massa semplice**, senza il nostro sistema di facciate:
  finestre, persiane, balconi, cornici, negozi, portali, pluviali.

Il viewer attuale:

- ha facciate procedurali molto più ricche;
- ha PBR, normal/roughness/AO, SSAO/SMAA;
- ha ground streaming, LOD gerarchico, crossfade, mappa quartieri, inspector,
  collisioni, modalità foto ed export GLB;
- usa altezze DSM−DTM, tetti e colori da ortofoto RER.

## Perché non sostituire il viewer

- **Tag OSM insufficienti**: solo 87 edifici su 4.585 hanno un tag 3D; 0 hanno
  `building:part`, `height`, `min_height` o `roof:height`.
- **Nessuna facciata reale**: OSM2World non inventa texture di facciata dove non
  ci sono immagini street-level.
- **Perdita di funzionalità**: player, collisioni, inspector, mappa, foto,
  streaming e provenance sono nel nostro viewer.
- **Doppia pipeline**: Java + glTF/3D Tiles + Three.js da mantenere.

## Dove può essere utile

1. **Benchmark/QA** su tetti e corpi edilizi.
2. **Building parts**: quando avremo `building:part`/`min_height` da DBTR UVL o
   segmentazione LiDAR, OSM2World può generare volumi più corretti.
3. **Arredo urbano**: alberi, panchine, lampioni, recinzioni e oggetti rooftop.
4. **3D Tiles**: solo se in futuro servisse uno streaming standardizzato; oggi il
   nostro chunking è più integrato con il gioco.

## Verdetto

OSM2World **non è un sostituto** del viewer attuale e, con i tag OSM di Fidenza,
non migliora il realismo. È utile come **tool di confronto** e, in futuro, come
generatore di parti edilizie dopo l'arricchimento dei dati.

La strada per la fedeltà reale resta:

1. DSM/LAS RER 2023‑24 per tetti e altezze same-epoch;
2. DBTR UVL/FDA per corpi e coperture;
3. Panoramax/street-level per facciate reali;
4. arricchimento OSM con i nostri dati misurati.

## Licenza

Il pacchetto OSM2World scaricato include una licenza MIT-like (vedi
`LICENSE.txt` del pacchetto). Lo stile di default è distribuito separatamente:
verificare la licenza degli asset prima di ridistribuirli.
