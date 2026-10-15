/*
 * Viti & Lastre — puzzle meccanico con fisica rigida
 * Svita, sposta e riavvita le viti giuste: le lastre senza sostegno cadono.
 * Canvas 2D + mini engine Box2D-lite (SAT + impulsi sequenziali, solo box).
 * Nessun asset: tutto procedurale. shared/arcade.js per suoni/haptics/record.
 */
(function () {
  "use strict";

  /* ================= Config ================= */
  var W = 420, H = 680;
  var BENCH_Y = 600;                 // piano di appoggio
  var WALL_T = 8;
  var GRAV = 1400;
  var SUBSTEPS = 3, ITER = 4;
  var TRAY_CAP = 4;
  var BREAK_V = 700;                 // velocità d'impatto che rompe il vetro
  var POP_V = 450;                   // velocità che fa saltare le viti (colpo metallo)
  var COLORS = { B: "#3b82f6", R: "#ef4444", G: "#22c55e", A: "#f59e0b" };
  var CNAMES = { B: "blu", R: "rossa", G: "verde", A: "ambra" };
  var TH = { wood: 20, metal: 22, glass: 16 };
  var DENS = { wood: 1, metal: 1.7, glass: 0.8 };
  var TYPETAG = { rust: "R", spring: "M", selftap: "U" };

  /* ================= Levels ================= */
  // plate: {x,y,w,h,mat,z}  ·  hole: {x,y,c,wall,th,empty}  ·  screw: {hole,c,type}
  var LEVELS = [
    { name: "Primo strappo", par: 4,
      hint: "Tocca una vite per svitarla: le lastre senza viti cadono!",
      plates: [ {x:210,y:240,w:260,h:20,mat:"wood",z:1}, {x:210,y:380,w:260,h:20,mat:"wood",z:1} ],
      holes: [ {x:110,y:240,c:"B",wall:1,th:[0]}, {x:310,y:240,c:"B",wall:1,th:[0]},
               {x:110,y:380,c:"B",wall:1,th:[1]}, {x:310,y:380,c:"B",wall:1,th:[1]} ],
      screws: [ {hole:0,c:"B"}, {hole:1,c:"B"}, {hole:2,c:"B"}, {hole:3,c:"B"} ] },

    { name: "La vite che tiene due", par: 4,
      hint: "Le viti lunghe bloccano due laste insieme: svitale entrambe prima che qualcosa scenda!",
      plates: [ {x:210,y:250,w:260,h:20,mat:"wood",z:1}, {x:210,y:265,w:260,h:20,mat:"wood",z:2} ],
      holes: [ {x:100,y:250,c:"B",wall:1,th:[0]}, {x:320,y:250,c:"B",wall:1,th:[0]},
               {x:150,y:257,c:"G",wall:0,th:[0,1]}, {x:270,y:257,c:"G",wall:0,th:[0,1]} ],
      screws: [ {hole:0,c:"B"}, {hole:1,c:"B"}, {hole:2,c:"G"}, {hole:3,c:"G"} ] },

    { name: "Rosso su rosso", par: 4,
      hint: "Le viti si riavvitano solo nei fori dello stesso colore!",
      plates: [ {x:210,y:220,w:280,h:20,mat:"wood",z:2}, {x:210,y:340,w:280,h:20,mat:"wood",z:1} ],
      holes: [ {x:90,y:220,c:"R",wall:1,th:[0]}, {x:330,y:220,c:"R",wall:1,th:[0]},
               {x:160,y:220,c:"B",wall:1,th:[0],empty:1}, {x:260,y:220,c:"B",wall:1,th:[0],empty:1},
               {x:90,y:340,c:"G",wall:1,th:[1]}, {x:330,y:340,c:"G",wall:1,th:[1]},
               {x:160,y:340,c:"B",wall:1,th:[1],empty:1}, {x:260,y:340,c:"B",wall:1,th:[1],empty:1} ],
      screws: [ {hole:0,c:"R"}, {hole:1,c:"R"}, {hole:4,c:"G"}, {hole:5,c:"G"} ] },

    { name: "Arrugginita", par: 4,
      hint: "La vite coperta non si tocca: smonta prima la lasta che la copre. Le arrugginite vogliono 3 tocchi!",
      plates: [ {x:140,y:400,w:20,h:240,mat:"wood",z:1}, {x:240,y:505,w:220,h:20,mat:"wood",z:2} ],
      holes: [ {x:140,y:290,c:"B",wall:1,th:[0]}, {x:140,y:510,c:"R",wall:1,th:[0]},
               {x:200,y:505,c:"G",wall:1,th:[1]}, {x:320,y:505,c:"G",wall:1,th:[1]} ],
      screws: [ {hole:0,c:"B"}, {hole:1,c:"R",type:"rust"}, {hole:2,c:"G"}, {hole:3,c:"G"} ] },

    { name: "Vetro delicato", par: 6, protectGlass: true,
      hint: "La molla scatta solo se resta l'ultima vite: svitala per prima! E il vetro non si deve rompere…",
      plates: [ {x:160,y:470,w:240,h:16,mat:"glass",z:2},
                {x:110,y:200,w:180,h:20,mat:"wood",z:1,rail:1},
                {x:140,y:560,w:160,h:20,mat:"wood",z:1} ],
      holes: [ {x:70,y:470,c:"B",wall:1,th:[0]}, {x:250,y:470,c:"B",wall:1,th:[0]},
               {x:50,y:200,c:"A",wall:1,th:[1]}, {x:170,y:200,c:"A",wall:1,th:[1]},
               {x:90,y:560,c:"R",wall:0,th:[2]}, {x:190,y:560,c:"R",wall:1,th:[2]} ],
      screws: [ {hole:0,c:"B"}, {hole:1,c:"B"}, {hole:2,c:"A"}, {hole:3,c:"A"},
                {hole:4,c:"R",type:"spring"}, {hole:5,c:"R"} ] },

    { name: "Effetto domino", par: 4,
      hint: "Il metallo che cade da forte fa saltare le viti della lasta che colpisce!",
      plates: [ {x:210,y:300,w:240,h:22,mat:"metal",z:2}, {x:210,y:480,w:240,h:20,mat:"wood",z:1},
                {x:210,y:160,w:200,h:20,mat:"wood",z:1,rail:1} ],
      holes: [ {x:110,y:300,c:"B",wall:1,th:[0]}, {x:310,y:300,c:"B",wall:1,th:[0]},
               {x:110,y:480,c:"G",wall:1,th:[1]}, {x:310,y:480,c:"G",wall:1,th:[1]},
               {x:130,y:160,c:"A",wall:1,th:[2]}, {x:290,y:160,c:"A",wall:1,th:[2]} ],
      screws: [ {hole:0,c:"B",type:"rust"}, {hole:1,c:"B"}, {hole:2,c:"G"}, {hole:3,c:"G"},
                {hole:4,c:"A"}, {hole:5,c:"A"} ] },

    { name: "In officina", par: 8,
      hint: "Il portaviti è piccolo: riavvita le viti nei fori liberi per fare spazio!",
      plates: [ {x:210,y:200,w:260,h:20,mat:"wood",z:3}, {x:210,y:340,w:260,h:20,mat:"wood",z:2},
                {x:210,y:480,w:260,h:20,mat:"wood",z:1} ],
      holes: [ {x:110,y:200,c:"R",wall:1,th:[0]}, {x:310,y:200,c:"G",wall:1,th:[0]},
               {x:210,y:200,c:"B",wall:1,th:[0],empty:1},
               {x:110,y:340,c:"B",wall:1,th:[1]}, {x:310,y:340,c:"R",wall:1,th:[1],empty:1},
               {x:110,y:480,c:"G",wall:1,th:[2]}, {x:310,y:480,c:"B",wall:1,th:[2],empty:1} ],
      screws: [ {hole:0,c:"R"}, {hole:1,c:"G"}, {hole:3,c:"B"}, {hole:5,c:"G"} ] },

    { name: "La catena", par: 4,
      hint: "Ruggine + metallo che cade = le viti della lasta sotto volano via!",
      plates: [ {x:210,y:240,w:220,h:22,mat:"metal",z:2}, {x:210,y:420,w:220,h:20,mat:"wood",z:1},
                {x:210,y:140,w:220,h:20,mat:"wood",z:1,rail:1} ],
      holes: [ {x:130,y:240,c:"B",wall:1,th:[0]}, {x:290,y:240,c:"B",wall:1,th:[0]},
               {x:130,y:420,c:"G",wall:1,th:[1]}, {x:290,y:420,c:"G",wall:1,th:[1]},
               {x:120,y:140,c:"A",wall:1,th:[2]}, {x:300,y:140,c:"A",wall:1,th:[2]} ],
      screws: [ {hole:0,c:"B",type:"rust"}, {hole:1,c:"B"}, {hole:2,c:"G"}, {hole:3,c:"G"},
                {hole:4,c:"A"}, {hole:5,c:"A"} ] },

    { name: "La torre", par: 12,
      hint: "Dodici viti, cinque lastre. L'ordine sbagliato è comunque uno spettacolo…",
      plates: [ {x:210,y:180,w:240,h:20,mat:"wood",z:1}, {x:210,y:196,w:240,h:20,mat:"wood",z:2},
                {x:210,y:212,w:240,h:22,mat:"metal",z:3}, {x:210,y:228,w:240,h:20,mat:"wood",z:4},
                {x:210,y:244,w:240,h:20,mat:"wood",z:5} ],
      holes: [ {x:110,y:180,c:"B",wall:1,th:[0]}, {x:310,y:180,c:"B",wall:1,th:[0]},
               {x:150,y:192,c:"G",wall:0,th:[0,1]}, {x:270,y:192,c:"G",wall:0,th:[0,1]},
               {x:150,y:208,c:"R",wall:0,th:[1,2]}, {x:270,y:208,c:"R",wall:0,th:[1,2]},
               {x:210,y:212,c:"A",wall:1,th:[2]},
               {x:150,y:224,c:"B",wall:0,th:[2,3]}, {x:270,y:224,c:"B",wall:0,th:[2,3]},
               {x:150,y:240,c:"G",wall:0,th:[3,4]}, {x:270,y:240,c:"G",wall:0,th:[3,4]},
               {x:210,y:244,c:"R",wall:1,th:[4]} ],
      screws: [ {hole:0,c:"B"}, {hole:1,c:"B"}, {hole:2,c:"G"}, {hole:3,c:"G"}, {hole:4,c:"R"},
                {hole:5,c:"R"}, {hole:6,c:"A"}, {hole:7,c:"B"}, {hole:8,c:"B"}, {hole:9,c:"G"},
                {hole:10,c:"G"}, {hole:11,c:"R"} ] },

    { name: "Il capannone", par: 16, protectGlass: true,
      hint: "Riassunto finale: il legno sotto il metallo NON deve cadere prima del metallo!",
      plates: [ {x:210,y:520,w:220,h:16,mat:"glass",z:4},
                {x:110,y:150,w:180,h:20,mat:"wood",z:1,rail:1},
                {x:140,y:560,w:160,h:20,mat:"wood",z:1},
                {x:300,y:240,w:180,h:22,mat:"metal",z:2},
                {x:210,y:300,w:200,h:20,mat:"wood",z:1,rail:1},
                {x:210,y:380,w:240,h:20,mat:"wood",z:3},
                {x:210,y:180,w:220,h:22,mat:"metal",z:1} ],
      holes: [ {x:140,y:520,c:"B",wall:1,th:[0]}, {x:280,y:520,c:"B",wall:1,th:[0]},
               {x:210,y:520,c:"G",wall:1,th:[0],empty:1},
               {x:60,y:150,c:"R",wall:1,th:[1]}, {x:160,y:150,c:"R",wall:1,th:[1]},
               {x:100,y:560,c:"G",wall:0,th:[2]}, {x:180,y:560,c:"G",wall:1,th:[2]},
               {x:250,y:240,c:"A",wall:1,th:[3]}, {x:360,y:240,c:"A",wall:1,th:[3]},
               {x:130,y:300,c:"R",wall:1,th:[4]}, {x:290,y:300,c:"R",wall:1,th:[4]},
               {x:110,y:380,c:"B",wall:1,th:[5]}, {x:310,y:380,c:"B",wall:1,th:[5]},
               {x:120,y:180,c:"B",wall:1,th:[6]}, {x:300,y:180,c:"B",wall:1,th:[6]} ],
      screws: [ {hole:0,c:"B"}, {hole:1,c:"B"}, {hole:3,c:"R"}, {hole:4,c:"R"},
                {hole:5,c:"G",type:"spring"}, {hole:6,c:"G"}, {hole:7,c:"A"}, {hole:8,c:"A"},
                {hole:9,c:"R"}, {hole:10,c:"R"}, {hole:11,c:"B",type:"rust"}, {hole:12,c:"B",type:"rust"},
                {hole:13,c:"B"}, {hole:14,c:"B"} ] },
  ];

  /* ================= State ================= */
  var state = {
    lvl: 0, plates: [], holes: [], screws: [], tray: [],
    ops: 0, fly: [], shardsDone: false, popCd: 0, shake: 0,
    stars: {}, time: 0, ended: false,
  };
  var wallBodies = [];
  var canvas, ctx, view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  var Sound, Particles;
  var toastT = null;

  /* ================= Utils ================= */
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.add("hidden"); }, 2400);
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function fmt(n) { return String(n); }

  /* ================= Fisica (box2d-lite) ================= */
  function makeBody(pl) {
    return {
      pl: pl, x: pl.x, y: pl.y, w: pl.w, h: pl.h, a: 0,
      vx: 0, vy: 0, va: 0, im: 0, ii: 0, restT: 0, hit: 0, hitMetal: false,
    };
  }
  function setDynamic(b) {
    var m = b.w * b.h * DENS[b.pl.mat];
    b.im = 1 / m;
    b.ii = 1 / (m * (b.w * b.w + b.h * b.h) / 12);
  }
  function verts(b) {
    var c = Math.cos(b.a), s = Math.sin(b.a), hw = b.w / 2, hh = b.h / 2;
    return [
      { x: b.x + c * hw - s * hh, y: b.y + s * hw + c * hh },
      { x: b.x + c * hw + s * hh, y: b.y + s * hw - c * hh },
      { x: b.x - c * hw + s * hh, y: b.y - s * hw - c * hh },
      { x: b.x - c * hw - s * hh, y: b.y - s * hw + c * hh },
    ];
  }
  function satCollide(A, B) {
    var va = verts(A), vb = verts(B);
    var axes = [
      [Math.cos(A.a), Math.sin(A.a)], [-Math.sin(A.a), Math.cos(A.a)],
      [Math.cos(B.a), Math.sin(B.a)], [-Math.sin(B.a), Math.cos(B.a)],
    ];
    var minOv = 1e18, nx = 0, ny = 0;
    for (var i = 0; i < 4; i++) {
      var ux = axes[i][0], uy = axes[i][1];
      var a0 = 1e18, a1 = -1e18, b0 = 1e18, b1 = -1e18, j, d;
      for (j = 0; j < 4; j++) { d = va[j].x * ux + va[j].y * uy; if (d < a0) a0 = d; if (d > a1) a1 = d; }
      for (j = 0; j < 4; j++) { d = vb[j].x * ux + vb[j].y * uy; if (d < b0) b0 = d; if (d > b1) b1 = d; }
      var ov = Math.min(a1, b1) - Math.max(a0, b0);
      if (ov <= 0) return null;
      if (ov < minOv) { minOv = ov; nx = ux; ny = uy; }
    }
    if (nx * (B.x - A.x) + ny * (B.y - A.y) < 0) { nx = -nx; ny = -ny; }
    // manifold: vertici di B più profondi lungo -n
    var best = 1e18, pts = [], j2, d2;
    for (j2 = 0; j2 < 4; j2++) { d2 = vb[j2].x * nx + vb[j2].y * ny; if (d2 < best) best = d2; }
    for (j2 = 0; j2 < 4; j2++) { d2 = vb[j2].x * nx + vb[j2].y * ny; if (d2 < best + 2.5) pts.push(vb[j2]); }
    return { nx: nx, ny: ny, depth: minOv, pts: pts };
  }
  function applyPair(A, B, c) {
    var n = c.nx, m = c.ny;
    for (var i = 0; i < c.pts.length; i++) {
      var cp = c.pts[i];
      var rax = cp.x - A.x, ray = cp.y - A.y, rbx = cp.x - B.x, rby = cp.y - B.y;
      var vax = A.vx - A.va * ray, vay = A.vy + A.va * rax;
      var vbx = B.vx - B.va * rby, vby = B.vy + B.va * rbx;
      var rvx = vbx - vax, rvy = vby - vay;
      var vn = rvx * n + rvy * m;
      A.hit = Math.max(A.hit, -vn); B.hit = Math.max(B.hit, -vn);
      if (A.pl && A.pl.fallen && A.pl.mat === "metal" && B.pl) B.hitMetal = true;
      if (B.pl && B.pl.fallen && B.pl.mat === "metal" && A.pl) A.hitMetal = true;
      if (vn >= 0) continue;
      var cra = rax * m - ray * n, crb = rbx * m - rby * n;
      var kn = A.im + B.im + cra * cra * A.ii + crb * crb * B.ii;
      if (kn <= 0) continue;
      var j = -(1.12) * vn / kn;
      A.vx -= j * n * A.im; A.vy -= j * m * A.im; A.va -= cra * j * A.ii;
      B.vx += j * n * B.im; B.vy += j * m * B.im; B.va += crb * j * B.ii;
      // attrito
      vax = A.vx - A.va * ray; vay = A.vy + A.va * rax;
      vbx = B.vx - B.va * rby; vby = B.vy + B.va * rbx;
      rvx = vbx - vax; rvy = vby - vay;
      var vt = rvx * (-m) + rvy * n;
      var ktx = rax * n - ray * (-m), kty = rbx * n - rby * (-m);
      var kt = A.im + B.im + ktx * ktx * A.ii + kty * kty * B.ii;
      if (kt > 0) {
        var jt = clamp(-vt / kt, -0.5 * Math.abs(j), 0.5 * Math.abs(j));
        A.vx -= jt * (-m) * A.im; A.vy -= jt * n * A.im; A.va -= ktx * jt * A.ii;
        B.vx += jt * (-m) * B.im; B.vy += jt * n * B.im; B.va += kty * jt * B.ii;
      }
    }
    // correzione posizionale
    var corr = Math.max(c.depth - 0.5, 0) * 0.32 / (A.im + B.im || 1);
    A.x -= n * corr * (A.im || 0); A.y -= m * corr * (A.im || 0);
    B.x += n * corr * (B.im || 0); B.y += m * corr * (B.im || 0);
  }
  function physStep(dt) {
    var dyn = [], stat = [];
    state.plates.forEach(function (pl) { if (pl.state === "falling") dyn.push(pl.body); else if (pl.state === "attached") stat.push(pl.body); });
    var all = dyn.concat(stat).concat(wallBodies);
    dyn.forEach(function (b) {
      if (!b.onRail) b.vy += GRAV * dt; else b.vy = 0;
      b.vx *= 0.999; b.va *= 0.995;
      b.vx = clamp(b.vx, -1500, 1500); b.vy = clamp(b.vy, -1500, 1500);
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
    });
    for (var it = 0; it < ITER; it++) {
      for (var i = 0; i < dyn.length; i++) {
        for (var j = i + 1; j < dyn.length; j++) {
          var c = satCollide(dyn[i], dyn[j]);
          if (c) applyPair(dyn[i], dyn[j], c);
        }
        for (var k = 0; k < stat.length; k++) {
          var c2 = satCollide(dyn[i], stat[k]);
          if (c2) applyPair(dyn[i], stat[k], c2);
        }
        for (var w = 0; w < wallBodies.length; w++) {
          var c3 = satCollide(dyn[i], wallBodies[w]);
          if (c3) applyPair(dyn[i], wallBodies[w], c3);
        }
      }
    }
  }
  function postPhys(dt) {
    state.popCd -= dt;
    state.plates.forEach(function (pl) {
      var b = pl.body;
      if (pl.state === "falling") {
        // vetro rotto
        if (pl.mat === "glass" && b.hit > BREAK_V) { shatterGlass(pl); return; }
        // viti saltate per impatto di metallo
        if (b.hitMetal && b.hit > POP_V && state.popCd <= 0 && screwsOnPlate(pl).length) {
          state.popCd = 0.5;
          popScrews(pl);
        }
        // fuori dal mondo
        if (b.y > H + 90 || b.x < -120 || b.x > W + 120) { demolish(pl); return; }
        // riposo → dissolvi
        if (Math.abs(b.vx) < 12 && Math.abs(b.vy) < 12 && Math.abs(b.va) < 0.4) {
          b.restT += dt;
          if (b.restT > 0.45) startFade(pl);
        } else b.restT = 0;
      }
      b.hit = 0; b.hitMetal = false;
    });
  }
  function screwsOnPlate(pl) {
    return state.screws.filter(function (s) {
      if (s.phase !== "board") return false;
      var h = state.holes[s.hole];
      return h.th.indexOf(state.plates.indexOf(pl)) >= 0;
    });
  }

  /* ================= Level lifecycle ================= */
  function loadLevel(idx) {
    var L = LEVELS[idx];
    state.lvl = idx;
    state.plates = L.plates.map(function (p) {
      var pl = Object.assign({}, p);
      pl.state = "attached";
      pl.fallen = false;
      pl.jig = 0; pl.fadeT = 0;
      pl.body = makeBody(pl);
      return pl;
    });
    state.holes = L.holes.map(function (h) { return Object.assign({ dead: false }, h); });
    state.screws = L.screws.map(function (s) {
      return { hole: s.hole, color: s.c, type: s.type || "normal", taps: 0, phase: "board", anim: 0 };
    });
    state.tray = [];
    state.ops = 0;
    state.fly = [];
    state.ended = false;
    state.popCd = 0;
    state.attemptStart = Date.now();
    Particles.clear();
    // corpi statici del mondo
    wallBodies = [
      { x: -20, y: H / 2, w: 40, h: H * 2, a: 0, vx: 0, vy: 0, va: 0, im: 0, ii: 0, restT: 0, hit: 0, pl: null },
      { x: W + 20, y: H / 2, w: 40, h: H * 2, a: 0, vx: 0, vy: 0, va: 0, im: 0, ii: 0, restT: 0, hit: 0, pl: null },
      { x: W / 2, y: BENCH_Y + 40, w: W + 400, h: 80, a: 0, vx: 0, vy: 0, va: 0, im: 0, ii: 0, restT: 0, hit: 0, pl: null },
    ];
    recompute(null);
    document.getElementById("lvl-name").textContent = "Livello " + (idx + 1) + " · " + L.name;
    document.getElementById("hint").textContent = L.hint;
    toast(L.hint);
    renderTray();
    updateHUD();
  }

  function recompute(trigger) {
    // union-find: wall = nodo N
    var N = state.plates.length;
    var par = [];
    for (var i = 0; i <= N; i++) par.push(i);
    function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
    function uni(a, b) { par[find(a)] = find(b); }
    state.screws.forEach(function (s) {
      if (s.phase !== "board") return;
      var h = state.holes[s.hole];
      if (h.dead) return;
      if (h.wall) uni(N, h.th[0]);
      for (var i = 1; i < h.th.length; i++) uni(h.th[0], h.th[i]);
      if (h.wall) for (var k = 1; k < h.th.length; k++) uni(N, h.th[k]);
    });
    state.plates.forEach(function (pl, i) {
      if (pl.state !== "attached") return;
      if (find(i) !== find(N)) makeDynamic(pl, trigger);
    });
    // fori morti
    state.holes.forEach(function (h) {
      h.dead = h.th.some(function (i) { return state.plates[i].state !== "attached"; });
    });
    updateHUD();
    checkEnd();
  }

  function makeDynamic(pl, trigger) {
    pl.fallen = true;
    pl.state = "falling";
    setDynamic(pl.body);
    if (pl.rail) {
      // su rotaia: scivola verso il bordo più vicino, la gravità non lo tocca
      pl.body.onRail = true;
      pl.body.vy = 0;
      pl.body.vx = (pl.x < W / 2 ? -175 : 175);
      Sound.creak();
    } else if (trigger && trigger.type === "spring") {
      pl.body.vy = -640;
      pl.body.vx = rand(-90, 90);
      pl.body.va = rand(-2.6, 2.6);
      Sound.spring();
      state.shake = 5;
    } else {
      pl.body.va = rand(-0.45, 0.45);
      Sound.creak();
    }
    R2.buzz(12);
  }

  function startFade(pl) {
    pl.state = "fading";
    pl.fadeT = 0.9;
    Particles.spawn(pl.body.x, pl.body.y, pl.mat === "metal" ? "#c8d2dc" : "#c99a5e", 10);
    if (pl.mat === "metal") Sound.clang(); else Sound.thud();
    state.shake = Math.max(state.shake, 4);
  }
  function demolish(pl) { pl.state = "gone"; checkEnd(); }
  function shatterGlass(pl) {
    pl.state = "gone";
    Particles.spawn(pl.body.x, pl.body.y, "#bfe0ef", 22);
    Sound.crash();
    state.shake = 8;
    R2.buzz([30, 20, 40]);
    if (LEVELS[state.lvl].protectGlass) loseLevel("CRASH! Il vetro si è rotto in mille pezzi.");
  }

  function popScrews(pl) {
    var list = screwsOnPlate(pl);
    list.forEach(function (s) {
      s.phase = "vanish";
      var h = state.holes[s.hole];
      if (state.tray.length < TRAY_CAP) {
        state.tray.push(s);
        s.phase = "tray";
        flyTo(s, h.x, h.y, trayWorldPos(state.tray.length - 1), function () { renderTray(); }, "out");
        toast("🪛 Le viti sono volate nel portaviti!");
      } else {
        toast("Una vite è volata via per sempre…");
      }
    });
    if (list.length) { Sound.pop(); recompute(null); }
  }

  /* ================= Fine livello ================= */
  function checkEnd() {
    if (state.ended) return;
    var remaining = state.plates.some(function (pl) { return pl.state !== "gone"; });
    if (!remaining) winLevel();
  }
  function starsFor(ops, par) { return ops <= par ? 3 : (ops <= par + 3 ? 2 : 1); }
  function winLevel() {
    state.ended = true;
    var n = starsFor(state.ops, LEVELS[state.lvl].par);
    var old = state.stars[state.lvl] || 0;
    state.stars[state.lvl] = Math.max(old, n);
    R2.saveJSON("viti-pwa", { stars: state.stars, highScore: totalStars() });
    R2.stats.run({
      slug: "viti-pwa/",
      score: n * 100 - state.ops,
      durMs: Date.now() - (state.attemptStart || Date.now()),
      wave: state.lvl,
      outcome: "win",
      meta: { stars: n, ops: state.ops, par: LEVELS[state.lvl].par }
    });
    var starsTxt = "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n);
    dailyArp();
    var btns = [];
    if (state.lvl < LEVELS.length - 1) btns.push({ t: "▶ Avanti", f: function () { hideModal(); loadLevel(state.lvl + 1); } });
    btns.push({ t: "↺ Ripeti", f: function () { hideModal(); loadLevel(state.lvl); } });
    btns.push({ t: "☰ Livelli", f: showLevels });
    showModal("Livello superato!",
      '<div class="stars">' + starsTxt + '</div>Mosse: <b>' + state.ops + "</b> / par " + LEVELS[state.lvl].par,
      btns);
    Sound.win();
  }
  function loseLevel(msg) {
    state.ended = true;
    R2.stats.run({
      slug: "viti-pwa/",
      score: 0,
      durMs: Date.now() - (state.attemptStart || Date.now()),
      wave: state.lvl,
      outcome: "loss",
      meta: { ops: state.ops, par: LEVELS[state.lvl].par }
    });
    showModal("Rivista ignominiosa", msg, [{ t: "↺ Riprova", f: function () { hideModal(); loadLevel(state.lvl); } }, { t: "☰ Livelli", f: showLevels }]);
    Sound.error();
  }
  function totalStars() {
    var t = 0;
    for (var k in state.stars) t += state.stars[k];
    return t;
  }
  function dailyArp() {
    [523, 659, 784].forEach(function (f, i) {
      setTimeout(function () { Sound.play(f, 0.18, "triangle"); }, i * 110);
    });
  }

  /* ================= Azioni vite ================= */
  function screwAt(wx, wy) {
    var best = null, bestD = 20 * 20;
    state.screws.forEach(function (s) {
      if (s.phase !== "board" || covered(s)) return;
      var h = state.holes[s.hole];
      var d = dist2(wx, wy, h.x, h.y);
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }
  function covered(s) {
    var h = state.holes[s.hole];
    var topZ = 0;
    h.th.forEach(function (i) { topZ = Math.max(topZ, state.plates[i].z); });
    for (var i = 0; i < state.plates.length; i++) {
      var pl = state.plates[i];
      if (pl.state !== "attached" || h.th.indexOf(i) >= 0) continue;
      if (pl.z > topZ && inPlate(h.x, h.y, pl)) return true;
    }
    return false;
  }
  function inPlate(x, y, pl) {
    return Math.abs(x - pl.x) <= pl.w / 2 + 2 && Math.abs(y - pl.y) <= pl.h / 2 + 2;
  }
  function holeAt(wx, wy) {
    var best = null, bestD = 18 * 18;
    state.holes.forEach(function (h, idx) {
      if (h.dead || occupied(idx)) return;
      var groupOk = h.th.every(function (i) { return state.plates[i].state === "attached"; });
      if (!groupOk) return;
      var d = dist2(wx, wy, h.x, h.y);
      if (d < bestD) { bestD = d; best = h; best.idx = idx; }
    });
    return best;
  }
  function occupied(idx) {
    return state.screws.some(function (s) { return s.phase === "board" && s.hole === idx; });
  }

  function tapScrew(s) {
    if (s.type === "rust" && s.taps < 2) {
      s.taps++;
      s.anim = 1;
      Sound.rust();
      R2.buzz(10);
      return;
    }
    if (state.tray.length >= TRAY_CAP) { Sound.error(); toast("Portaviti pieno! Riavvita una vite in un foro libero."); return; }
    state.ops++;
    s.phase = "flying";
    var h = state.holes[s.hole];
    var slot = state.tray.length + fliesOut();
    flyTo(s, h.x, h.y, trayWorldPos(slot), function () {
      s.phase = "tray";
      state.tray.push(s);
      renderTray();
      checkDeadlock();
    }, "out");
    Sound.unscrew();
    R2.buzz(8);
    recompute(s);
    updateHUD();
  }

  function tryPlace(h, idx) {
    var s = null;
    for (var i = 0; i < state.tray.length; i++) {
      if (state.tray[i].color === h.c || state.tray[i].type === "selftap") { s = state.tray[i]; break; }
    }
    if (!s) { Sound.error(); toast("Ti serve una vite " + CNAMES[h.c] + " nel portaviti!"); return; }
    var from = trayWorldPos(state.tray.indexOf(s));
    state.tray.splice(state.tray.indexOf(s), 1);
    if (s.type === "selftap") s.color = h.c;
    s.phase = "flying";
    flyTo(s, from.x, from.y, { x: h.x, y: h.y }, function () {
      s.phase = "board";
      s.hole = idx;
      s.taps = 0;
      state.ops++;
      Sound.screw();
      R2.buzz(8);
      recompute(null);
      updateHUD();
    }, "in");
    renderTray();
  }

  function checkDeadlock() {
    if (state.ended || state.tray.length < TRAY_CAP) return;
    var any = state.holes.some(function (h, idx) {
      if (h.dead || occupied(idx)) return false;
      if (!h.th.every(function (i) { return state.plates[i].state === "attached"; })) return false;
      return state.tray.some(function (s) { return s.color === h.c || s.type === "selftap"; });
    });
    if (!any) loseLevel("Hai finito i fori utili: il portaviti è pieno e nessuna vite ha dove andare.");
  }

  /* ================= Viti volanti ================= */
  function trayWorldPos(slot) {
    // posizione mondo del slot nel vassoio (DOM → mondo)
    var slots = document.querySelectorAll("#tray .slot");
    var el = slots[slot];
    if (!el) return { x: W / 2, y: H - 30 };
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return { x: (cx - view.ox) / view.scale, y: (cy - view.oy) / view.scale };
  }
  function flyTo(s, fx, fy, to, done, mode) {
    state.fly.push({ s: s, fx: fx, fy: fy, tx: to.x, ty: to.y, t: 0, dur: 0.45, done: done, mode: mode || "out" });
  }
  function fliesOut() {
    return state.fly.filter(function (f) { return f.mode === "out"; }).length;
  }
  function updateFly(dt) {
    for (var i = state.fly.length - 1; i >= 0; i--) {
      var f = state.fly[i];
      f.t += dt / f.dur;
      if (f.t >= 1) { state.fly.splice(i, 1); f.done(); }
    }
  }

  /* ================= Input ================= */
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.ox) / view.scale, y: (e.clientY - r.top - view.oy) / view.scale };
  }
  function setupInput() {
    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      if (state.ended) return;
      var p = toWorld(e);
      var s = screwAt(p.x, p.y);
      if (s) { tapScrew(s); return; }
      var h = holeAt(p.x, p.y);
      if (h) { tryPlace(h, h.idx); return; }
    });
    document.getElementById("retry-btn").addEventListener("click", function () { loadLevel(state.lvl); });
    document.getElementById("levels-btn").addEventListener("click", showLevels);
    var sbtn = document.getElementById("sound-btn");
    sbtn.textContent = R2.getSettings().sound ? "🔊" : "🔇";
    sbtn.addEventListener("click", function () {
      var st = R2.setSettings({ sound: !R2.getSettings().sound });
      sbtn.textContent = st.sound ? "🔊" : "🔇";
    });
  }

  /* ================= Rendering ================= */
  function makeGrain() {
    var g = document.createElement("canvas");
    g.width = 200; g.height = 200;
    var c = g.getContext("2d");
    for (var i = 0; i < 260; i++) {
      c.strokeStyle = "rgba(110,74,38," + rand(0.05, 0.14).toFixed(2) + ")";
      c.lineWidth = rand(0.6, 1.6);
      c.beginPath();
      var y = rand(0, 200);
      c.moveTo(rand(0, 200), y);
      c.bezierCurveTo(60, y + rand(-6, 6), 140, y + rand(-6, 6), 200, y + rand(-4, 4));
      c.stroke();
    }
    grainPat = ctx.createPattern(g, "repeat");
    return g;
  }
  var grainPat = null, grainCanvas = null;

  function resize() {
    var stage = document.getElementById("stage");
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    view.scale = Math.min(view.w / W, view.h / H);
    view.ox = (view.w - W * view.scale) / 2;
    view.oy = (view.h - H * view.scale) / 2;
  }

  function drawPlate(pl) {
    var b = pl.body;
    var jig = pl.jig > 0 ? Math.sin(state.time * 34) * 2.4 * pl.jig : 0;
    ctx.save();
    if (pl.state === "falling") {
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.translate(-b.w / 2, -b.h / 2);
    } else {
      ctx.translate(pl.x - pl.w / 2 + jig, pl.y - pl.h / 2);
    }
    var w = pl.w, h = pl.h;
    if (pl.state === "fading") ctx.globalAlpha = Math.max(0, pl.fadeT / 0.9);
    if (pl.mat === "wood") {
      ctx.fillStyle = "#c98d4e";
      roundRect(0, 0, w, h, 4); ctx.fill();
      ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 2;
      roundRect(1, 1, w - 2, h - 2, 4); ctx.stroke();
      ctx.strokeStyle = "rgba(110,74,38,0.35)";
      ctx.lineWidth = 1;
      for (var i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(6, (h / 3) * i);
        ctx.lineTo(w - 6, (h / 3) * i + 1.5);
        ctx.stroke();
      }
    } else if (pl.mat === "metal") {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#b9c4cf"); g.addColorStop(0.5, "#8e9bab"); g.addColorStop(1, "#6e7b89");
      ctx.fillStyle = g;
      roundRect(0, 0, w, h, 4); ctx.fill();
      ctx.strokeStyle = "#4c5763"; ctx.lineWidth = 2;
      roundRect(1, 1, w - 2, h - 2, 4); ctx.stroke();
      ctx.fillStyle = "#5b6672";
      for (var rv = 14; rv < w - 8; rv += 34) { ctx.beginPath(); ctx.arc(rv, h / 2, 2.2, 0, 6.2832); ctx.fill(); }
    } else { // glass
      ctx.fillStyle = "rgba(178,222,240,0.5)";
      roundRect(0, 0, w, h, 3); ctx.fill();
      ctx.strokeStyle = "#7fb3c8"; ctx.lineWidth = 2;
      roundRect(1, 1, w - 2, h - 2, 3); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(8, h - 4);
      ctx.lineTo(Math.min(w - 8, h + 14), 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawScrewHead(x, y, s, scale) {
    var col = COLORS[s.color];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.anim > 0 ? s.anim * 9 : 0);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,14,8,0.85)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(20,14,8,0.85)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-5.5, 0); ctx.lineTo(5.5, 0);
    ctx.moveTo(0, -5.5); ctx.lineTo(0, 5.5);
    ctx.stroke();
    if (s.type === "rust") {
      ctx.strokeStyle = "#6e441f";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-7, -4); ctx.lineTo(-2, -1); ctx.moveTo(5, -6); ctx.lineTo(2, -2); ctx.moveTo(6, 5); ctx.lineTo(2, 3);
      ctx.stroke();
    } else if (s.type === "spring") {
      ctx.strokeStyle = "#241a10";
      ctx.lineWidth = 1.8;
      for (var k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(0, 0, 13 - k * 3, 2.2, 4.2);
        ctx.stroke();
      }
    } else if (s.type === "selftap") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("U", 0, 3.2);
    }
    if (s.type === "rust" && s.taps > 0) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 14, -1.57, -1.57 + (s.taps / 3) * 6.2832);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHoleMarker(h, idx) {
    if (!h.empty || h.dead) return;
    var match = state.tray.some(function (s) { return s.color === h.c || s.type === "selftap"; });
    ctx.strokeStyle = match ? COLORS[h.c] : "rgba(36,26,16,0.35)";
    ctx.lineWidth = match ? 2.4 : 1.6;
    if (match) ctx.setLineDash([]);
    else ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(h.x, h.y, 9 + (match ? Math.sin(state.time * 5) * 1.4 : 0), 0, 6.2832);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = "#6e4a26";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    if (state.shake > 0) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
      state.shake = Math.max(0, state.shake - 0.35);
    }

    // pannellooperativo
    ctx.fillStyle = "#d9b06c";
    ctx.fillRect(0, 0, W, H);
    if (grainPat) { ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = "#c09a58";
    for (var gx = 20; gx < W; gx += 40) {
      for (var gy = 20; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.arc(gx, gy, 2.6, 0, 6.2832);
        ctx.fill();
      }
    }
    // banco
    ctx.fillStyle = "#a8763c";
    ctx.fillRect(0, BENCH_Y, W, H - BENCH_Y);
    ctx.strokeStyle = "#7a5226";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, BENCH_Y);
    ctx.lineTo(W, BENCH_Y);
    ctx.stroke();

    // lastre & fori in ordine di z
    var zs = [];
    state.plates.forEach(function (pl) { if (zs.indexOf(pl.z) < 0) zs.push(pl.z); });
    zs.sort(function (a, b) { return a - b; });
    zs.forEach(function (z) {
      state.plates.forEach(function (pl) { if (pl.z === z && pl.state !== "gone") drawPlate(pl); });
      state.holes.forEach(function (h, idx) {
        // viti e fori si disegnano dopo la lasta più alta che attraversano
        var topZ = 0;
        h.th.forEach(function (i) { topZ = Math.max(topZ, state.plates[i].z); });
        if (topZ !== z) return;
        var s = state.screws.find(function (sc) { return sc.phase === "board" && sc.hole === idx; });
        if (s) {
          var cov = covered(s);
          ctx.globalAlpha = cov ? 0.3 : 1;
          drawScrewHead(h.x, h.y, s, 1);
          ctx.globalAlpha = 1;
        } else if (!h.dead) {
          drawHoleMarker(h, idx);
        }
      });
    });

    // viti volanti
    state.fly.forEach(function (f) {
      var x = lerp(f.fx, f.tx, f.t), y = lerp(f.fy, f.ty, f.t) - Math.sin(f.t * Math.PI) * 46;
      f.s.anim += 0.35;
      drawScrewHead(x, y, f.s, 1);
    });

    Particles.draw(ctx);
    ctx.restore();
  }

  /* ================= HUD / tray / modal ================= */
  function updateHUD() {
    document.getElementById("ops").textContent = "🪛 " + state.ops + "/" + LEVELS[state.lvl].par;
  }
  function renderTray() {
    var tray = document.getElementById("tray");
    var html = "";
    for (var i = 0; i < TRAY_CAP; i++) {
      var s = state.tray[i];
      html += '<div class="slot">';
      if (s) {
        html += '<div class="screwdot" style="background:' + COLORS[s.color] + '">' +
          (TYPETAG[s.type] ? '<span class="tag">' + TYPETAG[s.type] + "</span>" : "") + "</div>";
      }
      html += "</div>";
    }
    tray.innerHTML = html;
  }

  function showModal(title, bodyHTML, btns) {
    document.getElementById("m-title").textContent = title;
    document.getElementById("m-body").innerHTML = bodyHTML;
    var bx = document.getElementById("m-btns");
    bx.innerHTML = "";
    btns.forEach(function (b) {
      var el = document.createElement("button");
      el.className = "btn" + (b.ghost ? " ghost" : "");
      el.innerHTML = b.t;
      el.addEventListener("click", b.f);
      bx.appendChild(el);
    });
    document.getElementById("modal").classList.remove("hidden");
  }
  function hideModal() { document.getElementById("modal").classList.add("hidden"); }

  function showLevels() {
    var grid = '<div class="lvgrid">';
    for (var i = 0; i < LEVELS.length; i++) {
      var unlocked = i === 0 || (state.stars[i - 1] || 0) > 0;
      var st = state.stars[i] || 0;
      grid += unlocked
        ? '<button class="lvbtn" data-i="' + i + '">' + (i + 1) + "<small>" + ("★".repeat(st) + "☆".repeat(3 - st)) + "</small></button>"
        : '<button class="lvbtn locked">🔒</button>';
    }
    grid += "</div>";
    showModal("Viti & Lastre", grid + '<div class="body">Svita le viti, spostale nei fori giusti e buttà giù tutte le lastre!</div>',
      [{ t: "Chiudi", f: hideModal, ghost: true }]);
    document.querySelectorAll(".lvbtn[data-i]").forEach(function (b) {
      b.addEventListener("click", function () {
        hideModal();
        loadLevel(Number(b.dataset.i));
      });
    });
  }

  /* ================= Loop ================= */
  var lastT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.045) : 0.016;
    lastT = t;
    state.time += dt;
    if (!state.ended) {
      var sub = dt / SUBSTEPS;
      for (var s = 0; s < SUBSTEPS; s++) physStep(sub);
      postPhys(dt);
    }
    updateFly(dt);
    Particles.update(dt);
    state.plates.forEach(function (pl) {
      pl.jig = Math.max(0, pl.jig - dt * 3);
      if (pl.state === "fading") {
        pl.fadeT -= dt;
        if (pl.fadeT <= 0) demolish(pl);
      }
    });
    render();
    requestAnimationFrame(loop);
  }

  /* ================= Init ================= */
  function init() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    Sound = R2.makeSound({
      unscrew: [500, 0.07, "square"],
      screw:   [620, 0.07, "square"],
      rust:    [240, 0.07, "square"],
      thud:    [90, 0.18, "sine"],
      clang:   [520, 0.2, "square"],
      crash:   [1400, 0.14, "sawtooth"],
      creak:   [140, 0.2, "sawtooth"],
      spring:  [160, 0.3, "sine"],
      pop:     [320, 0.08, "square"],
      error:   [110, 0.15, "sawtooth"],
      win:     [660, 0.2, "triangle"],
    });
    Particles = R2.makeParticles();
    var saved = R2.loadJSON("viti-pwa", { stars: {} });
    state.stars = saved.stars || {};
    grainCanvas = makeGrain();
    resize();
    window.addEventListener("resize", resize);
    setupInput();
    loadLevel(0);
    showLevels();
    R2.trackPlaytime("viti-pwa/");
    R2.installHint();
    R2.markPlayed("viti-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
