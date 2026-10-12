# BUCIO — Piano: account, livelli e login

> Obiettivo: trasformare BUCIO da PWA "stateless" a gioco con **account utente,
> login, progressione a livelli e salvataggio nel cloud**, mantenendo la
> semplicità attuale (niente server da gestire, si continua a pubblicare su
> GitHub Pages).

---

## 1. Stato attuale (punto di partenza)

| Cosa | Come funziona oggi |
|---|---|
| Hosting | GitHub Pages, sito statico (nessun backend) |
| Salvataggi | `localStorage` tramite `store` (`src/core/utils.js`) |
| Record | Chiavi `bucio.best`, `bucio.best.<modalità>.<tema>`, `bucio.bestSize` |
| Sessione | Nessuna: ogni visitatore è anonimo, progressi legati al singolo browser |
| Modalità | `città` (2 min) e `continente` (3 min, knockout) in `src/game/modes.js` |

**Conseguenza:** cambiando telefono o cancellando Safari i progressi spariscono.
Il piano risolve questo e aggiunge la meta-gioco (XP, livelli, sblocchi, classifiche).

---

## 2. Architettura consigliata: Supabase

Il sito resta statico su GitHub Pages; tutto il "server" è un Backend-as-a-Service.

| Opzione | Pro | Contro | Verdetto |
|---|---|---|---|
| **Supabase** | Postgres + Auth + Edge Functions + RLS, free tier abbondante, SDK JS leggero | Server EU da scegliere | ✅ **scelta** |
| Firebase | Maturo, ottima documentazione | Firestore NoSQL meno adatto a classifiche; vendor lock Google | valida alternativa |
| Backend custom (Node + Postgres su Fly.io/Render) | Controllo totale | Server, deploy, sicurezza, manutenzione: tutto a mano | no, troppo per un hobby |
| Cloudflare Workers + D1 | Economicissimo | Auth da costruire a mano | no |

**Perché Supabase:** Auth pronto (email magic link, Google, Apple), Postgres con
Row Level Security (gli utenti possono toccare solo i propri dati), Edge
Functions per validare i punteggi, free tier: 50k utenti MAU + 500 MB database.

```
Browser/PWA (Vite + three.js)  ──HTTPS──▶  Supabase
   │  gioco offline via SW                ├─ Auth (email, Google, Apple)
   └─ sync quando torna online            ├─ Postgres + RLS (profili, run, livelli)
                                          └─ Edge Functions (valida punteggi, classifiche)
```

---

## 3. Le fasi

### Fase 0 — Fondamenta (½ giornata)
- [ ] Progetto Supabase (regione EU), SDK `@supabase/supabase-js` come dipendenza Vite
- [ ] Variabili `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env` (la anon key è pubblica per design: la sicurezza la fa RLS)
- [ ] Client Supabase con graceful fallback: se offline/errore → gioco identico a oggi
- [ ] Versionare le chiavi localStorage attuali (`bucio.v2.*`) per la migrazione

### Fase 1 — Login e account (1–2 weekend)
- [ ] Modalità **ospite** invariata: si gioca senza account, esattamente come adesso
- [ ] Accesso con: **email magic link** (niente password da ricordare), **Google**, **Apple** (obbligatorio se un giorno si pubblica su App Store)
- [ ] Schermata account nello stile di BUCIO: accedi / esci, eliminazione account
- [ ] Al primo login: crea riga in `profiles` (trigger DB), lega i record locali già esistenti
- [ ] PWA: la sessione vive in localStorage; offline si gioca da ospite, il sync riparte al ritorno della rete

### Fase 2 — Salvataggio nel cloud (1 weekend)
- [ ] Migrazione automatica: i vecchi `bucio.best.*` locali vengono caricati nel profilo al primo sync
- [ ] Scrittura a **fine partita** (hook nel flusso `game over` di `screens.js`): punteggio, dimensione max, modalità, tema
- [ ] Local-first: localStorage resta la copia di lavoro, il cloud è la verità dei record
- [ ] Conflitti: per i record vince il massimo (non serve merge complicato)

### Fase 3 — Livelli e sblocchi (1–2 weekend)
- [ ] XP guadagnati a fine run (formula sotto), livello salvato nel profilo
- [ ] Barra XP in menu e schermata risultati
- [ ] Sblocco contenuti: skin del buco, temi, modalità, perk da equipaggiare
- [ ] Sfide giornaliere (3 al giorno, generate da seed data + modalità)

### Fase 4 — Classifiche (1 weekend)
- [ ] Classifica globale per modalità (vista SQL, paginata)
- [ ] Anti-cheat: i punteggi arrivano solo da Edge Function che verifica plausibilità (punti/secondo, dimensione max, durata run)
- [ ] Classifica tra amici (codice invito) — opzionale, fase 4b

### Fase 5 — App store (opzionale)
- [ ] Wrapper **Capacitor** attorno alla stessa codebase → iOS/Android
- [ ] "Sign in with Apple" + privacy policy + account deletion (requisiti Apple)
- [ ] Push per sfide giornaliere (FCM/APNs)
- [ ] Il PWA resta il canale principale; lo store è un extra

---

## 4. Schema database (Supabase SQL)

```sql
-- Profilo pubblico (1 riga per utente, creata da trigger su auth.users)
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique check (char_length(username) between 3 and 16),
  xp            int  not null default 0,
  level         int  not null default 1,
  created_at    timestamptz not null default now()
);

-- Una riga per partita finita (feed + statistiche)
create table runs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  mode        text not null,                -- 'citta' | 'continente' | ...
  theme       text not null,
  score       int  not null check (score >= 0 and score < 100000000),
  max_radius  real not null,
  duration_s  int  not null,
  created_at  timestamptz not null default now()
);

-- Record personali per (utente, modalità, tema) — lettura pubblica, scrittura solo server
create table personal_bests (
  user_id   uuid references profiles(id) on delete cascade,
  mode      text not null,
  theme     text not null,
  score     int  not null default 0,
  max_radius real not null default 0,
  primary key (user_id, mode, theme)
);

-- Sblocci: skin, temi, perk
create table unlocks (
  user_id    uuid references profiles(id) on delete cascade,
  content_id text not null,                 -- 'skin.gold', 'theme.neon', ...
  primary key (user_id, content_id)
);

-- Abilita lettura pubblica delle classifiche, scrittura solo al proprietario
alter table profiles enable row level security;
alter table runs     enable row level security;
create policy "pubblico legge"   on profiles for select using (true);
create policy "io modifico me"   on profiles for update using (auth.uid() = id);
create policy "pubblico legge"   on runs for select using (true);
create policy "io scrivo le mie" on runs    for insert with check (auth.uid() = user_id);
-- personal_bests e unlocks si scrivono SOLO dalle Edge Functions (service role)
```

---

## 5. Sistema di livelli

**XP a fine partita** (intenzionalmente semplice e legato a ciò che il gioco misura già):

```
xp_run = round(score / 10)          # il mangiare è la fonte principale
       + max_radius bonus           # 1 XP per 0.1 di raggio oltre R0
       + 25 se nuovo record personale
       + 15 per sfida giornaliera completata
```

**Curva livelli:** cumulative, crescente ma senza muri:

```
XP per passare da L a L+1  =  100 + (L - 1) × 45      →  L1→2: 100, L10→11: 505, L49→50: 2260
XP totale per il livello 50 ≈  53 000  (≈ 530 000 punti accumulati: mesi di gioco casuali, settimane per chi mira in alto)
```

| Livello | Sblocco |
|---|---|
| 2 | Skin **Oro** |
| 4 | Tema **Neon** |
| 6 | Perk: parti con 1 power-up casuale |
| 8 | Skin **Buco nero saturo** |
| 10 | Sfide giornaliere + classifica |
| 15 | Tema **Tramonto** |
| 20 | Modalità **Continente** con moltiplicatore XP ×1.5 |
| 30 | Skin **Singolarità** (animazione speciale) |
| 50 | Titolo onorario nel profilo |

Le soglie sono nel codice (`src/game/progression.js`, nuovo) così sono modificabili
senza migrazioni DB; il DB conserva solo `xp` totale.

---

## 6. Anti-cheat (essenziale, non paranoia)

1. I punteggi **non** vengono scritti dal client direttamente: `POST /functions/v1/submit-run`
2. L'Edge Function verifica: `score/duration_s` sotto soglia plausibile, `max_radius` coerente col punteggio, token utente valido, max 1 run/secondo
3. Classifica costruita su `runs` validati; run sospetti conservati ma esclusi
4. BUCIO è un gioco per divertirsi: serve solo a tenere la top 100 decente

---

## 7. Privacy e obblighi

- Privacy policy breve e onesta: dati raccolti (email, punteggi), perché, dove (EU), per quanto
- **Cancellazione account self-service** (bottone nelle impostazioni → `delete` a cascata via FK)
- RLS: nessuno può leggere/modificare dati altrui, anche manipolando il client
- Se si pubblica sugli store: privacy nutrition label (Apple) + Data Safety (Google)

---

## 8. Costi

| Voce | Fino a… | Poi |
|---|---|---|
| GitHub Pages | sempre gratis | — |
| Supabase Free | 50k MAU, 500 MB DB, 500k Edge inv/mese | **Pro 25 $/mese** |
| Dominio (opzionale) | — | ~10 $/anno |
| Capacitor/App Store (solo fase 5) | — | 99 $/anno Apple, 25 $ una tantum Google |

Realistico per un gioco hobby: **0 €/mese per molto tempo.**

---

## 9. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Supabase giù → gioco rotto | Il gioco funziona comunque da ospite: auth e sync sono un layer aggiuntivo con fallback silenzioso |
| Offline-first incasinato | Si gioca sempre; il sync avviene solo online, record locali = verità finché non sincronizzati |
| Scope creep | Fasi ordinate: si può fermare dopo qualsiasi fase e avere comunque valore (dopo F1: login; dopo F3: livelli; ecc.) |
| Banale furto di sessione | RLS limita il danno al singolo account; nessun dato sensibile oltre a email e punteggi |

---

## 10. Ordine dei lavori — riassunto

```
F0 fondamenta  ──▶  F1 login  ──▶  F2 cloud save  ──▶  F3 livelli  ──▶  F4 classifiche  ──▶  F5 store
 ½ giornata        1-2 w.e.        1 weekend           1-2 w.e.          1 weekend           opzionale
```

Stima totale: **3–5 weekend** di lavoro partendo da quello che c'è.
Il primo traguardo visibile (login + record nel cloud) arriva già dopo F2.
