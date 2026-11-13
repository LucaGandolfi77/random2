# Coverage audit — OSM footprints vs built-up surface

Generated: 2026-11-10T16:39:29+00:00

Confronto tra l'edificato rilevato dal DSM 2008 (nDSM > 3.5 m, NDVI < 0.08) e le impronte
OpenStreetMap attuali. Non è un rilevamento automatico di edifici:
evidenzia **candidati da verificare**, non necessariamente edifici mancanti.

## Esito

- Superficie costruita stimata: **2.47 km²**
- Coperta da impronte OSM: **56.9%**
- Candidati grezzi (componenti ≥ 50.0 m²): **3190**, per **0.72 km²**
- Candidati prioritari (area ≥ 400 m², distanza OSM ≥ 8 m, conferma DBTR o forma compatta): **40**, per **0.13 km²**

## Per quartiere

| Quartiere | Edificato km² | Coperto % | Candidati | Area candidati m² |
| --- | ---: | ---: | ---: | ---: |
| centro | 0.31 | 64.4 | 349 | 91069 |
| monica | 0.21 | 46.3 | 236 | 82615 |
| sanlazzaro | 0.21 | 49.5 | 215 | 112243 |
| azalee | 0.44 | 59.5 | 514 | 103297 |
| corea | 0.47 | 65.2 | 581 | 91028 |
| luce | 0.54 | 51.7 | 836 | 166666 |
| coduro | 0.29 | 53.3 | 459 | 70284 |

## Candidati principali

| Area m² | Quartiere | Centro locale (x,z) | Distanza OSM m | DBTR UVL |
| ---: | --- | --- | ---: | --- |
| 61986 | sanlazzaro | 1158, 204 | 64.4 | h=9.0 m |
| 8731 | azalee | 1686, 44 | 64.0 | h=8.0 m |
| 8698 | luce | -1615, 281 | 211.3 | no |
| 5259 | sanlazzaro | 750, 142 | 49.8 | h=17.0 m |
| 5164 | monica | 1226, -1659 | 196.3 | no |
| 3510 | centro | -246, -223 | 43.5 | h=8.0 m |
| 3196 | corea | 1354, 1206 | 45.3 | h=9.0 m |
| 2833 | corea | 190, 1210 | 67.0 | h=9.0 m |
| 2555 | sanlazzaro | 851, 297 | 31.6 | h=17.0 m |
| 2537 | luce | -281, 375 | 32.9 | h=11.0 m |
| 2350 | centro | 249, 55 | 11.1 | h=13.0 m |
| 1713 | azalee | 1806, 404 | 27.4 | no |
| 1663 | centro | 10, 218 | 12.1 | h=12.0 m |
| 1649 | centro | 179, 177 | 20.3 | h=9.0 m |
| 1644 | monica | 557, -222 | 55.7 | h=10.0 m |
| 1193 | monica | 1072, -1371 | 141.7 | no |
| 885 | luce | -497, 1966 | 225.9 | no |
| 818 | monica | 450, -154 | 16.8 | no |
| 804 | luce | -1752, 269 | 227.8 | no |
| 747 | coduro | 1891, 1856 | 50.0 | no |

## Limiti dell'audit

1. Il DSM è del **2008**: edifici costruiti dopo non possono essere rilevati.
2. Il confronto è pixel-based: piccoli disallineamenti OSM/DSM producono
   falsi candidati; l'impronta OSM è bufferizzata di 2 m.
3. Alberi alti con NDVI anomalo, pensiline, muri e manufatti industriali
   possono entrare nella maschera dell'edificato.
4. Il DBTR UVL è un controllo indipendente del 2008, non una verifica
   catastale aggiornata.

Mappa: `docs/screenshots/08-coverage-gaps.png`.
