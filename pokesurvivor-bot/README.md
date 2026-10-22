# PokéSurvivor Bot

A local Python bot that plays [PokéSurvivor](https://pokesurvivor.com/)
with real WASD keyboard events. It starts a temporary browser session, uses a
guest account by default or logs in with supplied credentials, avoids enemies
and telegraphed attacks, collects nearby rewards, and chooses level-up and item
cards automatically.

It reads the game's current player/enemy state without changing it, and sends
movement through the same keyboard input path used by a human player.

During level-ups it prioritizes the attack in slot 1, other attack moves, and
the Power/damage upgrade before generic stats. After every level-up choice it
presses `1` to reactivate attack slot 1. Movement avoids damaging liquid
(lava, swamp, poison, spark, ice), raised wall formations, trees, rocks,
chests, and other solid terrain props. Plain **water** is harmless in the
game, so it is only mildly unattractive: the bot prefers land but still
crosses water when a pickup or an escape route is worth it.

After every run the bot goes back to the main menu and presses the game's
**Guardar** (Save) button, which uploads the finished run to the cloud, and
reports the message the game answers with. The game only shows that button
for a signed-in account whose save mode is the cloud, so a guest session logs
`no save button to press` instead of failing.

Each finished run is also appended as a row to a CSV report (default
`runs.csv` in the current directory, override with `--csv`, disable with
`--csv ""`). The file is created with a header on first use, so multiple
sessions accumulate safely in one file. Columns:

```text
run            run number within the session
started_at     local start timestamp (ISO)
ended_at       local end timestamp (ISO)
duration_s     seconds the run actually lasted
outcome        died | timeout
hp_end_pct     health percentage at the end of the run
max_enemies    peak number of concurrent live enemies observed
summary        text scraped from the result screen (best effort)
```

At startup, the browser response for the published game bundle is given a
read-only probe name so the bot can access the existing game object. The bot
does not replace gameplay methods or write player state.

## Setup

From this directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m playwright install chromium
```

## Run

Open a visible browser and play for up to three minutes:

```bash
python3 bot.py --duration 180
```

The bot opens the game on its own site, `https://pokesurvivor.com/`. The
game refuses to start inside another site's frame, so the guide page at
`pokesurvivor.org/play/` is not a usable target.

For an existing username/password account, pass only the username. The
password is requested interactively without echoing it:

```bash
python3 bot.py --username YOUR_USERNAME --duration 180
```

The password is never accepted as a command-line argument, written to logs, or
included in the bot configuration representation. Omitting `--username` keeps
the guest flow.

After account login, the bot automatically selects the optional email-link
dialog's **Do not ask me again** action. It falls back to **Not now** on older
game builds. It does not link or change the account email.

Useful options:

```text
--duration SECONDS   maximum time for each run (default: 180)
--runs COUNT         play multiple runs (default: 1)
--username NAME      log in with a username/password account
--headless           run Chromium without a window
--tick SECONDS       movement decision interval (default: 0.10)
--csv PATH           CSV report for run stats (default: runs.csv, "" disables)
--debug              enable verbose logging
--url URL            override the game page
```

The page is intentionally opened in a fresh, temporary browser context, so
the bot does not reuse or modify a personal account session.

The page is intentionally opened in a fresh, temporary browser context, so
the bot does not reuse or modify a personal account session.

## Come gioca: l'algoritmo in dettaglio

Il bot è diviso in due strati: **`bot.py`** gestisce browser, login, ciclo di
vita dei run e l'input da tastiera; **`strategy.py`** prende le decisioni di
movimento ed è testabile senza browser. Lo stato di gioco viene letto con una
sonda *read-only* iniettata nel bundle (`SNAPSHOT_SCRIPT`) e non viene mai
modificato: il bot gioca con i soli eventi tastiera, come un umano.

### Il ciclo di gioco (loop a tick)

Ogni `--tick` secondi (default `0.10`) il bot esegue:

1. legge lo **snapshot** del mondo: giocatore (posizione, HP, mosse), nemici
   vivi (con flag boss), pickup, hazard telegrafati, terreno campionato su
   una griglia 9×9 di tile ogni 32px attorno al giocatore (`World.kindAt`),
   props visibili (alberi, rocce, casse…);
2. se è comparsa una schermata di overlay (level-up, item, bond, pausa,
   prompt di recupero) la gestisce e salta il tick;
3. altrimenti passa lo snapshot a `SurvivalStrategy.choose()`, che restituisce
   l'insieme di tasti WASD da tenere premuti;
4. sincronizza la tastiera: preme i tasti nuovi, rilascia quelli non più
   richiesti (`_set_keys`), senza rimbalzi.

### Il modello decisionale: somma di forze vettoriali

La strategia non usa pathfinding: è uno **steering** a forze. Ogni pericolo o
attrattore contribuisce un vettore pesato; la somma decide la direzione del
tick. In ordine di importanza:

| Sorgente | Peso | Dettagli |
|---|---|---|
| Hazard telegrafati (cerchi e fasci) | `4.0 × urgenza` | La priorità più alta: deve dominare l'orbita normale. Le zone diventano urgenti negli ultimi 2s (`urgenza ≥ 0.25`) con raggio di sicurezza `raggio+90px`; i fasci si evitano lateralmente (±85px oltre la semi-larghezza), alternando il lato in modo deterministico per non restarci dentro |
| Muri (terreno rialzato) | `7.0` | Raggio `86 + r_player + 78` dal centro-tile |
| Liquidi dannosi (lava, swamp, poison, spark, ice) | `6.0` | Raggio `72 + r_player + 78` |
| Acqua (`water`) | `0.7 × falloff` | **Avversione morbida**: è innocua, quindi vale solo come bias entro 96px. Più debole di pickup e fuga: il bot preferisce la terra ma la attraversa quando conviene |
| Props solidi non flat (alberi, rocce, casse…) | `8.0` albero, `7.0` altri | Usa il raggio del prop; molle e trappole flat restano utilizzabili |
| Fuga dai nemici | `2.5 × w²` | Entro 300px (`390` per i boss, peso `×1.35`); `w` cresce quadraticamente avvicinandosi |
| Orbita dell'orda | `1.0` | Tangente attorno al centro di massa dei nemici entro 520px (boss `×1.5`); il verso **si inverte ogni 4.5s** per non incagliarsi su un ostacolo; se un nemico è sotto 190px si aggiunge una spinta radiale `1.8` |
| Pattugliamento | `0.45` | Quando non ci sono nemici: cerchio lento e deterministico per non restare ferma allo spawn |
| Pickup | `0.9` (`1.2` con HP < 45%) | Il più vicino tra `xp, xpBig, coin, heal, magnet, ticket, ticket10, item`; vale solo se: nessun nemico entro 170px, **oppure** è un heal con HP basso, **oppure** è a meno di 80px (il raggio magnetico del gioco fa il resto) |

Due meccanismi di sicurezza si aggiungono alla somma:

- **Fuga di panico**: se un campione dice che il giocatore è *sopra* un muro o
  un liquido dannoso, la strategia aggiunge una forza `10.0` verso il tile di
  `floor` campionato più vicino, ignorando l'orbita. L'acqua non attiva la
  fuga (è innocua): la sua sola avversione morbida fa tornare il bot a terra.
- **Direzione di fallback**: il vettore somma viene normalizzato con
  `_unit(..., self._last_direction)`: se le forze si annullano (es. il
  giocatore è compresso tra due spinte opposte), la direzione resta quella del
  tick precedente invece di indecidere e vibrare sul posto.

Infine il vettore unitario diventa tasti con soglie per asse: `|x| > 0.18 →`
`a`/`d`, `|y| > 0.18 →` `w`/`s`; il risultato viene inviato come vero input
da tastiera.

### Scelta delle carte (level-up, item, bond)

Alla comparsa di `#scr-levelup` il bot legge le carte, marca come evoluzione
quelle con classe CSS `evo`, e assegna un punteggio con `_card_score`:

```text
evoluzione                        +1000
upgrade dell'attacco in slot 1     +850   (letto dallo snapshot)
altri attacchi propri               +420
nuova mossa ("new"/"aprende")      +300
power / damage                     +240
speed                              +110
reflex / cooldown                  +100
shield / riduzione danni            +75
health / vigor                      +65
magnet                              +50
experience                          +45
heal / baya                         +35
```

Vince la carta col punteggio più alto (parimerito: la prima in ordine). Dopo
la scelta preme `1` per riattivare l'attacco dello slot 1. Per gli **item**
sceglie sempre la seconda carta (il nuovo oggetto), così non resta una
ricompensa obsoleta per sempre; per i **bond** clicca la prima carta,
gestendo sia i bond semplici sia quelli a doppia schermata.

### Ciclo di vita di un run

1. **Sessione**: boot → tap-start → login (guest o credenziali) → test di
   personalità (risposte in sequenza) → schermata result/starters → menu →
   scarta il prompt di recupero email (`#rec-never`, fallback `#rec-later`).
2. **Avvio run**: torna al menu, scarta nuovamente il prompt di recupero se
   riapparso (es. dopo un salvataggio cloud), clicca Play.
3. **Run**: loop a tick finché non appare `#scr-over` (esito `died`) oppure
   si raggiunge `--duration` (esito `timeout` → `Escape` → pausa → Quit).
4. **Chiusura**: `#btn-again` per tornare al menu, scarta il prompt di
   recupero, preme **Guardar** (`#btn-save`) se l'account è in modalità
   salvataggio cloud e legge la risposta toast del gioco.
5. **CSV**: aggiunge una riga di statistiche del run al file `--csv`
   (durata, esito, HP finali, picco nemici, testo del risultato).

### Limiti noti

- Lo steering è locale: non predice gli spawn né calcola percorsi, quindi in
  mappe molto intricate può incagliarsi in passaggi stretti (mitigato
  dall'inversione periodica dell'orbita e dal fallback di direzione).
- I numeri delle forze sono tarati empiricamente sul gioco attuale; un
  aggiornamento del gioco può richiedere ritocchi (i test in `tests/` coprono
  le decisioni base).

## Tests

The movement strategy has no browser dependency and can be checked with:

```bash
python3 -m unittest discover -s tests -v
```

The real browser run requires the Playwright package and its Chromium binary.
