/**
 * ===== Snap PWA — motore dei filtri =====
 *
 * Due famiglie di filtri:
 *  1. Lenti volto (face:true): tracciano il volto con MediaPipe FaceLandmarker
 *     (478 landmark) e disegnano accessori ancorati a occhi/naso/bocca.
 *     L'engine è caricato lazy al primo filtro volto (~3.7 MB, una volta sola).
 *  2. Filtri immagine: CSS sul <video> in anteprima + operazioni per-pixel
 *     sul canvas al momento dello scatto (così anteprima e foto coincidono
 *     anche dove CanvasRenderingContext2D.filter non esiste, es. iOS < 18).
 */

/* ---------- indici landmark del face mesh ---------- */
const LM = {
  naso: 4,
  mento: 152,
  fronte: 10,
  occhioSxEst: 33, occhioSxInt: 133,   // occhio sinistro del soggetto
  occhioDxEst: 263, occhioDxInt: 362,
  guanciaSx: 234, guanciaDx: 454,      // lati del volto, all'altezza delle orecchie
  boccaSx: 61, boccaDx: 291,
  labbroSup: 13, labbroInf: 14,
};

const VERSIONE_MEDIAPIPE = '0.10.14';
const CDN_MEDIAPIPE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSIONE_MEDIAPIPE}`;
const URL_MODELLO =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/* ---------- definizione filtri ---------- */
export const FILTRI = [
  { id: 'nessuno',  nome: 'Originale', emoji: '✨' },
  { id: 'cagnolino', nome: 'Cagnolino', emoji: '🐶', volto: true },
  { id: 'occhiali', nome: 'Occhiali',  emoji: '😎', volto: true },
  { id: 'corona',   nome: 'Corona',    emoji: '👑', volto: true },
  { id: 'cuori',    nome: 'Cuori',     emoji: '😍', volto: true },
  { id: 'vignetta', nome: 'Vignetta',  emoji: '🌑', cornice: 'vignetta' },
  { id: 'grana',    nome: 'Grana',     emoji: '🎞️', cornice: 'grana' },
  { id: 'mosaico',  nome: 'Mosaico',   emoji: '🟪', pixel: true },
  { id: 'bw',       nome: 'B/N',       emoji: '⚪', css: 'grayscale(1) contrast(1.08)', op: 'gray' },
  { id: 'noir',     nome: 'Noir',      emoji: '🎩', css: 'grayscale(1) contrast(1.4) brightness(0.88)', op: 'noir' },
  { id: 'seppia',   nome: 'Seppia',    emoji: '🟤', css: 'sepia(0.85) contrast(1.05)', op: 'seppia' },
  { id: 'vivido',   nome: 'Vivido',    emoji: '🌈', css: 'saturate(1.65) contrast(1.12)', op: 'vivido' },
  { id: 'freddo',   nome: 'Freddo',    emoji: '🧊', css: 'saturate(1.15) hue-rotate(-18deg)', op: 'freddo' },
  { id: 'caldo',    nome: 'Caldo',     emoji: '🔥', css: 'sepia(0.35) saturate(1.35) hue-rotate(-12deg)', op: 'caldo' },
  { id: 'negativo', nome: 'Negativo',  emoji: '🌓', css: 'invert(1)', op: 'negativo' },
  { id: 'arcobaleno', nome: 'Arcobaleno', emoji: '🦄', animato: true, op: 'arcobaleno' },
];

export const filtroPerId = (id) => FILTRI.find((f) => f.id === id) ?? FILTRI[0];

/* ============================================================
 * ENGINE VOLTO (MediaPipe, caricamento lazy)
 * ============================================================ */

let enginePromise = null;

/** Restituisce { detect(video, ts) → landmarks | null }. Carica al primo uso. */
export function ensureEngineVolto() {
  enginePromise ??= (async () => {
    const vision = await import(/* @vite-ignore */ `${CDN_MEDIAPIPE}`);
    const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN_MEDIAPIPE}/wasm`);
    try {
      var landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: URL_MODELLO, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    } catch {
      // GPU non disponibile (o WebGL spento): fallback CPU
      var landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: URL_MODELLO, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    }
    let lastTs = -1;
    return {
      detect(video, ts) {
        if (ts <= lastTs) ts = lastTs + 1;
        lastTs = ts;
        const res = landmarker.detectForVideo(video, ts);
        return res.faceLandmarks?.[0] ?? null;
      },
    };
  })();
  return enginePromise;
}

/* ============================================================
 * GEOMETRIA: proietta i landmark (0..1) sul canvas visibile
 * ============================================================ */

/**
 * Il video usa object-fit: cover; le stesse coordinate vanno ricalcolate
 * per disegnare allineato sia in anteprima sia nella foto finale.
 */
function creaProiettore(geom) {
  const { W, H, vw, vh, specchio } = geom;
  const scala = Math.max(W / vw, H / vh);
  const dx = (W - vw * scala) / 2;
  const dy = (H - vh * scala) / 2;
  return (lm) => {
    const x = (specchio ? 1 - lm.x : lm.x) * vw * scala + dx;
    const y = lm.y * vh * scala + dy;
    return [x, y];
  };
}

const mid = (P, i, j) => {
  const a = P(LM[i]), b = P(LM[j]);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* ============================================================
 * DISEGNO LENTI VOLTO
 * ============================================================ */

export function disegnaLenteVolto(ctx, filtro, landmarks, geom) {
  if (!landmarks?.length) return false;
  const P = creaProiettore(geom);
  const occhioSx = mid(P, 'occhioSxEst', 'occhioSxInt');
  const occhioDx = mid(P, 'occhioDxEst', 'occhioDxInt');
  const larghezzaVolto = dist(P(LM.guanciaSx), P(LM.guanciaDx));
  const altezzaVolto = dist(P(LM.fronte), P(LM.mento));
  const angolo = Math.atan2(occhioDx[1] - occhioSx[1], occhioDx[0] - occhioSx[0]);
  const fc = { P, occhioSx, occhioDx, larghezzaVolto, altezzaVolto, angolo };

  switch (filtro.id) {
    case 'cagnolino':  return disegnaCagnolino(ctx, fc);
    case 'occhiali':   return disegnaOcchiali(ctx, fc);
    case 'corona':     return disegnaCorona(ctx, fc);
    case 'cuori':      return disegnaCuori(ctx, fc);
  }
  return false;
}

/* --- 🐶 cagnolino: orecchie + naso + lingue --- */
function disegnaCagnolino(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // orecchie: sopra le guance, inclinate verso l'esterno
  for (const lato of [-1, 1]) {
    const g = P(lato < 0 ? LM.guanciaSx : LM.guanciaDx);
    const ex = g[0] + lato * lv * 0.10;
    const ey = g[1] - av * 0.52;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(lato * (0.45 + angolo));
    ellisse(ctx, 0, 0, lv * 0.145, av * 0.19, '#8a5a33');
    ellisse(ctx, 0, av * 0.03, lv * 0.08, av * 0.11, '#e8a0b4');
    ctx.restore();
  }

  // naso
  const n = P(LM.naso);
  ellisse(ctx, n[0], n[1] + av * 0.015, lv * 0.075, av * 0.055, '#241a12');

  // lingua: sotto la bocca, con solcatura centrale
  const bocca = mid(P, 'labbroSup', 'labbroInf');
  const lung = av * 0.30, larg = lv * 0.17;
  ctx.save();
  ctx.translate(bocca[0], bocca[1] + av * 0.02);
  ctx.rotate(angolo);
  ctx.beginPath();
  ctx.moveTo(-larg, 0);
  ctx.bezierCurveTo(-larg, lung * 0.7, -larg * 0.35, lung, 0, lung);
  ctx.bezierCurveTo(larg * 0.35, lung, larg, lung * 0.7, larg, 0);
  ctx.closePath();
  ctx.fillStyle = '#ff6d8a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 40, 80, 0.55)';
  ctx.lineWidth = Math.max(1.5, larg * 0.10);
  ctx.beginPath();
  ctx.moveTo(0, lung * 0.25);
  ctx.lineTo(0, lung * 0.85);
  ctx.stroke();
  ctx.restore();
  return true;
}

/* --- 😎 occhiali da sole --- */
function disegnaOcchiali(ctx, fc) {
  const { P, occhioSx, occhioDx, larghezzaVolto: lv, angolo } = fc;
  const r = dist(occhioSx, occhioDx) * 0.30;
  ctx.save();
  ctx.translate((occhioSx[0] + occhioDx[0]) / 2, (occhioSx[1] + occhioDx[1]) / 2);
  ctx.rotate(angolo);
  ctx.translate(-(occhioSx[0] + occhioDx[0]) / 2, -(occhioSx[1] + occhioDx[1]) / 2);

  // stangrette verso le orecchie
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = 'round';
  const oS = P(LM.guanciaSx), oD = P(LM.guanciaDx);
  ctx.beginPath();
  ctx.moveTo(occhioSx[0] - r, occhioSx[1]);
  ctx.lineTo(oS[0], oS[1] - lv * 0.02);
  ctx.moveTo(occhioDx[0] + r, occhioDx[1]);
  ctx.lineTo(oD[0], oD[1] - lv * 0.02);
  ctx.stroke();

  // ponte
  ctx.beginPath();
  ctx.moveTo(occhioSx[0] + r * 0.8, occhioSx[1] - r * 0.15);
  ctx.quadraticCurveTo(
    (occhioSx[0] + occhioDx[0]) / 2, occhioSx[1] - r * 0.55,
    occhioDx[0] - r * 0.8, occhioDx[1] - r * 0.15
  );
  ctx.stroke();

  // lenti: ovali scure con riflesso
  for (const c of [occhioSx, occhioDx]) {
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], r, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 10, 14, 0.92)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c[0] - r * 0.3, c[1] - r * 0.28, r * 0.28, r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.fill();
  }
  ctx.restore();
  return true;
}

/* --- 👑 corona --- */
function disegnaCorona(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);
  const w = lv * 0.66, h = av * 0.30;
  const cx = f[0], base = f[1] - av * 0.30;

  ctx.save();
  ctx.translate(cx, base);
  ctx.rotate(angolo);

  const grad = ctx.createLinearGradient(0, -h, 0, 0);
  grad.addColorStop(0, '#ffe066');
  grad.addColorStop(1, '#e0a10c');

  // corpo a zig-zag (5 punte)
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + (w / 4) * (i + 0.5);
    ctx.lineTo(i % 2 === 0 ? x : x, i % 2 === 0 ? -h : -h * 0.28);
    ctx.lineTo(-w / 2 + (w / 4) * (i + 1), 0);
  }
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#b37f07';
  ctx.lineWidth = Math.max(1.5, w * 0.02);
  ctx.stroke();

  // gemme sulle punte dispari + fascia
  ctx.fillStyle = '#e0314b';
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + (w / 4) * (2 * i + 1);
    ctx.beginPath();
    ctx.arc(x, -h, w * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5b8def';
  ctx.beginPath();
  ctx.arc(0, -h * 0.12, w * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}

/* --- 😍 occhi a cuore --- */
function disegnaCuori(ctx, fc) {
  const { occhioSx, occhioDx } = fc;
  const s = dist(occhioSx, occhioDx) * 0.42;
  ctx.save();
  ctx.shadowColor = 'rgba(255, 59, 107, 0.7)';
  ctx.shadowBlur = s * 0.35;
  ctx.fillStyle = '#ff3b6b';
  for (const c of [occhioSx, occhioDx]) disegnaCuore(ctx, c[0], c[1], s);
  ctx.restore();
  return true;
}

function disegnaCuore(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.75, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 0.75, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  ctx.closePath();
  ctx.fill();
}

function ellisse(ctx, x, y, rx, ry, colore) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = colore;
  ctx.fill();
}

/* ============================================================
 * CORNICI (vignetta, grana) — sopra tutto, in anteprima e foto
 * ============================================================ */

let patternGrana = null;

export function disegnaCornice(ctx, filtro, W, H, t) {
  if (filtro.cornice === 'vignetta') {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (filtro.cornice === 'grana') {
    if (!patternGrana || patternGrana.scala !== Math.min(W, H)) {
      const n = document.createElement('canvas');
      n.width = n.height = 128;
      const nc = n.getContext('2d');
      const img = nc.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 26;
      }
      nc.putImageData(img, 0, 0);
      patternGrana = { pattern: ctx.createPattern(n, 'repeat'), scala: Math.min(W, H) };
    }
    ctx.save();
    ctx.translate((t * 37) % 128, (t * 53) % 128); // grana "viva"
    ctx.fillStyle = patternGrana.pattern;
    ctx.fillRect(-128, -128, W + 256, H + 256);
    ctx.restore();
  }
}

/* ============================================================
 * FILTRI PIXEL (per lo scatto, indipendenti da ctx.filter)
 * ============================================================ */

/** Matrice hue-rotate standard (come la CSS, in radianti). */
function matriceHue(rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
}

const OPS_PIXEL = {
  gray(d) { const l = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; return [l, l, l]; },
  noir(d) {
    let l = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    l = (l - 128) * 1.4 + 110; // più contrasto, ombre dense
    return [l, l, l];
  },
  seppia(d) {
    const l = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    return [l * 1.07 + 20, l * 0.92 + 8, l * 0.72];
  },
  vivido(d) {
    const l = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    return [l + (d[0] - l) * 1.7, l + (d[1] - l) * 1.7, l + (d[2] - l) * 1.7].map((v) => (v - 128) * 1.08 + 126);
  },
  freddo(d) { return applicaMatrice(d, matriceHue(-18 * Math.PI / 180), [0, 4, 14]); },
  caldo(d)  { return applicaMatrice(d, matriceHue(-12 * Math.PI / 180), [14, 4, -10]); },
  negativo(d) { return [255 - d[0], 255 - d[1], 255 - d[2]]; },
  arcobaleno(d, t) {
    const rad = ((t * 60) % 360) * Math.PI / 180;
    return applicaMatrice(d, matriceHue(rad), [0, 0, 0]);
  },
};

function applicaMatrice(d, m, offset) {
  return [
    m[0] * d[0] + m[1] * d[1] + m[2] * d[2] + offset[0],
    m[3] * d[0] + m[4] * d[1] + m[5] * d[2] + offset[1],
    m[6] * d[0] + m[7] * d[1] + m[8] * d[2] + offset[2],
  ];
}

/**
 * Applica il filtro pixel su tutto il canvas (usato solo allo scatto:
 * un frame singolo, quindi la lentezza non importa).
 */
export function applicaFiltroPixel(ctx, filtro, W, H, t) {
  if (filtro.op === 'mosaico' || filtro.pixel) { mosaico(ctx, W, H); return; }
  const op = OPS_PIXEL[filtro.op];
  if (!op) return;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = op(d.subarray(i, i + 3), t);
    d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b);
  }
  ctx.putImageData(img, 0, 0);
}

function mosaico(ctx, W, H) {
  const blocchi = 48;
  const bw = Math.max(1, Math.floor(W / blocchi));
  const piccolo = document.createElement('canvas');
  piccolo.width = Math.ceil(W / bw);
  piccolo.height = Math.ceil(H / bw);
  const pc = piccolo.getContext('2d');
  pc.drawImage(ctx.canvas, 0, 0, piccolo.width, piccolo.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(piccolo, 0, 0, piccolo.width, piccolo.height, 0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
}

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
