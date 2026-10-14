/*
 * MYCEL — rete fungina .io · a branching hyphal network in dark soil
 * Più punte, un dito per tendine. Il corpo è persistente: crescere costa
 * biomassa, i parassiti mangiano la rete, le zone tossiche la erodono.
 * Canvas 2D + shared/arcade.js. Zero asset, tutto procedurale.
 */
(function () {
  "use strict";

  /* ===== Config ===== */
  var W = 2400, H = 2400;
  var SPACING = 7;
  var SPEED = 95;
  var TURN = 3.4;
  var GROW_COST = 0.4;        // biomassa per punto cresciuto
  var SPORE_FOOD = 14;
  var BRANCH_COST = 45;
  var MAX_TIPS = 4;
  var START_B = 120;
  var TOXIC_DRAIN = 16;       // biomassa/s dentro le zone tossiche
  var TOXIC_ERODE = 13;       // px/s erosi dalla punta
  var SPORES = 80;
  var PARASITES = 4;

  var state = {
    nets: [], spores: [], rocks: [], toxics: [], parasites: [],
    time: 0, over: false, shake: 0,
  };
  var cam = { x: W / 2, y: H / 2, z: 0.7 };
  var view = { w: 0, h: 0, dpr: 1 };
  var touches = [];           // {id, x, y, tip}
  var mouse = { has: false, x: 0, y: 0 };
  var canvas, ctx, soilPat = null;
  var Sound, Particles;
  var me = null;
  var toastT = null;

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
  function pathLen(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.sqrt(dist2(p[i].x, p[i].y, p[i - 1].x, p[i - 1].y)); return L; }

  /* ===== Sound ===== */
  function initSound() {
    Sound = R2.makeSound({
      eat:    [520, 0.08, "sine"],
      branch: [300, 0.22, "triangle"],
      hurt:   [140, 0.25, "sawtooth"],
      sever:  [100, 0.35, "sawtooth"],
      die:    [80, 0.6, "sine"],
      grow:   [660, 0.05, "sine"],
    });
    Particles = R2.makeParticles();
  }

  /* ===== Networks ===== */
  function makeNet(name, bot, color) {
    var s = { x: W / 2 + rand(-160, 160), y: H / 2 + rand(-160, 160) };
    return {
      name: name, bot: bot, color: color,
      B: START_B,
      tips: [{ path: [{ x: s.x, y: s.y }], dir: rand(0, 6.28), alive: true, claim: null, attach: -1, parent: -1 }],
      root: { x: s.x, y: s.y },
      spores: 0, alive: true, respawnT: 0,
    };
  }
  function netLen(n) {
    var L = 0;
    n.tips.forEach(function (t) { if (t.alive) L += pathLen(t.path); });
    return Math.floor(L);
  }
  function tipCount(n) {
    var c = 0;
    n.tips.forEach(function (t) { if (t.alive) c++; });
    return c;
  }

  function branch(n, tipIdx, atPoint) {
    if (n.B < BRANCH_COST || tipCount(n) >= MAX_TIPS) return false;
    var src = n.tips[tipIdx];
    if (!src.alive || src.path.length < 8) return false;
    var idx = atPoint != null ? atPoint : Math.floor(src.path.length / 2);
    idx = clamp(idx, 1, src.path.length - 2);
    var pt = src.path[idx];
    n.B -= BRANCH_COST;
    n.tips.push({
      path: [{ x: pt.x, y: pt.y }],
      dir: rand(0, 6.28), alive: true, claim: null,
      attach: idx, parent: tipIdx,
    });
    Particles.spawn(pt.x, pt.y, n.color, 10);
    return true;
  }

  function killTip(n, ti, silent) {
    var t = n.tips[ti];
    if (!t.alive) return;
    t.alive = false;
    t.path.forEach(function (pt) { Particles.spawn(pt.x, pt.y, n.color, 1); });
    if (!silent) Sound.sever();
    // tutti i rami nati da questo tendine muoiono (la rete si sfilaccia)
    n.tips.forEach(function (b, bi) {
      if (b.alive && b.parent === ti) killTip(n, bi, true);
    });
  }

  /* ===== World ===== */
  function inRock(x, y, pad) {
    for (var i = 0; i < state.rocks.length; i++) {
      var r = state.rocks[i];
      if (dist2(x, y, r.x, r.y) < (r.r + pad) * (r.r + pad)) return true;
    }
    return false;
  }
  function inToxic(x, y) {
    for (var i = 0; i < state.toxics.length; i++) {
      var t = state.toxics[i];
      if (dist2(x, y, t.x, t.y) < t.r * t.r) return true;
    }
    return false;
  }
  function spawnSpore() {
    for (var tries = 0; tries < 20; tries++) {
      var x = rand(80, W - 80), y = rand(80, H - 80);
      if (!inRock(x, y, 40) && !inToxic(x, y)) {
        state.spores.push({ x: x, y: y, ph: rand(0, 6.28), dead: 0 });
        return;
      }
    }
  }
  function buildWorld() {
    state.rocks = [];
    state.toxics = [];
    state.spores = [];
    for (var r = 0; r < 12; r++) {
      var verts = [];
      for (var k = 0; k < 7; k++) verts.push(rand(0.72, 1.12));
      state.rocks.push({ x: rand(140, W - 140), y: rand(140, H - 140), r: rand(30, 58), rot: rand(0, 6.28), verts: verts });
    }
    for (var t = 0; t < 6; t++) {
      state.toxics.push({ x: rand(200, W - 200), y: rand(200, H - 200), r: rand(110, 155), ph: rand(0, 6.28) });
    }
    for (var s = 0; s < SPORES; s++) spawnSpore();
    state.parasites = [];
    for (var p = 0; p < PARASITES; p++) respawnParasite();
  }
  function respawnParasite() {
    var ang = rand(0, 6.28);
    state.parasites.push({
      x: W / 2 + Math.cos(ang) * rand(600, 1100),
      y: H / 2 + Math.sin(ang) * rand(600, 1100),
      eaten: 0, seg: [], alive: true,
    });
  }

  /* ===== Parasites: mangiano la rete verso la punta ===== */
  function updateParasites(dt) {
    state.parasites.forEach(function (w) {
      var best = null, bestD = 1e18;
      state.nets.forEach(function (n) {
        if (!n.alive) return;
        n.tips.forEach(function (t, ti) {
          if (!t.alive || !t.path.length) return;
          var tip = t.path[t.path.length - 1];
          var d = dist2(w.x, w.y, tip.x, tip.y);
          if (d < bestD) { bestD = d; best = { n: n, ti: ti, t: t }; }
        });
      });
      if (!best) return;
      var tip = best.t.path[best.t.path.length - 1];
      var dx = tip.x - w.x, dy = tip.y - w.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 8) {
        var sp = 62 * dt;
        w.x += (dx / d) * Math.min(sp, d);
        w.y += (dy / d) * Math.min(sp, d);
      }
      w.seg.push({ x: w.x, y: w.y });
      if (w.seg.length > 14) w.seg.shift();
      var path = best.t.path;
      var eaten = 0;
      while (path.length > 1 && dist2(w.x, w.y, path[path.length - 1].x, path[path.length - 1].y) < 26 * 26) {
        var e = path.pop();
        eaten++;
        best.n.B = Math.max(0, best.n.B - 0.2);
        if (eaten % 6 === 0) Particles.spawn(e.x, e.y, "#ff6e9c", 2);
      }
      if (eaten) {
        w.eaten += eaten;
        if (path.length <= 1) {
          killTip(best.n, best.ti);
          if (!best.n.bot) { toast("🪱 Un parassita ha divorato un tendine!"); Sound.sever(); }
        }
      }
      if (w.eaten > 140) w.alive = false;
    });
    for (var i = state.parasites.length - 1; i >= 0; i--) {
      if (!state.parasites[i].alive) { state.parasites.splice(i, 1); respawnParasite(); }
    }
  }

  /* ===== Tips update ===== */
  function updateTip(n, ti, dt) {
    var t = n.tips[ti];
    if (!t.alive || !t.path.length) return;
    var head = t.path[t.path.length - 1];
    var target = null;
    if (n.bot) {
      if (!t.target || state.time > (t.reT || 0)) {
        t.reT = state.time + rand(2.5, 5);
        var bs = null, bd = 1e18;
        for (var s = 0; s < state.spores.length; s++) {
          var sp = state.spores[s];
          if (sp.dead) continue;
          var d = dist2(head.x, head.y, sp.x, sp.y);
          if (d < bd) { bd = d; bs = sp; }
        }
        t.target = bs ? { x: bs.x, y: bs.y } : { x: rand(120, W - 120), y: rand(120, H - 120) };
      }
      target = t.target;
    } else if (t.claim !== null) {
      var tc = touches[t.claim];
      if (tc) target = { x: tc.x, y: tc.y };
    } else if (mouse.has) {
      target = { x: mouse.x, y: mouse.y };
    }
    if (target) {
      var want = Math.atan2(target.y - head.y, target.x - head.x);
      var d2 = want - t.dir;
      while (d2 > Math.PI) d2 -= 6.2832;
      while (d2 < -Math.PI) d2 += 6.2832;
      t.dir += clamp(d2, -TURN * dt, TURN * dt);
    }
    // evita rocce: sonda avanti
    var px = head.x + Math.cos(t.dir) * 30, py = head.y + Math.sin(t.dir) * 30;
    if (inRock(px, py, 8)) {
      for (var a = 0.5; a <= 2.4; a += 0.4) {
        var done = false;
        for (var sgn = -1; sgn <= 1 && !done; sgn += 2) {
          var ang = t.dir + a * sgn;
          var qx = head.x + Math.cos(ang) * 30, qy = head.y + Math.sin(ang) * 30;
          if (!inRock(qx, qy, 8)) { t.dir = ang; done = true; }
        }
        if (done) break;
      }
    }
    // cresci (costa biomassa)
    if (n.B >= GROW_COST) {
      var nx = head.x + Math.cos(t.dir) * SPEED * dt;
      var ny = head.y + Math.sin(t.dir) * SPEED * dt;
      if (dist2(nx, ny, head.x, head.y) >= SPACING * SPACING) {
        if (!inRock(nx, ny, 0)) {
          t.path.push({ x: clamp(nx, 24, W - 24), y: clamp(ny, 24, H - 24) });
          n.B -= GROW_COST;
          if (!n.bot && Math.random() < 0.04) Sound.grow();
        }
      }
    }
    // zone tossiche: erodono la punta
    if (inToxic(head.x, head.y)) {
      n.B = Math.max(0, n.B - TOXIC_DRAIN * dt);
      var cut = TOXIC_ERODE * dt;
      while (cut > 0 && t.path.length > 1) {
        var lastPt = t.path[t.path.length - 1];
        var prev = t.path[t.path.length - 2];
        var dd = Math.sqrt(dist2(lastPt.x, lastPt.y, prev.x, prev.y));
        if (dd <= cut) { t.path.pop(); cut -= dd; }
        else {
          var f = (dd - cut) / dd;
          t.path[t.path.length - 1] = { x: lerp(prev.x, lastPt.x, f), y: lerp(prev.y, lastPt.y, f) };
          cut = 0;
        }
      }
      if (!n.bot && Math.random() < 0.1) Particles.spawn(head.x, head.y, "#c07dff", 2);
      if (t.path.length <= 1) { killTip(n, ti); return; }
    }
    // spore
    for (var sp2 = state.spores.length - 1; sp2 >= 0; sp2--) {
      var spo = state.spores[sp2];
      if (spo.dead) continue;
      var nh = t.path[t.path.length - 1];
      if (dist2(nh.x, nh.y, spo.x, spo.y) < 15 * 15) {
        spo.dead = state.time + 6;
        n.B += SPORE_FOOD;
        n.spores++;
        Particles.spawn(spo.x, spo.y, "#8ff7e0", 6);
        if (!n.bot) { Sound.eat(); R2.buzz(5); }
      }
    }
  }

  function updateNets(dt) {
    state.nets.forEach(function (n) {
      if (!n.alive) { n.respawnT -= dt; return; }
      for (var ti = n.tips.length - 1; ti >= 0; ti--) updateTip(n, ti, dt);
      if (tipCount(n) === 0) {
        if (!n.bot) {
          if (n.B >= BRANCH_COST) {
            n.B -= BRANCH_COST;
            n.tips.push({ path: [{ x: n.root.x, y: n.root.y }], dir: rand(0, 6.28), alive: true, claim: null, attach: -1, parent: -1 });
            toast("🌱 Il micelio rigermoglia dalla radice…");
          } else if (!state.over) {
            gameOver(n);
          }
        } else { n.respawnT = 3; n.alive = false; }
      }
    });
    state.nets.forEach(function (n) {
      if (!n.alive && n.bot && n.respawnT <= 0) {
        var fresh = makeNet(n.name, true, n.color);
        n.B = fresh.B; n.tips = fresh.tips; n.root = fresh.root; n.alive = true;
      }
    });
    // tocchi su punte morte
    for (var i = touches.length - 1; i >= 0; i--) {
      var tc = touches[i];
      var t = me.tips[tc.tip];
      if (!t || !t.alive) touches.splice(i, 1);
    }
    // rami orfani dopo l'erosione
    state.nets.forEach(function (n) {
      n.tips.forEach(function (b, bi) {
        if (!b.alive || b.parent < 0) return;
        var par = n.tips[b.parent];
        if (!par || !par.alive || par.path.length <= b.attach) killTip(n, bi, true);
      });
    });
  }

  /* ===== Camera ===== */
  function updateCamera(dt) {
    var alive = [];
    me.tips.forEach(function (t) { if (t.alive && t.path.length) alive.push(t.path[t.path.length - 1]); });
    if (!alive.length) alive.push(me.root);
    var cx = 0, cy = 0;
    alive.forEach(function (p) { cx += p.x; cy += p.y; });
    cx /= alive.length; cy /= alive.length;
    var spread = 0;
    alive.forEach(function (p) { spread = Math.max(spread, Math.sqrt(dist2(p.x, p.y, cx, cy))); });
    cam.x = lerp(cam.x, cx, 1 - Math.pow(0.002, dt));
    cam.y = lerp(cam.y, cy, 1 - Math.pow(0.002, dt));
    cam.z = lerp(cam.z, clamp(760 / (spread + 420), 0.34, 0.9), 1 - Math.pow(0.01, dt));
  }

  /* ===== Render ===== */
  function makeSoil() {
    var g = document.createElement("canvas");
    g.width = 256; g.height = 256;
    var c = g.getContext("2d");
    for (var i = 0; i < 420; i++) {
      c.fillStyle = "rgba(" + (30 + Math.random() * 30 | 0) + "," + (24 + Math.random() * 22 | 0) + "," + (18 + Math.random() * 14 | 0) + "," + rand(0.12, 0.3).toFixed(2) + ")";
      c.beginPath();
      c.arc(rand(0, 256), rand(0, 256), rand(0.5, 2.4), 0, 6.2832);
      c.fill();
    }
    for (var f = 0; f < 26; f++) {
      c.strokeStyle = "rgba(90,70,50,0.08)";
      c.lineWidth = rand(0.6, 1.4);
      c.beginPath();
      var x = rand(0, 256), y = rand(0, 256);
      c.moveTo(x, y);
      c.quadraticCurveTo(x + rand(-30, 30), y + rand(-30, 30), x + rand(-50, 50), y + rand(-50, 50));
      c.stroke();
    }
    soilPat = ctx.createPattern(g, "repeat");
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = "#0d0a08";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(view.w / 2, view.h / 2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
    if (state.shake > 0) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
      state.shake = Math.max(0, state.shake - 0.3);
    }
    ctx.fillStyle = soilPat || "#14100c";
    ctx.fillRect(cam.x - view.w / 2 / cam.z - 2, cam.y - view.h / 2 / cam.z - 2, view.w / cam.z + 4, view.h / cam.z + 4);

    state.toxics.forEach(function (t) {
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 1.6 + t.ph);
      var g = ctx.createRadialGradient(t.x, t.y, t.r * 0.2, t.x, t.y, t.r);
      g.addColorStop(0, "rgba(160,80,255," + (0.16 + pulse * 0.08).toFixed(3) + ")");
      g.addColorStop(1, "rgba(160,80,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = "rgba(190,120,255," + (0.14 + pulse * 0.1).toFixed(3) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * 0.92, 0, 6.2832);
      ctx.stroke();
    });
    state.rocks.forEach(function (r) {
      ctx.fillStyle = "#241f1b";
      ctx.beginPath();
      for (var k = 0; k < r.verts.length; k++) {
        var a = r.rot + (k / r.verts.length) * 6.2832;
        var rr = r.r * r.verts[k];
        var x = r.x + Math.cos(a) * rr, y = r.y + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(120,100,80,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    state.spores.forEach(function (s) {
      if (s.dead) {
        if (state.time > s.dead) s.dead = 0;
        else return;
      }
      var p = 0.6 + 0.4 * Math.sin(state.time * 3 + s.ph);
      ctx.fillStyle = "rgba(143,247,224," + (0.14 * p).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 12, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = "#bffcec";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4.4, 0, 6.2832);
      ctx.fill();
    });
    state.nets.forEach(function (n) { if (n.alive) drawNet(n); });
    state.parasites.forEach(function (w) {
      for (var i = 1; i < w.seg.length; i++) {
        ctx.strokeStyle = "rgba(255,110,156," + (0.3 + 0.5 * i / w.seg.length).toFixed(3) + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w.seg[i - 1].x, w.seg[i - 1].y);
        ctx.lineTo(w.seg[i].x, w.seg[i].y);
        ctx.stroke();
      }
      ctx.fillStyle = "#ff6e9c";
      ctx.beginPath();
      ctx.arc(w.x, w.y, 6, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = "#2a0812";
      ctx.beginPath();
      ctx.arc(w.x + 2, w.y - 2, 1.6, 0, 6.2832);
      ctx.fill();
    });
    Particles.draw(ctx);
    ctx.restore();

    var vg = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.35, view.w / 2, view.h / 2, view.h * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  function drawNet(n) {
    var glow = n === me ? 10 : 6;
    ctx.shadowColor = n.color;
    ctx.shadowBlur = glow;
    ctx.strokeStyle = n.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    n.tips.forEach(function (t) {
      if (!t.alive || t.path.length < 2) return;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(t.path[0].x, t.path[0].y);
      for (var i = 1; i < t.path.length; i++) ctx.lineTo(t.path[i].x, t.path[i].y);
      ctx.stroke();
      var head = t.path[t.path.length - 1];
      var p = 0.7 + 0.3 * Math.sin(state.time * 5 + t.dir);
      ctx.fillStyle = "#e8fff6";
      ctx.beginPath();
      ctx.arc(head.x, head.y, 4.6 * p, 0, 6.2832);
      ctx.fill();
      if (!n.bot && t.claim !== null) {
        ctx.strokeStyle = "rgba(232,255,246,0.5)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 9 + Math.sin(state.time * 6) * 1.6, 0, 6.2832);
        ctx.stroke();
      }
      if (n.bot) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(216,239,228,0.5)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.name, head.x, head.y - 14);
        ctx.shadowColor = n.color;
        ctx.shadowBlur = glow;
      }
    });
    ctx.fillStyle = "#2a4a3a";
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(n.root.x, n.root.y, 10, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /* ===== HUD ===== */
  function updateHUD() {
    document.getElementById("bio").textContent = Math.floor(me.B);
    document.getElementById("len").textContent = netLen(me);
    document.getElementById("tips").textContent = tipCount(me) + "/" + MAX_TIPS;
    document.getElementById("branch-btn").disabled = me.B < BRANCH_COST || tipCount(me) >= MAX_TIPS;
    var lb = document.getElementById("leaderboard");
    var sorted = state.nets.slice().sort(function (a, b) { return netLen(b) - netLen(a); });
    var html = "";
    sorted.forEach(function (n, i) {
      if (!n.alive && n.bot) return;
      html += "<li" + (n === me ? ' class="me"' : "") + ">" + (i + 1) + ". " + n.name + " <b>" + netLen(n) + "</b></li>";
    });
    if (lb._h !== html) { lb._h = html; lb.innerHTML = html; }
  }

  /* ===== Modal / morte ===== */
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

  function gameOver(n) {
    state.over = true;
    Sound.die();
    R2.buzz([60, 40, 90]);
    var best = Number(localStorage.getItem("mycel-best") || 0);
    var L = netLen(n);
    if (L > best) { localStorage.setItem("mycel-best", String(L)); best = L; }
    R2.saveJSON("mycel-pwa", { highScore: best });
    var mins = Math.floor(state.time / 60), secs = Math.floor(state.time % 60);
    showModal(
      "La rete è morta",
      "Il micelio si è dissolto nel buio.<br><br>Rete massima: <b>" + best + "</b><br>Spore divorato: <b>" + n.spores + "</b><br>Tempo nel suolo: " + mins + "m " + secs + "s<br><br>" +
      (best < 400 ? "Il suolo è spietato: mangia, cresci, ramifica." :
       best < 900 ? "Bella rete. I parassiti ti temono già." :
       "Micelio leggendario. Il bosco sussurra il tuo nome."),
      [{ t: "🌱 Nuova spora", f: function () { location.reload(); }, primary: true }]);
  }

  /* ===== Input: un dito per tendine ===== */
  function claimTouches() {
    touches.forEach(function (tc) {
      var t = me.tips[tc.tip];
      if (!t || !t.alive) tc.tip = -1;
    });
    touches.filter(function (tc) { return tc.tip < 0; }).forEach(function (tc) {
      var best = -1, bestD = 1e18;
      me.tips.forEach(function (t, ti) {
        if (!t.alive) return;
        var claimed = touches.some(function (o) { return o !== tc && o.tip === ti; });
        if (claimed) return;
        var head = t.path[t.path.length - 1];
        var d = dist2(tc.x, tc.y, head.x, head.y);
        if (d < bestD) { bestD = d; best = ti; }
      });
      if (best < 0) {
        me.tips.forEach(function (t, ti) { if (best < 0 && t.alive) best = ti; });
      }
      tc.tip = best;
    });
  }
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: cam.x + (e.clientX - r.left - view.w / 2) / cam.z,
      y: cam.y + (e.clientY - r.top - view.h / 2) / cam.z,
    };
  }
  function setupInput() {
    var stage = document.getElementById("stage");
    stage.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      var w = toWorld(e);
      if (e.pointerType === "mouse") { mouse.has = true; mouse.x = w.x; mouse.y = w.y; return; }
      touches.push({ id: e.pointerId, x: w.x, y: w.y, tip: -1 });
      claimTouches();
    });
    stage.addEventListener("pointermove", function (e) {
      var w = toWorld(e);
      if (e.pointerType === "mouse") { mouse.x = w.x; mouse.y = w.y; mouse.has = true; return; }
      touches.forEach(function (tc) { if (tc.id === e.pointerId) { tc.x = w.x; tc.y = w.y; } });
    });
    function up(e) {
      if (e.pointerType === "mouse") return;
      for (var i = touches.length - 1; i >= 0; i--) {
        if (touches[i].id === e.pointerId) { touches.splice(i, 1); claimTouches(); }
      }
    }
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    document.getElementById("branch-btn").addEventListener("click", function () {
      if (state.over) return;
      var longest = 0, li = 0;
      me.tips.forEach(function (t, ti) {
        if (t.alive && pathLen(t.path) > longest) { longest = pathLen(t.path); li = ti; }
      });
      if (branch(me, li, null)) {
        Sound.branch();
        R2.buzz([10, 20, 10]);
        toast("🌿 Nuovo tendine! Un dito per punta.");
      }
    });
    var sbtn = document.getElementById("sound-btn");
    sbtn.textContent = R2.getSettings().sound ? "🔊" : "🔇";
    sbtn.addEventListener("click", function () {
      var st = R2.setSettings({ sound: !R2.getSettings().sound });
      sbtn.textContent = st.sound ? "🔊" : "🔇";
    });
  }

  function showStart() {
    showModal("MYCEL", "<b>Sei una rete di ife nel suolo scuro.</b><br><br>• Trascina: ogni <b>dito guida una punta</b> (col mouse: tutte seguono il cursore)<br>• Mangia le <b>spore</b> per fare biomassa: crescere costa<br>• <b>🌿 Ramo</b>: sacrifica 45 di biomassa e sprona un secondo, terzo tendine<br>• I <b>parassiti</b> magenta mangiano la rete; le <b>zone tossiche</b> la erodono; le <b>rocce</b> bloccano<br>• Se muoiono tutte le punte e non hai biomassa, è finita",
      [{ t: "🌱 Germina", f: function () { hideModal(); }, primary: true }]);
  }

  /* ===== Loop ===== */
  var lastT = 0;
  function loop(ts) {
    var t = ts / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0.016;
    lastT = t;
    if (!state.over) {
      updateNets(dt);
      updateParasites(dt);
    }
    Particles.update(dt);
    updateCamera(dt);
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
  }

  function init() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    initSound();
    resize();
    window.addEventListener("resize", resize);
    buildWorld();
    me = makeNet("tu", false, "#8affce");
    state.nets.push(me);
    ["Rizomorfo", "Sporencia", "MicelioNero"].forEach(function (n, i) {
      state.nets.push(makeNet(n, true, ["#ffb37d", "#c78dff", "#7da8ff"][i % 3]));
    });
    makeSoil();
    setupInput();
    showStart();
    R2.trackPlaytime("mycel-pwa/");
    R2.installHint();
    R2.markPlayed("mycel-pwa/");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
