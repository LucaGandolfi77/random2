/**
 * ===== Territorio PWA — app =====
 * Loop a timestep fisso, joystick virtuale touch, HUD, classifica live,
 * feed eliminazioni, suoni sintetizzati e record personali (localStorage).
 */

import { creaPartita, passo, pctDi, CELLE } from './gioco.js';
import { creaRenderer } from './render.js';

const $ = (sel) => document.querySelector(sel);

const canvas = $('#campo');
const renderer = creaRenderer(canvas);

let partita = null;
let statoUI = 'menu'; // menu | gioco | pausa | fine
let precedente = 0;
let accumulo = 0;
const PASSO = 1 / 60;

/* ---------- record personali ---------- */
const leggiRecord = () => {
  try { return JSON.parse(localStorage.getItem('territorio.record')) ?? { pct: 0, ucc: 0 }; }
  catch { return { pct: 0, ucc: 0 }; }
};
const salvaRecord = (r) => {
  try { localStorage.setItem('territorio.record', JSON.stringify(r)); } catch { /* modalità privata */ }
};
let record = leggiRecord();

/* ---------- audio sintetizzato ---------- */
let audioCtx = null;
function beep(freq, durata, tipo = 'square', vol = 0.12, slide = 0) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + durata);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durata);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + durata);
  } catch { /* audio bloccato: pazienza */ }
}
const suonoCattura = () => { beep(520, 0.09); setTimeout(() => beep(760, 0.12), 70); };
const suonoUccisione = () => beep(900, 0.16, 'sawtooth', 0.15, -600);
const suonoMorte = () => beep(160, 0.45, 'sawtooth', 0.18, -110);
const suonoClick = () => beep(640, 0.06, 'triangle', 0.1);

/* ---------- feed / toast ---------- */
function toast(testo, colore = '#ffffff') {
  const el = document.createElement('div');
  el.className = 'feed-msg';
  el.style.borderColor = colore;
  el.innerHTML = testo;
  $('#feed').appendChild(el);
  while ($('#feed').children.length > 4) $('#feed').firstChild.remove();
  setTimeout(() => el.classList.add('via'), 2100);
  setTimeout(() => el.remove(), 2600);
}

/* ---------- avvio partita ---------- */
function avvia(opts = {}) {
  suonoClick();
  if (opts && opts.currentTarget) opts = {}; // chiamato direttamente da un listener
  partita = creaPartita({ bot: 4, respawn: opts.respawn !== false });
  $('#hud-bot').textContent = partita.giocatori.length - 1;
  $('#hud-modalita').textContent = partita.respawn ? 'classica' : 'arena';
  $('#hud').hidden = false;
  $('#menu').classList.remove('visible');
  $('#fine').classList.remove('visible');
  $('#pausa').classList.remove('visible');
  $('#feed').innerHTML = '';
  statoUI = 'gioco';
  precedente = performance.now();
  accumulo = 0;
}

function tornaAlMenu() {
  suonoClick();
  statoUI = 'menu';
  partita = null;
  $('#hud').hidden = true;
  $('#fine').classList.remove('visible');
  $('#pausa').classList.remove('visible');
  $('#menu').classList.add('visible');
  aggiornaRecordNelMenu();
}

function finePartita() {
  statoUI = 'fine';
  const p = partita.giocatori[0];
  record.pct = Math.max(record.pct, p.stats.maxPct);
  record.ucc = Math.max(record.ucc, p.stats.uccisioni);
  salvaRecord(record);
  $('#fine-pct').textContent = p.stats.maxPct.toFixed(1) + '%';
  $('#fine-ucc').textContent = p.stats.uccisioni;
  $('#fine-tempo').textContent = Math.floor(partita.t) + 's';
  $('#fine-record').textContent =
    `Record: ${record.pct.toFixed(1)}% · ${record.ucc} eliminazioni`;
  $('#fine').classList.add('visible');
}

function aggiornaRecordNelMenu() {
  record = leggiRecord();
  $('#menu-record').textContent =
    record.pct > 0 ? `Il tuo record: ${record.pct.toFixed(1)}% · ${record.ucc} eliminazioni` : 'Prima partita: buona fortuna!';
}

/* ---------- eventi di gioco → UI ---------- */
function drenaEventi() {
  if (!partita?.eventi.length) return;
  for (const e of partita.eventi) {
    const nomi = partita.giocatori.map((g) => g.nome);
    const colore = (i) => partita.giocatori[i].colore;
    if (e.tipo === 'cattura') {
      if (e.chi === 0) {
        toast(`+${((e.n * 100) / CELLE).toFixed(1)}% territorio`, '#4ade80');
        suonoCattura();
      }
    } else if (e.tipo === 'uccisione') {
      if (e.vittima === 0) {
        toast(`Eliminato da <b style="color:${colore(e.killer)}">${nomi[e.killer]}</b> 💀`, '#f87171');
        suonoMorte();
        salvaRecord(record = {
          pct: Math.max(record.pct, partita.giocatori[0].stats.maxPct),
          ucc: Math.max(record.ucc, partita.giocatori[0].stats.uccisioni),
        });
        setTimeout(finePartita, 1100);
      } else {
        const io = e.killer === 0;
        toast(
          io ? `Hai eliminato <b>${nomi[e.vittima]}</b> ⚔️`
             : `<b style="color:${colore(e.killer)}">${nomi[e.killer]}</b> ⚔️ ${nomi[e.vittima]}`,
          io ? '#fbbf24' : 'rgba(255,255,255,0.75)'
        );
        if (io) suonoUccisione();
      }
    } else if (e.tipo === 'vittoria') {
      statoUI = 'fine';
      $('#fine-titolo').textContent = 'ARENA LIBERATA';
      $('#fine-sottotitolo').textContent = `Hai eliminato tutti i ${e.uccisi} bot. Una vita sola.`;
      salvaRecord(record = {
        pct: Math.max(record.pct, partita.giocatori[0].stats.maxPct),
        ucc: Math.max(record.ucc, partita.giocatori[0].stats.uccisioni),
      });
      suonoCattura();
      $('#fine').classList.add('visible');
    }
    // 'respawn': nessun toast, si vede dalla minimappa
  }
  partita.eventi.length = 0;
}

/* ---------- HUD ---------- */
let ultimoHud = 0;
function aggiornaHud(t) {
  if (!partita || t - ultimoHud < 250) return;
  ultimoHud = t;
  const io = partita.giocatori[0];
  $('#hud-pct').textContent = pctDi(io).toFixed(1) + '%';
  $('#hud-kill').textContent = io.stats.uccisioni;
  $('#hud-bot').textContent = partita.giocatori.filter((g) => g.idx && g.viva).length;

  // tappe celebrative
  const pct = pctDi(io);
  for (const soglia of [25, 40, 50]) {
    if (pct >= soglia && !partita.tappe[soglia]) {
      partita.tappe[soglia] = true;
      toast(`🎯 ${soglia}% del territorio!`, '#fbbf24');
      suonoCattura();
    }
  }

  // classifica live
  const ordine = [...partita.giocatori].sort((a, b) => b.celle - a.celle);
  $('#classifica').innerHTML = ordine.map((g) => `
    <div class="riga ${g.idx === 0 ? 'io' : ''}">
      <span class="pallino" style="background:${g.colore}"></span>
      <span class="nome">${g.nome}${g.viva ? '' : ' 💀'}</span>
      <span class="pct">${pctDi(g).toFixed(1)}%</span>
    </div>`).join('');
}

/* ---------- loop ---------- */
function frame(t) {
  requestAnimationFrame(frame);
  if (!partita) return;
  const dt = Math.min(0.1, (t - precedente) / 1000 || 0);
  precedente = t;
  if (statoUI === 'gioco') {
    accumulo += dt;
    while (accumulo >= PASSO) { passo(partita, PASSO); accumulo -= PASSO; }
  }
  drenaEventi();
  renderer.disegna(partita);
  aggiornaHud(t);
}

/* ---------- input: joystick virtuale ---------- */
const joyBase = $('#joystick-base');
const joyStick = $('#joystick-stick');
let joyId = null, joyX = 0, joyY = 0, ultimaDir = null;

const RAGGIO = 46;
function direzioneDaVettore(vx, vy) {
  // assi con isteresi: un asse vince solo se domina del 25%
  const ax = Math.abs(vx), ay = Math.abs(vy);
  if (ax > ay * 1.25) return vx > 0 ? 0 : 2;
  if (ay > ax * 1.25) return vy > 0 ? 1 : 3;
  return ultimaDir; // zona grigia: mantieni
}

function muoviStick(vx, vy) {
  const len = Math.hypot(vx, vy) || 1;
  const clamped = Math.min(len, RAGGIO);
  const sx = (vx / len) * clamped, sy = (vy / len) * clamped;
  joyStick.style.transform = `translate(${sx}px, ${sy}px)`;
  if (len < 12) return; // zona morta
  const d = direzioneDaVettore(vx, vy);
  if (d != null && d !== ultimaDir && partita) {
    ultimaDir = d;
    partita.giocatori[0].input.dir = d;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (statoUI !== 'gioco' || joyId !== null) return;
  joyId = e.pointerId;
  joyX = e.clientX; joyY = e.clientY;
  joyBase.style.left = (joyX - RAGGIO) + 'px';
  joyBase.style.top = (joyY - RAGGIO) + 'px';
  joyBase.hidden = false;
  joyStick.style.transform = 'translate(0,0)';
  canvas.setPointerCapture(joyId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joyId) return;
  muoviStick(e.clientX - joyX, e.clientY - joyY);
});
const rilasciaJoy = (e) => {
  if (e.pointerId !== joyId) return;
  joyId = null;
  joyBase.hidden = true;
  ultimaDir = null;
};
canvas.addEventListener('pointerup', rilasciaJoy);
canvas.addEventListener('pointercancel', rilasciaJoy);

/* ---------- input: tastiera (desktop) ---------- */
const TASTI = {
  ArrowRight: 0, KeyD: 0,
  ArrowDown: 1, KeyS: 1,
  ArrowLeft: 2, KeyA: 2,
  ArrowUp: 3, KeyW: 3,
};
window.addEventListener('keydown', (e) => {
  const d = TASTI[e.code];
  if (d == null || !partita) return;
  e.preventDefault();
  partita.giocatori[0].input.dir = d;
  ultimaDir = d;
});

/* ---------- pausa ---------- */
function pausa() {
  if (statoUI !== 'gioco') return;
  statoUI = 'pausa';
  $('#pausa').classList.add('visible');
}
function riprendi() {
  suonoClick();
  statoUI = 'gioco';
  $('#pausa').classList.remove('visible');
  precedente = performance.now();
  accumulo = 0;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pausa(); });

/* ---------- collegamenti UI ---------- */
$('#gioca-btn').addEventListener('click', () => avvia());
$('#arena-btn').addEventListener('click', () => avvia({ respawn: false }));
$('#rigioca-btn').addEventListener('click', () => avvia());
$('#menu-btn').addEventListener('click', tornaAlMenu);
$('#pausa-btn').addEventListener('click', pausa);
$('#riprendi-btn').addEventListener('click', riprendi);
$('#abbandona-btn').addEventListener('click', tornaAlMenu);

window.addEventListener('resize', () => renderer.ridimensiona());
renderer.ridimensiona();
aggiornaRecordNelMenu();
requestAnimationFrame(frame);

/* service worker */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
