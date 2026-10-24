/* ============================================================
   PIANO FALL — landscape Synthesia-style piano
   ------------------------------------------------------------
   · 10 white keys + 7 black keys (C4–E5), multi-touch friendly
   · Tiles fall down lanes synced to the keyboard layout
   · Song mode: hit tiles at the gold line → Perfect / Good /
     Miss judging, combo multiplier, accuracy, per-song bests
   · Freestyle mode: just play — every key rings
   · Missed notes ghost-play softly so the melody keeps flowing
   · Song clock is AudioContext time → pause = AC.suspend()
   ============================================================ */
(() => {
'use strict';

/* ---------------- dom ---------------- */

const $ = (id) => document.getElementById(id);
const cv = $('fall');
const ctx = cv.getContext('2d');
if (!ctx.roundRect) {
    ctx.roundRect = function (x, y, w, h, r) {
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y + h, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
    };
}

const ui = {
    score: $('score'), songName: $('songName'), progressFill: $('progressFill'),
    combo: $('combo'), acc: $('acc'),
    btnPause: $('btnPause'), btnSound: $('btnSound'),
    keys: $('keys'),
    menu: $('menu'), songList: $('songList'), btnFreestyle: $('btnFreestyle'),
    paused: $('paused'), btnResume: $('btnResume'), btnQuit: $('btnQuit'),
    results: $('results'), resTitle: $('resTitle'), resNew: $('resNew'),
    resScore: $('resScore'), resAcc: $('resAcc'), resCombo: $('resCombo'),
    resBest: $('resBest'), btnRetry: $('btnRetry'), btnMenu: $('btnMenu'),
    rotate: $('rotate'),
};

/* ---------------- helpers ---------------- */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ---------------- keyboard layout (shared by keys + lanes) ---------------- */

const WHITE = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76];        // C4 → E5
const BLACK = [                                                // boundary = white-key index it sits at
    { midi: 61, b: 1 }, { midi: 63, b: 2 }, { midi: 66, b: 4 },
    { midi: 68, b: 5 }, { midi: 70, b: 6 }, { midi: 73, b: 8 }, { midi: 75, b: 9 },
];
const KEYMAP = {                                               // computer keyboard
    KeyA: 60, KeyW: 61, KeyS: 62, KeyE: 63, KeyD: 64,
    KeyF: 65, KeyT: 66, KeyG: 67, KeyY: 68, KeyH: 69,
    KeyU: 70, KeyJ: 71, KeyK: 72, KeyO: 73, KeyL: 74, KeyP: 75, Semicolon: 76,
};

function laneX(midi, W) {
    const wi = WHITE.indexOf(midi);
    if (wi >= 0) return (wi + 0.5) * W / 10;
    const bk = BLACK.find((k) => k.midi === midi);
    return bk ? bk.b * W / 10 : W / 2;
}
function laneW(midi, W) {
    return (WHITE.indexOf(midi) >= 0 ? 0.72 : 0.5) * W / 10;
}
function isBlack(midi) { return WHITE.indexOf(midi) < 0; }

/* ---------------- audio (own small synth — piano-ish) ---------------- */

let AC = null, master = null;

function audio() {
    if (!AC) {
        try {
            AC = new (window.AudioContext || window.webkitAudioContext)();
            master = AC.createGain();
            master.gain.value = 0.5;
            master.connect(AC.destination);
        } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended' && S.mode !== 'paused') AC.resume();
    return AC;
}

function tone(midi, vel, when) {
    const ac = audio();
    if (!ac) return;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const t0 = when || ac.currentTime;
    const dur = 1.6;
    const g = ac.createGain();
    g.connect(master);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.02, vel), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const partials = [[1, 1, 'triangle'], [2, 0.35, 'sine'], [3, 0.12, 'sine']];
    for (const [mul, amp, type] of partials) {
        const o = ac.createOscillator();
        o.type = type;
        o.frequency.value = f * mul;
        const og = ac.createGain();
        og.gain.value = amp;
        o.connect(og);
        og.connect(g);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
    }
}

function blip(freq, dur, type, peak) {
    if (!R2.getSettings().sound) return;
    R2.play(freq, dur, type || 'sine');
    void peak;
}

/* ---------------- songs (all inside C4–E5) ---------------- */

function seq(pairs) { return pairs; }
function offset(notes, off) { return notes.map(([m, b]) => [m, b + off]); }

const ELISE_THEME = seq([
    [76, 0], [75, 0.75], [76, 1.5], [75, 2.25], [76, 3], [71, 3.75], [74, 4.5], [72, 5.25],
    [69, 6], [60, 7.5], [64, 8.25], [69, 9], [71, 9.75], [64, 11.25], [68, 12], [71, 12.75], [72, 13.5], [64, 14.25],
    [76, 15], [75, 15.75], [76, 16.5], [75, 17.25], [76, 18], [71, 18.75], [74, 19.5], [72, 20.25],
    [69, 21], [60, 22.5], [64, 23.25], [69, 24], [71, 24.75], [64, 26.25], [72, 27], [71, 27.75], [69, 28.5],
]);

const SONGS = [
    {
        id: 'twinkle', name: 'Twinkle Twinkle Little Star', bpm: 100, diff: 'easy',
        notes: seq([
            [60, 0], [60, 1], [67, 2], [67, 3], [69, 4], [69, 5], [67, 6],
            [65, 8], [65, 9], [64, 10], [64, 11], [62, 12], [62, 13], [60, 14],
            [67, 16], [67, 17], [65, 18], [65, 19], [64, 20], [64, 21], [62, 22],
            [67, 24], [67, 25], [65, 26], [65, 27], [64, 28], [64, 29], [62, 30],
            [60, 32], [60, 33], [67, 34], [67, 35], [69, 36], [69, 37], [67, 38],
            [65, 40], [65, 41], [64, 42], [64, 43], [62, 44], [62, 45], [60, 46],
        ]),
    },
    {
        id: 'mary', name: 'Mary Had a Little Lamb', bpm: 108, diff: 'easy',
        notes: seq([
            [64, 0], [62, 1], [60, 2], [62, 3], [64, 4], [64, 5], [64, 6],
            [62, 8], [62, 9], [62, 10], [64, 12], [67, 13], [67, 14],
            [64, 16], [62, 17], [60, 18], [62, 19], [64, 20], [64, 21], [64, 22], [64, 23],
            [62, 24], [62, 25], [64, 26], [62, 27], [60, 28],
        ]),
    },
    {
        id: 'ode', name: 'Ode to Joy', bpm: 118, diff: 'medium',
        notes: seq([
            [64, 0], [64, 1], [65, 2], [67, 3], [67, 4], [65, 5], [64, 6], [62, 7],
            [60, 8], [60, 9], [62, 10], [64, 11], [64, 12], [62, 13], [62, 14],
            [64, 16], [64, 17], [65, 18], [67, 19], [67, 20], [65, 21], [64, 22], [62, 23],
            [60, 24], [60, 25], [62, 26], [64, 27], [62, 28], [60, 29], [60, 30],
            [64, 32], [64, 33], [65, 34], [67, 35], [67, 36], [65, 37], [64, 38], [62, 39],
            [60, 40], [60, 41], [62, 42], [64, 43], [62, 44], [60, 45], [60, 46],
        ]),
    },
    {
        id: 'jingle', name: 'Jingle Bells', bpm: 116, diff: 'medium',
        notes: seq([
            [64, 0], [64, 1], [64, 2], [64, 4], [64, 5], [64, 6],
            [64, 8], [67, 9], [60, 10], [62, 11], [64, 12],
            [65, 16], [65, 17], [65, 18], [65, 20], [65, 21], [64, 22], [64, 23], [64, 24],
            [62, 25], [62, 26], [64, 27], [62, 28], [67, 30],
            [64, 32], [64, 33], [64, 34], [64, 36], [64, 37], [64, 38],
            [64, 40], [67, 41], [60, 42], [62, 43], [64, 44],
            [65, 48], [65, 49], [65, 50], [65, 52], [65, 53], [64, 54], [64, 55], [64, 56],
            [62, 57], [62, 58], [64, 59], [62, 60], [60, 62],
        ]),
    },
    {
        id: 'elise', name: 'Für Elise (theme)', bpm: 132, diff: 'hard',
        notes: seq([...ELISE_THEME, ...offset(ELISE_THEME, 32)]),
    },
];

/* ---------------- state ---------------- */

const BESTS_KEY = 'piano-fall-bests';
const SUMMARY_KEY = 'piano-fall-pwa';   // {highScore} — single-record shape the hub dashboard reads

const S = {
    mode: 'menu',           // menu | play | paused | results
    freestyle: false,
    song: null,
    notes: [],              // { midi, t, hit, missed }
    lastT: 0,
    songStart: 0,           // AC.currentTime at beat 0
    score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0,
    downKeys: new Set(),
    beatPulse: 0,
};

const BESTS = R2.loadJSON(BESTS_KEY, {}) || {};

const LEAD = 2.6;           // seconds a tile is visible before the line
const WIN_P = 0.085;        // perfect window (s)
const WIN_G = 0.18;         // good window (s)

function songNow() {
    return AC ? AC.currentTime - S.songStart : -LEAD;
}

/* ---------------- view / canvas ---------------- */

const view = { w: 0, h: 0, dpr: 1, hitY: 0, pps: 100, tileH: 44 };

function resize() {
    const rect = cv.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = rect.width;
    view.h = rect.height;
    cv.width = Math.round(view.w * view.dpr);
    cv.height = Math.round(view.h * view.dpr);
    view.hitY = view.h - 18;
    view.pps = (view.h - 30) / LEAD;
    view.tileH = clamp(view.h / 9, 34, 54);
}

/* ---------------- build keyboard ---------------- */

function buildKeys() {
    const frag = document.createDocumentFragment();
    for (const midi of WHITE) {
        const k = document.createElement('div');
        k.className = 'key';
        k.dataset.midi = midi;
        frag.appendChild(k);
    }
    for (const { midi, b } of BLACK) {
        const k = document.createElement('div');
        k.className = 'key black';
        k.dataset.midi = midi;
        k.style.left = 'calc(' + (b * 10) + '% - 2.9%)';
        k.style.width = '5.8%';
        frag.appendChild(k);
    }
    ui.keys.appendChild(frag);
}

function keyEl(midi) {
    return ui.keys.querySelector('[data-midi="' + midi + '"]');
}

/* ---------------- effects ---------------- */

const parts = [], rings = [], pops = [];

function burst(x, y, color, n, spd) {
    for (let i = 0; i < n; i++) {
        parts.push({
            x, y,
            vx: (Math.random() - 0.5) * spd,
            vy: -Math.random() * spd * 0.8 - 30,
            life: 1, decay: 1.8 + Math.random(),
            size: 1.6 + Math.random() * 2.2, color,
        });
    }
    if (parts.length > 200) parts.splice(0, parts.length - 200);
}

function ring(x, y, color) {
    rings.push({ x, y, r: 6, life: 1, color });
}

function pop(x, y, txt, color, size) {
    pops.push({ x: clamp(x, 40, view.w - 40), y, txt, color, size: size || 14, life: 1 });
    if (pops.length > 14) pops.shift();
}

function updateFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 240 * dt;
    }
    for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life -= dt * 2.6;
        r.r += 90 * dt;
        if (r.life <= 0) rings.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].life -= dt * 1.2;
        if (pops[i].life <= 0) pops.splice(i, 1);
    }
}

/* ---------------- gameplay ---------------- */

function startSong(song) {
    const ac = audio();
    if (!ac) return;
    S.freestyle = false;
    S.song = song;
    const spb = 60 / song.bpm;
    S.notes = song.notes
        .map(([m, b]) => ({ midi: m, t: b * spb, hit: false, missed: false }))
        .sort((a, b) => a.t - b.t);
    S.lastT = S.notes[S.notes.length - 1].t;
    S.songStart = ac.currentTime + LEAD + 0.4;
    S.score = 0; S.combo = 0; S.maxCombo = 0; S.hits = 0; S.misses = 0;
    S.mode = 'play';
    hideOverlays();
    ui.songName.textContent = song.name;
    ui.combo.classList.add('hidden');
    syncHud(true);
}

function startFreestyle() {
    audio();
    S.freestyle = true;
    S.song = null;
    S.notes = [];
    S.mode = 'play';
    S.score = 0; S.combo = 0; S.maxCombo = 0; S.hits = 0; S.misses = 0;
    hideOverlays();
    ui.songName.textContent = 'Freestyle — play anything';
    ui.combo.classList.add('hidden');
    syncHud(true);
}

function finishSong() {
    S.mode = 'results';
    const total = S.hits + S.misses;
    const acc = total ? Math.round((S.hits / total) * 100) : 100;
    const prevBest = BESTS[S.song.id] || 0;
    const isBest = S.score > prevBest;
    if (isBest) {
        BESTS[S.song.id] = S.score;
        R2.saveJSON(BESTS_KEY, BESTS);
    }
    const prevSummary = R2.loadJSON(SUMMARY_KEY, {}) || {};
    R2.saveJSON(SUMMARY_KEY, { highScore: Math.max(S.score, prevSummary.highScore || 0) });
    R2.stats.run({
        slug: 'piano-pwa/',
        score: S.score,
        durMs: Math.round((S.lastT + LEAD) * 1000),
        outcome: 'win',
        meta: { song: S.song.id, acc },
    });
    R2.buzz([40, 30, 40]);
    blip(880, 0.15, 'triangle');
    setTimeout(() => blip(1175, 0.2, 'triangle'), 120);
    ui.resTitle.textContent = S.song.name;
    ui.resScore.textContent = S.score;
    ui.resAcc.textContent = acc + '%';
    ui.resCombo.textContent = '×' + (1 + Math.floor(S.maxCombo / 10)) + ' (' + S.maxCombo + ')';
    ui.resBest.textContent = BESTS[S.song.id] || 0;
    ui.resNew.classList.toggle('hidden', !isBest);
    ui.results.classList.remove('hidden');
    buildSongList();
}

function pressKey(midi) {
    if (S.mode !== 'play') return;
    const el = keyEl(midi);
    if (el) el.classList.add('down');
    S.downKeys.add(midi);

    const W = view.w;
    const x = laneX(midi, W);
    const color = isBlack(midi) ? '#c9b8ff' : '#ffe9b0';
    burst(x, view.hitY, color, 7, 110);
    ring(x, view.hitY, color);

    if (S.freestyle || !S.song) {
        tone(midi, 0.42);
        return;
    }

    tone(midi, 0.45);

    // judge against the nearest unhit note on this key
    const now = songNow();
    let best = null, bestDt = 1e9;
    for (const n of S.notes) {
        if (n.hit || n.missed || n.midi !== midi) continue;
        const dt = n.t - now;
        if (Math.abs(dt) < Math.abs(bestDt)) { best = n; bestDt = dt; }
    }
    if (!best || Math.abs(bestDt) > WIN_G) return;

    best.hit = true;
    S.hits++;
    S.combo++;
    if (S.combo > S.maxCombo) S.maxCombo = S.combo;
    const perfect = Math.abs(bestDt) <= WIN_P;
    const mult = Math.min(4, 1 + Math.floor(S.combo / 10));
    S.score += (perfect ? 100 : 60) * mult;
    pop(x, view.hitY - 46, perfect ? 'PERFECT +' + 100 * mult : 'GOOD +' + 60 * mult,
        perfect ? '#ffe08a' : '#b8c4ff', perfect ? 15 : 13);
    if (perfect) { burst(x, view.hitY, '#ffe08a', 9, 150); R2.buzz(10); }
    syncHud();
}

function releaseKey(midi) {
    const el = keyEl(midi);
    if (el) el.classList.remove('down');
    S.downKeys.delete(midi);
}

function updateSong() {
    if (!S.song || !S.notes.length) return;
    const now = songNow();

    // missed notes ghost-play so the melody keeps going
    for (const n of S.notes) {
        if (n.hit || n.missed) continue;
        if (now - n.t > WIN_G) {
            n.missed = true;
            S.misses++;
            S.combo = 0;
            tone(n.midi, 0.07);            // soft ghost note
            pop(laneX(n.midi, view.w), view.hitY - 30, 'MISS', 'rgba(255,255,255,0.45)', 12);
        }
    }

    // end of song
    if (now > S.lastT + 1.6) finishSong();

    syncHud();
}

/* ---------------- HUD ---------------- */

const hudCache = { score: -1, combo: '', acc: '', prog: -1 };

function syncHud(force) {
    if (force || hudCache.score !== S.score) {
        hudCache.score = S.score;
        ui.score.textContent = S.score;
    }
    const mult = Math.min(4, 1 + Math.floor(S.combo / 10));
    const c = S.combo >= 10 ? '×' + mult : '';
    if (c !== hudCache.combo) {
        hudCache.combo = c;
        ui.combo.textContent = c;
        ui.combo.classList.toggle('hidden', !c);
    }
    const total = S.hits + S.misses;
    const acc = total ? Math.round((S.hits / total) * 100) : 100;
    const accTxt = (S.freestyle || !total) ? '—' : acc + '%';
    if (accTxt !== hudCache.acc) { hudCache.acc = accTxt; ui.acc.textContent = accTxt; }
    const prog = (S.song && S.lastT) ? clamp(songNow() / S.lastT, 0, 1) : 0;
    if (force || Math.abs(prog - hudCache.prog) > 0.002) {
        hudCache.prog = prog;
        ui.progressFill.style.width = (prog * 100).toFixed(1) + '%';
    }
}

/* ---------------- rendering ---------------- */

function render() {
    const W = view.w, H = view.h;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    // lane backdrop
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(0, 0, W, H);
    for (const midi of WHITE) {
        ctx.fillStyle = 'rgba(255,255,255,0.022)';
        ctx.fillRect(laneX(midi, W) - laneW(midi, W) / 2, 0, laneW(midi, W), H);
    }
    for (const { midi } of BLACK) {
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.fillRect(laneX(midi, W) - laneW(midi, W) / 2, 0, laneW(midi, W), H);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * W / 10, 0);
        ctx.lineTo(i * W / 10, H);
        ctx.stroke();
    }

    // beat shimmer on the gold line
    let pulse = 0;
    if (S.song && S.mode === 'play') {
        const now = songNow();
        const spb = 60 / S.song.bpm;
        const frac = ((now / spb) % 1 + 1) % 1;
        pulse = Math.max(0, 1 - frac * 3.2);
    }

    // hit line
    const lineY = view.hitY;
    const glowH = 26 + pulse * 16;
    const gl = ctx.createLinearGradient(0, lineY - glowH, 0, lineY);
    gl.addColorStop(0, 'rgba(232,193,90,0)');
    gl.addColorStop(1, 'rgba(232,193,90,' + (0.10 + pulse * 0.14).toFixed(3) + ')');
    ctx.fillStyle = gl;
    ctx.fillRect(0, lineY - glowH, W, glowH);
    ctx.fillStyle = '#e8c15a';
    ctx.fillRect(0, lineY - 1.5, W, 3 + pulse * 1.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(232,193,90,' + (0.06 + pulse * 0.08).toFixed(3) + ')';
    ctx.fillRect(0, lineY - 2, W, 7);
    ctx.globalCompositeOperation = 'source-over';

    // falling tiles
    if (S.song && S.mode !== 'menu') {
        const now = songNow();
        for (const n of S.notes) {
            const y = lineY - (n.t - now) * view.pps;
            const h = view.tileH;
            if (y - h > H || y < -h * 2) continue;
            if (n.hit && now - n.t > 0.25) continue;
            const x = laneX(n.midi, W), w = laneW(n.midi, W);
            const black = isBlack(n.midi);
            const approaching = !n.hit && !n.missed && n.t - now < 0.22 && n.t - now > -WIN_G;

            ctx.globalAlpha = n.hit ? Math.max(0, 1 - (now - n.t) / 0.25) : n.missed ? 0.35 : 1;
            if (black) {
                const g = ctx.createLinearGradient(x, y - h, x, y);
                g.addColorStop(0, approaching ? '#6b5a2a' : '#3a3350');
                g.addColorStop(1, '#221c34');
                ctx.fillStyle = g;
            } else {
                const g = ctx.createLinearGradient(x, y - h, x, y);
                g.addColorStop(0, approaching ? '#fff3c8' : '#f5ead0');
                g.addColorStop(1, '#d9c9a0');
                ctx.fillStyle = g;
            }
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y - h, w, h - 2, 5);
            ctx.fill();
            // gold edge on the leading face
            ctx.fillStyle = approaching ? '#ffe08a' : black ? 'rgba(232,193,90,0.55)' : 'rgba(184,145,47,0.8)';
            ctx.fillRect(x - w / 2 + 1, y - 4, w - 2, 3);
            if (approaching) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(232,193,90,0.25)';
                ctx.beginPath();
                ctx.roundRect(x - w / 2, y - h, w, h - 2, 5);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.globalAlpha = 1;
        }
    }

    // pressed-key lane glow
    for (const midi of S.downKeys) {
        const x = laneX(midi, W), w = laneW(midi, W);
        const g = ctx.createLinearGradient(0, lineY - 90, 0, lineY);
        g.addColorStop(0, 'rgba(232,193,90,0)');
        g.addColorStop(1, 'rgba(232,193,90,0.28)');
        ctx.fillStyle = g;
        ctx.fillRect(x - w / 2, lineY - 90, w, 90);
    }

    // rings
    for (const r of rings) {
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.life * 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, TAU);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.4, p.size * p.life), 0, TAU);
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // floating judgement text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of pops) {
        const a = clamp(p.life, 0, 1);
        const y = p.y - (1 - a) * 30;
        ctx.font = '800 ' + p.size + 'px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.globalAlpha = a;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(5,4,10,0.65)';
        ctx.strokeText(p.txt, p.x, y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.txt, p.x, y);
    }
    ctx.globalAlpha = 1;
}

/* ---------------- overlays / lifecycle ---------------- */

function hideOverlays() {
    ui.menu.classList.add('hidden');
    ui.paused.classList.add('hidden');
    ui.results.classList.add('hidden');
}

function buildSongList() {
    ui.songList.innerHTML = '';
    for (const song of SONGS) {
        const btn = document.createElement('button');
        btn.className = 'song-btn';
        const best = BESTS[song.id] || 0;
        btn.innerHTML =
            '<span>' + song.name + '</span>' +
            (best ? '<span class="best">' + best + '</span>' : '') +
            '<span class="diff ' + song.diff + '">' + song.diff.toUpperCase() + '</span>';
        btn.addEventListener('click', () => { blip(660, 0.06, 'triangle'); startSong(song); });
        ui.songList.appendChild(btn);
    }
}

function gotoMenu() {
    S.mode = 'menu';
    S.song = null;
    S.notes = [];
    if (AC && AC.state === 'suspended') AC.resume();
    hideOverlays();
    ui.menu.classList.remove('hidden');
    ui.songName.textContent = 'Piano Fall';
    buildSongList();
    syncHud(true);
}

function pauseGame() {
    if (S.mode !== 'play') return;
    S.mode = 'paused';
    if (AC) AC.suspend();          // freezes the song clock with it
    ui.paused.classList.remove('hidden');
}

function resumeGame() {
    if (S.mode !== 'paused') return;
    S.mode = 'play';
    if (AC) AC.resume();
    ui.paused.classList.add('hidden');
}

/* ---------------- input ---------------- */

function setupInput() {
    // pointer on keys (multi-touch works naturally with pointer events)
    ui.keys.addEventListener('pointerdown', (e) => {
        const k = e.target.closest('.key');
        if (!k) return;
        e.preventDefault();
        pressKey(+k.dataset.midi);
    });
    ui.keys.addEventListener('pointerover', (e) => {
        if (e.buttons !== 1) return;                    // mouse drag-glissando
        const k = e.target.closest('.key');
        if (k) pressKey(+k.dataset.midi);
    });
    const endAll = () => {
        for (const m of [...S.downKeys]) releaseKey(m);
    };
    window.addEventListener('pointerup', endAll);
    window.addEventListener('pointercancel', endAll);

    // computer keyboard
    window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        if (e.code === 'Escape') {
            if (S.mode === 'play') pauseGame();
            else if (S.mode === 'paused') resumeGame();
            return;
        }
        const midi = KEYMAP[e.code];
        if (midi !== undefined) {
            e.preventDefault();
            pressKey(midi);
        }
    });
    window.addEventListener('keyup', (e) => {
        const midi = KEYMAP[e.code];
        if (midi !== undefined) releaseKey(midi);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && S.mode === 'play') pauseGame();
    });
}

function setupButtons() {
    ui.btnFreestyle.addEventListener('click', () => { blip(660, 0.06, 'triangle'); startFreestyle(); });
    ui.btnPause.addEventListener('click', () => {
        if (S.mode === 'play') pauseGame();
        else if (S.mode === 'paused') resumeGame();
    });
    ui.btnResume.addEventListener('click', resumeGame);
    ui.btnQuit.addEventListener('click', () => { if (AC) AC.resume(); gotoMenu(); });
    ui.btnRetry.addEventListener('click', () => {
        if (S.song) startSong(S.song);
        else gotoMenu();
    });
    ui.btnMenu.addEventListener('click', gotoMenu);
    const syncSound = () => {
        ui.btnSound.textContent = R2.getSettings().sound ? '🔊' : '🔇';
    };
    ui.btnSound.addEventListener('click', () => {
        R2.setSettings({ sound: !R2.getSettings().sound });
        syncSound();
        blip(660, 0.06, 'triangle');
    });
    syncSound();
}

/* ---------------- main loop & boot ---------------- */

let lastTs = 0;

function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    updateFx(dt);
    if (S.mode === 'play') updateSong();
    render();
    requestAnimationFrame(frame);
}

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(() => { /* noop */ });
    }
}

function checkOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    const touch = window.matchMedia('(pointer: coarse)').matches;
    ui.rotate.classList.toggle('hidden', !(portrait && touch));
}

function boot() {
    buildKeys();
    resize();
    window.addEventListener('resize', () => { resize(); checkOrientation(); });
    window.addEventListener('orientationchange', () => setTimeout(() => { resize(); checkOrientation(); }, 250));
    checkOrientation();
    setupInput();
    setupButtons();
    R2.markPlayed('piano-pwa/');
    R2.trackPlaytime('piano-pwa/');
    R2.installHint();
    registerSW();
    gotoMenu();
    requestAnimationFrame((ts) => { lastTs = ts; requestAnimationFrame(frame); });
}

window.addEventListener('load', () => setTimeout(boot, 50));

})();
