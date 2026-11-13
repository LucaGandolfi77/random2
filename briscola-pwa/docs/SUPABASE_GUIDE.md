# Guida Supabase — Briscola Online

Guida pratica per portare `briscola-pwa` da gioco locale a gioco online, con istruzioni passo passo, best practice, controlli di sicurezza e troubleshooting.

> Stato del progetto: il codice online è completo ma non è stato provato end-to-end contro un progetto Supabase reale in questo ambiente. Segui il test finale a due giocatori per validarlo sul tuo progetto.

---

## Indice

1. [Come funziona l’online](#1-come-funziona-lonline)
2. [Prerequisiti](#2-prerequisiti)
3. [Creare il progetto Supabase](#3-creare-il-progetto-supabase)
4. [Applicare lo schema](#4-applicare-lo-schema)
5. [Abilitare l’accesso anonimo](#5-abilitare-laccesso-anonimo)
6. [Deployare la Edge Function](#6-deployare-la-edge-function)
7. [Collegare il frontend](#7-collegare-il-frontend)
8. [Pubblicare su GitHub Pages](#8-pubblicare-su-github-pages)
9. [Test finale a due giocatori](#9-test-finale-a-due-giocatori)
10. [Sicurezza e RLS](#10-sicurezza-e-rls)
11. [Best practice per il database](#11-best-practice-per-il-database)
12. [Best practice per la Edge Function](#12-best-practice-per-la-edge-function)
13. [Realtime, performance e costi](#13-realtime-performance-e-costi)
14. [Manutenzione e operazioni](#14-manutenzione-e-operazioni)
15. [Troubleshooting](#15-troubleshooting)
16. [SQL utile](#16-sql-utile)
17. [Checklist di produzione](#17-checklist-di-produzione)
18. [Riferimenti](#18-riferimenti)

---

## 1. Come funziona l’online

GitHub Pages serve solo file statici. Non può eseguire codice server, conservare stanze o mantenere WebSocket. L’online passa quindi da Supabase:

```text
PWA su GitHub Pages
      │
      │  Auth anonima + Edge Function + SELECT protette
      ▼
Supabase
  ├─ rooms          → lobby e stato pubblico
  ├─ room_hands     → solo la propria mano
  ├─ room_secrets   → mazzo e mani complete, invisibili al client
  ├─ Realtime       → aggiornamenti della stanza
  └─ briscola       → distribuzione, validazione, prese, punteggi
```

Il flusso di una partita:

1. il giocatore apre la PWA e riceve una sessione anonima Supabase;
2. crea una stanza: la Edge Function genera un codice;
3. l’avversario entra con il codice;
4. l’host avvia: la Edge Function mescola e distribuisce;
5. ogni giocatore legge solo la propria mano da `room_hands`;
6. quando arriva il proprio turno, invia `play` alla Edge Function;
7. il server valida la mossa, risolve la presa e aggiorna lo stato pubblico;
8. il client avversario riceve l’aggiornamento Realtime e ricarica la stanza;
9. se Realtime non arriva, il polling di sicurezza ogni 7 secondi recupera lo stato.

### Cosa è pubblico e cosa è privato

| Dato | Dove vive | Chi può leggerlo |
| --- | --- | --- |
| Codice stanza, host, guest, punteggi, tavolo, Briscola | `rooms.public_state` | host e guest della stanza |
| La propria mano | `room_hands.cards` | solo il giocatore proprietario |
| Mazzo completo e mani di entrambi | `room_secrets.state` | nessun client; solo service role / Edge Function |
| Cronologia e stato finale | `rooms.public_state` | host e guest |

---

## 2. Prerequisiti

- Account Supabase.
- Node.js 20 o superiore.
- npm.
- Un progetto GitHub con Pages abilitato.
- Supabase CLI per applicare migrazioni e deployare funzioni.
- Docker solo se vuoi provare Supabase in locale con `supabase start`.
- Due browser o dispositivi per il test online.

### Installare la CLI

```bash
npm install -g supabase
supabase --version
```

In alternativa puoi usare la CLI tramite `npx supabase ...`.

---

## 3. Creare il progetto Supabase

1. Accedi a [supabase.com](https://supabase.com) e crea un’organizzazione/progetto.
2. Scegli una regione vicina ai giocatori. Per un pubblico italiano/UE, una regione europea riduce la latenza.
3. Salva la password del database nel gestore password: serve per operazioni amministrative, non per il gioco.
4. Attendi il provisioning.
5. Apri **Project Settings → API** e annota:
   - **Project URL**, ad esempio `https://abcdefgh.supabase.co`;
   - **anon public key**;
   - **service_role key** (da tenere segreta).

### Regola d’oro sulle chiavi

| Chiave | Dove può stare |
| --- | --- |
| `anon` / public | Nel frontend, nei secret di build GitHub, purché RLS sia corretta |
| `service_role` | Solo nella Edge Function / server. Mai nel browser, mai in `VITE_*`, mai su GitHub Pages |

Se la `service_role` key finisce nel frontend o in un repository pubblico, considera il progetto compromesso: ruota subito la chiave dalla dashboard e ri-deploya le funzioni.

### Ambiente consigliato

- Un progetto Supabase **staging** per provare migrazioni e funzioni.
- Un progetto Supabase **produzione** separato.
- Non usare lo stesso progetto per esperimenti e partite pubbliche.
- Verifica i limiti correnti del piano gratuito: pausa dei progetti inattivi, quote di database, realtime, autenticazione e banda. I limiti cambiano nel tempo, quindi controlla sempre il pricing aggiornato.

---

## 4. Applicare lo schema

Il file di migrazione è:

```text
briscola-pwa/supabase/migrations/20261112090000_briscola.sql
```

### Opzione A — SQL Editor

1. Apri il progetto Supabase.
2. Vai su **SQL Editor**.
3. Incolla il contenuto della migrazione.
4. Esegui.
5. Verifica che non ci siano errori.
6. Controlla che le tabelle `rooms`, `room_hands`, `room_secrets` esistano.

### Opzione B — CLI

```bash
cd briscola-pwa
supabase login
supabase link --project-ref IL_TUO_PROJECT_REF
supabase db push
```

Il `project-ref` è la parte del Project URL prima di `.supabase.co`.

### Verifica dello schema

Esegui nel SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('rooms', 'room_hands', 'room_secrets');
```

Tutte e tre devono avere `rowsecurity = true`.

Controlla le policy:

```sql
select schemaname, tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Controlla la pubblicazione Realtime:

```sql
select * from pg_publication_tables
where pubname = 'supabase_realtime';
```

Deve comparire `public.rooms`.

### Cosa fa la migrazione

- crea `rooms`, `room_hands`, `room_secrets`;
- abilita RLS su tutte e tre;
- permette al client di leggere solo le stanze di cui è host/guest;
- permette al client di leggere solo la propria riga in `room_hands`;
- revoca l’accesso client a `room_secrets`;
- aggiunge gli indici per host, guest, codice e proprietario della mano;
- aggiunge `rooms` alla pubblicazione Realtime.

> La migrazione è pensata per essere eseguita su un progetto nuovo. Se modifichi lo schema, crea una nuova migrazione invece di modificare quella già applicata.

---

## 5. Abilitare l’accesso anonimo

La PWA non chiede email o password. Usa `signInAnonymously()`.

1. Dashboard Supabase → **Authentication**.
2. Apri **Sign In / Providers** o **Providers**.
3. Abilita **Anonymous Sign-Ins**.
4. Salva.

Se l’accesso anonimo è disabilitato, il client mostra un errore del tipo “Accesso anonimo non disponibile”. Non serve creare utenti manualmente.

### Best practice per l’auth anonima

- Non chiedere dati personali se non indispensabili.
- Il nickname è solo un’etichetta: non usarlo come identificatore di sicurezza.
- Le sessioni anonime sono persistenti nel browser finché il browser conserva il token.
- Se l’utente cancella i dati del sito, perde la sessione e non può rientrare nella vecchia stanza.
- Considera una scadenza/pulizia delle stanze e degli utenti anonimi inattivi.
- Per un prodotto più grande valuta auth con email, OAuth o account veri, ma non è necessario per questa v1.

---

## 6. Deployare la Edge Function

La funzione si chiama `briscola` e si trova in:

```text
briscola-pwa/supabase/functions/briscola/
├── index.ts
└── engine.ts
```

`engine.ts` è una copia del motore client. Per evitare divergenze:

```bash
cd briscola-pwa
npm run sync:engine
npm test
supabase functions deploy briscola
```

Il test `engine-sync.test` incluso in `npm test` controlla che i due file siano identici.

### Variabili d’ambiente della funzione

Supabase inietta normalmente:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Non inserire la service role key nel codice. Se la variabile non fosse disponibile nel tuo progetto, configurala come secret della funzione dalla dashboard o con la CLI, senza mai salvarla nel repository.

### JWT

La funzione deve essere deployata **con verifica JWT attiva**. La configurazione è in `supabase/config.toml`:

```toml
[functions.briscola]
enabled = true
verify_jwt = true
```

Non usare `--no-verify-jwt`: la funzione ricava l’utente dal token per impedire a un client di impersonare l’altro giocatore.

### Log e debug

- Dashboard Supabase → **Edge Functions → briscola → Logs**.
- Cerca gli errori `briscola function error`.
- I log possono includere messaggi di errore e identificatori; non loggare carte private, token o dati personali.
- In caso di `401`, controlla la sessione anonima e JWT.
- In caso di `FunctionsFetchError`, controlla URL, deploy e CORS.

### Test con la CLI e Docker

Se Docker è disponibile:

```bash
supabase start
supabase db reset
supabase functions serve briscola --env-file ./supabase/.env.local
```

Poi esegui il frontend in locale. Senza Docker puoi comunque usare un progetto hosted per il test.

---

## 7. Collegare il frontend

Crea `briscola-pwa/.env.local`:

```bash
VITE_SUPABASE_URL=https://IL_TUO_PROGETTO.supabase.co
VITE_SUPABASE_ANON_KEY=LA_TUA_ANON_KEY
```

Riavvia il dev server:

```bash
cd briscola-pwa
npm run dev
```

Le variabili `VITE_*` vengono incorporate al momento della build. Se cambi `.env.local`, riavvia Vite; per una build statica devi rifare `npm run build`.

### Senza configurazione

Se le variabili mancano:

- la home mostra “Online non ancora configurato”;
- la modalità CPU e il gioco offline funzionano;
- non viene creato alcun client Supabase.

### Con configurazione

Se le variabili sono presenti:

- compare lo stato “server Supabase configurato”;
- puoi creare una stanza o entrare con un codice;
- il client crea una sessione anonima al primo utilizzo.

### Non mettere mai

```bash
# SBAGLIATO
VITE_SUPABASE_SERVICE_ROLE_KEY=...
```

Tutto ciò che inizia con `VITE_` finisce nel bundle pubblico.

---

## 8. Pubblicare su GitHub Pages

Il workflow `pages.yml` compila la PWA e la copia in:

```text
_site/briscola-pwa/
```

Il sito la espone a:

```text
https://TUO_UTENTE.github.io/random2/briscola-pwa/
```

Il progetto usa `base: './'` e manifest con `start_url: "./"`, quindi funziona anche su un dominio personalizzato senza modificare i percorsi.

### Secret GitHub

Nel repository:

1. **Settings → Secrets and variables → Actions**.
2. Crea:
   - `SUPABASE_URL`;
   - `SUPABASE_ANON_KEY`.

Il workflow le passa a Vite come `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Se non le crei, la build va a buon fine ma l’online resta disabilitato.

### Dopo il deploy

1. Apri la PWA.
2. Verifica che compaia “server Supabase configurato”.
3. Installa la PWA.
4. Prova una stanza con due browser.
5. Controlla la console del browser per errori di autenticazione, CORS o RLS.

### Service worker e aggiornamenti

- Il service worker precarica l’app shell.
- Non mette in cache le chiamate Supabase.
- Quando pubblichi una nuova build, il service worker si aggiorna.
- Se vedi ancora la versione vecchia: chiudi tutte le schede, ricarica con cache disabilitata o cancella il service worker dalle DevTools.
- Non modificare `CACHE_NAME` a mano se usi `vite-plugin-pwa`: il plugin gestisce il manifest del precache.

### Offline

- Home, regole, grafica e gioco CPU funzionano offline dopo il primo caricamento.
- L’online richiede rete: non esiste una coda offline per le mosse.
- Se l’utente perde la connessione durante una partita, può ricaricare e rientrare con la stessa sessione del browser.

---

## 9. Test finale a due giocatori

Fai questo test su staging, non su produzione.

1. Apri la PWA nel browser A e crea una stanza.
2. Copia il codice.
3. Apri un secondo profilo/incognito o un telefono con browser B.
4. Inserisci lo stesso codice.
5. Controlla che entrambi vedano i nomi corretti.
6. L’host preme **Inizia la partita**.
7. Verifica che entrambi ricevano 3 carte e vedano la stessa Briscola.
8. Gioca una carta; l’avversario deve vedere la carta e il proprio turno.
9. Ricarica il browser B: deve rientrare nella stanza.
10. Chiudi il browser A: dopo il polling, B deve vedere la vittoria per abbandono.
11. Completate una partita intera e verificate il punteggio 120.
12. Controlla che nessun client possa vedere le carte avversarie in `room_hands` o nella rete.

### Se qualcosa non arriva

- Il polling di 7 secondi dovrebbe recuperare lo stato anche senza Realtime.
- Controlla che `rooms` sia nella pubblicazione `supabase_realtime`.
- Controlla che la RLS permetta al guest di leggere la stanza dopo il join.
- Controlla i log della Edge Function.

---

## 10. Sicurezza e RLS

### Regole fondamentali

1. **RLS sempre attiva** su tutte le tabelle esposte.
2. **Nessuna policy di scrittura** per i client su `rooms`, `room_hands`, `room_secrets`.
3. Il client legge solo la propria mano.
4. Il client non deve mai ricevere il mazzo o la mano avversaria.
5. Il server valida turno, possesso e legalità della mossa.
6. La `service_role` key resta solo lato server.
7. I codici stanza sono inviti, non password: non proteggono dati sensibili.
8. Non fidarti mai di un `userId`, `seat` o `cardId` inviato dal client senza ricavare il seat dal JWT.
9. Non loggare carte private, token o chiavi.
10. Usa HTTPS; GitHub Pages lo fornisce.

### CORS

La funzione attuale usa `Access-Control-Allow-Origin: *`, accettabile per un MVP con JWT. In produzione puoi restringerlo al dominio GitHub Pages e al dominio personalizzato:

```ts
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://TUO_UTENTE.github.io';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
```

Se usi un dominio personalizzato, imposta `ALLOWED_ORIGIN` al dominio esatto.

### Rate limiting e abuso

La v1 non include rate limiting. Per un sito pubblico aggiungi almeno:

- limite di creazione stanze per utente/IP;
- limite di `play` per stanza/secondo;
- limite di join falliti per IP;
- blocco di stanze duplicate o flood.

Puoi implementarlo con:

- Edge Function + Redis/Upstash;
- una tabella `rate_limits` con contatori e finestre temporali;
- Cloudflare davanti al sito/API;
- regole di protezione Supabase, verificando le funzionalità disponibili nel tuo piano.

Non usare solo il client: un attaccante può chiamare la Edge Function direttamente.

### Privacy e GDPR

- Non raccogliere email o nomi reali se non necessari.
- Il nickname è visibile all’avversario: avvisa l’utente.
- Conserva le stanze solo per il tempo necessario.
- Prevedi una policy di cancellazione e una pagina privacy se il sito è pubblico.
- Supabase Auth crea comunque record per gli utenti anonimi: verifica la data retention e la tua posizione GDPR.
- Non usare i log per profilazione.

---

## 11. Best practice per il database

### Migrazioni

- Una modifica = una nuova migrazione.
- Non modificare a mano la produzione senza traccia.
- Prova prima su staging.
- Conserva il file SQL nel repository.
- Non usare `drop table` in una migrazione di produzione senza backup.

```bash
supabase migration new nome_modifica
supabase db push
```

### Backup e rollback

- Attiva i backup disponibili nel piano Supabase.
- Prima di una migrazione distruttiva, esporta schema e dati.
- Le migrazioni SQL sono forward-only: prepara una migrazione di rollback esplicita se necessario.
- Per la Edge Function, conserva il commit precedente e ri-deploya la versione stabile se una modifica rompe l’online.

### Indici e pulizia

La migrazione crea gli indici essenziali. Se cresci:

- monitora le query lente nella dashboard;
- aggiungi indici solo dopo aver misurato;
- pulisci stanze vecchie con `pg_cron` o un job esterno;
- non conservare segreti di partite finite più del necessario.

### Transazioni

La versione attuale aggiorna stato privato, mani e stanza in più chiamate. La colonna `version` riduce i conflitti, ma non è una transazione SQL completa.

Per una versione più robusta:

- sposta la logica di `play` in una funzione Postgres transazionale; oppure
- usa un lock consultivo per stanza (`pg_advisory_xact_lock`) prima di leggere e scrivere;
- mantieni il motore TypeScript come specifica/test e chiama la transazione dal server.

Per un gioco a turni con due amici è un compromesso accettabile; per traffico pubblico serio, rendi la mossa atomica.

---

## 12. Best practice per la Edge Function

- **Verifica JWT** sempre attiva.
- Ricava l’utente da `auth.getUser()`, non da un campo del body.
- Ricava lo `seat` da `host_id`/`guest_id`, non dal client.
- Valida azione, stanza, stato, turno e carta.
- Non restituire mai `room_secrets`.
- Mantieni il payload pubblico piccolo: lo stato pubblico non deve contenere il mazzo.
- Sincronizza il motore con `npm run sync:engine` prima del deploy.
- Esegui i test prima del deploy.
- Logga errori senza dati sensibili.
- Usa codici HTTP coerenti: `400` input non valido, `401` auth, `403` permessi, `404` stanza, `409` conflitto, `500` errore interno.
- Gestisci i retry del client: una mossa già applicata può restituire `409`; il client deve ricaricare lo stato.
- Tieni la funzione breve: il gioco è turn-based, non servono connessioni persistenti.

### Idempotenza

Un doppio tap o un retry di rete potrebbe inviare due volte la stessa mossa. Il client usa `busy`, ma il server dovrebbe in futuro:

- accettare un `moveId` idempotente; oppure
- registrare l’ultima mossa per stanza e restituire lo stesso risultato;
- oppure serializzare con un lock per stanza.

La versione attuale usa `version` per ridurre le collisioni; non è una garanzia completa contro richieste duplicate.

---

## 13. Realtime, performance e costi

### Realtime

- È pubblicata solo `public.rooms`; non pubblicare `room_secrets` o `room_hands` globalmente.
- La RLS di `rooms` limita gli eventi ai membri.
- Il client si iscrive agli update della stanza.
- Il polling di 7 secondi è un fallback, non il canale principale.
- Se elimini/ricrei una stanza, gestisci la sottoscrizione sul nuovo id.
- Evita payload enormi: tieni il log limitato e non includere le mani.

### Performance

Il gioco è leggero:

- 40 carte, 20 prese, due giocatori;
- stato pubblico di pochi KB;
- una funzione per mossa;
- una lettura stanza + una lettura mano dopo ogni evento.

Per scalare:

- limita le stanze attive;
- pulisci le stanze vecchie;
- evita polling troppo aggressivo su molti utenti;
- monitora le invocazioni Edge;
- valuta Realtime Broadcast con canali privati per una v2;
- non mettere il servizio dietro a un loop di retry senza backoff.

### Costi

I costi dipendono dal piano e dai limiti correnti Supabase. Controlla:

- utenti anonimi / MAU;
- invocazioni Edge;
- messaggi Realtime;
- banda;
- dimensione database;
- pausa dei progetti gratuiti inattivi.

Per un piccolo gioco tra amici il consumo è modesto. Prima di pubblicizzarlo su larga scala, imposta budget e alert.

---

## 14. Manutenzione e operazioni

### Checklist di deploy

```bash
cd briscola-pwa
npm ci
npm test
npm run build
npm run sync:engine
supabase functions deploy briscola
```

Poi:

- verifica la home online;
- crea una stanza di prova;
- gioca una mano con due browser;
- controlla i log Edge;
- verifica il service worker aggiornato.

### Rotazione delle chiavi

Se la `anon` key viene esposta, non è un disastro con RLS corretta, ma puoi ruotarla. Se viene esposta la `service_role` key:

1. ruotala immediatamente;
2. ri-deploya la Edge Function;
3. controlla i log per accessi anomali;
4. verifica che il vecchio valore non sia nel repository o nei secret.

### Monitoraggio

- Dashboard Supabase → Database, Auth, Edge Functions, Realtime.
- Controlla errori 5xx, latenza Edge, connessioni Realtime, crescita delle stanze.
- Aggiungi un alert per picchi di errori.
- Conserva un piccolo runbook con: URL progetto, progetto ref, comandi di deploy, dove sono i secret.

### Pulizia

Le stanze non scadono automaticamente. Aggiungi un job:

```sql
-- Richiede l'estensione pg_cron nel progetto Supabase.
select cron.schedule(
  'cleanup-briscola-rooms',
  '0 4 * * *',
  $$
    delete from public.rooms
    where updated_at < now() - interval '3 days'
      and status <> 'playing';
  $$
);
```

Adatta la finestra alla tua privacy policy. Non cancellare partite in corso senza un criterio esplicito.

---

## 15. Troubleshooting

| Sintomo | Causa probabile | Soluzione |
| --- | --- | --- |
| “Online non configurato” | `VITE_SUPABASE_*` mancanti al build | Crea `.env.local`, riavvia Vite, rifai build. Su Pages imposta i secret. |
| “Accesso anonimo non disponibile” | Anonymous Sign-Ins disabilitato | Authentication → Providers → abilita Anonymous. |
| `401` / “Sessione non valida” | Token assente o scaduto | Ricarica, verifica `ensureUser`, controlla la sessione Supabase. |
| `404` “Funzione non trovata” | Funzione non deployata o nome errato | `supabase functions deploy briscola`, verifica il nome. |
| `500` con “relation rooms does not exist” | Migrazione non applicata | Esegui la migrazione o `supabase db push`. |
| `403` “Non fai parte di questa stanza” | Utente non host/guest o RLS | Controlla `host_id`/`guest_id`, sessione e join. |
| Realtime non aggiorna | Tabella non nella publication o RLS | Controlla `pg_publication_tables`; usa il pulsante Aggiorna/polling. |
| `409` conflitto | Due aggiornamenti simultanei | Ricarica la stanza; non inviare due mosse contemporaneamente. |
| Stanza non trovata dopo un po’ | Host uscito, stanza cancellata o cleanup | Crea una nuova stanza. |
| `Failed to fetch` | URL errato, rete assente, progetto in pausa | Verifica URL, connessione e stato del progetto Supabase. |
| Il guest non vede l’host | RLS/join non completato | Ricarica; controlla che `guest_id` sia valorizzato. |
| Il client mostra ancora la versione vecchia | Service worker/cache | Chiudi le schede, hard reload, cancella service worker. |
| Le carte sembrano sbagliate | Motore client/Edge non sincronizzato | `npm run sync:engine`, test, redeploy. |
| `service_role key` mancante | Secret funzione non configurato | Controlla le variabili della Edge Function nella dashboard. |

### Debug RLS rapido

Da SQL Editor, con l’utente interessato, non puoi facilmente impersonare `auth.uid()`. Usa i log e le policy. Per test mirati puoi creare un SQL con `set local role authenticated; set local request.jwt.claims = '...'` in un ambiente di staging, ma evita test distruttivi in produzione.

---

## 16. SQL utile

### Vedere le ultime stanze

```sql
select code, status, host_name, guest_name, version, created_at, updated_at
from public.rooms
order by created_at desc
limit 20;
```

### Contare le stanze per stato

```sql
select status, count(*) as rooms
from public.rooms
group by status
order by rooms desc;
```

### Eliminare una stanza specifica

```sql
delete from public.rooms where code = '7K4PX';
```

Le foreign key con `on delete cascade` eliminano anche mani e segreti.

### Verificare che i client non possano leggere i segreti

```sql
select has_table_privilege('authenticated', 'public.room_secrets', 'select') as client_can_select;
```

Deve restituire `false`.

### Controllare le policy di `room_hands`

```sql
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'room_hands';
```

La policy `hands_read_own` deve usare `auth.uid() = user_id`.

### Stanze abbandonate

```sql
select code, status, updated_at
from public.rooms
where updated_at < now() - interval '1 day'
order by updated_at;
```

### Audit dimensione dati

```sql
select
  pg_size_pretty(pg_total_relation_size('public.rooms')) as rooms,
  pg_size_pretty(pg_total_relation_size('public.room_hands')) as hands,
  pg_size_pretty(pg_total_relation_size('public.room_secrets')) as secrets;
```

---

## 17. Checklist di produzione

Prima di considerare l’online “pubblico”:

- [ ] Progetto Supabase di produzione separato dallo staging.
- [ ] Anonymous Sign-Ins abilitato.
- [ ] Migrazione applicata e verificata.
- [ ] RLS attiva su tutte e tre le tabelle.
- [ ] `room_secrets` inaccessibile ad anon/authenticated.
- [ ] Edge Function deployata con JWT attivo.
- [ ] Motore client/Edge sincronizzato e test verdi.
- [ ] `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` impostati su GitHub.
- [ ] Nessuna service role key nel repository o nel bundle.
- [ ] CORS ristretto, se possibile.
- [ ] Rate limiting/anti-abuso pianificato.
- [ ] Pulizia stanze con `pg_cron` o job esterno.
- [ ] Backup e procedura di rollback.
- [ ] Test a due browser completato.
- [ ] Test mobile completato.
- [ ] PWA installabile e offline locale verificata.
- [ ] Privacy policy e data retention definite.
- [ ] Monitoraggio log/errori attivo.
- [ ] Budget/alert Supabase impostati.

---

## 18. Riferimenti

Documentazione ufficiale Supabase:

- [Supabase Auth — Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Realtime — Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Scheduling and pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Pricing e limiti](https://supabase.com/pricing)

Documentazione del progetto:

- [`briscola-pwa/README.md`](../README.md)
- [`briscola-pwa/supabase/README.md`](../supabase/README.md)
- [Migrazione SQL](../supabase/migrations/20261112090000_briscola.sql)
- [Edge Function](../supabase/functions/briscola/index.ts)

---

## Nota finale

In questo ambiente non erano disponibili un progetto Supabase reale né Docker, quindi l’online è stato verificato a livello di motore, UI e build, ma non con una partita reale tra due dispositivi. La checklist della sezione 9 è il test da eseguire prima di annunciare l’online come pronto.
