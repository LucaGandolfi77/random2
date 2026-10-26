# Purr Player — musica e video

Un lettore MP3 e video per Android (e per qualunque browser moderno) con il gatto di casa come sfondo. Scegli i file dal telefono, ascoltali o guardali, e ritrovali alla riapertura: la libreria vive in IndexedDB sul dispositivo, non su un server.

Niente account, niente upload, niente tracker. I file non lasciano mai il telefono.

## Cosa fa

- Legge **MP3 e altri formati audio** supportati dal browser (M4A, AAC, OGG, Opus, WAV, FLAC).
- Legge **video** supportati da Chrome Android (MP4/H.264, WebM; gli altri dipendono dai codec del sistema).
- Selezione multipla dei file e drag & drop da desktop.
- Coda con precedente/successivo, shuffle e repeat (off / tutto / un brano).
- Barra di avanzamento, tempo, volume e mute.
- Video con controlli nativi, schermo intero e Picture-in-Picture dove il browser lo offre.
- **Media Session API**: play, pausa, avanti e indietro dalla lockscreen Android e dalle cuffie.
- **Libreria persistente**: i file restano sul dispositivo dopo la chiusura dell'app, funzionano offline e si possono rimuovere uno a uno o tutti insieme.
- Icona e sfondo ricavati da una foto del gatto.

## Come si usa

1. Tocca **Aggiungi** e scegli uno o più file dal telefono.
2. Tocca un file nella libreria (☰) o premi play nel lettore in basso.
3. Su Android, dal menu di Chrome scegli **Aggiungi alla schermata Home** per installarla come app.

I file audio continuano a suonare anche con lo schermo spento, secondo le regole del browser. I video usano i controlli nativi, quindi il pulsante fullscreen è quello di Chrome.

### Scorciatoie da tastiera

| Tasto | Azione |
| --- | --- |
| `Spazio` | Play / pausa |
| `←` / `→` | Indietro / avanti di 5 secondi |
| `N` / `P` | Brano successivo / precedente |
| `M` | Mute |
| `Esc` | Chiude la libreria |

## Dove finiscono i file

- I file scelti vengono salvati come blob in **IndexedDB** (database `purr-player`, store `tracks`).
- All'avvio vengono riletti dal database e trasformati in object URL temporanei per la riproduzione.
- Non c'è nessuna richiesta di rete per i media: nessun upload, nessun CDN.
- Lo spazio occupato è quello dei file originali. Se il telefono è pieno, l'app lo dice e non salva il file.
- **Svuota libreria** rimuove solo la copia dentro l'app. I file originali restano dove sono.

Il service worker mette in cache solo la shell dell'app (HTML, CSS, moduli, icone, sfondo): dopo la prima visita Purr Player si apre anche senza rete.

## Sfondo e icone

La foto di partenza è `IMG_8223.jpg` (5184×3456). Nel repository ci sono solo i derivati ottimizzati:

- `icons/cat-bg.jpg` — 1800×1200, qualità 82, usata come sfondo e come copertina del lettore audio.
- `icons/icon-192.png`, `icons/icon-512.png` — ritaglio quadrato sul volto del gatto.
- `icons/icon-maskable-512.png` — stesso ritaglio con margine per le icone adattive di Android.

Sono asset di branding dell'app e vivono in `icons/`, come le icone delle altre PWA del repository.

## Struttura

```
purr-player-pwa/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── src/
│   ├── main.js      # UI, file picker, drag & drop, libreria, impostazioni
│   ├── player.js    # coda, ripetizione, shuffle, Media Session
│   ├── db.js        # IndexedDB
│   └── format.js    # nomi, estensioni, durate, dimensioni
├── icons/
│   ├── cat-bg.jpg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── tests/
│   ├── assets.test.mjs
│   └── format.test.mjs
└── README.md
```

## Sviluppo

Serve un server statico: il service worker e i moduli ES non funzionano da `file://`.

```bash
python3 -m http.server 8080
# http://localhost:8080/purr-player-pwa/
```

Test:

```bash
node --test purr-player-pwa/tests/*.test.mjs
```

### Provarla su Android

Il service worker richiede un'origine sicura. Con `http://` su rete locale Android non installa la PWA: usa l'URL GitHub Pages (HTTPS) dopo il deploy, oppure un tunnel HTTPS.

1. Apri l'URL pubblicato in Chrome su Android.
2. Menu ⋮ → **Aggiungi alla schermata Home** / **Installa app**.
3. Apri Purr Player, aggiungi i file e concedi l'eventuale accesso alla libreria media.

## Note tecniche

- Vanilla JavaScript, moduli ES, nessuna dipendenza e nessun build step.
- Un solo stato di riproduzione, due elementi media: `<audio>` per la musica e `<video>` per i filmati.
- Gli object URL vengono revocati alla rimozione del file e alla chiusura della pagina.
- `navigator.storage.persist()` chiede al browser di non svuotare la libreria per mancanza di spazio; il browser può comunque negarlo.
- Su iOS l'installazione e la riproduzione in background hanno regole più restrittive; l'app è pensata per Android.
- Il formato di un file può essere accettato per estensione ma non essere decodificabile: in quel caso compare un messaggio e la riproduzione non parte.
