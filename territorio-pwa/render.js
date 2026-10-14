/**
 * ===== Territorio PWA — renderer =====
 * Camera che segue il giocatore, griglia visibile only, scie, teste,
 * flash di cattura e minimappa cachata (ridisegnata ogni 0,25 s).
 */

import { LATO } from './gioco.js';

const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

export function creaRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;

  // minimappa: canvas offscreen 1 px = 1 cella, ridisegnata a scadenza
  const mini = document.createElement('canvas');
  mini.width = mini.height = LATO;
  const mctx = mini.getContext('2d');
  let ultimaMini = -1;

  let camX = LATO / 2, camY = LATO / 2;

  function ridimensiona() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function disegna(st) {
    const p = st.giocatori[0];
    if (p.viva) { camX = p.px; camY = p.py; } // se morta la camera resta ferma

    const cell = Math.max(8, Math.min(30, Math.min(w, h) / 17));
    const sx = (x) => (x - camX) * cell + w / 2;
    const sy = (y) => (y - camY) * cell + h / 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0d13';
    ctx.fillRect(0, 0, w, h);

    // campo
    ctx.fillStyle = '#10141d';
    ctx.fillRect(sx(0), sy(0), LATO * cell, LATO * cell);

    // intervallo visibile
    const x0 = Math.max(0, Math.floor(camX - w / 2 / cell) - 1);
    const x1 = Math.min(LATO, Math.ceil(camX + w / 2 / cell) + 1);
    const y0 = Math.max(0, Math.floor(camY - h / 2 / cell) - 1);
    const y1 = Math.min(LATO, Math.ceil(camY + h / 2 / cell) + 1);

    // griglia
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x++) { ctx.moveTo(sx(x), sy(0)); ctx.lineTo(sx(x), sy(LATO)); }
    for (let y = y0; y <= y1; y++) { ctx.moveTo(sx(0), sy(y)); ctx.lineTo(sx(LATO), sy(y)); }
    ctx.stroke();

    // territori (un path per colore)
    for (const g of st.giocatori) {
      ctx.fillStyle = g.colore;
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (st.proprietario[y * LATO + x] === g.idx + 1) {
            ctx.rect(sx(x), sy(y), cell + 0.5, cell + 0.5);
          }
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // scie (piene e brillanti)
    for (const g of st.giocatori) {
      if (!g.scia.length) continue;
      ctx.fillStyle = g.colore;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      for (const i of g.scia) {
        const x = i % LATO, y = (i / LATO) | 0;
        if (x < x0 - 1 || x >= x1 + 1 || y < y0 - 1 || y >= y1 + 1) continue;
        ctx.rect(sx(x), sy(y), cell + 0.5, cell + 0.5);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // flash di cattura
    for (const l of st.lampi) {
      const a = 1 - (st.t - l.t0) / 0.35;
      if (a <= 0) continue;
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = '#ffffff';
      const x = l.i % LATO, y = (l.i / LATO) | 0;
      ctx.fillRect(sx(x), sy(y), cell + 0.5, cell + 0.5);
    }
    ctx.globalAlpha = 1;

    // teste
    ctx.textAlign = 'center';
    for (const g of st.giocatori) {
      if (!g.viva) continue;
      const hx = sx(g.px), hy = sy(g.py);
      if (hx < -40 || hy < -40 || hx > w + 40 || hy > h + 40) continue;

      ctx.beginPath();
      ctx.arc(hx, hy, cell * 0.44, 0, Math.PI * 2);
      ctx.fillStyle = g.colore;
      ctx.fill();
      ctx.lineWidth = Math.max(2, cell * 0.08);
      ctx.strokeStyle = g.idx === 0 ? '#ffffff' : 'rgba(0,0,0,0.4)';
      ctx.stroke();

      // occhietto nella direzione di marcia
      ctx.beginPath();
      ctx.arc(hx + DX[g.dir] * cell * 0.17, hy + DY[g.dir] * cell * 0.17, cell * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();

      // nome
      ctx.font = `700 ${Math.max(10, cell * 0.42)}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(g.nome, hx + 1, hy - cell * 0.68 + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(g.nome, hx, hy - cell * 0.68);
    }

    // minimappa (cachata)
    if (st.t - ultimaMini > 0.25) { aggiornaMini(st); ultimaMini = st.t; }
    const ms = Math.min(w, h) * 0.22;
    const mx = w - ms - 14, my = h - ms - 28;
    ctx.globalAlpha = 0.88;
    ctx.drawImage(mini, mx, my, ms, ms);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + 0.5, my + 0.5, ms, ms);
    // riquadro della vista corrente
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeRect(
      mx + ((camX - w / 2 / cell) / LATO) * ms,
      my + ((camY - h / 2 / cell) / LATO) * ms,
      (w / cell / LATO) * ms,
      (h / cell / LATO) * ms
    );
  }

  function aggiornaMini(st) {
    mctx.clearRect(0, 0, LATO, LATO);
    for (let y = 0; y < LATO; y++) {
      for (let x = 0; x < LATO; x++) {
        const i = y * LATO + x;
        const prop = st.proprietario[i];
        const scia = st.sciaDi[i];
        if (scia >= 0) {
          mctx.fillStyle = '#ffffff';
          mctx.fillRect(x, y, 1, 1);
        } else if (prop) {
          mctx.fillStyle = st.giocatori[prop - 1].colore;
          mctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  return { disegna, ridimensiona };
}
