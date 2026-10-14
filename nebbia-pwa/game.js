/*
 * NEBBIA — gilda dei cartografi · l'informazione è merce rischiosa
 * Il mondo vero esiste sotto la nebbia. La TUA mappa ha errori di
 * trascrizione: spostati, omessi, inventati. Le navi dei clienti navigano
 * sulle tue mappe: uno scoglio dimenticato è un naufragio, e il naufragio
 * rivela la verità. Canvas 2D, estetica carta nautica, zero asset.
 */
(function () {
  "use strict";

  /* ===== Config ===== */
  var W = 1600, H = 1200;
  var FOG = 50;
  var FOGC = Math.ceil(W / FOG), FOGR = Math.ceil(H / FOG);
  var SURVEY_R = 160;
  var EXP_BASE_COST = 80;
  var VERIFY_COST = 40;
  var SHIP_SPEED = 62;
  var EXP_SPEED = 110;
  var TRANSCRIBE_T = 9;
  var START_REP = 55;
  var SEEN_DRAGON = false;

  var state = {
    money: 120, rep: START_REP,
    truth: [], marks: [],
    fog: [], fogCount: 0,
    expeditions: [], surveys: [], ships: [], wrecks: [],
    crew: [], queue: [],
    price: 45, day: 1, dayT: 0, dayLen: 150,
    contracts: [], dailySeed: 0, editionsSold: 0,
    totalEarned: 0, over: false, shake: 0,
    target: null, time: 0,
  };
  var PALETTE_SHIPS = ["#4a3a26", "#7a2e26", "#2c4a6e"];
  var canvas, ctx, grainPat = null;
  var view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  var Sound, Particles;
  var toastT = null;

  /* ===== Utils ===== */
  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.add("hidden"); }, 3200);
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function fmtE(n) { var neg = n < 0; n = Math.round(Math.abs(n)); return (neg ? "−€ " : "€ ") + n; }
  function segDist(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var L2 = dx * dx + dy * dy || 1;
    var t = clamp(((px - x1) * dx + (py - y1) * dy) / L2, 0, 1);
    return Math.sqrt(dist2(px, py, x1 + dx * t, y1 + dy * t));
  }
  function projT(a, b, x, y) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var L2 = dx * dx + dy * dy || 1;
    return clamp(((x - a.x) * dx + (y - a.y) * dy) / L2, 0, 1);
  }

  /* ===== Sound ===== */
  function initSound() {
    Sound = R2.makeSound({
      coin:   [740, 0.09, "sine"],
      buy:    [330, 0.1, "triangle"],
      quill:  [880, 0.04, "square"],
      horn:   [200, 0.3, "sawtooth"],
      wreck:  [85, 0.45, "sawtooth"],
      near:   [300, 0.2, "sine"],
      found:  [523, 0.12, "triangle"],
      error:  [110, 0.15, "sawtooth"],
      die:    [70, 0.7, "sine"],
      season: [440, 0.15, "sine"],
    });
    Particles = R2.makeParticles();
  }

  /* ===== Mondo (verità) ===== */
  function place(rad, rock, shoal, rng) {
    function rr(a, b) { return a + rng() * (b - a); }
    for (var tries = 0; tries < 40; tries++) {
      var x = rr(90, W - 90), y = rr(90, H - 90);
      var ok = true;
      for (var j = 0; j < state.truth.length; j++) {
        var t = state.truth[j];
        var need = t.r + rad + 55;
        if (dist2(x, y, t.x, t.y) < need * need) { ok = false; break; }
      }
      if (ok) {
        var verts = null;
        if (!rock) {
          verts = [];
          for (var q = 0; q < 9; q++) verts.push(rr(0.75, 1.25));
        }
        state.truth.push({ type: rock ? "rock" : (shoal ? "shoal" : "island"), x: x, y: y, r: rad, verts: verts, phantom: false });
        return;
      }
    }
  }
  function genWorld() {
    var seed = R2.dailySeed();
    var rng = R2.mulberry32(seed);
    function rr(a, b) { return a + rng() * (b - a); }
    state.truth = [];
    var ports = [
      { x: rr(120, 220), y: rr(H - 260, H - 140) },
      { x: rr(W - 240, W - 130), y: rr(120, 230) },
      { x: rr(W * 0.42, W * 0.6), y: rr(110, 210) },
    ];
    var portNames = ["Porto Madre", "Porto Levante", "Porto Tramontana"];
    ports.forEach(function (p, i) {
      state.truth.push({ type: "island", x: p.x, y: p.y, r: rr(52, 68), port: true, name: portNames[i], verts: null });
    });
    for (var i = 0; i < 6; i++) place(rr(90, 200), false, false, rng);
    for (var k = 0; k < 12; k++) place(rr(7, 12), true, false, rng);
    for (var s = 0; s < 5; s++) place(rr(16, 26), false, true, rng);
    state.fog = [];
    state.fogCount = 0;
    for (var f = 0; f < FOGC * FOGR; f++) state.fog.push(false);
    state.ships = [];
    state.wrecks = [];
    state.expeditions = [];
    state.surveys = [];
    state.queue = [];
  }

  function reveal(x, y, r) {
    var c0 = clamp(Math.floor((x - r) / FOG), 0, FOGC - 1), c1 = clamp(Math.floor((x + r) / FOG), 0, FOGC - 1);
    var r0 = clamp(Math.floor((y - r) / FOG), 0, FOGR - 1), r1 = clamp(Math.floor((y + r) / FOG), 0, FOGR - 1);
    for (var j = r0; j <= r1; j++) {
      for (var i = c0; i <= c1; i++) {
        var idx = j * FOGC + i;
        if (!state.fog[idx]) { state.fog[idx] = true; state.fogCount++; }
      }
    }
  }
  function fogVisible(x, y) {
    var idx = clamp(Math.floor(y / FOG), 0, FOGR - 1) * FOGC + clamp(Math.floor(x / FOG), 0, FOGC - 1);
    return state.fog[idx];
  }
  function coverage() {
    return Math.round(state.fogCount / (FOGC * FOGR) * 100);
  }

  /* ===== Trascrizione con errori ===== */
  function applyTranscription(survey, skill) {
    var added = 0;
    survey.features.forEach(function (f) {
      var roll = Math.random();
      if (roll < skill) {
        state.marks.push({ x: f.x, y: f.y, type: f.type, r: f.r, port: f.port, name: f.name, phantom: false });
        added++;
      } else if (Math.random() < 0.58) {
        state.marks.push({
          x: clamp(f.x + rand(-55, 55), 30, W - 30),
          y: clamp(f.y + rand(-55, 55), 30, H - 30),
          type: f.type, r: f.r, port: f.port, name: f.name, phantom: false,
        });
        added++;
      }
      // else: omesso
    });
    var ph = Math.round(Math.max(0, 0.7 - skill) * 4 * Math.random());
    for (var i = 0; i < ph; i++) {
      state.marks.push({
        x: rand(survey.x - SURVEY_R, survey.x + SURVEY_R),
        y: rand(survey.y - SURVEY_R, survey.y + SURVEY_R),
        type: "rock", r: rand(6, 10), phantom: true,
      });
    }
    return added;
  }
  function correctlyMarked(f) {
    return state.marks.some(function (m) {
      return !m.phantom && m.type === f.type && dist2(m.x, m.y, f.x, f.y) < 16 * 16;
    });
  }

  /* ===== Verifica: la verità emerge ===== */
  function verifyArea(x, y) {
    if (state.money < VERIFY_COST) { Sound.error(); toast("Cassa insufficiente"); return; }
    state.money -= VERIFY_COST;
    var fixed = 0, added = 0, removed = 0;
    state.truth.forEach(function (f) {
      if (dist2(f.x, f.y, x, y) > SURVEY_R * SURVEY_R) return;
      var mark = null;
      state.marks.forEach(function (m) {
        if (m.type === f.type && dist2(m.x, m.y, f.x, f.y) < 30 * 30) mark = m;
      });
      if (mark) {
        if (dist2(mark.x, mark.y, f.x, f.y) > 12 * 12) { mark.x = f.x; mark.y = f.y; mark.phantom = false; fixed++; }
      } else {
        state.marks.push({ x: f.x, y: f.y, type: f.type, r: f.r, port: f.port, name: f.name, phantom: false });
        added++;
      }
    });
    state.marks = state.marks.filter(function (m) {
      if (dist2(m.x, m.y, x, y) > SURVEY_R * SURVEY_R) return true;
      var hasTruth = state.truth.some(function (f) {
        return f.type === m.type && dist2(f.x, f.y, m.x, m.y) < 30 * 30;
      });
      if (!hasTruth) { removed++; return false; }
      return true;
    });
    state.rep = clamp(state.rep + 2, 0, 100);
    Sound.quill();
    toast("🔍 Verifica: " + fixed + " corretti · " + added + " aggiunti · " + removed + " fantasmi rimossi");
    save(); renderDock();
  }

  /* ===== Navi & naufragi ===== */
  function spawnShip() {
    var ports = state.truth.filter(function (f) { return f.port; });
    if (ports.length < 2 || state.ships.length >= 4) return;
    var a = ports[Math.floor(Math.random() * ports.length)];
    var b = ports[Math.floor(Math.random() * ports.length)];
    if (a === b) return;
    var wreckHazard = null, bestD = 1e18;
    state.truth.forEach(function (f) {
      var rr = f.r + 4;
      var dd = segDist(f.x, f.y, a.x, a.y, b.x, b.y);
      if (dd < rr && !correctlyMarked(f)) {
        var along = projT(a, b, f.x, f.y);
        if (along > 0.05 && along < 0.95 && dd < bestD) { bestD = dd; wreckHazard = f; }
      }
    });
    state.ships.push({
      a: a, b: b, x: a.x, y: a.y,
      wreck: wreckHazard && Math.random() < 0.75 ? wreckHazard : null,
      nearMissed: {}, dead: false,
      color: PALETTE_SHIPS[Math.floor(Math.random() * 3)],
    });
  }
  function updateShips(dt) {
    for (var i = state.ships.length - 1; i >= 0; i--) {
      var sh = state.ships[i];
      if (sh.dead) { state.ships.splice(i, 1); continue; }
      var dx = sh.b.x - sh.x, dy = sh.b.y - sh.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 12) { state.ships.splice(i, 1); continue; } // arrivata sana
      var ux = dx / d, uy = dy / d;
      // evita i pericoli SEGNALATI
      var lx = sh.x + ux * 34, ly = sh.y + uy * 34;
      state.marks.forEach(function (m) {
        if (dist2(lx, ly, m.x, m.y) < (m.r + 20) * (m.r + 20)) {
          var nx = ux - uy * 0.8, ny = uy + ux * 0.8;
          var mm = Math.sqrt(nx * nx + ny * ny) || 1;
          ux = nx / mm; uy = ny / mm;
        }
      });
      sh.x += ux * SHIP_SPEED * dt;
      sh.y += uy * SHIP_SPEED * dt;
      if (sh.wreck && dist2(sh.x, sh.y, sh.wreck.x, sh.wreck.y) < (sh.wreck.r + 5) * (sh.wreck.r + 5)) {
        doWreck(sh, sh.wreck);
        state.ships.splice(i, 1);
        continue;
      }
      state.truth.forEach(function (f) {
        var key = f.x + ":" + f.y;
        if (sh.nearMissed[key]) return;
        if (correctlyMarked(f)) return;
        if (dist2(sh.x, sh.y, f.x, f.y) < (f.r + 13) * (f.r + 13)) {
          sh.nearMissed[key] = true;
          if (Math.random() < 0.6) {
            state.rep = clamp(state.rep - 3, 0, 100);
            Sound.near();
            if (!correctlyMarked(f)) {
              state.marks.push({ x: f.x, y: f.y, type: f.type, r: f.r, port: f.port, name: f.name, phantom: false });
            }
            toast("⛵ Quasi-naufragio: un pericolo non era sulla mappa. (−3 ⭐)");
          }
        }
      });
    }
  }
  function doWreck(sh, hazard) {
    sh.dead = true;
    state.rep = clamp(state.rep - 15, 0, 100);
    state.money -= 150;
    state.wrecks.push({ x: hazard.x, y: hazard.y, t: state.time });
    state.marks.push({ x: hazard.x, y: hazard.y, type: hazard.type, r: hazard.r, port: hazard.port, name: hazard.name, phantom: false });
    Sound.wreck();
    state.shake = 8;
    R2.buzz([40, 30, 70]);
    Particles.spawn(hazard.x, hazard.y, "#4a3a26", 16);
    toast("⚓ NAUFRAGIO! La mappa non proteggeva quella rotta. −15 ⭐ · −€ 150");
    if (state.rep <= 0) gameOver("La corona ha revocato il privilegio della gilda: troppe anime perdute per mappe negligenti.");
  }

  /* ===== Spedizioni ===== */
  function launchExpedition(x, y) {
    var cost = Math.round(EXP_BASE_COST + Math.sqrt(dist2(x, y, W / 2, H / 2)) * 0.12);
    if (state.money < cost) { Sound.error(); toast("Cassa insufficiente: " + fmtE(cost)); return; }
    state.money -= cost;
    var port = state.truth.filter(function (f) { return f.port; })[0];
    state.expeditions.push({ x: x, y: y, cx: port.x, cy: port.y, phase: "sail", t: 0 });
    Sound.horn();
    state.target = null;
    renderDock();
  }
  function updateExpeditions(dt) {
    for (var i = state.expeditions.length - 1; i >= 0; i--) {
      var ex = state.expeditions[i];
      if (ex.phase === "sail") {
        var dx = ex.x - ex.cx, dy = ex.y - ex.cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        reveal(ex.cx, ex.cy, 70);
        if (d > 10) {
          var sp = EXP_SPEED * dt;
          ex.cx += (dx / d) * Math.min(sp, d);
          ex.cy += (dy / d) * Math.min(sp, d);
          reveal(ex.cx, ex.cy, 85);
        } else {
          ex.phase = "survey";
          ex.t = 0;
          reveal(ex.x, ex.y, SURVEY_R + 40);
          Sound.found();
        }
      } else if (ex.phase === "survey") {
        ex.t += dt;
        reveal(ex.x + Math.cos(ex.t * 2) * 60, ex.y + Math.sin(ex.t * 2) * 60, 60);
        if (ex.t >= 4) {
          var feats = state.truth.filter(function (f) {
            return dist2(f.x, f.y, ex.x, ex.y) < SURVEY_R * SURVEY_R;
          });
          state.surveys.push({ x: ex.x, y: ex.y, features: feats });
          if (!SEEN_DRAGON && ex.x > W * 0.7 && ex.y > H * 0.65) { SEEN_DRAGON = true; toast("🐉 HIC SVNT DRACONES… o forse no."); }
          state.expeditions.splice(i, 1);
          Sound.found();
          toast("🗺️ Spedizione rientrata: il bozzo attende trascrizione.");
        }
      }
    }
    // trascrizione in coda
    state.crew.forEach(function (c) {
      if (c.busy || !state.queue.length) return;
      c.busy = state.queue.shift();
      c.tt = TRANSCRIBE_T;
    });
    state.crew.forEach(function (c) {
      if (!c.busy) return;
      c.tt -= dt;
      if (Math.random() < 0.06) Sound.quill();
      if (c.tt <= 0) {
        var added = applyTranscription(c.busy, c.skill);
        c.busy = null;
        Sound.quill();
        toast("🖋️ Trascrizione finita: " + added + " segni sul foglio (collaudo non incluso…)");
      }
    });
  }

  /* ===== Contratti (daily seed) ===== */
  function ensureContracts() {
    var today = R2.dailySeed();
    if (state.dailySeed === today) return;
    state.dailySeed = today;
    var repMult = 0.6 + state.rep / 100 * 0.9;
    state.contracts = [
      {
        type: "survey",
        x: rand(240, W - 240), y: rand(200, H - 200), r: 240,
        need: 0.55, reward: Math.round(260 * repMult),
        deadline: Date.now() + 3 * state.dayLen * 1000,
        title: "Mappa la baia segnalata",
      },
      {
        type: "editions", need: 4, reward: Math.round(200 * repMult),
        deadline: Date.now() + 4 * state.dayLen * 1000,
        title: "Vendi 4 edizioni della mappa",
      },
    ];
    save();
  }
  function updateContracts() {
    var now = Date.now();
    state.contracts = state.contracts.filter(function (c) {
      if (c.deadline < now) {
        state.rep = clamp(state.rep - 12, 0, 100);
        toast("📜 Incarico scaduto: −12 ⭐");
        return false;
      }
      if (c.type === "survey") {
        var done = 0, total = 0;
        for (var j = Math.floor((c.y - c.r) / FOG); j <= Math.floor((c.y + c.r) / FOG); j++) {
          for (var i = Math.floor((c.x - c.r) / FOG); i <= Math.floor((c.x + c.r) / FOG); i++) {
            if (i < 0 || j < 0 || i >= FOGC || j >= FOGR) continue;
            total++;
            if (state.fog[j * FOGC + i]) done++;
          }
        }
        if (total > 0 && done / total >= c.need) {
          state.money += c.reward;
          state.totalEarned += c.reward;
          state.rep = clamp(state.rep + 10, 0, 100);
          Sound.coin();
          toast("📜 Incarico completato: +" + fmtE(c.reward));
          return false;
        }
      }
      if (c.type === "editions" && state.editionsSold >= c.need) {
        state.money += c.reward;
        state.totalEarned += c.reward;
        state.rep = clamp(state.rep + 10, 0, 100);
        state.editionsSold -= c.need;
        Sound.coin();
        toast("📜 Incarico completato: +" + fmtE(c.reward));
        return false;
      }
      return true;
    });
  }

  /* ===== Game over ===== */
  function gameOver(msg) {
    if (state.over) return;
    state.over = true;
    Sound.die();
    var best = Number(localStorage.getItem("nebbia-best") || 0);
    if (state.totalEarned > best) { localStorage.setItem("nebbia-best", String(Math.floor(state.totalEarned))); best = Math.floor(state.totalEarned); }
    R2.saveJSON("nebbia-pwa", { highScore: Math.floor(state.totalEarned) });
    showModal("FINE DELLA GILDA", msg + "<br><br>Ricavi totali: <b>" + fmtE(state.totalEarned) + "</b> (record: " + fmtE(best) + ")<br>Giornate: <b>" + state.day + "</b>",
      [{ t: "📜 Nuova gilda", f: function () { location.reload(); }, primary: true }]);
  }

  /* ===== Render ===== */
  function drawCompass(c, x, y, r) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = "rgba(74,58,38,0.55)";
    c.fillStyle = "rgba(74,58,38,0.55)";
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(0, 0, r, 0, 6.2832);
    c.stroke();
    for (var k = 0; k < 8; k++) {
      var a = k * Math.PI / 4;
      var L = k % 2 === 0 ? r : r * 0.55;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.sin(a) * L, -Math.cos(a) * L);
      c.stroke();
    }
    c.fillStyle = "#b3382c";
    c.beginPath();
    c.moveTo(0, -r); c.lineTo(5, 0); c.lineTo(0, 0);
    c.closePath(); c.fill();
    c.font = "bold " + Math.round(r * 0.32) + "px serif";
    c.textAlign = "center";
    c.fillText("N", 0, -r - 4);
    c.restore();
  }

  function drawShipShape(c, x, y, ang, color, wrecked) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    if (wrecked) { c.rotate(0.5); c.globalAlpha = 0.75; }
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(11, 0);
    c.quadraticCurveTo(2, -6, -9, -3.4);
    c.lineTo(-11, 0);
    c.lineTo(-9, 3.4);
    c.quadraticCurveTo(2, 6, 11, 0);
    c.fill();
    c.strokeStyle = "rgba(20,14,8,0.8)";
    c.lineWidth = 1.2;
    c.stroke();
    if (!wrecked) {
      c.fillStyle = "#f6eedd";
      c.beginPath();
      c.moveTo(-1, -1.4);
      c.lineTo(-1, -10);
      c.lineTo(4.4, -1.4);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = "#ede3cc";
    ctx.fillRect(0, 0, view.w, view.h);
    if (grainPat) { ctx.fillStyle = grainPat; ctx.fillRect(0, 0, view.w, view.h); }
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    if (state.shake > 0) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
      state.shake = Math.max(0, state.shake - 0.3);
    }
    ctx.strokeStyle = "#4a3a26";
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    var revealedSea = [];
    for (var j = 0; j < FOGR; j++) {
      for (var i = 0; i < FOGC; i++) {
        if (state.fog[j * FOGC + i]) {
          revealedSea.push([i * FOG, j * FOG]);
          ctx.fillStyle = "rgba(147,170,180,0.13)";
          ctx.fillRect(i * FOG, j * FOG, FOG, FOG);
        }
      }
    }
    ctx.strokeStyle = "rgba(74,58,38,0.3)";
    ctx.lineWidth = 1;
    revealedSea.forEach(function (c, k) {
      if (k % 3 !== 0) return;
      var wx = c[0] + 25 + Math.sin(state.time + k) * 4;
      var wy = c[1] + 30;
      ctx.beginPath();
      ctx.arc(wx, wy, 7, 3.4, 6.0);
      ctx.stroke();
    });
    state.marks.forEach(function (m) {
      if (!fogVisible(m.x, m.y)) return;
      if (m.type === "island") {
        ctx.fillStyle = "#d8c89a";
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.r, m.r * 0.72, 0.3, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = "#4a3a26";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (m.port) {
          ctx.fillStyle = "#8a6d3b";
          ctx.fillRect(m.x - 7, m.y - 4, 6, 6);
          ctx.fillRect(m.x + 2, m.y - 6, 6, 8);
          ctx.fillStyle = "#4a3a26";
          ctx.font = "10px serif";
          ctx.textAlign = "center";
          ctx.fillText(m.name || "Porto", m.x, m.y + m.r * 0.72 + 12);
        }
      } else if (m.type === "rock") {
        ctx.strokeStyle = "#4a3a26";
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x - 4.4, m.y - 4.4); ctx.lineTo(m.x + 4.4, m.y + 4.4);
        ctx.moveTo(m.x + 4.4, m.y - 4.4); ctx.lineTo(m.x - 4.4, m.y + 4.4);
        ctx.stroke();
        ctx.lineCap = "butt";
      } else {
        ctx.strokeStyle = "rgba(74,58,38,0.65)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([2.4, 3]);
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.r, m.r * 0.62, 0, 0, 6.2832);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    state.wrecks.forEach(function (w) {
      if (!fogVisible(w.x, w.y)) return;
      drawShipShape(ctx, w.x, w.y, 0.8, "#7a6a50", true);
      ctx.strokeStyle = "#b3382c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w.x - 8, w.y - 8); ctx.lineTo(w.x + 8, w.y + 8);
      ctx.moveTo(w.x + 8, w.y - 8); ctx.lineTo(w.x - 8, w.y + 8);
      ctx.stroke();
    });
    state.expeditions.forEach(function (ex) {
      ctx.strokeStyle = "rgba(74,58,38,0.5)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ex.cx, ex.cy);
      ctx.lineTo(ex.x, ex.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (ex.phase === "survey") {
        ctx.strokeStyle = "rgba(179,56,44,0.5)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, SURVEY_R, 0, 6.2832);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawShipShape(ctx, ex.cx, ex.cy, Math.atan2(ex.y - ex.cy, ex.x - ex.cx), "#4a3a26", false);
    });
    state.ships.forEach(function (sh) {
      ctx.strokeStyle = "rgba(74,58,38,0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(sh.a.x, sh.a.y);
      ctx.lineTo(sh.b.x, sh.b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      drawShipShape(ctx, sh.x, sh.y, Math.atan2(sh.b.y - sh.y, sh.b.x - sh.x), sh.color, false);
    });
    if (state.target) {
      ctx.strokeStyle = state.target.mode === "exp" ? "rgba(74,58,38,0.8)" : "rgba(30,142,62,0.8)";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(state.target.x, state.target.y, state.target.mode === "exp" ? 60 : SURVEY_R, 0, 6.2832);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawCompass(ctx, W - 96, 96, 42);
    if (!SEEN_DRAGON && !fogVisible(W - 150, H - 130)) {
      ctx.fillStyle = "rgba(74,58,38,0.5)";
      ctx.font = "italic 15px serif";
      ctx.textAlign = "center";
      ctx.fillText("HIC SVNT DRACONES", W - 160, H - 110);
    }
    Particles.draw(ctx);
    ctx.restore();
  }

  /* ===== Dock ===== */
  function renderDock() {
    var dock = $("dock");
    var html = "";
    if (state.target) {
      html = '<div class="dockrow"><span class="docktitle">' +
        (state.target.mode === "exp" ? "⛵ Tocca il mare da esplorare" : "🔍 Tocca l'area da verificare") + "</span>" +
        '<button class="btn" data-act="canceltarget">✕ Annulla</button></div>';
    } else {
      html = '<div class="dockrow">' +
        '<button class="btn primary" data-act="exp">⛵ Spedizione · ' + fmtE(EXP_BASE_COST) + "+</button>" +
        '<button class="btn" data-act="verify">🔍 Verifica · ' + fmtE(VERIFY_COST) + "</button>" +
        '<button class="btn" data-act="crew">🧑‍🎨 Cartografi (' + state.crew.length + ")</button>" +
        '<button class="btn" data-act="sales">🗺️ Vendite</button></div>' +
        '<div class="dockinfo">Copertura: <b>' + coverage() + "%</b> · navi in mare: <b>" + state.ships.length +
        "</b> · relitti: <b>" + state.wrecks.length + "</b> · edizioni vendute: <b>" + state.editionsSold + "</b> · bozzi in coda: <b>" + state.queue.length + "</b></div>";
    }
    dock.innerHTML = html;
    $("dock").querySelectorAll("[data-act]").forEach(function (el) {
      el.addEventListener("click", function () {
        var act = el.dataset.act;
        if (act === "exp") { state.target = { mode: "exp" }; renderDock(); }
        else if (act === "verify") { state.target = { mode: "verify" }; renderDock(); }
        else if (act === "canceltarget") { state.target = null; renderDock(); }
        else if (act === "crew") showCrew();
        else if (act === "sales") showSales();
      });
    });
  }

  function showCrew() {
    var html = "";
    state.crew.forEach(function (c, i) {
      html += '<div class="crewrow"><span>' + c.name + "</span>" +
        '<span class="skillbar"><i style="width:' + Math.round(c.skill * 100) + '%"></i></span>' +
        (c.busy ? "<span>✍️ scrive…</span>" : "<span>in attesa</span>") +
        (i === 0 ? "" : '<button class="mbtn" data-act="fire" data-i="' + i + '">Licenzia</button>') + "</div>";
    });
    var candidates = [];
    var names = ["Battista", "Maestro Giudeo", "Frate Luca", "Anselmo", "Colombo"];
    for (var i = 0; i < 2; i++) {
      var sk = rand(0.35, 0.92);
      candidates.push({ name: names[Math.floor(rand(0, names.length))], skill: sk, cost: Math.round(100 + sk * 380) });
    }
    candidates.forEach(function (c, i) {
      html += '<div class="crewrow"><span>' + c.name + " · abilità " + Math.round(c.skill * 100) + "%</span>" +
        '<button class="mbtn" data-act="hire" data-i="' + i + '">' + fmtE(c.cost) + "</button></div>";
    });
    state.hiring = candidates;
    html += '<div class="dockinfo">La trascrizione applica gli errori: abilità alta = meno segni spostati, omessi e fantasmi.</div>';
    showModal("🧑‍🎨 Cartografi della gilda", html,
      [{ t: "Chiudi", f: hideModal, ghost: true }]);
    $("m-btns").querySelectorAll("[data-act]").forEach(function (el) {
      el.addEventListener("click", function () {
        if (el.dataset.act === "fire") {
          var idx = Number(el.dataset.i);
          if (state.crew.length > 1) state.crew.splice(idx, 1);
          hideModal(); showCrew();
        } else if (el.dataset.act === "hire") {
          var c = state.hiring[Number(el.dataset.i)];
          if (state.money < c.cost || state.crew.length >= 3) { Sound.error(); return; }
          state.money -= c.cost;
          state.crew.push({ name: c.name, skill: c.skill, busy: null, tt: 0 });
          Sound.buy();
          hideModal(); showCrew();
        }
      });
    });
  }

  function showSales() {
    var repF = 0.6 + state.rep / 100 * 0.7;
    var rate = (12 / clamp(state.price / 45, 0.4, 2.4) / repF).toFixed(1);
    showModal("🗺️ Vendite di mappe",
      '<div class="pricebox">Prezzo edizione: <b>€ ' + state.price + '</b>' +
      '<input type="range" id="price" min="20" max="110" step="5" value="' + state.price + '"></div>' +
      '<div class="body">Navi stimate: <b>~' + rate + "</b> al minuto<br>" +
      "Edizioni vendute: <b>" + state.editionsSold + "</b><br>" +
      "Prezzo alto = poche navi. Ogni nave compra l'ultima edizione e naviga <b>sulle tue segnalazioni</b>: segni corretti la proteggono, segni sbagliati no.</div>",
      [{ t: "Chiudi", f: hideModal, ghost: true }]);
    var pr = document.getElementById("price");
    pr.addEventListener("input", function () {
      state.price = Number(pr.value);
      showSales();
    });
  }

  /* ===== Input ===== */
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - view.ox) / view.scale,
      y: (e.clientY - r.top - view.oy) / view.scale,
    };
  }
  function setupInput() {
    canvas.addEventListener("pointerdown", function (e) {
      if (state.over) return;
      var w = toWorld(e);
      if (state.target) {
        var wx = clamp(w.x, 60, W - 60), wy = clamp(w.y, 60, H - 60);
        if (state.target.mode === "exp") launchExpedition(wx, wy);
        else verifyArea(wx, wy);
        return;
      }
    });
  }

  /* ===== Loop ===== */
  var lastT = 0, shipT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0.016;
    lastT = t;
    if (!state.over) {
      state.time += dt;
      state.dayT += dt;
      if (state.dayT >= state.dayLen) {
        state.dayT -= state.dayLen;
        state.day++;
        state.money -= 15;
        Sound.season();
        toast("📜 Giornata " + state.day);
        if (state.money < -250) gameOver("Bancarotta: i creditori hanno venduto persino la scrivania.");
      }
      updateExpeditions(dt);
      updateShips(dt);
      updateContracts();
      shipT -= dt;
      if (shipT <= 0) {
        shipT = rand(7, 13);
        var repF = 0.6 + state.rep / 100 * 0.7;
        var prob = clamp(1.5 - state.price / 90, 0.15, 1) * repF;
        if (Math.random() < prob) spawnShip();
      }
    }
    Particles.update(dt);
    render();
    updateHUD();
    requestAnimationFrame(loop);
  }

  function updateHUD() {
    $("money").innerHTML = "€ <b>" + Math.round(state.money) + "</b>";
    $("rep").textContent = state.rep;
    $("coverage").textContent = coverage();
    $("daychip").textContent = "📜 Giornata " + state.day;
  }

  function resize() {
    var stage = $("stage");
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    view.scale = Math.min(view.w / (W + 80), view.h / (H + 80));
    view.ox = (view.w - W * view.scale) / 2;
    view.oy = (view.h - H * view.scale) / 2;
  }

  /* ===== Modal ===== */
  function showModal(title, bodyHTML, btns) {
    $("m-title").textContent = title;
    $("m-body").innerHTML = bodyHTML;
    var bx = $("m-btns");
    bx.innerHTML = "";
    btns.forEach(function (b) {
      var el = document.createElement("button");
      el.className = "mbtn" + (b.primary ? " primary" : "");
      el.innerHTML = b.t;
      el.addEventListener("click", function () { hideModal(); if (b.f) b.f(); });
      bx.appendChild(el);
    });
    $("modal").classList.remove("hidden");
  }
  function hideModal() { $("modal").classList.add("hidden"); }

  function showStart() {
    showModal("NEBBIA — gilda dei cartografi",
      "Seicento. Il continente è <b>nella nebbia</b> e la tua carta ha <b>errori di trascrizione</b>: segni spostati, scogli omessi, pericoli inventati.<br><br>" +
      "• <b>⛵ Spedizione</b>: esplora il foglio e riporta un bozzo da trascrivere<br>" +
      "• I <b>cartografi</b> trascrivono: l'abilità decide quanti errori commettono<br>" +
      "• Le <b>navi dei clienti</b> comprano l'ultima edizione e navigano <b>sui tuoi segni</b>: segni giusti le proteggono, segni sbagliati le affondano<br>" +
      "• Ogni <b>naufragio</b>: −15 ⭐ e −€ 150 di risarcimento — ma l'inchiesta rivela la verità di quel punto<br>" +
      "• <b>🔍 Verifica</b>: paga per confrontare la mappa con la realtà in un'area e correggere<br><br>" +
      "Vendere in fretta genera cassa. Verificare genera verità. La reputazione è la vita della gilda.",
      [{ t: "📜 Apri la gilda", f: function () { hideModal(); }, primary: true }]);
  }

  function save() {
    R2.saveJSON("nebbia-pwa", { highScore: Math.floor(state.totalEarned), rep: state.rep });
  }

  function makeGrain() {
    var g = document.createElement("canvas");
    g.width = 256; g.height = 256;
    var c = g.getContext("2d");
    for (var i = 0; i < 500; i++) {
      c.fillStyle = "rgba(120,98,60," + rand(0.03, 0.09).toFixed(3) + ")";
      c.fillRect(rand(0, 256), rand(0, 256), rand(0.5, 1.8), rand(0.5, 1.8));
    }
    grainPat = ctx.createPattern(g, "repeat");
  }
  function setupHUD() {
    $("help-btn").addEventListener("click", showStart);
    var sbtn = $("sound-btn");
    sbtn.textContent = R2.getSettings().sound ? "🔊" : "🔇";
    sbtn.addEventListener("click", function () {
      var st = R2.setSettings({ sound: !R2.getSettings().sound });
      sbtn.textContent = st.sound ? "🔊" : "🔇";
    });
  }

  function init() {
    canvas = $("game");
    ctx = canvas.getContext("2d");
    initSound();
    resize();
    window.addEventListener("resize", resize);
    genWorld();
    makeGrain();
    state.crew = [{ name: "Maestro Anselmo", skill: 0.55, busy: null, tt: 0 }];
    setupInput();
    setupHUD();
    ensureContracts();
    renderDock();
    showStart();
    R2.trackPlaytime("nebbia-pwa/");
    R2.installHint();
    R2.markPlayed("nebbia-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
