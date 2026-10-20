/*
 * Snap PWA — the minigames.
 *
 * Two games that use the body instead of the fingers:
 *
 *   🥁 Drums   a kit at the bottom of the frame. You move your head over a
 *              pad and open your mouth to hit it. Tilt your head for the
 *              crash, blink for the hi-hat.
 *   🦆 Duck    a rubber duck swims across the frame. Open your mouth when
 *              it is in front of you to catch it. Three ducks get away and
 *              the game is over.
 *
 * They are drawn with the same primitives as the lenses — there is not one
 * image file in here — and their sounds are synthesised, so nothing is
 * downloaded and nothing is bundled.
 *
 * The body is read through leggiVolto() in filters.js: where the face is,
 * how open the mouth is, how far the head is tilted, and how far the eyelids
 * have closed. Every threshold here is relative to what the face is doing
 * right now, not to a fixed number, because a face at arm's length and a
 * face at ten centimetres are the same face.
 */
import { leggiVolto } from './filters.js';

/* ---------- the sound ----------
   Everything is synthesised: a kick is a sine that falls, a snare is a
   burst of noise through a bandpass, a quack is a sawtooth with a fast
   vibrato. No asset, no download, no licence. */
let audioCtx = null;

function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

let rumore = null;
function bufferRumore(ac) {
  if (rumore) return rumore;
  const n = Math.floor(ac.sampleRate * 0.5);
  const b = ac.createBuffer(1, n, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  rumore = b;
  return b;
}

function suono(kind) {
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime;

  const invio = (osc, tipo, f0, f1, dur, vol) => {
    osc.type = tipo;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return g;
  };

  const grana = (filtro, freq, q, dur, vol) => {
    const src = ac.createBufferSource();
    src.buffer = bufferRumore(ac);
    const bp = ac.createBiquadFilter();
    bp.type = filtro;
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  };

  if (kind === 'cassa') {
    invio(ac.createOscillator(), 'sine', 150, 44, 0.22, 0.85);
    grana('lowpass', 400, 1, 0.05, 0.25);
  } else if (kind === 'rullante') {
    grana('bandpass', 1900, 0.9, 0.19, 0.5);
    invio(ac.createOscillator(), 'triangle', 190, 150, 0.14, 0.3);
  } else if (kind === 'tamburo') {
    invio(ac.createOscillator(), 'sine', 240, 120, 0.26, 0.6);
  } else if (kind === 'piatto') {
    grana('highpass', 7600, 0.7, 0.07, 0.35);
  } else if (kind === 'crash') {
    grana('highpass', 4200, 0.5, 1.1, 0.4);
    invio(ac.createOscillator(), 'triangle', 3200, 2400, 0.5, 0.1);
  } else if (kind === 'quack') {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t0);
    o.frequency.exponentialRampToValueAtTime(240, t0 + 0.16);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 22;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain).connect(o.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.45, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    o.connect(g).connect(ac.destination);
    o.start(t0); lfo.start(t0);
    o.stop(t0 + 0.24); lfo.stop(t0 + 0.24);
  } else if (kind === 'punto') {
    invio(ac.createOscillator(), 'sine', 880, 1320, 0.12, 0.28);
  }
}

/* ---------- the shared state ---------- */

/* One state per game, so switching filters and coming back does not lose
   the score. */
const giochi = {
  batteria: {
    punteggio: 0,
    combo: 0,
    migliore: 0,
    ultimoColpo: -9,
    base: null,        // the mouth's resting openness
    basePalpebra: null,
    ultimoColpoPalpebra: -9,
    ultimoCrash: -9,
    ultimoPiatto: -9,
  },
  anatra: {
    punteggio: 0,
    vite: 3,
    anatra: null,
    messaggio: '',
    fine: false,
  },
};

export function statoMinigioco(nome) {
  return giochi[nome];
}

export function azzeraMinigioco(nome) {
  const g = giochi[nome];
  if (!g) return;
  g.ultimoT = undefined;
  if (nome === 'batteria') {
    g.punteggio = 0; g.combo = 0; g.base = null; g.basePalpebra = null;
  } else {
    g.punteggio = 0; g.vite = 3; g.anatra = null; g.messaggio = ''; g.fine = false;
  }
}

/* ---------- the drum kit ---------- */

const PADS = [
  { id: 'cassa', nome: 'Kick', colore: '#ff5f5f' },
  { id: 'rullante', nome: 'Snare', colore: '#ffb03a' },
  { id: 'tamburo', nome: 'Tom', colore: '#ffe14d' },
  { id: 'piatto', nome: 'Hi-hat', colore: '#7ee081' },
];

function disegnaBatteria(ctx, fc, t, W, H, dt) {
  const g = giochi.batteria;
  const v = leggiVolto(fc);

  /* the resting mouth: the baseline the hit is measured against */
  if (g.base === null) g.base = v.apertura;
  if (g.basePalpebra === null) g.basePalpebra = v.battito;
  g.base = Math.min(g.base, v.apertura);
  g.basePalpebra = Math.min(g.basePalpebra, v.battito);

  /* which pad the face is over */
  const xNorm = Math.min(1, Math.max(0, v.centro[0] / W));
  const indice = Math.min(PADS.length - 1, Math.floor(xNorm * PADS.length));

  /* the hit: the mouth opens past the resting shape */
  const apertura = v.apertura - g.base;
  const soglie = 0.055;
  if (apertura > soglie && t - g.ultimoColpo > 0.16) {
    g.ultimoColpo = t;
    g.punteggio += 1;
    g.combo += 1;
    if (g.combo > g.migliore) g.migliore = g.combo;
    suono(PADS[indice].id);
    if (apertura > soglie * 2.2) {
      g.punteggio += 1;
      suono('punto');
    }
  } else if (apertura < soglie * 0.4 && t - g.ultimoColpo > 0.9) {
    g.combo = 0;
  }

  /* the crash: the head tilts */
  if (Math.abs(v.roll) > 0.28 && t - g.ultimoCrash > 0.5) {
    g.ultimoCrash = t;
    g.punteggio += 2;
    g.combo += 1;
    suono('crash');
  }

  /* the hi-hat: the eyes close */
  const battito = v.battito - g.basePalpebra;
  if (battito > 0.22 && t - g.ultimoPiatto > 0.22) {
    g.ultimoPiatto = t;
    g.punteggio += 1;
    g.combo += 1;
    suono('piatto');
  }

  /* the kit */
  const larghezzaPad = Math.min(W * 0.19, 150);
  const altezzaPad = larghezzaPad * 0.30;
  const baseY = H - altezzaPad - 26;
  const totale = larghezzaPad * PADS.length + 12 * (PADS.length - 1);
  const inizioX = (W - totale) / 2;

  for (let i = 0; i < PADS.length; i++) {
    const p = PADS[i];
    const x = inizioX + i * (larghezzaPad + 12);
    const colpo = t - g.ultimoColpo < 0.18 && i === indice;
    const attivo = i === indice;

    ctx.save();
    ctx.beginPath();
    const r = 14;
    ctx.moveTo(x + r, baseY);
    ctx.arcTo(x + larghezzaPad, baseY, x + larghezzaPad, baseY + altezzaPad, r);
    ctx.arcTo(x + larghezzaPad, baseY + altezzaPad, x, baseY + altezzaPad, r);
    ctx.arcTo(x, baseY + altezzaPad, x, baseY, r);
    ctx.arcTo(x, baseY, x + larghezzaPad, baseY, r);
    ctx.closePath();
    ctx.fillStyle = colpo ? p.colore : 'rgba(255,255,255,0.10)';
    ctx.fill();
    ctx.strokeStyle = attivo ? p.colore : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = attivo ? 2.5 : 1.2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = attivo ? p.colore : 'rgba(255,255,255,0.45)';
    ctx.font = `700 ${Math.max(10, larghezzaPad * 0.085)}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.nome, x + larghezzaPad / 2, baseY + altezzaPad / 2);
  }

  /* the crash cymbal, on the right */
  const cx = W - 52;
  const cy = baseY - 16;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 34, 11, -0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fill();
  ctx.restore();

  /* the score */
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${Math.max(15, W * 0.045)}px -apple-system, system-ui, sans-serif`;
  ctx.fillText(String(g.punteggio), 22, 54);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 ${Math.max(10, W * 0.026)}px -apple-system, system-ui, sans-serif`;
  ctx.fillText(g.combo > 2 ? `combo ×${g.combo}` : 'open your mouth to hit', 22, 74);
  ctx.textAlign = 'right';
  ctx.fillText('tilt for the crash · blink for the hi-hat', W - 22, 74);
  ctx.textAlign = 'left';
}

/* ---------- the duck ---------- */

function nuovoAnatra(W, H) {
  const velocita = (0.10 + Math.random() * 0.10) * W;
  return {
    x: Math.random() < 0.5 ? -60 : W + 60,
    y: H * (0.25 + Math.random() * 0.4),
    vx: velocita * (Math.random() < 0.5 ? -1 : 1),
    fase: Math.random() * Math.PI * 2,
    scala: 0.8 + Math.random() * 0.5,
  };
}

function disegnaAnatra(ctx, fc, t, W, H, dt) {
  const g = giochi.anatra;
  const v = leggiVolto(fc);

  if (!g.anatra) g.anatra = nuovoAnatra(W, H);
  const a = g.anatra;

  /* the duck swims */
  a.x += a.vx * dt;
  a.fase += dt * 3;
  const galleggiamento = Math.sin(a.fase) * 6;

  /* caught: the mouth is open and the duck is in front of it */
  const dx = a.x - v.bocca[0];
  const dy = (a.y + galleggiamento) - v.bocca[1];
  const vicino = Math.hypot(dx, dy) < Math.max(60, v.lv * 0.55);
  if (vicino && v.apertura > 0.055) {
    g.punteggio += 1;
    suono('quack');
    g.messaggio = 'preso!';
    g.anatra = nuovoAnatra(W, H);
  } else if (a.x < -90 || a.x > W + 90) {
    g.vite -= 1;
    g.messaggio = 'scappata';
    suono('quack');
    g.anatra = nuovoAnatra(W, H);
    if (g.vite <= 0) g.fine = true;
  }

  /* the duck itself */
  const s = a.scala;
  ctx.save();
  ctx.translate(a.x, a.y + galleggiamento);
  ctx.scale(a.vx < 0 ? -s : s, s);
  ctx.fillStyle = '#ffdd55';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(24, -18, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9a1f';
  ctx.beginPath();
  ctx.moveTo(34, -18);
  ctx.lineTo(50, -14);
  ctx.lineTo(34, -10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#20160a';
  ctx.beginPath();
  ctx.arc(28, -22, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-6, -6, 12, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* the mouth, so the player knows where to be */
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(v.bocca[0], v.bocca[1], Math.max(22, v.lv * 0.22), 0, Math.PI * 2);
  ctx.stroke();

  /* the score and the lives */
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${Math.max(15, W * 0.045)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(g.punteggio), 22, 54);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 ${Math.max(10, W * 0.026)}px -apple-system, system-ui, sans-serif`;
  ctx.fillText(g.fine ? 'game over' : 'open your mouth on the duck', 22, 74);
  ctx.textAlign = 'right';
  ctx.fillText('🦆'.repeat(Math.max(0, g.vite)), W - 22, 56);
  ctx.textAlign = 'left';
}

/* ---------- the entry point ---------- */

/**
 * Draws the active minigame on the overlay. It gets the same face context
 * as the lenses, so it knows where the head is and what the mouth is doing.
 */
export function disegnaMinigioco(ctx, nome, fc, t, W, H) {
  /* the frame delta, so a slow device does not turn the game into slow
     motion and a fast one does not teleport the duck */
  const g = giochi[nome];
  if (!g) return;
  const dt = g.ultimoT === undefined ? 0.016 : Math.min(0.1, Math.max(0, t - g.ultimoT));
  g.ultimoT = t;

  if (nome === 'batteria') disegnaBatteria(ctx, fc, t, W, H, dt);
  else if (nome === 'anatra') disegnaAnatra(ctx, fc, t, W, H, dt);
}

export function suonoMinigioco(kind) {
  suono(kind);
}
