# Data audit — RER 2023-24, DBTR and street-level imagery

Generated: 2026-11-10T12:41:46+00:00

Audit tecnico della geometria e delle fonti; il fallback DBTR viene
applicato separatamente e non modifica le impronte OSM.

## Esito sintetico

| Fonte | Disponibilità | Uso proposto |
| --- | --- | --- |
| RER 2023-24 DTM 0,5 m | **disponibile** | terreno, quote di base, mesh del viewer |
| RER 2023-24 ortofoto 20 cm | **disponibile** | colore tetti, texture selettiva |
| RER 2023-24 DSM First/Last 0,5 m | **non esposto come servizio pubblico** | richiedere il dato / usare LiDAR classificato |
| DBTR UVL (WMS) | **disponibile** | fallback altezze per edifici senza DSM |
| KartaView | 0 foto nella bbox | nessuna texture di facciata |

## RER 2023-24

- DTM: pixel **0.5 m**, 1 band, formato F32.
- Campione DTM Duomo: `1000×1000` px, quota 70.34–78.92 m.
- Differenza DTM 0,5 m vs DTM 1 m attuale: mediana **0.009 m**, massimo 0.406 m.
- Ortofoto RGB: pixel nativo **0.1999999999929711 m**; NIR: pixel **0.1999999999929711 m**.
- Campione ortofoto 20 cm Duomo: `2500×2500` px, 19.7 MB.

### DSM/LiDAR 2023-24

Il catalogo CKAN pubblica i metadati di **DSM First/Last 0,5 m RER 2023-24**
con licenza CC BY 4.0, ma nel servizio ArcGIS pubblico non compare un
`ImageServer` DSM 2023-24 e il WCS pubblico espone solo il DTM.
Servizi DSM trovati nel catalogo ArcGIS pubblico:

- `public/DSMCosta_Lidar2019`
- `public/DsmAgea2008`

Conclusione: per ottenere un DSM same-epoch serve una **richiesta
all'Archivio Cartografico** oppure il download dei prodotti LiDAR
classificati. Fino ad allora il DSM AGEA 2008 resta la fonte misurata,
con l'incertezza cross-epoch già dichiarata.

## DBTR

- WMS pubblico disponibile; layer trovati: `EDI_Edificio`, `FAB_Cassone_edilizio`, `FDA_Falda`, `NCV_Civico`, `NCV_PROIEZ_Proiezione_Civico`, `UVL_Unita_volumetrica`.
- Duomo: `H_uvl` = **23.0 m**, eave 22.2 m, roof 0.8 m.
- Campione di 60 edifici: **57** con UVL; bias 1.82 m, MAE 1.85 m, entro 3 m: 48/57.

Il DBTR è utile come **fallback qualitativo** per gli edifici senza
campioni DSM, non come sostituto delle altezze misurate. Il download
geometrico completo richiede autenticazione o richiesta all'Archivio
Cartografico; il WMS è pubblico.
- Fallback DBTR già applicato a **91** edifici; restano 20 prior tipologiche.

## Street-level

- KartaView: 5 foto totali, **0 dentro la bbox**.
- Wikimedia Commons: **32** file di riferimento.

## Prossimi passi consigliati

1. **Richiedere DSM First/Last 0,5 m o LAS classificato RER 2023-24**
   all'Archivio Cartografico, limitando la richiesta alla bbox di Fidenza.
2. Nel frattempo usare **DTM 0,5 m** per le quote di base e il terreno,
   e l'**ortofoto 20 cm** per il colore dei tetti e i landmark.
3. Abilitare il **fallback DBTR UVL** per gli edifici senza DSM.
4. Verificare Mapillary/Panoramax: se non c'è copertura, organizzare una
   cattura Panoramax del centro storico prima di promettere facciate reali.

## Licenze

- RER DTM/ortofoto/DSM: **CC BY 4.0**.
- DBTR: **CC BY 4.0**.
- OpenStreetMap: **ODbL 1.0**.
- KartaView: per-sequence, da verificare.
- Wikimedia Commons: per-file.
