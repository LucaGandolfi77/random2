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
  guanciaSXint: 50, guanciaDXint: 280, // centro guance (per il blush)
  boccaSx: 61, boccaDx: 291,
  labbroSup: 13, labbroInf: 14,
};

const VERSIONE_MEDIAPIPE = '0.10.14';
const CDN_MEDIAPIPE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSIONE_MEDIAPIPE}`;
const URL_MODELLO_CDN =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * Sorgenti dell'engine in ordine di preferenza: prima i file locali in
 * vendor/ (bundle + wasm + modello già nel sito, cachati dal service worker:
 * offline dalla seconda apertura), in fallback il CDN se vendor/ non è
 * disponibile (es. deploy parziale).
 */
const SORGENTI_ENGINE = [
  {
    bundle: './vendor/vision_bundle.mjs',
    wasm: './vendor/wasm',
    modello: './vendor/models/face_landmarker.task',
  },
  {
    bundle: CDN_MEDIAPIPE,
    wasm: `${CDN_MEDIAPIPE}/wasm`,
    modello: URL_MODELLO_CDN,
  },
];

/* ---------- definizione filtri ---------- */
export const FILTRI = [
  { id: 'nessuno',  nome: 'Originale', emoji: '✨' },
  { id: 'cagnolino', nome: 'Cagnolino', emoji: '🐶', volto: true },
  { id: 'occhiali', nome: 'Occhiali',  emoji: '😎', volto: true },
  { id: 'corona',   nome: 'Corona',    emoji: '👑', volto: true },
  { id: 'cuori',    nome: 'Cuori',     emoji: '😍', volto: true },
  { id: 'gatto',    nome: 'Gatto',     emoji: '🐱', volto: true },
  { id: 'coniglio', nome: 'Coniglio',  emoji: '🐰', volto: true },
  { id: 'robot',    nome: 'Robot',     emoji: '🤖', volto: true },
  { id: 'cowboy',   nome: 'Cowboy',    emoji: '🤠', volto: true },
  { id: 'diavolo',  nome: 'Diavolo',   emoji: '😈', volto: true },
  { id: 'angelo',   nome: 'Angelo',    emoji: '😇', volto: true },
  { id: 'blush',    nome: 'Blush',     emoji: '🌸', volto: true },
  { id: 'arcoboca', nome: 'Arcobaleno', emoji: '🤮', volto: true },
  { id: 'quiz-animale', nome: 'Che animale?', emoji: '🐾', volto: true, quiz: 'animali' },
  { id: 'quiz-cibo',    nome: 'Che cibo?',    emoji: '🍽️', volto: true, quiz: 'cibo' },
  { id: 'quiz-mood',    nome: 'Che mood?',    emoji: '⚡', volto: true, quiz: 'mood' },
  { id: 'vignetta', nome: 'Vignetta',  emoji: '🌑', cornice: 'vignetta' },
  { id: 'grana',    nome: 'Grana',     emoji: '🎞️', cornice: 'grana' },
  { id: 'mosaico',  nome: 'Mosaico',   emoji: '🟪', pixel: true },
  { id: 'vhs',      nome: 'VHS',       emoji: '📼', css: 'saturate(1.15) contrast(1.08)', cornice: 'vhs' },
  { id: 'bw',       nome: 'B/N',       emoji: '⚪', css: 'grayscale(1) contrast(1.08)', op: 'gray' },
  { id: 'noir',     nome: 'Noir',      emoji: '🎩', css: 'grayscale(1) contrast(1.4) brightness(0.88)', op: 'noir' },
  { id: 'seppia',   nome: 'Seppia',    emoji: '🟤', css: 'sepia(0.85) contrast(1.05)', op: 'seppia' },
  { id: 'vivido',   nome: 'Vivido',    emoji: '🌈', css: 'saturate(1.65) contrast(1.12)', op: 'vivido' },
  { id: 'freddo',   nome: 'Freddo',    emoji: '🧊', css: 'saturate(1.15) hue-rotate(-18deg)', op: 'freddo' },
  { id: 'caldo',    nome: 'Caldo',     emoji: '🔥', css: 'sepia(0.35) saturate(1.35) hue-rotate(-12deg)', op: 'caldo' },
  { id: 'negativo', nome: 'Negativo',  emoji: '🌓', css: 'invert(1)', op: 'negativo' },
  { id: 'duotone',  nome: 'Duotone',   emoji: '🟣', css: 'grayscale(1) sepia(1) hue-rotate(225deg) saturate(2.6) contrast(1.05)', op: 'duotone' },
  { id: 'termica',  nome: 'Termica',   emoji: '🌡️', css: 'grayscale(1) sepia(1) hue-rotate(-50deg) saturate(6) contrast(1.25)', op: 'termica' },
  { id: 'sogno',    nome: 'Sogno',     emoji: '☁️', css: 'brightness(1.1) saturate(1.25) contrast(0.92)', cornice: 'bloom' },
  { id: 'psichedelico', nome: 'Psichedelico', emoji: '🌀', animato: true, op: 'psichedelico' },
];

export const filtroPerId = (id) => FILTRI.find((f) => f.id === id) ?? FILTRI[0];

/* ============================================================
 * ENGINE VOLTO (MediaPipe, caricamento lazy)
 * ============================================================ */

let enginePromise = null;

async function avviaLandmarker(vision, fileset, modello) {
  try {
    return await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modello, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
  } catch {
    // GPU non disponibile (o WebGL spento): fallback CPU
    return await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modello, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
  }
}

/** Restituisce { detect(video, ts) → landmarks | null }. Carica al primo uso. */
export function ensureEngineVolto() {
  enginePromise ??= (async () => {
    let ultimoErrore;
    for (const sorgente of SORGENTI_ENGINE) {
      try {
        const vision = await import(/* @vite-ignore */ sorgente.bundle);
        const fileset = await vision.FilesetResolver.forVisionTasks(sorgente.wasm);
        const landmarker = await avviaLandmarker(vision, fileset, sorgente.modello);
        let lastTs = -1;
        return {
          detect(video, ts) {
            if (ts <= lastTs) ts = lastTs + 1;
            lastTs = ts;
            const res = landmarker.detectForVideo(video, ts);
            return res.faceLandmarks?.[0] ?? null;
          },
        };
      } catch (err) {
        ultimoErrore = err; // prova la sorgente successiva
      }
    }
    throw ultimoErrore;
  })();
  return enginePromise;
}

/* ============================================================
 * QUIZ SULLA FRONTE ("che animale sei?", …)
 *
 * Un cartellino ancorato alla fronte: gira i risultati veloce, poi si
 * blocca su uno (con "pop"). L'estrazione è deterministica dal tempo,
 * così l'anteprima e la foto mostrano lo stesso risultato.
 * ============================================================ */

const QUIZ = {
  animali: {
    titolo: 'CHE ANIMALE SEI?',
    voci: [
      ['Leone', '🦁'], ['Gatto', '🐱'], ['Panda', '🐼'], ['Volpe', '🦊'],
      ['Gufo', '🦉'], ['Delfino', '🐬'], ['Lupo', '🐺'], ['Koala', '🐨'],
      ['Tigre', '🐯'], ['Unicorno', '🦄'],
    ],
  },
  cibo: {
    titolo: 'CHE CIBO SEI?',
    voci: [
      ['Pizza', '🍕'], ['Sushi', '🍣'], ['Gelato', '🍦'], ['Taco', '🌮'],
      ['Ciambella', '🍩'], ['Anguria', '🍉'], ['Popcorn', '🍿'], ['Avocado', '🥑'],
    ],
  },
  mood: {
    titolo: 'CHE MOOD SEI?',
    voci: [
      ['Felice', '😄'], ['Zen', '🧘'], ['Turbo', '🚀'], ['Fuoco', '🔥'],
      ['Romantico', '🥰'], ['Misterioso', '🕶️'], ['Party', '🥳'], ['Sonno', '😴'],
    ],
  },
};

const CICLO_S = 1.6; // durata della fase "gira"
const LOCK_S = 5;    // quanto resta fermo sul risultato
const quizStati = {};

function mescola(n) {
  let x = Math.imul(n | 0, 2654435761);
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Indice corrente del quiz + se l'estrazione è già bloccata. */
function statoQuiz(id, t) {
  let s = quizStati[id];
  if (!s) s = quizStati[id] = { inizio: t, seed: (Math.random() * 0x7fffffff) | 0 };
  const trascorso = t - s.inizio;
  const voci = QUIZ[id].voci.length;
  if (trascorso < CICLO_S) {
    return { indice: Math.floor(trascorso / 0.09) % voci, bloccato: false };
  }
  const fase = Math.floor((trascorso - CICLO_S) / LOCK_S);
  return { indice: mescola(s.seed + fase * 7919) % voci, bloccato: true };
}

/** Reinizia l'estrazione (chiamato al cambio filtro). */
export function resetQuizStati() {
  for (const k of Object.keys(quizStati)) delete quizStati[k];
}

function disegnaQuiz(ctx, fc, filtro, t) {
  const quiz = QUIZ[filtro.quiz];
  const { indice, bloccato } = statoQuiz(filtro.quiz, t);
  const [nome, emoji] = quiz.voci[indice];
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);

  const w = Math.max(lv * 1.05, 60);
  const h = w * 0.95;
  const base = -av * 0.04; // bordo inferiore del cartellino, sulla fronte
  const top = base - h;

  ctx.save();
  ctx.translate(f[0], f[1]);
  ctx.rotate(angolo);

  // animazione: lampeggio veloce durante l'estrazione, "pop" al blocco
  const trascorsoLock = t - (quizStati[filtro.quiz].inizio + CICLO_S);
  const scala = bloccato
    ? (trascorsoLock >= 0 && trascorsoLock < 0.3 ? 1 + 0.28 * (1 - trascorsoLock / 0.3) : 1)
    : 1 + 0.05 * Math.sin(t * 22);
  ctx.scale(scala, scala);

  // puntatore giallo verso la fronte
  ctx.beginPath();
  ctx.moveTo(-w * 0.07, base);
  ctx.lineTo(w * 0.07, base);
  ctx.lineTo(0, base + av * 0.05);
  ctx.closePath();
  ctx.fillStyle = '#fffc00';
  ctx.fill();

  // cartellino bianco con ombra
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = w * 0.07;
  ctx.shadowOffsetY = w * 0.02;
  rettangoloTondo(ctx, -w / 2, top, w, h, w * 0.13);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // fascia titolo gialla (clipata sui bordi arrotondati)
  ctx.save();
  rettangoloTondo(ctx, -w / 2, top, w, h, w * 0.13);
  ctx.clip();
  ctx.fillStyle = '#fffc00';
  ctx.fillRect(-w / 2, top, w, h * 0.24);
  ctx.restore();

  ctx.fillStyle = '#141414';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${w * 0.075}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(quiz.titolo, 0, top + h * 0.125);

  // bordo
  rettangoloTondo(ctx, -w / 2, top, w, h, w * 0.13);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = Math.max(1.5, w * 0.012);
  ctx.stroke();

  // emoji gigante + nome del risultato
  ctx.font = `${w * 0.40}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText(emoji, 0, top + h * 0.24 + h * 0.37);
  ctx.fillStyle = '#141414';
  ctx.font = `800 ${w * 0.085}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(nome.toUpperCase(), 0, top + h * 0.88);

  ctx.restore();
  return true;
}

/* ============================================================
 * GEOMETRIA: proietta i landmark (0..1) sul canvas visibile
 * ============================================================ */

/**
 * Il video usa object-fit: cover; le stesse coordinate vanno ricalcolate
 * per disegnare allineato sia in anteprima sia nella foto finale.
 */
/* Proietta un landmark dalla canvas di disegno: prende l'INDICE del punto
 * (LM.fronte, LM.naso, …) e restituisce [x, y] in pixel, con object-fit:cover
 * e specchiatura della fotocamera frontale. */
function creaProiettore(geom, landmarks) {
  const { W, H, vw, vh, specchio } = geom;
  const scala = Math.max(W / vw, H / vh);
  const dx = (W - vw * scala) / 2;
  const dy = (H - vh * scala) / 2;
  return (i) => {
    const p = landmarks[i];
    if (!p) return [NaN, NaN];
    return [(specchio ? 1 - p.x : p.x) * vw * scala + dx, p.y * vh * scala + dy];
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

export function disegnaLenteVolto(ctx, filtro, landmarks, geom, t = 0) {
  if (!landmarks?.length) return false;
  const P = creaProiettore(geom, landmarks);
  const occhioSx = mid(P, 'occhioSxEst', 'occhioSxInt');
  const occhioDx = mid(P, 'occhioDxEst', 'occhioDxInt');
  // landmark malformati: meglio non disegnare che disegnare nel vuoto
  if (!Number.isFinite(occhioSx[0] + occhioSx[1] + occhioDx[0] + occhioDx[1])) return false;
  const larghezzaVolto = dist(P(LM.guanciaSx), P(LM.guanciaDx));
  const altezzaVolto = dist(P(LM.fronte), P(LM.mento));
  const angolo = Math.atan2(occhioDx[1] - occhioSx[1], occhioDx[0] - occhioSx[0]);
  const fc = { P, occhioSx, occhioDx, larghezzaVolto, altezzaVolto, angolo };

  if (filtro.quiz) return disegnaQuiz(ctx, fc, filtro, t);

  switch (filtro.id) {
    case 'cagnolino': return disegnaCagnolino(ctx, fc);
    case 'occhiali':  return disegnaOcchiali(ctx, fc);
    case 'corona':    return disegnaCorona(ctx, fc);
    case 'cuori':     return disegnaCuori(ctx, fc);
    case 'gatto':     return disegnaGatto(ctx, fc);
    case 'coniglio':  return disegnaConiglio(ctx, fc, t);
    case 'robot':     return disegnaRobot(ctx, fc, t);
    case 'cowboy':    return disegnaCowboy(ctx, fc);
    case 'diavolo':   return disegnaDiavolo(ctx, fc);
    case 'angelo':    return disegnaAngelo(ctx, fc, t);
    case 'blush':     return disegnaBlush(ctx, fc, t);
    case 'arcoboca':  return disegnaArcobalenoBocca(ctx, fc, t);
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

/* --- 🐱 gatto: orecchie triangolari + naso + baffi --- */
function disegnaGatto(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  for (const lato of [-1, 1]) {
    const g = P(lato < 0 ? LM.guanciaSx : LM.guanciaDx);
    ctx.save();
    ctx.translate(g[0] + lato * lv * 0.06, g[1] - av * 0.50);
    ctx.rotate(lato * (0.30 + angolo));
    ctx.beginPath();
    ctx.moveTo(-lv * 0.13, av * 0.10);
    ctx.lineTo(0, -av * 0.20);
    ctx.lineTo(lv * 0.13, av * 0.10);
    ctx.closePath();
    ctx.fillStyle = '#3d2c22';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-lv * 0.065, av * 0.07);
    ctx.lineTo(0, -av * 0.115);
    ctx.lineTo(lv * 0.065, av * 0.07);
    ctx.closePath();
    ctx.fillStyle = '#f2a7bb';
    ctx.fill();
    ctx.restore();
  }

  const n = P(LM.naso);
  ctx.save();
  ctx.translate(n[0], n[1] + av * 0.012);
  ctx.beginPath();
  ctx.moveTo(-lv * 0.045, -av * 0.02);
  ctx.lineTo(lv * 0.045, -av * 0.02);
  ctx.lineTo(0, av * 0.035);
  ctx.closePath();
  ctx.fillStyle = '#f47b9d';
  ctx.fill();
  ctx.restore();

  // baffi
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.5, lv * 0.012);
  ctx.lineCap = 'round';
  const baseY = n[1] + av * 0.05;
  for (const lato of [-1, 1]) {
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(n[0] + lato * lv * 0.06, baseY + k * av * 0.022);
      ctx.quadraticCurveTo(
        n[0] + lato * lv * 0.18, baseY + k * av * 0.05 - av * 0.02,
        n[0] + lato * lv * 0.32, baseY + k * av * 0.06 - av * 0.05
      );
      ctx.stroke();
    }
  }
  return true;
}

/* --- 🐰 coniglietto: orecchie lunghe che oscillano --- */
function disegnaConiglio(ctx, fc, t) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);
  for (const lato of [-1, 1]) {
    ctx.save();
    ctx.translate(f[0] + lato * lv * 0.17, f[1] - av * 0.14);
    ctx.rotate(lato * (0.12 + angolo) + Math.sin(t * 2 + lato) * 0.05);
    ellisse(ctx, 0, -av * 0.32, lv * 0.085, av * 0.34, '#f5f0ea');
    ellisse(ctx, 0, -av * 0.32, lv * 0.042, av * 0.24, '#f7b8c6');
    ctx.restore();
  }
  return true;
}

/* --- 🤖 robot: visiera metallica, occhi LED, antenna --- */
function disegnaRobot(ctx, fc, t) {
  const { occhioSx, occhioDx, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const cx = (occhioSx[0] + occhioDx[0]) / 2;
  const cy = (occhioSx[1] + occhioDx[1]) / 2;
  const w = lv * 0.80, h = av * 0.24;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angolo);

  // antenna con lucina pulsante
  ctx.strokeStyle = '#8f9bab';
  ctx.lineWidth = Math.max(2, lv * 0.02);
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(0, -h / 2 - av * 0.16);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 59, 48, ${0.55 + 0.45 * Math.sin(t * 5)})`;
  ctx.beginPath();
  ctx.arc(0, -h / 2 - av * 0.19, lv * 0.028, 0, Math.PI * 2);
  ctx.fill();

  // visiera
  rettangoloTondo(ctx, -w / 2, -h / 2, w, h, h * 0.35);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#d7dee8');
  g.addColorStop(0.55, '#93a0b1');
  g.addColorStop(1, '#5c6875');
  ctx.fillStyle = g;
  ctx.fill();

  // schermo scuro
  rettangoloTondo(ctx, -w / 2 + h * 0.18, -h / 2 + h * 0.22, w - h * 0.36, h * 0.56, h * 0.22);
  ctx.fillStyle = '#101820';
  ctx.fill();

  // occhi LED con bagliore
  const eo = dist(occhioSx, occhioDx) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(53, 224, 255, 0.9)';
  ctx.shadowBlur = lv * 0.05;
  ctx.fillStyle = '#35e0ff';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * eo * 0.55, 0, lv * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // bulloni laterali
  ctx.fillStyle = '#39424d';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * (w / 2 - h * 0.14), 0, h * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return true;
}

/* --- 🤠 cowboy: cappello con tesa, calotta e fascia --- */
function disegnaCowboy(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);
  ctx.save();
  ctx.translate(f[0], f[1] - av * 0.32);
  ctx.rotate(angolo);
  // calotta
  ctx.beginPath();
  ctx.ellipse(0, -av * 0.16, lv * 0.28, av * 0.17, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8a5a2b';
  ctx.fill();
  // fascia
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(-lv * 0.28, -av * 0.085, lv * 0.56, av * 0.05);
  // tesa (davanti a tutto)
  ctx.beginPath();
  ctx.ellipse(0, 0, lv * 0.54, av * 0.085, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#966333';
  ctx.fill();
  ctx.restore();
  return true;
}

/* --- 😈 diavoletto: corna rosse --- */
function disegnaDiavolo(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);
  for (const lato of [-1, 1]) {
    ctx.save();
    ctx.translate(f[0] + lato * lv * 0.26, f[1] - av * 0.08);
    ctx.rotate(lato * (0.45 + angolo));
    ctx.beginPath();
    ctx.moveTo(-lv * 0.055, 0);
    ctx.quadraticCurveTo(-lv * 0.02, -av * 0.22, lv * 0.02, -av * 0.30);
    ctx.quadraticCurveTo(lv * 0.02, -av * 0.12, lv * 0.06, 0);
    ctx.closePath();
    ctx.fillStyle = '#c0261f';
    ctx.fill();
    ctx.restore();
  }
  return true;
}

/* --- 😇 angioletto: aureola dorata fluttuante --- */
function disegnaAngelo(ctx, fc, t) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);
  ctx.save();
  // dimensione e altezza ancorate alla larghezza della testa: con la sola
  // altezza del volto l'aureola finisce fuori dall'inquadratura sui primi
  // piani
  ctx.translate(f[0], f[1] - lv * 0.24 + Math.sin(t * 2.2) * lv * 0.02);
  ctx.rotate(angolo * 0.5);
  ctx.shadowColor = 'rgba(255, 214, 64, 0.9)';
  ctx.shadowBlur = lv * 0.08;
  ctx.strokeStyle = '#ffd640';
  ctx.lineWidth = Math.max(4, lv * 0.045);
  ctx.beginPath();
  ctx.ellipse(0, 0, lv * 0.24, lv * 0.07, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return true;
}

/* --- 🌸 blush: guancerose + scintille pulsanti --- */
function disegnaBlush(ctx, fc, t) {
  const { P, larghezzaVolto: lv, altezzaVolto: av } = fc;
  ctx.save();
  ctx.globalAlpha = 0.42;
  for (const idx of [LM.guanciaSXint, LM.guanciaDXint]) {
    const c = P(idx);
    ellisse(ctx, c[0], c[1] + av * 0.02, lv * 0.095, av * 0.06, '#ff5f8f');
  }
  ctx.restore();

  const f = P(LM.fronte), n = P(LM.naso);
  const punti = [
    [f[0] - lv * 0.32, f[1] + av * 0.03],
    [f[0] + lv * 0.32, f[1] + av * 0.03],
    [n[0] - lv * 0.24, n[1] - av * 0.12],
    [n[0] + lv * 0.24, n[1] - av * 0.12],
  ];
  ctx.fillStyle = '#ffffff';
  punti.forEach(([x, y], i) => {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.4 + i * 1.7));
    ctx.globalAlpha = a;
    scintilla(ctx, x, y, lv * 0.045 * (0.7 + 0.3 * a));
  });
  ctx.globalAlpha = 1;
  return true;
}

/* --- 🤮 arcobaleno dalla bocca --- */
function disegnaArcobalenoBocca(ctx, fc, t) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const bocca = mid(P, 'labbroSup', 'labbroInf');
  const colori = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#32ade6', '#af52de'];
  ctx.save();
  ctx.translate(bocca[0], bocca[1] + av * 0.012);
  ctx.rotate(angolo);
  const L = av * 0.78, wob = Math.sin(t * 3) * lv * 0.012;
  // dal più esterno (viola) al più interno (rosso, vicino alla bocca)
  for (let i = colori.length - 1; i >= 0; i--) {
    const k = (i + 1) / colori.length;
    const half = lv * 0.30 * k + wob * k;
    const len = L * (0.35 + 0.65 * k);
    ctx.beginPath();
    ctx.moveTo(-lv * 0.05, 0);
    ctx.bezierCurveTo(-half, len * 0.45, -half * 0.9, len * 0.8, -half * 0.55 + wob, len);
    ctx.lineTo(half * 0.55 + wob, len);
    ctx.bezierCurveTo(half * 0.9, len * 0.8, half, len * 0.45, lv * 0.05, 0);
    ctx.closePath();
    ctx.fillStyle = colori[i];
    ctx.fill();
  }
  ctx.restore();
  return true;
}

/* ---------- helper di disegno condivisi ---------- */

function rettangoloTondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function scintilla(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
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

export function disegnaCornice(ctx, filtro, W, H, t, bloom = false) {
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
  } else if (filtro.cornice === 'vhs') {
    // scanline che scorrono
    const passo = Math.max(3, Math.round(H / 280));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    for (let y = (t * 30) % (passo * 2); y < H; y += passo * 2) {
      ctx.fillRect(0, y, W, Math.max(1, passo * 0.5));
    }
    // strappi orizzontali casuali
    for (let i = 0; i < 2; i++) {
      const y = Math.random() * H;
      const hh = 2 + Math.random() * H * 0.012;
      ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.05})`;
      ctx.fillRect(0, y, W, hh);
    }
    // frangia cromatica ai bordi
    const fw = W * 0.06;
    let g = ctx.createLinearGradient(0, 0, fw, 0);
    g.addColorStop(0, 'rgba(255,0,80,0.16)');
    g.addColorStop(1, 'rgba(255,0,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, fw, H);
    g = ctx.createLinearGradient(W, 0, W - fw, 0);
    g.addColorStop(0, 'rgba(0,220,255,0.16)');
    g.addColorStop(1, 'rgba(0,220,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(W - fw, 0, fw, H);
  } else if (filtro.cornice === 'bloom') {
    // alone morbido al centro
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(255,245,225,0.16)');
    g.addColorStop(0.55, 'rgba(255,245,225,0.05)');
    g.addColorStop(1, 'rgba(255,245,225,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (bloom) {
      // vero bloom (solo allo scatto: il canvas contiene già la foto):
      // copia ridotta e rimessa con blend 'lighter'
      const tw = Math.max(2, Math.round(W / 10));
      const th = Math.max(2, Math.round(H / 10));
      const tmp = document.createElement('canvas');
      tmp.width = tw; tmp.height = th;
      tmp.getContext('2d').drawImage(ctx.canvas, 0, 0, tw, th);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(tmp, 0, 0, W, H);
      ctx.restore();
    }
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
  duotone(d) {
    const t = clamp01((0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255);
    // viola profondo → rosa brillante
    return [18 + 218 * t, 7 + 99 * t, 58 + 158 * t];
  },
  termica(d) {
    const t = clamp01((0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255);
    // rampa: nero → viola → rosso → arancio → quasi bianco
    const stop = [
      [0.00, [5, 0, 30]],
      [0.25, [80, 0, 160]],
      [0.50, [235, 45, 32]],
      [0.75, [255, 180, 0]],
      [1.00, [255, 250, 210]],
    ];
    for (let i = 1; i < stop.length; i++) {
      if (t <= stop[i][0]) {
        const [t0, c0] = stop[i - 1];
        const [t1, c1] = stop[i];
        const k = (t - t0) / (t1 - t0);
        return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
      }
    }
    return [255, 250, 210];
  },
  psichedelico(d, t) {
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
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
