# Quality and confidence report

Generated: 2026-11-08T23:46:25+00:00

## Tiers

- **A** — landmark with licensed reference photography and measured geometry.
- **B** — measured height/roof from LiDAR/orthophoto; facade grammar inferred.
- **C** — footprint only or height fallback; lowest confidence.

| Tier | Buildings |
| --- | --- |
| A | 5 |
| B | 619 |
| C | 14 |

## Height evidence

| Height source | Buildings |
| --- | --- |
| dsm_agea2008_minus_dtm_rer2023_24 | 624 |
| typology_prior | 14 |

Median height confidence: **0.72**

## Roof evidence

- Roof shapes: hipped: 391, flat: 174, gabled: 49, mansard: 24
- Roof shape confidence median: 0.45

## Buildings requiring manual review

| OSM ID | Name | Height conf. | Roof conf. | Archetype conf. |
| --- | --- | --- | --- | --- |
| way/182264813 | — | 0.72 | 0.45 | 0.25 |
| way/182266355 | — | 0.72 | 0.45 | 0.25 |
| way/182277886 | — | 0.72 | 0.45 | 0.25 |
| way/182277901 | — | 0.72 | 0.45 | 0.25 |
| way/182277904 | — | 0.72 | 0.45 | 0.32 |
| way/182277928 | — | 0.72 | 0.5 | 0.35 |
| way/182277932 | — | 0.72 | 0.45 | 0.25 |
| way/182277934 | — | 0.72 | 0.45 | 0.35 |
| way/182277964 | — | 0.72 | 0.45 | 0.35 |
| way/182277973 | — | 0.72 | 0.45 | 0.25 |
| way/182278017 | — | 0.72 | 0.45 | 0.32 |
| way/182278035 | — | 0.72 | 0.45 | 0.35 |
| way/182278067 | — | 0.72 | 0.45 | 0.35 |
| way/182278072 | — | 0.72 | 0.45 | 0.25 |
| way/182278078 | — | 0.72 | 0.45 | 0.25 |
| way/182278114 | — | 0.72 | 0.45 | 0.25 |
| way/182278240 | — | 0.64 | 0.35 | 0.6 |
| way/182278320 | — | 0.72 | 0.45 | 0.25 |
| way/182278367 | — | 0.72 | 0.45 | 0.25 |
| way/182278388 | — | 0.72 | 0.45 | 0.32 |
| way/182278418 | — | 0.72 | 0.45 | 0.32 |
| way/182278474 | — | 0.72 | 0.45 | 0.35 |
| way/182278488 | — | 0.72 | 0.45 | 0.32 |
| way/182278533 | — | 0.72 | 0.5 | 0.35 |
| way/182278579 | — | 0.15 | 0.4 | 0.25 |
| way/182278753 | — | 0.72 | 0.4 | 0.25 |
| way/182278772 | — | 0.72 | 0.45 | 0.32 |
| way/182278791 | — | 0.72 | 0.4 | 0.32 |
| way/182278806 | — | 0.72 | 0.4 | 0.25 |
| way/182278817 | — | 0.72 | 0.5 | 0.25 |
| way/182278847 | — | 0.64 | 0.35 | 0.32 |
| way/182278855 | — | 0.72 | 0.45 | 0.35 |
| way/182278876 | — | 0.72 | 0.45 | 0.25 |
| way/182278903 | — | 0.72 | 0.45 | 0.25 |
| way/182278925 | — | 0.72 | 0.45 | 0.32 |
| way/182278957 | — | 0.72 | 0.45 | 0.35 |
| way/182278974 | — | 0.72 | 0.45 | 0.25 |
| way/182278979 | — | 0.72 | 0.45 | 0.35 |
| way/182278989 | — | 0.15 | 0.4 | 0.25 |
| way/182278995 | — | 0.72 | 0.45 | 0.32 |

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
