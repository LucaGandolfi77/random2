# 🚩 Territorio PWA — Conquista la griglia

Arena **paper.io-style** giocabile con 4 bot furbi: lascia la scia fuori dal
tuo territorio, chiudi un anello e conquisti tutte le celle racchiuse (anche
quelli degli avversari). Attraversare una scia uccide chi l'ha lasciata;
nel tuo territorio sei invincibile.

## Comandi
- **iPhone**: trascina il dito ovunque sullo schermo → joystick virtuale
- **Desktop**: frecce o WASD

## Architettura multiplayer-ready
Ogni giocatore (umano, bot, remoto) espone solo `input.dir`:

- `gioco.js` — simulazione deterministica a timestep fisso (griglia 80×80,
  cattura BFS ad anello, uccisioni, respawn, furto celle). Zero dipendenze DOM.
- `render.js` — camera, griglia visibile-only, minimappa cachata, flash cattura.
- `app.js` — loop, input, HUD, feed, record in localStorage.

In **fase 2** i bot vengono sostituiti (o affiancati) da giocatori remoti:
input via **Supabase Realtime** (broadcast ~15 Hz, presence per la lobby),
host-authoritative con snapshot quantizzati (~2 KB/s), handover se l'host esce.
La struttura è già quella: basta mappare i messaggi di rete su `input.dir`
e sincronizzare lo stato dall'host.

## Installabile
Condividi → Aggiungi a Home. Il service worker precacha il guscio: gioca offline.
