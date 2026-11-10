# Quality and confidence report

Generated: 2026-11-09T23:37:26+00:00

## Tiers

- **A** — landmark with licensed reference photography and measured geometry.
- **B** — measured height/roof from LiDAR/orthophoto; facade grammar inferred.
- **C** — footprint only or height fallback; lowest confidence.

| Tier | Buildings |
| --- | --- |
| A | 9 |
| B | 1371 |
| C | 17 |

## Height evidence

| Height source | Buildings |
| --- | --- |
| dsm_agea2008_minus_dtm_rer2023_24 | 1380 |
| typology_prior | 17 |

Median height confidence: **0.72**

## Roof evidence

- Roof shapes: hipped: 871, flat: 374, gabled: 90, mansard: 62
- Roof shape confidence median: 0.45

## Buildings requiring manual review

| OSM ID | Name | Height conf. | Roof conf. | Archetype conf. |
| --- | --- | --- | --- | --- |
| way/182264185 | — | 0.72 | 0.45 | 0.25 |
| way/182264443 | — | 0.72 | 0.45 | 0.25 |
| way/182264603 | — | 0.72 | 0.45 | 0.25 |
| way/182264639 | — | 0.64 | 0.35 | 0.45 |
| way/182264733 | — | 0.72 | 0.4 | 0.25 |
| way/182264769 | — | 0.72 | 0.4 | 0.25 |
| way/182264783 | — | 0.64 | 0.4 | 0.25 |
| way/182264813 | — | 0.72 | 0.45 | 0.25 |
| way/182264939 | — | 0.72 | 0.45 | 0.25 |
| way/182264947 | — | 0.72 | 0.45 | 0.25 |
| way/182266355 | — | 0.72 | 0.45 | 0.25 |
| way/182266764 | — | 0.72 | 0.4 | 0.25 |
| way/182267034 | — | 0.64 | 0.4 | 0.25 |
| way/182267137 | — | 0.72 | 0.4 | 0.25 |
| way/182267235 | — | 0.72 | 0.4 | 0.25 |
| way/182267282 | — | 0.15 | 0.55 | 0.25 |
| way/182267588 | — | 0.72 | 0.45 | 0.25 |
| way/182267746 | — | 0.72 | 0.45 | 0.25 |
| way/182268112 | — | 0.72 | 0.4 | 0.25 |
| way/182268189 | — | 0.72 | 0.45 | 0.25 |
| way/182268586 | — | 0.72 | 0.45 | 0.25 |
| way/182277877 | — | 0.72 | 0.45 | 0.32 |
| way/182277886 | — | 0.72 | 0.45 | 0.25 |
| way/182277891 | — | 0.64 | 0.4 | 0.25 |
| way/182277895 | — | 0.72 | 0.5 | 0.32 |
| way/182277901 | — | 0.72 | 0.45 | 0.25 |
| way/182277904 | — | 0.72 | 0.45 | 0.32 |
| way/182277908 | — | 0.72 | 0.45 | 0.25 |
| way/182277913 | — | 0.72 | 0.5 | 0.25 |
| way/182277926 | — | 0.72 | 0.5 | 0.25 |
| way/182277928 | — | 0.72 | 0.5 | 0.35 |
| way/182277930 | — | 0.72 | 0.45 | 0.25 |
| way/182277932 | — | 0.72 | 0.45 | 0.25 |
| way/182277934 | — | 0.72 | 0.45 | 0.35 |
| way/182277942 | — | 0.72 | 0.45 | 0.25 |
| way/182277964 | — | 0.72 | 0.45 | 0.35 |
| way/182277969 | — | 0.72 | 0.45 | 0.25 |
| way/182277970 | — | 0.15 | 0.4 | 0.25 |
| way/182277973 | — | 0.72 | 0.45 | 0.25 |
| way/182277974 | — | 0.15 | 0.4 | 0.25 |

## Unverified assumptions

1. Window and shopfront positions are generated from facade width and an
   architectural grammar; they are not observed measurements.
2. Facade colours are typological palettes; roof colours are measured from
   the 2023-24 orthophoto.
3. Heights use a 2008 DSM and a 2023-24 DTM; the cross-epoch difference is
   included in the confidence value.
4. No street-level photographs exist, so facade proportions cannot be
   photo-verified for generic buildings.
5. Mansard roofs keep the type in the record but are geometrically
   approximated as hipped roofs.
6. Landmark LOD4 is the same detailed level as LOD3; context is LOD1.
