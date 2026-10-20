/**
 * ===== Snap PWA — the app =====
 * Camera + filters + the shot + Memories (IndexedDB, everything local).
 */

import {
  FILTRI, LOOKS, filtroPerId, ensureEngineVolto, ensureEngineStill, disegnaLenteVolto, disegnaCornice, applicaFiltroPixel, applicaTermicaVivo, resetQuizStati,
} from './filters.js';
import {
  impostazioni, salvaImpostazioni, preferiti, togglePreferito, ePreferito,
  apriFoglio, chiudiFoglio, collegaFoglio, alChiudi,
} from './ui.js';

/* ---------- DOM references ---------- */
const $ = (sel) => document.querySelector(sel);
const video = $('#video');
const overlay = $('#overlay');
const octx = overlay.getContext('2d');
const flashEl = $('#flash');
const statusEl = $('#status');
const toastEl = $('#toast');
const carousel = $('#carousel');
const looksRow = $('#looks');

/* ---------- state ---------- */
const stato = {
  stream: null,
  frontale: true,
  flash: false,
  filtroId: 'nessuno',
  engine: null,          // the MediaPipe engine once it is loaded
  engineStato: 'idle',   // idle | loading | ready | error
  landmarks: null,
  ultimaDetection: 0,
  ogniNFrame: 1,
  frame: 0,
  attivo: false,         // the render loop is running
  comparando: false,     // the compare button is held: the raw frame
  countdown: 0,          // the seconds left before the shot
  immagine: null,        // a photo imported from the device, when there is one
  striscia: [],          // the shots of the photo booth strip
  ultimaUrl: null,       // the object URL of the last saved snap
  ultimaSnap: null,      // { blob, url, type, poster?, filter } in the preview
  registrazione: null,   // { rec, canvas, start } during a video
  pressione: 0,          // the long-press timer
};

/* ============================================================
 * SCREENS
 * ============================================================ */
function mostra(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('visible', s.id === id);
}

/* ============================================================
 * THE CAMERA
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
  video.classList.toggle('mirror', stato.frontale && impostazioni.specchio);
}

async function giraFotocamera() {
  stato.frontale = !stato.frontale;
  $('#flip-btn').textContent = stato.frontale ? '🔄' : '🔁';
  try {
    await avviaFotocamera();
  } catch {
    toast('Camera not available');
    stato.frontale = !stato.frontale;
  }
}

/* ============================================================
 * THE RENDER LOOP
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

  /* the CSS filter on the video (a preview that costs nothing) */
  if (stato.comparando) {
    /* the compare button is held: the raw frame, nothing on top of it */
    video.style.filter = '';
  } else if (filtro.animato) {
    video.style.filter = `saturate(1.3) hue-rotate(${(t * 60) % 360}deg)`;
  } else {
    video.style.filter = filtro.css ?? '';
  }

  /* the frames on the overlay */
  octx.clearRect(0, 0, overlay.width, overlay.height);
  if (filtro.cornice && !stato.comparando) {
    disegnaCornice(octx, filtro, overlay.width, overlay.height, t);
  }

  /* the face lenses */
  window.__dbg = window.__dbg || {};
  window.__dbg.filtroId = filtro.id;
  window.__dbg.volto = !!filtro.volto;
  window.__dbg.chiamate = (window.__dbg.chiamate || 0) + 1;
  if (filtro.volto && !stato.comparando) {
    gestisciFiltroVolto(filtro, t);
  } else {
    stato.landmarks = null;
    if (stato.filtroId !== 'nessuno') nascondiStatus();
  }

  /* video recording: I fill the canvas that ends up in the MP4 */
  if (stato.registrazione) {
    const reg = stato.registrazione;
    disegnaFotogramma(reg.canvas.getContext('2d'), reg.canvas.width, reg.canvas.height, t, 'video');
    const p = Math.min(1, (performance.now() - reg.inizio) / DURATA_VIDEO);
    $('#shutter').style.setProperty('--p', p.toFixed(3));
    if (p >= 1) fermaRegistrazione();
  }

  requestAnimationFrame(loop);
}

async function gestisciFiltroVolto(filtro, t) {
  // lazy engine: the first time it loads the model from vendor/ (once)
  if (stato.engineStato === 'idle') {
    stato.engineStato = 'loading';
    mostraStatus('Loading the face filters… (only the first time)');
    try {
      stato.engine = await ensureEngineVolto();
      stato.engineStato = 'pronto';
    } catch {
      stato.engineStato = 'errore';
      mostraStatus('Face filters are not available on this device');
      setTimeout(() => stato.filtroId === filtro.id && nascondiStatus(), 3500);
      return;
    }
    nascondiStatus();
  }
  if (stato.engineStato !== 'pronto') return;

  // the detection is throttled adaptively (slow devices run every 2 frames)
  if (stato.frame % stato.ogniNFrame === 0) {
    const t0 = performance.now();
    try {
      stato.landmarks = stato.engine.detect(video, t0);
    } catch { /* dropped frame: never mind */ }
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
    }, t);
  } else if (performance.now() - stato.ultimaDetection > 1200) {
    mostraStatus('Look at the camera 👀');
  }
}

/* ============================================================
 * THE COMPOSITE FRAME
 * ============================================================ */

/**
 * Draws the composite frame (source + filter + frame + lenses) onto any
 * canvas. It is the only rendering engine: the photo and the video both
 * use it, so what gets saved is what was on screen in the preview.
 *
 * The source is the live video, or a photo imported from the device.
 *
 * mode 'photo'  → the colour filters are baked into the pixels (identical
 *                  to the preview, including the ones ctx.filter cannot do)
 * mode 'video'  → ctx.filter on the GPU (the pixels would cost 30 fps)
 */
function disegnaFotogramma(ctx, W, H, t, modalita) {
  const filtro = filtroPerId(stato.filtroId);
  const src = sorgenteFrame();

  // 1. the frame with object-fit:cover (+ mirroring on the front camera)
  const scala = Math.max(W / src.w, H / src.h);
  const dw = src.w * scala, dh = src.h * scala;
  ctx.save();
  if (!stato.immagine && stato.frontale) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  if (modalita === 'video') {
    ctx.filter = filtro.animato ? `saturate(1.3) hue-rotate(${(t * 60) % 360}deg)` : (filtro.css ?? 'none');
  }
  ctx.drawImage(src.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.filter = 'none';
  ctx.restore();

  // 2. the colour filter: pixels for the photo; for the video only the
  //    filters with a cheap path (mosaic, thermal at a reduced resolution)
  //    percorso economico (mosaico, termica a risoluzione ridotta)
  if (modalita === 'foto' || filtro.pixel) {
    applicaFiltroPixel(ctx, filtro, W, H, t);
  } else if (filtro.live) {
    applicaTermicaVivo(ctx, W, H);
  }

  // 3. the frame + the face accessories, at the preview's own coordinates
  const scalaFoto = W / overlay.width;
  if (filtro.cornice) disegnaCornice(ctx, filtro, W, H, t, modalita === 'foto');
  if (filtro.volto && stato.landmarks) {
    ctx.save();
    ctx.scale(scalaFoto, scalaFoto);
    disegnaLenteVolto(ctx, filtro, stato.landmarks, {
      W: overlay.width, H: overlay.height,
      vw: video.videoWidth, vh: video.videoHeight,
      specchio: stato.frontale,
    }, t);
    ctx.restore();
  }
}

/* Where the frame comes from: the live video, or a photo imported from
   the device. Everything downstream reads this and nothing else. */
function sorgenteFrame() {
  if (stato.immagine) {
    return { img: stato.immagine, w: stato.immagine.naturalWidth, h: stato.immagine.naturalHeight };
  }
  return { img: video, w: video.videoWidth, h: video.videoHeight };
}

/* ============================================================
 * IMPORTING A PHOTO FROM THE DEVICE
 * ============================================================ */

/**
 * Takes a photo that is already on the device and runs it through the same
 * stack: the lens needs landmarks, and MediaPipe in IMAGE mode gives them
 * for a still.
 */
async function importaFoto(file) {
  if (!file) return;
  let url = null;
  try {
    url = URL.createObjectURL(file);
    const img = await caricaImmagine(url);

    /* the landmarks, in IMAGE mode */
    stato.landmarks = null;
    try {
      mostraStatus('Looking for a face…');
      const engine = await ensureEngineStill();
      stato.landmarks = engine.detect(img);
    } catch {
      stato.landmarks = null;
    }
    nascondiStatus();

    stato.immagine = img;
    const W = 1080;
    const H = Math.round((W * img.naturalHeight) / img.naturalWidth);
    const foto = document.createElement('canvas');
    foto.width = W; foto.height = H;
    disegnaFotogramma(foto.getContext('2d'), W, H, performance.now() / 1000, 'foto');
    const blob = await new Promise((res) => foto.toBlob(res, 'image/jpeg', impostazioni.qualita));
    mostraAnteprima({
      tipo: 'foto',
      blob,
      url: URL.createObjectURL(blob),
      filtro: stato.filtroId,
      importata: true,
    });
  } catch {
    toast('Could not read that file');
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

/* ============================================================
 * THE PHOTO BOOTH STRIP
 * ============================================================ */

/**
 * Four shots in a row, composed into one strip: the photo-booth of a
 * festival, on a device that has no printer.
 */
function aggiungiAllaStriscia(blob) {
  stato.striscia.push(blob);
  if (stato.striscia.length < 4) {
    toast(`${stato.striscia.length} of 4 📸`);
    return null;
  }
  const pezzi = stato.striscia.slice();
  stato.striscia = [];
  return composiStriscia(pezzi);
}

function composiStriscia(pezzi) {
  const LATO = 480;
  const BORDO = 26;
  const canvas = document.createElement('canvas');
  canvas.width = LATO * 4 + BORDO * 5;
  canvas.height = LATO + BORDO * 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return new Promise((risolvi) => {
    /* the four frames, drawn as they decode */
    let pronti = 0;
    const finito = () => {
      const d = new Date();
      const testo = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      ctx.fillStyle = '#ff7a1a';
      ctx.font = `700 34px "Courier New", ui-monospace, monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(testo, canvas.width - BORDO, canvas.height - BORDO / 2);
      canvas.toBlob((blob) => risolvi(blob), 'image/jpeg', impostazioni.qualita);
    };

    for (let i = 0; i < 4; i++) {
      const img = new Image();
      img.onload = () => {
        const scala = Math.max(LATO / img.width, LATO / img.height);
        const dw = img.width * scala;
        const dh = img.height * scala;
        ctx.drawImage(img, BORDO + i * (LATO + BORDO) + (LATO - dw) / 2, BORDO + (LATO - dh) / 2, dw, dh);
        if (++pronti === 4) finito();
      };
      img.src = URL.createObjectURL(pezzi[i]);
    }
  });
}

async function scatta() {
  if (!video.videoWidth) return;

  /* The countdown, when there is one. The ring on the shutter counts it
     down, so the number is not the only thing that says how long is left. */
  if (impostazioni.timer > 0) {
    await contaAllIndietro(impostazioni.timer);
    if (!video.videoWidth) return;
  }

  suonoOturatore();
  flashEl.classList.add('on');
  setTimeout(() => flashEl.classList.remove('on'), 60);

  const W = 1080;
  const H = Math.round((W * overlay.clientHeight) / overlay.clientWidth);

  const foto = document.createElement('canvas');
  foto.width = W; foto.height = H;
  disegnaFotogramma(foto.getContext('2d'), W, H, performance.now() / 1000, 'foto');

  const blob = await new Promise((res) => foto.toBlob(res, 'image/jpeg', impostazioni.qualita));

  /* in strip mode the shot goes into the strip instead of the preview */
  if (impostazioni.striscia) {
    const strip = await aggiungiAllaStriscia(blob);
    if (!strip) {
      stato.ultimaSnap = { tipo: 'foto', blob, url: URL.createObjectURL(blob), filtro: stato.filtroId };
      return;
    }
    mostraAnteprima({
      tipo: 'foto',
      blob: strip,
      url: URL.createObjectURL(strip),
      filtro: stato.filtroId,
      striscia: true,
    });
    return;
  }

  mostraAnteprima({
    tipo: 'foto',
    blob,
    url: URL.createObjectURL(blob),
    filtro: stato.filtroId,
  });
}

/* The countdown before the shot. It returns when the time is up, or early
   if the camera goes away underneath it. */
function contaAllIndietro(secondi) {
  return new Promise((risolvi) => {
    let rimasti = secondi;
    stato.countdown = rimasti;
    const anello = $('#shutter');
    const passo = () => {
      if (rimasti <= 0) {
        stato.countdown = 0;
        anello.style.removeProperty('--p');
        anello.classList.remove('conta');
        risolvi();
        return;
      }
      anello.classList.add('conta');
      anello.style.setProperty('--p', (1 - rimasti / secondi).toFixed(3));
      if (impostazioni.vibrazione && navigator.vibrate) navigator.vibrate(12);
      rimasti--;
      setTimeout(passo, 1000);
    };
    passo();
  });
}

/* ============================================================
 * THE SNAP PREVIEW
 * ============================================================ */
function mostraAnteprima(snap) {
  stato.ultimaSnap?.url && URL.revokeObjectURL(stato.ultimaSnap.url);
  stato.ultimaSnap = snap;
  $('#caption').value = '';

  const img = $('#preview-img');
  const vid = $('#preview-video');
  if (snap.tipo === 'video') {
    img.hidden = true;
    vid.src = snap.url;
    vid.hidden = false;
    vid.loop = true;
    vid.play().catch(() => {});
  } else {
    vid.hidden = true;
    vid.removeAttribute('src');
    img.src = snap.url;
    img.hidden = false;
  }

  mostra('preview');
  $('#caption').blur();
}

function scarta() {
  stato.ultimaSnap?.url && URL.revokeObjectURL(stato.ultimaSnap.url);
  stato.ultimaSnap = null;
  tornaAllaCamera();
}

async function scarica() {
  const snap = stato.ultimaSnap;
  if (!snap) return;
  const a = document.createElement('a');
  a.href = snap.url;
  a.download = nomeFile(snap);
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Snap downloaded ⬇️');
}

/* Sharing, when the browser can do it. A file is what the share sheet
   wants; when it is not there, the download is the fallback and the
   button says so rather than failing. */
async function condividi() {
  const snap = stato.ultimaSnap;
  if (!snap) return;
  const nome = nomeFile(snap);
  try {
    const file = new File([snap.blob], nome, { type: snap.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Snap' });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: 'Snap', text: 'A snap from Snap PWA' });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  await scarica();
  toast('Shared as a download ⬇️');
}

function nomeFile(snap) {
  const base = `snap-${new Date(snap.ts ?? Date.now()).toISOString().replace(/[:.]/g, '-')}`;
  if (snap.tipo === 'video') return base + (snap.blob.type.includes('mp4') ? '.mp4' : '.webm');
  return base + '.jpg';
}

async function miniatura(snap) {
  const lato = 260;
  const sorgente = snap.poster ?? await caricaImmagine(snap.url);
  const scala = Math.min(1, lato / Math.max(sorgente.width, sorgente.height));
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(sorgente.width * scala));
  c.height = Math.max(2, Math.round(sorgente.height * scala));
  c.getContext('2d').drawImage(sorgente, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.7));
}

function caricaImmagine(url) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
}

async function salvaNeiRicordi() {
  const snap = stato.ultimaSnap;
  if (!snap) return;
  const record = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    tipo: snap.tipo ?? 'foto',
    blob: snap.blob,
    miniatura: await miniatura(snap),
    caption: $('#caption').value.trim(),
    filtro: snap.filtro,
    ts: Date.now(),
  };
  try {
    await dbPut(record);
    toast('Saved to Memories 💾');
    /* the last shot stays on screen as a thumbnail, so it is one tap from
       the viewer instead of a trip through the memories grid */
    mostraUltima(record);
    snap.url && URL.revokeObjectURL(snap.url);
    stato.ultimaSnap = null;
    tornaAllaCamera();
  } catch {
    toast('Could not save (private mode?)');
  }
}

/* The floating thumbnail of the last saved snap. */
function mostraUltima(record) {
  const bottone = $('#ultima');
  const img = bottone.querySelector('img');
  if (stato.ultimaUrl) URL.revokeObjectURL(stato.ultimaUrl);
  stato.ultimaUrl = URL.createObjectURL(record.miniatura ?? record.blob);
  img.src = stato.ultimaUrl;
  img.alt = record.caption || 'The last snap';
  bottone.hidden = false;
}

function tornaAllaCamera() {
  stato.immagine = null;
  stato.landmarks = null;
  $('#preview-img').src = '';
  $('#preview-img').hidden = false;
  $('#preview-video').hidden = true;
  $('#preview-video').removeAttribute('src');
  mostra('camera');
  if (!stato.attivo) { stato.attivo = true; requestAnimationFrame(loop); }
}

/* ============================================================
 * MEMORIES (IndexedDB)
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
  stato.attivo = false; // stop the loop: it saves battery
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
    img.src = URL.createObjectURL(s.miniatura ?? s.blob);
    img.alt = s.caption || 'Snap';
    img.loading = 'lazy';
    cell.appendChild(img);
    if (s.tipo === 'video') {
      const play = document.createElement('span');
      play.className = 'play';
      play.textContent = '▶';
      cell.appendChild(play);
    }
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
  const img = $('#viewer-img');
  const vid = $('#viewer-video');
  if (snap.tipo === 'video') {
    img.hidden = true;
    vid.src = URL.createObjectURL(snap.blob);
    vid.hidden = false;
    vid.play().catch(() => {});
  } else {
    vid.hidden = true;
    vid.removeAttribute('src');
    img.src = url;
    img.hidden = false;
  }
  $('#viewer-caption').textContent = snap.caption || '';
  $('#viewer-delete').onclick = async () => {
    if (!confirm('Eliminare questa snap?')) return;
    await dbDel(snap.id).catch(() => {});
    toast('Snap deleted 🗑️');
    chiudiViewer();
    apriRicordi();
  };
  $('#viewer-download').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(snap.blob);
    a.download = nomeFile(snap);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  mostra('viewer');
}

function chiudiViewer() {
  $('#viewer-img').src = '';
  $('#viewer-img').hidden = false;
  $('#viewer-video').hidden = true;
  $('#viewer-video').removeAttribute('src');
  mostra('memories');
}

/* ============================================================
 * THE CATALOGUE: every filter, every look, the favourites
 * ============================================================ */

/* Which shelf a filter belongs on. It is derived, not declared, so a new
   filter lands on the right shelf without anyone having to remember. */
function gruppoDi(f) {
  if (f.quiz) return 'quizzes';
  if (f.volto) return 'lenses';
  if (f.cornice) return 'frames';
  return 'colours';
}

const GRUPPI = [
  ['Lenses', 'lenses'],
  ['Frames', 'frames'],
  ['Colours', 'colours'],
  ['Quizzes', 'quizzes'],
];

function apriCatalogo() {
  apriFoglio('Filters & looks', (corpo) => {
    const disegnaCella = (f) => {
      const cella = document.createElement('button');
      cella.className = 'cella-filtro' + (f.id === stato.filtroId ? ' attiva' : '');
      cella.dataset.id = f.id;
      cella.innerHTML = `<span class="emoji">${f.emoji}</span><span class="nome">${f.nome}</span>`;
      cella.addEventListener('click', () => {
        selezionaFiltro(f.id, 'filtro');
        chiudiFoglio();
      });

      /* the star is a separate target: tapping it must not also pick the
         filter, and a 28px target is a compromise the house rules
         forgive only because it is not the only way in. */
      const stella = document.createElement('button');
      stella.className = 'stella' + (ePreferito(f.id) ? ' attiva' : '');
      stella.type = 'button';
      stella.setAttribute('aria-label', (ePreferito(f.id) ? 'Remove ' : 'Add ') + f.nome + (ePreferito(f.id) ? ' from' : ' to') + ' the favourites');
      stella.textContent = ePreferito(f.id) ? '★' : '☆';
      stella.addEventListener('click', (e) => {
        e.stopPropagation();
        const dentro = togglePreferito(f.id);
        stella.classList.toggle('attiva', dentro);
        stella.textContent = dentro ? '★' : '☆';
        stella.setAttribute('aria-label', (dentro ? 'Remove ' : 'Add ') + f.nome + (dentro ? ' from' : ' to') + ' the favourites');
      });
      cella.appendChild(stella);
      return cella;
    };

    const gruppo = (titolo, voci) => {
      if (!voci.length) return;
      const sezione = document.createElement('section');
      sezione.className = 'gruppo';
      const h = document.createElement('h3');
      h.textContent = titolo;
      sezione.appendChild(h);
      const griglia = document.createElement('div');
      griglia.className = 'griglia-filtri';
      for (const f of voci) griglia.appendChild(disegnaCella(f));
      sezione.appendChild(griglia);
      corpo.appendChild(sezione);
    };

    /* the import comes first: it is the thing you came for when you open
       the catalogue with a photo in mind */
    const sezione = document.createElement('section');
    sezione.className = 'gruppo';
    const h = document.createElement('h3');
    h.textContent = 'From this device';
    sezione.appendChild(h);
    const griglia = document.createElement('div');
    griglia.className = 'griglia-filtri';
    const importa = document.createElement('button');
    importa.className = 'cella-filtro';
    importa.innerHTML = '<span class="emoji">🖼️</span><span class="nome">Import a photo</span>';
    importa.addEventListener('click', () => {
      chiudiFoglio();
      $('#import-input').click();
    });
    griglia.appendChild(importa);
    sezione.appendChild(griglia);
    corpo.appendChild(sezione);

    const fav = preferiti();
    if (fav.length) {
      gruppo('Favourites', fav.map((id) => filtroPerId(id)).filter((f) => f.nome));
    }
    gruppo('Looks', LOOKS.map((l) => filtroPerId(l.id)));
    for (const [titolo, chiave] of GRUPPI) {
      gruppo(titolo, FILTRI.filter((f) => gruppoDi(f) === chiave));
    }
  });
}

/* ============================================================
 * THE SETTINGS
 * ============================================================ */

function apriImpostazioni() {
  apriFoglio('Settings', (corpo) => {
    const riga = (etichetta, descrizione, controllo) => {
      const r = document.createElement('div');
      r.className = 'impostazione';
      const sinistra = document.createElement('div');
      const titolo = document.createElement('span');
      titolo.textContent = etichetta;
      sinistra.appendChild(titolo);
      if (descrizione) {
        const piccolo = document.createElement('small');
        piccolo.textContent = descrizione;
        sinistra.appendChild(piccolo);
      }
      r.appendChild(sinistra);
      r.appendChild(controllo);
      corpo.appendChild(r);
    };

    const gruppoOpzioni = (opzioni, attivo, alClick) => {
      const g = document.createElement('div');
      g.className = 'gruppo-opzioni';
      for (const [valore, etichetta] of opzioni) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = etichetta;
        if (valore === attivo) b.classList.add('attivo');
        b.addEventListener('click', () => {
          alClick(valore);
          chiudiFoglio();
        });
        g.appendChild(b);
      }
      return g;
    };

    riga('Photo booth', 'Four shots in a row, composed into one strip', gruppoOpzioni(
      [[false, 'Off'], [true, 'On']],
      impostazioni.striscia,
      (v) => {
        impostazioni.striscia = !!v;
        salvaImpostazioni();
        stato.striscia = [];
        if (impostazioni.striscia) toast('Photo booth on 📸');
      }
    ));

    riga('Countdown', 'Wait before the shot', gruppoOpzioni(
      [[0, 'Off'], [3, '3s'], [10, '10s']],
      impostazioni.timer,
      (v) => { impostazioni.timer = Number(v); salvaImpostazioni(); }
    ));

    riga('Composition guide', 'Thirds or a nine-box grid', gruppoOpzioni(
      [['off', 'Off'], ['terzi', 'Thirds'], ['nove', 'Nine']],
      impostazioni.griglia,
      (v) => { impostazioni.griglia = v; salvaImpostazioni(); disegnaGriglia(); }
    ));

    riga('Haptics', 'A short buzz on every selection', gruppoOpzioni(
      [[true, 'On'], [false, 'Off']],
      impostazioni.vibrazione,
      (v) => { impostazioni.vibrazione = !!v; salvaImpostazioni(); }
    ));

    riga('Mirror the front camera', 'The preview flips, the photo does not', gruppoOpzioni(
      [[true, 'On'], [false, 'Off']],
      impostazioni.specchio,
      (v) => { impostazioni.specchio = !!v; salvaImpostazioni(); video.classList.toggle('mirror', stato.frontale && impostazioni.specchio); }
    ));

    riga('Photo quality', 'The JPEG quality of the saved photo', gruppoOpzioni(
      [[0.7, 'Small'], [0.85, 'Medium'], [0.92, 'Best']],
      impostazioni.qualita,
      (v) => { impostazioni.qualita = Number(v); salvaImpostazioni(); }
    ));

    /* what is on the device, and a way to clear it */
    const spazio = document.createElement('div');
    spazio.className = 'impostazione';
    const info = document.createElement('div');
    const titolo = document.createElement('span');
    titolo.textContent = 'Memories';
    info.appendChild(titolo);
    const dettaglio = document.createElement('small');
    dettaglio.textContent = snapsCache.length
      ? `${snapsCache.length} snaps on this device`
      : 'nothing saved yet';
    info.appendChild(dettaglio);
    spazio.appendChild(info);
    const pulisci = document.createElement('button');
    pulisci.className = 'pulsante';
    pulisci.textContent = 'Clear';
    pulisci.disabled = !snapsCache.length;
    pulisci.addEventListener('click', async () => {
      if (!confirm('Delete every snap on this device?')) return;
      for (const s of snapsCache) await dbDel(s.id).catch(() => {});
      snapsCache = [];
      chiudiFoglio();
      toast('Memories cleared 🗑️');
    });
    spazio.appendChild(pulisci);
    corpo.appendChild(spazio);
  });
}

/* ============================================================
 * THE COMPOSITION GUIDE
 * ============================================================ */
function disegnaGriglia() {
  const svg = $('#griglia');
  if (!svg) return;
  if (impostazioni.griglia === 'off') {
    svg.hidden = true;
    svg.innerHTML = '';
    return;
  }
  const W = overlay.clientWidth || 1;
  const H = overlay.clientHeight || 1;
  const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  let corpo = '';
  if (impostazioni.griglia === 'terzi') {
    corpo += line(W / 3, 0, W / 3, H) + line((W * 2) / 3, 0, (W * 2) / 3, H);
    corpo += line(0, H / 3, W, H / 3) + line(0, (H * 2) / 3, W, (H * 2) / 3);
  } else {
    for (let i = 1; i < 3; i++) {
      corpo += line((W * i) / 3, 0, (W * i) / 3, H);
      corpo += line(0, (H * i) / 3, W, (H * i) / 3);
    }
  }
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = corpo;
  svg.hidden = false;
}

/* ============================================================
 * THE FILTER CAROUSEL
 * ============================================================ */
function costruisciCarosello() {
  /* The looks go in their own row: they are combinations, not filters, and
     mixing the two in one strip would make the strip unreadable. */
  costruisciChip(looksRow, LOOKS, 'look', (id) => selezionaFiltro(id, 'look'));
  costruisciChip(carousel, FILTRI, 'chip-filtro', (id) => selezionaFiltro(id, 'filtro'));
}

function costruisciChip(contenitore, voci, classe, alClick) {
  for (const f of voci) {
    const chip = document.createElement('button');
    chip.className = classe + (f.id === stato.filtroId ? ' attiva' : '');
    chip.dataset.id = f.id;
    chip.innerHTML = `<span class="emoji">${f.emoji}</span><span class="nome">${f.nome}</span>`;
    chip.addEventListener('click', () => alClick(f.id));
    contenitore.appendChild(chip);
  }
}

function selezionaFiltro(id, origine) {
  stato.filtroId = id;
  stato.landmarks = null;
  stato.engineStato = stato.engineStato === 'errore' ? 'idle' : stato.engineStato;
  resetQuizStati(); // the quizzes restart with a new draw
  /* Only one of the two rows can be the active one: a look is a
     combination, and a filter is one thing. */
  for (const c of carousel.children) c.classList.toggle('attiva', c.dataset.id === id);
  for (const c of looksRow.children) c.classList.toggle('attiva', c.dataset.id === id);
  const attivo = (origine === 'look' ? looksRow : carousel).querySelector(`[data-id="${id}"]`);
  attivo?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  const filtro = filtroPerId(id);
  if (!filtro.volto) nascondiStatus();
  if (impostazioni.vibrazione && navigator.vibrate) navigator.vibrate(8);
}

/* ============================================================
 * VIDEO RECORDING
 * ============================================================ */
const DURATA_VIDEO = 10000; // milliseconds (10 s)

const MIME_VIDEO = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

function supportaVideo() {
  return typeof MediaRecorder !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

function mimeVideo() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of MIME_VIDEO) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* try the next one */ }
  }
  return '';
}

function iniziaRegistrazione() {
  if (stato.registrazione || !video.videoWidth) return;
  if (!supportaVideo()) { toast('Video is not supported in this browser'); return; }
  const mime = mimeVideo();
  if (mime === null) { toast('Video non supportato su questo browser'); return; }

  const W = 720;
  const H = Math.round((W * overlay.clientHeight) / overlay.clientWidth);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;

  const stream = canvas.captureStream(30);
  const opzioni = { videoBitsPerSecond: 6000000 };
  if (mime) opzioni.mimeType = mime;

  let rec;
  try { rec = new MediaRecorder(stream, opzioni); }
  catch { toast('Video non supportato su questo browser'); return; }

  const pezzi = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) pezzi.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach((traccia) => traccia.stop());
    const blob = new Blob(pezzi, { type: rec.mimeType || mime || 'video/mp4' });
    if (!blob.size) { toast('Empty recording, try again'); return; }
    mostraAnteprima({
      tipo: 'video',
      blob,
      url: URL.createObjectURL(blob),
      filtro: stato.filtroId,
      poster: canvas,
      ts: Date.now(),
    });
  };

  rec.start(1000);
  stato.registrazione = { rec, canvas, inizio: performance.now() };
  $('#shutter').classList.add('registra');
  toast('Recording…');
}

function fermaRegistrazione() {
  const reg = stato.registrazione;
  if (!reg) return;
  stato.registrazione = null;
  $('#shutter').classList.remove('registra');
  $('#shutter').style.removeProperty('--p');
  clearTimeout(stato.pressione);
  stato.pressione = 0;
  if (reg.rec.state !== 'inactive') reg.rec.stop();
}

/* ============================================================
 * UTILITIES
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

/* the shutter sound, synthesised (no asset) */
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
  } catch { /* the audio is blocked: never mind */ }
}

/* ============================================================
 * START UP
 * ============================================================ */
function mostraErrore(msg) {
  const el = $('#start-error');
  el.textContent = msg;
  el.hidden = false;
}

async function avviaApp() {
  const btn = $('#start-btn');
  btn.disabled = true;
  btn.textContent = 'Starting…';
  try {
    await avviaFotocamera();
  // show the screen first, then measure: while it is display:none
  // the overlay measures 0x0 and the filters would have nowhere to draw
    // the overlay measures 0x0 and the filters would have nowhere to draw
    mostra('camera');
    dimensionaOverlay();
    requestAnimationFrame(dimensionaOverlay);
    disegnaGriglia();
    stato.attivo = true;
    requestAnimationFrame(loop);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Try again';
    const nomi = {
      NotAllowedError: 'Permission denied: allow the camera from Safari\'s settings (aA → Site settings → Camera).',
      NotFoundError: 'No camera found on this device.',
      NotReadableError: 'The camera is already in use by another app.',
    };
    mostraErrore(nomi[err?.name] ?? `Errore fotocamera: ${err?.message ?? err}`);
  }
}

/* ---------- events ---------- */
$('#start-btn').addEventListener('click', avviaApp);
$('#flip-btn').addEventListener('click', giraFotocamera);
$('#catalogo-btn').addEventListener('click', apriCatalogo);
$('#import-input').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (file) importaFoto(file);
});
$('#settings-btn').addEventListener('click', apriImpostazioni);
$('#share-btn').addEventListener('click', condividi);
collegaFoglio();

/* Hold to compare: while the button is held the raw frame shows, with
   nothing on top of it. It is the quickest way to see what a filter is
   actually doing. */
const confronta = $('#confronta');
const confrontaPiu = () => { stato.comparando = true; confronta.classList.add('attivo'); confronta.setAttribute('aria-pressed', 'true'); };
const confrontaMeno = () => { stato.comparando = false; confronta.classList.remove('attivo'); confronta.setAttribute('aria-pressed', 'false'); };
confronta.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { confronta.setPointerCapture(e.pointerId); } catch { /* fine either way */ }
  confrontaPiu();
});
confronta.addEventListener('pointerup', confrontaMeno);
confronta.addEventListener('pointercancel', confrontaMeno);
confronta.addEventListener('pointerleave', confrontaMeno);

/* The last snap: one tap from the camera to the viewer. */
$('#ultima').addEventListener('click', async () => {
  stato.attivo = false;
  const snap = snapsCache[0];
  if (!snap) { toast('No snap saved yet'); return; }
  const img = new Image();
  img.src = URL.createObjectURL(snap.miniatura ?? snap.blob);
  try { await img.decode(); } catch { /* the viewer copes */ }
  apriViewer(snap, img.src);
});

/* the shutter: a tap takes a photo, a long press records video (max 10 s) */
const otturatore = $('#shutter');
otturatore.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { otturatore.setPointerCapture(e.pointerId); } catch { /* fine either way */ }
  clearTimeout(stato.pressione);
  if (!supportaVideo()) return;
  stato.pressione = setTimeout(iniziaRegistrazione, 250);
});
const rilasciaOtturatore = () => {
  clearTimeout(stato.pressione);
  const stavaRegistrando = !!stato.registrazione;
  stato.pressione = 0;
  if (stavaRegistrando) fermaRegistrazione();
  else scatta();
};
otturatore.addEventListener('pointerup', rilasciaOtturatore);
otturatore.addEventListener('pointercancel', () => {
  clearTimeout(stato.pressione);
  stato.pressione = 0;
  if (stato.registrazione) fermaRegistrazione();
});
otturatore.addEventListener('contextmenu', (e) => e.preventDefault());
$('#flash-btn').addEventListener('click', (e) => {
  stato.flash = !stato.flash;
  e.currentTarget.classList.toggle('attiva', stato.flash);
  toast(stato.flash ? 'Screen flash on ⚡' : 'Screen flash off');
});
$('#memories-btn').addEventListener('click', apriRicordi);
$('#memories-close').addEventListener('click', tornaAllaCamera);
$('#discard-btn').addEventListener('click', scarta);
$('#download-btn').addEventListener('click', scarica);
$('#save-btn').addEventListener('click', salvaNeiRicordi);
$('#viewer-close').addEventListener('click', chiudiViewer);
window.addEventListener('resize', () => { dimensionaOverlay(); disegnaGriglia(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stato.attivo = false; }
  else if ($('#camera').classList.contains('visible') && !stato.attivo) {
    stato.attivo = true;
    requestAnimationFrame(loop);
  }
});

costruisciCarosello();
window.__snapDebug = stato;

/* the overlay has to be resized when the camera screen becomes visible
 * (from display:none its measurements are 0) and on every rotation */
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => { dimensionaOverlay(); disegnaGriglia(); }).observe($('#camera'));
}

/* service worker (the shell + the MediaPipe models in vendor/, cached on first use) */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
