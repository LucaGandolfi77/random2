/*
 * LINEA ROSSA — metro planner tycoon
 * Tracci linee, gestisci treni e tariffe, la città cresce dove la porti.
 * Domanda: gravity model · rotte: BFS sui gruppi di linee (≤ 2 interscambi) ·
 * economia continua con prestiti a interesse. Canvas 2D, zero asset.
 */
(function () {
  "use strict";

  /* ===== Config ===== */
  var W = 1700, H = 1700;
  var DAY = 150;                 // secondi reali per giornata cittadina
  var TRAIN_SPEED = 220;         // px/s
  var TRAIN_CAP = 120;           // passeggeri per treno
  var TRAIN_COST = 150;
  var STATION_BASE = 80;
  var TUNNEL_PER_PX = 0.9;
  var LOAN_INTEREST_DAY = 0.02;
  var MAX_LINES = 6;
  var MAX_DISTRICTS = 22;
  var PALETTE = ["#e0342c", "#2c7be0", "#22a55e", "#e8a924", "#9b59d0", "#e07d2c"];
  var LNAMES = ["Linea Rossa", "Linea Azzurra", "Linea Verde", "Linea Gialla", "Linea Viola", "Linea Arancio"];
  var NPRE = ["Porta ", "Borgo ", "Ponte ", "Campo ", "Villa ", "Piazza ", "Vico ", "Mura "];
  var NSUF = ["Nuova", "Vecchia", "Alta", "Stella", "Fiore", "Serena", "Lunga", "Rota", "Mare", "Colle"];

  var state = {
    money: 900, fare: 1.2, loan: 0,
    districts: [], lines: [],
    day: 1, tod: 0.08, time: 0,
    totalPax: 0, over: false,
    sel: null, build: null, finance: false,
    usedNames: {},
  };
  var canvas, ctx;
  var view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  var Sound, Particles;
  var toastT = null;
  var demandTimer = 0;

  /* ===== Utils ===== */
  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.add("hidden"); }, 2600);
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function fmtE(n) {
    var neg = n < 0; n = Math.round(Math.abs(n));
    return (neg ? "−€ " : "€ ") + n.toLocaleString("it-IT");
  }
  function fmtMoney(n) { return fmtE(n); }
  function fmtNum(n) { return Math.round(n).toLocaleString("it-IT"); }
  function fmtK(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n)); }

  /* ===== Sound ===== */
  function initSound() {
    Sound = R2.makeSound({
      station: [440, 0.1, "triangle"],
      tunnel:  [180, 0.15, "sawtooth"],
      train:   [520, 0.12, "square"],
      cash:    [740, 0.09, "sine"],
      error:   [110, 0.15, "sawtooth"],
      loan:    [260, 0.18, "triangle"],
      open:    [392, 0.12, "triangle"],
      die:     [80, 0.6, "sine"],
    });
    Particles = R2.makeParticles();
  }

  /* ===== Città ===== */
  function distName() {
    for (var tries = 0; tries < 40; tries++) {
      var n = NPRE[Math.floor(rand(0, NPRE.length))] + NSUF[Math.floor(rand(0, NSUF.length))];
      if (!state.usedNames[n]) { state.usedNames[n] = true; return n; }
    }
    return "Quartiere " + (state.districts.length + 1);
  }
  function addDistrict(x, y, pop, jobs) {
    var d = {
      id: state.districts.length,
      name: distName(),
      x: x, y: y,
      pop: Math.round(pop), jobs: Math.round(jobs),
      geo: rand(0.85, 1.8),
      seed: rand(0, 6.2832),
      served: false, stress: 1, wait: 0,
      blob: [],
    };
    for (var k = 0; k < 8; k++) d.blob.push(rand(0.82, 1.18));
    state.districts.push(d);
    return d;
  }
  function genCity() {
    var center = { x: W / 2, y: H / 2 };
    for (var i = 0; i < 8; i++) {
      var ang = (i / 8) * 6.2832 + rand(-0.4, 0.4);
      var dist = i === 0 ? 0 : rand(220, 560);
      var x = clamp(center.x + Math.cos(ang) * dist, 130, W - 130);
      var y = clamp(center.y + Math.sin(ang) * dist, 130, H - 130);
      addDistrict(x, y, i < 2 ? rand(650, 900) : rand(320, 780), rand(150, 520));
    }
  }

  /* ===== Linee ===== */
  function newLineObj(color, name, stations) {
    return { id: state.lines.length, color: color, name: name, stations: stations, trains: 1, demand: 0, cap: 0, served: 0, crowd: 1, ratio: 1, len: 0, cum: [] };
  }
  function linePath(l) {
    return l.stations.map(function (id) { return state.districts[id]; });
  }
  function recomputeLineGeom(l) {
    l.len = 0; l.cum = [0];
    for (var i = 1; i < l.stations.length; i++) {
      var a = state.districts[l.stations[i - 1]], b = state.districts[l.stations[i]];
      l.len += Math.sqrt(dist2(a.x, a.y, b.x, b.y));
      l.cum.push(l.len);
    }
  }
  function posAlong(l, s) {
    var pts = linePath(l);
    if (l.stations.length < 2) return { x: pts[0].x, y: pts[0].y };
    for (var i = 1; i < l.stations.length; i++) {
      if (s <= l.cum[i]) {
        var f = (s - l.cum[i - 1]) / (l.cum[i] - l.cum[i - 1] || 1);
        return { x: lerp(pts[i - 1].x, pts[i].x, f), y: lerp(pts[i - 1].y, pts[i].y, f) };
      }
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  }

  /* ===== Domanda & rotte ===== */
  function linesAtDistrict(d) {
    return state.lines.filter(function (l) { return l.stations.indexOf(d) >= 0; });
  }
  function routeLines(dA, dB) {
    var goal = {};
    linesAtDistrict(dB).forEach(function (l) { goal[l.id] = true; });
    var direct = linesAtDistrict(dA);
    var i, k, m;
    for (i = 0; i < direct.length; i++) {
      if (goal[direct[i].id]) return { lines: [direct[i].id], transfers: 0 };
    }
    var visited = {};
    var queue = [];
    for (i = 0; i < direct.length; i++) { visited[direct[i].id] = [direct[i].id]; queue.push([direct[i].id]); }
    while (queue.length) {
      var path = queue.shift();
      if (path.length > 3) continue;
      var line = state.lines[path[path.length - 1]];
      for (k = 0; k < line.stations.length; k++) {
        var dId = line.stations[k];
        var touching = linesAtDistrict(dId);
        for (m = 0; m < touching.length; m++) {
          var nid = touching[m].id;
          if (path.indexOf(nid) >= 0) continue;
          var np = path.concat([nid]);
          if (goal[nid]) return { lines: np, transfers: np.length - 1 };
          if (!visited[nid] || visited[nid].length > np.length) { visited[nid] = np; queue.push(np); }
        }
      }
    }
    return null;
  }
  function gravity(A, B) {
    var d = Math.sqrt(dist2(A.x, A.y, B.x, B.y));
    var base = 0.0022 * (A.pop + A.jobs * 0.6) * (B.pop * 0.6 + B.jobs);
    var sym = 0.0022 * (B.pop + B.jobs * 0.6) * (A.pop * 0.6 + A.jobs);
    return ((base + sym) / 2) / (1 + Math.pow(d / 300, 1.6));
  }
  function waveInfo() {
    var t = state.tod;
    if (t < 0.35) return { mult: 1.35, label: "🌅 Mattina — casa → lavoro" };
    if (t < 0.6) return { mult: 0.7, label: "☀️ Giorno — traffico diffuso" };
    if (t < 0.9) return { mult: 1.35, label: "🌆 Sera — lavoro → casa" };
    return { mult: 0.15, label: "🌙 Notte" };
  }
  function fareMult() { return clamp(2.2 - state.fare * 0.6, 0.25, 1.8); }

  function recomputeDemand() {
    var wave = waveInfo();
    var fm = fareMult();
    state.lines.forEach(function (l) { l.demand = 0; });
    var delivered = 0;
    var served = state.districts.filter(function (d) { return linesAtDistrict(d.id).length > 0; });
    var i, j;
    for (i = 0; i < served.length; i++) {
      for (j = i + 1; j < served.length; j++) {
        var A = served[i], B = served[j];
        var F = gravity(A, B) * wave.mult * fm;
        var route = routeLines(A.id, B.id);
        if (!route) continue;
        F /= (1 + 0.4 * route.transfers);
        route.lines.forEach(function (lid) { state.lines[lid].demand += F; });
      }
    }
    state.lines.forEach(function (l) {
      var cycle = l.stations.length < 2 ? 1 : 2 * l.len / TRAIN_SPEED;
      l.cap = l.trains * TRAIN_CAP * (DAY / Math.max(cycle, 1));
      l.served = Math.min(l.demand, l.cap);
      l.crowd = l.demand / Math.max(l.cap, 1);
      l.ratio = l.demand > 0 ? clamp(l.cap / l.demand, 0, 1) : 1;
    });
    for (i = 0; i < served.length; i++) {
      for (j = i + 1; j < served.length; j++) {
        var A2 = served[i], B2 = served[j];
        var F2 = gravity(A2, B2) * wave.mult * fm;
        var route2 = routeLines(A2.id, B2.id);
        if (!route2) continue;
        F2 /= (1 + 0.4 * route2.transfers);
        var minRatio = 1;
        route2.lines.forEach(function (lid) { minRatio = Math.min(minRatio, state.lines[lid].ratio); });
        delivered += F2 * minRatio;
        var unmet = F2 * (1 - minRatio) / Math.max(route2.lines.length, 1);
        route2.lines.forEach(function (lid) {
          state.lines[lid].stations.forEach(function (dId) {
            state.districts[dId].wait += unmet;
          });
        });
      }
    }
    state.deliveredDay = delivered;
    state.districts.forEach(function (d) {
      var lines = linesAtDistrict(d.id);
      d.served = lines.length > 0;
      d.stress = 0;
      lines.forEach(function (l) { d.stress = Math.max(d.stress, l.crowd); });
      d.wait = clamp(d.wait * 0.7, 0, 60);
    });
  }

  /* ===== Giornata & crescita ===== */
  function dayRollover() {
    state.day++;
    state.districts.forEach(function (d) {
      var q = d.served ? clamp(1 / Math.max(d.stress, 0.8), 0, 1.2) : 0;
      var g;
      if (!d.served) g = -0.004;
      else if (q > 0.95) g = 0.032;
      else if (q > 0.7) g = 0.012;
      else g = -0.008;
      d.pop = Math.max(80, d.pop * (1 + g));
      d.jobs = Math.max(40, d.jobs * (1 + g * 0.9));
    });
    state.districts.filter(function (d) { return d.pop > 1500; }).forEach(function (d) {
      if (Math.random() < 0.22 && state.districts.length < MAX_DISTRICTS) {
        for (var tries = 0; tries < 24; tries++) {
          var ang = rand(0, 6.2832), dist = rand(190, 250);
          var x = clamp(d.x + Math.cos(ang) * dist, 110, W - 110);
          var y = clamp(d.y + Math.sin(ang) * dist, 110, H - 110);
          var ok = state.districts.every(function (o) { return dist2(o.x, o.y, x, y) > 150 * 150; });
          if (ok) { var nd = addDistrict(x, y, 280, 70); toast("🏙️ Nuovo quartiere: " + nd.name); break; }
        }
      }
    });
  }

  /* ===== Economia ===== */
  function economyTick(dt) {
    var wave = waveInfo();
    var frac = dt / DAY;
    state.money += (state.deliveredDay || 0) * state.fare * frac * (wave.mult > 1 ? 1.15 : 1);
    state.totalPax += (state.deliveredDay || 0) * frac;
    var trains = 0, stationsN = 0;
    state.lines.forEach(function (l) { trains += l.trains; stationsN += l.stations.length; });
    var maint = (trains * 12 + stationsN * 8 + 25) / DAY;
    state.money -= maint * dt;
    if (state.loan > 0) {
      var interest = state.loan * LOAN_INTEREST_DAY / DAY;
      state.loan += interest * dt;
      state.money -= interest * dt;
    }
    if (state.money < -400 && !state.over) bankrupt();
  }
  function bankrupt() {
    state.over = true;
    Sound.die();
    var best = Number(localStorage.getItem("metro-best") || 0);
    if (state.totalPax > best) { localStorage.setItem("metro-best", String(Math.floor(state.totalPax))); best = Math.floor(state.totalPax); }
    R2.saveJSON("metro-pwa", { highScore: Math.floor(state.totalPax) });
    showModal("BANCAROTTA",
      "Il bilancio è andato sotto −€ 400 e i creditori hanno sequestrato la rete.<br><br>Passeggeri trasportati: <b>" + fmtNum(state.totalPax) + "</b> (record: " + fmtNum(best) + ")<br>Giorni di servizio: <b>" + state.day + "</b><br><br>" +
      "Consiglio: tariffe più alte portano meno passeggeri — trova l'equilibrio prima di indebitarti.",
      [{ t: "↺ Nuova città", f: function () { location.reload(); }, primary: true }]);
  }

  /* ===== Costruzione ===== */
  function startNewLine() {
    if (state.lines.length >= MAX_LINES) { toast("Massimo " + MAX_LINES + " linee."); return; }
    state.build = { stations: [], spent: 0, extendTo: null };
    state.finance = false;
    renderDock();
  }
  function startExtend(lineId) {
    var l = state.lines[lineId];
    state.build = { stations: [l.stations[l.stations.length - 1]], spent: 0, extendTo: lineId };
    renderDock();
  }
  function buildCost(fromD, toD) {
    var d = Math.sqrt(dist2(fromD.x, fromD.y, toD.x, toD.y));
    var geo = (fromD.geo + toD.geo) / 2;
    return Math.round(STATION_BASE * toD.geo + d * TUNNEL_PER_PX * geo);
  }
  function tryBuildAt(d) {
    var b = state.build;
    if (b.stations.indexOf(d.id) >= 0) { toast("Stazione già su questa linea."); return; }
    var last = b.stations.length ? state.districts[b.stations[b.stations.length - 1]] : null;
    var cost = last ? buildCost(last, d) : Math.round(STATION_BASE * d.geo);
    if (state.money < cost) { Sound.error(); toast("Cassa insufficiente: servono " + fmtMoney(cost)); return; }
    state.money -= cost;
    b.spent += cost;
    b.stations.push(d.id);
    Sound.tunnel();
    R2.buzz(10);
    renderDock();
  }
  function finishLine() {
    var b = state.build;
    if (!b || b.stations.length < 2) { toast("Servono almeno 2 stazioni."); return; }
    if (b.extendTo !== null) {
      var l = state.lines[b.extendTo];
      l.stations = l.stations.concat(b.stations.slice(1));
      recomputeLineGeom(l);
      Sound.open();
      toast("📍 " + l.name + " estesa!");
    } else {
      var nl = newLineObj(PALETTE[state.lines.length % PALETTE.length], LNAMES[state.lines.length % LNAMES.length], b.stations.slice());
      nl.trains = 1;
      recomputeLineGeom(nl);
      state.lines.push(nl);
      Sound.open();
      toast("🚇 " + nl.name + " inaugurata con 1 treno!");
      state.sel = nl.id;
    }
    state.build = null;
    recomputeDemand();
    renderDock();
  }
  function cancelBuild() {
    if (state.build && state.build.spent > 0) {
      var back = Math.round(state.build.spent * 0.6);
      state.money += back;
      toast("Rimborso 60%: " + fmtMoney(back));
    }
    state.build = null;
    renderDock();
  }
  function addTrain(lineId) {
    var l = state.lines[lineId];
    if (!l || l.trains >= 8) return;
    if (state.money < TRAIN_COST) { Sound.error(); toast("Cassa insufficiente"); return; }
    state.money -= TRAIN_COST;
    l.trains++;
    Sound.train();
    recomputeDemand();
    renderDock();
  }
  function removeLine(lineId) {
    var l = state.lines[lineId];
    state.money += Math.round(l.trains * TRAIN_COST * 0.5);
    state.lines.splice(lineId, 1);
    state.lines.forEach(function (x, i) { x.id = i; });
    state.sel = null;
    Sound.error();
    recomputeDemand();
    renderDock();
  }

  /* ===== Prestiti ===== */
  function takeLoan(amount) {
    if (state.loan + amount > 5000) { Sound.error(); toast("Il rating non copre più debito."); return; }
    state.loan += amount;
    state.money += amount;
    Sound.loan();
    toast("🏦 Prestito di " + fmtMoney(amount) + " · interesse 2%/giorno");
    renderDock();
  }
  function repayLoan() {
    var pay = Math.min(Math.max(state.money, 0), state.loan);
    if (pay <= 0) { Sound.error(); return; }
    state.money -= pay;
    state.loan -= pay;
    Sound.cash();
    renderDock();
  }

  /* ===== Input ===== */
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - view.ox) / view.scale,
      y: (e.clientY - r.top - view.oy) / view.scale,
    };
  }
  function nearestDistrict(wx, wy) {
    var best = null, bestD = 46 * 46;
    state.districts.forEach(function (d) {
      var dd = dist2(wx, wy, d.x, d.y);
      if (dd < bestD) { bestD = dd; best = d; }
    });
    return best;
  }
  function segDist(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var L2 = dx * dx + dy * dy || 1;
    var t = clamp(((px - x1) * dx + (py - y1) * dy) / L2, 0, 1);
    return Math.sqrt(dist2(px, py, x1 + dx * t, y1 + dy * t));
  }
  function hitLine(wx, wy) {
    for (var i = 0; i < state.lines.length; i++) {
      var l = state.lines[i];
      var pts = linePath(l);
      for (var k = 1; k < pts.length; k++) {
        if (segDist(wx, wy, pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y) < 14) return l.id;
      }
    }
    return null;
  }
  function setupInput() {
    canvas.addEventListener("pointerdown", function (e) {
      if (state.over) return;
      var w = toWorld(e);
      var d = nearestDistrict(w.x, w.y);
      if (state.build) {
        if (d) tryBuildAt(d);
        return;
      }
      if (d) {
        var lines = linesAtDistrict(d.id);
        if (lines.length) { state.sel = lines[0].id; state.finance = false; renderDock(); return; }
      }
      var hit = hitLine(w.x, w.y);
      if (hit !== null) { state.sel = hit; renderDock(); return; }
      state.sel = null; state.finance = false;
      renderDock();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (state.build && state.build.stations.length) {
        var w = toWorld(e);
        state.build.hoverX = w.x; state.build.hoverY = w.y;
      }
    });
  }

  /* ===== Render ===== */
  function roundRectC(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = "#eef0e9";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    state.districts.forEach(function (d) {
      var r = 26 + Math.sqrt(d.pop) * 0.42;
      ctx.beginPath();
      for (var k = 0; k <= 8; k++) {
        var a = (k / 8) * 6.2832;
        var rr = r * d.blob[k % 8];
        var x = d.x + Math.cos(a) * rr, y = d.y + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      var density = clamp(d.pop / 1600, 0, 1);
      ctx.fillStyle = d.served ? "rgba(180,196,170," + (0.35 + density * 0.3).toFixed(2) + ")" : "rgba(200,196,186," + (0.3 + density * 0.25).toFixed(2) + ")";
      ctx.fill();
      if (d.stress > 1.1 && d.served) {
        ctx.strokeStyle = "rgba(224,52,44," + (0.25 + 0.2 * Math.sin(state.time * 5)).toFixed(3) + ")";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(26,29,36,0.8)";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.name, d.x, d.y - r - 8);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "rgba(26,29,36,0.55)";
      ctx.fillText("🏠" + fmtK(d.pop) + "  🏢" + fmtK(d.jobs), d.x, d.y - r + 8);
      if (!d.served) {
        ctx.fillStyle = "rgba(192,57,43,0.85)";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("non servito", d.x, d.y + r + 14);
      }
    });
    state.lines.forEach(function (l) {
      var pts = linePath(l);
      ctx.strokeStyle = l.color;
      ctx.lineWidth = state.sel === l.id ? 11 : 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      var n = l.trains;
      for (var tr = 0; tr < n; tr++) {
        var u = (state.time * TRAIN_SPEED / Math.max(l.len, 1) + tr / n) % 2;
        var s = u < 1 ? u * l.len : (2 - u) * l.len;
        var pos = posAlong(l, s);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 3;
        roundRectC(ctx, pos.x - 8, pos.y - 5, 16, 10, 4);
        ctx.fill(); ctx.stroke();
      }
    });
    state.districts.forEach(function (d) {
      var lines = linesAtDistrict(d.id);
      if (!lines.length) return;
      var inter = lines.length > 1;
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = lines[0].color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(d.x, d.y, inter ? 12 : 9, 0, 6.2832);
      ctx.fill();
      if (inter) {
        ctx.strokeStyle = lines[1] ? lines[1].color : lines[0].color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 15, 0, 6.2832);
        ctx.stroke();
      }
      var dots = Math.min(10, Math.floor(d.wait / 4));
      for (var w = 0; w < dots; w++) {
        var aa = w * 1.1 + d.seed;
        ctx.fillStyle = "rgba(26,29,36,0.6)";
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(aa) * (18 + (w % 3) * 5), d.y + Math.sin(aa) * (13 + (w % 2) * 5), 2.2, 0, 6.2832);
        ctx.fill();
      }
    });
    if (state.build && state.build.stations.length) {
      var last = state.districts[state.build.stations[state.build.stations.length - 1]];
      ctx.strokeStyle = "rgba(26,29,36,0.35)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(state.build.hoverX || last.x, state.build.hoverY || last.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    Particles.draw(ctx);
    ctx.restore();
  }

  /* ===== Dock ===== */
  function renderDock() {
    var dock = $("dock");
    var html = "";
    if (state.build) {
      var b = state.build;
      var lastD = b.stations.length ? state.districts[b.stations[b.stations.length - 1]] : null;
      html = '<div class="dockrow"><span class="docktitle">🚇 ' +
        (b.extendTo !== null ? "Estensione " + state.lines[b.extendTo].name : "Nuova linea") + "</span>" +
        '<button class="btn primary" data-act="finish">✓ Termina linea</button>' +
        '<button class="btn danger" data-act="cancelbuild">✕ Annulla</button></div>' +
        '<div class="dockinfo">Stazioni: <b>' + b.stations.length + "</b> · speso: <b>" + fmtMoney(b.spent) +
        "</b> · tocca i quartieri in sequenza" +
        (lastD ? " — prossimo scavo da <b>" + lastD.name + "</b>" : "") + "</div>";
    } else if (state.finance) {
      html = '<div class="dockrow"><span class="docktitle">💰 Finanza</span>' +
        '<button class="btn" data-act="loan600">🏦 Prendi € 600</button>' +
        '<button class="btn" data-act="loan1500">🏦 € 1.500</button>' +
        '<button class="btn" data-act="repay">💳 Ripaga</button>' +
        '<button class="btn ghost" data-act="closefin">✕</button></div>' +
        '<div class="dockinfo">Debito: <b>' + fmtMoney(state.loan) + "</b> · interesse 2%/giorno · rating max 5.000<br>" +
        'Tariffa: <b>€ ' + state.fare.toFixed(2) + "</b> — alza i ricavi, cala la domanda</div>" +
        '<input type="range" id="fare" min="0.8" max="3" step="0.1" value="' + state.fare + '">';
    } else if (state.sel !== null && state.lines[state.sel]) {
      var l = state.lines[state.sel];
      var crowdPct = clamp(l.crowd, 0, 2) / 2 * 100;
      var over = l.crowd > 1;
      html = '<div class="dockrow"><span class="docktitle"><span class="swatch" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + l.color + '"></span> ' +
        l.name + "</span>" +
        '<button class="btn primary" data-act="addtrain" data-id="' + l.id + '">🚆 Treno · ' + fmtMoney(TRAIN_COST) + "</button>" +
        '<button class="btn" data-act="extend" data-id="' + l.id + '">📍 Estendi</button>' +
        '<button class="btn danger" data-act="delline" data-id="' + l.id + '">🗑️</button>' +
        '<button class="btn ghost" data-act="closesel">✕</button></div>' +
        '<div class="dockinfo">Stazioni: <b>' + l.stations.length + "</b> · lunghezza: <b>" + Math.round(l.len) + " m</b> · treni: <b>" + l.trains + "</b><br>" +
        'Domanda: <b>' + fmtNum(l.demand) + "</b> pax/g · capienza: <b>" + fmtNum(l.cap) + "</b></div>" +
        '<div class="capbar"><i class="' + (over ? "over" : "") + '" style="width:' + crowdPct + '%"></i></div>' +
        (over ? '<div class="dockinfo" style="color:var(--danger)">⚠️ Sopraffollamento: la domanda supera la capienza. Aggiungi treni o sposta la linea.</div>' : "");
    } else {
      var chips = "";
      state.lines.forEach(function (l) {
        chips += '<span class="linechip" data-act="sel" data-id="' + l.id + '"><span class="swatch" style="background:' + l.color + '"></span>' + l.name + "</span>";
      });
      html = '<div class="dockrow">' + chips +
        '<button class="btn primary" data-act="newline">➕ Nuova linea</button>' +
        '<button class="btn" data-act="fin">💰 Finanza</button></div>' +
        '<div class="dockinfo">Tocca una linea per gestirla · la città cresce dove arriva la metro.</div>';
    }
    dock.innerHTML = html;
    bindDock();
  }
  function bindDock() {
    $("dock").querySelectorAll("[data-act]").forEach(function (el) {
      el.addEventListener("click", function () {
        var act = el.dataset.act, id = el.dataset.id ? Number(el.dataset.id) : null;
        if (act === "newline") startNewLine();
        else if (act === "finish") finishLine();
        else if (act === "cancelbuild") cancelBuild();
        else if (act === "sel") { state.sel = id; state.finance = false; renderDock(); }
        else if (act === "closesel") { state.sel = null; renderDock(); }
        else if (act === "addtrain") addTrain(id);
        else if (act === "extend") startExtend(id);
        else if (act === "delline") removeLine(id);
        else if (act === "fin") { state.finance = true; state.sel = null; renderDock(); }
        else if (act === "closefin") { state.finance = false; renderDock(); }
        else if (act === "loan600") takeLoan(600);
        else if (act === "loan1500") takeLoan(1500);
        else if (act === "repay") repayLoan();
      });
    });
    var fare = document.getElementById("fare");
    if (fare) {
      fare.addEventListener("input", function () {
        state.fare = Number(fare.value);
        recomputeDemand();
        renderDock();
      });
    }
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
    showModal("LINEA ROSSA — Metro Planner",
      "Sei l'ingegnere della prima metropolitana della città.<br><br>" +
      "• <b>➕ Nuova linea</b>: tocca i quartieri in sequenza per tracciarla (scavo e stazioni costano — la geologia conta)<br>" +
      "• I <b>quartieri serviti</b> crescono e ne nascono di nuovi: la città segue la tua rete<br>" +
      "• La <b>domanda</b> segue la gravity model: più residenti e uffici collegati = più passeggeri<br>" +
      "• Gli <b>interscambi</b> tra linee ampliano la copertura, ma costano in tempo ai passeggeri<br>" +
      "• <b>Tariffa alta</b> = più ricavi, meno passeggeri. <b>Treni</b> = capienza<br>" +
      "• Sopraffollamento permanente blocca la crescita del quartiere<br>" +
      "• I <b>prestiti</b> hanno interesse 2%/giorno: la bancarotta è sotto −€ 400",
      [{ t: "🚇 Apri il cantiere", f: function () { hideModal(); }, primary: true }]);
  }

  /* ===== Loop ===== */
  var lastT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0.016;
    lastT = t;
    if (!state.over) {
      state.time += dt;
      state.tod += dt / DAY;
      if (state.tod >= 1) { state.tod -= 1; dayRollover(); }
      economyTick(dt);
      demandTimer -= dt;
      if (demandTimer <= 0) { demandTimer = 2; recomputeDemand(); renderDock(); }
    }
    Particles.update(dt);
    render();
    updateHUD();
    requestAnimationFrame(loop);
  }

  function updateHUD() {
    var m = $("money");
    m.innerHTML = state.money < 0 ? '<b class="neg">' + fmtE(state.money) + "</b>" : fmtE(state.money);
    $("paxday").textContent = fmtNum(state.deliveredDay || 0);
    $("daychip").textContent = "📅 Giorno " + state.day;
    var wave = waveInfo();
    var wl = $("waveline");
    if (wl.textContent !== wave.label) wl.textContent = wave.label;
  }

  function resize() {
    var stage = $("stage");
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    view.scale = Math.min(view.w / (W + 100), view.h / (H + 100));
    view.ox = (view.w - W * view.scale) / 2;
    view.oy = (view.h - H * view.scale) / 2;
  }

  function init() {
    canvas = $("game");
    ctx = canvas.getContext("2d");
    initSound();
    resize();
    window.addEventListener("resize", resize);
    genCity();
    recomputeDemand();
    setupInput();
    renderDock();
    showStart();
    R2.trackPlaytime("metro-pwa/");
    R2.installHint();
    R2.markPlayed("metro-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
