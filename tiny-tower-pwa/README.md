# 🏢 Mini Tower

PWA ispirata a **Tiny Tower**: costruisci la tua torre piano per piano, apri negozi, assumi abitanti e fai voyage in ascensore per guadagnare mance. Vanilla HTML/CSS/JS, zero dipendenze, gioca anche **offline**.

## 🎮 Meccaniche di gioco

- **Costruisci piani**: Residenziale (+5 posti letto) oppure 6 categorie di negozi (Cibo, Vendita, Servizi, Divertimento, Creatività, Uffici) per 22 negozi diversi.
- **Negozi**: scegli il prodotto da rifornire (paghi il costo), aspetta il rifornimento, i pezzi si vendono nel tempo → riscuoti la cassette 💰. Più dipendenti = produzione e vendita più veloci.
- **Abitanti**: arrivano in città, li accogli dalla Lobby, assegni loro casa e lavoro. Se lavorano nel negozio dei loro sogni ⭐ la produzione accelera.
- **Ascensore**: gli abitanti chiedono un passaggio (bolla 🙋): portali a destinazione e incassa la mancia, con chance di 🔷 Tower Bux. Potenziabile fino a Lv 4 dal Menu (più velocità).
- **VIP ⭐**: di tanto in tanto arriva un VIP in Lobby — Costruttore 👷 (completa una costruzione all'istante), Spendaccione 💸 (compra tutto lo stock di un negozio), Magazziniere 📦 (rifornimento istantaneo), Agente Immobiliare 🏦 (sconto 25% sul prossimo piano). Tocca *Invia* e scegli dove farlo scendere prima che scada il tempo!
- **Missioni 🎯**: sempre 3 missioni attive (costruire piani, corse in ascensore, rifornimenti, popolazione…). Riscuoti premi in 💰 e 🔷: la missione successiva è più difficile ma paga di più.
- **Personalizzazione**: rinomina gli appartamenti con ✏️ dalla loro scheda.
- **Monete 💰 / Tower Bux 🔷**: i bux completano subito le costruzioni e assumono nuovi abitanti.
- **Affitti**: gli abitanti pagano 1 💰 ogni 30s (riscuoti dall'appartamento).
- **Progressione offline** (max 8h): rientri e riscuoti quanto accumulato.
- **Giorno/notte** in base all'ora reale, nuvole, stelle, effetti sonori (disattivabili).

## 🚀 Avvio locale

Il service worker richiede `http://localhost` o HTTPS:

```bash
cd tiny-tower-pwa
python3 -m http.server 8080
# apri http://localhost:8080
```

## 📲 Installazione

- **Chrome/Edge desktop/Android**: icona "Installa" nella barra indirizzi, oppure Menu → *Installa Mini Tower* (anche dal pulsante nel Menu di gioco).
- **iOS Safari**: Condividi → *Aggiungi alla Home*.
- Installata, si avvia a schermo intero in standalone e funziona senza rete.

## 🗂️ Struttura

```
tiny-tower-pwa/
├── index.html            # shell dell'app
├── styles.css            # stili (torre, personaggi CSS, modali, ascensore)
├── game.js               # logica di gioco, rendering, salvataggio, offline
├── manifest.json         # manifest PWA (standalone, portrait)
├── sw.js                 # service worker (cache-first, offline)
├── icons/                # icone 192/512 + maskable (generate)
└── tools/make_icons.py   # generatore icone (solo stdlib Python)
```

## 🆕 Novità v1.1

- Sistema **VIP** con 4 tipologie e target validi contestuali
- **Missioni** progressive con salvataggio livello e ricompense crescenti
- **Ascensore potenziabile** (140 → 300 px/s)
- **Sconti** sul prossimo piano ( coupon Agente Immobiliare, cumulabili fino al 50%)
- Rinomina appartamenti · migrazione automatica salvataggi v1 → v2

## 🔧 Note tecniche

- **Salvataggio**: `localStorage` (autosave ~10s + su pausa/chiusura), versione schema `v1`.
- **Rendering**: la torre è DOM/CSS puro (flex `column-reverse` ancorata in basso); l'ascensore anima `bottom` con transizione lineare a 140 px/s.
- **Economia**: loop a timestamp (`Date.now()/1000`) → pausa/riprocissimo tab gestito senza derive; recupero offline limitato a 8 ore.
- **Service worker**: precache dell'app shell + cache-first con fallback a `index.html`.
- Rigenerare le icone: `python3 tools/make_icons.py`.
