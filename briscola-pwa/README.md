# Briscola Online — 1 contro 1

Una PWA di Briscola per GitHub Pages, con stanze online tramite Supabase e una modalità locale contro la CPU.

**Una stanza. Un codice. Due giocatori. Le carte le distribuisce il server.**

---

## Cosa c'è

- **Briscola 1 contro 1** con regole complete:
  - mazzo italiano da 40 carte;
  - Briscola scoperta sotto il mazzo;
  - presa per seme, Briscola e forza;
  - pesca del vincitore prima dell'avversario;
  - punteggio 11/10/4/3/2 e totale di 120 punti;
  - fine partita con risultato e rivincita locale.
- **Gioco locale contro la CPU**, completamente offline dopo il primo caricamento.
- **Stanze online private** con codice a cinque caratteri.
- **Server autoritativo**: il browser non riceve mai la mano dell'avversario.
- **Realtime**: quando l'avversario gioca, il tavolo si aggiorna da solo; è presente anche un polling di sicurezza ogni 7 secondi.
- **Sessione anonima**: nessuna email, password o account. Supabase crea un'identità anonima persistente sul dispositivo.
- **PWA installabile**: manifest, icone, service worker, precache e gioco offline.
- **Interfaccia responsive** per desktop, tablet e telefono.
- **Accessibilità di base**: pulsanti reali, etichette ARIA, focus visibile, dimensioni del testo leggibili.

Nessun asset esterno, nessun font remoto, nessuna immagine scaricata a runtime. Le carte, il feltro, il logo e le icone sono disegnati con CSS, SVG e Phaser non serve: il tavolo è DOM/CSS.

---

## Stack

| Livello | Scelta |
| --- | --- |
| Build | Vite 6 |
| UI | React 18 + TypeScript |
| PWA | vite-plugin-pwa / Workbox |
| Online | Supabase Auth anonima, Postgres, Realtime, Edge Functions |
| Test | Vitest |
| Hosting | GitHub Pages |
| Backend | Supabase (obbligatorio solo per l'online) |

GitHub Pages è statico e non può ospitare da solo un multiplayer. La PWA viene pubblicata su Pages; stanze e mosse passano da Supabase.

---

## Avvio locale

```bash
cd briscola-pwa
npm install
npm run dev
```

Apri l'URL mostrato da Vite. In sviluppo, con `base: './'`, l'app è servita anche alla radice.

### Build

```bash
npm run build
npm run preview
```

`dist/` contiene la PWA pronta per GitHub Pages.

### Test

```bash
npm run typecheck
npm test
```

I test coprono mazzo, punteggi, forza delle carte, prese, turni, errori, distribuzione, pesca, 30 partite complete contro la CPU, stato pubblico senza mani e sincronizzazione del motore Edge.

---

## Online con Supabase

> Guida completa: [`docs/SUPABASE_GUIDE.md`](docs/SUPABASE_GUIDE.md) — setup da zero, RLS, best practice, costi, manutenzione, troubleshooting e checklist di produzione.

Senza configurazione online il gioco funziona in locale e mostra “Online non ancora configurato”.

### 1. Crea il progetto

1. Crea un progetto su [supabase.com](https://supabase.com).
2. In **Authentication → Providers** abilita **Anonymous Sign-Ins**.
3. Recupera **Project URL** e **anon public key**.

Non usare mai la `service_role` key nel frontend.

### 2. Applica la migrazione

Con la CLI Supabase:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

In alternativa incolla il contenuto di `supabase/migrations/20261112090000_briscola.sql` nell'SQL editor.

### 3. Deploya la Edge Function

```bash
npm run sync:engine
supabase functions deploy briscola
```

La funzione richiede JWT validi; non usare `--no-verify-jwt`.

### 4. Configura il frontend

Crea `briscola-pwa/.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Riavvia Vite.

### 5. GitHub Pages

Il workflow `pages.yml` compila automaticamente `briscola-pwa` e lo pubblica sotto `/briscola-pwa/`.

Aggiungi nei **Repository secrets** di GitHub:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Se non li aggiungi, la PWA viene comunque pubblicata ma l'online resta disabilitato.

Il progetto usa percorsi relativi (`base: './'`), quindi funziona sia su:

```text
https://utente.github.io/random2/briscola-pwa/
```

sia su un dominio personalizzato servito dalla radice.

### Installazione PWA

- Chrome/Android: menu del browser → Installa app / Aggiungi alla schermata Home.
- iOS Safari: Condividi → Aggiungi alla schermata Home.
- Una connessione HTTPS è necessaria per service worker e installazione. GitHub Pages la fornisce.

---

## Architettura online

```text
Browser A (PWA)                         Browser B (PWA)
     │                                       │
     └──────────── Supabase ─────────────────┘
                      │
         ┌────────────┼─────────────┐
         ▼            ▼             ▼
      rooms       room_hands    room_secrets
   pubblica      propria mano   mazzo + mani
   + realtime    (RLS)           (solo service role)
                      │
                      ▼
               Edge Function
               briscola
               (valida ogni mossa)
```

### Schema

- `rooms` — codice, host, guest, stato pubblico, versione; gli utenti vedono solo le stanze di cui fanno parte.
- `room_hands` — una riga per giocatore; ogni utente può leggere solo la propria mano.
- `room_secrets` — stato completo del motore; nessuna policy per i client.
- `briscola` — Edge Function con azioni `create`, `join`, `start`, `play`, `leave`, `state`.

### Sicurezza

- L'Edge Function usa la service role key solo lato server.
- Le carte avversarie non vengono mai pubblicate.
- Turno, possesso della carta e stato della partita vengono validati sul server.
- RLS impedisce la lettura delle stanze altrui.
- Il codice stanza è un invito, non una password.

---

## Struttura

```text
briscola-pwa/
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── .env.example
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── scripts/
│   ├── generate-icons.mjs
│   ├── icon.svg
│   └── sync-engine.mjs
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── GameTable.tsx
│   │   ├── Header.tsx
│   │   ├── PlayingCard.tsx
│   │   └── RulesContent.tsx
│   ├── game/
│   │   ├── cpu.ts
│   │   └── engine.ts
│   ├── online/
│   │   └── supabase.ts
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── LocalGameScreen.tsx
│   │   └── OnlineRoomScreen.tsx
│   ├── styles/
│   └── utils.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── functions/briscola/
├── docs/
│   └── SUPABASE_GUIDE.md
└── tests/
```

---

## Test eseguiti

```text
npm run typecheck  → passato
npm test           → 2 file, 12 test passati
npm run build      → passato
PWA precache       → 12 entry, circa 580 KiB
```

Test del motore:

- 40 carte uniche;
- valori e ordine di forza;
- 120 punti totali;
- distribuzione iniziale e Briscola;
- presa con seme, Briscola e carte fuori seme;
- rifiuto di mosse fuori turno, carte inesistenti e doppie giocate;
- pesca nell'ordine corretto;
- 30 partite complete contro la CPU;
- nessuna esposizione di mazzo o mani nello stato pubblico;
- nome giocatore sanificato;
- rendering della lobby online e del tavolo online con stato finto;
- motore Edge identico al motore client.

Smoke test locale con Chrome headless:

- home desktop e mobile;
- creazione partita CPU;
- gioco di una carta e risposta CPU;
- partita completa fino al risultato;
- 0 errori runtime.

### Non testato

- **L'online non è stato provato end-to-end contro un progetto Supabase reale**: non erano disponibili credenziali e Docker non è presente in questo ambiente. SQL, Edge Function e client sono implementati, ma la verifica live richiede i passaggi sopra.
- Solo Chrome/Chromium; Safari, Firefox e dispositivi fisici non sono stati testati.
- Nessun playtest umano del bilanciamento della CPU.
- Nessun test di carico o di più stanze concorrenti.
- Nessun test di rate limiting o moderazione, che non sono implementati.

---

## Limiti noti

- L'online richiede un progetto Supabase configurato e la Edge Function deployata.
- Le stanze non hanno scadenza automatica; una stanza abbandonata resta nel database finché non viene chiusa o pulita manualmente.
- Il polling di sicurezza aiuta con Realtime instabile, ma non sostituisce una connessione.
- La CPU usa una strategia semplice: non è un avversario esperto.
- La PWA funziona offline solo nella modalità locale/CPU.
- Nessun sistema di account, classifica, chat o amici.
- Nessun rate limiting lato backend: per un uso pubblico aggiungere limiti per utente/IP.
- La Edge Function scrive stato privato e pubblico in più chiamate; la versione della stanza riduce i conflitti, ma non è una transazione SQL completa. Per un gioco a turni è sufficiente per un MVP; una versione successiva può spostare la logica in una funzione Postgres transazionale.
- La licenza delle carte è originale: non usa mazzi, immagini o testi di giochi esistenti.

---

## Originalità

Briscola è un gioco tradizionale; questa implementazione, la grafica delle carte, il tavolo, il logo, i testi e il codice sono originali. Nessun asset di giochi commerciali, mazzi digitali o siti esistenti è stato copiato.

---

## Comandi rapidi

```bash
npm run dev          # sviluppo
npm run build        # build PWA
npm test             # test del motore
npm run typecheck    # TypeScript
npm run icons        # rigenera le icone
npm run sync:engine  # copia il motore nella Edge Function
```
