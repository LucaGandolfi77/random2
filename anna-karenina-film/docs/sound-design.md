# NEVE E FERRO — Sound Design

## Principio

La musica non è continua: entra nei punti di svolta e lascia spazio a vento, orologi, passi e silenzio. La colonna sonora è originale e viene sintetizzata in tempo reale con Web Audio; non usa campioni o registrazioni protette.

## Partitura

Ensemble da camera sintetizzato: pianoforte, archi, violoncello, violino, flauto, campane, timpani leggeri, rumori filtrati.

### Motivi

- **Anna**: intervallo ascendente, poi quinta discendente; violino solo, poi violoncello grave.
- **Treno**: ostinato ritmico di archi bassi e impulsi filtrati, come ruote.
- **Società**: valzer/minuetto meccanico, elegante e freddo.
- **Kitty e Levin**: sesta maggiore, tema caldo e semplice, pianoforte e flauto.
- **Neve**: armonici alti, campane, rumore filtrato.
- **Esclusione**: drone basso, intervalli stretti, assenza di risoluzione.

### Cue per sequenza

| # | Cue | Tono |
|---|---|---|
| 1 | `snow-rail` | ghiaccio, attesa, primo lampo d'ambra |
| 2 | `train-encounter` | desiderio trattenuto, ferro e neve |
| 3 | `ball-waltz` | valzer mondano, tensione |
| 4 | `cold-order` | ordine, orologio, vuoto |
| 5 | `secret-room` | intimità, colpa, candela |
| 6 | `race-tension` | polvere, pubblico, frattura |
| 7 | `forgiveness` | vulnerabilità, respiro |
| 8 | `new-life` | calore, poi freddo |
| 9 | `exclusion` | silenzio sociale, drone |
| 10 | `slow-happiness` | campagna, cura, luce |
| 11 | `last-station` | crescendo, poi silenzio da 124 s |
| 12 | `after-snow` | elegia, domanda aperta |

## Sound design

- Treno a vapore: rumore filtrato, chuff ritmici, fischio a due toni.
- Vapore, porte, passi nella neve, carrozze, orologi, campane, vetri, carta.
- Salotti: mormorio filtrato, applausi, bicchieri.
- Ippodromo: zoccoli, folla, polvere.
- Campagna: uccelli, insetti, vento, samovar.
- Interni: fuoco, candele, legno, pioggia.

## Mix

- Bus separati: musica, SFX, ambienza, master.
- Compressore/master limiter; riverbero a convoluzione con impulso generato.
- Ducking implicito: la musica resta sotto le voci (quando presenti) e sotto i momenti di silenzio.
- Pausa: `AudioContext.suspend()`; ripresa: `resume()` con resync.
- Seek: stop delle sorgenti, ricostruzione dello scheduler e restart dal punto.
- Il livello RMS è esposto dall'`AnalyserNode` per i test.

## Voce

La versione cinematografica non usa TTS. La narrazione è scritta e i dialoghi sono sottotitolati. Per aggiungere una voice track registrata, vedi `docs/voice-pack.md`.

## Provenienza

Tutta la musica e tutti i suoni sono generati dal codice del progetto. Nessun sample, loop o registrazione di terzi.
