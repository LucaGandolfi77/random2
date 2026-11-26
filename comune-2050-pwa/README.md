# COMUNE 2050 — Dati veri, decisioni immaginarie

> Un simulatore civico a forma di diorama di carta. Sei comuni italiani,
> cinque turni, dodici politiche, otto eventi. Ogni numero di partenza è un
> dato aperto reale, citato fonte per fonte.

**Live:** <https://lucagandolfi77.github.io/random2/comune-2050-pwa/>

---

## Che cos’è

COMUNE 2050 è un gioco narrativo-strategico, non un dashboard. Scegli un
comune, governi per cinque mandati (2026 → 2050) e alla fine ottieni un
**Bilancio Civico**: quattro indicatori, la popolazione al 2050, il confronto
con il tendenziale e una cartolina condivisibile.

- **6 comuni**: Fidenza (pilota), Prato, Lecce, L’Aquila, Cagliari, Trento.
- **5 turni**: 2026, 2032, 2038, 2044, 2050.
- **12 politiche**: tre per famiglia (Persone, Abitare, Mobilità, Servizi).
- **8 eventi**: cinque estratti per partita, due risposte ciascuno.
- **Crediti Civici**: 9 iniziali, +1 a ogni turno, +2 se rimandi un bando.
- **Bilancio Civico**: punteggio 0–100, delta rispetto al tendenziale,
  popolazione 2050, politiche e eventi, condivisione e PNG.
- **Bilingue IT/EN**, offline, installabile, nessun tracker.

## Dati

Lo snapshot è in `src/data/comuni.json`, generato da
`scripts/snapshot.mjs` a partire dal dashboard comunale di
**Cruscotto Italia** (AgID, `cruscotto-italia.dati.gov.it`), che federa:

| Ambito | Fonte | Licenza |
|---|---|---|
| Popolazione, età, dinamica | ISTAT POSAS / D7B | CC BY 4.0 |
| Censimento, occupazione, famiglie, case vuote | ISTAT Censimento permanente | CC BY 3.0 IT |
| Pendolarismo casa-lavoro | ISTAT Matrice pendolarismo 2021 | CC BY 3.0 IT |
| Suolo, rifiuti, rischio idrogeologico | ISPRA / SNPA | CC BY 4.0 |
| Qualità dell’aria | ISPRA / SNPA | CC BY 4.0 |
| Turismo | ISTAT capacità ricettiva | CC BY 4.0 |
| Redditi | MEF — Dipartimento delle Finanze | CC BY 3.0 |
| Quotazioni immobiliari | Agenzia delle Entrate — OMI | CC BY 4.0 |
| Parco veicoli e incidenti | ISTAT / ACI | CC BY 4.0 / open data ACI |
| Scuole | MIUR | open data PA |
| Banda larga | AGCOM Broadband Map | CC BY 4.0 |
| Ricarica elettrica | GSE — PUN | CC BY 4.0 |
| Terzo settore | RUNTS | open data PA |
| PNRR | Italia Domani — ReGiS | open data PA |
| Farmacie | Ministero della Salute | IODL 2.0 |
| Federazione e estrazione | Cruscotto Italia — AgID | CC BY 4.0 (piattaforma) |

**Data di estrazione:** 26 novembre 2026. Lo snapshot è build-time: la PWA
non chiama la rete a runtime. Il registro completo con URL e licenze è in
`src/data/sources.ts`; ogni scheda politica/evento e ogni indicatore mostra
la fonte.

> **Avvertenza.** I dati di partenza sono reali e citati. Gli scenari
> 2026–2050 sono una simulazione creativa: non sono previsioni ufficiali,
> non sono consigli di policy e non descrivono persone reali. La linea
> tendenziale prolunga il tasso di crescita dei residenti 2022–2026 e non è
> una proiezione ISTAT.

Per Fidenza il dato PM10 2025 non è disponibile nella stazione federata: il
gioco lo mostra come `n.d.` e usa un valore neutro (50) per l’indicatore,
invece di inventare una misura.

## Come giocare

1. Scegli un comune dalla home. Fidenza è il pilota consigliato.
2. A ogni turno scegli una delle tre carte politiche. Costa crediti e sposta
   gli indicatori.
3. Affronta l’evento del turno con una delle due risposte. Anche le risposte
   hanno un costo e un trade-off.
4. Dopo cinque turni leggi il Bilancio Civico, confrontalo con il tendenziale,
   condividilo o scarica la cartolina.

Ogni partita è deterministica a parità di seme e scelte: il seme è salvato
nello stato e i test lo usano per riprodurre i risultati.

## Metodo degli indicatori

I sedici indicatori sono normalizzati su soglie fisse e trasparenti
(`THRESHOLDS` in `src/game/engine.ts`), con direzione “più alto è meglio”:

- **Persone**: giovani, longevità attiva, lavoro, reddito.
- **Abitare**: suolo libero, casa accessibile, ospitalità, case vissute.
- **Mobilità**: aria pulita, mobilità dolce, strade sicure, ricarica elettrica.
- **Servizi**: scuola, digitale, comunità, investimenti.

Le politiche e gli eventi modificano i punteggi in punti. A ogni turno si
applica una deriva (invecchiamento, consumo di suolo, pressione abitativa,
ecc.) sia alla città giocata sia al tendenziale. La popolazione cresce con il
trend 2022–2026 più un piccolo feedback di giovani, casa, lavoro e case
vissute; il tendenziale usa la stessa formula sui propri indicatori, così una
partita senza decisioni resta esattamente sulla linea di base.

## Sviluppo

```bash
cd comune-2050-pwa
npm install
npm run dev        # http://localhost:5180
npm test           # 39 test
npm run build      # typecheck + Vite build
npm run preview    # http://localhost:4180
```

Lo snapshot si può rigenerare manualmente:

```bash
node scripts/snapshot.mjs
# oppure, riusando dashboard già scaricate:
COMUNE2050_CACHE=/percorso/cache node scripts/snapshot.mjs
```

Il comando usa l’endpoint MCP pubblico di Cruscotto Italia. Non viene
eseguito in CI: il JSON è committato e versionato.

## Struttura

```
src/
  data/       comuni.json, fonti, politiche, eventi, stringhe, tipi
  game/       motore puro, salvataggio locale
  ui/         app DOM, diorama SVG, Bilancio Civico e cartolina
  main.ts     bootstrap + service worker
public/
  manifest.webmanifest, sw.js, icon.svg
scripts/
  snapshot.mjs
tests/
  engine, dati, baseline, report, diorama
```

Il motore (`src/game/engine.ts`) è puro: nessun DOM, nessuna rete, nessuna
dipendenza. I diorami sono SVG originali disegnati a runtime; non ci sono
asset binari né mappe OSM in questo progetto.

## Salvataggi

- `comune2050.run.v1` — partita in corso o conclusa (localStorage).
- `comune2050.lang.v1` — lingua.
- Nessun dato personale, nessun account, nessun tracking.

## Licenze e crediti

- Codice e testi: MIT, come il resto del repository.
- Diorami e illustrazioni SVG: originali, disegnati per questo progetto.
- Dati: licenze dei singoli enti, elencate in `src/data/sources.ts`.
- Cruscotto Italia (AgID): piattaforma CC BY 4.0; dati secondo le licenze
  dei rispettivi produttori.
