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
  // impostati da loadLevel() dai parametri del livello
  var LOAN_CAP = 5000, BANKRUPT_AT = -400, GROWTH_CAP = 1500, SPAWN_CHANCE = 0.22;
  var PALETTE = ["#e0342c", "#2c7be0", "#22a55e", "#e8a924", "#9b59d0", "#e07d2c"];
  var LNAMES = ["Linea Rossa", "Linea Azzurra", "Linea Verde", "Linea Gialla", "Linea Viola", "Linea Arancio"];
  var NPRE = ["Porta ", "Borgo ", "Ponte ", "Campo ", "Villa ", "Piazza ", "Vico ", "Mura "];
  var NSUF = ["Nuova", "Vecchia", "Alta", "Stella", "Fiore", "Serena", "Lunga", "Rota", "Mare", "Colle"];

  /* ===== Livelli =====
   * district: {name,x,y,pop,jobs,geo}   geo = costo scavo/stazione
   * water:    {kind:'river',w,pts:[[x,y]..]} | {kind:'lake',x,y,rx,ry}
   * bridge:   {name,x,y,r}  passare vicino a un ponte annulla il sovrapprezzo
   * params:   sovrascrivono le costanti globali per quel livello
   */
  var LEVELS = [
    {
      id: "libera", name: "Città libera", subtitle: "Mappa generata",
      blurb: "Nessuna geologia, nessun fiume: la città si genera ogni volta. Impara le regole su una mappa qualsiasi.",
      hint: "Ogni quartiere servito cresce, e dalla sua crescita nascono altri quartieri da servire.",
      par: 2, goal: { paxDay: 9000, days: 14 }, procedural: true,
      params: {},
      centers: [], water: [], bridges: [], districts: [],
    },
    {
      id: "borgo", name: "Prima linea", subtitle: "Borgo Piccolo",
      blurb: "Sei quartieri, un solo centro. La prima linea che apri in città.",
      hint: "Il centro storico costa il triplo, ma la stazione la paghi una volta sola: poi allunghi da lì.",
      par: 2, goal: { paxDay: 8000, days: 14, servedMin: 5 },
      params: { money: 1200, fare: 1.2, maxLines: 4, maxDistricts: 14,
                stationBase: 80, tunnelPerPx: 0.9, trainCap: 120, trainCost: 150,
                trainSpeed: 220, day: 150, loanCap: 5000, interest: 0.02,
                bankruptAt: -400, growthCap: 1500, spawnChance: 0.18 },
      centers: [{ name: "Centro storico", x: 850, y: 850, r: 240 }],
      water: [], bridges: [],
      districts: [
        { name: "Porta Vecchia",  x: 850,  y: 850,  pop: 900, jobs: 520, geo: 2.80 },
        { name: "Campo Nuova",   x: 850,  y: 545,  pop: 640, jobs: 210, geo: 1.20 },
        { name: "Vico Lunga",    x: 850,  y: 1160, pop: 620, jobs: 180, geo: 1.10 },
        { name: "Mura Alta",     x: 575,  y: 850,  pop: 560, jobs: 260, geo: 1.90 },
        { name: "Ponte Serena",  x: 1130, y: 850,  pop: 580, jobs: 240, geo: 1.30 },
        { name: "Colle Stella",  x: 850,  y: 300,  pop: 420, jobs: 120, geo: 0.85 },
      ],
    },
    {
      id: "varo", name: "Il Varo", subtitle: "Due rive",
      blurb: "Il fiume divide la città in due. Tre ponti — solo uno è comodo.",
      hint: "Sott'acqua il tunnel costa ×3.2: passa dal ponte e risparmi due terzi.",
      par: 3, goal: { paxDay: 9000, days: 16, servedMin: 7 },
      params: { money: 1000, fare: 1.2, maxLines: 5, maxDistricts: 16,
                stationBase: 85, tunnelPerPx: 0.9, trainCap: 150, trainCost: 150,
                trainSpeed: 220, day: 150, loanCap: 5000, interest: 0.02,
                bankruptAt: -400, growthCap: 1600, spawnChance: 0.20 },
      centers: [{ name: "Centro storico", x: 700, y: 850, r: 250 }],
      water: [{ kind: "river", w: 64, pts: [[830,-40],[880,320],[820,700],[870,1050],[830,1400],[880,1740]] }],
      bridges: [{ name: "Ponte Alto", x: 860, y: 480 },
                { name: "Ponte Mezzo", x: 862, y: 860 },
                { name: "Ponte Basso", x: 846, y: 1250 }],
      districts: [
        { name: "Mura Vecchia",  x: 600,  y: 850,  pop: 820, jobs: 480, geo: 2.60 },
        { name: "Borgo Stella",  x: 360,  y: 560,  pop: 600, jobs: 230, geo: 1.20 },
        { name: "Colle Nuova",   x: 400,  y: 1180, pop: 560, jobs: 180, geo: 1.00 },
        { name: "Vico Sereno",   x: 640,  y: 1330, pop: 480, jobs: 150, geo: 0.90 },
        { name: "Porta Alta",    x: 300,  y: 870,  pop: 520, jobs: 200, geo: 1.10 },
        { name: "Ponte Vecchia", x: 1090, y: 850,  pop: 780, jobs: 520, geo: 2.40 },
        { name: "Via Lunga",     x: 1200, y: 540,  pop: 620, jobs: 240, geo: 1.25 },
        { name: "Mura Nuova",    x: 1270, y: 1180, pop: 580, jobs: 210, geo: 1.05 },
        { name: "Campo Fiora",   x: 1130, y: 1330, pop: 500, jobs: 170, geo: 0.95 },
        { name: "Villa Rotta",   x: 1400, y: 840,  pop: 460, jobs: 150, geo: 0.85 },
      ],
    },
    {
      id: "porto", name: "Il Porto", subtitle: "Due centri",
      blurb: "Centro storico a nord-ovest, porto a sud-est. Il bacino d'acqua taglia in mezzo i due.",
      hint: "Il collegamento diretto centro↔porto passa dentro il bacino: costa ×3.2. Il molo lo aggira.",
      par: 3, goal: { paxDay: 13000, days: 18, servedMin: 8 },
      params: { money: 950, fare: 1.3, maxLines: 5, maxDistricts: 18,
                stationBase: 85, tunnelPerPx: 0.95, trainCap: 160, trainCost: 160,
                trainSpeed: 220, day: 150, loanCap: 5000, interest: 0.025,
                bankruptAt: -500, growthCap: 1700, spawnChance: 0.22 },
      centers: [{ name: "Centro storico", x: 760, y: 620, r: 230 },
                { name: "Porto",         x: 1270, y: 1180, r: 260 }],
      water: [{ kind: "lake", x: 930, y: 880, rx: 230, ry: 165 }],
      bridges: [{ name: "Ponte del Molo", x: 1150, y: 880, r: 40 }],
      districts: [
        { name: "Piazza Alta",    x: 760,  y: 620,  pop: 940, jobs: 520, geo: 2.90 },
        { name: "Vico Nuova",     x: 520,  y: 420,  pop: 640, jobs: 210, geo: 1.30 },
        { name: "Mura Lunga",     x: 400,  y: 800,  pop: 600, jobs: 180, geo: 1.05 },
        { name: "Campo Sereno",   x: 620,  y: 900,  pop: 520, jobs: 160, geo: 1.00 },
        { name: "Colle Stella",   x: 980,  y: 380,  pop: 560, jobs: 200, geo: 0.90 },
        { name: "Porto Vecchio",  x: 1270, y: 1180, pop: 880, jobs: 560, geo: 2.20 },
        { name: "Mura Marina",    x: 1460, y: 1000, pop: 620, jobs: 300, geo: 1.40 },
        { name: "Via Rotta",      x: 1500, y: 1400, pop: 520, jobs: 220, geo: 1.15 },
        { name: "Ponte Nuova",    x: 1060, y: 1420, pop: 560, jobs: 190, geo: 1.00 },
        { name: "Villa Alta",     x: 1180, y: 760,  pop: 480, jobs: 150, geo: 0.85 },
      ],
    },
    {
      id: "meandrica", name: "Meandrica", subtitle: "Tre isole",
      blurb: "Il fiume serpeggia e lascia due soli ponti. La parte vecchia è la più cara della città.",
      hint: "Nord e sud si toccano solo ai due ponti: scegli dove spendi i soldi.",
      par: 4, goal: { paxDay: 13000, days: 20, servedMin: 9 },
      params: { money: 850, fare: 1.3, maxLines: 6, maxDistricts: 18,
                stationBase: 90, tunnelPerPx: 1.0, trainCap: 170, trainCost: 170,
                trainSpeed: 230, day: 150, loanCap: 6000, interest: 0.025,
                bankruptAt: -500, growthCap: 1700, spawnChance: 0.22 },
      centers: [{ name: "Centro storico", x: 850, y: 700, r: 220 },
                { name: "Isola del Lattaio", x: 1250, y: 850, r: 200 }],
      water: [{ kind: "river", w: 70, pts: [[-40,1120],[320,1060],[640,1150],[980,1080],[1300,1000],[1740,1060]] }],
      bridges: [{ name: "Ponte del Centro", x: 796, y: 1080, r: 40 },
                { name: "Ponte Basso",      x: 1216, y: 1015, r: 40 }],
      districts: [
        { name: "Piazza Vecchia",  x: 850,  y: 700,  pop: 980, jobs: 540, geo: 3.00 },
        { name: "Mura Alta",       x: 620,  y: 520,  pop: 640, jobs: 220, geo: 1.50 },
        { name: "Vico Nuova",      x: 560,  y: 860,  pop: 580, jobs: 180, geo: 1.10 },
        { name: "Colle Serena",    x: 1120, y: 560,  pop: 620, jobs: 240, geo: 1.20 },
        { name: "Lattaio Vecchio", x: 1250, y: 850,  pop: 860, jobs: 480, geo: 2.70 },
        { name: "Campo Nuova",     x: 1430, y: 700,  pop: 540, jobs: 180, geo: 1.00 },
        { name: "Villa Marina",    x: 1560, y: 900,  pop: 480, jobs: 150, geo: 0.85 },
        { name: "Vico Basso",      x: 400,  y: 1300, pop: 560, jobs: 180, geo: 0.90 },
        { name: "Campo Stella",    x: 760,  y: 1330, pop: 600, jobs: 200, geo: 0.95 },
        { name: "Ponte Rotta",     x: 1150, y: 1330, pop: 520, jobs: 160, geo: 1.00 },
        { name: "Via Marina",      x: 1500, y: 1300, pop: 520, jobs: 160, geo: 0.90 },
      ],
    },
    {
      id: "metropolix", name: "Metropolix", subtitle: "La città matura",
      blurb: "Tre centri di lavoro, un fiume, quattordici quartieri. La rete che regge tutto.",
      hint: "Quattro ponti, ma solo due collegano il nord ai quartieri nuovi: il resto è ghepardo.",
      par: 5, goal: { paxDay: 20000, days: 24, servedMin: 10 },
      params: { money: 800, fare: 1.4, maxLines: 6, maxDistricts: 22,
                stationBase: 95, tunnelPerPx: 1.05, trainCap: 180, trainCost: 180,
                trainSpeed: 230, day: 150, loanCap: 7000, interest: 0.03,
                bankruptAt: -600, growthCap: 1800, spawnChance: 0.24 },
      centers: [{ name: "Centro storico",      x: 850,  y: 620,  r: 220 },
                { name: "Isola del Lattaio",   x: 1280, y: 1230, r: 200 },
                { name: "Città della Ricerca", x: 420,  y: 420,  r: 200 }],
      water: [{ kind: "river", w: 64, pts: [[-40,980],[320,930],[620,1010],[900,940],[1180,990],[1500,930],[1740,960]] }],
      bridges: [{ name: "Ponte Ovest",     x: 470,  y: 965, r: 40 },
                { name: "Ponte Nord",      x: 778,  y: 960, r: 40 },
                { name: "Ponte del Porto", x: 1160, y: 988, r: 40 },
                { name: "Ponte Sud",       x: 1374, y: 960, r: 40 }],
      districts: [
        { name: "Piazza Vecchia",  x: 850,  y: 620,  pop: 1000, jobs: 560, geo: 3.00 },
        { name: "Mura Alta",       x: 640,  y: 470,  pop: 660,  jobs: 240, geo: 1.60 },
        { name: "Vico Nuova",      x: 580,  y: 780,  pop: 620,  jobs: 200, geo: 1.15 },
        { name: "Ricerca Vecchia", x: 420,  y: 420,  pop: 820,  jobs: 520, geo: 2.50 },
        { name: "Borgo Stella",    x: 300,  y: 700,  pop: 560,  jobs: 180, geo: 0.95 },
        { name: "Campo Serena",    x: 360,  y: 1150, pop: 600,  jobs: 190, geo: 0.90 },
        { name: "Vico Basso",      x: 700,  y: 1330, pop: 620,  jobs: 210, geo: 1.00 },
        { name: "Ponte Rotta",     x: 1080, y: 1330, pop: 640,  jobs: 220, geo: 1.05 },
        { name: "Lattaio Vecchio", x: 1280, y: 1230, pop: 900,  jobs: 500, geo: 2.70 },
        { name: "Mura Lunga",      x: 1180, y: 900,  pop: 640,  jobs: 260, geo: 1.40 },
        { name: "Villa Nuova",     x: 1500, y: 760,  pop: 600,  jobs: 230, geo: 1.20 },
        { name: "Campo Fiora",     x: 1520, y: 1100, pop: 540,  jobs: 180, geo: 1.00 },
        { name: "Via Marina",      x: 1540, y: 1400, pop: 520,  jobs: 160, geo: 0.90 },
        { name: "Colle Alto",      x: 1080, y: 520,  pop: 580,  jobs: 210, geo: 1.30 },
      ],
    },
  ];
  var LEVEL = LEVELS[1];
  var PROGRESS_KEY = "metro-levels";


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
  function addDistrict(x, y, pop, jobs, name, geo) {
    var d = {
      id: state.districts.length,
      name: name || distName(),
      x: x, y: y,
      pop: Math.round(pop), jobs: Math.round(jobs),
      geo: geo != null ? geo : rand(0.85, 1.8),
      seed: rand(0, 6.2832),
      served: false, stress: 1, wait: 0,
      blob: [],
    };
    for (var k = 0; k < 8; k++) d.blob.push(rand(0.82, 1.18));
    state.districts.push(d);
    return d;
  }
  /* ===== Acqua & ponti ===== */
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    return Math.sqrt(dist2(px, py, ax + dx * t, ay + dy * t));
  }
  function inWater(x, y) {
    return LEVEL.water.some(function (w) {
      if (w.kind === "lake") {
        var nx = (x - w.x) / w.rx, ny = (y - w.y) / w.ry;
        return nx * nx + ny * ny <= 1;
      }
      for (var i = 1; i < w.pts.length; i++) {
        if (segDist(x, y, w.pts[i - 1][0], w.pts[i - 1][1], w.pts[i][0], w.pts[i][1]) <= w.w / 2) return true;
      }
      return false;
    });
  }
  function nearBridge(x, y) {
    return LEVEL.bridges.some(function (b) {
      return Math.sqrt(dist2(x, y, b.x, b.y)) <= (b.r || 40);
    });
  }
  // Il tracciato che taglia l'acqua costa x3.2; se passa su un ponte x1.8.
  function waterMult(a, b) {
    if (!LEVEL.water.length) return 1;
    var N = 24, mult = 1;
    for (var i = 1; i <= N; i++) {
      var k = i / N;
      var x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      if (inWater(x, y)) mult = Math.max(mult, nearBridge(x, y) ? 1.8 : 3.2);
    }
    return mult;
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

  /* ===== Caricamento livello ===== */
  function loadLevel(idx) {
    LEVEL = LEVELS[clamp(idx, 0, LEVELS.length - 1)];
    var q = LEVEL.params;
    // le costanti globali diventano i parametri del livello: tutto il resto
    // del gioco continua a usarle senza sapere che esistono i livelli
    DAY = q.day || 150;
    TRAIN_SPEED = q.trainSpeed || 220;
    TRAIN_CAP = q.trainCap || 120;
    TRAIN_COST = q.trainCost || 150;
    STATION_BASE = q.stationBase || 80;
    TUNNEL_PER_PX = q.tunnelPerPx || 0.9;
    LOAN_INTEREST_DAY = q.interest || 0.02;
    LOAN_CAP = q.loanCap || 5000;
    BANKRUPT_AT = q.bankruptAt != null ? q.bankruptAt : -400;
    GROWTH_CAP = q.growthCap || 1500;
    SPAWN_CHANCE = q.spawnChance != null ? q.spawnChance : 0.22;
    MAX_LINES = q.maxLines || 6;
    MAX_DISTRICTS = q.maxDistricts || 22;

    state.money = q.money != null ? q.money : 900;
    state.fare = q.fare || 1.2;
    state.districts = [];
    state.lines = [];
    state.usedNames = {};
    state.day = 1;
    state.tod = 0.08;
    state.time = 0;
    state.loan = 0;
    state.totalPax = 0;
    state.deliveredDay = 0;
    state.over = false;
    state.sel = null;
    state.build = null;
    state.finance = false;

    if (LEVEL.procedural) {
      genCity();
    } else {
      LEVEL.districts.forEach(function (d) { addDistrict(d.x, d.y, d.pop, d.jobs, d.name, d.geo); });
    }
    recomputeDemand();
    renderDock();
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
    state.districts.filter(function (d) { return d.pop > GROWTH_CAP; }).forEach(function (d) {
      if (Math.random() < SPAWN_CHANCE && state.districts.length < MAX_DISTRICTS) {
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
    if (state.money < BANKRUPT_AT && !state.over) bankrupt();
  }
  function bankrupt() {
    state.over = true;
    Sound.die();
    var best = Number(localStorage.getItem("metro-best") || 0);
    if (state.totalPax > best) { localStorage.setItem("metro-best", String(Math.floor(state.totalPax))); best = Math.floor(state.totalPax); }
    R2.saveJSON("metro-pwa", { highScore: Math.floor(state.totalPax) });
    showModal("BANCAROTTA",
      "Il bilancio è andato sotto " + fmtMoney(BANKRUPT_AT) + " e i creditori hanno sequestrato la rete.<br><br>Passeggeri trasportati: <b>" + fmtNum(state.totalPax) + "</b> (record: " + fmtNum(best) + ")<br>Giorni di servizio: <b>" + state.day + "</b><br><br>" +
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
    var w = waterMult(fromD, toD);
    return Math.round(STATION_BASE * toD.geo + d * TUNNEL_PER_PX * geo * w);
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
    if (state.loan + amount > LOAN_CAP) { Sound.error(); toast("Il rating non copre più debito."); return; }
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

    // acqua
    LEVEL.water.forEach(function (w) {
      ctx.strokeStyle = "rgba(96,164,214,0.55)";
      ctx.fillStyle = "rgba(96,164,214,0.32)";
      if (w.kind === "lake") {
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, w.rx, w.ry, 0, 0, 6.2832);
        ctx.fill();
      } else {
        ctx.lineWidth = w.w;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(w.pts[0][0], w.pts[0][1]);
        for (var i = 1; i < w.pts.length; i++) ctx.lineTo(w.pts[i][0], w.pts[i][1]);
        ctx.stroke();
      }
    });
    // centri storici: qui la geologia (e quindi lo scavo) è cara
    LEVEL.centers.forEach(function (c) {
      ctx.strokeStyle = "rgba(180,120,60,0.45)";
      ctx.setLineDash([7, 7]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, 6.2832);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(150,100,50,0.75)";
      ctx.font = "italic 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(c.name, c.x, c.y - c.r - 7);
    });

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
    LEVEL.bridges.forEach(function (b) {
      ctx.strokeStyle = "rgba(70,70,78,0.9)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(b.x - 26, b.y - 12);
      ctx.lineTo(b.x + 26, b.y + 12);
      ctx.stroke();
      ctx.fillStyle = "rgba(40,40,48,0.95)";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.name, b.x, b.y + 26);
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

  function progress() { return R2.loadJSON(PROGRESS_KEY, { done: {}, best: {} }); }
  function levelUnlocked(i) {
    if (i === 0) return true;
    var pr = progress();
    // il livello precedente deve essere stato completato almeno una volta
    return !!pr.done[LEVELS[i - 1].id];
  }
  function suonoClick() { if (Sound) Sound.click && Sound.click(); }
  function showLevels() {
    var pr = progress();
    var cards = "";
    for (var i = 0; i < LEVELS.length; i++) {
      var L = LEVELS[i];
      var unlocked = levelUnlocked(i);
      var best = pr.best[L.id];
      cards += unlocked
        ? '<button class="lvcard" data-i="' + i + '">' +
            '<span class="lvnum">' + (i + 1) + '</span>' +
            '<span class="lvname">' + L.name + '</span>' +
            '<span class="lvsub">' + L.subtitle + '</span>' +
            '<span class="lvmeta">' + (best ? fmtK(best) + " pax/g · " : "") + "par " + L.par + "</span>" +
          "</button>"
        : '<button class="lvcard locked"><span class="lvnum">🔒</span><span class="lvname">?</span><span class="lvsub">' + L.subtitle + "</span></button>";
    }
    showModal("LINEA ROSSA — Metro Planner",
      '<div class="lvgrid">' + cards + '</div>' +
      '<div class="body">Sei l\'ingegnere della prima metropolitana della città.<br><br>' +
      "• <b>➕ Nuova linea</b>: tocca i quartieri in sequenza per tracciarla (scavo e stazioni costano — la geologia conta)<br>" +
      "• I <b>quartieri serviti</b> crescono e ne nascono di nuovi: la città segue la tua rete<br>" +
      "• La <b>domanda</b> segue la gravity model: più residenti e uffici collegati = più passeggeri<br>" +
      "• Gli <b>interscambi</b> tra linee ampliano la copertura, ma costano in tempo ai passeggeri<br>" +
      "• <b>Tariffa alta</b> = più ricavi, meno passeggeri. <b>Treni</b> = capienza<br>" +
      "• <b>Sott'acqua</b> il tunnel costa ×3.2: un <b>ponte</b> lo riduce a ×1.8<br>" +
      "• I <b>prestiti</b> hanno interesse quotidiano: la bancarotta è vicina",
      [{ t: "Chiudi", f: hideModal, ghost: true }]);
    document.querySelectorAll(".lvcard[data-i]").forEach(function (b) {
      b.addEventListener("click", function () {
        hideModal();
        startLevel(Number(b.dataset.i));
      });
    });
  }
  function startLevel(i) {
    loadLevel(i);
    var L = LEVELS[i];
    if (!L.procedural) {
      showModal(L.name.toUpperCase() + " — " + L.subtitle,
        L.blurb + "<br><br><b>Obiettivo</b>: " + fmtK(L.goal.paxDay) + " passeggeri/giorno entro " + L.goal.days + " giorni, " +
        "almeno " + L.goal.servedMin + " quartieri serviti.<br><br>💡 " + L.hint,
        [{ t: "🚇 Apri il cantiere", f: hideModal, primary: true }]);
    }
  }
  function showFinance() {
    showModal("Finanza",
      "Cassa: <b>" + fmtMoney(state.money) + "</b><br>" +
      "Debito: <b>" + fmtMoney(state.loan) + "</b> (interesse " + (LOAN_INTEREST_DAY * 100).toFixed(1) + "%/giorno, tetto " + fmtMoney(LOAN_CAP) + ")<br>" +
      "Tariffa: <b>" + state.fare.toFixed(2) + "</b> — più alta porta più ricavi ma meno passeggeri<br>" +
      "Treno: <b>" + fmtMoney(TRAIN_COST) + "</b> · capacità " + TRAIN_CAP + " passeggeri<br><br>" +
      "La bancarotta scatta sotto " + fmtMoney(BANKRUPT_AT) + ".",
      [{ t: "Chiudi", f: hideModal, ghost: true }]);
  }

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
      [{ t: "🚇 Apri il cantiere", f: function () { hideModal(); }, primary: true },
       { t: "☰ Scegli la mappa", f: showLevels, ghost: true }]);
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
    setupInput();
    // si parte dal primo livello sbloccato, poi si sceglie la mappa
    var start = 0;
    for (var i = LEVELS.length - 1; i > 0; i--) { if (levelUnlocked(i)) { start = i; break; } }
    loadLevel(start);
    setupHudButtons();
    if (!LEVEL.procedural) startLevel(start);
    else showStart();
    R2.trackPlaytime("metro-pwa/");
    R2.installHint();
    R2.markPlayed("metro-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  function setupHudButtons() {
    var hb = $("help-btn"), fb = $("fin-btn"), sb = $("sound-btn");
    if (hb) hb.addEventListener("click", function () { suonoClick(); showLevels(); });
    if (fb) fb.addEventListener("click", function () { suonoClick(); showFinance(); });
    if (sb) {
      sb.textContent = R2.getSettings().sound ? "🔊" : "🔇";
      sb.addEventListener("click", function () {
        var st = R2.setSettings({ sound: !R2.getSettings().sound });
        sb.textContent = st.sound ? "🔊" : "🔇";
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
