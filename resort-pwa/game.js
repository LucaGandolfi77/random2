/*
 * Isola Resort Tycoon — low-poly isometric resort manager
 * Vanilla Canvas 2D + shared/arcade.js (window.R2). No build, no assets:
 * every palm, boat and guest is drawn procedurally, every sound is WebAudio.
 *
 * Loop: boats bring guests with desires → build & upgrade services to serve
 * them → reputation rises → more (and richer) guests → expand the island.
 */
(function () {
  "use strict";

  /* ================= Config ================= */
  var TILE_W = 52, TILE_H = 26, ELEV = 9;
  var CENTER = 7;
  var R_BASE = 5.4;
  var RINGS = [6.4, 7.4];
  var RING_COST = [650, 1600];
  var R_MAX = RINGS[RINGS.length - 1];
  var DAY_LEN = 100, NIGHT_LEN = 25, CYCLE = DAY_LEN + NIGHT_LEN;
  var SAVE_KEY = "resort-pwa-save";
  var OFFLINE_CAP = 8 * 3600, OFFLINE_RATE = 0.4;
  var GUEST_SPEED = 1.7;           // tiles per second
  var MAX_GUESTS = 40;

  var CATALOG = {
    umbrella: { emoji: "⛱️", name: "Ombrellone", cat: "relax", cost: 100, serve: 6,  price: 8,  caps: [1, 2, 3] },
    snack:    { emoji: "🍕", name: "Chiosco",    cat: "food",  cost: 150, serve: 5,  price: 12, caps: [1, 2, 2] },
    bar:      { emoji: "🍹", name: "Beach Bar",  cat: "drink", cost: 220, serve: 5,  price: 15, caps: [1, 2, 3] },
    pool:     { emoji: "🏊", name: "Piscina",    cat: "relax", cost: 420, serve: 10, price: 26, caps: [2, 3, 4] },
    cabana:   { emoji: "🛖", name: "Cabana",     cat: "relax", cost: 750, serve: 12, price: 45, caps: [1, 2, 2] },
    hotel:    { emoji: "🏨", name: "Hotel",      cat: "hotel", cost: 1200, night: 200 },
    palm:     { emoji: "🌴", name: "Palma",      cat: "decor", cost: 60,  beauty: 2 },
    torch:    { emoji: "🕯️", name: "Fiaccola",   cat: "decor", cost: 90,  beauty: 2 },
  };
  var DESIRES = [
    { cat: "relax", emoji: "🏖️", w: 0.40 },
    { cat: "food",  emoji: "🍕", w: 0.30 },
    { cat: "drink", emoji: "🍹", w: 0.30 },
  ];
  var DAILY_EVENTS = [
    { label: "🏖️ Giornata di punta: +50% arrivi", arrivals: 1.5 },
    { label: "💎 Acqua colorata: prezzi +15%",     prices: 1.15 },
    { label: "🌮 Festa del villaggio: mance +25%", tips: 1.25 },
  ];
  var WEATHERS = [
    { id: "sole",    label: "☀️ Sole splendente",            arrivals: 1,    weight: 55 },
    { id: "nuvole",  label: "☁️ Si alzano le nuvole",        arrivals: 0.85, weight: 27 },
    { id: "pioggia", label: "🌧️ Raggi di pioggia: arrivi -40%", arrivals: 0.6,  weight: 18 },
  ];
  var MISSIONS = [
    { desc: "Servi 5 ospiti",                        test: function () { return state.stats.served >= 5; },      reward: 100 },
    { desc: "Costruisci un Beach Bar",               test: function () { return hasType("bar"); },               reward: 120 },
    { desc: "Guadagna 1.000 monete in totale",       test: function () { return state.stats.earned >= 1000; },   reward: 150 },
    { desc: "Espandi l'isola (primo anello)",        test: function () { return state.ringIndex >= 1; },         reward: 200 },
    { desc: "Servi un ospite VIP 👑",                 test: function () { return state.stats.vipServed >= 1; },   reward: 250 },
    { desc: "Raggiungi 80 di reputazione",           test: function () { return state.rep >= 80; },              reward: 300 },
    { desc: "Servi 50 ospiti",                       test: function () { return state.stats.served >= 50; },     reward: 400 },
    { desc: "Cabana di livello 3",                   test: function () { return hasLevel("cabana", 3); },        reward: 600 },
    { desc: "Espandi l'isola al massimo",            test: function () { return state.ringIndex >= 2; },         reward: 800 },
    { desc: "Guadagna 10.000 monete in totale",      test: function () { return state.stats.earned >= 10000; },  reward: 1500 },
  ];
  var SKINS = ["#fcd9b8", "#f2b48c", "#d99a6c", "#a9714b", "#8a5a3b"];
  var OUTFITS = ["#f472b6", "#60a5fa", "#facc15", "#4ade80", "#c084fc", "#fb923c", "#f87171"];
  var WELCOME =
    "Sei il nuovo proprietario dell'isola! 🌴\n" +
    "• Costruisci servizi dalla barra in basso\n" +
    "• Gli ospiti arrivano in barca con un desiderio: servili per farti pagare\n" +
    "• Ogni ospite soddisfatto alza la reputazione → più barche, più mance\n" +
    "• Tocca una costruzione per mejorarla o venderla\n" +
    "• Compra gli anelli di sabbia per espandere l'isola!";

  /* ================= State ================= */
  var state = {
    coins: 180,
    rep: 55,
    day: 1,
    dayTime: 0.12,
    ringIndex: 0,
    buildings: [],
    guests: [],
    boats: [],
    floats: [],
    arrivalT: 4,
    saveT: 0,
    dailySeed: 0,
    event: null,
    lastSeen: Date.now(),
    dayEarned: 0,
    dayServed: 0,
    stats: { served: 0, lost: 0, earned: 0, vipServed: 0 },
    weather: null,
    weatherT: 30,
    flash: 0,
    boltT: 8,
    missionIdx: 0,
    missionT: 1,
    dolphins: [],
    dolphinT: 10,
    rot: 0,
    hotelAcc: 0,
  };
  var uid = 0;
  var cam = { x: 0, y: 0, z: 1 };
  var view = { w: 0, h: 0, dpr: 1 };
  var ui = {
    build: null,        // selected catalog key for placement
    ghost: null,        // {gx,gy} under pointer while placing
    selected: null,     // building instance for the panel
    pointers: new Map(),
    pinch: null,
    tap: null,          // {x,y,moved,downT}
    lastHud: {},
  };
  var canvas, ctx;
  var tileList = [];
  var bmap = {};            // "gx,gy" -> building
  var stars = [];
  var Sound, Particles;
  var firstRun = false;

  /* ================= Tiny utils ================= */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = clamp(((n >> 16) & 255) + amt, 0, 255);
    var g = clamp(((n >> 8) & 255) + amt, 0, 255);
    var b = clamp((n & 255) + amt, 0, 255);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function mix(h1, h2, f) {
    var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    var r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, f));
    var g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, f));
    var bl = Math.round(lerp(a & 255, b & 255, f));
    return "rgb(" + r + "," + g + "," + bl + ")";
  }
  function fmt(n) {
    n = Math.floor(n);
    if (n >= 100000) return (n / 1000).toFixed(0) + "k";
    return String(n);
  }

  /* ================= Iso math ================= */
  /* ---- camera rotation (4 orientations): logical grid fixed, projection rotates ---- */
  function rotPt(x, y) {
    var N = 16;
    switch (state.rot) {
      case 1: return { x: N - 1 - y, y: x };
      case 2: return { x: N - 1 - x, y: N - 1 - y };
      case 3: return { x: y, y: N - 1 - x };
      default: return { x: x, y: y };
    }
  }
  function invRotPt(x, y) {
    var N = 16;
    switch (state.rot) {
      case 1: return { x: y, y: N - 1 - x };
      case 2: return { x: N - 1 - x, y: N - 1 - y };
      case 3: return { x: N - 1 - y, y: x };
      default: return { x: x, y: y };
    }
  }
  function gridToScreen(gx, gy, lift) {
    var rp = rotPt(gx, gy);
    var wx = (rp.x - rp.y) * (TILE_W / 2);
    var wy = (rp.x + rp.y) * (TILE_H / 2) - (lift || 0);
    return { x: wx * cam.z + cam.x, y: wy * cam.z + cam.y };
  }
  function screenToGrid(sx, sy) {
    var wx = (sx - cam.x) / cam.z;
    var wy = (sy - cam.y) / cam.z;
    var a = wx / (TILE_W / 2), b = wy / (TILE_H / 2);
    var g = invRotPt((a + b) / 2, (b - a) / 2);
    return { gx: g.x, gy: g.y };
  }
  function diamondPts(gx, gy, w, d, lift) {
    var p1 = gridToScreen(gx - w / 2, gy - d / 2, lift);
    var p2 = gridToScreen(gx + w / 2, gy - d / 2, lift);
    var p3 = gridToScreen(gx + w / 2, gy + d / 2, lift);
    var p4 = gridToScreen(gx - w / 2, gy + d / 2, lift);
    return [p1, p2, p3, p4];
  }
  function poly(pts, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function circle(x, y, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
  }

  /* ================= Island ================= */
  function dist(gx, gy) {
    var dx = gx - CENTER, dy = gy - CENTER;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function isPier(gx, gy) {
    return gy >= 12 && Math.abs(gx - CENTER) <= 1 && dist(gx, gy) <= R_MAX + 0.5;
  }
  function tileKind(gx, gy) {
    if (isPier(gx, gy)) return "pier";
    var d = dist(gx, gy);
    if (d > R_MAX) return "water";
    if (d <= R_BASE) return d <= 3.4 ? "grass" : "sand";
    var ringIdx = d <= RINGS[0] ? 0 : 1;
    if (ringIdx < state.ringIndex) return d <= 3.4 ? "grass" : "sand";
    return "locked";
  }
  function rebuildTiles() {
    tileList = [];
    for (var gy = 0; gy <= 15; gy++) {
      for (var gx = 0; gx <= 15; gx++) {
        var k = tileKind(gx, gy);
        if (k !== "water") tileList.push({ gx: gx, gy: gy, kind: k });
      }
    }
    // painter order must follow the ROTATED depth
    tileList.sort(function (a, b) {
      var ra = rotPt(a.gx, a.gy), rb = rotPt(b.gx, b.gy);
      return (ra.x + ra.y) - (rb.x + rb.y);
    });
  }
  function rebuildMap() {
    bmap = {};
    state.buildings.forEach(function (b) { bmap[b.gx + "," + b.gy] = b; });
  }
  function canPlace(gx, gy) {
    var k = tileKind(gx, gy);
    return (k === "sand" || k === "grass") && !bmap[gx + "," + gy];
  }
  function capOf(b) { return CATALOG[b.type].caps[b.level - 1]; }
  function beauty() {
    var n = 0;
    state.buildings.forEach(function (b) {
      var c = CATALOG[b.type];
      if (c.beauty) n += c.beauty;
    });
    return Math.min(n, 30);
  }
  function hasType(t) {
    return state.buildings.some(function (b) { return b.type === t; });
  }
  function hasLevel(t, lvl) {
    return state.buildings.some(function (b) { return b.type === t && b.level >= lvl; });
  }

  /* ================= Sound & FX ================= */
  function initSound() {
    Sound = R2.makeSound({
      build:   [140, 0.12, "square"],
      coin:    [880, 0.09, "triangle"],
      arrive:  [170, 0.28, "sawtooth"],
      sad:     [200, 0.22, "sine"],
      upgrade: [660, 0.15, "square"],
      error:   [110, 0.18, "sawtooth"],
      daily:   [523, 0.18, "triangle"],
      night:   [330, 0.35, "sine"],
      sell:    [300, 0.15, "triangle"],
      rumble:  [55, 0.5, "sawtooth"],
      vip:     [1319, 0.22, "triangle"],
    });
    Particles = R2.makeParticles();
  }
  function dailyArpeggio() {
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () { Sound.play(f, 0.2, "triangle"); }, i * 130);
    });
  }
  function spawnFloat(gx, gy, text, color) {
    state.floats.push({ gx: gx, gy: gy, text: text, color: color || "#fde68a", t: 0 });
  }
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.add("hidden"); }, 2600);
  }
  var modalQueue = [];
  function showModal(title, msg, btn) {
    modalQueue.push({ title: title, msg: msg, btn: btn || "Va bene!" });
    pumpModal();
  }
  function pumpModal() {
    var overlay = document.getElementById("modal");
    if (!overlay.classList.contains("hidden") || !modalQueue.length) return;
    var m = modalQueue.shift();
    document.getElementById("modal-title").textContent = m.title;
    document.getElementById("modal-msg").textContent = m.msg;
    document.getElementById("modal-btn").textContent = m.btn;
    overlay.classList.remove("hidden");
  }
  function closeModal() {
    document.getElementById("modal").classList.add("hidden");
    if (modalQueue.length) setTimeout(pumpModal, 120);
  }

  /* ================= Economy ================= */
  function priceOf(b) {
    var base = CATALOG[b.type].price * (1 + (b.level - 1) * 0.25);
    var ev = state.event && state.event.prices ? state.event.prices : 1;
    return Math.round(base * ev);
  }
  function addRep(d) { state.rep = clamp(state.rep + d, 10, 100); }

  function pickDesire() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < DESIRES.length; i++) {
      acc += DESIRES[i].w;
      if (r <= acc) return DESIRES[i];
    }
    return DESIRES[0];
  }

  function chooseTarget(g) {
    if (g.bld) return true;
    var best = null, bestScore = 1e9;
    for (var i = 0; i < state.buildings.length; i++) {
      var b = state.buildings[i];
      if (CATALOG[b.type].cat !== g.desire.cat) continue;
      if (g.vip && b.type !== "pool" && b.type !== "cabana") continue;
      if (b.occ >= capOf(b)) continue;
      var load = b.occ / capOf(b);
      var d = Math.abs(b.gx - g.x) + Math.abs(b.gy - g.y);
      var score = load * 100 + d;
      if (score < bestScore) { bestScore = score; best = b; }
    }
    if (!best) return false;
    best.occ++;
    g.bld = best;
    g.tx = best.gx;
    g.ty = best.gy + 0.55;
    g.state = "walk";
    return true;
  }

  function spawnGuest() {
    if (state.guests.length >= MAX_GUESTS) return;
    var g = {
      id: ++uid,
      desire: pickDesire(),
      x: CENTER, y: 12,
      tx: CENTER, ty: 12,
      state: "walk",
      t: 0, reT: 0,
      patience: 20 + Math.random() * 8 + beauty() * 0.15,
      bld: null,
      skin: pick(SKINS),
      outfit: pick(OUTFITS),
      phase: Math.random() * 6.28,
      angry: false,
      vip: false,
    };
    // 👑 VIP: turista d'oro che vuole solo lusso (piscina o cabana)
    if (Math.random() < clamp(state.rep / 100 * 0.25, 0, 0.35)) {
      g.vip = true;
      g.desire = { cat: "relax", emoji: "👑" };
      g.patience = 12;
      g.outfit = "#fbbf24";
      Sound.vip();
      toast("👑 È arrivato un ospite VIP!");
    }
    if (!chooseTarget(g)) { g.state = "wait"; g.tx = CENTER + (Math.random() * 4 - 2); g.ty = 9 + Math.random() * 2.5; }
    state.guests.push(g);
  }

  function updateGuests(dt, t) {
    for (var i = state.guests.length - 1; i >= 0; i--) {
      var g = state.guests[i];
      var dx = g.tx - g.x, dy = g.ty - g.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (g.state === "walk" || g.state === "leave") {
        if (d > 0.05) {
          var sp = GUEST_SPEED * dt;
          g.x += (dx / d) * Math.min(sp, d);
          g.y += (dy / d) * Math.min(sp, d);
        } else if (g.state === "walk") {
          if (g.bld) { g.state = "serve"; g.t = CATALOG[g.bld.type].serve; }
          else { g.state = "wait"; g.reT = 0; }
        } else {
          state.guests.splice(i, 1);
          continue;
        }
      } else if (g.state === "wait") {
        g.patience -= dt;
        g.reT -= dt;
        if (g.reT <= 0) { g.reT = 2; if (chooseTarget(g)) { g.state = "walk"; continue; } }
        if (g.patience <= 0) {
          g.angry = true;
          addRep(g.vip ? -8 : -4);
          state.stats.lost++;
          Sound.sad();
          R2.buzz(30);
          spawnFloat(g.x, g.y, g.vip ? "-2★" : "-1★", "#fda4af");
          g.state = "leave";
          g.tx = CENTER; g.ty = 12;
        }
      } else if (g.state === "serve") {
        g.t -= dt;
        if (g.t <= 0) {
          var mult = g.vip ? 4 : 1;
          var tip = state.rep >= 80 ? priceOf(g.bld) * 0.25 : 0;
          tip *= (state.event && state.event.tips) ? state.event.tips : 1;
          earn(Math.round((priceOf(g.bld) + Math.round(tip)) * mult), g.bld.gx, g.bld.gy);
          if (g.vip) {
            state.stats.vipServed++;
            addRep(2.5);
            spawnFloat(g.bld.gx, g.bld.gy - 0.5, "👑 VIP", "#fde68a");
            R2.buzz([10, 20, 10]);
          }
          g.bld.occ--;
          g.bld = null;
          if (!g.vip) addRep(1.5);
          state.stats.served++;
          state.dayServed++;
          g.state = "leave";
          g.tx = CENTER; g.ty = 12;
        }
      }
    }
  }

  function earn(amount, gx, gy) {
    if (amount <= 0) return;
    state.coins += amount;
    state.stats.earned += amount;
    state.dayEarned += amount;
    spawnFloat(gx, gy, "+" + amount, "#fde68a");
    Sound.coin();
    R2.buzz(8);
    bumpCoins();
  }

  function spawnBoat() {
    var ang = Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    var r = 14.5;
    var n = 1 + (Math.random() < state.rep / 110 ? 1 : 0) + (Math.random() < state.rep / 160 ? 1 : 0);
    state.boats.push({
      x: CENTER + Math.cos(ang) * r,
      y: CENTER + Math.sin(ang) * r,
      state: "arrive", t: 0,
      guests: n,
      phase: Math.random() * 6.28,
    });
    Sound.arrive();
  }

  function updateBoats(dt, t) {
    for (var i = state.boats.length - 1; i >= 0; i--) {
      var b = state.boats[i];
      if (b.state === "arrive") {
        var dx = CENTER - b.x, dy = 14.4 - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.1) {
          var sp = 1.9 * dt;
          b.x += (dx / d) * Math.min(sp, d);
          b.y += (dy / d) * Math.min(sp, d);
        } else { b.state = "dock"; b.t = 1.5; }
      } else if (b.state === "dock") {
        b.t -= dt;
        if (b.t <= 0) {
          for (var k = 0; k < b.guests; k++) spawnGuest();
          b.state = "leave";
        }
      } else {
        var ddx = b.x - CENTER, ddy = b.y - CENTER;
        var dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd < 16) {
          b.x += (ddx / dd) * 1.9 * dt;
          b.y += (ddy / dd) * 1.9 * dt;
        } else state.boats.splice(i, 1);
      }
    }
  }

  /* ================= Day cycle & saves ================= */
  function isNight() { return state.dayTime * CYCLE >= DAY_LEN; }

  /* ================= Weather ================= */
  function pickWeather() {
    var pool = WEATHERS.filter(function (w) { return w.id !== (state.weather && state.weather.id); });
    var total = pool.reduce(function (s, w) { return s + w.weight; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) return pool[i];
    }
    return pool[0];
  }
  function updateWeather(dt) {
    if (!state.weather) { state.weather = WEATHERS[0]; return; }
    state.weatherT -= dt;
    if (state.weatherT <= 0) {
      state.weather = pickWeather();
      state.weatherT = 35 + Math.random() * 30;
      toast(state.weather.label);
    }
    if (state.weather.id === "pioggia") {
      state.boltT -= dt;
      if (state.boltT <= 0) {
        state.flash = 1;
        state.boltT = 6 + Math.random() * 9;
        Sound.rumble();
        R2.buzz(20);
      }
    }
    state.flash = Math.max(0, state.flash - dt * 2.2);
  }

  /* ================= Missions ================= */
  function checkMissions() {
    var m = MISSIONS[state.missionIdx];
    if (!m) return;
    if (m.test()) {
      state.missionIdx++;
      state.coins += m.reward;
      bumpCoins();
      dailyArpeggio();
      toast("🎯 Obiettivo: " + m.desc + " · +" + m.reward + " 💰");
      Particles.spawn(view.w / 2, view.h * 0.3, "#86efac", 26);
      save();
    }
  }

  /* ================= Dolphins ================= */
  function updateDolphins(dt) {
    state.dolphinT -= dt;
    if (state.dolphinT <= 0) {
      state.dolphinT = 14 + Math.random() * 12;
      var ang = Math.random() * 6.2832;
      var r = R_MAX + 2.2;
      state.dolphins.push({
        gx: CENTER + Math.cos(ang) * r,
        gy: CENTER + Math.sin(ang) * r,
        dx: Math.random() < 0.5 ? -1 : 1,
        u: 0,
      });
      if (!state.dolphinSeen) { state.dolphinSeen = true; toast("🐬 Delfini in vista!"); }
    }
    for (var i = state.dolphins.length - 1; i >= 0; i--) {
      var d = state.dolphins[i];
      d.u += dt / 2.4;
      if (d.u >= 1) state.dolphins.splice(i, 1);
    }
  }
  function drawDolphins() {
    state.dolphins.forEach(function (d) {
      var gx = d.gx + d.dx * d.u * 9;
      var gy = d.gy + d.u * 2.4;
      var lift = -2 - Math.sin(d.u * Math.PI) * 22;
      var p = gridToScreen(gx, gy, lift);
      var z = cam.z;
      var slope = -Math.cos(d.u * Math.PI) * 0.9 * d.dx;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(slope);
      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 * z, 2.6 * z, 0, 0, 6.2832);
      ctx.fill();
      poly([{ x: -6 * z, y: 0 }, { x: -9.5 * z, y: -3.2 * z }, { x: -4 * z, y: -1 * z }], "#38bdf8");
      poly([{ x: 0, y: -2 * z }, { x: 2 * z, y: -5.5 * z }, { x: 3 * z, y: -1.5 * z }], "#38bdf8");
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(1.5 * z, 0.9 * z, 3.4 * z, 1.1 * z, 0, 0, 6.2832);
      ctx.fill();
      ctx.restore();
      if (d.u < 0.12 || d.u > 0.88) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1.4 * z;
        ctx.beginPath();
        ctx.arc(p.x, gridToScreen(gx, gy).y, 5 * z, 0, 6.2832);
        ctx.stroke();
      }
    });
  }

  /* ================= Generative calypso ================= */
  var Music = {
    ctx: null, timer: null, step: 0,
    DAY: [262, 294, 330, 392, 440, 523],
    NIGHT: [220, 262, 294, 330, 392, 440],
    ensure: function () {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      return !!(this.ctx && this.ctx.state === "running");
    },
    note: function (f, dur, type, vol) {
      if (!this.ctx) return;
      try {
        var o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = f;
        o.connect(g);
        g.connect(this.ctx.destination);
        var now = this.ctx.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(vol, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.start(now);
        o.stop(now + dur + 0.05);
      } catch (e) {}
    },
    tick: function () {
      if (!R2.getSettings().music || !R2.getSettings().sound) return;
      if (document.hidden) return;
      if (!this.ensure()) return;
      // tempo & scala seguono meteo e notte
      var rainy = state.weather && state.weather.id === "pioggia";
      var cloudy = state.weather && state.weather.id === "nuvole";
      var want = rainy ? 440 : (cloudy || isNight() ? 370 : 310);
      if (this.cur !== want) {
        this.cur = want;
        clearInterval(this.timer);
        var self = this;
        this.timer = setInterval(function () { self.tick(); }, want);
        return;
      }
      var sc = (isNight() || rainy) ? this.NIGHT : this.DAY;
      var s = this.step++;
      if (s % 4 === 0) this.note(sc[0] / 2, 0.5, "sine", 0.05);
      if (Math.random() < 0.72) {
        var f = sc[Math.floor(Math.random() * sc.length)] * (Math.random() < 0.2 ? 2 : 1);
        this.note(f, 0.22, "triangle", 0.04);
      }
      if (s % 8 === 4) this.note(sc[sc.length - 1] * 2, 0.12, "sine", 0.018);
    },
    start: function () {
      if (this.timer) return;
      var self = this;
      this.timer = setInterval(function () { self.tick(); }, 310);
    },
  };

  function updateDay(dt) {
    var wasNight = isNight();
    state.dayTime += dt / CYCLE;
    if (state.dayTime >= 1) state.dayTime -= 1;
    var nowNight = isNight();
    if (nowNight && !wasNight) {
      Sound.night();
      toast("🌙 Tramonto — gli arrivi rallentano");
    } else if (!nowNight && wasNight) {
      state.day++;
      // 🏨 hotel overnight revenue
      if (state.hotelAcc > 0) {
        var inc = Math.round(state.hotelAcc);
        state.coins += inc;
        state.stats.earned += inc;
        state.dayEarned += inc;
        bumpCoins();
        toast("🏨 Hotel: +" + fmt(inc) + " 💰 per la notte");
        state.hotelAcc = 0;
        save();
      }
      toast("🌅 Giorno " + state.day + " · ieri +" + fmt(state.dayEarned) + " 💰, " + state.dayServed + " serviti");
      state.dayEarned = 0;
      state.dayServed = 0;
    }
    if (nowNight) {
      var hl = 0;
      state.buildings.forEach(function (b) { if (b.type === "hotel") hl += b.level; });
      state.hotelAcc += hl * 8 * dt;
    }
    var ev = state.event && state.event.arrivals ? state.event.arrivals : 1;
    var nightFactor = nowNight ? 0.25 : 1;
    state.arrivalT -= dt * ev * nightFactor;
    if (state.arrivalT <= 0 && state.boats.length < 2 && state.guests.length < MAX_GUESTS - 4) {
      spawnBoat();
      state.arrivalT = (6 + Math.random() * 4) * clamp(65 / state.rep, 0.55, 1.9);
    }
  }

  function save() {
    state.lastSeen = Date.now();
    R2.saveJSON(SAVE_KEY, {
      v: 1,
      coins: Math.floor(state.coins),
      rep: state.rep,
      day: state.day,
      dayTime: state.dayTime,
      ringIndex: state.ringIndex,
      lastSeen: state.lastSeen,
      dailySeed: state.dailySeed,
      dayEarned: state.dayEarned,
      dayServed: state.dayServed,
      missionIdx: state.missionIdx,
      stats: state.stats,
      buildings: state.buildings.map(function (b) {
        return { t: b.type, x: b.gx, y: b.gy, l: b.level, i: b.invested };
      }),
    });
    R2.saveJSON("resort-pwa", { highScore: Math.floor(state.stats.earned) });
  }

  function load() {
    var d = R2.loadJSON(SAVE_KEY, null);
    firstRun = !d;
    if (!d) return;
    state.coins = d.coins || 180;
    state.rep = d.rep || 55;
    state.day = d.day || 1;
    state.dayTime = d.dayTime || 0.12;
    state.ringIndex = clamp(d.ringIndex || 0, 0, RINGS.length);
    state.dailySeed = d.dailySeed || 0;
    state.dayEarned = d.dayEarned || 0;
    state.dayServed = d.dayServed || 0;
    state.lastSeen = d.lastSeen || Date.now();
    state.missionIdx = clamp(d.missionIdx || 0, 0, MISSIONS.length);
    if (d.stats) state.stats = Object.assign({ served: 0, lost: 0, earned: 0, vipServed: 0 }, d.stats);
    (d.buildings || []).forEach(function (b) {
      if (!CATALOG[b.t]) return;
      state.buildings.push({
        type: b.t, gx: b.x, gy: b.y,
        level: clamp(b.l || 1, 1, 3),
        invested: b.i || CATALOG[b.t].cost,
        occ: 0,
      });
    });
  }

  function checkDaily() {
    var today = R2.dailySeed();
    state.event = DAILY_EVENTS[today % DAILY_EVENTS.length];
    if (state.dailySeed === today) return;
    var first = state.dailySeed !== 0;
    state.dailySeed = today;
    state.event = DAILY_EVENTS[today % DAILY_EVENTS.length];
    if (first) {
      var bonus = 120 + state.day * 10;
      state.coins += bonus;
      bumpCoins();
      dailyArpeggio();
      Particles.spawn(view.w / 2, view.h * 0.35, "#fde68a", 40);
      showModal("🎁 Bonus giornaliero", "+" + bonus + " monete per un nuovo giorno all'isola!\n\n" + state.event.label, "Chalet fantastico!");
      save();
    }
  }

  function checkOffline() {
    var away = (Date.now() - state.lastSeen) / 1000;
    if (away < 120) return;
    var rate = 0;
    state.buildings.forEach(function (b) {
      var c = CATALOG[b.type];
      if (b.type === "hotel") { rate += b.level * 1.6; return; }
      if (c.price && c.serve) rate += (c.price * (1 + (b.level - 1) * 0.25)) / c.serve;
    });
    rate *= OFFLINE_RATE;
    var gained = Math.floor(Math.min(away, OFFLINE_CAP) * rate);
    if (gained > 0) {
      state.coins += gained;
      state.stats.earned += gained;
      bumpCoins();
      var hrs = Math.floor(away / 3600), mins = Math.floor((away % 3600) / 60);
      showModal("👜 Bentornato!", "Mentre eri via (" + (hrs > 0 ? hrs + "h " : "") + mins + "min) il resort ha lavorato per te:\n\n+" + fmt(gained) + " monete", "Incassa!");
      save();
    }
  }

  /* ================= Build / upgrade / sell ================= */
  function place(gx, gy) {
    var c = CATALOG[ui.build];
    if (state.coins < c.cost) { Sound.error(); toast("Monete insufficienti"); return; }
    if (!canPlace(gx, gy)) { Sound.error(); toast("Non ci puoi costruire qui"); return; }
    state.coins -= c.cost;
    var b = { type: ui.build, gx: gx, gy: gy, level: 1, invested: c.cost, occ: 0 };
    state.buildings.push(b);
    bmap[gx + "," + gy] = b;
    Sound.build();
    R2.buzz(15);
    Particles.spawn(gridToScreen(gx, gy).x, gridToScreen(gx, gy).y, "#a7f3d0", 10);
    setBuild(null);
    save();
  }

  function upgrade(b) {
    if (b.level >= 3) return;
    var cost = Math.round(CATALOG[b.type].cost * 0.9 * b.level);
    if (state.coins < cost) { Sound.error(); toast("Monete insufficienti"); return; }
    state.coins -= cost;
    b.invested += cost;
    b.level++;
    Sound.upgrade();
    R2.buzz([10, 20, 10]);
    spawnFloat(b.gx, b.gy, "LIV " + b.level, "#86efac");
    openPanel(b);
    save();
  }

  function sell(b) {
    var refund = Math.round(b.invested * 0.5);
    state.coins += refund;
    bumpCoins();
    state.buildings.splice(state.buildings.indexOf(b), 1);
    delete bmap[b.gx + "," + b.gy];
    Sound.sell();
    spawnFloat(b.gx, b.gy, "+" + refund, "#fde68a");
    closePanel();
    save();
  }

  function buyRing(gx, gy) {
    var d = dist(gx, gy);
    if (d > R_MAX) return false;
    var ringIdx = d <= RINGS[0] ? 0 : 1;
    if (ringIdx !== state.ringIndex) {
      toast("Compra prima l'anello precedente");
      return true;
    }
    var cost = RING_COST[state.ringIndex];
    if (state.coins < cost) { Sound.error(); toast("Ti servono " + fmt(cost) + " 💰"); return true; }
    state.coins -= cost;
    state.ringIndex++;
    rebuildTiles();
    Sound.build();
    dailyArpeggio();
    toast("🏝️ Isola espansa!");
    Particles.spawn(gridToScreen(gx, gy).x, gridToScreen(gx, gy).y, "#fcd34d", 24);
    save();
    return true;
  }

  /* ================= Input ================= */
  function setupInput() {
    canvas.addEventListener("pointerdown", function (e) {
      canvas.setPointerCapture(e.pointerId);
      ui.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ui.pointers.size === 1) {
        ui.tap = { x: e.clientX, y: e.clientY, moved: false, downT: performance.now() };
      } else if (ui.pointers.size === 2) {
        var pts = Array.from(ui.pointers.values());
        ui.pinch = { d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), z0: cam.z };
        ui.tap = null;
      }
    });
    canvas.addEventListener("pointermove", function (e) {
      var prev = ui.pointers.get(e.pointerId);
      if (!prev) return;
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ui.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ui.pointers.size === 1) {
        if (ui.tap && Math.hypot(e.clientX - ui.tap.x, e.clientY - ui.tap.y) > 7) ui.tap.moved = true;
        if (ui.tap && ui.tap.moved) {
          cam.x += dx;
          cam.y += dy;
          clampCam();
        }
        if (ui.build) {
          var rect = canvas.getBoundingClientRect();
          var g = screenToGrid(e.clientX - rect.left, e.clientY - rect.top);
          ui.ghost = { gx: Math.round(g.gx), gy: Math.round(g.gy) };
        }
      } else if (ui.pointers.size === 2 && ui.pinch) {
        var pts = Array.from(ui.pointers.values());
        var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        zoomAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, ui.pinch.z0 * d / ui.pinch.d0);
      }
    });
    function up(e) {
      if (ui.pointers.has(e.pointerId)) {
        if (ui.tap && !ui.tap.moved && performance.now() - ui.tap.downT < 500 && ui.pointers.size === 1) {
          var rect = canvas.getBoundingClientRect();
          handleTap(e.clientX - rect.left, e.clientY - rect.top);
        }
        ui.pointers.delete(e.pointerId);
        if (ui.pointers.size < 2) ui.pinch = null;
      }
    }
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, cam.z * (e.deltaY < 0 ? 1.1 : 0.9));
    }, { passive: false });
  }

  function zoomAt(sx, sy, z) {
    var newZ = clamp(z, 0.55, 1.8);
    var g = screenToGrid(sx, sy);
    cam.z = newZ;
    var p = gridToScreen(g.gx, g.gy);
    cam.x += sx - p.x;
    cam.y += sy - p.y;
    clampCam();
  }

  function clampCam() {
    var rc = rotPt(CENTER, CENTER);
    var wxC = (rc.x - rc.y) * (TILE_W / 2) * cam.z;
    var wyC = (rc.x + rc.y) * (TILE_H / 2) * cam.z;
    cam.x = clamp(cam.x, view.w * 0.3 - wxC, view.w * 0.7 - wxC);
    cam.y = clamp(cam.y, view.h * 0.3 - wyC, view.h * 0.85 - wyC);
  }

  function handleTap(sx, sy) {
    var g = screenToGrid(sx, sy);
    var gx = Math.round(g.gx), gy = Math.round(g.gy);
    if (ui.build) { place(gx, gy); return; }
    var b = bmap[gx + "," + gy];
    if (b) { openPanel(b); R2.buzz(6); return; }
    if (tileKind(gx, gy) === "locked") { buyRing(gx, gy); return; }
    closePanel();
  }

  /* ================= UI: build bar / panel / HUD ================= */
  function setBuild(type) {
    ui.build = (ui.build === type) ? null : type;
    ui.ghost = null;
    document.querySelectorAll("#buildbar .chip").forEach(function (chip) {
      chip.classList.toggle("sel", chip.dataset.type === ui.build);
    });
    document.getElementById("cancel-build").classList.toggle("hidden", !ui.build);
    if (ui.build) closePanel();
  }

  function buildBar() {
    var bar = document.getElementById("buildbar");
    bar.innerHTML = "";
    Object.keys(CATALOG).forEach(function (key) {
      var c = CATALOG[key];
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.type = key;
      chip.innerHTML = '<span class="em">' + c.emoji + '</span><span class="nm">' + c.name + "</span><span class=\"pr\">" + fmt(c.cost) + " 💰</span>";
      chip.addEventListener("click", function () { setBuild(key); });
      bar.appendChild(chip);
    });
  }

  function refreshBuildBar() {
    document.querySelectorAll("#buildbar .chip").forEach(function (chip) {
      chip.classList.toggle("poor", state.coins < CATALOG[chip.dataset.type].cost);
    });
  }

  function openPanel(b) {
    ui.selected = b;
    var c = CATALOG[b.type];
    document.getElementById("panel").classList.remove("hidden");
    document.getElementById("panel-emoji").textContent = c.emoji;
    document.getElementById("panel-name").textContent = c.name;
    document.getElementById("panel-lvl").textContent = "LIV " + b.level;
    refreshPanel();
  }

  function refreshPanel() {
    var b = ui.selected;
    if (!b) return;
    var c = CATALOG[b.type];
    var info, upBtn = document.getElementById("panel-up"), sellBtn = document.getElementById("panel-sell");
    if (c.cat === "decor") {
      info = "Decorazione · bellezza +";
      upBtn.disabled = true;
      upBtn.textContent = "⬆️ Max";
    } else if (c.cat === "hotel") {
      var costH = Math.round(c.cost * 0.9 * b.level);
      info = "Incassi per notte: " + fmt(b.level * 200) + " 💰";
      if (b.level >= 3) { upBtn.disabled = true; upBtn.textContent = "⬆️ Max"; }
      else {
        upBtn.disabled = state.coins < costH;
        upBtn.textContent = "⬆️ Migliora · " + fmt(costH);
      }
    } else {
      var cost = Math.round(c.cost * 0.9 * b.level);
      info = b.type === "pool" || b.type === "cabana" || b.type === "umbrella" ? "Relax" :
             (c.cat === "food" ? "Cibo" : "Drink") +
             " · " + priceOf(b) + " 💰/ospite · coda " + b.occ + "/" + capOf(b) +
             " · servizio " + c.serve + "s";
      if (b.level >= 3) { upBtn.disabled = true; upBtn.textContent = "⬆️ Max"; }
      else {
        upBtn.disabled = state.coins < cost;
        upBtn.textContent = "⬆️ Migliora · " + fmt(cost);
      }
    }
    sellBtn.textContent = "💰 Vendi · " + fmt(Math.round(b.invested * 0.5));
    document.getElementById("panel-info").textContent = info;
  }

  function closePanel() {
    ui.selected = null;
    document.getElementById("panel").classList.add("hidden");
  }

  function bumpCoins() {
    var el = document.getElementById("coins");
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function updateHUD() {
    var set = function (id, v) {
      if (ui.lastHud[id] !== v) { ui.lastHud[id] = v; document.getElementById(id).textContent = v; }
    };
    set("coins", fmt(state.coins));
    set("guests", String(state.guests.length));
    set("beauty", "🌸 " + beauty());
    set("day-label", (isNight() ? "🌙" : "☀️") + " Giorno " + state.day);
    var evTxt = (state.event ? state.event.label : "") +
      (state.weather && state.weather.id !== "sole" ? " · " + state.weather.label : "");
    set("event-label", evTxt);
    var m = MISSIONS[state.missionIdx];
    set("mission-label", m ? "🎯 " + m.desc : "🏆 Tutti gli obiettivi completati!");
    var rf = document.getElementById("repfill");
    var w = Math.round(state.rep) + "%";
    if (ui.lastHud.rep !== w) { ui.lastHud.rep = w; rf.style.width = w; }
    set("event-label", state.event ? state.event.label : "");
  }

  /* ================= Rendering ================= */
  function resize() {
    var stage = document.getElementById("stage");
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    clampCam();
  }

  var raindrops = [];
  for (var ri = 0; ri < 130; ri++) {
    raindrops.push({ x: Math.random(), y: Math.random(), spd: 0.9 + Math.random() * 0.7, off: Math.random() * 100 });
  }
  function drawRain(t) {
    ctx.strokeStyle = "rgba(203,231,255,0.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < raindrops.length; i++) {
      var d = raindrops[i];
      var x = (d.x * view.w + t * 30) % (view.w + 40) - 20;
      var y = (d.y * view.h + t * 620 * d.spd + d.off) % (view.h + 20);
      ctx.moveTo(x, y - 11);
      ctx.lineTo(x - 3, y);
    }
    ctx.stroke();
  }

  function drawSky(t) {
    var ph = state.dayTime * CYCLE;
    var top, bot, k = -1;
    if (ph < DAY_LEN) {
      k = ph / DAY_LEN;
      if (k < 0.12) { top = mix("#7c3aed", "#38bdf8", k / 0.12); bot = mix("#fb923c", "#bae6fd", k / 0.12); }
      else if (k > 0.86) { top = mix("#38bdf8", "#7c3aed", (k - 0.86) / 0.14); bot = mix("#bae6fd", "#fb923c", (k - 0.86) / 0.14); }
      else { top = "#38bdf8"; bot = "#bae6fd"; }
    } else { top = "#0b1026"; bot = "#1e293b"; }
    // weather tints the sky
    if (state.weather && state.weather.id === "nuvole") {
      top = mix(hexOf(top), "#8ea3b8", 0.4);
      bot = mix(hexOf(bot), "#b6c2cf", 0.4);
    } else if (state.weather && state.weather.id === "pioggia") {
      top = mix(hexOf(top), "#475569", 0.62);
      bot = mix(hexOf(bot), "#64748b", 0.62);
    }
    var grad = ctx.createLinearGradient(0, 0, 0, view.h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, view.w, view.h);

    // stars
    if (ph >= DAY_LEN * 0.8) {
      var a = ph >= DAY_LEN ? 1 : (ph - DAY_LEN * 0.8) / (DAY_LEN * 0.2);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        ctx.globalAlpha = a * (0.35 + 0.55 * Math.abs(Math.sin(t * s.tw + s.ph)));
        circle(s.x * view.w, s.y * view.h * 0.7, s.r, "#e2e8ff");
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon
    if (k >= 0) {
      var sx = view.w * (0.15 + 0.7 * k);
      var sy = view.h * 0.2 - Math.sin(k * Math.PI) * view.h * 0.1;
      ctx.globalAlpha = 0.25;
      circle(sx, sy, 26 * cam.z + 10, "#fde68a");
      ctx.globalAlpha = 1;
      circle(sx, sy, 16, "#fde68a");
    } else {
      var mx = view.w * 0.78, my = view.h * 0.14;
      circle(mx, my, 14, "#e2e8f0");
      circle(mx - 6, my - 3, 12, top);
    }
    // clouds
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (var c = 0; c < 3; c++) {
      var cx = ((t * (6 + c * 2) + c * 300) % (view.w + 220)) - 110;
      var cy = view.h * (0.12 + c * 0.07);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 42, 12, 0, 0, 6.2832);
      ctx.ellipse(cx + 26, cy - 6, 28, 10, 0, 0, 6.2832);
      ctx.fill();
    }
  }

  function waterColor(t) {
    var ph = state.dayTime * CYCLE;
    return ph >= DAY_LEN ? 1 : (ph > DAY_LEN * 0.8 ? (ph - DAY_LEN * 0.8) / (DAY_LEN * 0.2) : 0);
  }
  function wCol(t, gx, gy) {
    var f = waterColor(t);
    var shimmer = 0.5 + 0.5 * Math.sin(t * 1.6 + gx * 1.7 + gy * 2.3);
    var base = mix("#0ea5e9", "#0c4a6e", f);
    return shade(hexOf(base), Math.round(shimmer * 14 - 7));
  }
  function hexOf(rgb) {
    var m = rgb.match(/\d+/g);
    var v = (parseInt(m[0]) << 16) | (parseInt(m[1]) << 8) | parseInt(m[2]);
    return "#" + ("000000" + v.toString(16)).slice(-6);
  }

  function drawWater(t) {
    var margin = 3;
    var c1 = screenToGrid(-TILE_W, -TILE_H);
    var c2 = screenToGrid(view.w + TILE_W, -TILE_H);
    var c3 = screenToGrid(view.w + TILE_W, view.h + TILE_H * 2);
    var c4 = screenToGrid(-TILE_W, view.h + TILE_H * 2);
    var gxMin = Math.floor(Math.min(c1.gx, c2.gx, c3.gx, c4.gx)) - margin;
    var gxMax = Math.ceil(Math.max(c1.gx, c2.gx, c3.gx, c4.gx)) + margin;
    var gyMin = Math.floor(Math.min(c1.gy, c2.gy, c3.gy, c4.gy)) - margin;
    var gyMax = Math.ceil(Math.max(c1.gy, c2.gy, c3.gy, c4.gy)) + margin;
    for (var gy = gyMin; gy <= gyMax; gy++) {
      for (var gx = gxMin; gx <= gxMax; gx++) {
        var k = tileKind(gx, gy);
        if (k !== "water") continue;
        var lift = -5 + Math.sin(t * 2 + gx * 1.3 + gy * 0.9) * 1.6;
        var pts = diamondPts(gx, gy, 1, 1, lift);
        poly(pts, wCol(t, gx, gy));
        // foam next to land
        if (tileKind(gx + 1, gy) !== "water" || tileKind(gx, gy + 1) !== "water" ||
            tileKind(gx - 1, gy) !== "water" || tileKind(gx, gy - 1) !== "water") {
          poly(pts, null, "rgba(255,255,255,0.35)");
        }
        if ((gx * 31 + gy * 17 + Math.floor(t * 2)) % 29 === 0) {
          var c = gridToScreen(gx, gy, lift);
          circle(c.x, c.y, 1.4 * cam.z, "rgba(255,255,255,0.7)");
        }
      }
    }
  }

  function drawIsland(t) {
    var night = isNight() ? 1 : 0;
    for (var i = 0; i < tileList.length; i++) {
      var tl = tileList[i];
      var gx = tl.gx, gy = tl.gy, k = tl.kind;
      if (k === "pier") {
        var pd = diamondPts(gx, gy, 1, 1, -2);
        poly(pd, "#92400e");
        poly([pd[3], pd[2], { x: pd[2].x, y: pd[2].y + 4 * cam.z }, { x: pd[3].x, y: pd[3].y + 4 * cam.z }], "#78350f");
        poly([pd[1], pd[2], { x: pd[2].x, y: pd[2].y + 4 * cam.z }, { x: pd[1].x, y: pd[1].y + 4 * cam.z }], "#78350f");
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pd[0].x, pd[0].y);
        ctx.lineTo(pd[2].x, pd[2].y);
        ctx.stroke();
        continue;
      }
      var lift = k === "grass" ? ELEV : 0;
      var pts = diamondPts(gx, gy, 1, 1, lift);
      var bottom = diamondPts(gx, gy, 1, 1, -3);
      if (k === "grass") {
        poly([pts[3], pts[2], bottom[2], bottom[3]], "#4d7c0f");
        poly([pts[1], pts[2], bottom[2], bottom[1]], "#65a30d");
        poly(pts, shade("#4ade80", ((gx * 7 + gy * 13) % 5) * 3 - 6));
      } else if (k === "sand") {
        poly([pts[3], pts[2], bottom[2], bottom[3]], "#b45309");
        poly([pts[1], pts[2], bottom[2], bottom[1]], "#d97706");
        poly(pts, shade("#fcd34d", ((gx * 11 + gy * 5) % 5) * 3 - 6));
      } else { // locked
        poly([pts[3], pts[2], bottom[2], bottom[3]], "#92400e");
        poly([pts[1], pts[2], bottom[2], bottom[1]], "#b45309");
        poly(pts, shade("#d6b36a", ((gx * 3 + gy * 19) % 5) * 3 - 8));
        poly(pts, null, "rgba(255,255,255,0.35)");
        if (cam.z > 0.7) {
          var cc = gridToScreen(gx, gy, lift);
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.font = "bold " + Math.round(10 * cam.z) + "px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          var ringIdx = dist(gx, gy) <= RINGS[0] ? 0 : 1;
          if (ringIdx === state.ringIndex) ctx.fillText("+" + fmt(RING_COST[ringIdx]) + " 💰", cc.x, cc.y);
          else ctx.fillText("🔒", cc.x, cc.y);
        }
      }
      // torch light pools at night
      if (night && k !== "locked") {
        var b = bmap[gx + "," + gy];
        if (b && b.type === "torch") {
          var tc = gridToScreen(gx, gy);
          var rg = ctx.createRadialGradient(tc.x, tc.y, 2, tc.x, tc.y, 46 * cam.z);
          rg.addColorStop(0, "rgba(251,191,36,0.35)");
          rg.addColorStop(1, "rgba(251,191,36,0)");
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(tc.x, tc.y, 46 * cam.z, 0, 6.2832);
          ctx.fill();
        }
      }
    }
  }

  function drawPrism(gx, gy, w, d, h, color) {
    var top = diamondPts(gx, gy, w, d, h);
    var bot = diamondPts(gx, gy, w, d, 0);
    poly([top[3], top[2], bot[2], bot[3]], shade(color, -38));
    poly([top[1], top[2], bot[2], bot[1]], shade(color, -20));
    poly(top, color);
    return top;
  }

  function drawBuilding(b, t) {
    var c = CATALOG[b.type];
    var z = cam.z;
    var ctr = gridToScreen(b.gx, b.gy);
    var sway = Math.sin(t * 1.8 + b.gx * 2.1) * 0.06;
    switch (b.type) {
      case "umbrella": {
        var bed = diamondPts(b.gx, b.gy, 0.62, 0.62, 2);
        poly(bed, "#fb923c", shade("#fb923c", -30));
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2 * z;
        ctx.beginPath();
        ctx.moveTo(ctr.x, ctr.y - 2 * z);
        ctx.lineTo(ctr.x, ctr.y - 24 * z);
        ctx.stroke();
        var cd = diamondPts(b.gx, b.gy, 0.85, 0.85, 24);
        poly(cd, "#f43f5e");
        poly(diamondPts(b.gx, b.gy, 0.42, 0.42, 24), "#fff1f2");
        break;
      }
      case "snack": {
        var top = drawPrism(b.gx, b.gy, 0.68, 0.68, 13, "#d97706");
        // striped awning on the front edges
        for (var s = 0; s < 4; s++) {
          var f0 = lerp(top[2], top[3], s / 4), f1 = lerp(top[2], top[3], (s + 1) / 4);
          var b0 = lerp(diamondPts(b.gx, b.gy, 0.68, 0.68, 0)[2], diamondPts(b.gx, b.gy, 0.68, 0.68, 0)[3], s / 4);
          var b1 = lerp(diamondPts(b.gx, b.gy, 0.68, 0.68, 0)[2], diamondPts(b.gx, b.gy, 0.68, 0.68, 0)[3], (s + 1) / 4);
          poly([f0, f1, b1, b0], s % 2 ? "#fecaca" : "#ef4444");
        }
        ctx.font = Math.round(11 * z) + "px serif";
        ctx.textAlign = "center";
        ctx.fillText("🍕", ctr.x, ctr.y - 18 * z);
        break;
      }
      case "bar": {
        drawPrism(b.gx, b.gy, 0.7, 0.7, 11, "#0d9488");
        var dc = gridToScreen(b.gx, b.gy, 19);
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.ellipse(dc.x, dc.y, 13 * z, 6.5 * z, 0, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = "#14b8a6";
        ctx.lineWidth = 1.5 * z;
        ctx.stroke();
        ctx.font = Math.round(11 * z) + "px serif";
        ctx.textAlign = "center";
        ctx.fillText("🍹", dc.x, dc.y - 8 * z);
        break;
      }
      case "pool": {
        var rim = diamondPts(b.gx, b.gy, 0.9, 0.9, 1);
        poly(rim, "#e2e8f0");
        var wav = diamondPts(b.gx, b.gy, 0.66, 0.66, 0);
        var sh = 0.5 + 0.5 * Math.sin(t * 2.4 + b.gx);
        poly(wav, mix("#22d3ee", "#0284c7", sh));
        poly(wav, null, "rgba(255,255,255,0.6)");
        var wc = gridToScreen(b.gx, b.gy);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.6 * z;
        ctx.beginPath();
        ctx.moveTo(wc.x - 9 * z, wc.y - 2 * z);
        ctx.lineTo(wc.x - 9 * z, wc.y - 8 * z);
        ctx.moveTo(wc.x - 6 * z, wc.y - 1 * z);
        ctx.lineTo(wc.x - 6 * z, wc.y - 7 * z);
        ctx.stroke();
        if (b.occ > 0) {
          ctx.font = Math.round(10 * z) + "px serif";
          ctx.textAlign = "center";
          ctx.fillText("🏊", wc.x + 8 * z, wc.y - 4 * z);
        }
        break;
      }
      case "hotel": {
        var bot = diamondPts(b.gx, b.gy, 0.8, 0.8, 0);
        var htop = drawPrism(b.gx, b.gy, 0.8, 0.8, 26, "#e8edf4");
        var night = isNight();
        for (var face = 0; face < 2; face++) {
          var eA = face === 0 ? 3 : 1;
          for (var fl = 1; fl <= 3; fl++) {
            for (var wc2 = 0; wc2 < 2; wc2++) {
              var u = wc2 === 0 ? 0.3 : 0.68;
              var v = fl / 4;
              var te = lerp(htop[eA], htop[2], u);
              var be = lerp(bot[eA], bot[2], u);
              var wp = { x: lerp(te.x, be.x, v), y: lerp(te.y, be.y, v) };
              ctx.fillStyle = night ? "#fde047" : "#334155";
              ctx.fillRect(wp.x - 1.6 * z, wp.y - 1.6 * z, 3.2 * z, 3.2 * z);
            }
          }
        }
        var ap = gridToScreen(b.gx, b.gy, 32);
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.4 * z;
        ctx.beginPath();
        ctx.moveTo(ap.x, ap.y);
        ctx.lineTo(ap.x, ap.y - 9 * z);
        ctx.stroke();
        var wave = Math.sin(t * 6 + b.gx) * 1.6 * z;
        poly([
          { x: ap.x, y: ap.y - 9 * z },
          { x: ap.x + 7 * z, y: ap.y - 7.5 * z + wave },
          { x: ap.x, y: ap.y - 6 * z },
        ], "#f43f5e");
        break;
      }
      case "cabana": {
        drawPrism(b.gx, b.gy, 0.74, 0.74, 15, "#b45309");
        var apex = gridToScreen(b.gx, b.gy, 30);
        var cr = diamondPts(b.gx, b.gy, 0.78, 0.78, 15);
        for (var r2 = 0; r2 < 4; r2++) {
          var n2 = (r2 + 1) % 4;
          poly([cr[r2], cr[n2], apex], r2 % 2 ? "#fbbf24" : "#92400e");
        }
        ctx.font = Math.round(11 * z) + "px serif";
        ctx.textAlign = "center";
        ctx.fillText("🛖", apex.x, apex.y - 5 * z);
        break;
      }
      case "palm": {
        var base = gridToScreen(b.gx, b.gy);
        var tipx = base.x + Math.sin(sway) * 6 * z, tipy = base.y - 26 * z;
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 3.2 * z;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.quadraticCurveTo(base.x + Math.sin(sway) * 3 * z, base.y - 14 * z, tipx, tipy);
        ctx.stroke();
        ctx.lineCap = "butt";
        for (var l = 0; l < 6; l++) {
          var a = -2.6 + l * 0.85 + sway;
          ctx.fillStyle = l % 2 ? "#16a34a" : "#22c55e";
          ctx.beginPath();
          ctx.moveTo(tipx, tipy);
          ctx.quadraticCurveTo(
            tipx + Math.cos(a) * 11 * z, tipy + Math.sin(a) * 5 * z - 2 * z,
            tipx + Math.cos(a + 0.5) * 9 * z, tipy + Math.sin(a + 0.5) * 4 * z + 2 * z
          );
          ctx.closePath();
          ctx.fill();
        }
        circle(tipx + 2 * z, tipy + 3 * z, 1.6 * z, "#78350f");
        circle(tipx - 2.5 * z, tipy + 4 * z, 1.6 * z, "#78350f");
        break;
      }
      case "torch": {
        var t0 = gridToScreen(b.gx, b.gy);
        ctx.strokeStyle = "#57534e";
        ctx.lineWidth = 2.4 * z;
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t0.x, t0.y - 18 * z);
        ctx.stroke();
        var fl = 3.4 * z + Math.sin(t * 9 + b.gx) * 1.2 * z;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y - 24 * z);
        ctx.quadraticCurveTo(t0.x + fl, t0.y - 20 * z, t0.x, t0.y - 16 * z);
        ctx.quadraticCurveTo(t0.x - fl, t0.y - 20 * z, t0.x, t0.y - 24 * z);
        ctx.fill();
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(t0.x, t0.y - 19.5 * z, fl * 0.45, 0, 6.2832);
        ctx.fill();
        break;
      }
    }
    // level pips
    if (b.level > 1 && c.cat !== "decor") {
      for (var p2 = 0; p2 < b.level - 1; p2++) {
        circle(ctr.x + (p2 - (b.level - 2) / 2) * 7 * z, ctr.y - 4 * z, 2 * z, "#fbbf24");
      }
    }
    // night windows (not on hotel: it has its own lit facade)
    if (isNight() && c.cat !== "decor" && b.type !== "pool" && b.type !== "hotel") {
      circle(ctr.x - 4 * z, ctr.y - 7 * z, 1.4 * z, "rgba(253,224,71,0.9)");
      circle(ctr.x + 4 * z, ctr.y - 7 * z, 1.4 * z, "rgba(253,224,71,0.9)");
    }
  }

  function drawBoat(b, t) {
    var pos = gridToScreen(b.x, b.y);
    var bob = Math.sin(t * 2.4 + b.phase) * 1.6;
    var z = cam.z;
    var y = pos.y + bob;
    if (b.state !== "dock") {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.4 * z;
      var dir = b.state === "arrive" ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(pos.x - 16 * z * dir, y + 3 * z);
      ctx.lineTo(pos.x - 30 * z * dir, y + 4 * z);
      ctx.stroke();
    }
    poly([
      { x: pos.x - 13 * z, y: y },
      { x: pos.x - 4 * z, y: y - 4.5 * z },
      { x: pos.x + 11 * z, y: y },
      { x: pos.x - 4 * z, y: y + 4.5 * z },
    ], "#b45309", "#78350f");
    ctx.strokeStyle = "#57534e";
    ctx.lineWidth = 1.6 * z;
    ctx.beginPath();
    ctx.moveTo(pos.x - 2 * z, y - 3 * z);
    ctx.lineTo(pos.x - 2 * z, y - 15 * z);
    ctx.stroke();
    poly([
      { x: pos.x - 2 * z, y: y - 15 * z },
      { x: pos.x + 9 * z, y: y - 11 * z },
      { x: pos.x - 2 * z, y: y - 6 * z },
    ], "#f8fafc");
  }

  function drawGuest(g, t) {
    var pos = gridToScreen(g.x, g.y);
    var z = cam.z * (g.vip ? 1.18 : 1);
    var walking = g.state === "walk" || g.state === "leave";
    var bob = Math.sin(t * 9 + g.phase) * (walking ? 1.2 : 0.5);
    circle(pos.x, pos.y + 1.5 * z, 4.6 * z, "rgba(0,0,0,0.16)");
    if (walking) {
      ctx.fillStyle = "#3f3f46";
      var lo = Math.sin(t * 12 + g.phase) * 1.6 * z;
      ctx.fillRect(pos.x - 2.2 * z, pos.y - 3.4 * z, 1.8 * z, 3.4 * z + lo * 0.4);
      ctx.fillRect(pos.x + 0.4 * z, pos.y - 3.4 * z, 1.8 * z, 3.4 * z - lo * 0.4);
    }
    ctx.fillStyle = g.outfit;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pos.x - 2.6 * z, pos.y - 10 * z + bob, 5.2 * z, 7.4 * z, 2.2 * z);
    else ctx.rect(pos.x - 2.6 * z, pos.y - 10 * z + bob, 5.2 * z, 7.4 * z);
    ctx.fill();
    circle(pos.x, pos.y - 12 * z + bob, 2.7 * z, g.skin);
    if (g.vip) {
      // little golden crown on the head
      poly([
        { x: pos.x - 2.6 * z, y: pos.y - 13.5 * z + bob },
        { x: pos.x - 2.6 * z, y: pos.y - 16.2 * z + bob },
        { x: pos.x - 1.2 * z, y: pos.y - 14.6 * z + bob },
        { x: pos.x, y: pos.y - 16.6 * z + bob },
        { x: pos.x + 1.2 * z, y: pos.y - 14.6 * z + bob },
        { x: pos.x + 2.6 * z, y: pos.y - 16.2 * z + bob },
        { x: pos.x + 2.6 * z, y: pos.y - 13.5 * z + bob },
      ], "#fbbf24");
      if (Math.random() < 0.06) {
        Particles.spawn(pos.x + (Math.random() * 16 - 8), pos.y - 14 * z, "#fde68a", 1);
      }
    }
    g._sx = pos.x; g._sy = pos.y - 15 * z + bob;
  }

  function drawBubble(g, t) {
    var z = cam.z;
    var x = g._sx, y = g._sy - 6 * z;
    if (g.state === "serve") {
      var tot = CATALOG[g.bld.type].serve;
      var f = 1 - g.t / tot;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2 * z;
      ctx.beginPath();
      ctx.arc(x, y, 6.5 * z, -Math.PI / 2, -Math.PI / 2 + f * 6.2832);
      ctx.stroke();
      ctx.font = Math.round(9 * z) + "px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(g.desire.emoji, x, y);
      return;
    }
    if (g.state === "wait") {
      var pulse = 1 + 0.08 * Math.sin(t * 5);
      ctx.fillStyle = g.patience < 6 ? "rgba(254,226,226,0.95)" : "rgba(255,255,255,0.92)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 8 * z * pulse, y - 8 * z * pulse, 16 * z * pulse, 13 * z * pulse, 4 * z);
      else ctx.rect(x - 8 * z, y - 8 * z, 16 * z, 13 * z);
      ctx.fill();
      ctx.font = Math.round(9 * z) + "px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(g.angry ? "😡" : g.desire.emoji, x, y - 1.5 * z);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x - 5 * z, y + 2.6 * z, 10 * z * clamp(g.patience / 20, 0, 1), 1.6 * z);
    }
  }

  function drawGhost() {
    if (!ui.build || !ui.ghost) return;
    var gx = ui.ghost.gx, gy = ui.ghost.gy;
    var ok = canPlace(gx, gy) && state.coins >= CATALOG[ui.build].cost;
    var pts = diamondPts(gx, gy, 1, 1, 0);
    ctx.globalAlpha = 0.4;
    poly(pts, ok ? "#34d399" : "#fb7185");
    ctx.globalAlpha = 0.85;
    var fake = { type: ui.build, gx: gx, gy: gy, level: 1, occ: 0, invested: 0 };
    drawBuilding(fake, performance.now() / 1000);
    ctx.globalAlpha = 1;
  }

  function drawFloats(dt) {
    for (var i = state.floats.length - 1; i >= 0; i--) {
      var f = state.floats[i];
      f.t += dt;
      if (f.t > 1.3) { state.floats.splice(i, 1); continue; }
      var p = gridToScreen(f.gx, f.gy);
      ctx.globalAlpha = 1 - f.t / 1.3;
      ctx.fillStyle = f.color;
      ctx.font = "bold " + Math.round(13 * cam.z) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, p.x, p.y - 20 * cam.z - f.t * 26 * cam.z);
      ctx.globalAlpha = 1;
    }
  }

  function render(t, dt) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawSky(t);
    drawWater(t);
    drawDolphins();
    drawIsland(t);
    var items = [];
    state.buildings.forEach(function (b) {
      var rb = rotPt(b.gx, b.gy);
      items.push({ d: rb.x + rb.y, fn: function () { drawBuilding(b, t); } });
    });
    state.guests.forEach(function (g) {
      var rg = rotPt(g.x, g.y);
      items.push({ d: rg.x + rg.y + 0.1, fn: function () { drawGuest(g, t); } });
    });
    state.boats.forEach(function (b) {
      var rb = rotPt(b.x, b.y);
      items.push({ d: rb.x + rb.y, fn: function () { drawBoat(b, t); } });
    });
    items.sort(function (a, b2) { return a.d - b2.d; });
    items.forEach(function (it) { it.fn(); });
    state.guests.forEach(function (g) { drawBubble(g, t); });
    drawGhost();
    drawFloats(dt);
    Particles.draw(ctx);
    if (state.weather && state.weather.id === "pioggia") drawRain(t);
    if (state.flash > 0) {
      ctx.fillStyle = "rgba(240,248,255," + (state.flash * 0.45).toFixed(3) + ")";
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  /* ================= Main loop ================= */
  var lastT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0.016;
    lastT = t;
    updateDay(dt);
    updateWeather(dt);
    updateDolphins(dt);
    updateGuests(dt, t);
    updateBoats(dt, t);
    Particles.update(dt);
    state.missionT -= dt;
    if (state.missionT <= 0) { state.missionT = 1; checkMissions(); }
    state.saveT += dt;
    if (state.saveT > 6) { state.saveT = 0; save(); }
    render(t, dt);
    updateHUD();
    refreshPanel();
    requestAnimationFrame(loop);
  }

  /* ================= Init ================= */
  function sharePhoto() {
    try {
      var tmp = document.createElement("canvas");
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      var c2 = tmp.getContext("2d");
      c2.drawImage(canvas, 0, 0);
      c2.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      c2.font = "bold 14px sans-serif";
      c2.textAlign = "right";
      c2.fillStyle = "rgba(255,255,255,0.85)";
      c2.fillText("🏝️ Isola Resort Tycoon", view.w - 12, view.h - 12);
      Sound.play(1250, 0.06, "square");
      R2.buzz(10);
      if (!tmp.toBlob) { toast("Foto non disponibile"); return; }
      tmp.toBlob(function (blob) {
        if (!blob) { toast("Foto non disponibile"); return; }
        var file = new File([blob], "isola-resort.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: "Isola Resort Tycoon" }).catch(function () {});
          toast("📸 Cartolina condivisa!");
        } else {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "isola-resort.png";
          a.click();
          toast("📸 Cartolina salvata!");
        }
      });
    } catch (e) {
      toast("Foto non disponibile");
    }
  }

  function init() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    initSound();
    load();
    rebuildTiles();
    rebuildMap();
    if (firstRun) {
      // starter buildings so the first guests are happy
      state.buildings.push({ type: "umbrella", gx: 6, gy: 9, level: 1, invested: 0, occ: 0 });
      state.buildings.push({ type: "palm", gx: 8, gy: 6, level: 1, invested: 0, occ: 0 });
      rebuildMap();
    }
    checkDaily();
    checkOffline();

    for (var i = 0; i < 80; i++) {
      stars.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.2, tw: 1 + Math.random() * 2, ph: Math.random() * 6.28 });
    }
    buildBar();
    setupInput();

    var stage = document.getElementById("stage");
    view.w = stage.clientWidth || window.innerWidth;
    view.h = stage.clientHeight || window.innerHeight;
    cam.z = clamp(view.w / 560, 0.6, 1.15);
    var rc = rotPt(CENTER, CENTER);
    cam.x = view.w / 2 - ((rc.x - rc.y) * (TILE_W / 2)) * cam.z;
    cam.y = view.h / 2 - ((rc.x + rc.y) * (TILE_H / 2)) * cam.z;
    resize();
    window.addEventListener("resize", resize);

    document.getElementById("modal-btn").addEventListener("click", closeModal);
    document.getElementById("panel-close").addEventListener("click", closePanel);
    document.getElementById("panel-up").addEventListener("click", function () { if (ui.selected) upgrade(ui.selected); });
    document.getElementById("panel-sell").addEventListener("click", function () { if (ui.selected) sell(ui.selected); });
    document.getElementById("cancel-build").addEventListener("click", function () { setBuild(null); });
    document.getElementById("help-btn").addEventListener("click", function () {
      showModal("🏝️ Isola Resort", WELCOME, "Al lavoro!");
    });
    var sbtn = document.getElementById("sound-btn");
    sbtn.textContent = R2.getSettings().sound ? "🔊" : "🔇";
    sbtn.addEventListener("click", function () {
      var s = R2.setSettings({ sound: !R2.getSettings().sound });
      sbtn.textContent = s.sound ? "🔊" : "🔇";
      toast(s.sound ? "🔊 Audio attivo" : "🔇 Audio spento");
    });
    var mbtn = document.getElementById("music-btn");
    mbtn.style.opacity = R2.getSettings().music ? "1" : "0.4";
    mbtn.addEventListener("click", function () {
      var s = R2.setSettings({ music: !R2.getSettings().music });
      mbtn.style.opacity = s.music ? "1" : "0.4";
      toast(s.music ? "🎵 Musica calypso on" : "🎵 Musica off");
    });
    document.getElementById("photo-btn").addEventListener("click", sharePhoto);
    document.getElementById("rot-btn").addEventListener("click", function () {
      state.rot = (state.rot + 1) % 4;
      rebuildTiles();
      clampCam();
      Sound.play(500, 0.08, "triangle");
      R2.buzz(8);
      toast("🔄 Camera ruotata");
    });
    var savemenu = document.getElementById("save-menu");
    document.getElementById("save-btn").addEventListener("click", function () {
      savemenu.classList.toggle("hidden");
    });
    document.getElementById("export-btn").addEventListener("click", function () {
      savemenu.classList.add("hidden");
      save();
      var data = JSON.stringify(R2.loadJSON(SAVE_KEY, {}), null, 2);
      var blob = new Blob([data], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "isola-resort-save.json";
      a.click();
      toast("💾 Salvataggio esportato!");
    });
    var fileInput = document.getElementById("import-file");
    document.getElementById("import-btn").addEventListener("click", function () {
      savemenu.classList.add("hidden");
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!data || data.v !== 1 || typeof data.coins !== "number") throw new Error("bad");
          R2.saveJSON(SAVE_KEY, data);
          toast("📥 Salvataggio importato!");
          setTimeout(function () { location.reload(); }, 600);
        } catch (e) {
          Sound.error();
          toast("❌ File di salvataggio non valido");
        }
      };
      reader.readAsText(f);
    });
    // browsers allow audio only after a gesture: kick the sequencer on first tap
    var kick = function () { Music.start(); document.removeEventListener("pointerdown", kick); };
    document.addEventListener("pointerdown", kick);

    if (firstRun) showModal("🏝️ Benvenuto all'Isola!", WELCOME, "Al lavoro!");
    R2.trackPlaytime("resort-pwa/");
    R2.installHint();
    R2.markPlayed("resort-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
