/**
 * ===== Snap PWA — app =====
 * Fotocamera + filtri + scatto + Ricordi (IndexedDB, tutto locale).
 */

import {
  FILTRI, filtroPerId, ensureEngineVolto, disegnaLenteVolto, disegnaCornice, applicaFiltroPixel,
} from './filters.js';

/* ---------- riferimenti DOM ---------- */
const $ = (sel) => document.querySelector(sel);
const video = $('#video');
const overlay = $('#overlay');
const octx = overlay.getContext('2d');
const flashEl = $('#flash');
const statusEl = $('#status');
const toastEl = $('#toast');
const carousel = $('#carousel');

/* ---------- stato ---------- */
const stato = {
  stream: null,
  frontale: true,
  flash: false,
  filtroId: 'nessuno',
  engine: null,          // engine MediaPipe quando caricato
  engineStato: 'idle',   // idle | loading | pronto | errore
  landmarks: null,
  ultimaDetection: 0,
  ogniNFrame: 1,
  frame: 0,
  attivo: false,         // loop di rendering in esecuzione
  ultimaSnap: null,      // { blob, url } in anteprima
};

/* ============================================================
 * SCHERMATE
 * ============================================================ */
function mostra(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('visible', s.id === id);
}

/* ============================================================
 * FOTOCAMERA
 * ============================================================ */
async function avviaFotocamera() {
  const vincoli = {
    audio: false,
    video: {
      facingMode: stato.frontale ? 'user' : 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1440 },
    },
  };
  stato.stream?.getTracks().forEach((t) => t.stop());
  stato.stream = await navigator.mediaDevices.getUserMedia(vincoli);
  video.srcObject = stato.stream;
  await video.play();
  video.classList.toggle('mirror', stato.frontale);
}

async function giraFotocamera() {
  stato.frontale = !stato.frontale;
  $('#flip-btn').textContent = stato.frontale ? '🔄' : '🔁';
  try {
    await avviaFotocamera();
  } catch {
    toast('Fotocamera non disponibile');
    stato.frontale = !stato.frontale;
  }
}

/* ============================================================
 * LOOP DI RENDERING
 * ============================================================ */
function dimensionaOverlay() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  overlay.width = Math.round(overlay.clientWidth * dpr);
  overlay.height = Math.round(overlay.clientHeight * dpr);
}

function loop() {
  if (!stato.attivo) return;
  stato.frame++;
  const t = performance.now() / 1000;
  const filtro = filtroPerId(stato.filtroId);

  /* filtro CSS sul video (anteprima a costo zero) */
  if (filtro.animato) {
    video.style.filter = `saturate(1.3) hue-rotate(${(t * 60) % 360}deg)`;
  } else {
    video.style.filter = filtro.css ?? '';
  }

  /* cornici su overlay */
  octx.clearRect(0, 0, overlay.width, overlay.height);
  if (filtro.cornice) {
    disegnaCornice(octx, filtro, overlay.width, overlay.height, t);
  }

  /* lenti volto */
  if (filtro.volto) {
    gestisciFiltroVolto(filtro, t);
  } else {
    stato.landmarks = null;
    if (stato.filtroId !== 'nessuno') nascondiStatus();
  }

  requestAnimationFrame(loop);
}

async function gestisciFiltroVolto(filtro, t) {
  // engine lazy: la prima volta scarica il modello (richiede rete)
  if (stato.engineStato === 'idle') {
    stato.engineStato = 'loading';
    mostraStatus('Scarico i filtri volto… (solo la prima volta)');
    try {
      stato.engine = await ensureEngineVolto();
      stato.engineStato = 'pronto';
    } catch {
      stato.engineStato = 'errore';
      mostraStatus('Filtri volto non disponibili (serve internet la prima volta)');
      setTimeout(() => stato.filtroId === filtro.id && nascondiStatus(), 3500);
      return;
    }
    nascondiStatus();
  }
  if (stato.engineStato !== 'pronto') return;

  // detection throttled adattivamente (i dispositivi lenti fanno ogni 2 frame)
  if (stato.frame % stato.ogniNFrame === 0) {
    const t0 = performance.now();
    try {
      stato.landmarks = stato.engine.detect(video, t0);
    } catch { /* frame perso: pazienza */ }
    const dt = performance.now() - t0;
    stato.ogniNFrame = dt > 40 ? 2 : 1;
    stato.ultimaDetection = t0;
  }

  if (stato.landmarks) {
    nascondiStatus();
    disegnaLenteVolto(octx, filtro, stato.landmarks, {
      W: overlay.width, H: overlay.height,
      vw: video.videoWidth, vh: video.videoHeight,
      specchio: stato.frontale,
    });
  } else if (performance.now() - stato.ultimaDetection > 1200) {
    mostraStatus('Guarda in camera 👀');
  }
}

/* ============================================================
 * SCATTO
 * ============================================================ */
async function scatta() {
  if (!video.videoWidth) return;
  suonoOturatore();
  flashEl.classList.add('on');
  setTimeout(() => flashEl.classList.remove('on'), 60);

  const filtro = filtroPerId(stato.filtroId);
  const W = 1080;
  const H = Math.round((W * overlay.clientHeight) / overlay.clientWidth);

  const foto = document.createElement('canvas');
  foto.width = W; foto.height = H;
  const ctx = foto.getContext('2d');

  // 1. frame video con object-fit:cover (+ specchio se frontale)
  const scala = Math.max(W / video.videoWidth, H / video.videoHeight);
  const dw = video.videoWidth * scala, dh = video.videoHeight * scala;
  ctx.save();
  if (stato.frontale) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.restore();

  // 2. filtro pixel (equivalente al CSS dell'anteprima)
  applicaFiltroPixel(ctx, filtro, W, H, performance.now() / 1000);

  // 3. cornice + accessori volto, con le stesse coordinate dell'anteprima
  const scalaFoto = W / overlay.width;
  if (filtro.cornice) disegnaCornice(ctx, filtro, W, H, performance.now() / 1000);
  if (filtro.volto && stato.landmarks) {
    ctx.save();
    ctx.scale(scalaFoto, scalaFoto);
    disegnaLenteVolto(ctx, filtro, stato.landmarks, {
      W: overlay.width, H: overlay.height,
      vw: video.videoWidth, vh: video.videoHeight,
      specchio: stato.frontale,
    });
    ctx.restore();
  }

  // 4. blob e anteprima
  const blob = await new Promise((res) => foto.toBlob(res, 'image/jpeg', 0.92));
  mostraAnteprima(blob);
}

/* ============================================================
 * ANTEPRIMA SNAP
 * ============================================================ */
function mostraAnteprima(blob) {
  stato.ultimaSnap?.url && URL.revokeObjectURL(stato.ultimaSnap.url);
  stato.ultimaSnap = { blob, url: URL.createObjectURL(blob), filtro: stato.filtroId };
  $('#preview-img').src = stato.ultimaSnap.url;
  $('#caption').value = '';
  mostra('preview');
  $('#caption').blur();
}

function scarta() {
  stato.ultimaSnap?.url && URL.revokeObjectURL(stato.ultimaSnap.url);
  stato.ultimaSnap = null;
  tornaAllaCamera();
}

async function scarica() {
  if (!stato.ultimaSnap) return;
  const a = document.createElement('a');
  a.href = stato.ultimaSnap.url;
  a.download = `snap-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Snap scaricata ⬇️');
}

async function salvaNeiRicordi() {
  if (!stato.ultimaSnap) return;
  const snap = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    blob: stato.ultimaSnap.blob,
    caption: $('#caption').value.trim(),
    filtro: stato.ultimaSnap.filtro,
    ts: Date.now(),
  };
  try {
    await dbPut(snap);
    toast('Salvata nei Ricordi 💾');
    stato.ultimaSnap.url && URL.revokeObjectURL(stato.ultimaSnap.url);
    stato.ultimaSnap = null;
    tornaAllaCamera();
  } catch {
    toast('Impossibile salvare (modalità privata?)');
  }
}

function tornaAllaCamera() {
  $('#preview-img').src = '';
  mostra('camera');
  if (!stato.attivo) { stato.attivo = true; requestAnimationFrame(loop); }
}

/* ============================================================
 * RICORDI (IndexedDB)
 * ============================================================ */
function dbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('snap-pwa', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('snaps', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const dbPut = (snap) => dbOpen().then((db) => new Promise((res, rej) => {
  const tx = db.transaction('snaps', 'readwrite');
  tx.objectStore('snaps').put(snap);
  tx.oncomplete = res; tx.onerror = () => rej(tx.error);
}));
const dbAll = () => dbOpen().then((db) => new Promise((res, rej) => {
  const rq = db.transaction('snaps').objectStore('snaps').getAll();
  rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
}));
const dbDel = (id) => dbOpen().then((db) => new Promise((res, rej) => {
  const tx = db.transaction('snaps', 'readwrite');
  tx.objectStore('snaps').delete(id);
  tx.oncomplete = res; tx.onerror = () => rej(tx.error);
}));

let snapsCache = [];

async function apriRicordi() {
  stato.attivo = false; // stop al loop: risparmia batteria
  try {
    snapsCache = (await dbAll()).sort((a, b) => b.ts - a.ts);
  } catch { snapsCache = []; }
  const grid = $('#memories-grid');
  grid.innerHTML = '';
  $('#memories-empty').hidden = snapsCache.length > 0;
  for (const s of snapsCache) {
    const cell = document.createElement('button');
    cell.className = 'mem-thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(s.blob);
    img.alt = s.caption || 'Snap';
    img.loading = 'lazy';
    cell.appendChild(img);
    if (s.caption) {
      const cap = document.createElement('span');
      cap.className = 'cap';
      cap.textContent = s.caption;
      cell.appendChild(cap);
    }
    cell.addEventListener('click', () => apriViewer(s, img.src));
    grid.appendChild(cell);
  }
  mostra('memories');
}

function apriViewer(snap, url) {
  $('#viewer-img').src = url;
  $('#viewer-caption').textContent = snap.caption || '';
  $('#viewer-delete').onclick = async () => {
    if (!confirm('Eliminare questa snap?')) return;
    await dbDel(snap.id).catch(() => {});
    toast('Snap eliminata 🗑️');
    chiudiViewer();
    apriRicordi();
  };
  $('#viewer-download').onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `snap-${new Date(snap.ts).toISOString().replace(/[:.]/g, '-')}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  mostra('viewer');
}

function chiudiViewer() {
  $('#viewer-img').src = '';
  mostra('memories');
}

/* ============================================================
 * CAROSELLO FILTRI
 * ============================================================ */
function costruisciCarosello() {
  for (const f of FILTRI) {
    const chip = document.createElement('button');
    chip.className = 'chip-filtro' + (f.id === stato.filtroId ? ' attiva' : '');
    chip.dataset.id = f.id;
    chip.innerHTML = `<span class="emoji">${f.emoji}</span><span class="nome">${f.nome}</span>`;
    chip.addEventListener('click', () => selezionaFiltro(f.id));
    carousel.appendChild(chip);
  }
}

function selezionaFiltro(id) {
  stato.filtroId = id;
  stato.landmarks = null;
  stato.engineStato = stato.engineStato === 'errore' ? 'idle' : stato.engineStato;
  for (const c of carousel.children) c.classList.toggle('attiva', c.dataset.id === id);
  const attivo = carousel.querySelector(`[data-id="${id}"]`);
  attivo?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  const filtro = filtroPerId(id);
  if (!filtro.volto) nascondiStatus();
}

/* ============================================================
 * UTILITÀ
 * ============================================================ */
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('visibile');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visibile'), 2400);
}

function mostraStatus(msg) { statusEl.textContent = msg; statusEl.hidden = false; }
function nascondiStatus() { statusEl.hidden = true; }

/* otturatore sintetizzato (nessun asset) */
let audioCtx = null;
function suonoOturatore() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;
    const durata = 0.09;
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * durata, audioCtx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durata);
    src.connect(gain).connect(audioCtx.destination);
    src.start(t0);
  } catch { /* audio bloccato: pazienza */ }
}

/* ============================================================
 * AVVIO
 * ============================================================ */
function mostraErrore(msg) {
  const el = $('#start-error');
  el.textContent = msg;
  el.hidden = false;
}

async function avviaApp() {
  const btn = $('#start-btn');
  btn.disabled = true;
  btn.textContent = 'Attivo…';
  try {
    await avviaFotocamera();
    dimensionaOverlay();
    mostra('camera');
    stato.attivo = true;
    requestAnimationFrame(loop);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Riprova';
    const nomi = {
      NotAllowedError: 'Permesso negato: consenti la fotocamera dalle impostazioni di Safari (aA → Impostazioni sito → Fotocamera).',
      NotFoundError: 'Nessuna fotocamera trovata su questo dispositivo.',
      NotReadableError: 'La fotocamera è già usata da un\'altra app.',
    };
    mostraErrore(nomi[err?.name] ?? `Errore fotocamera: ${err?.message ?? err}`);
  }
}

/* ---------- eventi ---------- */
$('#start-btn').addEventListener('click', avviaApp);
$('#flip-btn').addEventListener('click', giraFotocamera);
$('#shutter').addEventListener('click', scatta);
$('#flash-btn').addEventListener('click', (e) => {
  stato.flash = !stato.flash;
  e.currentTarget.classList.toggle('attiva', stato.flash);
  toast(stato.flash ? 'Flash schermo attivo ⚡' : 'Flash spento');
});
$('#memories-btn').addEventListener('click', apriRicordi);
$('#memories-close').addEventListener('click', tornaAllaCamera);
$('#discard-btn').addEventListener('click', scarta);
$('#download-btn').addEventListener('click', scarica);
$('#save-btn').addEventListener('click', salvaNeiRicordi);
$('#viewer-close').addEventListener('click', chiudiViewer);
window.addEventListener('resize', dimensionaOverlay);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stato.attivo = false; }
  else if ($('#camera').classList.contains('visible') && !stato.attivo) {
    stato.attivo = true;
    requestAnimationFrame(loop);
  }
});

costruisciCarosello();

/* service worker (shell offline; i modelli CDN vengono cachati al primo uso) */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
