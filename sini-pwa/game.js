/*
 * SINI — inchiostro vivo · a living-brushstroke .io on rice paper
 * Vanilla Canvas 2D + shared/arcade.js (R2). No build, no assets.
 *
 * The hook: your ink dries as you age.
 *   - Wet ink evaporates (no trace, fast turns, fast flow)
 *   - Dry ink is baked onto the paper FOREVER — lethal traps for everyone,
 *     including you. Greed literally dries you into your own graveyard.
 * Water droplets erase marks (and careless strokes). The paper is FINITE:
 * the edges kill. Score = how much of the sheet you have painted.
 */
(function () {
  "use strict";

  /* ================= Config ================= */
  var W = 1800, H = 2400;            // paper size (finite!)
  var EDGE = 9;                      // lethal border thickness
  var SPACING = 7;                   // px between trail points
  var HEAD_R = 7;
  var POINT_R = 4.4;                 // stroke half-width
  var PERMA_LETHAL_AGE = 1.6;        // grace before a PERMANENT (dry) mark kills
  var WET_MAX = 100;
  var WET_DECAY = 1.05;              // + painting factor (see decayRate)
  var BOOST_DRAIN = 9;               // extra wetness/s while dashing
  var BODY_START = 70, BODY_MAX = 250, BODY_MIN = 20;
  var STONE_TARGET = 34;
  var ROUND_PCT = 0.60;              // paper complete → new sheet
  var BOTS = 6;
  var BOT_NAMES = ["Bokuseki", "Kami", "Sumi", "Tanuki", "Kuro", "Ichimonji", "Bleed", "Shodo", "Kami-oroshi", "Fude"];
  var DEATH_MSGS = {
    trap: "Il tuo inchiostro si è asciugato nel suo stesso cimitero.",
    edge: "Il foglio finisce qui. Sempre.",
    water: "L'acqua ti ha cancellato.",
    ink: "Troppo poco inchiostro per restare sul foglio.",
    body: "Un tratto troppo corto non è calligrafia.",
  };

  /* ================= State ================= */
  var state = {
    players: [],
    stones: [],
    droplets: [],
    splashes: [],
    seal: null,
    sealT: 30,
    stoneT: 0,
    dropT: 4,
    time: 0,
    paintedTotal: 0,      // px² painted by everyone (permanent)
    over: false,          // sheet complete
  };
  var uid = 0;
  var cam = { x: W / 2, y: H / 2, z: 0.8 };
  var view = { w: 0, h: 0, dpr: 1 };
  var input = { ax: 0, ay: 0, has: false, dash: false };
  var canvas, ctx, dried, driedCtx, grainPat = null;
  var Sound, Particles;
  var me = null;
  var modalOpen = true;
  var toastT = null;

  /* ================= Utils ================= */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.add("hidden"); }, 2800);
  }

  /* ================= Ink economy ================= */
  function decayRate(p) {
    // painting dries you: the more you have baked, the faster you dry
    return WET_DECAY + Math.min(1.6, p.paintedArea / 26000);
  }
  function speedOf(p) { return 128 * (0.72 + 0.55 * p.wet / WET_MAX) * (p.stun > 0 ? 0.35 : 1); }
  function turnOf(p) { return 3.3 + 3.4 * p.wet / WET_MAX; }
  function lifeOf(wet) {
    // wet ink evaporates fast; dry ink (wet<=28) becomes permanent
    if (wet <= 28) return Infinity;
    return 1.6 + (wet - 28) / 72 * 6.5;
  }

  function makePoint(x, y, wet) {
    var pt = { x: x, y: y, born: state.time, wet: wet, life: lifeOf(wet), baked: false, r: POINT_R, _h: null };
    var cx = (x / HASH_CELL) | 0, cy = (y / HASH_CELL) | 0;
    var k = cx + "," + cy;
    var arr = inkHash.get(k);
    if (!arr) { arr = []; inkHash.set(k, arr); }
    arr.push(pt);
    pt._h = arr;
    return pt;
  }
  function hashRemove(pt) {
    if (pt._h) {
      var i = pt._h.indexOf(pt);
      if (i >= 0) pt._h.splice(i, 1);
      pt._h = null;
    }
  }

  function bakePoint(p, pt) {
    if (pt.baked) return;
    pt.baked = true;
    driedCtx.globalAlpha = 0.92;
    driedCtx.fillStyle = "#211a14";
    driedCtx.beginPath();
    driedCtx.arc(pt.x, pt.y, pt.r * 1.05, 0, 6.2832);
    driedCtx.fill();
    // bleeding edge
    driedCtx.globalAlpha = 0.16;
    driedCtx.beginPath();
    driedCtx.arc(pt.x + rand(-1.4, 1.4), pt.y + rand(-1.4, 1.4), pt.r * 1.9, 0, 6.2832);
    driedCtx.fill();
    driedCtx.globalAlpha = 1;
    state.paintedTotal += 78; // ≈ area of the mark
    p.paintedArea += 78;
  }

  function earnSeal(p) {
    p.score += 150;
    // the master stroke: everything wet becomes permanent, instantly
    p.pts.forEach(function (pt) { if (!pt.baked) { pt.life = Infinity; bakePoint(p, pt); } });
    p.invuln = 2.5;
    Sound.seal();
    R2.buzz([12, 30, 12]);
    spawnSplash(p.x, p.y, "#b3382c", 16);
    toast("🔴 Il sigillo: il tuo tratto è ora permanente!");
  }

  /* ================= Entities ================= */
  function spawnPointSafe() {
    for (var tries = 0; tries < 30; tries++) {
      var x = rand(220, W - 220), y = rand(220, H - 220);
      if (!lethalAt(x, y, 180)) return { x: x, y: y };
    }
    return { x: rand(220, W - 220), y: rand(220, H - 220) };
  }

  function makePlayer(name, bot) {
    var s = spawnPointSafe();
    var p = {
      id: ++uid, name: name, bot: bot,
      alive: true, x: s.x, y: s.y, dir: rand(0, 6.28),
      wet: WET_MAX, boost: false,
      pts: [], body: BODY_START,
      paintedArea: 0, score: 0,
      invuln: 3.0, stun: 0,
      lastPtD: 0, aiTarget: null, aiT: 0, respawnT: 0,
    };
    return p;
  }

  function spawnStone() {
    state.stones.push({ x: rand(60, W - 60), y: rand(60, H - 60), ph: rand(0, 6.28) });
  }

  function spawnSplash(x, y, color, n) {
    Particles.spawn(x, y, color || "#211a14", n);
  }

  function killPlayer(p, reason) {
    if (!p.alive) return;
    p.alive = false;
    Sound.die();
    R2.buzz([60, 40, 90]);
    spawnSplash(p.x, p.y, "#211a14", 22);
    // the graveyard signature: a red seal stamped where you fell
    stampSeal(p.x, p.y, p.name);
    p.pts.forEach(function (pt) { if (!pt.baked && pt.life === Infinity) bakePoint(p, pt); });
    if (!p.bot) showDeath(reason);
    else p.respawnT = 2.5;
  }

  function stampSeal(x, y, name) {
    var s = 15;
    driedCtx.save();
    driedCtx.translate(x, y);
    driedCtx.rotate(rand(-0.2, 0.2));
    driedCtx.globalAlpha = 0.85;
    driedCtx.fillStyle = "#b3382c";
    driedCtx.fillRect(-s, -s, s * 2, s * 2);
    driedCtx.globalAlpha = 0.9;
    driedCtx.fillStyle = "#ece1c8";
    driedCtx.fillRect(-s + 3, -s + 3, 4, s * 2 - 6);
    driedCtx.fillRect(-s + 9, -s + 6, s * 2 - 12, 3.5);
    driedCtx.fillRect(-s + 9, 1, s * 2 - 12, 3.5);
    driedCtx.fillRect(s - 7, -s + 3, 4, s * 2 - 6);
    driedCtx.globalAlpha = 1;
    driedCtx.restore();
  }

  /* ================= Lethal lookup (spatial hash) ================= */
  var HASH_CELL = 64;
  var inkHash = new Map();
  function lethalAt(x, y, radius) {
    var r2 = radius * radius;
    var now = state.time;
    var c0x = ((x - radius) / HASH_CELL) | 0, c1x = ((x + radius) / HASH_CELL) | 0;
    var c0y = ((y - radius) / HASH_CELL) | 0, c1y = ((y + radius) / HASH_CELL) | 0;
    for (var cx = c0x; cx <= c1x; cx++) {
      for (var cy = c0y; cy <= c1y; cy++) {
        var arr = inkHash.get(cx + "," + cy);
        if (!arr) continue;
        for (var i = 0; i < arr.length; i++) {
          var pt = arr[i];
          var age = now - pt.born;
          // Solo l'inchiostro PERMANENTE uccide. L'inchiostro bagnato evapora
          // (lifeOf) e non deve mai essere letale: prima bastava age>=1.6s,
          // quindi la propria scia bagnata ti uccideva per tutta la sua vita
          // utile (~6.5s a umidita piena) instead of just disappearing.
          if (pt.life !== Infinity) continue;
          if (age < PERMA_LETHAL_AGE) continue;
          if (dist2(x, y, pt.x, pt.y) < r2) return true;
        }
      }
    }
    return false;
  }

  /* ================= Update ================= */
  function updatePlayer(p, dt) {
    if (!p.alive) {
      if (p.bot) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) {
          var s = spawnPointSafe();
          p.alive = true; p.x = s.x; p.y = s.y; p.dir = rand(0, 6.28);
          p.wet = WET_MAX; p.pts = []; p.body = BODY_START;
          // azzera solo la partita corrente: azzerare anche score e area
          // dipinta cancellava il progresso della run a ogni respawn
          p.paintedArea = 0; p.invuln = 3.0; p.stun = 0;
        }
      }
      return;
    }
    p.invuln = Math.max(0, p.invuln - dt);
    p.stun = Math.max(0, p.stun - dt);

    // steering
    var desired;
    if (p.bot) desired = botThink(p, dt);
    else if (input.has) desired = Math.atan2(input.ay - p.y, input.ax - p.x);
    else desired = p.dir;
    var d = desired - p.dir;
    while (d > Math.PI) d -= 6.2832;
    while (d < -Math.PI) d += 6.2832;
    var tr = turnOf(p) * dt;
    p.dir += clamp(d, -tr, tr);

    // move
    var boost = p.boost && p.wet > 4;
    p.x += Math.cos(p.dir) * speedOf(p) * (boost ? 1.5 : 1) * dt;
    p.y += Math.sin(p.dir) * speedOf(p) * (boost ? 1.5 : 1) * dt;

    // wetness
    // BOOST_DRAIN e' un extra piano in umidita/s, non un moltiplicatore:
    // prima lo scatto costava ~9.6x il decadimento (33/s a fondo campo).
    var drain = decayRate(p) + (boost ? BOOST_DRAIN : 0);
    p.wet -= Math.min(14, drain) * dt;
    if (p.wet <= 0) { p.wet = 0; killPlayer(p, "ink"); return; }

    // lay trail
    var last = p.pts.length ? p.pts[p.pts.length - 1] : null;
    var ld = last ? dist2(p.x, p.y, last.x, last.y) : 1e9;
    if (!last || ld >= SPACING * SPACING) p.pts.push(makePoint(p.x, p.y, p.wet));
    // evaporate / bake (permanent marks stay in the hash: they are the map)
    for (var i = p.pts.length - 1; i >= 0; i--) {
      var pt = p.pts[i];
      var age = state.time - pt.born;
      if (pt.life !== Infinity && age > pt.life) { hashRemove(pt); p.pts.splice(i, 1); continue; }
      if (pt.life === Infinity && !pt.baked && age > 0.55) bakePoint(p, pt);
    }

    // eat stones
    for (var s = state.stones.length - 1; s >= 0; s--) {
      var st = state.stones[s];
      if (dist2(p.x, p.y, st.x, st.y) < 15 * 15) {
        state.stones.splice(s, 1);
        p.wet = Math.min(WET_MAX, p.wet + 14);
        p.body = Math.min(BODY_MAX, p.body + 3);
        Sound.eat();
        if (!p.bot) R2.buzz(6);
      }
    }

    // seal
    if (state.seal && dist2(p.x, p.y, state.seal.x, state.seal.y) < 20 * 20) {
      earnSeal(p);
      state.seal = null;
      state.sealT = rand(40, 70);
    }

    // lethal ink collision (spatial hash)
    if (p.invuln <= 0) {
      if (lethalAt(p.x, p.y, HEAD_R + POINT_R)) { killPlayer(p, "trap"); return; }
      // head-on: the shorter stroke dies
      for (var pj = 0; pj < state.players.length; pj++) {
        var o = state.players[pj];
        if (o === p || !o.alive || o.invuln > 0) continue;
        if (dist2(p.x, p.y, o.x, o.y) < (HEAD_R * 2.2) * (HEAD_R * 2.2)) {
          // A parita' di corporatura vince chi ha id piu alto: il giocatore
          // umano e creato per ultimo, quindi i pareggi lo favoriscono.
          var lose = p.body < o.body || (p.body === o.body && p.id > o.id);
          if (lose) { killPlayer(p, "trap"); return; }
          else { killPlayer(o, "trap"); }
        }
      }
      // paper edge — the sheet is finite
      if (p.x < EDGE || p.x > W - EDGE || p.y < EDGE || p.y > H - EDGE) {
        p.x = clamp(p.x, EDGE, W - EDGE);
        p.y = clamp(p.y, EDGE, H - EDGE);
        spawnSplash(p.x, p.y, "#211a14", 14);
        killPlayer(p, "edge");
        return;
      }
    }

    // scoreboard
    p.score = Math.floor(p.paintedArea / 50);
  }

  function botThink(p, dt) {
    p.aiT -= dt;
    if (p.aiT <= 0 || !p.aiTarget) {
      p.aiT = rand(3, 6);
      if (p.wet < 62 && state.stones.length) {
        var bs = null, bd = 1e18;
        for (var i = 0; i < state.stones.length; i++) {
          var st = state.stones[i];
          var dd = dist2(p.x, p.y, st.x, st.y);
          if (dd < bd) { bd = dd; bs = st; }
        }
        p.aiTarget = bs ? { x: bs.x, y: bs.y } : { x: rand(150, W - 150), y: rand(150, H - 150) };
      } else {
        p.aiTarget = { x: rand(140, W - 140), y: rand(140, H - 140) };
      }
    }
    // avoidance: probe ahead, steer away from lethal ink & edges
    var probeR = 42;
    var best = null, bestScore = -1e9;
    for (var a = -2.0; a <= 2.0; a += 0.25) {
      var ang = p.dir + a;
      var px = p.x + Math.cos(ang) * probeR, py = p.y + Math.sin(ang) * probeR;
      var sc = 0;
      if (px < EDGE + 30 || px > W - EDGE - 30 || py < EDGE + 30 || py > H - EDGE - 30) sc -= 500;
      if (lethalAt(px, py, 12)) sc -= 300;
      // non finire addosso a un altro giocatore: l'urto frontale uccide
      // e i bot non ne erano al corrente (solo inchiostro e bordi)
      for (var q = 0; q < state.players.length; q++) {
        var oth = state.players[q];
        if (oth === p || !oth.alive) continue;
        if (Math.hypot(px - oth.x, py - oth.y) < 46) { sc -= 220; break; }
      }
      // prefer heading to target
      var want = Math.atan2(p.aiTarget.y - p.y, p.aiTarget.x - p.x);
      var dd = ang - want;
      while (dd > Math.PI) dd -= 6.2832;
      while (dd < -Math.PI) dd += 6.2832;
      sc -= Math.abs(dd) * 60;
      sc += rand(0, 12);
      if (sc > bestScore) { bestScore = sc; best = ang; }
    }
    return best;
  }

  function updateDroplets(dt) {
    state.dropT -= dt;
    if (state.dropT <= 0) {
      state.dropT = rand(3.5, 6.5);
      var n = Math.random() < 0.12 ? 2 : 1;
      for (var k = 0; k < n; k++) {
        state.droplets.push({
          x: rand(120, W - 120), y: rand(120, H - 120),
          t: 0, phase: "warn", r: rand(46, 64),
        });
      }
    }
    for (var i = state.droplets.length - 1; i >= 0; i--) {
      var d = state.droplets[i];
      d.t += dt;
      if (d.phase === "warn") {
        if (d.t >= 1.0) {
          d.phase = "splash";
          d.t = 0;
          Sound.splash();
          // erase marks under the drop
          driedCtx.save();
          driedCtx.globalCompositeOperation = "destination-out";
          driedCtx.beginPath();
          driedCtx.arc(d.x, d.y, d.r, 0, 6.2832);
          driedCtx.fill();
          driedCtx.restore();
          var r2 = d.r * d.r;
          state.players.forEach(function (p) {
            for (var j = p.pts.length - 1; j >= 0; j--) {
              var pt = p.pts[j];
              if (dist2(pt.x, pt.y, d.x, d.y) < r2) {
                if (pt.baked) { state.paintedTotal = Math.max(0, state.paintedTotal - 78); p.paintedArea = Math.max(0, p.paintedArea - 78); }
                hashRemove(pt);
                p.pts.splice(j, 1);
              }
            }
            if (p.alive && p.invuln <= 0 && p.stun <= 0 && dist2(p.x, p.y, d.x, d.y) < r2) {
              p.body -= 16;
              p.stun = 0.6;
              p.invuln = Math.max(p.invuln, 0.9); // una goccia = un morso
              spawnSplash(p.x, p.y, "#4a6a8a", 10);
              if (!p.bot) R2.buzz(40);
              if (p.body < BODY_MIN) killPlayer(p, "water");
            }
          });
        }
      } else {
        if (d.t >= 0.7) state.droplets.splice(i, 1);
      }
    }
  }

  function updateSeal(dt) {
    if (state.seal) {
      state.seal.life -= dt;
      if (state.seal.life <= 0) { state.seal = null; state.sealT = rand(40, 70); }
    } else {
      state.sealT -= dt;
      if (state.sealT <= 0) {
        var s = spawnPointSafe();
        state.seal = { x: s.x, y: s.y, life: 18, ph: rand(0, 6.28) };
        toast("🔴 Il sigillo rosso è apparso");
      }
    }
  }

  function update(dt) {
    state.time += dt;
    if (state.over) return;
    for (var i = 0; i < state.players.length; i++) updatePlayer(state.players[i], dt);
    updateDroplets(dt);
    updateSeal(dt);
    Particles.update(dt);
    // stones trickle back
    state.stoneT -= dt;
    if (state.stoneT <= 0) {
      state.stoneT = 4;
      if (state.stones.length < STONE_TARGET) spawnStone();
    }
    // round complete: the sheet is full
    var pct = state.paintedTotal / (W * H);
    if (!state.over && pct >= ROUND_PCT) {
      state.over = true;
      var best = state.players.slice().sort(function (a, b) { return b.paintedArea - a.paintedArea; })[0];
      showModal(
        "📜 Il foglio è completo",
        "La calligrafia è finita: il " + Math.round(pct * 100) + "% della carta è inchiostro.\n\n" +
        "Maestro del foglio: " + (best ? best.name : "—") + " (" + (best ? (best.paintedArea / (W * H) * 100).toFixed(2) : "0") + "%)",
        "Nuovo foglio",
        function () {
          driedCtx.clearRect(0, 0, W, H);
          state.paintedTotal = 0;
          state.over = false;
          state.stones = [];
          for (var s = 0; s < STONE_TARGET; s++) spawnStone();
          state.players.forEach(function (p) {
            var sp = spawnPointSafe();
            p.alive = true; p.x = sp.x; p.y = sp.y; p.dir = rand(0, 6.28);
            p.wet = WET_MAX; p.pts = []; p.body = BODY_START;
            p.paintedArea = 0; p.invuln = 3.0; p.stun = 0;
          });
          inkHash.clear();
          hideModal();
        });
    }
  }

  /* ================= Rendering ================= */
  function makeGrain() {
    var g = document.createElement("canvas");
    g.width = 256; g.height = 256;
    var c = g.getContext("2d");
    for (var i = 0; i < 900; i++) {
      c.fillStyle = "rgba(90,74,52," + rand(0.02, 0.07).toFixed(3) + ")";
      c.fillRect(rand(0, 256), rand(0, 256), rand(0.5, 2), rand(0.5, 2));
    }
    for (var f = 0; f < 40; f++) {
      c.strokeStyle = "rgba(90,74,52,0.04)";
      c.lineWidth = 0.7;
      c.beginPath();
      var x = rand(0, 256), y = rand(0, 256);
      c.moveTo(x, y);
      c.lineTo(x + rand(-24, 24), y + rand(-24, 24));
      c.stroke();
    }
    grainPat = ctx.createPattern(g, "repeat");
  }

  function drawPaper() {
    ctx.fillStyle = "#ece1c8";
    ctx.fillRect(0, 0, W, H);
    if (grainPat) { ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W, H); }
    // faint mottling
    ctx.fillStyle = "rgba(190,172,138,0.16)";
    ctx.beginPath();
    ctx.ellipse(W * 0.28, H * 0.3, 420, 300, 0.5, 0, 6.2832);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(W * 0.72, H * 0.68, 480, 340, -0.4, 0, 6.2832);
    ctx.fill();
  }

  function drawEdges() {
    // scroll border: dark band + red-brown line
    ctx.fillStyle = "rgba(58,44,32,0.9)";
    ctx.fillRect(0, 0, W, 5);
    ctx.fillRect(0, H - 5, W, 5);
    ctx.fillRect(0, 0, 5, H);
    ctx.fillRect(W - 5, 0, 5, H);
    ctx.strokeStyle = "rgba(122,46,38,0.8)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(EDGE - 4, EDGE - 4, W - (EDGE - 4) * 2, H - (EDGE - 4) * 2);
  }

  function drawTrail(p, now) {
    var pts = p.pts;
    for (var i = 0; i < pts.length; i++) {
      var pt = pts[i];
      if (pt.baked) continue;
      var age = now - pt.born;
      var wetNow = 1 - clamp(age / Math.max(pt.life, 0.001), 0, 1);
      // wet sheen on fresh ink
      if (age < 0.4) {
        ctx.fillStyle = "rgba(255,252,244,0.5)";
        ctx.beginPath();
        ctx.arc(pt.x - 1.2, pt.y - 1.2, pt.r * 0.42, 0, 6.2832);
        ctx.fill();
      }
      var alpha = 0.88 * (pt.life === Infinity ? 1 : wetNow);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#211a14";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, 6.2832);
      ctx.fill();
      // bleeding edge grows as ink dries
      ctx.globalAlpha = alpha * 0.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * (1.5 + age * 0.5), 0, 6.2832);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawHead(p) {
    if (!p.alive) return;
    var blink = p.invuln > 0 && Math.floor(state.time * 8) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.dir);
    ctx.globalAlpha = blink ? 0.35 : 1;
    // brush tip: teardrop
    ctx.fillStyle = "#14100c";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.quadraticCurveTo(2, -7.5, -7, -4);
    ctx.quadraticCurveTo(-10, 0, -7, 4);
    ctx.quadraticCurveTo(2, 7.5, 9, 0);
    ctx.fill();
    // handle hint
    ctx.strokeStyle = "#5a4a38";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-13, 0);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
    // name
    ctx.font = "11px " + "Hiragino Mincho ProN, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(25,20,16,0.72)";
    ctx.fillText(p.bot ? p.name : "tu ✍️", p.x, p.y - 16);
  }

  function drawStones(t) {
    state.stones.forEach(function (s) {
      var b = Math.sin(t * 2 + s.ph) * 1.2;
      ctx.fillStyle = "#211a14";
      ctx.beginPath();
      ctx.arc(s.x, s.y + b, 6.4, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = "rgba(255,252,244,0.55)";
      ctx.beginPath();
      ctx.arc(s.x - 1.8, s.y + b - 1.8, 1.8, 0, 6.2832);
      ctx.fill();
    });
  }

  function drawDroplets(t) {
    state.droplets.forEach(function (d) {
      if (d.phase === "warn") {
        var f = d.t / 1.0;
        ctx.strokeStyle = "rgba(74,106,138," + (0.15 + f * 0.35).toFixed(3) + ")";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * (0.4 + f * 0.6), 0, 6.2832);
        ctx.stroke();
        ctx.fillStyle = "rgba(74,106,138," + (0.08 + f * 0.1).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * f, 0, 6.2832);
        ctx.fill();
      } else {
        var g = d.t / 0.7;
        ctx.strokeStyle = "rgba(74,106,138," + (0.5 * (1 - g)).toFixed(3) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * (0.6 + g * 0.5), 0, 6.2832);
        ctx.stroke();
        ctx.strokeStyle = "rgba(74,106,138," + (0.3 * (1 - g)).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * (0.3 + g * 0.9), 0, 6.2832);
        ctx.stroke();
      }
    });
  }

  function drawSeal(t) {
    if (!state.seal) return;
    var s = state.seal;
    var pulse = 1 + 0.08 * Math.sin(t * 4 + s.ph);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(0.12 + Math.sin(t + s.ph) * 0.05);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(179,56,44,0.92)";
    ctx.fillRect(-11, -11, 22, 22);
    ctx.fillStyle = "#ece1c8";
    ctx.fillRect(-8, -8, 3, 16);
    ctx.fillRect(-4, -5, 12, 2.4);
    ctx.fillRect(-4, 2, 12, 2.4);
    ctx.fillRect(5, -8, 3, 16);
    ctx.restore();
    ctx.strokeStyle = "rgba(179,56,44," + (0.3 + 0.2 * Math.sin(t * 3)).toFixed(3) + ")";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 17 + Math.sin(t * 3) * 2, 0, 6.2832);
    ctx.stroke();
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.fillStyle = "#c9bb9b";
    ctx.fillRect(0, 0, view.w, view.h); // desk under the paper
    ctx.save();
    ctx.translate(view.w / 2, view.h / 2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);

    // visible rect for culling
    var vx0 = cam.x - view.w / 2 / cam.z - 40, vx1 = cam.x + view.w / 2 / cam.z + 40;
    var vy0 = cam.y - view.h / 2 / cam.z - 40, vy1 = cam.y + view.h / 2 / cam.z + 40;

    drawPaper();
    // dried graveyard layer (only the visible slice)
    var sx = clamp(vx0, 0, W), sy = clamp(vy0, 0, H);
    var sw = clamp(vx1, 0, W) - sx, sh = clamp(vy1, 0, H) - sy;
    if (sw > 0 && sh > 0) ctx.drawImage(dried, sx, sy, sw, sh, sx, sy, sw, sh);

    state.players.forEach(function (p) { if (p.alive) drawTrail(p, state.time); });
    drawStones(state.time);
    drawSeal(state.time);
    drawDroplets(state.time);
    state.players.forEach(function (p) { drawHead(p); });
    Particles.draw(ctx);
    drawEdges();
    ctx.restore();
  }

  var lastMini = 0;
  function drawMinimap() {
    if (state.time - lastMini < 0.2) return;
    lastMini = state.time;
    var mm = document.getElementById("minimap");
    if (!mm) return;
    var c = mm.getContext("2d");
    c.fillStyle = "#ece1c8";
    c.fillRect(0, 0, mm.width, mm.height);
    c.drawImage(dried, 0, 0, W, H, 0, 0, mm.width, mm.height);
    state.players.forEach(function (p) {
      if (!p.alive) return;
      c.fillStyle = p === me ? "#b3382c" : "#211a14";
      c.fillRect(p.x / W * mm.width - 1.5, p.y / H * mm.height - 1.5, 3, 3);
    });
    if (state.seal) {
      c.fillStyle = "#b3382c";
      c.fillRect(state.seal.x / W * mm.width - 2, state.seal.y / H * mm.height - 2, 4, 4);
    }
    c.strokeStyle = "rgba(25,20,16,0.5)";
    c.strokeRect(0.5, 0.5, mm.width - 1, mm.height - 1);
  }

  /* ================= HUD ================= */
  function updateHUD() {
    if (!me) return;
    var pct = (me.paintedArea / (W * H) * 100);
    document.getElementById("painted").textContent = pct.toFixed(2) + "%";
    var f = document.getElementById("wetfill");
    f.style.width = clamp(me.wet, 0, 100) + "%";
    var lbl = document.getElementById("wetlbl");
    // 28 e' la soglia reale di permanentza (lifeOf), non 33.
    var txt = me.wet > 66 ? "bagnato — scorri veloce" : me.wet > 28 ? "si asciuga…" : "SECCO — lasci segni eterni";
    if (lbl.textContent !== txt) {
      lbl.textContent = txt;
      lbl.classList.toggle("dry", me.wet <= 33);
    }
    // leaderboard
    var lb = document.getElementById("leaderboard");
    var sorted = state.players.slice().sort(function (a, b) { return b.paintedArea - a.paintedArea; }).slice(0, 5);
    var html = "";
    sorted.forEach(function (p, i) {
      var pc = (p.paintedArea / (W * H) * 100).toFixed(2);
      html += "<li" + (p === me ? ' class="me"' : "") + ">" + (i + 1) + ". " + p.name + " <b>" + pc + "%</b></li>";
    });
    if (lb._h !== html) { lb._h = html; lb.innerHTML = html; }
    drawMinimap();
  }

  /* ================= Camera ================= */
  function updateCamera(dt) {
    if (me && me.alive) {
      cam.x = lerp(cam.x, me.x, 1 - Math.pow(0.001, dt));
      cam.y = lerp(cam.y, me.y, 1 - Math.pow(0.001, dt));
    }
    cam.z = clamp(Math.min(view.w, view.h) / 760, 0.5, 1.1);
    var halfW = view.w / 2 / cam.z, halfH = view.h / 2 / cam.z;
    cam.x = clamp(cam.x, Math.min(halfW, W / 2), Math.max(W - halfW, W / 2));
    cam.y = clamp(cam.y, Math.min(halfH, H / 2), Math.max(H - halfH, H / 2));
  }

  /* ================= Input ================= */
  function setupInput() {
    var stage = document.getElementById("stage");
    function aim(e) {
      var rect = canvas.getBoundingClientRect();
      input.ax = cam.x + (e.clientX - rect.left - view.w / 2) / cam.z;
      input.ay = cam.y + (e.clientY - rect.top - view.h / 2) / cam.z;
      input.has = true;
    }
    stage.addEventListener("pointermove", function (e) { aim(e); });
    stage.addEventListener("pointerdown", function (e) {
      aim(e);
      if (e.pointerType === "mouse") input.dash = true;
    });
    stage.addEventListener("pointerup", function (e) {
      if (e.pointerType === "mouse") input.dash = false;
    });
    document.addEventListener("keydown", function (e) {
      if (e.code === "Space") { input.dash = true; e.preventDefault(); }
    });
    document.addEventListener("keyup", function (e) {
      if (e.code === "Space") input.dash = false;
    });
    var dashBtn = document.getElementById("dash-btn");
    ["pointerdown"].forEach(function (ev) {
      dashBtn.addEventListener(ev, function (e) { e.preventDefault(); input.dash = true; });
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      dashBtn.addEventListener(ev, function (e) { input.dash = false; });
    });
  }

  /* ================= Sound ================= */
  function initSound() {
    Sound = R2.makeSound({
      eat:    [180, 0.08, "sine"],
      splash: [95, 0.28, "sine"],
      die:    [70, 0.5, "sine"],
      seal:   [392, 0.4, "triangle"],
      gong:   [587, 0.5, "triangle"],
    });
    Particles = R2.makeParticles();
  }

  /* ================= Modal ================= */
  var modalAction = null;
  function showModal(title, msg, btn, action, opts) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-msg").textContent = msg;
    document.getElementById("modal-btn").textContent = btn || "Va bene";
    document.getElementById("modal-howto").style.display = opts && opts.howto ? "" : "none";
    var st = document.getElementById("modal-stats");
    if (opts && opts.stats) {
      st.innerHTML = opts.stats;
      st.classList.remove("hidden");
    } else st.classList.add("hidden");
    var seal = document.getElementById("death-seal");
    if (opts && opts.seal) {
      seal.classList.remove("hidden");
      document.getElementById("seal-name").textContent = opts.seal;
      seal.style.animation = "none";
      void seal.offsetWidth;
      seal.style.animation = "";
    } else seal.classList.add("hidden");
    modalAction = action || null;
    document.getElementById("modal").classList.remove("hidden");
    modalOpen = true;
  }
  function hideModal() {
    document.getElementById("modal").classList.add("hidden");
    modalOpen = false;
  }

  function showDeath(reason) {
    var pct = (me.paintedArea / (W * H) * 100).toFixed(2);
    var best = Number(localStorage.getItem("sini-best") || 0);
    var pctN = Number(pct);
    if (pctN > best) { localStorage.setItem("sini-best", String(pctN)); best = pctN; }
    R2.saveJSON("sini-pwa", { highScore: Math.round(best * 100) });
    var mins = Math.floor(state.time / 60), secs = Math.floor(state.time % 60);
    showModal(
      "Il tratto si spezza",
      DEATH_MSGS[reason] || "La calligrafia è finita.",
      "✍️ Riscrivi",
      function () { respawn(); },
      {
        seal: me.name || "SINI",
        stats: "Foglio dipinto: <b>" + pct + "%</b><br>Tuo record: <b>" + best.toFixed(2) + "%</b><br>Tempo d'inchiostro: " + mins + "m " + secs + "s",
      });
  }

  function respawn() {
    var s = spawnPointSafe();
    me.alive = true;
    me.x = s.x; me.y = s.y; me.dir = rand(0, 6.28);
    me.wet = WET_MAX; me.pts = []; me.body = BODY_START;
    me.paintedArea = 0;
    me.invuln = 3; me.stun = 0;
    hideModal();
  }

  /* ================= Loop ================= */
  var lastT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0.016;
    lastT = t;
    if (me && me.alive && !modalOpen) me.boost = input.dash;
    update(dt);
    updateCamera(dt);
    render();
    updateHUD();
    requestAnimationFrame(loop);
  }

  /* ================= Init ================= */
  function resize() {
    var stage = document.getElementById("stage");
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
  }

  function init() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    initSound();
    resize();
    window.addEventListener("resize", resize);

    // dried graveyard layer (baked permanent ink, erasable by water)
    dried = document.createElement("canvas");
    dried.width = W; dried.height = H;
    driedCtx = dried.getContext("2d");

    makeGrain();
    for (var s = 0; s < STONE_TARGET; s++) spawnStone();
    var bots = BOT_NAMES.slice().sort(function () { return Math.random() - 0.5; }).slice(0, BOTS);
    bots.forEach(function (n) { state.players.push(makePlayer(n, true)); });
    me = makePlayer("tu", false);
    state.players.push(me);
    cam.x = me.x; cam.y = me.y;

    setupInput();
    document.getElementById("modal-btn").addEventListener("click", function () {
      if (modalAction) { var f = modalAction; modalAction = null; f(); }
      else hideModal();
    });

    R2.trackPlaytime("sini-pwa/");
    R2.installHint();
    R2.markPlayed("sini-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
