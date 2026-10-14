/*
 * STATIC — segnale pirata .io su rete di cavi morti
 * Movimento su grafo (cavi), pacchetti da mangiare, TV da conquistare,
 * bande di censura che ti danno la caccia. Estetica CRT/VHS procedurale:
 * scanline, ghosting cromatico, wobble, rumore. Broadcast locale opt-in
 * (Notification API + BroadcastChannel tra schede).
 */
(function () {
  "use strict";

  /* ===== Config ===== */
  var COLS = 7, ROWS = 10, SP = 125, M = 60;
  var W = M * 2 + (COLS - 1) * SP;   // 870
  var H = M * 2 + (ROWS - 1) * SP;   // 1245
  var SPEED = 155;
  var STRENGTH_MAX = 3;

  var state = {
    nodes: [], adj: [], edges: [],
    packets: [], tvs: [], censors: [], bots: [],
    score: 0, strength: 3, tvsSeized: 0,
    time: 0, over: false, glitch: 0, burst: 0, wobble: 0, wobbleT: 4,
    invuln: 0,
  };
  var player = { a: 0, b: 0, t: 0, trail: [] };
  var cam = { x: 0, y: 0, z: 1 };
  var view = { w: 0, h: 0, dpr: 1 };
  var canvas, ctx, fx, fxc;
  var scanPat = null, noiseTiles = [];
  var Sound, Particles;
  var want = { x: 0, y: -1 };
  var pointer = { has: false, x: 0, y: 0 };
  var keys = {};
  var toastT = null;
  var onair = false, bc = null;
  var remoteScores = {};
  var lastMini = 0;

  /* ===== Utils ===== */
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
  function nodePos(i) { return { x: state.nodes[i].x, y: state.nodes[i].y }; }
  function edgeLen(a, b) { var p = nodePos(a), q = nodePos(b); return Math.sqrt(dist2(p.x, p.y, q.x, q.y)); }
  function notify(txt) {
    if (!onair) return;
    try {
      if (Notification.permission === "granted" && document.hidden) {
        new Notification("📡 STATIC", { body: txt, silent: true });
      }
    } catch (e) {}
  }

  /* ===== Sound ===== */
  function initSound() {
    Sound = R2.makeSound({
      packet: [740, 0.06, "square"],
      tv:     [392, 0.28, "triangle"],
      hit:    [90, 0.3, "sawtooth"],
      glitch: [1200, 0.05, "sawtooth"],
      over:   [70, 0.7, "sine"],
      zap:    [980, 0.05, "square"],
    });
    Particles = R2.makeParticles();
  }

  /* ===== Graph ===== */
  function buildGraph() {
    state.nodes = [];
    state.adj = [];
    state.edges = [];
    for (var j = 0; j < ROWS; j++) {
      for (var i = 0; i < COLS; i++) {
        state.nodes.push({ x: M + i * SP, y: M + j * SP, i: i, j: j });
        state.adj.push([]);
      }
    }
    function link(a, b) {
      state.adj[a].push(b);
      state.adj[b].push(a);
      state.edges.push({ a: a, b: b });
    }
    for (var jj = 0; jj < ROWS; jj++) {
      for (var ii = 0; ii < COLS; ii++) {
        var id = jj * COLS + ii;
        if (ii < COLS - 1 && Math.random() > 0.13) link(id, id + 1);
        if (jj < ROWS - 1 && Math.random() > 0.13) link(id, id + COLS);
      }
    }
    // garanzia di connessione: ricollega nodi isolati
    state.nodes.forEach(function (n, idx) {
      if (state.adj[idx].length === 0) {
        var cands = [];
        if (ii2(idx) > 0) cands.push(idx - 1);
        if (ii2(idx) < COLS - 1) cands.push(idx + 1);
        if (jj2(idx) > 0) cands.push(idx - COLS);
        if (jj2(idx) < ROWS - 1) cands.push(idx + COLS);
        if (cands.length) link(idx, cands[Math.floor(Math.random() * cands.length)]);
      }
    });
    function ii2(id) { return id % COLS; }
    function jj2(id) { return Math.floor(id / COLS); }
  }

  function buildEntities() {
    // TV su nodi ben distanziati
    state.tvs = [];
    var tries = 0;
    while (state.tvs.length < 8 && tries < 400) {
      tries++;
      var idx = Math.floor(Math.random() * state.nodes.length);
      var p = nodePos(idx);
      var far = state.tvs.every(function (t) { return dist2(p.x, p.y, t.x, t.y) > 300 * 300; });
      var notStart = dist2(p.x, p.y, nodePos(0).x, nodePos(0).y) > 220 * 220;
      if (far && notStart) state.tvs.push({ x: p.x, y: p.y, node: idx, seized: false, prog: 0, progBy: null, ch: state.tvs.length + 4 });
    }
    // pacchetti
    state.packets = [];
    for (var i = 0; i < 26; i++) spawnPacket();
    // censure
    state.censors = [];
    for (var c = 0; c < 3; c++) {
      var far = 0;
      for (var k = 0; k < state.nodes.length; k++) {
        if (dist2(nodePos(k).x, nodePos(k).y, nodePos(0).x, nodePos(0).y) > dist2(nodePos(far).x, nodePos(far).y, nodePos(0).x, nodePos(0).y)) far = k;
      }
      state.censors.push({ a: far, b: far, t: 0, spd: 95, phase: "idle", holdT: rand(0.5, 1.5) });
    }
    // bot rivali
    state.bots = [
      { name: "Pirate-7", color: "#ff5b8a", a: 0, b: 0, t: 0, score: 0, holdT: 0, target: null },
      { name: "ANALOG", color: "#5bb8ff", a: 0, b: 0, t: 0, score: 0, holdT: 0, target: null },
    ];
    state.bots.forEach(function (b) {
      var n = Math.floor(rand(10, state.nodes.length));
      b.a = n; b.b = n; b.t = 0;
    });
  }
  function spawnPacket() {
    var e = state.edges[Math.floor(Math.random() * state.edges.length)];
    state.packets.push({ a: e.a, b: e.b, t: Math.random(), spd: rand(70, 140), rev: Math.random() < 0.5 });
  }

  /* ===== Movimento sul grafo ===== */
  function posOn(a, b, t) {
    var p = nodePos(a), q = nodePos(b);
    return { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) };
  }
  function advance(m, speed, dt, choose) {
    if (m.a === m.b) { choose(m); return; }
    var L = edgeLen(m.a, m.b);
    m.t += (speed * dt) / L;
    if (m.t >= 1) { m.a = m.b; m.t = 0; choose(m); }
  }
  function playerChoose() {
    var nbrs = state.adj[player.a];
    if (!nbrs.length) { player.b = player.a; return; }
    var best = null, bestDot = -2;
    nbrs.forEach(function (n) {
      var p = nodePos(player.a), q = nodePos(n);
      var dx = q.x - p.x, dy = q.y - p.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var dot = (dx / d) * want.x + (dy / d) * want.y;
      if (dot > bestDot) { bestDot = dot; best = n; }
    });
    if (best !== null && bestDot > -0.55) player.b = best;
    else player.b = player.a;
  }
  function botChoose(b) {
    var nbrs = state.adj[b.a];
    if (!nbrs.length) { b.b = b.a; return; }
    var best = null, bestScore = -1e9;
    nbrs.forEach(function (n) {
      var p = nodePos(n);
      var score = -Math.random() * 40;
      state.tvs.forEach(function (tv) {
        if (!tv.seized && dist2(p.x, p.y, tv.x, tv.y) < 500 * 500) score += 140 - Math.sqrt(dist2(p.x, p.y, tv.x, tv.y)) * 0.2;
      });
      state.packets.forEach(function (pk) {
        var pp = posOn(pk.a, pk.b, pk.t);
        if (dist2(p.x, p.y, pp.x, pp.y) < 160 * 160) score += 60;
      });
      if (score > bestScore) { bestScore = score; best = n; }
    });
    b.b = best !== null ? best : nbrs[0];
  }
  function censorChoose(c) {
    var nbrs = state.adj[c.a];
    if (!nbrs.length) { c.b = c.a; return; }
    var pp = posOn(player.a, player.b, player.t);
    var best = nbrs[0], bestD = 1e18;
    nbrs.forEach(function (n) {
      var p = nodePos(n);
      var d = dist2(p.x, p.y, pp.x, pp.y) + Math.random() * 3000;
      if (d < bestD) { bestD = d; best = n; }
    });
    c.b = best;
  }

  /* ===== Update ===== */
  function update(dt) {
    state.time += dt;
    // want dal pointer / tastiera
    if (pointer.has) {
      var pp = posOn(player.a, player.b, player.t);
      var dx = pointer.x - pp.x, dy = pointer.y - pp.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      want.x = dx / d; want.y = dy / d;
    } else {
      want.x = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      want.y = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
      var m = Math.sqrt(want.x * want.x + want.y * want.y);
      if (m > 0) { want.x /= m; want.y /= m; }
    }
    if (!state.over) {
      advance(player, SPEED, dt, playerChoose);
      var ppos = posOn(player.a, player.b, player.t);
      player.trail.push({ x: ppos.x, y: ppos.y });
      if (player.trail.length > 16) player.trail.shift();
      player.invuln = Math.max(0, (player.invuln || 0) - dt);
      state.invuln = player.invuln;

      // pacchetti
      state.packets.forEach(function (pk, i) {
        var L = edgeLen(pk.a, pk.b);
        pk.t += (pk.spd * dt) / L * (pk.rev ? -1 : 1);
        if (pk.t >= 1) { pk.t = 0; var tmp = pk.a; pk.a = pk.b; pk.b = tmp; }
        if (pk.t < 0) { pk.t = 1; var tmp2 = pk.a; pk.a = pk.b; pk.b = tmp2; }
        var pp = posOn(pk.a, pk.b, pk.t);
        if (dist2(ppos.x, ppos.y, pp.x, pp.y) < 18 * 18) {
          state.score += 10;
          Sound.packet();
          Particles.spawn(pp.x, pp.y, "#7cff6b", 4);
          state.packets.splice(i, 1);
          spawnPacket();
        }
      });
      // TV
      state.tvs.forEach(function (tv) {
        if (tv.seized) return;
        var near = dist2(ppos.x, ppos.y, tv.x, tv.y) < 30 * 30;
        if (near) {
          tv.prog += dt / 1.2;
          tv.progBy = "me";
          if (tv.prog >= 1) {
            tv.seized = true;
            state.tvsSeized++;
            state.score += 100;
            state.strength = Math.min(STRENGTH_MAX, state.strength + 1);
            Sound.tv();
            R2.buzz([12, 25, 12]);
            Particles.spawn(tv.x, tv.y, "#7cff6b", 16);
            toast("📺 TV-CH" + tv.ch + " CONQUISTATA! +100 · segnale +1");
            notify("TV-CH" + tv.ch + " conquistata! +" + 100 + " punti");
            broadcast();
          }
        } else if (tv.prog > 0 && tv.progBy === "me") {
          tv.prog = Math.max(0, tv.prog - dt * 0.8);
        }
      });
      // censure
      state.censors.forEach(function (c) {
        c.spd = Math.min(210, 95 + state.time * 1.8);
        if (c.phase === "idle") {
          c.holdT -= dt;
          if (c.holdT <= 0) { c.phase = "hunt"; Sound.glitch(); }
        } else {
          advance(c, c.spd, dt, censorChoose);
          var cp = posOn(c.a, c.b, c.t);
          if (player.invuln <= 0 && dist2(cp.x, cp.y, ppos.x, ppos.y) < 20 * 20) {
            state.strength--;
            player.invuln = 2;
            state.glitch = 0.4;
            state.burst = 0.3;
            Sound.hit();
            R2.buzz([40, 30, 60]);
            toast("⛔ BANDA DI CENSURA! Segnale " + state.strength + "/3");
            notify("Censura! Segnale " + state.strength + "/3");
            broadcast();
            // knockback: teletrasporta la censura lontano
            var far = 0, fd = 0;
            state.nodes.forEach(function (n, idx) {
              var d = dist2(n.x, n.y, ppos.x, ppos.y);
              if (d > fd) { fd = d; far = idx; }
            });
            c.a = far; c.b = far; c.t = 0; c.phase = "idle"; c.holdT = rand(1, 2);
            if (state.strength <= 0) endGame();
          }
        }
      });
      // bot
      state.bots.forEach(function (b) {
        advance(b, 135, dt, botChoose);
        var bp = posOn(b.a, b.b, b.t);
        state.packets.forEach(function (pk, i) {
          var pp = posOn(pk.a, pk.b, pk.t);
          if (dist2(bp.x, bp.y, pp.x, pp.y) < 16 * 16) {
            b.score += 10;
            state.packets.splice(i, 1);
            spawnPacket();
          }
        });
        state.tvs.forEach(function (tv) {
          if (tv.seized) return;
          if (dist2(bp.x, bp.y, tv.x, tv.y) < 30 * 30) {
            if (tv.progBy !== "me") {
              tv.prog += dt / 1.6;
              tv.progBy = b.name;
              if (tv.prog >= 1) {
                tv.seized = true;
                b.score += 100;
                toast("⚠️ " + b.name + " ha conquistato una TV!");
              }
            }
          } else if (tv.prog > 0 && tv.progBy === b.name) {
            tv.prog = Math.max(0, tv.prog - dt * 0.8);
          }
        });
      });
    }
    Particles.update(dt);
    state.glitch = Math.max(0, state.glitch - dt);
    state.burst = Math.max(0, state.burst - dt);
    state.wobbleT -= dt;
    if (state.wobbleT <= 0) { state.wobble = 0.45; state.wobbleT = rand(3.5, 7); }
    state.wobble = Math.max(0, state.wobble - dt);
    // camera
    var pp2 = posOn(player.a, player.b, player.t);
    cam.x = lerp(cam.x, pp2.x, 1 - Math.pow(0.0005, dt));
    cam.y = lerp(cam.y, pp2.y, 1 - Math.pow(0.0005, dt));
    cam.z = clamp(Math.min(view.w, view.h) / 560, 0.75, 1.3);
    cam.x = clamp(cam.x, 0, W); cam.y = clamp(cam.y, 0, H);
  }

  function broadcast() {
    if (!bc) return;
    try { bc.postMessage({ type: "score", name: "questo segnale", score: state.score }); } catch (e) {}
  }

  function endGame() {
    if (state.over) return;
    state.over = true;
    Sound.over();
    R2.buzz([80, 50, 100]);
    var best = Number(localStorage.getItem("static-best") || 0);
    if (state.score > best) { localStorage.setItem("static-best", String(state.score)); best = state.score; }
    R2.saveJSON("static-pwa", { highScore: best });
    notify("Segnale interrotto. Punteggio: " + state.score);
    broadcast();
    var mins = Math.floor(state.time / 60), secs = Math.floor(state.time % 60);
    showModal("SEGNALE INTERROTTO",
      "La censura ha avuto la meglio.<br><br>Punteggio: <b>" + state.score + "</b> (record: " + best + ")<br>TV conquistate: <b>" + state.tvsSeized + "</b><br>In onda per: " + mins + "m " + secs + "s",
      [{ t: "📡 Nuova trasmissione", f: function () { location.reload(); }, primary: true }]);
  }

  /* ===== Render ===== */
  function makePatterns() {
    var s = document.createElement("canvas");
    s.width = 4; s.height = 3;
    var c = s.getContext("2d");
    c.fillStyle = "rgba(0,0,0,0.24)";
    c.fillRect(0, 2, 4, 1);
    scanPat = ctx.createPattern(s, "repeat");
    for (var n = 0; n < 3; n++) {
      var nc = document.createElement("canvas");
      nc.width = 140; nc.height = 140;
      var ncx = nc.getContext("2d");
      var img = ncx.createImageData(140, 140);
      for (var px = 0; px < img.data.length; px += 4) {
        var v = Math.random() * 255 | 0;
        img.data[px] = v; img.data[px + 1] = v; img.data[px + 2] = v;
        img.data[px + 3] = 255;
      }
      ncx.putImageData(img, 0, 0);
      noiseTiles.push(nc);
    }
  }

  function renderWorld(c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#04060b";
    c.fillRect(0, 0, W, H);
    c.setTransform(cam.z, 0, 0, cam.z, view.w / 2 - cam.x * cam.z, view.h / 2 - cam.y * cam.z);
    // cavi
    c.strokeStyle = "#141c2c";
    c.lineWidth = 7;
    state.edges.forEach(function (e) {
      var p = nodePos(e.a), q = nodePos(e.b);
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(q.x, q.y);
      c.stroke();
    });
    c.strokeStyle = "rgba(60,90,140,0.18)";
    c.lineWidth = 1.4;
    state.edges.forEach(function (e) {
      var p = nodePos(e.a), q = nodePos(e.b);
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(q.x, q.y);
      c.stroke();
    });
    // nodi
    state.nodes.forEach(function (n) {
      c.fillStyle = "#1b2537";
      c.fillRect(n.x - 5, n.y - 5, 10, 10);
      c.strokeStyle = "rgba(124,255,107,0.14)";
      c.strokeRect(n.x - 5, n.y - 5, 10, 10);
    });
    // pacchetti
    state.packets.forEach(function (pk) {
      var p = posOn(pk.a, pk.b, pk.t);
      c.fillStyle = "rgba(124,255,107,0.18)";
      c.fillRect(p.x - 7, p.y - 7, 14, 14);
      c.fillStyle = "#7cff6b";
      c.fillRect(p.x - 4, p.y - 4, 8, 8);
      c.fillStyle = "#05070d";
      c.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2);
    });
    // TV
    state.tvs.forEach(function (tv) {
      c.fillStyle = tv.seized ? "#0c2418" : "#0b1120";
      c.strokeStyle = tv.seized ? "rgba(124,255,107,0.8)" : "#2a3a55";
      c.lineWidth = 2.4;
      roundRectC(c, tv.x - 22, tv.y - 18, 44, 36, 5);
      c.fill(); c.stroke();
      // schermo
      if (tv.seized) {
        c.save();
        c.beginPath();
        c.rect(tv.x - 17, tv.y - 13, 34, 26);
        c.clip();
        for (var sy = 0; sy < 5; sy++) {
          c.fillStyle = "rgba(" + (120 + Math.random() * 60 | 0) + "," + (200 + Math.random() * 55 | 0) + ",140,0.5)";
          c.fillRect(tv.x - 17, tv.y - 13 + sy * 5.4, 34, 2.6);
        }
        c.restore();
        c.fillStyle = "#7cff6b";
        c.font = "bold 8px monospace";
        c.textAlign = "center";
        c.fillText("CH" + tv.ch, tv.x, tv.y + 1.5);
      } else {
        c.fillStyle = "#0e1626";
        c.fillRect(tv.x - 17, tv.y - 13, 34, 26);
        c.fillStyle = "rgba(124,255,107," + (0.25 + (tv.prog > 0 ? tv.prog * 0.55 : 0)).toFixed(2) + ")";
        if (tv.prog > 0) c.fillRect(tv.x - 17, tv.y + 10, 34 * clamp(tv.prog, 0, 1), 2.6);
        c.fillStyle = "rgba(124,255,107,0.4)";
        c.font = "7px monospace";
        c.textAlign = "center";
        c.fillText("CH" + tv.ch, tv.x, tv.y - 16);
      }
    });
    // censure
    state.censors.forEach(function (cs) {
      var p = posOn(cs.a, cs.b, cs.t);
      c.fillStyle = "#000";
      c.fillRect(p.x - 40, p.y - 8, 80, 16);
      c.strokeStyle = "#ff3b3b";
      c.lineWidth = 2;
      c.strokeRect(p.x - 40, p.y - 8, 80, 16);
      c.fillStyle = "#ff3b3b";
      c.font = "bold 9px monospace";
      c.textAlign = "center";
      c.fillText("▮▮ CENSURA ▮▮", p.x, p.y + 3.5);
    });
    // bot
    state.bots.forEach(function (b) {
      var p = posOn(b.a, b.b, b.t);
      c.fillStyle = b.color;
      c.shadowColor = b.color;
      c.shadowBlur = 10;
      c.beginPath();
      c.arc(p.x, p.y, 8, 0, 6.2832);
      c.fill();
      c.shadowBlur = 0;
      c.fillStyle = "rgba(213,228,218,0.6)";
      c.font = "9px monospace";
      c.textAlign = "center";
      c.fillText(b.name, p.x, p.y - 13);
    });
    // giocatore
    var pp = posOn(player.a, player.b, player.t);
    for (var i = 1; i < player.trail.length; i++) {
      c.strokeStyle = "rgba(124,255,107," + (0.35 * i / player.trail.length).toFixed(3) + ")";
      c.lineWidth = 3 + 3 * (i / player.trail.length);
      c.beginPath();
      c.moveTo(player.trail[i - 1].x, player.trail[i - 1].y);
      c.lineTo(player.trail[i].x, player.trail[i].y);
      c.stroke();
    }
    var blink = player.invuln > 0 && Math.floor(state.time * 10) % 2 === 0;
    c.globalAlpha = blink ? 0.3 : 1;
    c.fillStyle = "#c8ffc0";
    c.shadowColor = "#7cff6b";
    c.shadowBlur = 16;
    c.beginPath();
    c.arc(pp.x, pp.y, 9, 0, 6.2832);
    c.fill();
    c.shadowBlur = 0;
    c.globalAlpha = 1;
    Particles.draw(c);
    c.restore();
  }
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
    // mondo su offscreen
    fxc.setTransform(1, 0, 0, 1, 0, 0);
    fxc.clearRect(0, 0, fx.width, fx.height);
    renderWorld(fxc);

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = "#020409";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    if (state.wobble > 0) {
      // VHS wobble: strisce orizzontali con offset sinusoidale
      var slices = 9, sh = view.h / slices;
      for (var s = 0; s < slices; s++) {
        var off = Math.sin(state.time * 42 + s * 1.7) * state.wobble * 12;
        ctx.drawImage(fx, 0, s * (fx.height / slices), fx.width, fx.height / slices,
          off, s * sh, view.w, sh + 1);
      }
    } else {
      ctx.drawImage(fx, 0, 0, view.w, view.h);
    }
    // ghosting cromatico
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.16;
    ctx.drawImage(fx, 2.2, 0, view.w, view.h);
    ctx.drawImage(fx, -2.2, 1, view.w, view.h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    // scanline
    ctx.fillStyle = scanPat;
    ctx.fillRect(0, 0, view.w, view.h);
    // rumore
    var tile = noiseTiles[Math.floor(state.time * 12) % noiseTiles.length];
    ctx.globalAlpha = 0.05 + state.burst * 1.6;
    for (var nx = 0; nx < view.w; nx += 140) {
      for (var ny = 0; ny < view.h; ny += 140) ctx.drawImage(tile, nx, ny);
    }
    ctx.globalAlpha = 1;
    // banda tracking VHS
    var band = ((state.time * 130) % (view.h + 160)) - 80;
    var bg = ctx.createLinearGradient(0, band - 30, 0, band + 30);
    bg.addColorStop(0, "rgba(255,255,255,0)");
    bg.addColorStop(0.5, "rgba(255,255,255,0.055)");
    bg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, band - 30, view.w, 60);
    // vignetta
    var vg = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.3, view.w / 2, view.h / 2, view.h * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  /* ===== HUD ===== */
  function updateHUD() {
    document.getElementById("score").textContent = state.score;
    var s = "";
    for (var i = 0; i < STRENGTH_MAX; i++) s += i < state.strength ? "▮" : "▯";
    document.getElementById("strength").textContent = s;
    document.getElementById("tvs").textContent = state.tvsSeized;
    var lb = document.getElementById("leaderboard");
    var rows = [{ name: "tu", score: state.score, cls: "me" }];
    state.bots.forEach(function (b) { rows.push({ name: b.name, score: b.score, cls: "" }); });
    var now = Date.now();
    for (var k in remoteScores) {
      if (now - remoteScores[k].t < 10000) rows.push({ name: "📡 " + k, score: remoteScores[k].score, cls: "remote" });
      else delete remoteScores[k];
    }
    rows.sort(function (a, b) { return b.score - a.score; });
    var html = "";
    rows.forEach(function (r) { html += "<li class=\"" + r.cls + "\">" + r.name + " <b>" + r.score + "</b></li>"; });
    if (lb._h !== html) { lb._h = html; lb.innerHTML = html; }
  }

  /* ===== Broadcast & notifiche ===== */
  function enableBroadcast() {
    onair = true;
    document.getElementById("onair").classList.remove("hidden");
    try { bc = new BroadcastChannel("static-io"); } catch (e) { bc = null; }
    if (bc) {
      bc.onmessage = function (e) {
        if (e.data && e.data.type === "score") {
          remoteScores[e.data.name || "segnale"] = { score: e.data.score, t: Date.now() };
        }
      };
    }
    setInterval(function () {
      if (!state.over) broadcast();
    }, 2000);
    toast("🔴 ON AIR — trasmissione locale attiva");
  }
  function setupBroadcast() {
    document.getElementById("air-btn").addEventListener("click", function () {
      if (onair) { toast("Sei già in onda!"); return; }
      if (!("Notification" in window)) { enableBroadcast(); return; }
      Notification.requestPermission().then(function (perm) {
        if (perm === "granted") {
          enableBroadcast();
          try { new Notification("📡 STATIC — ON AIR", { body: "Trasmissione locale attiva. Le altre schede ti vedono in classifica." }); } catch (e) {}
        } else {
          enableBroadcast(); // canale tra schede anche senza notifiche
        }
      }).catch(function () { enableBroadcast(); });
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
    showModal("STATIC",
      "<b>Sei un segnale TV pirata nella rete di cavi morti.</b><br><br>" +
      "• Muovi il dito/il mouse: scegli <b>il cavo</b> agli incroci<br>" +
      "• Mangia i <b>pacchetti dati</b> che scorrono nei cavi<br>" +
      "• Resta su un televisore per <b>conquistarlo</b>: +100 e segnale +1<br>" +
      "• Le <b>bande di censura</b> ti danno la caccia: 3 colpi e sei fuori<br><br>" +
      "Estetica CRT/VHS inclusa: scanline, ghosting, wobble, neve.<br><br>" +
      "<b>📡 Trasmissione locale (opt-in):</b> notifiche durante il gioco e classifica condivisa con le altre schede aperte dello stesso browser. Sulla stessa WiFi servirebbe un server di relay: qui tutto resta sul dispositivo.",
      [
        { t: "📡 Attiva ON AIR", f: function () { setupBroadcast(); hideModal(); } },
        { t: "▶ Trasmetti in anonimo", f: function () { hideModal(); }, primary: true },
      ]);
  }

  /* ===== Loop ===== */
  var lastT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0.016;
    lastT = t;
    update(dt);
    render();
    updateHUD();
    requestAnimationFrame(loop);
  }

  function resize() {
    var stage = document.getElementById("stage");
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    fx.width = Math.round(view.w);
    fx.height = Math.round(view.h);
  }

  function init() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    fx = document.createElement("canvas");
    fxc = fx.getContext("2d");
    initSound();
    resize();
    window.addEventListener("resize", resize);
    buildGraph();
    buildEntities();
    makePatterns();
    cam.x = nodePos(0).x; cam.y = nodePos(0).y;
    setupInput();
    showStart();
    R2.trackPlaytime("static-pwa/");
    R2.installHint();
    R2.markPlayed("static-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  /* ===== Input ===== */
  function setupInput() {
    var stage = document.getElementById("stage");
    stage.addEventListener("pointerdown", function (e) {
      var w = toWorld(e);
      pointer.has = true; pointer.x = w.x; pointer.y = w.y;
      if (e.pointerType === "mouse") input.dash = true;
    });
    stage.addEventListener("pointermove", function (e) {
      var w = toWorld(e);
      pointer.has = true; pointer.x = w.x; pointer.y = w.y;
    });
    stage.addEventListener("pointerup", function (e) {
      if (e.pointerType === "mouse") input.dash = false;
    });
    document.addEventListener("keydown", function (e) { keys[e.code] = true; });
    document.addEventListener("keyup", function (e) { keys[e.code] = false; });
    var sbtn = document.getElementById("sound-btn");
    sbtn.textContent = R2.getSettings().sound ? "🔊" : "🔇";
    sbtn.addEventListener("click", function () {
      var st = R2.setSettings({ sound: !R2.getSettings().sound });
      sbtn.textContent = st.sound ? "🔊" : "🔇";
    });
  }
  var input = { dash: false };
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: cam.x + (e.clientX - r.left - view.w / 2) / cam.z,
      y: cam.y + (e.clientY - r.top - view.h / 2) / cam.z,
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
