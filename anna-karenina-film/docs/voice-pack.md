# Voice Pack — come aggiungere le voci

La versione cinematografica è completa con narrazione scritta e sottotitoli. Il progetto è predisposto per una voice track registrata, senza modificare la timeline.

## Formato

Crea:

```
public/assets/audio/voices/
├── manifest.json
└── it/
    ├── s01-a1.mp3
    ├── s02-a1.mp3
    └── ...
```

`manifest.json`:

```json
{
  "language": "it",
  "lines": {
    "s02-a1": "assets/audio/voices/it/s02-a1.mp3",
    "s02-v1": "assets/audio/voices/it/s02-v1.mp3",
    "s05-a1": "assets/audio/voices/it/s05-a1.mp3"
  }
}
```

I percorsi sono relativi alla base dell'app. Le chiavi sono gli ID delle battute in `src/data/scenes/*.ts` (campo `id` di `line(...)`). Non usare il testo come chiave: il testo può essere tradotto.

## Linee disponibili

Tutte le linee hanno un ID stabile. Puoi estrarle con:

```bash
npm run docs
grep -o "line('[^']*'" src/data/scenes/*.ts
```

Il documento `docs/screenplay.md` elenca anche i timecode.

## Registrazione

- Voce narrante: registro basso, vicino, senza enfasi teatrale.
- Dialoghi: leggere il testo una volta, senza recitare sopra la musica.
- Formato consigliato: WAV 48 kHz mono in registrazione; MP3 96–128 kbps mono per la distribuzione.
- Normalizzare a circa -18 LUFS; lasciare 1 dB di headroom.
- Rimuovere rumore di fondo e respiri troppo evidenti, ma non rendere la voce artificiale.
- Durata: rispettare la finestra del sottotitolo; se la registrazione è più lunga, accorciare il testo o la pausa, non accelerare.

## Integrazione

Il player mostra i sottotitoli mentre la voice track, se presente, viene riprodotta. Per collegare i file è sufficiente il manifest: la UI e la timeline usano gli stessi ID. Se il manifest manca o è vuoto, il film resta nella versione sottotitolata.

## Licenze

Usa solo voci di cui possiedi i diritti o registrazioni originali. Non includere voci sintetiche di licenza incerta. Documenta Provenienza e licenza in `ASSETS.md`.
