/*
 * ALVEARE — Waggle Dance · sei la mente dell'alveare
 * Gli esploratori scoprono i campi fioriti; tu disegni la danza
 * dell'oscillazione per instradare le operaie: angolo dal sole = direzione,
 * lunghezza del tratto = distanza. Miele, stagioni, inverni da sopravvivere.
 * Canvas 2D + shared/arcade.js. Zero asset, tutto procedurale.
 */
(function () {
  "use strict";

  /* ===== Config ===== */
  var W = 1600, H = 1600;
  var HIVE = { x: 800, y: 800 };
  var PATCH_MIN = 260, PATCH_MAX = 920;
  var BEE_SPEED = 140;
  var FORAGE_T = 6;             // secondi di raccolta per viaggio
  var DIST_PER_PX = 8.6;        // 140px di danza ≙ 1200 m
  var CONSUMPTION = 0.015;      // miele/s per ape
  var SLOTS_MAX = 22;

  var FLOWERS = [
    { key: "trifoglio",  name: "Trifoglio",  color: "#e8f0d8", rate: [0.30, 0.55] },
    { key: "lavanda",    name: "Lavanda",    color: "#b48ce0", rate: [0.50, 0.85] },
    { key: "girasole",   name: "Girasole",   color: "#f7d774", rate: [0.40, 0.70] },
    { key: "rododendro", name: "Rododendro", color: "#e88ab0", rate: [0.55, 0.95] },
    { key: "tarassaco",  name: "Tarassaco",  color: "#f0e05a", rate: [0.30, 0.60] },
  ];
  var WASP = { key: "vespaio", name: "Vespaio", color: "#8a5a2b", rate: [0, 0] };
  var SEASONS = [
    { name: "Primavera", dur: 100, mult: 1.00, icon: "🌸" },
    { name: "Estate",    dur: 120, mult: 1.10, icon: "🌞" },
    { name: "Autunno",   dur: 100, mult: 0.75, icon: "🍂" },
    { name: "Inverno",   dur: 110, mult: 0.00, icon: "❄️" },
  ];

  var state = {
    honey: 40, pop: 10, slots: 10, scoutCount: 2,
    patches: [], squads: [], scouts: [], queue: [], brood: [],
    season: 0, seasonT: 100, year: 1,
    totalHoney: 0, starveT: 0, shake: 0, time: 0, over: false,
  };
  var canvas, ctx, danceC, dctx, combPat = null, grassPat = null;
  var view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  var dance = { open: false, report: null, pts: [], drawing: false, result: null };
  var Sound, Particles;
  var toastT = null;

  /* ===== Utils ===== */
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.add("hidden"); }, 2600);
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function fmt(n) { return Math.floor(n).toString(); }
  function squadBees() {
    var n = 0;
    state.squads.forEach(function (s) { n += s.bees; });
    return n;
  }
  function idle() { return Math.max(0, state.pop - state.scoutCount - squadBees()); }

  /* ===== Sound ===== */
  function initSound() {
    Sound = R2.makeSound({
      deposit: [660, 0.08, "sine"],
      recruit: [392, 0.15, "triangle"],
      brood:   [520, 0.1, "sine"],
      expand:  [330, 0.12, "sine"],
      season:  [440, 0.15, "sine"],
      scout:   [700, 0.05, "sine"],
      wasp:    [200, 0.2, "sawtooth"],
      error:   [110, 0.15, "sawtooth"],
      die:     [80, 0.6, "sine"],
    });
    Particles = R2.makeParticles();
  }

  /* ===== Mondo ===== */
  function makePatch(idx) {
    var type;
    if (idx === 3 || idx === 9) type = WASP;
    else type = FLOWERS[Math.floor(rand(0, FLOWERS.length))];
    var ang = rand(0, 6.2832), dist = rand(PATCH_MIN, PATCH_MAX);
    var p = {
      x: HIVE.x + Math.cos(ang) * dist,
      y: HIVE.y + Math.sin(ang) * dist,
      type: type,
      rate: rand(type.rate[0], type.rate[1]),
      dist: Math.round(dist),
      discovered: false, toxic: false,
      dots: [],
    };
    for (var k = 0; k < 8; k++) {
      var a2 = rand(0, 6.2832), r2 = rand(6, 26);
      p.dots.push({ x: Math.cos(a2) * r2, y: Math.sin(a2) * r2, s: rand(2.2, 3.6) });
    }
    return p;
  }

  function buildWorld() {
    state.patches = [];
    for (var i = 0; i < 15; i++) {
      var p = makePatch(i), tries = 0;
      while (tries < 30) {
        var ok = state.patches.every(function (o) { return dist2(o.x, o.y, p.x, p.y) > 150 * 150; });
        if (ok) break;
        p = makePatch(i);
        tries++;
      }
      state.patches.push(p);
    }
    state.scouts = [];
    for (var s = 0; s < state.scoutCount; s++) newScout();
  }
  function newScout() {
    state.scouts.push({ x: HIVE.x, y: HIVE.y, dir: rand(0, 6.2832), phase: "out", travel: 0, maxT: rand(500, 850), found: null, idleT: 0 });
  }

  /* ===== Stagioni ===== */
  function seasonMult() { return SEASONS[state.season].mult; }
  function patchRateEff(p) {
    return p.rate * seasonMult() * (p.toxic ? 0.2 : 1);
  }
  function updateSeason(dt) {
    state.seasonT -= dt;
    if (state.seasonT > 0) return;
    state.season = (state.season + 1) % 4;
    state.seasonT = SEASONS[state.season].dur;
    Sound.season();
    if (state.season === 0) {
      state.year++;
      state.patches.forEach(function (p) { p.toxic = false; });
      toast("🌸 " + SEASONS[0].name + " · Anno " + state.year);
    } else if (state.season === 3) {
      state.squads = [];
      renderSquads();
      toast("❄️ Inverno: le api restano nell'alveare. Il miele dovrà bastare.");
    } else {
      toast(SEASONS[state.season].icon + " " + SEASONS[state.season].name);
    }
  }

  /* ===== Esploratrici ===== */
  function updateScouts(dt) {
    if (state.season === 3) return; // in inverno non volano
    state.scouts.forEach(function (sc) {
      if (sc.phase === "idle") {
        sc.idleT -= dt;
        if (sc.idleT <= 0) {
          sc.phase = "out";
          sc.dir = rand(0, 6.2832);
          sc.travel = 0;
          sc.maxT = rand(500, 850);
          sc.found = null;
        }
        return;
      }
      var speed = 120 * dt;
      // Il passo verso l'esterno va applicato SOLO in fase "out": una
      // scopritrice parte sempre dall'alveare su una diritta fissa, quindi
      // il passo di ritorno lo annullerebbe esattamente e resterebbe
      // bloccata per sempre senza mai consegnare il suo rapporto.
      if (sc.phase !== "return") {
        sc.x += Math.cos(sc.dir) * speed;
        sc.y += Math.sin(sc.dir) * speed;
        sc.travel += speed;
      }
      if (!sc.found) {
        state.patches.forEach(function (p, idx) {
          if (p.discovered || sc.found !== null) return;
          if (dist2(sc.x, sc.y, p.x, p.y) < 130 * 130) {
            p.discovered = true;
            sc.found = idx;
          }
        });
      }
      var out = sc.x < 40 || sc.x > W - 40 || sc.y < 40 || sc.y > H - 40;
      if (sc.found !== null || sc.travel >= sc.maxT || out) sc.phase = "return";
      if (sc.phase === "return") {
        var dx = HIVE.x - sc.x, dy = HIVE.y - sc.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > 10) { sc.x += (dx / d) * speed; sc.y += (dy / d) * speed; }
        else {
          sc.phase = "idle";
          sc.idleT = rand(3, 6);
          if (sc.found !== null) {
            if (state.queue.length < 4) {
              state.queue.push(sc.found);
              Sound.scout();
              if (!state.over) toast("🧭 Un'esploratrice è tornata con notizie!");
            } else {
              toast("🧭 Report ignorato: la sala danza è piena.");
            }
            sc.found = null;
          }
        }
      }
    });
  }

  /* ===== Squadre ===== */
  function addSquad(target, rate, eff, bees, patch) {
    var d = Math.sqrt(dist2(HIVE.x, HIVE.y, target.x, target.y));
    state.squads.push({
      target: target, patch: patch || null,
      rate: rate, eff: eff, bees: bees,
      t: 0, cycle: 2 * d / BEE_SPEED + FORAGE_T,
      label: patch ? patch.type.name : "vuoto",
      wrong: false, danger: false,
    });
  }
  function updateSquads(dt) {
    for (var i = state.squads.length - 1; i >= 0; i--) {
      var s = state.squads[i];
      s.t += dt;
      if (s.t < s.cycle) continue;
      s.t = 0;
      if (s.rate > 0 && s.patch) {
        var gain = s.bees * patchRateEff(s.patch) * s.eff * FORAGE_T;
        state.honey += gain;
        state.totalHoney += gain;
        Sound.deposit();
        if (s.patch.toxic && Math.random() < 0.5) {
          s.bees = Math.max(0, s.bees - 1);
          toast("☠️ Le operaie si ammalano sul campo inquinato!");
        }
      } else if (s.wrong) {
        s.bees = Math.floor(s.bees * 0.9);
        if (Math.random() < 0.4) toast("🫥 La danza era sbagliata: le operaie volano nel vuoto.");
      }
      if (s.danger && s.bees > 0) { s.bees = Math.max(0, s.bees - 2); }
      if (s.bees <= 0) { state.squads.splice(i, 1); renderSquads(); }
    }
  }

  /* ===== Eventi ===== */
  function updateEvents() {
    if (state.over) return;
    if (state.season === 1 || state.season === 2) {
      if (Math.random() < 0.004) {
        state.honey = Math.max(0, state.honey * 0.88);
        state.pop = Math.max(1, state.pop - 1);
        state.shake = 6;
        Sound.wasp();
        toast("🐝⚔️ Rapina di vespe: miele e api perduti!");
      }
    }
    if ((state.season === 1 || state.season === 2) && Math.random() < 0.0025) {
      var cands = state.patches.filter(function (p) { return p.discovered && !p.toxic && p.type.key !== "vespaio"; });
      if (cands.length) {
        var v = cands[Math.floor(rand(0, cands.length))];
        v.toxic = true;
        toast("☠️ Un campo è stato trattato con pesticidi: " + v.type.name);
      }
    }
  }

  /* ===== Economia ===== */
  function updateEconomy(dt) {
    var mult = 1 + 0.08 * (state.year - 1);
    state.honey -= state.pop * CONSUMPTION * mult * dt;
    if (state.honey < 0) {
      state.honey = 0;
      state.starveT += dt;
      if (state.starveT > 3) {
        state.starveT = 0;
        state.pop = Math.max(0, state.pop - 1);
        toast("🍯 Fame nell'alveare: un'ape non ce la fa.");
        if (state.pop <= 0) gameOver();
      }
    } else state.starveT = 0;
    for (var i = state.brood.length - 1; i >= 0; i--) {
      state.brood[i].t -= dt;
      if (state.brood[i].t <= 0) {
        state.brood.splice(i, 1);
        if (state.pop < state.slots) { state.pop++; Sound.brood(); }
      }
    }
  }

  function gameOver() {
    if (state.over) return;
    state.over = true;
    Sound.die();
    R2.buzz([60, 40, 90]);
    var score = Math.floor(state.totalHoney + 150 * (state.year - 1) + state.pop * 4);
    var best = Number(localStorage.getItem("alveare-best") || 0);
    if (score > best) { localStorage.setItem("alveare-best", String(score)); best = score; }
    R2.saveJSON("alveare-pwa", { highScore: best });
    showModal("L'alveare è caduto",
      "La colonia non ha superato il suo ultimo inverno.<br><br>Miele prodotto: <b>" + fmt(state.totalHoney) + "</b><br>Inverni superati: <b>" + (state.year - 1) + "</b><br>Punteggio: <b>" + score + "</b> (record: " + best + ")<br><br>" +
      (state.year - 1 < 1 ? "Consiglio: metà del miele deve durare fino alla primavera." :
       state.year - 1 < 3 ? "L'alveare impara. Anche tu." :
       "Una dinastia dorata. Il campo ricorda il tuo ronzio."),
      [{ t: "🐝 Nuova regina", f: function () { location.reload(); }, primary: true }]);
  }

  /* ===== Danza ===== */
  function angleFromUp(dx, dy) { return Math.atan2(dx, -dy); } // 0 = su (sole), orario positivo
  function normAng(a) {
    while (a > Math.PI) a -= 6.2832;
    while (a < -Math.PI) a += 6.2832;
    return a;
  }

  function openDance() {
    if (!state.queue.length) return;
    var patchIdx = state.queue[0];
    var p = state.patches[patchIdx];
    dance.open = true;
    dance.report = { patchIdx: patchIdx, patch: p };
    dance.pts = [];
    dance.drawing = false;
    dance.result = null;
    var deg = Math.round(angleFromUp(p.x - HIVE.x, p.y - HIVE.y) * 180 / Math.PI);
    var dirTxt = Math.abs(deg) + "° a " + (deg >= 0 ? "destra" : "sinistra") + " del sole";
    var isWasp = p.type.key === "vespaio";
    document.getElementById("scout-card").innerHTML =
      "<b>" + p.type.name + "</b> · " + p.dist + " m dall'alveare<br>" +
      "Direzione: <b>" + dirTxt + "</b><br>" +
      (isWasp
        ? '<span class="warn">⚠️ PERICOLOSO: è un vespaio. Non mandare le operaie.</span>'
        : "Nettare: <b>" + p.rate.toFixed(2) + "</b> miele/s per ape");
    document.getElementById("dance-result").innerHTML = "";
    setDanceBtns();
    document.getElementById("dance-modal").classList.remove("hidden");
  }
  function setDanceBtns() {
    var bx = document.getElementById("dance-btns");
    bx.innerHTML = "";
    var next = document.createElement("button");
    next.className = "btn";
    next.textContent = "Salta report";
    next.addEventListener("click", function () {
      state.queue.shift();
      closeDance();
      if (state.queue.length) openDance();
    });
    var done = document.createElement("button");
    done.className = "btn primary";
    done.textContent = "Fatto";
    done.addEventListener("click", function () {
      state.queue.shift();
      closeDance();
      if (state.queue.length) openDance();
    });
    bx.appendChild(done);
    bx.appendChild(next);
  }
  function closeDance() {
    dance.open = false;
    document.getElementById("dance-modal").classList.add("hidden");
    updateHUD();
  }

  function evalDance() {
    var p = state.patches[dance.report.patchIdx];
    var pts = dance.pts;
    if (pts.length < 3) { dance.result = null; return; }
    var v = { x: pts[pts.length - 1].x - pts[0].x, y: pts[pts.length - 1].y - pts[0].y };
    var len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 12) { dance.result = null; return; }
    var ang = angleFromUp(v.x, v.y);
    var patchAng = angleFromUp(p.x - HIVE.x, p.y - HIVE.y);
    var patchDist = Math.sqrt(dist2(p.x, p.y, HIVE.x, HIVE.y));
    var expectedLen = patchDist / DIST_PER_PX;
    var angErr = Math.abs(normAng(ang - patchAng)) * 180 / Math.PI;
    var lenErr = Math.abs(len - expectedLen) / expectedLen;
    var accA = clamp(1 - angErr / 45, 0, 1);
    var accL = clamp(1 - lenErr / 0.6, 0, 1);
    var acc = 0.6 * accA + 0.4 * accL;
    var idleN = idle();
    var recruits = Math.floor(idleN * acc);
    if (acc > 0.2 && recruits < 1 && idleN >= 1) recruits = 1;
    dance.result = { acc: acc, recruits: recruits, patchAng: patchAng, expectedLen: expectedLen };
    if (recruits >= 1) {
      Sound.recruit();
      R2.buzz([8, 15, 8]);
      if (acc >= 0.35 && p.type.key !== "vespaio") {
        // `rate` è solo un flag "sciame su un campo vero": il rendimento lo
        // calcola updateSquads con patchRateEff(), che applica p.rate una
        // volta sola. Passare p.rate qui lo applicava due volte (rate²).
        addSquad({ x: p.x, y: p.y }, 1, acc, recruits, p);
      } else if (acc >= 0.35 && p.type.key === "vespaio") {
        // il giocatore ha deciso di mandarle comunque: suo onere e rischio
        addSquad({ x: p.x, y: p.y }, 0, 1, recruits, p);
        state.squads[state.squads.length - 1].danger = true;
      } else {
        var wx = HIVE.x + Math.sin(ang) * len * DIST_PER_PX;
        var wy = HIVE.y - Math.cos(ang) * len * DIST_PER_PX;
        addSquad({ x: wx, y: wy }, 0, 1, recruits, null);
        state.squads[state.squads.length - 1].wrong = true;
      }
      renderSquads();
    }
    var txt = document.getElementById("dance-result");
    if (recruits < 1) {
      txt.innerHTML = '<span class="bad">Le operaie non hanno capito la danza (' + Math.round(acc * 100) + "%).</span>";
    } else {
      txt.innerHTML = '<span class="' + (acc >= 0.7 ? "good" : "bad") + '">Precisione: ' + Math.round(acc * 100) +
        "% · " + recruits + " operaie arruolate</span>";
    }
  }

  function setupDanceInput() {
    var c = danceC;
    var dpr = window.devicePixelRatio || 1;
    function pt(e) {
      var r = c.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (c.width / r.width) / dpr,
        y: (e.clientY - r.top) * (c.height / r.height) / dpr,
      };
    }
    c.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      if (!dance.open || dance.result) return;
      var p = pt(e);
      var half = c.width / dpr / 2;
      if (dist2(p.x, p.y, half, half) < 55 * 55) {
        dance.drawing = true;
        dance.pts = [p];
      }
    });
    c.addEventListener("pointermove", function (e) {
      if (!dance.drawing) return;
      e.preventDefault();
      var p = pt(e);
      var last = dance.pts[dance.pts.length - 1];
      if (dist2(p.x, p.y, last.x, last.y) > 9) dance.pts.push(p);
    });
    function up(e) {
      if (!dance.drawing) return;
      e.preventDefault();
      dance.drawing = false;
      evalDance();
    }
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("pointerleave", up);
  }

  function makeCombPattern() {
    var g = document.createElement("canvas");
    var size = 42, h = size * 0.866;
    g.width = size * 3; g.height = Math.round(h * 2);
    var c = g.getContext("2d");
    function hex(x, y) {
      c.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 3 * i + Math.PI / 6;
        var x2 = x + Math.cos(a) * (size / 2 - 2);
        var y2 = y + Math.sin(a) * (size / 2 - 2);
        if (i === 0) c.moveTo(x2, y2); else c.lineTo(x2, y2);
      }
      c.closePath();
      c.fillStyle = "#f2c94c";
      c.fill();
      c.strokeStyle = "#c98d12";
      c.lineWidth = 2;
      c.stroke();
    }
    hex(size * 0.75, h * 0.5);
    hex(size * 1.75, h * 0.5);
    hex(size * 1.25, h * 1.5);
    hex(size * 2.25, h * 1.5);
    return g;
  }

  function renderDance() {
    if (!dance.open) return;
    var dpr = window.devicePixelRatio || 1;
    var cssW = danceC.width / dpr, cssH = danceC.height / dpr;
    var cx = cssW / 2, cy = cssH / 2, R = cssW / 2 - 14;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.clearRect(0, 0, cssW, cssH);
    dctx.fillStyle = combPat || "#f2c94c";
    dctx.fillRect(0, 0, cssW, cssH);
    [300, 600, 900, 1200].forEach(function (m) {
      var r = m / DIST_PER_PX;
      if (r > R) return;
      dctx.strokeStyle = "rgba(43,29,10,0.22)";
      dctx.lineWidth = 1.2;
      dctx.beginPath();
      dctx.arc(cx, cy, r, 0, 6.2832);
      dctx.stroke();
      dctx.fillStyle = "rgba(43,29,10,0.45)";
      dctx.font = "9px sans-serif";
      dctx.textAlign = "left";
      dctx.fillText(m + " m", cx + r + 3, cy - 2);
    });
    dctx.fillStyle = "#fff3c4";
    dctx.beginPath();
    dctx.arc(cx, 22, 12, 0, 6.2832);
    dctx.fill();
    dctx.strokeStyle = "rgba(43,29,10,0.6)";
    dctx.lineWidth = 1.6;
    dctx.beginPath();
    dctx.moveTo(cx, 36); dctx.lineTo(cx, 52);
    dctx.stroke();
    dctx.fillStyle = "rgba(43,29,10,0.6)";
    dctx.font = "bold 9px sans-serif";
    dctx.textAlign = "center";
    dctx.fillText("SOLE", cx, 64);
    dctx.fillStyle = "#2b1d0a";
    dctx.beginPath();
    dctx.ellipse(cx, cy, 8, 5, 0.4, 0, 6.2832);
    dctx.fill();
    dctx.strokeStyle = "#f7d774";
    dctx.lineWidth = 2;
    dctx.beginPath();
    dctx.moveTo(cx - 4, cy - 3); dctx.lineTo(cx - 9, cy - 7);
    dctx.moveTo(cx + 3, cy - 4); dctx.lineTo(cx + 7, cy - 8);
    dctx.stroke();
    if (dance.pts.length > 1) {
      dctx.strokeStyle = "rgba(43,29,10,0.9)";
      dctx.lineWidth = 4;
      dctx.lineCap = "round";
      dctx.beginPath();
      dctx.moveTo(dance.pts[0].x, dance.pts[0].y);
      for (var i = 1; i < dance.pts.length; i++) dctx.lineTo(dance.pts[i].x, dance.pts[i].y);
      dctx.stroke();
      dctx.lineCap = "butt";
    }
    if (dance.result) {
      var pa = dance.result.patchAng, el = dance.result.expectedLen;
      dctx.strokeStyle = "rgba(30,142,62,0.85)";
      dctx.lineWidth = 4;
      dctx.setLineDash([6, 5]);
      dctx.beginPath();
      dctx.moveTo(cx, cy);
      dctx.lineTo(cx + Math.sin(pa) * el, cy - Math.cos(pa) * el);
      dctx.stroke();
      dctx.setLineDash([]);
    }
  }

  /* ===== Meadow render ===== */
  function drawHex(x, y, r, fill, stroke) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 3 * i + Math.PI / 6;
      var x2 = x + Math.cos(a) * r, y2 = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.6; ctx.stroke(); }
  }

  function routePoint(s, f) {
    var outT = 0.42, forT = 0.56;
    if (f < outT) {
      var u = f / outT;
      return { x: lerp(HIVE.x, s.target.x, u), y: lerp(HIVE.y, s.target.y, u) };
    }
    if (f < forT) {
      return {
        x: s.target.x + Math.sin(state.time * 3 + f * 40) * 6,
        y: s.target.y + Math.cos(state.time * 3 + f * 40) * 6,
      };
    }
    var u2 = (f - forT) / (1 - forT);
    return { x: lerp(s.target.x, HIVE.x, u2), y: lerp(s.target.y, HIVE.y, u2) };
  }
  function drawBee(x, y, scout) {
    var wob = Math.sin(state.time * 18) * 1.4;
    ctx.fillStyle = "#2b1d0a";
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2.6, wob * 0.2, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = "rgba(255,244,200,0.8)";
    ctx.beginPath();
    ctx.ellipse(x - 1, y - 3 + wob * 0.4, 2.6, 1.4, -0.6, 0, 6.2832);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 1.4, y - 3 + wob * 0.4, 2.6, 1.4, 0.6, 0, 6.2832);
    ctx.fill();
    if (scout) {
      ctx.strokeStyle = "rgba(43,29,10,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(state.time * 2) * 8, y - Math.sin(state.time * 2) * 8);
      ctx.stroke();
    }
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = "#5b8a3c";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    if (state.shake > 0) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
      state.shake = Math.max(0, state.shake - 0.3);
    }
    ctx.fillStyle = state.season === 3 ? "#cfd8dc" : (state.season === 2 ? "#9aab4e" : "#86b34a");
    ctx.fillRect(0, 0, W, H);
    if (grassPat) { ctx.fillStyle = grassPat; ctx.fillRect(0, 0, W, H); }
    var gg = ctx.createRadialGradient(HIVE.x, HIVE.y, 60, HIVE.x, HIVE.y, 980);
    gg.addColorStop(0, "rgba(247,215,116,0.18)");
    gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, W, H);
    // sole a nord (riferimento della danza)
    ctx.fillStyle = "rgba(255,244,200,0.9)";
    ctx.beginPath();
    ctx.arc(W / 2, 36, 16, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = "rgba(43,29,10,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 54); ctx.lineTo(W / 2, 78);
    ctx.stroke();
    ctx.fillStyle = "rgba(43,29,10,0.55)";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SOLE", W / 2, 94);
    state.patches.forEach(function (p) {
      if (!p.discovered) return;
      var winter = state.season === 3;
      p.dots.forEach(function (d, k) {
        var sway = Math.sin(state.time * 2 + k) * 1.6;
        ctx.fillStyle = winter ? "#e8eef2" : (p.toxic ? "#b48ce0" : p.type.color);
        ctx.beginPath();
        ctx.arc(p.x + d.x + sway, p.y + d.y, d.s, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = "rgba(43,29,10,0.35)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x + d.x, p.y + d.y + 4);
        ctx.lineTo(p.x + d.x + sway * 0.4, p.y + d.y + 10);
        ctx.stroke();
      });
      if (p.type.key === "vespaio") {
        ctx.fillStyle = "#5a3a1a";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = "#2b1d0a";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      if (p.toxic) {
        ctx.fillStyle = "rgba(160,80,255,0.3)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 30, 0, 6.2832);
        ctx.fill();
      }
    });
    state.squads.forEach(function (s) {
      var shown = Math.min(s.bees, 9);
      for (var i = 0; i < shown; i++) {
        var f = (s.t / s.cycle + i * 0.09) % 1;
        var pos = routePoint(s, f);
        drawBee(pos.x + Math.sin(state.time * 6 + i * 2) * 3, pos.y + Math.cos(state.time * 5 + i) * 3);
      }
    });
    state.scouts.forEach(function (sc) {
      if (state.season === 3) return;
      drawBee(sc.x, sc.y, true);
    });
    var hexR = 26;
    for (var hx = -1; hx <= 1; hx++) {
      for (var hy = -1; hy <= 1; hy++) {
        var ox = hx * hexR * 1.74 + (hy % 2 !== 0 ? hexR * 0.87 : 0);
        var oy = hy * hexR * 1.5;
        drawHex(HIVE.x + ox, HIVE.y + oy, hexR * 0.92, hx === 0 && hy === 0 ? "#f7d774" : "#e8a924", "#a8741a");
      }
    }
    ctx.fillStyle = "#2b1d0a";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ALVEARE", HIVE.x, HIVE.y - 56);
    var idleN = idle();
    for (var ib = 0; ib < Math.min(idleN, 10); ib++) {
      var ang = ib * 0.63 + state.time * 0.6;
      var rr = 46 + 7 * Math.sin(state.time * 1.4 + ib);
      drawBee(HIVE.x + Math.cos(ang) * rr, HIVE.y + Math.sin(ang) * rr);
    }
    if (state.season === 3) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (var snow = 0; snow < 60; snow++) {
        var sx = (snow * 137 + state.time * 24) % W;
        var sy = (snow * 89 + state.time * 55) % H;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.6, 0, 6.2832);
        ctx.fill();
      }
    }
    Particles.draw(ctx);
    ctx.restore();
  }

  /* ===== HUD ===== */
  function updateHUD() {
    document.getElementById("honey").textContent = fmt(state.honey);
    document.getElementById("pop").textContent = state.pop;
    document.getElementById("slots").textContent = state.slots;
    document.getElementById("season").textContent =
      SEASONS[state.season].icon + " " + SEASONS[state.season].name + " · Anno " + state.year;
    document.getElementById("seasonfill").style.width =
      (100 - state.seasonT / SEASONS[state.season].dur * 100) + "%";
    var qb = document.getElementById("queuebadge");
    if (state.queue.length) {
      qb.textContent = state.queue.length;
      qb.classList.remove("hidden");
      document.getElementById("dance-btn").disabled = false;
    } else {
      qb.classList.add("hidden");
      document.getElementById("dance-btn").disabled = true;
    }
    document.getElementById("brood-btn").disabled = state.honey < 25 || state.pop >= state.slots;
    document.getElementById("expand-btn").disabled = state.honey < 80 || state.slots >= SLOTS_MAX;
    document.getElementById("scout-btn").disabled = state.honey < 60 || state.scoutCount >= 3;
  }

  function renderSquads() {
    var box = document.getElementById("squads");
    var html = "";
    state.squads.forEach(function (s, i) {
      html += '<span class="squadchip">' + (s.patch ? "🌼" : "🫥") + " " + s.label +
        " ×" + s.bees + '<button data-i="' + i + '" aria-label="Richiama">✕</button></span>';
    });
    box.innerHTML = html;
    box.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.squads.splice(Number(b.dataset.i), 1);
        renderSquads();
      });
    });
  }

  /* ===== Modal ===== */
  function showModal(title, bodyHTML, btns) {
    document.getElementById("m-title").textContent = title;
    document.getElementById("m-body").innerHTML = bodyHTML;
    var bx = document.getElementById("m-btns");
    bx.innerHTML = "";
    btns.forEach(function (b) {
      var el = document.createElement("button");
      el.className = "btn" + (b.primary ? " primary" : "");
      el.innerHTML = b.t;
      el.addEventListener("click", b.f);
      bx.appendChild(el);
    });
    document.getElementById("modal").classList.remove("hidden");
  }
  function hideModal() { document.getElementById("modal").classList.add("hidden"); }

  function showStart() {
    showModal("ALVEARE — Waggle Dance",
      "<b>Sei la mente dell'alveare.</b><br><br>" +
      "• Le <b>esploratrici</b> scoprono i campi e tornano a riferirti<br>" +
      "• Apri la <b>danza</b>: disegna il tratto dall'alveare — <b>l'angolo dal sole</b> è la direzione, <b>la lunghezza</b> è la distanza (scala sugli anelli)<br>" +
      "• Le <b>operaie</b> leggono la danza e vanno dove l'hai indicata: se hai sbagliato, volano nel vuoto<br>" +
      "• Il miele paga nuove api, celle e esploratrici<br>" +
      "• <b>L'inverno è fatale</b>: le api non raccolgono ma continuano a mangiare<br><br>" +
      "Campi diversi rendono diverso. E occhio ai vespai.",
      [{ t: "🐝 Prendi il comando", f: function () { hideModal(); }, primary: true }]);
  }

  /* ===== Loop ===== */
  var lastT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0.016;
    lastT = t;
    state.time += dt;
    if (!state.over) {
      updateSeason(dt);
      updateScouts(dt);
      updateSquads(dt);
      updateEconomy(dt);
      updateEvents();
    }
    Particles.update(dt);
    render();
    renderDance();
    updateHUD();
    requestAnimationFrame(loop);
  }

  /* ===== Init ===== */
  function resize() {
    var stage = document.getElementById("stage");
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    view.scale = Math.min(view.w / (W + 80), view.h / (H + 80));
    view.ox = (view.w - W * view.scale) / 2;
    view.oy = (view.h - H * view.scale) / 2;
  }
  function setupInput() {
    canvas.addEventListener("pointerdown", function (e) {
      var r = canvas.getBoundingClientRect();
      var wx = (e.clientX - r.left - view.ox) / view.scale;
      var wy = (e.clientY - r.top - view.oy) / view.scale;
      if (dist2(wx, wy, HIVE.x, HIVE.y) < 60 * 60) {
        toast("🍯 Miele: " + fmt(state.honey) + " · Api: " + state.pop + "/" + state.slots + " · Squadre: " + state.squads.length);
        return;
      }
      state.patches.forEach(function (p) {
        if (p.discovered && dist2(wx, wy, p.x, p.y) < 34 * 34) {
          toast(p.type.name + " · " + p.dist + " m · nettare " +
            patchRateEff(p).toFixed(2) + "/s per ape" + (p.toxic ? " ☠️ INQUINATO" : ""));
        }
      });
    });
    document.getElementById("dance-btn").addEventListener("click", function () {
      if (state.queue.length) openDance();
    });
    document.getElementById("brood-btn").addEventListener("click", function () {
      if (state.honey < 25 || state.pop >= state.slots) { Sound.error(); return; }
      state.honey -= 25;
      state.brood.push({ t: 18 });
      Sound.brood();
      updateHUD();
    });
    document.getElementById("expand-btn").addEventListener("click", function () {
      if (state.honey < 80 || state.slots >= SLOTS_MAX) { Sound.error(); return; }
      state.honey -= 80;
      state.slots += 4;
      Sound.expand();
      toast("🔮 Celle nuove: spazio per " + state.slots + " api");
      updateHUD();
    });
    document.getElementById("scout-btn").addEventListener("click", function () {
      if (state.honey < 60 || state.scoutCount >= 3) { Sound.error(); return; }
      state.honey -= 60;
      state.scoutCount++;
      newScout();
      Sound.expand();
      toast("🧭 Una nuova esploratrice è in servizio!");
      updateHUD();
    });
    document.getElementById("levels-btn").addEventListener("click", showStart);
    var sbtn = document.getElementById("sound-btn");
    sbtn.textContent = R2.getSettings().sound ? "🔊" : "🔇";
    sbtn.addEventListener("click", function () {
      var st = R2.setSettings({ sound: !R2.getSettings().sound });
      sbtn.textContent = st.sound ? "🔊" : "🔇";
    });
  }

  function init() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    danceC = document.getElementById("dance");
    dctx = danceC.getContext("2d");
    initSound();
    resize();
    window.addEventListener("resize", resize);
    var dpr = window.devicePixelRatio || 1;
    danceC.width = 320 * dpr;
    danceC.height = 320 * dpr;
    buildWorld();
    combPat = dctx.createPattern(makeCombPattern(), "repeat");
    grassPat = (function () {
      var g = document.createElement("canvas");
      g.width = 128; g.height = 128;
      var c = g.getContext("2d");
      for (var i = 0; i < 130; i++) {
        c.strokeStyle = "rgba(40,80,30," + rand(0.05, 0.12).toFixed(2) + ")";
        c.lineWidth = 1;
        c.beginPath();
        var x = rand(0, 128), y = rand(0, 128);
        c.moveTo(x, y);
        c.lineTo(x + rand(-4, 4), y - rand(4, 10));
        c.stroke();
      }
      return ctx.createPattern(g, "repeat");
    })();
    setupInput();
    setupDanceInput();
    showStart();
    R2.trackPlaytime("alveare-pwa/");
    R2.installHint();
    R2.markPlayed("alveare-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
