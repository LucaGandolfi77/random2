# 👻 Snap PWA — Fotocamera con Filtri

Clone di Snapchat come PWA: fotocamera in tempo reale con **lenti volto**
(tracciamento MediaPipe FaceLandmarker, 478 landmark) e **filtri retrò**.
Le snap restano sul dispositivo (IndexedDB) — niente server, niente account.

## Filtri

| Lenti volto | Filtri immagine |
|---|---|
| 🐶 Cagnolino (orecchie + naso + lingua) | ⚪ B/N · 🎩 Noir · 🟤 Seppia |
| 😎 Occhiali da sole | 🌈 Vivido · 🧊 Freddo · 🔥 Caldo |
| 👑 Corona | 🌓 Negativo · 🌀 Psichedelico (animato) |
| 😍 Occhi a cuore · 🐱 Gatto (baffi) | 🟪 Mosaico · 🌑 Vignetta · 🎞️ Grana |
| 🐰 Coniglio · 🤖 Robot (visiera LED) | 📼 VHS (scanline + frangia) |
| 🤠 Cowboy · 😈 Diavolo · 😇 Angelo | 🟣 Duotone · 🌡️ Termica · ☁️ Sogno (bloom) |
| 🌸 Blush + scintille · 🤮 Arcobaleno | |
| 🐾 Quiz sulla fronte: Che animale? · Che cibo? · Che mood? (estrazione animata) | |

## Requisiti

- **HTTPS** (obbligatorio per `getUserMedia`) — GitHub Pages va bene
- Filtri volto: al primo uso caricano l'engine MediaPipe da `vendor/`
  (~15 MB, già pubblicati col sito e cachati dal service worker);
  dalla seconda apertura funzionano anche offline
- iOS Safari 16.4+ consigliato (base per MediaPipe Tasks Vision)

## Funzioni

- Fotocamera anteriore/posteriore, specchio automatico sul frontale
- Flash a schermo (i telefoni non hanno luce frontale… quella sì 👻)
- Scatto → caption → salva nei **Ricordi** / scarica / scarta
- Ricordi: griglia, visualizzatore, eliminazione, download
- Installabile: **Condividi → Aggiungi a Home**
