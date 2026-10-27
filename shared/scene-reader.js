/*
 * random2 · shared scene reader for the Library story PWAs
 * ---------------------------------------------------------
 * One tiny no-dependency file shared by the classic book PWAs, so every
 * standalone visual novel ships a multi-act interactive reader with an
 * animated low-poly / procedural atmospheric scene canvas, synthesized
 * contemplative audio, and bilingual (EN/IT) support:
 *
 *   <script src="../shared/scene-reader.js"></script>
 *   <script>
 *     LibraryScene.open({
 *       mount:    document.getElementById("scene"),
 *       bookId:   "les_miserables",
 *       theme:    "snow",
 *       backHref: "../anthology-pwa/",
 *       acts: [
 *         {
 *           title: { en: "Act I · ...", it: "Atto I · ..." },
 *           place: { en: "...", it: "..." },
 *           theme: "snow",
 *           lines: [{ s: "Name" | {en,it}, t: { en: "...", it: "..." } }, ...],
 *           choices: [{ text: {en,it}, effect: {mem,mel,art}, lines: [{s,t}, ...] }, ...],
 *           outro: { en: "...", it: "..." }
 *         }
 *       ]
 *     });
 *   </script>
 *
 * Also backwards-compatible with single-scene options ({ title, place, lines, choices, outro }).
 */
(function () {
  "use strict";

  var STATE_KEY = "anthology-state";

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || "{}") || {};
    } catch (e) { return {}; }
  }

  function saveStore(patch) {
    try {
      var s = loadStore();
      for (var k in patch) { if (patch[k] !== undefined) s[k] = patch[k]; }
      localStorage.setItem(STATE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function readLang() {
    var s = loadStore();
    return s && s.language === "it" ? "it" : "en";
  }

  function writeLang(l) {
    saveStore({ language: l });
  }

  var lang = readLang();
  var D = null, acts = [], actIdx = 0, idx = 0, phase = "lines", branch = null;
  var stats = { mem: 4, mel: 6, art: 4 };
  var animId = 0, canvasEl = null, ctx = null, particles = [], tClock = 0;
  var audioCtx = null;

  function $(id) { return document.getElementById(id); }
  function txt(t) { if (t == null) return ""; if (typeof t === "string") return t; return lang === "it" ? (t.it || t.en || "") : (t.en || t.it || ""); }
  function spk(s) { if (!s) return ""; return typeof s === "string" ? s : txt(s); }

  function label(k) {
    var L = {
      en: {
        hint: "▸ tap or press Space to continue",
        again: "↻ Read this act again",
        restartBook: "⟲ Restart from Act I",
        nextAct: "Continue to Next Act ▸",
        back: "← Return to the Library",
        langBtn: "Lingua: Italiano",
        mem: "Memory", mel: "Melancholy", art: "Art",
        actPrefix: "Act"
      },
      it: {
        hint: "▸ tocca o premi Spazio per continuare",
        again: "↻ Rileggi questo atto",
        restartBook: "⟲ Ricomincia dall'Atto I",
        nextAct: "Prosegui all'Atto successivo ▸",
        back: "← Ritorna alla Biblioteca",
        langBtn: "Language: English",
        mem: "Memoria", mel: "Malinconia", art: "Arte",
        actPrefix: "Atto"
      }
    };
    return L[lang][k];
  }

  function playNote(freq, dur, type) {
    try {
      var r2set = JSON.parse(localStorage.getItem("random2-settings") || "{}");
      if (r2set && r2set.sound === false) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || "triangle";
      o.frequency.setValueAtTime(freq || 220, audioCtx.currentTime);
      g.gain.setValueAtTime(0.06, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0008, audioCtx.currentTime + (dur || 0.7));
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + (dur || 0.7));
    } catch (e) {}
  }

  var CSS = [
    ".ls-reader{max-width:860px;margin:0 auto;font-family:'Cormorant Garamond',Georgia,serif;color:#d8c8b2;}",
    ".ls-topbar{display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.9rem;}",
    ".ls-acts{display:flex;gap:0.45rem;flex-wrap:wrap;}",
    ".ls-act-pill{background:rgba(18,10,24,0.65);border:1px solid rgba(201,184,168,0.18);color:#9a8876;font-family:Georgia,serif;font-size:0.74rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.34rem 0.75rem;border-radius:999px;cursor:pointer;transition:all .25s;}",
    ".ls-act-pill:hover{border-color:rgba(218,165,120,0.45);color:#d8c8b2;}",
    ".ls-act-pill.active{background:rgba(201,168,120,0.18);border-color:rgba(218,165,120,0.65);color:#f0dec2;box-shadow:0 0 16px rgba(201,168,120,0.15);}",
    ".ls-controls{display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;}",
    ".ls-stats{display:flex;gap:0.75rem;font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:#a8947c;background:rgba(15,6,18,0.55);border:1px solid rgba(201,184,168,0.12);padding:0.3rem 0.75rem;border-radius:999px;}",
    ".ls-stats b{color:#e2c49a;font-weight:600;}",
    ".ls-lang{background:rgba(15,6,18,0.65);border:1px solid rgba(201,184,168,0.22);border-radius:6px;color:#b8a48c;font-family:Georgia,serif;font-size:0.74rem;letter-spacing:0.1em;padding:0.34rem 0.7rem;cursor:pointer;transition:all .25s;}",
    ".ls-lang:hover{border-color:rgba(218,165,120,0.5);color:#f0dec2;}",
    ".ls-visual-frame{position:relative;width:100%;height:230px;border-radius:14px 14px 0 0;overflow:hidden;border:1px solid rgba(201,184,168,0.16);border-bottom:none;background:#08050d;}",
    ".ls-canvas{display:block;width:100%;height:100%;}",
    ".ls-visual-caption{position:absolute;left:1.25rem;bottom:0.85rem;right:1.25rem;display:flex;justify-content:space-between;align-items:flex-end;pointer-events:none;text-shadow:0 2px 10px rgba(0,0,0,0.9);}",
    ".ls-title{font-size:1.35rem;color:#ece0cf;letter-spacing:0.08em;font-weight:400;}",
    ".ls-place{font-size:0.82rem;color:#c4ae94;font-style:italic;letter-spacing:0.1em;margin-top:0.1rem;}",
    ".ls-step-badge{font-size:0.7rem;color:#c9a878;letter-spacing:0.16em;text-transform:uppercase;background:rgba(8,5,13,0.72);padding:0.22rem 0.6rem;border-radius:999px;border:1px solid rgba(201,168,120,0.25);}",
    ".ls-progress-track{height:3px;width:100%;background:rgba(201,184,168,0.1);overflow:hidden;}",
    ".ls-progress-bar{height:100%;background:linear-gradient(90deg,#8a6845,#d4a872,#e8c89b);width:0%;transition:width .35s ease;}",
    ".ls-stage{background:linear-gradient(180deg,rgba(18,9,23,0.92),rgba(11,6,15,0.96));border:1px solid rgba(201,184,168,0.16);border-top:none;border-radius:0 0 14px 14px;padding:1.85rem 1.75rem 2.3rem;min-height:215px;cursor:pointer;position:relative;box-shadow:0 16px 40px rgba(0,0,0,0.45);}",
    ".ls-speaker-row{display:flex;align-items:center;gap:0.55rem;margin-bottom:0.75rem;}",
    ".ls-speaker-dot{width:8px;height:8px;border-radius:50%;background:#d4a872;box-shadow:0 0 8px rgba(212,168,114,0.7);}",
    ".ls-speaker{font-size:0.78rem;color:#d4a872;letter-spacing:0.2em;text-transform:uppercase;opacity:0.95;}",
    ".ls-text{font-size:1.16rem;color:#e6d8c4;line-height:1.82;letter-spacing:0.025em;}",
    ".ls-text.ls-narrator{font-style:italic;color:#cbb89e;}",
    ".ls-text.ls-in{animation:lsIn .45s ease both;}",
    "@keyframes lsIn{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:none;}}",
    ".ls-hint{position:absolute;right:1.25rem;bottom:0.85rem;color:#9a866e;font-size:0.72rem;letter-spacing:0.12em;animation:lsPulse 2s ease-in-out infinite;}",
    "@keyframes lsPulse{0%,100%{opacity:.38;}50%{opacity:.92;}}",
    ".ls-choices{margin-top:1.1rem;display:flex;flex-direction:column;gap:0.65rem;background:rgba(15,8,20,0.88);border:1px solid rgba(201,184,168,0.16);border-top:none;border-radius:0 0 14px 14px;padding:1.5rem;}",
    ".ls-choices-prompt{font-size:0.74rem;letter-spacing:0.18em;text-transform:uppercase;color:#bfa07a;margin-bottom:0.25rem;}",
    ".ls-choices.ls-hidden,.ls-end.ls-hidden,.ls-stage.ls-hidden{display:none;}",
    ".ls-choice{background:rgba(201,184,168,0.06);border:1px solid rgba(201,184,168,0.24);color:#decbb4;font-family:Georgia,serif;font-size:1rem;letter-spacing:0.03em;padding:0.9rem 1.2rem;border-radius:9px;cursor:pointer;text-align:left;transition:all .25s;display:flex;justify-content:space-between;align-items:center;gap:1rem;}",
    ".ls-choice:hover{background:rgba(212,168,114,0.15);border-color:rgba(218,165,120,0.55);color:#f5e6cf;transform:translateX(3px);}",
    ".ls-choice-eff{font-size:0.7rem;color:#bfa07a;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;opacity:0.85;}",
    ".ls-end{background:rgba(18,9,23,0.92);border:1px solid rgba(218,165,120,0.28);border-top:none;border-radius:0 0 14px 14px;padding:1.8rem 1.6rem;text-align:center;}",
    ".ls-end p{font-style:italic;color:#d4c0a6;font-size:1.08rem;line-height:1.75;margin:0 auto 1.4rem;max-width:640px;}",
    ".ls-btn-row{display:flex;flex-direction:column;gap:0.5rem;max-width:380px;margin:0 auto;}",
    ".ls-btn{display:block;width:100%;padding:0.75rem 1.2rem;background:rgba(201,184,168,0.08);border:1px solid rgba(201,184,168,0.25);color:#d8c8b2;border-radius:7px;font-family:Georgia,serif;font-size:0.94rem;letter-spacing:0.06em;cursor:pointer;text-decoration:none;transition:all .25s;text-align:center;box-sizing:border-box;}",
    ".ls-btn.primary{background:rgba(212,168,114,0.18);border-color:rgba(218,165,120,0.55);color:#f4e3c8;font-weight:600;}",
    ".ls-btn:hover{background:rgba(212,168,114,0.24);border-color:rgba(218,165,120,0.7);color:#fff;}"
  ].join("\n");

  function ensureStyles() {
    if ($("ls-style")) return;
    var st = document.createElement("style");
    st.id = "ls-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function currentAct() {
    return acts[actIdx] || acts[0];
  }

  function currentTheme() {
    var a = currentAct();
    return (a && a.theme) || (D && D.theme) || "candles";
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < 42; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 2.2 + 0.7,
        vx: (Math.random() - 0.5) * 0.04,
        vy: (Math.random() - 0.5) * 0.04,
        a: Math.random() * 0.65 + 0.15,
        p: Math.random() * Math.PI * 2
      });
    }
  }

  function drawLowPolyScene(dt) {
    if (!canvasEl || !ctx) return;
    var rect = canvasEl.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(300, Math.round(rect.width || 800));
    var h = Math.max(160, Math.round(rect.height || 230));
    if (canvasEl.width !== w * dpr || canvasEl.height !== h * dpr) {
      canvasEl.width = w * dpr;
      canvasEl.height = h * dpr;
    }
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var theme = currentTheme();
    tClock += dt;

    // Sky / backdrop gradient by theme
    var g = ctx.createLinearGradient(0, 0, 0, h);
    if (theme === "snow" || theme === "train") {
      g.addColorStop(0, "#0b1020"); g.addColorStop(0.6, "#182238"); g.addColorStop(1, "#1e1926");
    } else if (theme === "inferno") {
      g.addColorStop(0, "#12060a"); g.addColorStop(0.55, "#2b0c10"); g.addColorStop(1, "#45140e");
    } else if (theme === "purgatorio") {
      g.addColorStop(0, "#0e1326"); g.addColorStop(0.55, "#232a45"); g.addColorStop(1, "#4a3830");
    } else if (theme === "paradiso" || theme === "galaxy") {
      g.addColorStop(0, "#070b1c"); g.addColorStop(0.5, "#192246"); g.addColorStop(1, "#3b3154");
    } else if (theme === "portrait") {
      g.addColorStop(0, "#12091a"); g.addColorStop(0.6, "#241129"); g.addColorStop(1, "#140b16");
    } else if (theme === "cities") {
      g.addColorStop(0, "#091521"); g.addColorStop(0.6, "#173042"); g.addColorStop(1, "#2a2333");
    } else if (theme === "attic" || theme === "underground") {
      g.addColorStop(0, "#09080d"); g.addColorStop(0.6, "#17141f"); g.addColorStop(1, "#221a17");
    } else {
      g.addColorStop(0, "#0c0714"); g.addColorStop(0.6, "#1c1126"); g.addColorStop(1, "#261820");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Low-poly faceted horizon mountains / architecture
    var seed = (actIdx + 1) * 17 + theme.charCodeAt(0);
    function polyRidge(yBase, amp, cols, colA, colB) {
      var step = w / cols;
      for (var i = 0; i < cols; i++) {
        var x0 = i * step, x1 = (i + 1) * step, xm = (x0 + x1) * 0.5;
        var h0 = Math.sin(i * 1.3 + seed) * amp + Math.cos(i * 0.7) * (amp * 0.5);
        var h1 = Math.sin((i + 1) * 1.3 + seed) * amp + Math.cos((i + 1) * 0.7) * (amp * 0.5);
        var hm = (h0 + h1) * 0.5 - Math.abs(Math.sin(i * 2.1 + seed)) * (amp * 0.45);
        ctx.fillStyle = i % 2 === 0 ? colA : colB;
        ctx.beginPath();
        ctx.moveTo(x0, h);
        ctx.lineTo(x0, yBase + h0);
        ctx.lineTo(xm, yBase + hm);
        ctx.lineTo(x1, yBase + h1);
        ctx.lineTo(x1, h);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (theme === "inferno") {
      // Descending concentric low-poly rings & ember core
      for (var r = 5; r >= 1; r--) {
        ctx.strokeStyle = "rgba(235,95,55," + (0.08 + (6 - r) * 0.05) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        var rad = r * 36 + Math.sin(tClock * 1.5 + r) * 4;
        for (var s = 0; s <= 12; s++) {
          var ang = (s / 12) * Math.PI * 2 + tClock * 0.08 * (r % 2 ? 1 : -1);
          var px = w * 0.5 + Math.cos(ang) * rad * 1.6;
          var py = h * 0.58 + Math.sin(ang) * rad * 0.52;
          if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      polyRidge(h * 0.72, 24, 14, "rgba(42,10,14,0.85)", "rgba(28,6,10,0.9)");
    } else if (theme === "paradiso" || theme === "galaxy") {
      // Celestial rose / concentric crystalline spheres
      for (var c = 1; c <= 6; c++) {
        ctx.strokeStyle = "rgba(235,210,165," + (0.28 - c * 0.035) + ")";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        var rr = c * 26 + Math.sin(tClock * 1.2 + c) * 3;
        for (var k = 0; k <= 16; k++) {
          var a = (k / 16) * Math.PI * 2 + tClock * 0.12 * (c % 2 ? 1 : -1);
          var x = w * 0.5 + Math.cos(a) * rr * 1.3;
          var y = h * 0.48 + Math.sin(a) * rr * 0.75;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else if (theme === "cities") {
      // Calvino low-poly spires, bridges and reflections
      polyRidge(h * 0.65, 32, 16, "rgba(24,48,68,0.65)", "rgba(18,36,52,0.75)");
      for (var b = 0; b < 9; b++) {
        var bx = w * (0.12 + b * 0.095);
        var bh = 38 + ((b * 29) % 55);
        ctx.fillStyle = b % 2 ? "rgba(212,175,125,0.22)" : "rgba(140,185,215,0.18)";
        ctx.beginPath();
        ctx.moveTo(bx - 14, h * 0.78);
        ctx.lineTo(bx, h * 0.78 - bh);
        ctx.lineTo(bx + 14, h * 0.78);
        ctx.closePath();
        ctx.fill();
      }
      // Water line
      ctx.strokeStyle = "rgba(180,215,235,0.25)";
      ctx.beginPath(); ctx.moveTo(0, h * 0.78); ctx.lineTo(w, h * 0.78); ctx.stroke();
    } else if (theme === "attic") {
      // Kafka geometric beams & perspective corridor
      for (var d = 1; d <= 6; d++) {
        var sc = d / 6;
        var rw = w * sc * 0.85, rh = h * sc * 0.85;
        ctx.strokeStyle = "rgba(201,176,145," + (0.06 + (1 - sc) * 0.16) + ")";
        ctx.strokeRect((w - rw) * 0.5, (h - rh) * 0.5, rw, rh);
      }
      var swing = Math.sin(tClock * 1.6) * 18;
      var lx = w * 0.5 + swing, ly = h * 0.28;
      ctx.strokeStyle = "rgba(215,190,150,0.4)";
      ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(lx, ly); ctx.stroke();
      var lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 95);
      lg.addColorStop(0, "rgba(245,210,145,0.45)");
      lg.addColorStop(1, "rgba(245,210,145,0)");
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lx, ly, 95, 0, Math.PI * 2); ctx.fill();
    } else if (theme === "portrait") {
      // Ornate low-poly frame in the center
      polyRidge(h * 0.72, 18, 12, "rgba(32,15,38,0.7)", "rgba(22,10,28,0.8)");
      var fx = w * 0.5, fy = h * 0.45;
      ctx.strokeStyle = "rgba(218,175,110,0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(fx - 46, fy - 58, 92, 116);
      ctx.strokeStyle = "rgba(180,75,95," + (0.25 + 0.15 * Math.sin(tClock * 2)) + ")";
      ctx.beginPath();
      ctx.moveTo(fx - 46, fy - 58); ctx.lineTo(fx + 46, fy + 58);
      ctx.moveTo(fx + 46, fy - 58); ctx.lineTo(fx - 46, fy + 58);
      ctx.stroke();
    } else if (theme === "train") {
      polyRidge(h * 0.62, 22, 12, "rgba(25,33,52,0.75)", "rgba(17,23,38,0.85)");
      // Glowing headlight & steam
      var hx = (w * 0.25) + Math.sin(tClock * 0.5) * 20, hy = h * 0.58;
      var hg = ctx.createRadialGradient(hx, hy, 2, hx, hy, 110);
      hg.addColorStop(0, "rgba(255,225,165,0.6)");
      hg.addColorStop(0.5, "rgba(255,190,110,0.18)");
      hg.addColorStop(1, "rgba(255,190,110,0)");
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(hx, hy, 110, 0, Math.PI * 2); ctx.fill();
    } else {
      // Default low-poly ridges + warm candle/streetlamp glow
      polyRidge(h * 0.62, 28, 12, "rgba(32,20,38,0.65)", "rgba(22,13,28,0.75)");
      polyRidge(h * 0.76, 18, 16, "rgba(18,10,22,0.85)", "rgba(12,7,16,0.92)");
      var cx = w * 0.72, cy = h * 0.42;
      var cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 90 + Math.sin(tClock * 3) * 8);
      cg.addColorStop(0, "rgba(245,205,140,0.42)");
      cg.addColorStop(0.5, "rgba(215,155,95,0.14)");
      cg.addColorStop(1, "rgba(215,155,95,0)");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, 98, 0, Math.PI * 2); ctx.fill();
    }

    // Floating particles (snow, embers, dust motes, stars)
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (theme === "snow" || theme === "train" || theme === "underground") {
        p.y += dt * 0.12 * (0.5 + p.r * 0.3);
        p.x += Math.sin(tClock + p.p) * dt * 0.03;
      } else if (theme === "inferno") {
        p.y -= dt * 0.14 * (0.4 + p.r * 0.3);
        p.x += Math.cos(tClock * 1.5 + p.p) * dt * 0.04;
      } else {
        p.y -= dt * 0.03;
        p.x += Math.sin(tClock * 0.7 + p.p) * dt * 0.015;
      }
      if (p.y > 1.05) p.y = -0.05;
      if (p.y < -0.05) p.y = 1.05;
      if (p.x > 1.05) p.x = -0.05;
      if (p.x < -0.05) p.x = 1.05;

      var alpha = p.a * (0.65 + 0.35 * Math.sin(tClock * 2.2 + p.p));
      if (theme === "inferno") {
        ctx.fillStyle = "rgba(255,130,70," + alpha.toFixed(3) + ")";
      } else if (theme === "snow" || theme === "train") {
        ctx.fillStyle = "rgba(230,240,255," + alpha.toFixed(3) + ")";
      } else {
        ctx.fillStyle = "rgba(225,195,150," + alpha.toFixed(3) + ")";
      }
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bottom vignette so caption is always crisp
    var vg = ctx.createLinearGradient(0, h * 0.45, 0, h);
    vg.addColorStop(0, "rgba(8,5,13,0)");
    vg.addColorStop(1, "rgba(8,5,13,0.88)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, h * 0.45, w, h * 0.55);

    ctx.restore();
  }

  var lastFrame = 0;
  function tickCanvas(now) {
    var dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0.016;
    lastFrame = now;
    drawLowPolyScene(dt);
    if (!document.hidden) animId = requestAnimationFrame(tickCanvas);
  }

  function buildDOM(mount) {
    mount.innerHTML =
      '<div class="ls-reader">' +
        '<div class="ls-topbar">' +
          '<div class="ls-acts" id="ls-acts"></div>' +
          '<div class="ls-controls">' +
            '<div class="ls-stats" id="ls-stats"></div>' +
            '<button class="ls-lang" id="ls-lang" type="button"></button>' +
          '</div>' +
        '</div>' +
        '<div class="ls-visual-frame">' +
          '<canvas class="ls-canvas" id="ls-canvas"></canvas>' +
          '<div class="ls-visual-caption">' +
            '<div><div class="ls-title" id="ls-title"></div><div class="ls-place" id="ls-place"></div></div>' +
            '<div class="ls-step-badge" id="ls-step-badge"></div>' +
          '</div>' +
        '</div>' +
        '<div class="ls-progress-track"><div class="ls-progress-bar" id="ls-progress-bar"></div></div>' +
        '<div class="ls-stage" id="ls-stage">' +
          '<div class="ls-speaker-row"><span class="ls-speaker-dot"></span><div class="ls-speaker" id="ls-speaker"></div></div>' +
          '<div class="ls-text" id="ls-text"></div>' +
          '<div class="ls-hint" id="ls-hint"></div>' +
        '</div>' +
        '<div class="ls-choices ls-hidden" id="ls-choices"></div>' +
        '<div class="ls-end ls-hidden" id="ls-end">' +
          '<p class="ls-outro" id="ls-outro"></p>' +
          '<div class="ls-btn-row">' +
            '<button class="ls-btn primary ls-hidden" id="ls-next-act" type="button"></button>' +
            '<a class="ls-btn" id="ls-back" href="#"></a>' +
            '<button class="ls-btn" id="ls-again" type="button"></button>' +
          '</div>' +
        '</div>' +
      '</div>';

    canvasEl = $("ls-canvas");
    if (canvasEl && canvasEl.getContext) {
      ctx = canvasEl.getContext("2d");
      initParticles();
      if (animId) cancelAnimationFrame(animId);
      drawLowPolyScene(0.016);
      if (typeof requestAnimationFrame === "function") {
        animId = requestAnimationFrame(tickCanvas);
      }
    }

    $("ls-stage").addEventListener("click", function () {
      playNote(240 + (idx % 5) * 22, 0.35, "sine");
      advance();
    });
    $("ls-lang").addEventListener("click", function () {
      lang = lang === "en" ? "it" : "en";
      writeLang(lang);
      if (typeof D.onLangChange === "function") D.onLangChange(lang);
      render();
    });
    $("ls-again").addEventListener("click", function () {
      idx = 0; phase = "lines"; branch = null;
      $("ls-end").classList.add("ls-hidden");
      $("ls-choices").classList.add("ls-hidden");
      $("ls-stage").classList.remove("ls-hidden");
      render();
    });
    $("ls-next-act").addEventListener("click", function () {
      if (actIdx < acts.length - 1) {
        selectAct(actIdx + 1);
      } else {
        selectAct(0);
      }
    });
    $("ls-back").addEventListener("click", function () { window.location.href = D.backHref; });
    document.addEventListener("keydown", onKey);
  }

  function selectAct(newIdx) {
    if (newIdx < 0 || newIdx >= acts.length) return;
    actIdx = newIdx;
    idx = 0;
    phase = "lines";
    branch = null;
    $("ls-end").classList.add("ls-hidden");
    $("ls-choices").classList.add("ls-hidden");
    $("ls-stage").classList.remove("ls-hidden");
    playNote(330, 0.6, "triangle");
    render();
  }

  function onKey(e) {
    if (!D) return;
    if (e.key === "Escape") { window.location.href = D.backHref; return; }
    if (e.target && /BUTTON|A|INPUT|TEXTAREA/.test(e.target.tagName || "")) return;
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") {
      e.preventDefault();
      advance();
    }
  }

  function currentLines() {
    var a = currentAct();
    if (!a) return [];
    return (phase === "branch" && branch) ? (branch.lines || []) : (a.lines || []);
  }

  function fmtEffect(eff) {
    if (!eff) return "";
    var parts = [];
    var names = { mem: label("mem"), mel: label("mel"), art: label("art") };
    ["mem", "mel", "art"].forEach(function (k) {
      var v = eff[k] || 0;
      if (v !== 0) parts.push((v > 0 ? "+" : "−") + Math.abs(v) + " " + names[k]);
    });
    return parts.join(" · ");
  }

  function applyEffect(eff) {
    if (!eff) return;
    ["mem", "mel", "art"].forEach(function (k) {
      stats[k] = Math.max(0, Math.min(30, (stats[k] || 0) + (eff[k] || 0)));
    });
  }

  function renderTopbar() {
    var actsBox = $("ls-acts");
    if (actsBox) {
      actsBox.innerHTML = "";
      if (acts.length > 1) {
        acts.forEach(function (a, i) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ls-act-pill" + (i === actIdx ? " active" : "");
          btn.textContent = txt(a.tab || a.title || (label("actPrefix") + " " + (i + 1)));
          btn.addEventListener("click", function () { selectAct(i); });
          actsBox.appendChild(btn);
        });
      }
    }
    var stEl = $("ls-stats");
    if (stEl) {
      stEl.innerHTML =
        "<span>" + label("mem") + " <b>" + stats.mem + "</b></span>" +
        "<span>" + label("mel") + " <b>" + stats.mel + "</b></span>" +
        "<span>" + label("art") + " <b>" + stats.art + "</b></span>";
    }
  }

  function render() {
    if (!D) return;
    var a = currentAct();
    if (!a) return;
    renderTopbar();
    $("ls-title").textContent = txt(a.title || D.title);
    $("ls-place").textContent = txt(a.place || D.place || "");
    $("ls-lang").textContent = label("langBtn");

    var totalLines = (a.lines ? a.lines.length : 1) + 2;
    var curStep = phase === "lines" ? (idx + 1) : phase === "choices" ? (totalLines - 1) : totalLines;
    var pct = Math.min(100, Math.round((curStep / totalLines) * 100));
    var pb = $("ls-progress-bar");
    if (pb) pb.style.width = pct + "%";
    var sb = $("ls-step-badge");
    if (sb) {
      sb.textContent = (acts.length > 1 ? (label("actPrefix") + " " + (actIdx + 1) + "/" + acts.length + " · ") : "") +
        (phase === "lines" ? ((idx + 1) + "/" + a.lines.length) : phase === "choices" ? "✦" : "✓");
    }

    if (phase === "choices") { renderChoices(); return; }
    if (phase === "end") { renderEnd(); return; }
    var arr = currentLines();
    var line = arr[idx];
    if (!line) { advance(); return; }
    var spName = spk(line.s);
    $("ls-speaker").textContent = spName;
    var tx = $("ls-text");
    var isNarr = spName === "Narrator" || spName === "Narratore";
    tx.classList.toggle("ls-narrator", isNarr);
    tx.classList.remove("ls-in"); void tx.offsetWidth; tx.classList.add("ls-in");
    tx.textContent = txt(line.t);
    var hint = $("ls-hint");
    hint.textContent = label("hint");
    hint.style.visibility = (phase === "branch" && idx >= arr.length - 1) ? "hidden" : "visible";
  }

  function renderChoices() {
    var a = currentAct();
    var box = $("ls-choices");
    box.innerHTML = "";
    var choices = (a && a.choices) || [];
    choices.forEach(function (c, i) {
      var b = document.createElement("button");
      b.className = "ls-choice";
      b.type = "button";
      var effStr = fmtEffect(c.effect);
      var spanTxt = document.createElement("span");
      spanTxt.textContent = txt(c.text);
      b.appendChild(spanTxt);
      if (effStr) {
        var spanEff = document.createElement("span");
        spanEff.className = "ls-choice-eff";
        spanEff.textContent = effStr;
        b.appendChild(spanEff);
      }
      b.addEventListener("click", function (ev) { ev.stopPropagation(); choose(i); });
      box.appendChild(b);
    });
    box.classList.remove("ls-hidden");
    $("ls-stage").classList.add("ls-hidden");
    $("ls-end").classList.add("ls-hidden");
  }

  function choose(i) {
    var a = currentAct();
    var c = a && a.choices && a.choices[i];
    if (!c) return;
    applyEffect(c.effect || { mem: 2, mel: 1, art: 1 });
    playNote(293.66, 0.55, "triangle");
    branch = c; idx = 0; phase = "branch";
    $("ls-choices").classList.add("ls-hidden");
    $("ls-stage").classList.remove("ls-hidden");
    render();
  }

  function renderEnd() {
    var a = currentAct();
    $("ls-stage").classList.add("ls-hidden");
    $("ls-choices").classList.add("ls-hidden");
    $("ls-outro").textContent = (a && a.outro) ? txt(a.outro) : (D.outro ? txt(D.outro) : "");
    $("ls-back").textContent = label("back");
    $("ls-back").setAttribute("href", D.backHref || "../anthology-pwa/");
    $("ls-again").textContent = label("again");

    var nextBtn = $("ls-next-act");
    if (nextBtn) {
      if (actIdx < acts.length - 1) {
        var nextTitle = txt(acts[actIdx + 1].title || "");
        nextBtn.textContent = label("nextAct") + (nextTitle ? " (" + nextTitle + ")" : "");
        nextBtn.classList.remove("ls-hidden");
      } else if (acts.length > 1) {
        nextBtn.textContent = label("restartBook");
        nextBtn.classList.remove("ls-hidden");
      } else {
        nextBtn.classList.add("ls-hidden");
      }
    }

    $("ls-end").classList.remove("ls-hidden");
    if (D.bookId) {
      var st = loadStore();
      if (!Array.isArray(st.visited)) st.visited = [];
      if (st.visited.indexOf(D.bookId) === -1) st.visited.push(D.bookId);
      saveStore(st);
    }
  }

  function advance() {
    if (!D) return;
    if (phase === "choices" || phase === "end") return;
    var a = currentAct();
    var arr = currentLines();
    if (idx < arr.length - 1) { idx++; render(); return; }
    if (phase === "lines" && a && a.choices && a.choices.length) {
      phase = "choices"; renderChoices(); return;
    }
    phase = "end";
    renderEnd();
  }

  window.LibraryScene = {
    open: function (opts) {
      if (!opts) return;
      if (Array.isArray(opts.acts) && opts.acts.length) {
        acts = opts.acts;
      } else if (opts.lines && opts.lines.length) {
        acts = [{
          title: opts.title,
          place: opts.place,
          theme: opts.theme,
          lines: opts.lines,
          choices: opts.choices || [],
          outro: opts.outro
        }];
      } else {
        return;
      }
      D = opts;
      actIdx = 0; idx = 0; phase = "lines"; branch = null;
      if (opts.statInit) {
        stats = {
          mem: opts.statInit.mem || 4,
          mel: opts.statInit.mel || 6,
          art: opts.statInit.art || 4
        };
      }
      lang = readLang();
      ensureStyles();
      buildDOM(typeof opts.mount === "string" ? $(opts.mount) : (opts.mount || document.body));
      render();
    }
  };
})();
