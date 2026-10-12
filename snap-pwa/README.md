# 👻 Snap PWA — Fotocamera con Filtri

Clone di Snapchat come PWA: fotocamera in tempo reale con **lenti volto**
(tracciamento MediaPipe FaceLandmarker, 478 landmark) e **filtri retrò**.
Le snap restano sul dispositivo (IndexedDB) — niente server, niente account.

## Filtri

| Lenti volto | Filtri immagine |
|---|---|
| 🐶 Cagnolino (orecchie + naso + lingua) | ⚪ B/N · 🎩 Noir · 🟤 Seppia |
| 😎 Occhiali da sole | 🌈 Vivido · 🧊 Freddo · 🔥 Caldo |
| 👑 Corona | 🌓 Negativo · 🦄 Arcobaleno (animato) |
| 😍 Occhi a cuore | 🟪 Mosaico · 🌑 Vignetta · 🎞️ Grana |

## Requisiti

- **HTTPS** (obbligatorio per `getUserMedia`) — GitHub Pages va bene
- Filtri volto: al primo uso scaricano il modello MediaPipe (~4 MB) da CDN;
  dopo vengono cachati dal service worker e funzionano anche offline
- iOS Safari 16.4+ consigliato (base per MediaPipe Tasks Vision)

## Funzioni

- Fotocamera anteriore/posteriore, specchio automatico sul frontale
- Flash a schermo (i telefoni non hanno luce frontale… quella sì 👻)
- Scatto → caption → salva nei **Ricordi** / scarica / scarta
- Ricordi: griglia, visualizzatore, eliminazione, download
- Installabile: **Condividi → Aggiungi a Home**
