/**
 * ===== Territorio PWA — simulazione =====
 *
 * Arena paper.io-style su griglia: lasci una scia fuori dal tuo territorio,
 * chiudi un anello e conquisti tutto ciò che racchiude; attraversare una scia
 * uccide chi l'ha lasciata; nella tua terra sei invincibile.
 *
 * Multiplayer-ready: ogni giocatore (umano o bot) espone solo `input.dir`.
 * In fase 2 i remote player arriveranno via Supabase Realtime esattamente
 * con la stessa interfaccia dei bot, con host-authoritative + snapshot.
 */

export const LATO = 80; // celle per lato
export const CELLE = LATO * LATO;

const DX = [1, 0, -1, 0]; // 0=destra, 1=giù, 2=sinistra, 3=su
const DY = [0, 1, 0, -1];
const opposta = (d) => (d + 2) & 3;

const VELOCITA = 7; // celle al secondo (uguale per tutti: fair)
const RESPAWN_S = 2.5;
const SPAWN_DIST_MIN = 14;

export const COLORI = ['#22d3ee', '#f87171', '#fbbf24', '#4ade80', '#c084fc'];
const NOMI_BOT = ['Gallo', 'Rizzo', 'Falco', 'Nero', 'Brizio'];

/* ---------- creazione partita ---------- */

export function creaPartita({ bot = 4 } = {}) {
  const st = {
    t: 0,
    proprietario: new Uint8Array(CELLE), // 0 = libero, i+1 = giocatore i
    sciaDi: new Int16Array(CELLE).fill(-1), // -1 = nessuna scia
    giocatori: [],
    eventi: [], // {tipo, ...} consumati dall'UI
    lampi: [], // celle appena catturate (flash visivo)
    tappe: { 25: false, 40: false, 50: false },
  };

  const basi = [
    [14, 14], [64, 14], [14, 64], [64, 64], [40, 40],
  ];

  st.giocatori.push(creaGiocatore(st, 0, 'TU', COLORI[0], false, basi[0]));
  for (let i = 1; i <= bot; i++) {
    const g = creaGiocatore(st, i, NOMI_BOT[i - 1] ?? 'Bot ' + i, COLORI[i % COLORI.length], true, basi[i] ?? [40 + (i * 7) % 20, 40]);
    g.ai = {
      modo: 'esplora',
      timer: 0,
      preferenza: (Math.random() * 4) | 0,
      maxScia: 9 + ((i * 5) % 9),
      aggressivita: 0.3 + Math.random() * 0.45,
      bersaglio: -1,
    };
    st.giocatori.push(g);
  }
  return st;
}

function creaGiocatore(st, idx, nome, colore, bot, [sx, sy]) {
  const p = {
    idx, nome, colore, bot,
    viva: true,
    px: sx + 0.5, py: sy + 0.5,
    dir: (Math.random() * 4) | 0,
    input: { dir: null }, // ← interfaccia unica umano/bot/rete
    scia: [],
    celle: 0,
    rinascitaTra: 0,
    ultimaCX: sx, ultimaCY: sy,
    stats: { uccisioni: 0, maxPct: 0 },
  };
  // blocco iniziale 5×5
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = sx + dx, y = sy + dy;
      if (x >= 0 && y >= 0 && x < LATO && y < LATO) rivendica(st, p, y * LATO + x);
    }
  }
  return p;
}

/** Assegna una cella a p, sottraendola a chi la possedeva. */
function rivendica(st, p, i) {
  const prec = st.proprietario[i];
  if (prec === p.idx + 1) return false;
  if (prec) st.giocatori[prec - 1].celle--;
  st.proprietario[i] = p.idx + 1;
  p.celle++;
  return true;
}

export const pctDi = (p) => (p.celle * 100) / CELLE;

/* ---------- passo di simulazione (dt fisso 1/60) ---------- */

export function passo(st, dt) {
  st.t += dt;

  for (const p of st.giocatori) if (p.viva && p.bot) pensaBot(st, p, dt);
  for (const p of st.giocatori) if (p.viva) muovi(st, p, dt);
  controllaUccisioni(st);

  for (const p of st.giocatori) {
    if (p.viva) {
      const pct = pctDi(p);
      if (pct > p.stats.maxPct) p.stats.maxPct = pct;
    } else {
      p.rinascitaTra -= dt;
      if (p.rinascitaTra <= 0) rinasci(st, p);
    }
  }

  if (st.lampi.length) st.lampi = st.lampi.filter((l) => st.t - l.t0 < 0.35);
}

/* ---------- movimento ---------- */

function muovi(st, p, dt) {
  p.px += DX[p.dir] * VELOCITA * dt;
  p.py += DY[p.dir] * VELOCITA * dt;

  // bordi arena: blocco e svolta verso l'interno
  if (p.px < 0.5) { p.px = 0.5; p.dir = p.py < LATO / 2 ? 1 : 3; }
  else if (p.px > LATO - 0.5) { p.px = LATO - 0.5; p.dir = p.py < LATO / 2 ? 1 : 3; }
  if (p.py < 0.5) { p.py = 0.5; p.dir = p.px < LATO / 2 ? 0 : 2; }
  else if (p.py > LATO - 0.5) { p.py = LATO - 0.5; p.dir = p.px < LATO / 2 ? 0 : 2; }

  const nx = Math.floor(p.px), ny = Math.floor(p.py);
  if (nx !== p.ultimaCX || ny !== p.ultimaCY) {
    // svolta al confine di cella (niente inversioni a U)
    const voluto = p.input.dir;
    if (voluto != null && voluto !== p.dir && voluto !== opposta(p.dir)) p.dir = voluto;
    entraCella(st, p, nx, ny);
  }
}

function entraCella(st, p, x, y) {
  p.ultimaCX = x; p.ultimaCY = y;
  const i = y * LATO + x;
  if (st.proprietario[i] === p.idx + 1) {
    if (p.scia.length) chiudiCattura(st, p); // rientro a casa → anello chiuso
  } else if (st.sciaDi[i] === p.idx) {
    uccidi(st, p.idx, p.idx);                // attraversata la propria scia 💀
  } else {
    // la cella porta la scia di un altro? Tagliata: quel qualcuno muore
    const so = st.sciaDi[i];
    if (so >= 0) uccidi(st, so, p.idx);
    st.sciaDi[i] = p.idx;
    p.scia.push(i);
  }
}

/* ---------- cattura ad anello ---------- */

function chiudiCattura(st, p) {
  const id = p.idx + 1;
  const esterno = new Uint8Array(CELLE);
  const coda = [];
  const barriera = (i) => st.proprietario[i] === id || st.sciaDi[i] === p.idx;

  // BFS dall'esterno: tutto ciò che non si raggiunge dal bordo è racchiuso
  const semi = (x, y) => {
    const i = y * LATO + x;
    if (!esterno[i] && !barriera(i)) { esterno[i] = 1; coda.push(i); }
  };
  for (let x = 0; x < LATO; x++) { semi(x, 0); semi(x, LATO - 1); }
  for (let y = 0; y < LATO; y++) { semi(0, y); semi(LATO - 1, y); }
  while (coda.length) {
    const i = coda.pop();
    const x = i % LATO, y = (i / LATO) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= LATO || ny >= LATO) continue;
      const j = ny * LATO + nx;
      if (!esterno[j] && !barriera(j)) { esterno[j] = 1; coda.push(j); }
    }
  }

  const nuove = [];
  for (let i = 0; i < CELLE; i++) {
    if (!esterno[i] && st.proprietario[i] !== id) {
      rivendica(st, p, i);
      nuove.push(i);
    }
  }
  // anche la scia diventa territorio
  for (const i of p.scia) {
    st.sciaDi[i] = -1;
    if (st.proprietario[i] !== id) { rivendica(st, p, i); nuove.push(i); }
  }
  p.scia.length = 0;

  if (nuove.length) {
    st.eventi.push({ tipo: 'cattura', chi: p.idx, n: nuove.length });
    for (const i of nuove) st.lampi.push({ i, t0: st.t });
  }
}

/* ---------- uccisioni ---------- */

function controllaUccisioni(st) {
  const sentenza = new Map(); // vittima → killer

  for (const p of st.giocatori) {
    if (!p.viva) continue;
    const i = Math.floor(p.py) * LATO + Math.floor(p.px);
    const so = st.sciaDi[i];
    // la mia scia sotto la testa è normale (la sto scrivendo): contano solo
    // le scie altrui — il re-ingresso nella propria è gestito in entraCella
    if (so >= 0 && so !== p.idx) sentenza.set(so, p.idx);
  }

  // testa contro testa nella stessa cella
  for (let a = 0; a < st.giocatori.length; a++) {
    const A = st.giocatori[a];
    if (!A.viva) continue;
    for (let b = a + 1; b < st.giocatori.length; b++) {
      const B = st.giocatori[b];
      if (!B.viva) continue;
      if (Math.floor(A.px) !== Math.floor(B.px) || Math.floor(A.py) !== Math.floor(B.py)) continue;
      const inCasaA = st.proprietario[Math.floor(A.py) * LATO + Math.floor(A.px)] === a + 1;
      const inCasaB = st.proprietario[Math.floor(B.py) * LATO + Math.floor(B.px)] === b + 1;
      if (inCasaA && !inCasaB) sentenza.set(b, a);
      else if (inCasaB && !inCasaA) sentenza.set(a, b);
      else if (!inCasaA && !inCasaB) { sentenza.set(a, b); sentenza.set(b, a); }
    }
  }

  for (const [vittima, killer] of sentenza) uccidi(st, vittima, killer);
}

function uccidi(st, vittima, killer) {
  const v = st.giocatori[vittima];
  if (!v.viva) return;
  v.viva = false;
  v.rinascitaTra = RESPAWN_S;
  for (const i of v.scia) st.sciaDi[i] = -1;
  v.scia.length = 0;
  if (killer !== vittima && st.giocatori[killer]?.viva) st.giocatori[killer].stats.uccisioni++;
  st.eventi.push({ tipo: 'uccisione', killer, vittima });
}

/* ---------- respawn ---------- */

function rinasci(st, p) {
  const [sx, sy] = trovaSpawn(st);
  p.viva = true;
  p.px = sx + 0.5; p.py = sy + 0.5;
  p.dir = (Math.random() * 4) | 0;
  p.ultimaCX = sx; p.ultimaCY = sy;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = sx + dx, y = sy + dy;
      if (x >= 0 && y >= 0 && x < LATO && y < LATO) rivendica(st, p, y * LATO + x);
    }
  }
  st.eventi.push({ tipo: 'respawn', chi: p.idx });
}

function trovaSpawn(st) {
  let migliore = [LATO >> 1, LATO >> 1], migliorDistanza = -1;
  for (let tent = 0; tent < 60; tent++) {
    const x = 4 + ((Math.random() * (LATO - 8)) | 0);
    const y = 4 + ((Math.random() * (LATO - 8)) | 0);
    let distMin = 1e9;
    for (const q of st.giocatori) {
      if (!q.viva) continue;
      distMin = Math.min(distMin, Math.hypot(q.px - x, q.py - y));
    }
    if (distMin > migliorDistanza) { migliorDistanza = distMin; migliore = [x, y]; }
    if (migliorDistanza >= SPAWN_DIST_MIN) break;
  }
  return migliore;
}

/* ---------- AI dei bot (stessa interfaccia del giocatore umano) ---------- */

function pensaBot(st, p, dt) {
  const ai = p.ai;
  ai.timer -= dt;

  const cx = Math.floor(p.px), cy = Math.floor(p.py);
  const fuori = st.proprietario[cy * LATO + cx] !== p.idx + 1;
  const nemici = st.giocatori.filter((q) => q !== p && q.viva);

  // pericolo: un nemico è troppo vicino mentre sono fuori con la scia
  let pericolo = false;
  if (fuori && p.scia.length > 0) {
    for (const q of nemici) {
      if (Math.hypot(q.px - p.px, q.py - p.py) < 4.5) { pericolo = true; break; }
    }
  }
  // opportunità: qualcuno è in scia e vicino → taglialo
  let preda = null;
  if (fuori || p.scia.length === 0) {
    for (const q of nemici) {
      if (q.scia.length > 2 && Math.hypot(q.px - p.px, q.py - p.py) < 5 && Math.random() < ai.aggressivita) {
        preda = q;
        break;
      }
    }
  }

  if (fuori && (pericolo || p.scia.length > ai.maxScia)) ai.modo = 'rientra';
  else if (preda && ai.modo !== 'rientra') ai.modo = 'attacca';
  else if (!fuori) ai.modo = 'esplora';

  if (ai.modo === 'esplora' && ai.timer <= 0) {
    // di solito prosegue, a volte gira; bias verso celle libere
    const gira = Math.random() < 0.45;
    if (gira) ai.preferenza = (p.dir + (Math.random() < 0.5 ? 1 : 3)) & 3;
    ai.timer = 0.7 + Math.random() * 1.3;
  }

  let targetX, targetY;
  if (ai.modo === 'rientra') {
    if (ai.bersaglio < 0 || st.proprietario[ai.bersaglio] !== p.idx + 1) {
      ai.bersaglio = propriacellaVicina(st, p);
    }
    targetX = ai.bersaglio % LATO; targetY = (ai.bersaglio / LATO) | 0;
  } else if (ai.modo === 'attacca' && preda) {
    // punta 2 celle davanti alla testa della preda: lì passerà la sua scia
    targetX = Math.floor(preda.px) + DX[preda.dir] * 2;
    targetY = Math.floor(preda.py) + DY[preda.dir] * 2;
  } else {
    targetX = cx + DX[ai.preferenza] * 6;
    targetY = cy + DY[ai.preferenza] * 6;
  }

  const dir = scegliDirezione(st, p, targetX, targetY);
  if (dir != null) p.input.dir = dir;
}

/** Migliore delle 3 direzioni non-inverse verso il target. */
function scegliDirezione(st, p, tx, ty) {
  const cx = Math.floor(p.px), cy = Math.floor(p.py);
  let migliore = null, punteggioMigliore = -Infinity;
  for (let d = 0; d < 4; d++) {
    if (d === opposta(p.dir)) continue;
    const nx = cx + DX[d], ny = cy + DY[d];
    let s = -(Math.abs(nx - tx) + Math.abs(ny - ty)) * 10;
    if (nx < 0 || ny < 0 || nx >= LATO || ny >= LATO) s -= 1000;
    else {
      const i = ny * LATO + nx;
      if (st.sciaDi[i] === p.idx) s -= 500;         // mai sulla propria scia
      if (st.proprietario[i] === 0) s += 6;         // terra libera ✓
      for (const q of st.giocatori) {
        if (q === p || !q.viva) continue;
        const dTesta = Math.hypot(q.px - (nx + 0.5), q.py - (ny + 0.5));
        if (dTesta < 2.2) s -= 120;                 // niente testa contro testa
      }
    }
    s += Math.random() * 4;
    if (s > punteggioMigliore) { punteggioMigliore = s; migliore = d; }
  }
  return migliore;
}

/** Ricerca a spirale della cella di proprietà più vicina. */
function propriacellaVicina(st, p) {
  const cx = Math.floor(p.px), cy = Math.floor(p.py);
  for (let r = 1; r <= LATO; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= LATO || y >= LATO) continue;
        if (st.proprietario[y * LATO + x] === p.idx + 1) return y * LATO + x;
      }
    }
  }
  return cy * LATO + cx;
}
