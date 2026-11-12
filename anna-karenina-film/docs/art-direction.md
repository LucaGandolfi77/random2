# NEVE E FERRO — Art Direction

## Concept

**Mondi dipinti, figure disegnate.** Gli ambienti sono costruiti a strati come una scenografia teatrale; i personaggi sono figure vettoriali con linee sottili e volti espressivi. La macchina da presa è lenta e intenzionale: attraversa vetri, specchi, porte e vagoni. La ferrovia è il filo che lega ogni luogo.

Riferimenti: cinema d'autore europeo, illustrazione editoriale ottocentesca, pittura realista russa, fotografia analogica, animazione 2D. Nessuna inquadratura è copiata da adattamenti esistenti.

## Palette

| Sequenza | Dominante | Accenti |
|---|---|---|
| 1 Prologo | blu notte, grigio ghiaccio | lampada ambra, bordeaux |
| 2 Incontro | blu ferro, ottone | neve, legno caldo |
| 3 Ballo | oro, ambra | azzurro Kitty, bordeaux Anna |
| 4 Ordine | grigio pietra, oro freddo | neve alle finestre, verde Karenin |
| 5 Passione | bordeaux, candela | blu notte dal vetro |
| 6 Corse | oro polvere, verde | bianco tribune, rosso |
| 7 Perdono | ambra candela, grigio | lino bianco, legno scuro |
| 8 Nuova vita | ocra, verde Italia | blu freddo al ritorno |
| 9 Esclusione | nero, argento | rosso teatro, oro |
| 10 Kitty/Levin | miele, verde, crema | cielo |
| 11 Ultima stazione | ferro, ambra, neve | rosso del guanto |
| 12 Dopo la neve | bianco, grigio, oro pallido | nero |

Regola: il nero pieno è riservato al montaggio e all'epilogo; nei interni i neri sono caldi e mai completamente chiusi.

## Ambienti

14 set vettoriali originali: paesaggio ferroviario innevato, scompartimento notturno, stazione, ballo moscovita, palazzo Karenin, appartamento segreto, ippodromo, camera da letto, villa italiana, teatro, campagna, izba, binari, chiesa.

Ogni set contiene:
- un fondale con cielo/muri/architetture;
- un livello medio con arredi, colonne, finestre, lampade, specchi;
- un primo piano sfocato che incornicia e crea profondità;
- luci calde/fredde, riflessi, particelle;
- eventuali silhouettes di folla.

## Camera e montaggio

- Stage virtuale 1920×1080; scala responsive con letterboxing.
- Camera a keyframe con dolly, pan, zoom e rack focus simulato.
- Parallasse per layer: fondo, medio, personaggi, primo piano.
- Profondità di campo: blur dell'ambiente che cresce con lo zoom; personaggi sempre nitidi.
- Long take nelle scene emotive; tagli più rapidi nelle corse, nel teatro e nella stazione.
- Raccordi per corrispondenza: luce del treno/lampadario, valzer/ruote, porta/porta del vagone, guanto/neve.
- Viste di spalle in primo piano per over-the-shoulder e intimità.

## Luce e postproduzione

- Chiaroscuro: luce chiave laterale, rim light, ombre profonde.
- Window light freddo vs candela/lampada calda.
- Grade globale per scena, haze, vignettatura, grana analogica, leggera aberrazione.
- Palette CSS per scena (`--p-bg`, `--p-deep`, `--p-mid`, `--p-light`, `--p-warm`, `--p-cold`, `--p-glow`).

## Fallback e plate AI

La generazione AI delle matte painting non era disponibile per saldo insufficiente. Il film usa quindi ambienti vettoriali/procedurali originali. L'architettura `renderEnvironment(id, palette)` permette di sostituire un ambiente con una plate dipinta, mantenendo camera, personaggi e timeline. Le eventuali plate future devono essere vuote, senza persone, testo o oggetti moderni, e coerenti con la palette.

## Regole di qualità

- Nessuna scena è una slide: ogni shot ha camera, personaggi, atmosfera o tutte e tre.
- I personaggi non vengono ridisegnati da zero: un solo rig, costumi coerenti.
- La folla è sfocata e a bassa opacità: è atmosfera, non protagonista.
- Il finale non mostra il corpo di Anna: luce, nero, neve, assenza.
