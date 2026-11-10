# Quality and confidence report

Generated: 2026-11-10T13:56:19+00:00

## Tiers

- **A** — landmark with licensed reference photography and measured geometry.
- **B** — measured height/roof from LiDAR/orthophoto; facade grammar inferred.
- **C** — footprint only or height fallback; lowest confidence.

| Tier | Buildings |
| --- | --- |
| A | 12 |
| B | 4462 |
| C | 111 |

## Height evidence

| Height source | Buildings |
| --- | --- |
| dbtr_uvl_2008 | 91 |
| dsm_agea2008_minus_dtm_rer2023_24 | 4474 |
| typology_prior | 20 |

Median height confidence: **0.72**

## Roof evidence

- Roof shapes: hipped: 2810, flat: 1066, gabled: 562, mansard: 147
- Roof shape confidence median: 0.45
- Orthophoto sampling: 0.5: 2790, 0.2: 1370, 1.0: 425
  (0.2 m historic centre, 0.5 m pilot, 1.0 m context)

## Buildings requiring manual review

| OSM ID | Name | Height conf. | Roof conf. | Archetype conf. |
| --- | --- | --- | --- | --- |
| way/182263981 | — | 0.72 | 0.45 | 0.3 |
| way/182264016 | — | 0.72 | 0.45 | 0.3 |
| way/182264073 | — | 0.72 | 0.45 | 0.3 |
| way/182264211 | — | 0.72 | 0.45 | 0.3 |
| way/182264321 | — | 0.72 | 0.45 | 0.3 |
| way/182264324 | — | 0.72 | 0.45 | 0.3 |
| way/182264325 | — | 0.72 | 0.45 | 0.3 |
| way/182264330 | — | 0.72 | 0.45 | 0.3 |
| way/182264363 | — | 0.72 | 0.4 | 0.3 |
| way/182264378 | — | 0.72 | 0.45 | 0.3 |
| way/182264419 | — | 0.72 | 0.45 | 0.3 |
| way/182264431 | — | 0.72 | 0.45 | 0.3 |
| way/182264447 | — | 0.72 | 0.45 | 0.3 |
| way/182264450 | — | 0.72 | 0.45 | 0.3 |
| way/182264501 | — | 0.72 | 0.5 | 0.3 |
| way/182264641 | — | 0.72 | 0.45 | 0.3 |
| way/182264685 | — | 0.72 | 0.45 | 0.3 |
| way/182264692 | — | 0.72 | 0.45 | 0.3 |
| way/182264710 | — | 0.72 | 0.45 | 0.3 |
| way/182264850 | — | 0.72 | 0.45 | 0.3 |
| way/182264855 | — | 0.64 | 0.4 | 0.3 |
| way/182265088 | — | 0.45 | 0.4 | 0.3 |
| way/182265119 | — | 0.72 | 0.5 | 0.3 |
| way/182265150 | — | 0.72 | 0.4 | 0.3 |
| way/182265164 | — | 0.72 | 0.45 | 0.3 |
| way/182265170 | — | 0.72 | 0.4 | 0.3 |
| way/182265323 | — | 0.72 | 0.45 | 0.3 |
| way/182265432 | — | 0.72 | 0.45 | 0.3 |
| way/182266058 | — | 0.64 | 0.45 | 0.3 |
| way/182266250 | — | 0.72 | 0.45 | 0.3 |
| way/182266345 | — | 0.72 | 0.45 | 0.3 |
| way/182266405 | — | 0.72 | 0.5 | 0.3 |
| way/182266685 | — | 0.72 | 0.45 | 0.3 |
| way/182266772 | — | 0.72 | 0.45 | 0.3 |
| way/182267288 | Pubblica Assistenza Fidenza | 0.72 | 0.45 | 0.3 |
| way/182267315 | — | 0.72 | 0.4 | 0.3 |
| way/182267325 | — | 0.72 | 0.45 | 0.3 |
| way/182267329 | — | 0.72 | 0.45 | 0.3 |
| way/182267355 | — | 0.72 | 0.45 | 0.3 |
| way/182267369 | — | 0.72 | 0.4 | 0.3 |

## Unverified assumptions

1. Window and shopfront positions are generated from facade width and an
   architectural grammar; they are not observed measurements.
2. Facade colours are typological palettes; roof colours are measured from
   the 2023-24 orthophoto at 0.2 m (centre), 0.5 m (pilot) or 1.0 m (context).
3. Heights use a 2008 DSM and a 2023-24 DTM; the cross-epoch difference is
   included in the confidence value.
4. No street-level photographs exist, so facade proportions cannot be
   photo-verified for generic buildings.
5. Mansard roofs keep the type in the record but are geometrically
   approximated as hipped roofs.
6. Landmark LOD4 is the same detailed level as LOD3; context is LOD1.
