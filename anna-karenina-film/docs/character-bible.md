# NEVE E FERRO — Character Bible

## Principio

Un solo scheletro SVG per tutti i personaggi. Il modello cambia per proporzioni, costume, capelli e accessori, non per disegno arbitrario. La coerenza è garantita da coordinate condivise, palette di personaggio e un renderer unico (`src/characters/CharacterRenderer.ts`).

Il linguaggio è un **teatro di carta cinematografico**: figure disegnate, frontali ma espressive, calate in ambienti stratificati e illuminati. Le viste di spalle sono usate come primo piano/raccordo, non come secondo modello.

## Anna

- Giovane donna aristocratica, portamento eretto, collo lungo, sguardo diretto.
- Capelli castano ramato raccolti in uno chignon basso; ciocche laterali; Pettine dorato.
- Abito bordeaux con corpetto aderente, cintura dorata, gonna ampia a pieghe; cammeo al collo.
- Varianti: `gown` (ballo), `winter` (pelliccia, blu notte), `travel` (grigio ferro), `night` (camicia da notte avorio), `wedding` (avorio), `landing` (bordeaux con pelliccia).
- Arco: dalla compostezza alla tensione; le mani, il collo e lo sguardo raccontano prima delle battute.
- Espressioni chiave: `soft`, `desire`, `fear`, `shame`, `grief`, `cold`.

## Vronskij

- Ufficiale biondo, uniforme bianca con colletto blu, spalline e fascia; pantaloni scuri.
- Varianti: `uniform`, `civilian`, `riding`.
- Il sorriso è sicuro, ma gli occhi cercano conferma. La postura è più rigida quando è in pubblico.
- Espressioni chiave: `soft`, `desire`, `tender`, `cold`, `shame`.

## Karenin

- Cinquantenne, capelli grigi, occhiali, redingote verde/nera, colletto alto, catena dell'orologio.
- Non è un villain: spalle rigide, mani trattenute, occhi stanchi. Il perdono è una crepa, non una conversione.
- Espressioni chiave: `cold`, `grief`, `anger`, `tender` (raro).

## Kitty

- Giovane, luminosa, ricci biondi, nastro rosa, abito azzurro pallido.
- Varianti: `ball`, `country` (crema/verde), `winter`.
- Arco: dalla speranza romantica alla cura adulta. Non è una consolazione: è un'altra velocità dell'amore.
- Espressioni chiave: `wonder`, `joy`, `grief`, `tender`.

## Levin

- Uomo di campagna, corporatura ampia, barba, abiti marroni/oliva, stivali, mani segnate dal lavoro.
- Varianti: `country`, `formal`.
- La sua forza è l'ascolto e la presenza. Non giudica Anna; rappresenta una felicità più lenta.
- Espressioni chiave: `soft`, `joy`, `tender`, `wonder`.

## Seryozha

- Bambino di otto anni, capelli scuri, camicia da notte bianca, trenino di legno.
- È il costo affettivo della libertà di Anna. Appare in memoria, mai come oggetto di pietà.
- Varianti: `night`, `day`.

## Capostazione

- Figura anziana, uniforme grigia, berretto, barba. Testimone silenzioso all'inizio e alla fine.
- Non giudica e non spiega: è la presenza del tempo e della ferrovia.

## Coro sociale

- Sagome eleganti, scure, con bordi oro; volti non definiti. Riempiono balli, teatro e stazione.
- Sono il rumore di fondo della società, non un villain unico.

## Rig e animazione

- Testa, collo, torso, bacino, gambe/gonna, spalle, braccia, avambracci, mani.
- Otto espressioni base interpolate: neutro, dolce, gioia, desiderio, paura, vergogna, dolore, rabbia, tenerezza, freddezza, meraviglia.
- Micro-animazioni: respiro, blink deterministico, sguardo, inclinazione della testa, oscillazione della gonna, mani.
- Pose: `stand`, `turn`, `reach`, `embrace`, `bow`, `clasp`, `recoil`, `walk`, `ride`, `cover`.
- Viste di spalle: `back` sul track, usate per over-the-shoulder e primo piano sfocato.
- Profondità: `blur` sul track/ keyframe; l'ambiente viene sfocato in base allo zoom, i personaggi restano nitidi.

## Regole di coerenza

- Non cambiare palette o accessori senza una ragione narrativa.
- Le mani e gli occhi sono il baricentro espressivo: non coprirli senza intenzione.
- Nei due campi, i personaggi si guardano tramite `gaze`; le viste di spalle creano il controcampo.
- La luce calda è desiderio/memoria; la luce fredda è ordine/solitudine.
