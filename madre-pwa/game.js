/*
 * MADRE — casa di fermentazione · il tempo reale è l'ingrediente
 * Le curve di maturazione sono valutate da timestamp reali: l'app chiusa
 * conta. Vendere al picco o dimenticare e far marcire. Contratti generati
 * dal daily seed, mercato a random walk, notifiche opt-in al picco.
 * UI DOM + mini-curve canvas. Zero asset.
 */
(function () {
  "use strict";

  /* ===== Config ===== */
  var RECIPES = [
    { key: "kefir",     name: "Kefir",            emoji: "🥛", peak: 300,    spoil: 700,    price: 8,    cost: 3,   unlock: 0 },
    { key: "kombucha",  name: "Kombucha",         emoji: "🍵", peak: 1800,   spoil: 4200,   price: 26,   cost: 9,   unlock: 40 },
    { key: "yogurt",    name: "Yogurt",           emoji: "🥄", peak: 14400,  spoil: 32400,  price: 95,   cost: 35,  unlock: 120 },
    { key: "formaggio", name: "Formaggio",        emoji: "🧀", peak: 86400,  spoil: 216000, price: 340,  cost: 130, unlock: 450 },
    { key: "pecorino",  name: "Pecorino riserva", emoji: "🧀", peak: 345600, spoil: 720000, price: 1100, cost: 430, unlock: 1600 },
  ];
  var ROOMS = [
    { key: "dispensa", name: "Dispensa",       mult: 1.0, cost: 0,   note: "matura in tempo reale" },
    { key: "cantina",  name: "Cantina fresca", mult: 0.6, cost: 200, note: "matura ×0.6: allunga la finestra di vendita" },
    { key: "calda",    name: "Locale caldo",   mult: 1.6, cost: 350, note: "matura ×1.6: corre verso il picco" },
  ];
  var SLOTS_BASE = 5;
  var CONTRACT_MIN_Q = 0.65;
  var SAVE_KEY = "madre-pwa";

  var state = {
    money: 60, rep: 50,
    recipes: { kefir: true },
    rooms: {
      dispensa: { unlocked: true, expanded: false },
      cantina: { unlocked: false, expanded: false },
      calda: { unlocked: false, expanded: false },
    },
    batches: [], contracts: [],
    market: { mult: 1, lastTick: Date.now() },
    dailySeed: 0, lastSeen: 0,
    stats: { totalEarned: 0, sold: 0 },
    notifyOn: false,
  };
  var uid = 0;
  var Sound;
  var activeTab = "cantina";
  var activeRoom = "dispensa";
  var toastT = null;
  var firstRun = false;

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
  function rand(a, b) { return a + Math.random() * (b - a); }
  function recipeOf(key) {
    for (var i = 0; i < RECIPES.length; i++) if (RECIPES[i].key === key) return RECIPES[i];
    return null;
  }
  function roomOf(key) {
    for (var i = 0; i < ROOMS.length; i++) if (ROOMS[i].key === key) return ROOMS[i];
    return null;
  }
  function fmtMoney(n) { return "€ " + Math.round(n); }
  function fmtDur(s) {
    s = Math.max(0, Math.floor(s));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    if (d > 0) return d + "g " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m " + s + "s";
    return s + "s";
  }

  /* ===== Curva di maturazione ===== */
  function qualityAt(b, now) {
    var r = recipeOf(b.key);
    var room = roomOf(b.room);
    var te = (now - b.tStart) * room.mult;   // tempo effettivo di maturazione
    if (te <= 0) return 0;
    if (te <= r.peak) return 0.25 + 0.75 * Math.pow(te / r.peak, 0.8);
    if (te <= r.spoil) {
      var f = (te - r.peak) / (r.spoil - r.peak);
      return Math.max(0, 1 - Math.pow(f, 1.4));
    }
    return 0;
  }
  function isPeak(b, now) {
    var r = recipeOf(b.key);
    var room = roomOf(b.room);
    var te = (now - b.tStart) * room.mult;
    return te >= r.peak * 0.9 && te <= r.peak * 1.3;
  }
  function realTimeToPeak(b, now) {
    var r = recipeOf(b.key);
    var room = roomOf(b.room);
    var te = (now - b.tStart) * room.mult;
    return (r.peak - te) / room.mult;
  }
  function sellPrice(b, now) {
    var r = recipeOf(b.key);
    var q = qualityAt(b, now);
    return Math.round(r.price * state.market.mult * q);
  }

  /* ===== Persistenza ===== */
  function save() {
    state.lastSeen = Date.now();
    R2.saveJSON(SAVE_KEY, {
      v: 1,
      money: state.money, rep: state.rep,
      recipes: state.recipes, rooms: state.rooms,
      batches: state.batches, contracts: state.contracts,
      market: state.market, dailySeed: state.dailySeed,
      lastSeen: state.lastSeen, stats: state.stats,
      notifyOn: state.notifyOn,
    });
    R2.saveJSON("madre-records", { highScore: Math.floor(state.stats.totalEarned) });
  }
  function load() {
    var d = R2.loadJSON(SAVE_KEY, null);
    firstRun = !d;
    if (!d) return;
    state.money = d.money != null ? d.money : 60;
    state.rep = clamp(d.rep != null ? d.rep : 50, 0, 100);
    state.recipes = d.recipes || { kefir: true };
    state.rooms = d.rooms || state.rooms;
    state.batches = d.batches || [];
    state.contracts = d.contracts || [];
    state.market = d.market || state.market;
    state.dailySeed = d.dailySeed || 0;
    state.lastSeen = d.lastSeen || Date.now();
    state.stats = d.stats || { totalEarned: 0, sold: 0 };
    state.notifyOn = !!d.notifyOn;
    var now = Date.now();
    state.batches.forEach(function (b) { if (b.tStart > now) b.tStart = now; }); // rollback orologio
    if (state.market.lastTick > now) state.market.lastTick = now;
  }

  /* ===== Report offline & contratti scaduti ===== */
  function processOffline() {
    var now = Date.now();
    var away = now - state.lastSeen;
    var peakHit = 0, rotten = 0, expired = 0;
    state.batches.forEach(function (b) {
      if (b.rotten) return;
      if (qualityAt(b, now) <= 0.02 && b.tStart < now) { b.rotten = true; rotten++; }
      else if (isPeak(b, now) && !b.notified) { b.notified = true; peakHit++; }
    });
    state.contracts = state.contracts.filter(function (c) {
      if (c.deadline < now) { expired++; state.rep = clamp(state.rep - 12, 0, 100); return false; }
      return true;
    });
    if (away > 120 && (peakHit || rotten || expired)) {
      var lines = [];
      if (peakHit) lines.push("🧀 <b>" + peakHit + "</b> " + (peakHit === 1 ? "lotto è al picco" : "lotti sono al picco") + " — vendili subito");
      if (rotten) lines.push("🗑️ <b>" + rotten + "</b> " + (rotten === 1 ? "lotto è andato" : "lotti sono andati") + " a male");
      if (expired) lines.push("📜 <b>" + expired + "</b> " + (expired === 1 ? "contratto scaduto" : "contratti scaduti") + " (−12 reputazione)");
      showModal("Mentre eri via",
        "Il tempo non si è fermato (" + fmtDur(away / 1000) + "):<br><br>" + lines.join("<br>"),
        [{ t: "Torna alla cantina", f: hideModal, primary: true }]);
    }
  }

  /* ===== Contratti dal daily seed ===== */
  function ensureContracts() {
    var today = R2.dailySeed();
    if (state.dailySeed === today) return;
    state.dailySeed = today;
    var rng = R2.mulberry32(today);
    var known = RECIPES.filter(function (r) { return state.recipes[r.key]; });
    if (!known.length) { save(); return; }
    var n = 2 + Math.floor(state.rep / 40);
    var repMult = 0.6 + state.rep / 100 * 0.9;
    for (var i = 0; i < n; i++) {
      var r = known[Math.floor(rng() * known.length)];
      if (i === 0 && state.recipes.kefir) r = recipeOf("kefir");
      var qty = 2 + Math.floor(rng() * 3);
      var reward = Math.round(qty * r.price * 1.5 * repMult);
      state.contracts.push({
        id: "c" + today + "-" + i,
        key: r.key, qty: qty, reward: reward,
        deadline: Date.now() + (30 + rng() * 14) * 3600000,
      });
    }
    save();
  }

  /* ===== Mercato ===== */
  function updateMarket(now) {
    var chunks = Math.floor((now - state.market.lastTick) / 300000);
    if (chunks <= 0) return;
    chunks = Math.min(chunks, 16);
    for (var i = 0; i < chunks; i++) {
      state.market.mult += rand(-0.08, 0.10);
      state.market.mult += (1 - state.market.mult) * 0.04;
    }
    state.market.mult = clamp(state.market.mult, 0.65, 1.65);
    state.market.lastTick = now;
    save();
  }

  /* ===== Notifiche ===== */
  function notify(body) {
    if (!state.notifyOn) return;
    try {
      if (Notification.permission === "granted" && document.hidden) {
        new Notification("🫙 MADRE", { body: body, silent: true });
      }
    } catch (e) {}
  }
  function checkPeakNotifications() {
    var now = Date.now();
    state.batches.forEach(function (b) {
      if (b.rotten || b.notified) return;
      if (isPeak(b, now)) {
        b.notified = true;
        var r = recipeOf(b.key);
        toast("🧀 " + r.name + " è al picco! Vendi ora.");
        notify(r.name + " al picco! Qualità massima, vendi ora.");
        save();
      }
    });
  }

  /* ===== Azioni ===== */
  function findBatch(id) {
    for (var i = 0; i < state.batches.length; i++) if (state.batches[i].id === id) return state.batches[i];
    return null;
  }
  function sellBatch(id) {
    var b = findBatch(id);
    if (!b || b.rotten) return;
    var now = Date.now();
    var q = qualityAt(b, now);
    if (q < 0.05) { Sound.error(); return; }
    var price = sellPrice(b, now);
    state.money += price;
    state.stats.totalEarned += price;
    state.stats.sold++;
    state.batches.splice(state.batches.indexOf(b), 1);
    Sound.sell();
    R2.buzz(8);
    toast("€ +" + price + " · " + recipeOf(b.key).name + " (qualità " + Math.round(q * 100) + "%)");
    save(); renderView(); updateHUD();
  }
  function discardBatch(id) {
    var b = findBatch(id);
    if (!b) return;
    state.batches.splice(state.batches.indexOf(b), 1);
    Sound.error();
    save(); renderView();
  }
  function freeSlotCount(roomKey) {
    var cap = SLOTS_BASE + (state.rooms[roomKey].expanded ? 3 : 0);
    var used = state.batches.filter(function (b) { return b.room === roomKey; }).length;
    return cap - used;
  }
  function openPicker() {
    var html = "";
    RECIPES.forEach(function (r) {
      if (state.recipes[r.key]) {
        var roomsHtml = "";
        ROOMS.forEach(function (room) {
          if (!state.rooms[room.key].unlocked) return;
          var free = freeSlotCount(room.key);
          roomsHtml += '<button data-act="place" data-key="' + r.key + '" data-room="' + room.key + '"' +
            (free <= 0 || state.money < r.cost ? " disabled" : "") + ">" +
            room.name + " (" + free + " liberi)</button>";
        });
        html += '<div class="picker"><b>' + r.emoji + " " + r.name + "</b>" +
          '<div class="meta">Picco: ' + fmtDur(r.peak) + " · si rovina: " + fmtDur(r.spoil) +
          " · prezzo base " + fmtMoney(r.price) + "</div>" +
          '<div class="meta">Costo ingredienti: <b>' + fmtMoney(r.cost) + "</b></div>" +
          '<div class="rooms">' + roomsHtml + "</div></div>";
      } else {
        html += '<div class="picker locked"><b>🔒 ' + r.emoji + " " + r.name + "</b>" +
          '<div class="meta">Picco: ' + fmtDur(r.peak) + " · prezzo base " + fmtMoney(r.price) + "</div>" +
          '<button class="btn" data-act="learn" data-key="' + r.key + '"' +
          (state.money < r.unlock ? " disabled" : "") + ">Impara la ricetta · " + fmtMoney(r.unlock) + "</button></div>";
      }
    });
    showModal("Nuovo lotto", html, [{ t: "Chiudi", f: hideModal, ghost: true }]);
  }
  function placeBatch(key, roomKey) {
    var r = recipeOf(key);
    if (!r || !state.recipes[key] || state.money < r.cost || freeSlotCount(roomKey) <= 0) { Sound.error(); return; }
    state.money -= r.cost;
    uid++;
    var b = {
      id: "b" + Date.now().toString(36) + uid,
      key: key, room: roomKey,
      tStart: Date.now(), rotten: false, notified: false,
    };
    state.batches.push(b);
    Sound.buy();
    hideModal();
    activeTab = "cantina";
    activeRoom = roomKey;
    save(); renderView(); updateHUD();
    toast("🫙 " + r.name + " allestito: al picco tra " + fmtDur(realTimeToPeak(b, Date.now())));
  }
  function learnRecipe(key) {
    var r = recipeOf(key);
    if (!r || state.recipes[key] || state.money < r.unlock) { Sound.error(); return; }
    state.money -= r.unlock;
    state.recipes[key] = true;
    Sound.buy();
    toast("📖 Ricetta " + r.name + " imparata!");
    save(); hideModal(); renderView();
  }
  function expandRoom(roomKey) {
    if (state.rooms[roomKey].unlocked || state.money < roomOf(roomKey).cost) { Sound.error(); return; }
    state.money -= roomOf(roomKey).cost;
    state.rooms[roomKey].unlocked = true;
    Sound.buy();
    toast("🔑 " + roomOf(roomKey).name + " sbloccata: " + roomOf(roomKey).note);
    save(); renderView();
  }
  function expandSlots(roomKey) {
    if (state.rooms[roomKey].expanded || state.money < 70) { Sound.error(); return; }
    state.money -= 70;
    state.rooms[roomKey].expanded = true;
    Sound.buy();
    toast("📦 Scaffale aggiunto: +3 posti in " + roomOf(roomKey).name);
    save(); renderView();
  }
  function deliverContract(id) {
    var c = null;
    state.contracts.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) return;
    var now = Date.now();
    var qualifying = state.batches.filter(function (b) {
      return b.key === c.key && !b.rotten && qualityAt(b, now) >= CONTRACT_MIN_Q;
    }).sort(function (a, b) { return qualityAt(b, now) - qualityAt(a, now); });
    if (qualifying.length < c.qty) {
      Sound.error();
      toast("Ti servono " + c.qty + " lotti di " + recipeOf(c.key).name + " con qualità ≥ 65%");
      return;
    }
    for (var i = 0; i < c.qty; i++) {
      state.batches.splice(state.batches.indexOf(qualifying[i]), 1);
    }
    var repMult = 0.6 + state.rep / 100 * 0.9;
    var paid = Math.round(c.reward * repMult);
    state.money += paid;
    state.stats.totalEarned += paid;
    state.rep = clamp(state.rep + 8, 0, 100);
    state.contracts.splice(state.contracts.indexOf(c), 1);
    Sound.contract();
    R2.buzz([10, 20, 10]);
    toast("📜 Consegna completata: +" + fmtMoney(paid) + " · reputazione +8");
    save(); renderView(); updateHUD();
  }

  /* ===== Render ===== */
  function drawCurve(cv, r, te) {
    var w = cv.width, h = cv.height;
    var c = cv.getContext("2d");
    c.clearRect(0, 0, w, h);
    c.fillStyle = "rgba(43,33,20,0.05)";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#b57b12";
    c.lineWidth = 2;
    c.beginPath();
    for (var px = 0; px <= w; px += 2) {
      var te2 = (px / w) * r.spoil;
      var q = qualityCurve(r, te2);
      var py = h - q * (h - 6) - 2;
      if (px === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
    var pkx = (r.peak / r.spoil) * w;
    c.strokeStyle = "rgba(30,142,62,0.7)";
    c.setLineDash([3, 3]);
    c.beginPath();
    c.moveTo(pkx, 0); c.lineTo(pkx, h);
    c.stroke();
    c.setLineDash([]);
    var cur = clamp(te / r.spoil, 0, 1) * w;
    c.fillStyle = "#c0392b";
    c.beginPath();
    c.arc(cur, h - qualityCurve(r, te) * (h - 6) - 2, 3.4, 0, 6.2832);
    c.fill();
  }
  function qualityCurve(r, te) {
    if (te <= 0) return 0;
    if (te <= r.peak) return 0.25 + 0.75 * Math.pow(te / r.peak, 0.8);
    if (te <= r.spoil) return Math.max(0, 1 - Math.pow((te - r.peak) / (r.spoil - r.peak), 1.4));
    return 0;
  }

  function renderCantina() {
    var chips = '<div class="roomchips">';
    ROOMS.forEach(function (room) {
      var st = state.rooms[room.key];
      if (!st.unlocked) {
        chips += '<button class="roomchip locked" data-act="buyroom" data-room="' + room.key + '">🔒 ' + room.name + " · " + fmtMoney(room.cost) + "</button>";
      } else {
        chips += '<button class="roomchip' + (activeRoom === room.key ? " sel" : "") + '" data-act="room" data-room="' + room.key + '">' + room.name + " ×" + room.mult + "</button>";
      }
    });
    chips += "</div>";
    var room = roomOf(activeRoom);
    var st = state.rooms[activeRoom];
    var note = '<div class="roomnote">' + room.name + " · " + room.note +
      (st.expanded ? " · scaffale +3 installato" :
        ' · <button class="roomchip" data-act="expandslots" data-room="' + activeRoom + '">📦 Aggiungi scaffale (+3 posti · € 70)</button>') +
      "</div>";
    var cap = SLOTS_BASE + (st.expanded ? 3 : 0);
    var inRoom = state.batches.filter(function (b) { return b.room === activeRoom; });
    var now = Date.now();
    var cards = "";
    inRoom.forEach(function (b) {
      var r = recipeOf(b.key);
      var roomM = room.mult;
      var te = (now - b.tStart) * roomM;
      var q = qualityAt(b, now);
      var peak = isPeak(b, now);
      var price = sellPrice(b, now);
      var barW = clamp(q, 0, 1) * 100;
      var info;
      if (b.rotten || q <= 0.02) {
        info = '<span class="late">ANDATO A MALE</span> · da scartare';
      } else if (peak) {
        info = '<span class="peaknow">AL PICCO!</span> vendi ora · finestra: ' + fmtDur((r.peak * 1.3 - te) / roomM);
      } else if (te > r.peak) {
        info = '<span class="late">Oltre il picco</span> · qualità in calo · vendi presto';
      } else {
        info = "Al picco tra <b>" + fmtDur(realTimeToPeak(b, now)) + "</b>";
      }
      cards += '<div class="batch' + (b.rotten ? " rotten" : "") + '">' +
        '<div class="b-head"><span class="b-em">' + r.emoji + "</span><b>" + r.name + "</b>" +
        '<span class="b-room">×' + roomM + "</span></div>" +
        '<div class="b-bar"><div class="b-fill' + (te > r.peak ? " decay" : "") + '" style="width:' + barW + '%"></div>' +
        '<div class="b-peakflag" style="left:' + (r.peak / r.spoil * 100) + '%"></div></div>' +
        '<canvas class="b-curve" data-curve="' + b.id + '" width="220" height="44"></canvas>' +
        '<div class="b-info">Qualità <b>' + Math.round(q * 100) + "%</b> · " + info + "</div>" +
        '<div class="b-actions">' +
        (b.rotten || q < 0.05
          ? '<button data-act="discard" data-id="' + b.id + '">🗑️ Scarta</button>'
          : '<button class="sell" data-act="sell" data-id="' + b.id + '">Vendi · ' + fmtMoney(price) + "</button>") +
        "</div></div>";
    });
    var empties = cap - inRoom.length;
    for (var e = 0; e < empties; e++) {
      cards += '<button class="empty" data-act="newbatch">+ Nuovo lotto</button>';
    }
    return chips + note + '<div class="grid">' + cards + "</div>";
  }

  function renderContracts() {
    var now = Date.now();
    var html = '<div class="notefile">I contratti arrivano ogni giornata (generati dal seme del giorno). ' +
      "Consegna lotti con <b>qualità ≥ 65%</b>. Scaduti: <b>−12 reputazione</b>. " +
      "La reputazione moltiplica le ricompense (ora ×" + (0.6 + state.rep / 100 * 0.9).toFixed(2) + ").</div>";
    var active = false;
    state.contracts.forEach(function (c) {
      active = true;
      var r = recipeOf(c.key);
      var left = (c.deadline - now) / 1000;
      var urgent = left < 6 * 3600;
      var qualifying = state.batches.filter(function (b) {
        return b.key === c.key && !b.rotten && qualityAt(b, now) >= CONTRACT_MIN_Q;
      }).length;
      html += '<div class="contract' + (urgent ? " urgent" : "") + '">' +
        '<div class="c-head"><b>' + r.emoji + " " + r.name + " ×" + c.qty + "</b>" +
        '<span class="c-reward">' + fmtMoney(c.reward) + "</span></div>" +
        '<div class="c-line">Qualità richiesta: <b>≥ 65%</b> · pronti ora: <b>' + qualifying + "/" + c.qty + "</b></div>" +
        '<div class="c-deadline' + (urgent ? " urgent" : "") + '">⏳ Scade tra ' + fmtDur(left) + "</div>" +
        '<div class="b-actions"><button class="sell" data-act="deliver" data-id="' + c.id + '"' +
        (qualifying >= c.qty ? "" : " disabled") + ">📦 Consegna</button></div></div>";
    });
    if (!active) html += '<div class="expired">Nessun contratto attivo. Torna domani: nuovi ordini dalla città.</div>';
    return html;
  }

  function renderMarket() {
    var m = state.market.mult;
    var dir = m >= 1 ? "up" : "down";
    var arrow = m >= 1.05 ? "▲" : (m <= 0.95 ? "▼" : "▬");
    var html = '<div class="marketbox"><div class="big ' + dir + '">×' + m.toFixed(2) + " " + arrow + "</div>" +
      '<div class="note">Il mercato si muove ogni 5 minuti reali, anche a app chiusa ' +
      "(random walk con ritorno alla media). Vendere al picco di qualità con il mercato alto " +
      "è il modo giusto di chiudere un lotto.</div></div>";
    RECIPES.forEach(function (r) {
      if (!state.recipes[r.key]) return;
      html += '<div class="pricerow"><span>' + r.emoji + " " + r.name + '</span><span class="mult">×' +
        m.toFixed(2) + " → " + fmtMoney(r.price * m) + "</span></div>";
    });
    html += '<div class="notefile" style="margin-top:10px">Prezzi mostrati alla qualità perfetta. Il prezzo reale è ' +
      "prezzo base × mercato × qualità del lotto.</div>";
    return html;
  }

  function renderView() {
    var view = $("view");
    if (activeTab === "cantina") view.innerHTML = renderCantina();
    else if (activeTab === "contratti") view.innerHTML = renderContracts();
    else view.innerHTML = renderMarket();
    var now = Date.now();
    view.querySelectorAll("canvas[data-curve]").forEach(function (cv) {
      var b = findBatch(cv.getAttribute("data-curve"));
      if (b) drawCurve(cv, recipeOf(b.key), (now - b.tStart) * roomOf(b.room).mult);
    });
    var active = state.contracts.filter(function (c) { return c.deadline > now; }).length;
    var badge = $("cbadge");
    if (active > 0) { badge.textContent = active; badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
  }

  function updateHUD() {
    $("money").textContent = Math.round(state.money);
    $("rep").textContent = state.rep;
    var day = Math.floor((Date.now() - (state.firstDay || Date.now())) / 86400000) + 1;
    $("daychip").textContent = "Giornata " + day;
  }

  /* ===== Modal ===== */
  function showModal(title, bodyHTML, btns) {
    $("m-title").textContent = title;
    $("m-body").innerHTML = bodyHTML;
    var bx = $("m-btns");
    bx.innerHTML = "";
    btns.forEach(function (b) {
      var el = document.createElement("button");
      el.className = "btn" + (b.primary ? " primary" : "");
      el.innerHTML = b.t;
      el.addEventListener("click", function () { hideModal(); if (b.f) b.f(); });
      bx.appendChild(el);
    });
    $("modal").classList.remove("hidden");
  }
  function hideModal() { $("modal").classList.add("hidden"); }
  function modalOpen() { return !$("modal").classList.contains("hidden"); }

  function showStart() {
    showModal("MADRE — casa di fermentazione",
      "La <b>madre</b> — il fermento — ti è stata passata da tua nonna. Ora la cantina è tua.<br><br>" +
      "• Allestisci lotti: ognuno matura con <b>tempo reale</b> (timestamp), anche a app chiusa<br>" +
      "• Ogni prodotto ha una curva: <b>salita, picco, degrado, marciume</b>. Vendere al picco è tutto<br>" +
      "• Le <b>camere</b> cambiano la velocità: cantina fresca rallenta, locale caldo accelera<br>" +
      "• I <b>contratti</b> chiedono lotti con qualità ≥ 65% entro scadenze reali<br>" +
      "• Il <b>mercato</b> oscilla anche mentre dormi<br><br>" +
      "Il primo kefir è al picco in 5 minuti. Il pecorino riserva? 4 giorni. Pianifica.",
      [{ t: "🫙 Apri la cantina", f: function () { hideModal(); if (!state.batches.length) openPicker(); }, primary: true }]);
  }

  /* ===== Tick ===== */
  function tick() {
    var now = Date.now();
    updateMarket(now);
    checkPeakNotifications();
    state.contracts = state.contracts.filter(function (c) {
      if (c.deadline < now) {
        state.rep = clamp(state.rep - 12, 0, 100);
        toast("📜 Contratto scaduto: −12 reputazione");
        return false;
      }
      return true;
    });
    var anyRotten = false;
    state.batches.forEach(function (b) {
      if (!b.rotten && qualityAt(b, now) <= 0.02 && b.tStart < now) { b.rotten = true; anyRotten = true; }
    });
    if (anyRotten) { Sound.rot(); save(); }
    if (!modalOpen()) renderView();
    updateHUD();
  }

  /* ===== Input ===== */
  function setupInput() {
    $("view").addEventListener("click", function (e) {
      var el = e.target.closest("[data-act]");
      if (!el) return;
      var act = el.dataset.act;
      if (act === "sell") sellBatch(el.dataset.id);
      else if (act === "discard") discardBatch(el.dataset.id);
      else if (act === "newbatch") openPicker();
      else if (act === "learn") learnRecipe(el.dataset.key);
      else if (act === "place") placeBatch(el.dataset.key, el.dataset.room);
      else if (act === "buyroom") expandRoom(el.dataset.room);
      else if (act === "expandslots") expandSlots(el.dataset.room);
      else if (act === "room") { activeRoom = el.dataset.room; renderView(); }
      else if (act === "deliver") deliverContract(el.dataset.id);
    });
    document.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("sel"); });
        t.classList.add("sel");
        activeTab = t.dataset.tab;
        renderView();
      });
    });
    document.getElementById("help-btn").addEventListener("click", showStart);
    var nbtn = document.getElementById("notify-btn");
    if (state.notifyOn) nbtn.classList.add("on");
    nbtn.addEventListener("click", function () {
      if (state.notifyOn) { toast("Notifiche già attive"); return; }
      if (!("Notification" in window)) { toast("Notifiche non supportate qui"); return; }
      Notification.requestPermission().then(function (perm) {
        if (perm === "granted") {
          state.notifyOn = true;
          nbtn.classList.add("on");
          toast("🔔 Notifiche al picco attive (a scheda aperta)");
          try { new Notification("🫙 MADRE", { body: "Ti avviserò quando un lotto è al picco." }); } catch (e2) {}
          save();
        } else toast("Permesso negato: senza notifiche, controlla la cantina a mano");
      }).catch(function () { toast("Notifiche non disponibili"); });
    });
    var sbtn = $("sound-btn");
    sbtn.textContent = R2.getSettings().sound ? "🔊" : "🔇";
    sbtn.addEventListener("click", function () {
      var st = R2.setSettings({ sound: !R2.getSettings().sound });
      sbtn.textContent = st.sound ? "🔊" : "🔇";
    });
  }

  /* ===== Sound ===== */
  function initSound() {
    Sound = R2.makeSound({
      sell:     [740, 0.1, "sine"],
      buy:      [330, 0.1, "triangle"],
      contract: [523, 0.18, "triangle"],
      rot:      [120, 0.3, "sawtooth"],
      error:    [110, 0.15, "sawtooth"],
      peak:     [880, 0.15, "sine"],
    });
  }

  /* ===== Loop (500ms) ===== */
  function startLoop() {
    setInterval(function () {
      if (!document.hidden) tick();
    }, 500);
  }

  /* ===== Init ===== */
  function init() {
    initSound();
    load();
    ensureContracts();
    processOffline();
    if (state.dailySeed === 0) state.dailySeed = R2.dailySeed();
    state.firstDay = state.lastSeen;
    setupInput();
    renderView();
    updateHUD();
    showStart();
    R2.trackPlaytime("madre-pwa/");
    R2.installHint();
    R2.markPlayed("madre-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) save(); else tick();
    });
    startLoop();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
