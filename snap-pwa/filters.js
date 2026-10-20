/**
 * ===== Snap PWA — the filter engine =====
 *
 * Two families of filters:
 *  1. Face lenses (face:true): they track the face with MediaPipe's
 *     FaceLandmarker (478 landmarks) and draw accessories anchored to the
 *     eyes, nose and mouth. The engine loads lazily on the first face
 *     filter (~3.7 MB, once).
 *  2. Image filters: CSS on the <video> for the live preview, plus
 *     per-pixel operations on the canvas at the moment of the shot (so the
 *     preview and the photo agree even where CanvasRenderingContext2D.filter
 *     does not exist, e.g. iOS < 18).
 */

/* ---------- face mesh landmark indices ---------- */
const LM = {
  naso: 4,
  mento: 152,
  fronte: 10,
  occhioSxEst: 33, occhioSxInt: 133,   // the subject's left eye
  occhioDxEst: 263, occhioDxInt: 362,
  guanciaSx: 234, guanciaDx: 454,      // sides of the face, at ear height
  guanciaSXint: 50, guanciaDXint: 280, // cheek centres (for the blush)
  boccaSx: 61, boccaDx: 291,
  labbroSup: 13, labbroInf: 14,
};

/**
 * Where the engine comes from: the local files in vendor/ (bundle + wasm +
 * model), which the service worker caches on the first request: from the
 * second opening the face filters work offline too.
 *
 * There is no CDN fallback. There used to be one, for a partial deploy; but
 * it means the app reaches the internet when it should not, and the only
 * version this page promises — zero external requests, everything offline —
 * is the one where the engine is always local.
 */
const SORGENTI_ENGINE = [
  {
    bundle: './vendor/vision_bundle.mjs',
    wasm: './vendor/wasm',
    modello: './vendor/models/face_landmarker.task',
  },
];

/* ---------- the filter registry ---------- */
export const FILTRI = [
  { id: 'nessuno',  nome: 'Original', emoji: '✨' },
  { id: 'cagnolino', nome: 'Dog', emoji: '🐶', volto: true },
  { id: 'occhiali', nome: 'Sunglasses',  emoji: '😎', volto: true },
  { id: 'corona',   nome: 'Crown',    emoji: '👑', volto: true },
  { id: 'cuori',    nome: 'Hearts',     emoji: '😍', volto: true },
  { id: 'gatto',    nome: 'Cat',     emoji: '🐱', volto: true },
  { id: 'coniglio', nome: 'Bunny',  emoji: '🐰', volto: true },
  { id: 'robot',    nome: 'Robot',     emoji: '🤖', volto: true },
  { id: 'cowboy',   nome: 'Cowboy',    emoji: '🤠', volto: true },
  { id: 'diavolo',  nome: 'Devil',   emoji: '😈', volto: true },
  { id: 'angelo',   nome: 'Angel',    emoji: '😇', volto: true },
  { id: 'blush',    nome: 'Blush',     emoji: '🌸', volto: true },
  { id: 'arcoboca', nome: 'Rainbow', emoji: '🤮', volto: true },
  { id: 'batteria', nome: 'Drums',   emoji: '🥁', volto: true, minigame: 'batteria' },
  { id: 'anatra',   nome: 'Duck',    emoji: '🦆', volto: true, minigame: 'anatra' },
  { id: 'volpe',    nome: 'Fox',         emoji: '🦊', volto: true },
  { id: 'panda',    nome: 'Panda',       emoji: '🐼', volto: true },
  { id: 'vampiro',  nome: 'Vampire',     emoji: '🧛', volto: true },
  { id: 'mago',     nome: 'Wizard',      emoji: '🧙', volto: true },
  { id: 'ape',      nome: 'Bee',         emoji: '🐝', volto: true },
  { id: 'cilindro', nome: 'Top Hat',     emoji: '🎩', volto: true },
  { id: 'parrucca', nome: 'Wig',         emoji: '🧔', volto: true },
  { id: 'baffi',    nome: 'Moustache',   emoji: '🥸', volto: true },
  { id: 'benda',    nome: 'Eyepatch',    emoji: '🏴', volto: true },
  { id: 'bolle',    nome: 'Bubbles',    emoji: '🫧', volto: true },
  { id: 'quiz-animale', nome: 'Which animal?', emoji: '🐾', volto: true, quiz: 'animali' },
  { id: 'quiz-cibo',    nome: 'Which food?',    emoji: '🍽️', volto: true, quiz: 'cibo' },
  { id: 'quiz-mood',    nome: 'Which mood?',    emoji: '⚡', volto: true, quiz: 'mood' },
  { id: 'vignetta', nome: 'Vignette',  emoji: '🌑', cornice: 'vignetta' },
  { id: 'grana',    nome: 'Grain',     emoji: '🎞️', cornice: 'grana' },
  { id: 'mosaico',  nome: 'Mosaic',   emoji: '🟪', pixel: true },
  { id: 'vhs',      nome: 'VHS',       emoji: '📼', css: 'saturate(1.15) contrast(1.08)', cornice: 'vhs' },
  { id: 'bw',       nome: 'B/N',       emoji: '⚪', css: 'grayscale(1) contrast(1.08)', op: 'gray' },
  { id: 'noir',     nome: 'Noir',      emoji: '🎩', css: 'grayscale(1) contrast(1.4) brightness(0.88)', op: 'noir' },
  { id: 'seppia',   nome: 'Sepia',    emoji: '🟤', css: 'sepia(0.85) contrast(1.05)', op: 'seppia' },
  { id: 'vivido',   nome: 'Vivid',    emoji: '🌈', css: 'saturate(1.65) contrast(1.12)', op: 'vivido' },
  // NB: a hue-rotate towards blue turns the sky orange and the skin
  // redder: Cold desaturates towards luminance and lifts the blue
  // instead (the same idea as the pixel version, below).
  // redder: Cold desaturates towards luminance and lifts the blue
  // instead (the same idea as the pixel version, below).
  { id: 'freddo',   nome: 'Cold',    emoji: '🧊', css: 'saturate(0.45) brightness(1.06) sepia(0.25) hue-rotate(172deg) saturate(1.6)', op: 'freddo' },
  { id: 'caldo',    nome: 'Warm',     emoji: '🔥', css: 'sepia(0.35) saturate(1.35) hue-rotate(-12deg)', op: 'caldo' },
  { id: 'negativo', nome: 'Negative',  emoji: '🌓', css: 'invert(1)', op: 'negativo' },
  { id: 'duotone',  nome: 'Duotone',   emoji: '🟣', css: 'grayscale(1) sepia(1) hue-rotate(225deg) saturate(2.6) contrast(1.05)', op: 'duotone' },
  { id: 'neon',     nome: 'Neon',      emoji: '🟪', css: 'saturate(2.4) contrast(1.28) hue-rotate(-12deg)', op: 'neon' },
  { id: 'cianotipo', nome: 'Cyanotype', emoji: '💙', css: 'grayscale(1) contrast(1.25) sepia(0.55) hue-rotate(178deg) saturate(2.4)', op: 'cianotipo' },
  { id: 'solarizzato', nome: 'Solarized', emoji: '☀️', css: 'saturate(1.2) contrast(1.05) sepia(0.3) hue-rotate(322deg)', op: 'solarizzato' },
  { id: 'infrarosso', nome: 'Infrared', emoji: '🌿', css: 'grayscale(1) sepia(1) hue-rotate(70deg) saturate(3.2) contrast(1.05)', op: 'infrarosso' },
  { id: 'ambrato', nome: 'Amber', emoji: '📟', css: 'grayscale(1) sepia(1) saturate(3) hue-rotate(352deg) brightness(1.05)', op: 'ambrato' },
  { id: 'crosprocess', nome: 'Cross', emoji: '🔀', css: 'saturate(1.35) contrast(1.06) hue-rotate(-16deg)', op: 'crosprocess' },
  // `live: true` = the preview uses the same ramp as the photo (at a low
  // resolution); without it the CSS showed a red heatmap with black.
  // resolution); without it the CSS showed a red heatmap with black.
  { id: 'termica',  nome: 'Thermal',   emoji: '🌡️', css: 'none', live: true, op: 'termica' },
  { id: 'sogno',    nome: 'Dream',     emoji: '☁️', css: 'brightness(1.1) saturate(1.25) contrast(0.92)', cornice: 'bloom' },
  { id: 'fulgore',  nome: 'Light Leak', emoji: '💫', cornice: 'fulgore' },
  { id: 'pola',     nome: 'Instant Film', emoji: '📆', cornice: 'pola' },
  { id: 'letterbox', nome: 'Cinema',  emoji: '🎞️', cornice: 'letterbox' },
  { id: 'gelo',     nome: 'Frost',     emoji: '🧊', cornice: 'gelo' },
  { id: 'glitch',   nome: 'Glitch',    emoji: '⚡', cornice: 'glitch' },
  { id: 'prisma',   nome: 'Prism',     emoji: '🌈', cornice: 'prisma' },
  { id: 'biglietto', nome: 'Ticket',   emoji: '🎟️', cornice: 'biglietto' },
  { id: 'angoli',   nome: 'Corners',   emoji: '🔲', cornice: 'angoli' },
  { id: 'perforazioni', nome: 'Film strip', emoji: '🎞️', cornice: 'perforazioni' },
  { id: 'polvere',  nome: 'Dust',      emoji: '✨', cornice: 'polvere' },
  { id: 'alone',    nome: 'Rim light', emoji: '🌟', cornice: 'alone' },
  { id: 'psichedelico', nome: 'Psychedelic', emoji: '🌀', animato: true, op: 'psichedelico' },
];

/* ---------- looks ----------

   A look is a lens, a frame and a grade applied together, in one tap: the
   thing a camera app is actually for. The pieces are all in the registry
   above; a look only says which ones to use. */
export const LOOKS = [
  { id: 'look-disco',    nome: 'Disco',     emoji: '🪩', lente: 'robot',    cornice: 'prisma',    grado: 'vivido' },
  { id: 'look-noir',     nome: 'Noir',      emoji: '🎩', lente: 'cilindro', cornice: 'vignetta',  grado: 'noir' },
  { id: 'look-cinema',   nome: 'Cinema',    emoji: '🎞️', cornice: 'letterbox',                 grado: 'seppia' },
  { id: 'look-onda',     nome: 'Wave',      emoji: '🌊', lente: 'arcoboca',  cornice: 'fulgore',   grado: 'freddo' },
  { id: 'look-ghiaccio', nome: 'Ice Queen', emoji: '👸', lente: 'angelo',   cornice: 'gelo',      grado: 'cianotipo' },
];

/* Resolves a look into the filter object the renderer already understands,
   so a look is drawn by exactly the same code as a single filter. */
export function lookComeFiltro(look) {
  const grado = look.grado ? filtroPerId(look.grado) : null;
  return {
    id: look.id,
    nome: look.nome,
    emoji: look.emoji,
    volto: !!look.lente,
    lente: look.lente || null,
    cornice: look.cornice || null,
    op: grado ? (grado.op ?? null) : null,
    css: grado ? (grado.css ?? null) : null,
  };
}

export const filtroPerId = (id) => {
  const f = FILTRI.find((x) => x.id === id);
  if (f) return f;
  const look = LOOKS.find((x) => x.id === id);
  return look ? lookComeFiltro(look) : FILTRI[0];
};

/* ============================================================
 * FACE ENGINE (MediaPipe, lazy loading)
 * ============================================================ */

let enginePromise = null;
let engineStillPromise = null;

async function avviaLandmarker(vision, fileset, modello, runningMode) {
  try {
    return await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modello, delegate: 'GPU' },
      runningMode,
      numFaces: 1,
    });
  } catch {
  // no GPU (or WebGL off): fall back to the CPU
    return await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modello, delegate: 'CPU' },
      runningMode,
      numFaces: 1,
    });
  }
}

/** Returns { detect(video, ts) → landmarks | null }. Loads on first use. */
export function ensureEngineVolto() {
  enginePromise ??= (async () => {
    let ultimoErrore;
    for (const sorgente of SORGENTI_ENGINE) {
      try {
        const vision = await import(/* @vite-ignore */ sorgente.bundle);
        const fileset = await vision.FilesetResolver.forVisionTasks(sorgente.wasm);
        const landmarker = await avviaLandmarker(vision, fileset, sorgente.modello, 'VIDEO');
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
        ultimoErrore = err; // try the next source
      }
    }
    throw ultimoErrore;
  })();
  return enginePromise;
}

/**
 * The same engine in IMAGE mode, for a photo imported from the device.
 *
 * MediaPipe runs a landmarker in one mode or the other: VIDEO takes a video
 * element and a timestamp, IMAGE takes a still and returns the landmarks
 * straight away. A photo from the gallery is a still, so it needs its own
 * landmarker — the bundle supports both, it is the same model.
 */
export function ensureEngineStill() {
  engineStillPromise ??= (async () => {
    let ultimoErrore;
    for (const sorgente of SORGENTI_ENGINE) {
      try {
        const vision = await import(/* @vite-ignore */ sorgente.bundle);
        const fileset = await vision.FilesetResolver.forVisionTasks(sorgente.wasm);
        const landmarker = await avviaLandmarker(vision, fileset, sorgente.modello, 'IMAGE');
        return {
          detect(immagine) {
            const res = landmarker.detect(immagine);
            return res.faceLandmarks?.[0] ?? null;
          },
        };
      } catch (err) {
        ultimoErrore = err; // try the next source
      }
    }
    throw ultimoErrore;
  })();
  return engineStillPromise;
}

/* ============================================================
 * THE FOREHEAD QUIZ ("which animal are you?", …)
 *
 * A card anchored to the forehead: it spins the results quickly, then
 * locks onto one (with a "pop"). The draw is deterministic from the clock,
 * so the preview and the photo show the same result.
 * ============================================================ */

const QUIZ = {
  animali: {
    titolo: 'WHICH ANIMAL ARE YOU?',
    voci: [
      ['Lion', '🦁'], ['Cat', '🐱'], ['Panda', '🐼'], ['Fox', '🦊'],
      ['Owl', '🦉'], ['Dolphin', '🐬'], ['Wolf', '🐺'], ['Koala', '🐨'],
      ['Tiger', '🐯'], ['Unicorn', '🦄'],
    ],
  },
  cibo: {
    titolo: 'WHICH FOOD ARE YOU?',
    voci: [
      ['Pizza', '🍕'], ['Sushi', '🍣'], ['Ice cream', '🍦'], ['Taco', '🌮'],
      ['Donut', '🍩'], ['Watermelon', '🍉'], ['Popcorn', '🍿'], ['Avocado', '🥑'],
    ],
  },
  mood: {
    titolo: 'WHICH MOOD ARE YOU?',
    voci: [
      ['Happy', '😄'], ['Zen', '🧘'], ['Turbo', '🚀'], ['Fire', '🔥'],
      ['Romantic', '🥰'], ['Mysterious', '🕶️'], ['Party', '🥳'], ['Sleepy', '😴'],
    ],
  },
};

const CICLO_S = 1.6; // how long the spin lasts
const LOCK_S = 5;    // how long it stays on the result
const quizStati = {};

function mescola(n) {
  let x = Math.imul(n | 0, 2654435761);
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177);
  return (x ^ (x >>> 16)) >>> 0;
}

/** The current quiz index + whether the draw is already locked. */
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

/** Restarts the draw (called when the filter changes). */
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
  const base = -av * 0.04; // the card's bottom edge, on the forehead
  const top = base - h;

  ctx.save();
  ctx.translate(f[0], f[1]);
  ctx.rotate(angolo);

  // animation: a fast blink while spinning, a "pop" when it locks
  const trascorsoLock = t - (quizStati[filtro.quiz].inizio + CICLO_S);
  const scala = bloccato
    ? (trascorsoLock >= 0 && trascorsoLock < 0.3 ? 1 + 0.28 * (1 - trascorsoLock / 0.3) : 1)
    : 1 + 0.05 * Math.sin(t * 22);
  ctx.scale(scala, scala);

  // the yellow pointer towards the forehead
  ctx.beginPath();
  ctx.moveTo(-w * 0.07, base);
  ctx.lineTo(w * 0.07, base);
  ctx.lineTo(0, base + av * 0.05);
  ctx.closePath();
  ctx.fillStyle = '#fffc00';
  ctx.fill();

  // the white card with a shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = w * 0.07;
  ctx.shadowOffsetY = w * 0.02;
  rettangoloTondo(ctx, -w / 2, top, w, h, w * 0.13);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // the yellow title band (clipped to the rounded corners)
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

  // border
  rettangoloTondo(ctx, -w / 2, top, w, h, w * 0.13);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = Math.max(1.5, w * 0.012);
  ctx.stroke();

  // the big emoji and the result name
  ctx.font = `${w * 0.40}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText(emoji, 0, top + h * 0.24 + h * 0.37);
  ctx.fillStyle = '#141414';
  ctx.font = `800 ${w * 0.085}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(nome.toUpperCase(), 0, top + h * 0.88);

  ctx.restore();
  return true;
}

/* ============================================================
 * GEOMETRY: projects the landmarks (0..1) onto the visible canvas
 * ============================================================ */

/**
 * The video uses object-fit: cover, so the same coordinates have to be
 * recomputed to stay aligned in the preview and in the final photo.
 */
/* Projects a landmark onto the drawing canvas: it takes the point's INDEX
 * (LM.brow, LM.nose, …) and returns [x, y] in pixels, with object-fit:cover
 * and the front camera's mirroring. */
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
 * READING THE FACE
 * ============================================================ */

/**
 * What the face is doing, in the terms the minigames need: where it is,
 * how open the mouth is, how far the head is tilted, and how far the
 * eyelids have closed.
 *
 * The two "how much" numbers are ratios, not distances, so they mean the
 * same thing for a face at ten centimetres and a face at two metres. And
 * the callers measure them against a resting baseline rather than a fixed
 * threshold, because a face that is already talking is not a face that is
 * about to hit a drum.
 */
export function leggiVolto(fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const occhiSx = mid(P, 'occhioSxEst', 'occhioSxInt');
  const occhiDx = mid(P, 'occhioDxEst', 'occhioDxInt');
  const bocca = mid(P, 'labbroSup', 'labbroInf');

  /* the mouth: the distance between the lips, over the height of the face */
  const apertura = dist(P(LM.labbroSup), P(LM.labbroInf)) / Math.max(av, 0.0001);

  /* the blink: how far the eyelids have closed, over the width of the eye */
  const palpebra = Math.abs(P(159)[1] - P(145)[1]);
  const larghezzaOcchio = dist(P(33), P(133));
  const battito = 1 - Math.min(1, palpebra / Math.max(larghezzaOcchio * 0.42, 0.0001));

  return {
    centro: [(occhiSx[0] + occhiDx[0]) / 2, (occhiSx[1] + occhiDx[1]) / 2],
    occhiSx, occhiDx, bocca,
    apertura, battito,
    roll: angolo,
    lv, av,
  };
}

/* ============================================================
 * DRAWING THE FACE LENSES
 * ============================================================ */

/**
 * The face context: the landmarks, projected, and the handful of measures
 * every lens needs. It is built once per frame and shared, so the lenses
 * and the minigames are looking at exactly the same face.
 */
export function contestoVolto(landmarks, geom) {
  const P = creaProiettore(geom, landmarks);
  const occhioSx = mid(P, 'occhioSxEst', 'occhioSxInt');
  const occhioDx = mid(P, 'occhioDxEst', 'occhioDxInt');
  const fc = {
    P,
    occhioSx,
    occhioDx,
    larghezzaVolto: dist(P(LM.guanciaSx), P(LM.guanciaDx)),
    altezzaVolto: dist(P(LM.fronte), P(LM.mento)),
    angolo: Math.atan2(occhioDx[1] - occhioSx[1], occhioDx[0] - occhioSx[0]),
    specchio: geom.specchio,
  };
  fc.latoSchermo = (lato) => lato * (fc.specchio ? -1 : 1);
  return fc;
}

export function disegnaLenteVolto(ctx, filtro, landmarks, geom, t = 0) {
  if (!landmarks?.length) return false;
  const fc = contestoVolto(landmarks, geom);
  // malformed landmarks: better not to draw than to draw in the void
  if (!Number.isFinite(fc.occhioSx[0] + fc.occhioSx[1] + fc.occhioDx[0] + fc.occhioDx[1])) return false;
  const { larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // With the front camera the projector mirrors the coordinates: landmark
  // 234 (cheekL) ends up on the right of the screen. Without this, ears
  // and other accessories drawn towards that side would land inside the face.
  if (filtro.quiz) return disegnaQuiz(ctx, fc, filtro, t);

  /* A look carries the lens it wants in `lente`; a plain filter is its own
     lens. One switch, two kinds of entry. */
  switch (filtro.lente || filtro.id) {
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
    case 'volpe':    return disegnaVolpe(ctx, fc);
    case 'panda':    return disegnaPanda(ctx, fc);
    case 'vampiro':  return disegnaVampiro(ctx, fc);
    case 'mago':     return disegnaMago(ctx, fc);
    case 'ape':      return disegnaApe(ctx, fc);
    case 'cilindro': return disegnaCilindro(ctx, fc);
    case 'parrucca': return disegnaParrucca(ctx, fc);
    case 'baffi':    return disegnaBaffi(ctx, fc);
    case 'benda':    return disegnaBenda(ctx, fc);
    case 'bolle':    return disegnaBolle(ctx, fc, t);
  }
  return false;
}

/* --- 🐶 dog: ears + nose + tongue --- */
function disegnaCagnolino(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // ears: above the cheeks, tilted outwards
  for (const lato of [-1, 1]) {
    const g = P(lato < 0 ? LM.guanciaSx : LM.guanciaDx);
    const s = fc.latoSchermo(lato); // the side as it appears on screen
    const ex = g[0] + s * lv * 0.10;
    const ey = g[1] - av * 0.52;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(s * (0.45 + angolo));
    ellisse(ctx, 0, 0, lv * 0.145, av * 0.19, '#8a5a33');
    ellisse(ctx, 0, av * 0.03, lv * 0.08, av * 0.11, '#e8a0b4');
    ctx.restore();
  }

  // nose
  const n = P(LM.naso);
  ellisse(ctx, n[0], n[1] + av * 0.015, lv * 0.075, av * 0.055, '#241a12');

  // tongue: under the mouth, with a centre crease
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

/* --- 😎 sunglasses --- */
function disegnaOcchiali(ctx, fc) {
  const { P, occhioSx, occhioDx, larghezzaVolto: lv, angolo } = fc;
  const r = dist(occhioSx, occhioDx) * 0.30;
  ctx.save();
  ctx.translate((occhioSx[0] + occhioDx[0]) / 2, (occhioSx[1] + occhioDx[1]) / 2);
  ctx.rotate(angolo);
  ctx.translate(-(occhioSx[0] + occhioDx[0]) / 2, -(occhioSx[1] + occhioDx[1]) / 2);

  // the arms towards the ears
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

  // bridge
  ctx.beginPath();
  ctx.moveTo(occhioSx[0] + r * 0.8, occhioSx[1] - r * 0.15);
  ctx.quadraticCurveTo(
    (occhioSx[0] + occhioDx[0]) / 2, occhioSx[1] - r * 0.55,
    occhioDx[0] - r * 0.8, occhioDx[1] - r * 0.15
  );
  ctx.stroke();

  // lenses: dark ovals with a highlight
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

/* --- 👑 crown --- */
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

  // the zig-zag body (5 points)
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

  // gems on the odd points + the band
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

/* --- 😍 heart eyes --- */
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

/* --- 🐱 cat: triangular ears + nose + whiskers --- */
function disegnaGatto(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  for (const lato of [-1, 1]) {
    const g = P(lato < 0 ? LM.guanciaSx : LM.guanciaDx);
    const s = fc.latoSchermo(lato); // lato come appare a schermo
    ctx.save();
    ctx.translate(g[0] + s * lv * 0.06, g[1] - av * 0.50);
    ctx.rotate(s * (0.30 + angolo));
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

  // whiskers
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

/* --- 🐰 bunny: long ears that swing --- */
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

/* --- 🤖 robot: metal visor, LED eyes, antenna --- */
function disegnaRobot(ctx, fc, t) {
  const { occhioSx, occhioDx, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const cx = (occhioSx[0] + occhioDx[0]) / 2;
  const cy = (occhioSx[1] + occhioDx[1]) / 2;
  const w = lv * 0.80, h = av * 0.24;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angolo);

  // antenna with a blinking light
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

  // visor
  rettangoloTondo(ctx, -w / 2, -h / 2, w, h, h * 0.35);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#d7dee8');
  g.addColorStop(0.55, '#93a0b1');
  g.addColorStop(1, '#5c6875');
  ctx.fillStyle = g;
  ctx.fill();

  // dark screen
  rettangoloTondo(ctx, -w / 2 + h * 0.18, -h / 2 + h * 0.22, w - h * 0.36, h * 0.56, h * 0.22);
  ctx.fillStyle = '#101820';
  ctx.fill();

  // LED eyes with a glow
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

  // side bolts
  ctx.fillStyle = '#39424d';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * (w / 2 - h * 0.14), 0, h * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return true;
}

/* --- 🤠 cowboy: hat with brim, crown and band --- */
function disegnaCowboy(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);
  ctx.save();
  ctx.translate(f[0], f[1] - av * 0.32);
  ctx.rotate(angolo);
  // crown
  ctx.beginPath();
  ctx.ellipse(0, -av * 0.16, lv * 0.28, av * 0.17, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8a5a2b';
  ctx.fill();
  // band
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(-lv * 0.28, -av * 0.085, lv * 0.56, av * 0.05);
  // brim (in front of everything)
  ctx.beginPath();
  ctx.ellipse(0, 0, lv * 0.54, av * 0.085, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#966333';
  ctx.fill();
  ctx.restore();
  return true;
}

/* --- 😈 little devil: red horns --- */
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

/* --- 😇 little angel: floating golden halo --- */
function disegnaAngelo(ctx, fc, t) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);
  ctx.save();
  // size and height anchored to the width of the head: with the face
  // height alone the halo leaves the frame on the close-ups
  // height alone the halo leaves the frame on the close-ups
  // close-ups
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

/* --- 🌸 blush: rosy cheeks + pulsing sparkles --- */
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

/* --- 🤮 rainbow from the mouth --- */
function disegnaArcobalenoBocca(ctx, fc, t) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const bocca = mid(P, 'labbroSup', 'labbroInf');
  const colori = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#32ade6', '#af52de'];
  ctx.save();
  ctx.translate(bocca[0], bocca[1] + av * 0.012);
  ctx.rotate(angolo);
  const L = av * 0.78, wob = Math.sin(t * 3) * lv * 0.012;
  // from the outermost (violet) to the innermost (red, near the mouth)
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

/* --- 🦊 fox: pointed ears + a pale muzzle + whiskers --- */
function disegnaVolpe(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // ears: pointed triangles above the cheeks, tilted outwards
  for (const lato of [-1, 1]) {
    const g = P(lato < 0 ? LM.guanciaSx : LM.guanciaDx);
    const s = fc.latoSchermo(lato);
    const ex = g[0] + s * lv * 0.17;
    const ey = g[1] - av * 0.46;
    const alt = av * 0.30;
    const larg = lv * 0.13;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(s * (0.30 + angolo));
    ctx.beginPath();
    ctx.moveTo(-larg, alt);
    ctx.lineTo(0, -alt * 1.5);
    ctx.lineTo(larg, alt);
    ctx.closePath();
    ctx.fillStyle = '#d9622b';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-larg * 0.45, alt * 0.55);
    ctx.lineTo(0, -alt * 0.95);
    ctx.lineTo(larg * 0.45, alt * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#f7b8c6';
    ctx.fill();
    ctx.restore();
  }

  // the muzzle: a pale patch over the nose and the mouth
  const n = P(LM.naso);
  const bocca = mid(P, 'labbroSup', 'labbroInf');
  ctx.save();
  ctx.translate((n[0] + bocca[0]) / 2, (n[1] + bocca[1]) / 2);
  ctx.rotate(angolo);
  ellisse(ctx, 0, 0, lv * 0.20, av * 0.13, 'rgba(255, 249, 240, 0.92)');
  ellisse(ctx, 0, -av * 0.05, lv * 0.05, av * 0.035, '#2a1a12');
  ctx.restore();

  // whiskers: three on each side
  ctx.strokeStyle = 'rgba(40, 26, 18, 0.55)';
  ctx.lineWidth = Math.max(1, lv * 0.008);
  for (const lato of [-1, 1]) {
    const s = fc.latoSchermo(lato);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(n[0] + s * lv * 0.06, n[1] + av * 0.02);
      ctx.lineTo(
        n[0] + s * lv * (0.32 + i * 0.03),
        n[1] + av * (0.04 + (i - 1) * 0.05)
      );
      ctx.stroke();
    }
  }
  return true;
}

/* --- 🐼 panda: round ears + eye patches + a nose --- */
function disegnaPanda(ctx, fc) {
  const { P, occhioSx, occhioDx, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // ears: round black discs above the cheeks
  for (const lato of [-1, 1]) {
    const g = P(lato < 0 ? LM.guanciaSx : LM.guanciaDx);
    const s = fc.latoSchermo(lato);
    ellisse(ctx, g[0] + s * lv * 0.15, g[1] - av * 0.52, lv * 0.115, av * 0.11, '#15151a');
  }

  // eye patches: dark ovals that follow the tilt of the face
  for (const occhio of [occhioSx, occhioDx]) {
    ctx.save();
    ctx.translate(occhio[0], occhio[1]);
    ctx.rotate(angolo);
    ellisse(ctx, 0, 0, lv * 0.115, av * 0.085, '#15151a');
    ctx.restore();
  }

  // the nose, and a small smile under it
  const n = P(LM.naso);
  ellisse(ctx, n[0], n[1] + av * 0.01, lv * 0.07, av * 0.048, '#15151a');
  ctx.beginPath();
  ctx.arc(n[0], n[1] + av * 0.06, lv * 0.055, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = '#15151a';
  ctx.lineWidth = Math.max(1.5, lv * 0.012);
  ctx.stroke();
  return true;
}

/* --- 🧛 vampire: a widow's peak + fangs + a high collar --- */
function disegnaVampiro(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // the widow's peak: a dark point at the hairline
  const f = P(LM.fronte);
  ctx.save();
  ctx.translate(f[0], f[1] + av * 0.04);
  ctx.rotate(angolo);
  ctx.beginPath();
  ctx.moveTo(-lv * 0.17, -av * 0.10);
  ctx.lineTo(0, av * 0.10);
  ctx.lineTo(lv * 0.17, -av * 0.10);
  ctx.closePath();
  ctx.fillStyle = '#17141c';
  ctx.fill();
  ctx.restore();

  // the fangs: two white triangles under the lower lip
  const bocca = mid(P, 'labbroSup', 'labbroInf');
  const larg = lv * 0.05;
  const alt = av * 0.075;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(bocca[0] + s * larg * 1.5, bocca[1] + av * 0.012);
    ctx.lineTo(bocca[0] + s * larg * 0.4, bocca[1] + av * 0.012);
    ctx.lineTo(bocca[0] + s * larg * 0.95, bocca[1] + alt);
    ctx.closePath();
    ctx.fillStyle = '#f7f5ef';
    ctx.fill();
  }

  // the collar: two dark peaks rising at the sides of the neck
  const mento = P(LM.mento);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(mento[0] + s * lv * 0.05, mento[1] + av * 0.12);
    ctx.lineTo(mento[0] + s * lv * 0.44, mento[1] + av * 0.10);
    ctx.lineTo(mento[0] + s * lv * 0.19, mento[1] - av * 0.17);
    ctx.closePath();
    ctx.fillStyle = '#221a2c';
    ctx.fill();
  }
  return true;
}

/* --- 🧙 wizard: a starred hat + a beard --- */
function disegnaMago(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // the hat: a cone above the forehead, with a brim and a band
  const f = P(LM.fronte);
  const alt = av * 0.62;
  const larg = lv * 0.30;
  ctx.save();
  ctx.translate(f[0], f[1] - av * 0.02);
  ctx.rotate(angolo * 0.5 - 0.08);
  ellisse(ctx, 0, 0, larg, alt * 0.16, '#2b2340');
  ctx.beginPath();
  ctx.moveTo(-larg * 0.82, 0);
  ctx.lineTo(0, -alt);
  ctx.lineTo(larg * 0.82, 0);
  ctx.closePath();
  ctx.fillStyle = '#3b2f57';
  ctx.fill();
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(-larg * 0.7, -alt * 0.24, larg * 1.4, alt * 0.10);
  ctx.fillStyle = '#ffe9a8';
  for (const [sx, sy, r] of [[-0.05, -0.56, 0.06], [0.30, -0.34, 0.045]]) {
    scintilla(ctx, larg * sx, alt * sy, larg * r);
  }
  ctx.restore();

  // the beard: a pale shape hanging from the mouth to the chin
  const bocca = mid(P, 'labbroSup', 'labbroInf');
  const mento = P(LM.mento);
  ctx.beginPath();
  ctx.moveTo(bocca[0] - lv * 0.16, bocca[1] - av * 0.01);
  ctx.quadraticCurveTo(bocca[0], mento[1] + av * 0.17, bocca[0] + lv * 0.16, bocca[1] - av * 0.01);
  ctx.quadraticCurveTo(bocca[0], bocca[1] + av * 0.09, bocca[0] - lv * 0.16, bocca[1] - av * 0.01);
  ctx.closePath();
  ctx.fillStyle = '#e8e4dc';
  ctx.fill();
  return true;
}

/* --- 🐝 bee: antennae + striped cheeks + a proboscis --- */
function disegnaApe(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // the antennae: two curved lines with a ball at the tip
  const f = P(LM.fronte);
  for (const s of [-1, 1]) {
    const bx = f[0] + s * lv * 0.07;
    const by = f[1] + av * 0.02;
    const tx = bx + s * lv * 0.15;
    const ty = by - av * 0.17;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + s * lv * 0.04, by - av * 0.13, tx, ty);
    ctx.strokeStyle = '#2a2018';
    ctx.lineWidth = Math.max(1.5, lv * 0.012);
    ctx.stroke();
    ellisse(ctx, tx, ty, lv * 0.026, av * 0.02, '#2a2018');
  }

  // the cheeks: yellow with two dark bands
  for (const lato of [-1, 1]) {
    const g = P(lato < 0 ? LM.guanciaSx : LM.guanciaDx);
    const s = fc.latoSchermo(lato);
    ctx.save();
    ctx.translate(g[0] + s * lv * 0.07, g[1] + av * 0.02);
    ctx.rotate(angolo);
    ellisse(ctx, 0, 0, lv * 0.10, av * 0.075, '#f2c53d');
    ctx.fillStyle = '#2a2018';
    for (let i = 0; i < 2; i++) {
      ctx.fillRect(-lv * 0.10, -av * 0.028 + i * av * 0.034, lv * 0.20, av * 0.015);
    }
    ctx.restore();
  }

  // the proboscis
  const n = P(LM.naso);
  ellisse(ctx, n[0], n[1] + av * 0.03, lv * 0.05, av * 0.035, '#2a2018');
  return true;
}

/* --- 🎩 top hat and monocle --- */
function disegnaCilindro(ctx, fc) {
  const { P, occhioSx, occhioDx, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;

  // the hat: a cylinder above the forehead, with a brim and a band
  const f = P(LM.fronte);
  const alt = av * 0.40;
  const larg = lv * 0.20;
  ctx.save();
  ctx.translate(f[0], f[1] + av * 0.02);
  ctx.rotate(angolo * 0.4);
  ellisse(ctx, 0, 0, larg * 1.5, alt * 0.16, '#141419');
  ctx.fillStyle = '#1d1d24';
  ctx.fillRect(-larg, -alt, larg * 2, alt);
  ctx.fillStyle = '#8a2233';
  ctx.fillRect(-larg, -alt * 0.24, larg * 2, alt * 0.12);
  ctx.restore();

  // the monocle: a ring on one eye, with a chain
  const occhio = fc.specchio ? occhioDx : occhioSx;
  ctx.save();
  ctx.translate(occhio[0], occhio[1]);
  ctx.rotate(angolo);
  ctx.beginPath();
  ctx.arc(0, 0, lv * 0.115, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(210, 235, 255, 0.16)';
  ctx.fill();
  ctx.strokeStyle = '#d9b24a';
  ctx.lineWidth = Math.max(2, lv * 0.016);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(occhio[0] + lv * 0.11, occhio[1] + av * 0.03);
  ctx.quadraticCurveTo(
    occhio[0] + lv * 0.17, occhio[1] + av * 0.14,
    occhio[0] + lv * 0.05, occhio[1] + av * 0.19
  );
  ctx.strokeStyle = 'rgba(217, 178, 74, 0.85)';
  ctx.lineWidth = Math.max(1.2, lv * 0.009);
  ctx.stroke();

  // the moustache
  const n = P(LM.naso);
  ctx.save();
  ctx.translate(n[0], n[1] + av * 0.055);
  ctx.rotate(angolo);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * lv * 0.10, -av * 0.035, s * lv * 0.16, av * 0.012);
    ctx.quadraticCurveTo(s * lv * 0.08, av * 0.022, 0, 0);
    ctx.closePath();
    ctx.fillStyle = '#3a2a1e';
    ctx.fill();
  }
  ctx.restore();
  return true;
}

/* --- 🧔 wig: a big hair shape above the forehead --- */
function disegnaParrucca(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const f = P(LM.fronte);
  ctx.save();
  ctx.translate(f[0], f[1] + av * 0.04);
  ctx.rotate(angolo * 0.4);
  ctx.fillStyle = '#2a1d16';
  ctx.beginPath();
  ctx.ellipse(0, -av * 0.30, lv * 0.40, av * 0.26, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * lv * 0.33, -av * 0.06, lv * 0.10, av * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // a few strands catching the light
  ctx.strokeStyle = 'rgba(255, 220, 170, 0.32)';
  ctx.lineWidth = Math.max(1.5, lv * 0.012);
  for (let i = 0; i < 5; i++) {
    const a0 = Math.PI + (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, -av * 0.18);
    ctx.quadraticCurveTo(Math.cos(a0) * lv * 0.3, -av * 0.38, Math.cos(a0) * lv * 0.38, -av * 0.26);
    ctx.stroke();
  }
  ctx.restore();
  return true;
}

/* --- 🥸 moustache: a handlebar under the nose --- */
function disegnaBaffi(ctx, fc) {
  const { P, larghezzaVolto: lv, altezzaVolto: av, angolo } = fc;
  const n = P(LM.naso);
  ctx.save();
  ctx.translate(n[0], n[1] + av * 0.075);
  ctx.rotate(angolo);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * lv * 0.10, -av * 0.055, s * lv * 0.22, -av * 0.035, s * lv * 0.24, av * 0.005);
    ctx.bezierCurveTo(s * lv * 0.16, av * 0.020, s * lv * 0.06, av * 0.018, 0, 0);
    ctx.closePath();
    ctx.fillStyle = '#3a2418';
    ctx.fill();
  }
  ctx.restore();
  return true;
}

/* --- 🏴 eyepatch: a patch over one eye, and its strap --- */
function disegnaBenda(ctx, fc) {
  const { P, occhioSx, occhioDx, larghezzaVolto: lv, altezzaVolto: av, angolo, specchio } = fc;
  const occhio = specchio ? occhioDx : occhioSx;
  ctx.save();
  ctx.translate(occhio[0], occhio[1]);
  ctx.rotate(angolo);
  ctx.strokeStyle = 'rgba(20, 16, 12, 0.85)';
  ctx.lineWidth = Math.max(2, lv * 0.03);
  ctx.beginPath();
  ctx.moveTo(-lv * 0.42, -av * 0.04);
  ctx.lineTo(lv * 0.42, -av * 0.10);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, lv * 0.13, av * 0.10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#14100c';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = Math.max(1, lv * 0.008);
  ctx.stroke();
  ctx.restore();
  return true;
}

/* --- 🫧 bubbles: they rise from the mouth --- */
function disegnaBolle(ctx, fc, t) {
  const { P, larghezzaVolto: lv, altezzaVolto: av } = fc;
  const b = mid(P, 'labbroSup', 'labbroInf');
  for (let i = 0; i < 7; i++) {
    const fase = (t * 0.5 + i * 0.37) % 1;
    const r = lv * (0.03 + fase * 0.05);
    const x = b[0] + Math.sin(i * 2.1 + t * 1.3) * lv * 0.12;
    const y = b[1] - fase * av * 0.75;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(210, 240, 255, 0.26)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
  }
  return true;
}

/* ---------- shared drawing helpers ---------- */

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
 * FRAMES (vignette, grain) — drawn on top, in the preview and in the photo
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
    ctx.translate((t * 37) % 128, (t * 53) % 128); // "live" grain
    ctx.fillStyle = patternGrana.pattern;
    ctx.fillRect(-128, -128, W + 256, H + 256);
    ctx.restore();
  } else if (filtro.cornice === 'vhs') {
  // scanlines that scroll
    const passo = Math.max(3, Math.round(H / 280));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    for (let y = (t * 30) % (passo * 2); y < H; y += passo * 2) {
      ctx.fillRect(0, y, W, Math.max(1, passo * 0.5));
    }
  // random horizontal tears
    for (let i = 0; i < 2; i++) {
      const y = Math.random() * H;
      const hh = 2 + Math.random() * H * 0.012;
      ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.05})`;
      ctx.fillRect(0, y, W, hh);
    }
  // chromatic fringe at the edges
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
  // a soft halo in the centre
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(255,245,225,0.16)');
    g.addColorStop(0.55, 'rgba(255,245,225,0.05)');
    g.addColorStop(1, 'rgba(255,245,225,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (bloom) {
  // a real bloom (at the shot only: the canvas already holds the photo):
  // a downscaled copy put back with the 'lighter' blend
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
  } else if (filtro.cornice === 'fulgore') {
    // a warm flare that sweeps the corner, like a light leak on the film
    const fase = (t * 0.14) % 1;
    const cx = W * (0.08 + fase * 0.9);
    const cy = H * 0.16;
    const raggio = Math.max(W, H) * 0.6;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, raggio);
    g.addColorStop(0, 'rgba(255, 198, 126, 0.40)');
    g.addColorStop(0.35, 'rgba(255, 122, 92, 0.17)');
    g.addColorStop(1, 'rgba(255, 70, 130, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (filtro.cornice === 'pola') {
    // an instant film frame: a white border with a date back
    const b = Math.round(Math.min(W, H) * 0.052);
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, W, b);
    ctx.fillRect(0, H - b, W, b);
    ctx.fillRect(0, 0, b, H);
    ctx.fillRect(W - b, 0, b, H);
    // the date back: the classic orange, with the date in a mono face
    const d = new Date();
    const testo = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    const alt = Math.max(13, Math.round(Math.min(W, H) * 0.045));
    ctx.save();
    ctx.translate(W - b - alt * 0.6, H - b - alt * 1.1);
    ctx.rotate(-0.06);
    ctx.fillStyle = '#ff7a1a';
    ctx.font = `700 ${alt}px "Courier New", ui-monospace, monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillText(testo, 0, 0);
    ctx.restore();
  } else if (filtro.cornice === 'letterbox') {
    // 2.39:1 bars, a frame counter and a touch of grain
    const bar = Math.round(H * 0.115);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
    const n = Math.floor(t * 24) % 10000;
    const alt = Math.max(11, Math.round(Math.min(W, H) * 0.032));
    ctx.font = `700 ${alt}px "Courier New", ui-monospace, monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255, 236, 120, 0.9)';
    ctx.fillText(String(n).padStart(4, '0'), W - bar * 0.6, H - bar * 0.35);
    ctx.textAlign = 'left';
  } else if (filtro.cornice === 'gelo') {
    // frost creeping in from the edges: overlapping translucent facets
    const larg = Math.max(W, H) * 0.24;
    ctx.save();
    ctx.fillStyle = 'rgba(226, 244, 255, 0.30)';
    for (let i = 0; i < 9; i++) {
      const lato = i % 2 ? 0 : 1;
      const y = (i / 9) * H + ((t * 12) % (H / 9));
      const punto = lato ? W : 0;
      ctx.beginPath();
      ctx.moveTo(punto, y);
      ctx.lineTo(punto + (lato ? -larg : larg) * (0.6 + (i % 3) * 0.25), y + H * 0.05);
      ctx.lineTo(punto + (lato ? -larg : larg) * (0.4 + (i % 2) * 0.3), y + H * 0.13);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // a cold vignette over the whole frame
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(180, 225, 255, 0)');
    g.addColorStop(1, 'rgba(150, 205, 255, 0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (filtro.cornice === 'glitch') {
    // horizontal tear bands, each with a colour of its own
    for (let i = 0; i < 5; i++) {
      const y = ((t * 110 + i * 317) % (H + 240)) - 120;
      const h = Math.max(6, H * 0.010 * (1 + (i % 3)));
      const off = ((i * 53) % 44) - 22;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = i % 2 ? 'rgba(255, 0, 96, 0.22)' : 'rgba(0, 220, 255, 0.22)';
      ctx.fillRect(off, y, W, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    // a couple of hard tears with a bright edge
    for (let i = 0; i < 2; i++) {
      const y = ((t * 70 + i * 211) % (H + 160)) - 80;
      const h = Math.max(2, H * 0.004);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(0, y, W, h);
    }
  } else if (filtro.cornice === 'prisma') {
    // a prism: the edges split into a spectrum
    const raggi = Math.max(W, H) * 0.78;
    const spalle = 7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < spalle; i++) {
      const a0 = (i / spalle) * Math.PI * 2 + t * 0.15;
      const a1 = a0 + (Math.PI * 2) / spalle * 0.72;
      const hue = (i / spalle) * 360;
      ctx.beginPath();
      ctx.moveTo(W / 2, H / 2);
      ctx.arc(W / 2, H / 2, raggi, a0, a1);
      ctx.closePath();
      ctx.fillStyle = `hsla(${hue}, 85%, 60%, 0.055)`;
      ctx.fill();
    }
    ctx.restore();
  } else if (filtro.cornice === 'biglietto') {
    // a ticket stub across the bottom, with a barcode
    const h = Math.max(46, H * 0.09);
    const y = H - h;
    ctx.fillStyle = 'rgba(250, 246, 236, 0.94)';
    ctx.fillRect(0, y, W, h);
    // the perforation
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    const passo = Math.max(7, h * 0.16);
    for (let x = W * 0.52; x < W; x += passo) {
      ctx.beginPath();
      ctx.arc(x, y + h * 0.22, passo * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    // the barcode
    ctx.fillStyle = '#20160a';
    let x = W * 0.56;
    while (x < W - 14) {
      const w = 1 + ((x * 7919) % 3);
      ctx.fillRect(x, y + h * 0.45, w, h * 0.42);
      x += w + 2 + ((x * 104729) % 3);
    }
    // the text
    ctx.fillStyle = '#20160a';
    ctx.font = `700 ${Math.max(9, h * 0.22)}px "Courier New", ui-monospace, monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillText('SNAP PWA · 1 OF 1', 14, y + h * 0.5);
  } else if (filtro.cornice === 'angoli') {
    // the four corners that hold a print down
    const c = Math.min(W, H) * 0.13;
    const spessore = Math.max(8, c * 0.22);
    ctx.fillStyle = 'rgba(248, 244, 234, 0.92)';
    for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const x = sx ? W - c : 0;
      const y = sy ? H - c : 0;
      ctx.beginPath();
      ctx.moveTo(x + (sx ? -c : c), y);
      ctx.lineTo(x + (sx ? 0 : c * 1.6), y);
      ctx.lineTo(x, y + (sy ? -c : c * 1.6));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, spessore * 0.25);
  } else if (filtro.cornice === 'perforazioni') {
    // the film strip: sprocket holes down both sides
    const largh = Math.max(22, W * 0.045);
    const passo = Math.max(26, H * 0.075);
    ctx.fillStyle = 'rgba(12, 12, 16, 0.85)';
    ctx.fillRect(0, 0, largh, H);
    ctx.fillRect(W - largh, 0, largh, H);
    ctx.fillStyle = 'rgba(245, 240, 225, 0.85)';
    for (let y = passo * 0.25; y < H; y += passo) {
      ctx.fillRect(largh * 0.24, y, largh * 0.52, passo * 0.34);
      ctx.fillRect(W - largh * 0.76, y, largh * 0.52, passo * 0.34);
    }
  } else if (filtro.cornice === 'polvere') {
    // dust and the scratches an old print carries
    ctx.strokeStyle = 'rgba(255, 250, 235, 0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = ((i * 137.5 + t * 3) % 100) / 100 * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (i % 3 - 1) * 6, H);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 250, 235, 0.35)';
    for (let i = 0; i < 26; i++) {
      const x = ((i * 61.8) % 100) / 100 * W;
      const y = ((i * 43.1 + t * 5) % 100) / 100 * H;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (filtro.cornice === 'alone') {
    // a rim of light down the edges
    const spessore = Math.max(14, Math.min(W, H) * 0.05);
    const g1 = ctx.createLinearGradient(0, 0, spessore, 0);
    g1.addColorStop(0, 'rgba(120, 220, 255, 0.34)');
    g1.addColorStop(1, 'rgba(120, 220, 255, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, spessore, H);
    const g2 = ctx.createLinearGradient(W, 0, W - spessore, 0);
    g2.addColorStop(0, 'rgba(255, 140, 220, 0.34)');
    g2.addColorStop(1, 'rgba(255, 140, 220, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(W - spessore, 0, spessore, H);
    const g3 = ctx.createLinearGradient(0, 0, 0, spessore);
    g3.addColorStop(0, 'rgba(180, 150, 255, 0.28)');
    g3.addColorStop(1, 'rgba(180, 150, 255, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, W, spessore);
  }
}

/* ============================================================
 * PIXEL FILTERS (for the shot, independent of ctx.filter)
 * ============================================================ */

/** The standard hue-rotate matrix (as in CSS, in radians). */
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
    l = (l - 128) * 1.4 + 110; // more contrast, dense shadows
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
  // Cold: desaturates towards luminance and lifts the blue. With
  // hue-rotate(-18) the skin (hue ~19°) ended up at ~354°, that is REDDER:
  // the effect was warm.
  freddo(d) {
    const l = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    return [l * 0.86 - 6, l * 0.95 + 4, l * 1.02 + 26].map((v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v)));
  },
  caldo(d)  { return applicaMatrice(d, matriceHue(-12 * Math.PI / 180), [14, 4, -10]); },
  negativo(d) { return [255 - d[0], 255 - d[1], 255 - d[2]]; },
  neon(d) {
    // a split tone: magenta in the shadows, cyan in the highlights
    const l = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
    const s = 1 - l;
    return [
      clamp255(d[0] * (0.55 + 0.90 * l) + 95 * s),
      clamp255(d[1] * (0.45 + 0.95 * l) + 6 * s),
      clamp255(d[2] * (0.70 + 0.80 * l) + 110 * s),
    ];
  },
  cianotipo(d) {
    // a blue print: contrast first, then a cold tint
    const l = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    const v = clamp255((l - 128) * 1.25 + 128);
    return [
      clamp255(v * 0.20 + 10),
      clamp255(v * 0.50 + 28),
      clamp255(v * 0.95 + 58),
    ];
  },
  solarizzato(d) {
    // blue shadows, warm highlights: the look of a cross-processed slide
    const l = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
    const ombra = Math.max(0, 1 - l * 2);
    const luce = Math.max(0, l * 1.6 - 0.6);
    return [
      clamp255(d[0] * (1 - 0.35 * ombra) + 255 * luce * 0.30),
      clamp255(d[1] * (1 - 0.10 * ombra) + 255 * luce * 0.20),
      clamp255(d[2] * (1 + 0.45 * ombra) + 255 * luce * 0.02),
    ];
  },
  infrarosso(d) {
    // the green of an infrared film
    const l = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    return [clamp255(l * 0.25), clamp255(l * 0.95), clamp255(l * 0.35)];
  },
  ambrato(d) {
    // an amber terminal
    const l = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    return [clamp255(l * 1.05 + 25), clamp255(l * 0.72 + 6), clamp255(l * 0.15)];
  },
  crosprocess(d) {
    // teal shadows, magenta highlights
    const l = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
    const s = 1 - l;
    return [
      clamp255(d[0] * (0.85 + 0.40 * l) + 70 * s),
      clamp255(d[1] * (0.90 + 0.15 * l) + 25 * s),
      clamp255(d[2] * (0.75 + 0.65 * l) + 40 * s),
    ];
  },
  duotone(d) {
    const t = clamp01((0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255);
  // deep violet → bright pink
    return [18 + 218 * t, 7 + 99 * t, 58 + 158 * t];
  },
  termica(d) { return rampaTermica(luma01(d)); },
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
 * Applies the pixel filter to the whole canvas (used at the shot only: a
 * single frame, so the slowness does not matter).
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

const luma01 = (d) => clamp01((0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255);

// The thermal ramp shared by the preview and the photo: black → violet →
// red → orange → almost white. The previous CSS preview mapped everything
// to hot red with black shadows, the opposite of what the saved photo
// showed.
// red → orange → almost white. The previous CSS preview mapped everything
// to hot red with black shadows, the opposite of what the saved photo
// showed.
const RAMPA_TERMICA = [
  [0.00, [5, 0, 30]],
  [0.25, [80, 0, 160]],
  [0.50, [235, 45, 32]],
  [0.75, [255, 180, 0]],
  [1.00, [255, 250, 210]],
];
function rampaTermica(t) {
  for (let i = 1; i < RAMPA_TERMICA.length; i++) {
    if (t <= RAMPA_TERMICA[i][0]) {
      const [t0, c0] = RAMPA_TERMICA[i - 1];
      const [t1, c1] = RAMPA_TERMICA[i];
      const k = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return RAMPA_TERMICA[RAMPA_TERMICA.length - 1][1];
}

/**
 * Thermal for the video: the ramp depends on luminance alone and is low
 * frequency, so it is computed on a reduced copy (1/6) and scaled back up.
 * ~36x cheaper than per-pixel at full resolution, and visually identical
 * because the ramp has no hard edges.
 */
export function applicaTermicaVivo(ctx, W, H) {
  const f = 6;
  const w = Math.max(1, Math.ceil(W / f)), h = Math.max(1, Math.ceil(H / f));
  const piccolo = document.createElement('canvas');
  piccolo.width = w; piccolo.height = h;
  const pc = piccolo.getContext('2d');
  pc.drawImage(ctx.canvas, 0, 0, w, h);
  const img = pc.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = rampaTermica(luma01([d[i], d[i + 1], d[i + 2]]));
    d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b);
  }
  pc.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(piccolo, 0, 0, W, H);
  ctx.restore();
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
