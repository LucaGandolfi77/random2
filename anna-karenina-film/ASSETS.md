# NEVE E FERRO — Provenienza e licenze degli asset

## Opera e codice

- Opera, sceneggiatura, personaggi, ambienti, partitura e sound design: **originali**, creati per questo progetto. Licenza: **CC BY-NC-SA 4.0**.
- Codice sorgente: **MIT** (vedi `LICENSE`).
- Romanzo ispiratore: *Anna Karenina* di Lev Tolstoj (pubblico dominio). Il film è un'interpretazione originale, non un adattamento autorizzato da adattamenti cinematografici esistenti.

## Immagini

- Tutte le immagini del film sono **generate proceduralmente in SVG/Canvas** dal codice del progetto.
- Non sono usati frame, fotogrammi, poster, illustrazioni o asset grafici di adattamenti esistenti.
- La generazione di matte painting AI è stata tentata in preproduzione ma non era disponibile per saldo insufficiente; **non è stato usato alcun output AI**. Gli ambienti sono vettoriali/procedurali.
- Le icone PWA e l'immagine OG sono generate da `scripts/generate-icons.mjs` a partire da un SVG originale.

## Suoni

- Partitura e sound design sono sintetizzati in tempo reale con Web Audio. Non ci sono campioni, loop o registrazioni di terzi.
- Non ci sono voci nella versione distribuita. Il sistema per aggiungere una voice track è in `docs/voice-pack.md`.

## Font

- **Cormorant Garamond** — SIL Open Font License.
- **Inter** — SIL Open Font License.
- Distribuiti localmente tramite pacchetti Fontsource, senza CDN o chiamate esterne.

## Librerie

- Vite, TypeScript, Vitest, Playwright, Fontsource, sharp e tsx sono strumenti di sviluppo/open source con licenze compatibili. Non vengono pubblicati come asset del film.

## Contenuti sensibili

Il film contiene riferimenti al suicidio e temi adulti. La morte di Anna non è mostrata: il montaggio usa luce, nero, neve e assenza. La nota è presente nella schermata iniziale.

## Citazioni

Le citazioni del romanzo non sono usate come testo integrale; i dialoghi sono originali e ispirati ai temi. Il titolo *NEVE E FERRO* è originale.
