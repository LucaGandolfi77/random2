/*
 * ACQUA — l'ingegnere degli acquedotti · la pendenza è la meccanica
 * Tracci canali sul terreno, archi sui valli, cunicoli sotto le colline.
 * Sim idraulica onesta: portata = min delle capacità di segmento;
 * pendenza troppo piana = ristagno, troppo ripida = erosione.
 * Canvas 2D, profilo altimetrico 1D, zero asset.
 */
(function () {
  "use strict";

  /* ===== Config ===== */
  var W = 1720, H_ELEV = 640;          // larghezza mondo, range quote
  var DAY = 180;                        // secondi per stagione
  var SOURCE_FLOW = 12;
  var IDEAL_MIN = 0.09, IDEAL_MAX = 0.35;
  var SLOW_MIN = 0.04, FAST_MAX = 0.55;
  var ARCH_MAX_PILLAR = 130, TUNNEL_DEPTH = 90;
  var COST_GROUND = 1.2, COST_ARCH = 2.0, COST_TUNNEL = 3.0, PILLAR_COST = 0.5;

  var state = {
    money: 400, nodes: [], segs: [], buildings: [],
    year: 1, yearT: 0, season: 0,
    flow: 0, demand: 0, satisfaction: 1,
    drought: 0, droughtNext: 60,
    ghost: null,
    selSeg: -1, over: false, shake: 0,
    time: 0, totalWater: 0, discontent: 0,
    seed: 0, growT: 0,
  };
  var terrainPts = [];
  var canvas, ctx;
  var view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  var Sound, Particles;
  var toastT = null;
  var press = null;

  /* ===== Utils ===== */
  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.add("hidden"); }, 3000);
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function fmtE(n) { var neg = n < 0; n = Math.round(Math.abs(n)); return (neg ? "−€ " : "€ ") + n; }
  function fmtNum(n) { return Math.round(n).toLocaleString("it-IT"); }
  function terrainAt(x) {
    x = clamp(x, 0, W);
    for (var i = 1; i < terrainPts.length; i++) {
      if (x <= terrainPts[i].x) {
        var a = terrainPts[i - 1], b = terrainPts[i];
        return lerp(a.e, b.e, (x - a.x) / (b.x - a.x || 1));
      }
    }
    return terrainPts[terrainPts.length - 1].e;
  }
  function yOf(e) { return H_ELEV - e; }

  /* ===== Sound ===== */
  function initSound() {
    Sound = R2.makeSound({
      place:  [330, 0.1, "triangle"],
      build:  [200, 0.12, "square"],
      coin:   [740, 0.09, "sine"],
      error:  [110, 0.15, "sawtooth"],
      crack:  [1400, 0.12, "sawtooth"],
      fix:    [520, 0.1, "sine"],
      die:    [80, 0.6, "sine"],
      season: [440, 0.15, "sine"],
    });
    Particles = R2.makeParticles();
  }

  /* ===== Terreno (daily seed) ===== */
  function genTerrain() {
    var rng = R2.mulberry32(state.seed);
    function rr(a, b) { return a + rng() * (b - a); }
    var hillRise = rng() < 0.5 ? 22 : 150;   // collina bassa (arco) o alta (cunicolo obbligato)
    terrainPts = [
      { x: 0, e: 540 },
      { x: 120, e: 540 },
      { x: 480, e: 386 },
      { x: 560, e: 372 },
      { x: 780, e: 362 },
      { x: 1000, e: 330 },
      { x: 1140, e: 330 + hillRise },
      { x: 1300, e: 330 + hillRise - 58 },
      { x: 1450, e: 330 + hillRise - 105 },
      { x: 1600, e: 170 },
      { x: W, e: 162 },
    ];
    for (var i = 1; i < terrainPts.length - 1; i++) {
      terrainPts[i].e += Math.sin(i * 12.9898 + state.seed) * 5;
    }
  }

  /* ===== Nodi & segmenti ===== */
  function lastNode() { return state.nodes[state.nodes.length - 1]; }
  function makeNode(x, e, type) {
    var n = { x: x, e: e, type: type };
    state.nodes.push(n);
    if (state.nodes.length > 1) {
      var prev = state.nodes[state.nodes.length - 2];
      var len = Math.hypot(x - prev.x, e - prev.e);
      var seg = {
        ax: prev.x, ay: prev.e, bx: x, by: e,
        len: len, slope: (prev.e - e) / (x - prev.x), type: type,
        health: 1, stagn: 0, eros: 0, broken: false,
      };
      if (type === "ground") {
        var lo = 1e9, hi = -1e9;
        for (var k = 1; k < 8; k++) {
          var xm = lerp(prev.x, x, k / 8);
          var pm = lerp(prev.x, x, (k - 1) / 8);
          var ls = (terrainAt(pm) - terrainAt(xm)) / (xm - pm || 1);
          lo = Math.min(lo, ls); hi = Math.max(hi, ls);
        }
        seg.localLo = lo; seg.localHi = hi;
      }
      state.segs.push(seg);
    }
    return n;
  }
  function capFactor(seg) {
    var s = seg.slope, f;
    if (s < SLOW_MIN) f = 0.12;
    else if (s < IDEAL_MIN) f = 0.55;
    else if (s <= IDEAL_MAX) f = 1;
    else if (s <= FAST_MAX) f = 0.85;
    else f = Math.max(0.3, 0.75 - (s - FAST_MAX) * 0.6);
    if (seg.type === "ground" && seg.localHi !== undefined) {
      if (seg.localHi > FAST_MAX) f *= 0.85;
      if (seg.localLo < SLOW_MIN) f *= 0.8;
    }
    return f * seg.health * (seg.broken ? 0.1 : 1) * (1 - seg.stagn * 0.5) * (1 - seg.eros * 0.5);
  }
  function recomputeFlow() {
    var drought = state.drought > 0 ? 0.5 : 1;
    var flow = SOURCE_FLOW * drought;
    state.segs.forEach(function (seg) {
      flow = Math.min(flow, SOURCE_FLOW * drought * capFactor(seg));
      if (seg.slope < SLOW_MIN) seg.stagn = Math.min(1, seg.stagn + 0.02);
      else seg.stagn = Math.max(0, seg.stagn - 0.05);
      if (seg.slope > FAST_MAX) seg.eros = Math.min(1, seg.eros + 0.015);
      else seg.eros = Math.max(0, seg.eros - 0.04);
    });
    state.flow = flow;
  }
  function degrade(dt) {
    state.segs.forEach(function (seg) {
      var rate = 0.0022;
      if (seg.slope > FAST_MAX) rate += 0.006;
      if (seg.slope < SLOW_MIN) rate += 0.004;
      seg.health = Math.max(0.35, seg.health - rate * dt);
    });
  }

  /* ===== Città ===== */
  var BLD = [
    { key: "fontana", name: "Fontana", emoji: "⛲", demand: 2 },
    { key: "insula",  name: "Insula",  emoji: "🏠", demand: 1 },
    { key: "taverna", name: "Taverna", emoji: "🍷", demand: 1.5 },
    { key: "terme",   name: "Terme",   emoji: "♨️", demand: 5 },
  ];
  var BNAMES = ["Clodia", "Giulia", "Aurelia", "Flavia", "Camilla", "Prisca", "Larga", "Sulpicia"];

  function castellum() { return lastNode(); }
  function castDone() { return state.nodes.length > 1 && lastNode().type === "castellum"; }
  function updateCity(dt) {
    state.demand = 0;
    state.buildings.forEach(function (b) { state.demand += b.demand; });
    var served = Math.min(state.flow, state.demand);
    state.satisfaction = state.demand > 0 ? clamp(state.flow / state.demand, 0, 1) : 1;
    // reddito dal servizio
    state.money += served * 0.4 * dt;
    state.totalWater += state.flow * dt;
    // crescita urbana: solo dopo il castellum
    if (castDone()) {
      state.growT += dt;
      var cast = castellum();
      if (state.growT > 11 && state.satisfaction > 0.72 && state.buildings.length < 24) {
        state.growT = 0;
        var t = BLD[Math.floor(rand(0, BLD.length))];
        var x = clamp(cast.x + rand(-130, 110), 1150, W - 30);
        state.buildings.push({ x: x, type: t, demand: t.demand, name: BNAMES[Math.floor(rand(0, BNAMES.length))] });
        Sound.build();
      }
    }
    // malcontento
    if (state.demand > 3 && state.satisfaction < 0.4) {
      state.discontent += dt;
      if (state.discontent > 45) gameOver("La città si è ribellata: anni di gocce a metà hanno stancato notabili e plebei. L'acquedotto è stato abbandonato.");
    } else state.discontent = Math.max(0, state.discontent - dt);
    if (state.money < -300) gameOver("Bancarotta: i creditori hanno pignorato fino alle fistole in piombo.");
  }
  function gameOver(msg) {
    if (state.over) return;
    state.over = true;
    Sound.die();
    var best = Number(localStorage.getItem("acqua-best") || 0);
    var score = Math.floor(state.totalWater / 10 + state.buildings.length * 20);
    if (score > best) { localStorage.setItem("acqua-best", String(score)); best = score; }
    R2.saveJSON("acqua-pwa", { highScore: best });
    showModal("FINE DELL'ACQUEDOTTO", msg +
      "<br><br>Acqua convogliata: <b>" + fmtNum(state.totalWater) + "</b><br>Edifici serviti: <b>" + state.buildings.length + "</b><br>Punteggio: <b>" + score + "</b> (record: " + best + ")",
      [{ t: "↺ Nuova sorgente", f: function () { location.reload(); }, primary: true }]);
  }

  /* ===== Eventi ===== */
  function updateEvents(dt) {
    if (state.drought > 0) { state.drought -= dt; if (state.drought <= 0) toast("🌧️ È ripiovuto sui monti: la sorgente riacquista."); }
    state.droughtNext -= dt;
    if (state.droughtNext <= 0) {
      state.droughtNext = rand(50, 110);
      if (Math.random() < 0.55) {
        state.drought = rand(30, 55);
        toast("☀️ Siccità: la sorgente è a metà portata!");
      }
    }
    if (Math.random() < 0.0012) {
      var worn = state.segs.filter(function (s) { return s.health < 0.75 && !s.broken; });
      if (worn.length) {
        var s2 = worn[Math.floor(rand(0, worn.length))];
        s2.broken = true;
        Sound.crack();
        state.shake = 5;
        toast("💥 Rottura! Un segmento logoro ha ceduto: toccalo e riparalo.");
        recomputeFlow();
      }
    }
  }

  /* ===== Input & costruzione ===== */
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - view.ox) / view.scale,
      y: H_ELEV - (e.clientY - r.top - view.oy) / view.scale,
    };
  }
  function nodeTypeFor(x, e) {
    var t = terrainAt(x);
    if (e > t + 14) return e <= t + ARCH_MAX_PILLAR ? "arch" : null;
    if (e < t - 14) return e >= t - TUNNEL_DEPTH ? "tunnel" : null;
    return "ground";
  }
  function segmentValid(type, ax, ay, bx, by) {
    var steps = 8;
    for (var k = 1; k <= steps; k++) {
      var xm = lerp(ax, bx, k / steps), em = lerp(ay, by, k / steps);
      var t = terrainAt(xm);
      if (type === "arch" && em < t - 2) return { ok: false, why: "L'arco sprofonda nella collina: scegli una quota più alta." };
      if (type === "tunnel" && em > t - 5) return { ok: false, why: "Il cunicolo sbuca dal terreno: passa più a fondo." };
      if (type === "arch" && em > t + ARCH_MAX_PILLAR) return { ok: false, why: "Pilastri troppo alti (max " + ARCH_MAX_PILLAR + ")." };
      if (type === "tunnel" && em < t - TUNNEL_DEPTH) return { ok: false, why: "Cunicolo troppo profondo (max " + TUNNEL_DEPTH + " sotto il livello)." };
    }
    return { ok: true };
  }
  function buildCost(x1, e1, x2, e2, type) {
    var len = Math.hypot(x2 - x1, e2 - e1);
    var cost = len * (type === "ground" ? COST_GROUND : type === "arch" ? COST_ARCH : COST_TUNNEL);
    if (type === "arch") {
      for (var k = 1; k < 8; k++) {
        var xm = lerp(x1, x2, k / 8);
        var em = lerp(e1, e2, k / 8);
        cost += Math.max(0, em - terrainAt(xm)) * PILLAR_COST;
      }
    }
    return Math.round(cost);
  }
  function setupInput() {
    canvas.addEventListener("pointerdown", function (e) {
      if (state.over) return;
      var w = toWorld(e);
      if (state.nodes.length === 0) return;
      var last = lastNode();
      if (castDone()) { toast("🏛️ Il castellum chiude l'acquedotto."); return; }
      if (w.x <= last.x + 26) { toast("Il canale avanza sempre verso destra."); return; }
      press = { x: w.x, y: w.y };
      state.ghost = { x: w.x, y: w.y };
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!press) return;
      var w = toWorld(e);
      state.ghost = { x: w.x, y: w.y };
    });
    canvas.addEventListener("pointerup", function (e) {
      if (!press) return;
      var w = toWorld(e);
      press = null;
      placeAt(w);
    });
    canvas.addEventListener("pointercancel", function () { press = null; state.ghost = null; });
  }
  function placeAt(w) {
    state.ghost = null;
    var last = lastNode();
    if (castDone()) return;
    var x = clamp(Math.round(w.x), last.x + 30, W - 24);
    var te = terrainAt(x);
    var e = clamp(w.y, te - TUNNEL_DEPTH, te + ARCH_MAX_PILLAR);
    var type = nodeTypeFor(x, e);
    if (!type) { Sound.error(); toast("Quota irraggiungibile: pilastri o profondità oltre limite."); return; }
    if (type === "ground") e = te;
    if (type === "arch") e = clamp(e, te + 6, te + ARCH_MAX_PILLAR);
    if (type === "tunnel") e = clamp(e, te - TUNNEL_DEPTH, te - 6);
    var slope = (last.e - e) / (x - last.x);
    if (slope < 0.018) { Sound.error(); toast("⚠️ L'acqua non sale: pendenza " + slope.toFixed(2) + " troppo bassa."); return; }
    var valid = segmentValid(type, last.x, last.e, x, e);
    if (!valid.ok) { Sound.error(); toast("⚠️ " + valid.why); return; }
    var cost = buildCost(last.x, last.e, x, e, type);
    if (state.money < cost) { Sound.error(); toast("Cassa insufficiente: " + fmtE(cost)); return; }
    state.money -= cost;
    makeNode(x, e, type);
    if (type === "arch" || type === "tunnel") Sound.build(); else Sound.place();
    R2.buzz(8);
    if (slope > FAST_MAX) toast("⚠️ Pendenza " + slope.toFixed(2) + ": l'acqua scorre veloce ma eroderà il canale.");
    else if (slope < IDEAL_MIN) toast("⚠️ Pendenza " + slope.toFixed(2) + ": lenta, rischio ristagno e sabbione.");
    else toast("💧 Pendenza " + slope.toFixed(2) + ": regime ideale.");
    recomputeFlow();
    renderDock();
    save();
  }

  /* ===== Render ===== */
  function drawArchRow(x1, x2, yTop) {
    var span = x2 - x1;
    var n = Math.max(1, Math.round(span / 52));
    var pw = span / n;
    for (var i = 0; i <= n; i++) {
      var px = x1 + i * pw;
      var tg = terrainAt(clamp(px, 0, W));
      var byy = yOf(tg);
      ctx.fillStyle = "#d9cba8";
      ctx.fillRect(px - 6, byy, 12, yTop - byy);
      ctx.strokeStyle = "#8a6d3b";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(px - 6, byy, 12, yTop - byy);
    }
    ctx.strokeStyle = "#b57b12";
    ctx.lineWidth = 3;
    for (var a = 0; a < n; a++) {
      var ax1 = x1 + a * pw, ax2 = x1 + (a + 1) * pw;
      var mid = (ax1 + ax2) / 2;
      var rise = Math.min(14, (yTop - yOf(terrainAt(mid))) * 0.5);
      if (rise < 3) continue;
      ctx.beginPath();
      ctx.moveTo(ax1, yTop + 2);
      ctx.quadraticCurveTo(ax1, yTop - rise, ax1 + pw / 2, yTop - rise);
      ctx.quadraticCurveTo(ax2, yTop - rise, ax2, yTop + 2);
      ctx.stroke();
    }
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    var sky = ctx.createLinearGradient(0, 0, 0, view.h);
    sky.addColorStop(0, state.drought > 0 ? "#e8d9b0" : "#cfe3ea");
    sky.addColorStop(1, "#e8f0e2");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);

    // terreno
    ctx.beginPath();
    ctx.moveTo(0, H_ELEV + 90);
    terrainPts.forEach(function (p) { ctx.lineTo(p.x, yOf(p.e)); });
    ctx.lineTo(W, H_ELEV + 90);
    ctx.closePath();
    var tg = ctx.createLinearGradient(0, yOf(540), 0, yOf(0));
    tg.addColorStop(0, "#a68b5b"); tg.addColorStop(1, "#7d9a52");
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.strokeStyle = "#6d5a35";
    ctx.lineWidth = 2;
    ctx.stroke();

    // segmenti
    state.segs.forEach(function (seg) {
      var y1 = yOf(seg.ay), y2 = yOf(seg.by);
      if (seg.type === "arch") {
        drawArchRow(seg.ax, seg.bx, y1);
      } else {
        ctx.strokeStyle = seg.broken ? "rgba(176,52,44,0.85)" : "rgba(90,74,40,0.9)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(seg.ax, y1);
        ctx.lineTo(seg.bx, y2);
        ctx.stroke();
        if (seg.type === "tunnel") {
          ctx.fillStyle = "#a68b5b";
          ctx.beginPath();
          ctx.moveTo(seg.ax, y1);
          for (var k = 1; k <= 8; k++) {
            var xm = lerp(seg.ax, seg.bx, k / 8);
            ctx.lineTo(xm, yOf(terrainAt(xm)));
          }
          ctx.lineTo(seg.bx, y2);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (state.flow > 0.4 && !seg.broken) {
        var flowFrac = state.flow / Math.max(SOURCE_FLOW, 1);
        ctx.strokeStyle = "rgba(58,124,168,0.9)";
        ctx.lineWidth = 3.4;
        ctx.setLineDash([9, 13]);
        ctx.lineDashOffset = -state.time * (30 + flowFrac * 60);
        ctx.beginPath();
        ctx.moveTo(seg.ax, y1 + 1.5);
        ctx.lineTo(seg.bx, y2 + 1.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }
      var mx = (seg.ax + seg.bx) / 2, my = (y1 + y2) / 2;
      var col = seg.slope < SLOW_MIN ? "#3a7ca8" : (seg.slope < IDEAL_MIN ? "#b57b12" :
        (seg.slope <= IDEAL_MAX ? "#1e8e3e" : (seg.slope <= FAST_MAX ? "#b57b12" : "#b0342c")));
      ctx.fillStyle = col;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("p " + seg.slope.toFixed(2) + (seg.stagn > 0.3 ? " ⚠︎ristagno" : "") + (seg.eros > 0.3 ? " ⚠︎erosione" : ""), mx, my - 10);
      if (seg.broken) {
        ctx.fillStyle = "#b0342c";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("ROTTO — ripara", mx, my + 16);
      }
    });

    // nodi
    state.nodes.forEach(function (n) {
      var y = yOf(n.e);
      if (n.type === "source") {
        ctx.fillStyle = "#8a6d3b";
        ctx.fillRect(n.x - 14, y - 26, 28, 26);
        ctx.fillStyle = "#3a7ca8";
        ctx.beginPath();
        ctx.arc(n.x, y - 2, 8, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(n.x - 2, y - 4, 2.6, 0, 6.2832);
        ctx.fill();
      } else if (n.type === "castellum") {
        ctx.fillStyle = "#e8dcc0";
        ctx.fillRect(n.x - 16, y - 34, 32, 34);
        ctx.strokeStyle = "#8a6d3b";
        ctx.lineWidth = 2;
        ctx.strokeRect(n.x - 16, y - 34, 32, 34);
        ctx.fillStyle = "#3a7ca8";
        ctx.fillRect(n.x - 10, y - 28, 20, 10);
      } else {
        circle(n.x, y, 6, "#8a6d3b");
      }
    });

    // edifici + fontane
    state.buildings.forEach(function (b, i) {
      var by = yOf(terrainAt(b.x));
      ctx.fillStyle = ["#d9cba8", "#cbb98e", "#e0d0aa"][i % 3];
      ctx.fillRect(b.x - 12, by - 22, 24, 22);
      ctx.strokeStyle = "#8a6d3b";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(b.x - 12, by - 22, 24, 22);
      ctx.beginPath();
      ctx.moveTo(b.x - 14, by - 22);
      ctx.lineTo(b.x, by - 32);
      ctx.lineTo(b.x + 14, by - 22);
      ctx.closePath();
      ctx.fillStyle = "#b57b5a";
      ctx.fill();
    });
    if (state.flow > 1 && state.satisfaction > 0.3) {
      state.buildings.forEach(function (b) {
        if (b.type.key !== "fontana") return;
        var fy = yOf(terrainAt(b.x));
        ctx.fillStyle = "rgba(58,124,168,0.8)";
        for (var d2 = 0; d2 < 3; d2++) {
          ctx.beginPath();
          ctx.arc(b.x + Math.sin(state.time * 5 + d2 * 2) * 3, fy - 8 - ((state.time * 30 + d2 * 9) % 14), 1.8, 0, 6.2832);
          ctx.fill();
        }
      });
    }

    // ghost costruzione
    if (state.ghost && state.nodes.length && !castDone()) {
      var last = lastNode();
      var gx = Math.max(state.ghost.x, last.x + 30);
      var gyE = clamp(state.ghost.y, terrainAt(gx) - TUNNEL_DEPTH, terrainAt(gx) + ARCH_MAX_PILLAR);
      var slope = (last.e - gyE) / (gx - last.x);
      var type = nodeTypeFor(gx, gyE) || "ground";
      var valid = segmentValid(type, last.x, last.e, gx, gyE);
      var cost = buildCost(last.x, last.e, gx, gyE, type);
      var gcol = !valid.ok ? "#b0342c" : (slope < IDEAL_MIN || slope > FAST_MAX ? "#b57b12" : "#1e8e3e");
      ctx.strokeStyle = gcol;
      ctx.lineWidth = 4;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.moveTo(last.x, yOf(last.e));
      ctx.lineTo(gx, yOf(gyE));
      ctx.stroke();
      ctx.setLineDash([]);
      circle(gx, yOf(gyE), 6, gcol);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = gcol;
      var typeName = type === "arch" ? "ARCO" : type === "tunnel" ? "CUNICOLO" : "CANALE";
      ctx.fillText(typeName + " · p " + slope.toFixed(2) + " · " + fmtE(cost) + (valid.ok ? "" : " ✕"), (last.x + gx) / 2, yOf(Math.max(last.e, gyE)) - 14);
    }
    Particles.draw(ctx);
    ctx.restore();
  }
  function circle(x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
  }

  /* ===== HUD & dock ===== */
  function updateHUD() {
    $("money").textContent = Math.round(state.money);
    $("flow").textContent = state.flow.toFixed(1);
    $("demand").textContent = state.demand.toFixed(1);
    $("pop").textContent = state.buildings.length;
    var seasons = ["Primavera", "Estate", "Autunno", "Inverno"];
    $("daychip").textContent = "📅 Anno " + state.year + " · " + seasons[state.season];
  }

  function renderDock() {
    var dock = $("dock");
    var html = "";
    if (state.selSeg >= 0 && state.segs[state.selSeg]) {
      var s = state.segs[state.selSeg];
      var repairCost = Math.round(40 + s.len * 0.1);
      html = '<div class="dockrow"><span class="docktitle">Segmento ' + (state.selSeg + 1) +
        " · " + s.type.toUpperCase() + "</span>" +
        '<button class="btn primary" data-act="repair">🔧 Ripaga · ' + fmtE(repairCost) + "</button>" +
        '<button class="btn ghost" data-act="closeseg">✕</button></div>' +
        '<div class="segline"></div>' +
        '<div class="dockinfo">Pendenza: <b>' + s.slope.toFixed(2) + "</b> · stato: <b>" + Math.round(s.health * 100) +
        "%</b> · capacità: <b>" + Math.round(capFactor(s) * 100) + "%</b>" +
        (s.stagn > 0.2 ? " · <b style='color:var(--water)'>ristagno/sabbione</b>" : "") +
        (s.eros > 0.2 ? " · <b style='color:var(--danger)'>erosione</b>" : "") +
        (s.broken ? " · <b style='color:var(--danger)'>ROTTO</b>" : "") + "</div>" +
        '<div class="legend"><span>ideale <b>0.09–0.35</b></span><span>lento <b>0.04–0.09</b></span><span>stagnazione <b>< 0.04</b></span><span>veloce <b>0.35–0.55</b></span><span>erosione <b>> 0.55</b></span></div>';
    } else if (state.nodes.length < 2) {
      html = '<div class="dockinfo">La <b>sorgente</b> è sul monte a sinistra. Traccia il primo segmento: <b>tocca e trascina</b> — sopra il terreno si costruisce un <b>arco</b>, sul terreno un <b>canale</b>, sotto la roccia un <b>cunicolo</b>.</div>';
    } else {
      var canFinish = castellum().x > 1100;
      html = '<div class="dockrow">' +
        '<button class="btn primary" data-act="castellum"' + (castDone() || !canFinish ? " disabled" : "") + '>🏛️ Termina al castellum' + (canFinish ? "" : " (porta l'acqua oltre il centro)") + "</button>" +
        '<button class="btn" data-act="repairmode">🔧 Ripara segmenti</button></div>' +
        '<div class="dockinfo">Trascina per costruire il prossimo segmento. <b>Sopra</b> il terreno = arco, <b>sul</b> terreno = canale, <b>sotto</b> = cunicolo. La portata è il <b>minimo</b> dei segmenti: un solo tratto stanco strozza tutto.</div>';
    }
    dock.innerHTML = html;
    $("dock").querySelectorAll("[data-act]").forEach(function (el) {
      el.addEventListener("click", function () {
        var act = el.dataset.act;
        if (act === "repair" && state.selSeg >= 0) {
          var s = state.segs[state.selSeg];
          var cost = Math.round(40 + s.len * 0.1);
          if (state.money < cost) { Sound.error(); toast("Cassa insufficiente"); return; }
          state.money -= cost;
          s.health = 1; s.broken = false; s.stagn = 0; s.eros = 0;
          Sound.fix();
          recomputeFlow();
          toast("🔧 Segmento riparato al 100%");
          save();
        }
        if (act === "closeseg") state.selSeg = -1;
        if (act === "castellum") placeCastellum();
        if (act === "repairmode") { state.selSeg = state.segs.length ? state.segs.length - 1 : -1; }
        renderDock();
      });
    });
  }
  function placeCastellum() {
    var last = lastNode();
    if (last.x < 1100) { toast("Porta l'acqua oltre il centro abitato (x > 1100)."); return; }
    last.type = "castellum";
    Sound.build();
    state.shake = 3;
    toast("🏛️ Castellum aquae completato: la città può crescere.");
    save();
    recomputeFlow();
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
  function modalOpen() { return !$("modal").classList.contains("hidden"); }

  function showStart() {
    showModal("ACQUA — l'ingegnere degli acquedotti",
      "Roma ha sete. La <b>sorgente</b> è sul monte: la città è nel vallone, in basso a destra.<br><br>" +
      "• <b>Tocca e trascina</b> per costruire segmenti dal punto precedente<br>" +
      "• <b>Sopra il terreno</b> si costruisce un <b>arco</b> (caro), <b>sul terreno</b> un <b>canale</b> (economico), <b>sotto</b> un <b>cunicolo</b> (carissimo)<br>" +
      "• La <b>pendenza</b> è tutto: ideale <b>0.09–0.35</b>. Troppo piano → ristagno e sabbione. Troppo ripido → erosione<br>" +
      "• La <b>portata è il minimo dei segmenti</b>: uno strozzato taglia tutto<br>" +
      "• I segmenti si <b>incrostano</b> col tempo: riparali toccandoli<br>" +
      "• Quando l'acqua arriva oltre il centro, <b>termina al castellum</b>: la città crescerà lì",
      [{ t: "💧 Prendi il cantiere", f: function () { hideModal(); }, primary: true }]);
  }

  /* ===== Loop ===== */
  var lastT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0.016;
    lastT = t;
    if (!state.over) {
      state.time += dt;
      state.yearT += dt;
      if (state.yearT >= DAY) {
        state.yearT -= DAY;
        state.season = (state.season + 1) % 4;
        if (state.season === 0) state.year++;
        Sound.season();
        toast("📅 " + ["Primavera", "Estate", "Autunno", "Inverno"][state.season] + " · Anno " + state.year);
      }
      recomputeFlow();
      degrade(dt);
      updateCity(dt);
      updateEvents(dt);
    }
    Particles.update(dt);
    render();
    updateHUD();
    requestAnimationFrame(loop);
  }

  function resize() {
    var stage = $("stage");
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    view.scale = Math.min(view.w / (W + 40), view.h / (H_ELEV + 120));
    view.ox = (view.w - W * view.scale) / 2;
    view.oy = (view.h - H_ELEV * view.scale) / 2 + 20;
  }

  function save() {
    var best = Number(localStorage.getItem("acqua-best") || 0);
    var score = Math.floor(state.totalWater / 10 + state.buildings.length * 20);
    if (score > best) { localStorage.setItem("acqua-best", String(score)); best = score; }
    R2.saveJSON("acqua-pwa", { highScore: best });
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
    state.seed = R2.dailySeed();
    genTerrain();
    resize();
    window.addEventListener("resize", resize);
    makeNode(60, terrainAt(60), "source");
    setupInput();
    setupHUD();
    renderDock();
    showStart();
    R2.trackPlaytime("acqua-pwa/");
    R2.installHint();
    R2.markPlayed("acqua-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
