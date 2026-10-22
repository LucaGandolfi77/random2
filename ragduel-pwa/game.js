/* ============================================================
   RAGDUEL.IO — presentation layer
   rendering · one-thumb input · synth audio · UI flow · PWA glue
   ============================================================ */
(() => {
  'use strict';
  const S = window.RAGDUEL_SIM;

  /* ---------------- persistence ---------------- */
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('ragduel_' + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem('ragduel_' + k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------------- dom ---------------- */
  const $ = (id) => document.getElementById(id);
  const cv = $('game'), ctx = cv.getContext('2d');
  const ui = {
    menu: $('menu'), how: $('how'), result: $('result'), paused: $('paused'),
    banner: $('banner'), bannerTitle: $('bannerTitle'), bannerSub: $('bannerSub'),
    bannerChip: $('bannerChip'), toast: $('toast'),
    resTitle: $('resTitle'), resSub: $('resSub'), btnNext: $('btnNext'),
    name2Input: $('name2Input'),
    menuStats: $('menuStats'), nameInput: $('nameInput'),
  };

  /* ---------------- canvas / camera ---------------- */
  let dpr = 1, cw = 0, ch = 0, scale = 1, ox = 0, oy = 0;
  // roundRect fallback for older Safari
  if (!ctx.roundRect) {
    ctx.roundRect = function (x, y, w, h, r) {
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
    };
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = window.innerWidth; ch = window.innerHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    scale = Math.min(cw / S.W, ch / S.H);
    ox = (cw - S.W * scale) / 2;
    oy = (ch - S.H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  const cam = { x: S.W / 2, y: S.FLOOR - 160, zoom: 1, tx: S.W / 2, ty: S.FLOOR - 160, tzoom: 1 };
  function screenToWorld(px, py) {
    return {
      x: cam.x + ((px - ox) / scale - cam.x) / cam.zoom,
      y: cam.y + ((py - oy) / scale - cam.y) / cam.zoom,
    };
  }

  /* ---------------- audio (synth, no assets) ---------------- */
  let AC = null, master = null, noiseBuf = null;
  let soundOn = store.get('sound', true);
  function audio() {
    try {
      if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain();
        master.gain.value = soundOn ? 0.42 : 0;
        master.connect(AC.destination);
        noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { AC = null; }
    return AC;
  }
  function tone(freq, freq2, type, dur, peak, delay) {
    if (!AC || !soundOn) return;
    try {
      const t0 = AC.currentTime + (delay || 0);
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  function noise(dur, fType, f0, f1, peak, delay) {
    if (!AC || !soundOn || !noiseBuf) return;
    try {
      const t0 = AC.currentTime + (delay || 0);
      const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const fl = AC.createBiquadFilter(); fl.type = fType;
      fl.frequency.setValueAtTime(f0, t0);
      if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      const g = AC.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(fl); fl.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  const sfx = {
    whoosh() { noise(0.16, 'bandpass', 420, 1900, 0.22); },
    hit(big) {
      tone(170, 60, 'triangle', 0.1, 0.5);
      noise(0.06, 'lowpass', 900, 400, 0.3);
      if (big) { tone(64, 38, 'sine', 0.3, 0.6); noise(0.14, 'lowpass', 500, 150, 0.4, 0.02); }
    },
    ko() {
      tone(110, 36, 'sine', 0.55, 0.7);
      noise(0.5, 'lowpass', 1200, 120, 0.4);
      tone(392, 196, 'square', 0.3, 0.12, 0.18);
    },
    pickup() { tone(660, 0, 'square', 0.07, 0.18); tone(990, 0, 'square', 0.09, 0.18, 0.08); },
    shatter() { noise(0.22, 'highpass', 1800, 3500, 0.32); tone(320, 90, 'sawtooth', 0.12, 0.15); },
    land() { noise(0.09, 'lowpass', 380, 160, 0.2); },
    jump() { tone(280, 520, 'sine', 0.1, 0.12); },
    click() { tone(1300, 0, 'square', 0.035, 0.12); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0, 'triangle', 0.14, 0.25, i * 0.11)); },
    lose() { tone(220, 82, 'sawtooth', 0.55, 0.28); tone(110, 55, 'sine', 0.6, 0.25, 0.1); },
    bell() { tone(880, 0, 'triangle', 0.4, 0.22); tone(1320, 0, 'triangle', 0.3, 0.1, 0.02); },
  };
  function buzz(pat) { try { if (soundOn && navigator.vibrate) navigator.vibrate(pat); } catch (e) {} }

  /* ---------------- game state ---------------- */
  let mode = 'menu';                 // 'menu' | 'fight'
  let world = null;
  let paused = false;
  let timeScale = 1, koSlowT = 0, freeze = 0;
  let shake = 0, flashA = 0;
  let particles = [], floaters = [];
  let taughtFling = store.get('taught', false);
  let taughtTap = store.get('taughtTap', false);
  let bestTier = store.get('best', 1);
  let trophies = store.get('trophies', []);
  let bannerToken = 0;

  function tierStyle() { return S.TIERS[(world.tier - 1) % S.TIERS.length]; }

  function newDemo() {
    world = S.createWorld({ demo: true });
    mode = 'menu';
  }
  function newFight(versus) {
    const name = (ui.nameInput.value || 'YOU').trim().slice(0, 12) || 'YOU';
    store.set('name', name);
    if (versus) {
      const name2 = (ui.name2Input.value || 'P2').trim().slice(0, 12) || 'P2';
      store.set('name2', name2);
      world = S.createWorld({ versus: true, vsNames: [name.toUpperCase(), name2.toUpperCase()] });
    } else {
      world = S.createWorld({ playerName: name.toUpperCase(), trophies });
    }
    mode = 'fight';
    timeScale = 1; koSlowT = 0; freeze = 0; shake = 0; flashA = 0;
    cam.tzoom = 1; cam.tx = S.W / 2; cam.ty = S.FLOOR - 160;
    particles.length = 0; floaters.length = 0;
  }

  /* ---------------- particles & floaters ---------------- */
  function sparks(x, y, color, n, power) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (60 + Math.random() * 260) * (power || 1);
      particles.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.35 + Math.random() * 0.3, max: 0.65, color, size: 2 + Math.random() * 2 });
    }
  }
  function dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      particles.push({ type: 'dust', x: x + (Math.random() - 0.5) * 20, y,
        vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40,
        life: 0.5 + Math.random() * 0.4, max: 0.9, color: '#5a6a8a', size: 3 + Math.random() * 4 });
    }
  }
  function rubble(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = 120 + Math.random() * 260;
      particles.push({ type: 'rubble', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.6 + Math.random() * 0.4, max: 1, color, size: 3 + Math.random() * 4 });
    }
  }
  function confetti(x, y) {
    const cols = ['#ffd23f', '#ff5e7a', '#4ade80', '#38bdf8', '#e15eff'];
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 180 + Math.random() * 420;
      particles.push({ type: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.9 + Math.random() * 0.6, max: 1.5, color: cols[i % cols.length], size: 4 + Math.random() * 3 });
    }
  }
  function floater(x, y, txt, big, color) {
    floaters.push({ x, y, txt, big, color: color || (big ? '#ffd23f' : '#e8ecff'), life: 0.9, max: 0.9 });
  }
  function stepFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      if (p.type !== 'dust') p.vy += 1400 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'confetti') { p.vx *= 0.99; p.vy *= 0.985; }
      if (p.y > S.FLOOR - 2 && p.type !== 'dust') { p.vy *= -0.4; p.vx *= 0.7; p.y = S.FLOOR - 2; }
    }
    if (particles.length > 400) particles.splice(0, particles.length - 400);
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt; f.y -= 55 * dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
  }

  /* ---------------- input ---------------- */
  // multi-pointer: in versus mode the screen splits (left half = P1, right = P2);
  // in single-player every pointer drives P1
  const pointers = new Map();          // pointerId -> { side, sx, sy, x, y, t, dragging }

  function sideFor(x) {
    return (mode === 'fight' && world && world.versus && x >= cw / 2) ? 1 : 0;
  }

  cv.addEventListener('pointerdown', (e) => {
    if (mode !== 'fight') return;
    audio();
    if (paused) return;
    pointers.set(e.pointerId, {
      side: sideFor(e.clientX),
      sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY,
      t: performance.now(), dragging: false,
    });
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  });
  cv.addEventListener('pointermove', (e) => {
    const pd = pointers.get(e.pointerId);
    if (!pd || mode !== 'fight' || paused) return;
    pd.x = e.clientX; pd.y = e.clientY;
    if (!pd.dragging && Math.hypot(pd.x - pd.sx, pd.y - pd.sy) > 18) pd.dragging = true;
    if (pd.dragging) {
      const p = world && world.fighters[pd.side];
      if (p && p.alive) {
        const w = screenToWorld(pd.x, pd.y);
        p.input.aim = { x: w.x, y: w.y };
        p.input.charge = Math.min(1, (performance.now() - pd.t) / 850);
      }
    }
  });
  function endPointer(e) {
    const pd = pointers.get(e.pointerId);
    if (!pd || mode !== 'fight') return;
    pointers.delete(e.pointerId);
    const p = world && world.fighters[pd.side];
    if (!p) return;
    const hold = (performance.now() - pd.t) / 1000;
    if (p.alive) {
      if (pd.dragging) {
        const aim = p.input.aim || screenToWorld(pd.x, pd.y);
        const h = p.pts[S.HAND_R];
        const dx = aim.x - h.x, dy = aim.y - h.y;
        const d = Math.hypot(dx, dy) || 1;
        const power = Math.max(0.15, Math.min(1, (hold - 0.12) / 0.75));
        p.pendingFling = { dx: dx / d, dy: dy / d, power };
        if (pd.side === 0 && !world.versus && !taughtFling) { taughtFling = true; store.set('taught', true); }
      } else if (hold < 0.3) {
        p.input.jump = true;
        if (pd.side === 0 && !world.versus && !taughtTap) { taughtTap = true; store.set('taughtTap', true); }
      }
    }
    p.input.charge = 0; p.input.aim = null;
  }
  cv.addEventListener('pointerup', endPointer);
  cv.addEventListener('pointercancel', endPointer);
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  const keys = {};
  const GAME_KEYS = ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  // keyboard fling: hold S (P1) / ArrowDown (P2, versus only) to charge, release to fling
  const keyCharge = { KeyS: null, ArrowDown: null };
  function keySideFor(code) {
    if (code === 'KeyS') return 0;
    if (code === 'ArrowDown') return (mode === 'fight' && world && world.versus) ? 1 : -1;
    return -1;
  }
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (mode === 'fight' && world) {
      if (e.code === 'Space' || e.code === 'KeyW') world.fighters[0].input.jump = true;
      if (e.code === 'ArrowUp' && world.versus) world.fighters[1].input.jump = true;
      const side = keySideFor(e.code);
      if (side >= 0 && !keyCharge[e.code]) keyCharge[e.code] = performance.now();
    }
    if (e.code === 'Enter' && mode === 'menu') startFight(false);
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    const side = keySideFor(e.code);
    const start = side >= 0 ? keyCharge[e.code] : null;
    if (side >= 0) keyCharge[e.code] = null;
    if (start && mode === 'fight' && world) {
      const f = world.fighters[side], en = world.fighters[1 - side];
      if (f && f.alive && en) {
        const h = f.pts[S.HAND_R], c = en.pts[S.CHEST];
        const dx = c.x - h.x, dy = c.y - h.y;
        const d = Math.hypot(dx, dy) || 1;
        const hold = (performance.now() - start) / 1000;
        const power = Math.max(0.15, Math.min(1, (hold - 0.12) / 0.75));
        f.pendingFling = { dx: dx / d, dy: dy / d, power };
      }
      if (f) { f.input.charge = 0; f.input.aim = null; }
    }
  });
  function keyMoveFor(side) {
    if (side === 1) {
      const l = keys.ArrowLeft, r = keys.ArrowRight;
      return (r ? 1 : 0) - (l ? 1 : 0) || null;
    }
    const l = keys.KeyA, r = keys.KeyD;
    if (world && world.versus) return (r ? 1 : 0) - (l ? 1 : 0) || null;
    const al = keys.ArrowLeft, ar = keys.ArrowRight;
    return ((r || ar) ? 1 : 0) - ((l || al) ? 1 : 0) || null;
  }

  /* ---------------- event wiring ---------------- */
  function showBanner(title, sub, chip) {
    ui.bannerTitle.textContent = title;
    ui.bannerSub.textContent = sub || '';
    ui.bannerChip.classList.toggle('hidden', !chip);
    ui.banner.classList.remove('show');
    void ui.banner.offsetWidth;                    // restart animation
    ui.banner.classList.add('show');
    const token = ++bannerToken;
    setTimeout(() => { if (token === bannerToken) ui.banner.classList.remove('show'); }, 1500);
  }

  function handleEvents() {
    for (const ev of world.events) {
      switch (ev.type) {
        case 'round': {
          cam.tzoom = 1; cam.tx = S.W / 2; cam.ty = S.FLOOR - 160;
          timeScale = 1; koSlowT = 0;
          if (mode === 'fight') {
            if (world.versus) {
              showBanner('DUEL ' + world.round + ' — FIRST TO ' + world.vsTarget,
                world.fighters[0].name + ' vs ' + world.fighters[1].name, false);
            } else {
              const tier = tierStyle();
              showBanner((world.tier > 1 ? tier.name + ' · ' : '') + 'DUEL ' + world.round + '/5',
                'VS ' + ev.name, ev.ghost ? '☠ REVENGE MATCH' : '');
            }
          }
          break;
        }
        case 'fight':
          if (mode === 'fight') sfx.bell();
          break;
        case 'fling':
          if (ev.id === 0 && mode === 'fight') sfx.whoosh();
          break;
        case 'jump':
          dust(ev.x, S.FLOOR, 4);
          if (ev.id === 0) sfx.jump();
          break;
        case 'hit': {
          const victim = world.fighters[ev.victim];
          sparks(ev.x, ev.y, victim ? victim.color : '#fff', ev.big ? 14 : 7, ev.big ? 1.3 : 0.8);
          floater(ev.x, ev.y - 18, '-' + ev.dmg, ev.big);
          shake = Math.min(16, shake + (ev.big ? 7 : 2.5));
          freeze = Math.max(freeze, ev.big ? 0.06 : 0.025);
          if (mode === 'fight') { sfx.hit(ev.big); buzz(ev.big ? [28, 30, 18] : 14); }
          break;
        }
        case 'pickup': {
          const f = world.fighters[ev.id];
          floater(ev.x, ev.y - 60, S.WEAPONS[ev.key].name + '!', true, S.WEAPONS[ev.key].color);
          sparks(ev.x, ev.y, S.WEAPONS[ev.key].color, 8, 0.7);
          if (mode === 'fight') { sfx.pickup(); buzz(20); }
          break;
        }
        case 'shatter':
          rubble(ev.x, ev.y, '#c9a15f');
          if (mode === 'fight') sfx.shatter();
          break;
        case 'drop': floater(ev.x, 140, 'WEAPON!', false, '#8fa3c8'); break;
        case 'land': dust(ev.x, S.FLOOR, 8); sfx.land(); break;
        case 'ko': {
          flashA = 0.75; shake = 15;
          koSlowT = 1.1;
          cam.tzoom = 1.3;
          cam.tx = ev.x; cam.ty = ev.y;
          confetti(ev.x, ev.y);
          sparks(ev.x, ev.y, '#ffffff', 20, 1.6);
          if (mode === 'fight') { sfx.ko(); buzz([60, 40, 90]); }
          break;
        }
        case 'over': {
          if (mode !== 'fight') break;
          const playerWon = ev.winner === 0;
          if (playerWon && !world.versus) {
            const def = world.enemyDef;
            if (!trophies.includes(def.name)) { trophies.push(def.name); if (trophies.length > 40) trophies.shift(); }
            store.set('trophies', trophies);
          }
          setTimeout(() => showResult(playerWon), 550);
          break;
        }
      }
    }
    world.events.length = 0;
  }

  function showResult(playerWon) {
    audio();
    const r = world.result;
    if (world.versus) {
      const wIdx = r.winner;
      const wName = world.fighters[wIdx].name;
      const wins = world.vsWins;
      ui.resTitle.style.color = world.fighters[wIdx].color;
      if (wins[wIdx] >= world.vsTarget) {
        ui.resTitle.textContent = wName + ' WINS THE MATCH!';
        ui.resSub.textContent = 'final score ' + wins[0] + ' – ' + wins[1] + ' · what a brawl';
        ui.btnNext.textContent = 'REMATCH ▶';
        sfx.win();
      } else {
        ui.resTitle.textContent = wName + ' TAKES THE DUEL';
        ui.resSub.textContent = wins[0] + ' – ' + wins[1] + ' · first to ' + world.vsTarget;
        ui.btnNext.textContent = 'NEXT DUEL ▶';
        sfx.bell();
      }
      ui.result.classList.remove('hidden');
      return;
    }
    const def = world.enemyDef;
    if (playerWon) {
      sfx.win();
      if (r.round >= 5) {
        ui.resTitle.textContent = 'RANK UP!';
        ui.resTitle.style.color = S.TIERS[world.tier % S.TIERS.length].line;
        ui.resSub.textContent = 'Ladder cleared — welcome to ' + S.TIERS[world.tier % S.TIERS.length].name + ' · 🏆 ' + trophies.length;
        ui.btnNext.textContent = 'CONTINUE ▶';
      } else {
        ui.resTitle.textContent = 'VICTORY';
        ui.resTitle.style.color = '#ffd23f';
        ui.resSub.textContent = 'you ragdolled ' + def.name + (def.ghost ? ' (revenge complete)' : '') + ' · 🏆 ' + trophies.length;
        ui.btnNext.textContent = 'NEXT DUEL ▶';
      }
    } else {
      sfx.lose();
      ui.resTitle.textContent = 'K.O.';
      ui.resTitle.style.color = '#ff5e7a';
      ui.resSub.textContent = def.name + ' folded you like laundry — ladder resets';
      ui.btnNext.textContent = 'REMATCH ▶';
    }
    ui.result.classList.remove('hidden');
  }

  /* ---------------- ui buttons ---------------- */
  function startFight(versus) {
    sfx.click();
    ui.menu.classList.add('hidden');
    ui.result.classList.add('hidden');
    newFight(versus);
  }
  $('btnFight').addEventListener('click', () => startFight(false));
  $('btnVersus').addEventListener('click', () => startFight(true));
  $('btnHow').addEventListener('click', () => { audio(); sfx.click(); ui.how.classList.remove('hidden'); });
  $('btnHowClose').addEventListener('click', () => { sfx.click(); ui.how.classList.add('hidden'); });
  $('btnNext').addEventListener('click', () => {
    sfx.click();
    ui.result.classList.add('hidden');
    const r = world.result;
    if (world.versus) {
      if (world.vsWins[r.winner] >= world.vsTarget) world.resetMatch();
      else { world.round++; world.startRound(); }
    } else if (r.winner === 0) {
      if (r.round >= 5) {                          // ladder cleared → next tier
        world.tier++; world.round = 1;
        bestTier = Math.max(bestTier, world.tier);
        store.set('best', bestTier);
      } else world.round = r.round + 1;
      world.startRound();
    } else {
      world.round = 1;                             // loss → ladder restarts
      world.startRound();
    }
  });
  $('btnMenu').addEventListener('click', () => {
    sfx.click();
    ui.result.classList.add('hidden');
    ui.menu.classList.remove('hidden');
    refreshMenu();
    newDemo();
  });
  $('btnSound').addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('sound', soundOn);
    $('btnSound').textContent = soundOn ? '🔊' : '🔇';
    if (master) master.gain.value = soundOn ? 0.42 : 0;
    audio(); sfx.click();
  });
  $('btnResume').addEventListener('click', () => { paused = false; ui.paused.classList.add('hidden'); audio(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'fight' && ui.result.classList.contains('hidden')) {
      paused = true; ui.paused.classList.remove('hidden');
    }
  });

  function refreshMenu() {
    const name = store.get('name', '');
    if (name) ui.nameInput.value = name;
    const name2 = store.get('name2', '');
    if (name2) ui.name2Input.value = name2;
    $('btnSound').textContent = soundOn ? '🔊' : '🔇';
    ui.menuStats.textContent = 'BEST TIER ' + bestTier + ' · 🏆 ' + trophies.length + ' FALLEN RIVALS';
  }

  /* install hint */
  setTimeout(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!standalone && !store.get('seenInstall', false)) {
      ui.toast.textContent = '⚡ Add RAGDUEL to your home screen for full-screen duels';
      ui.toast.classList.remove('hidden');
      store.set('seenInstall', true);
      setTimeout(() => ui.toast.classList.add('hidden'), 7000);
    }
  }, 2500);

  /* ---------------- drawing ---------------- */
  const LIMBS = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10]];

  function drawWeapon(x, y, angle, key, scaleW) {
    const wp = S.WEAPONS[key];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scaleW || 1, scaleW || 1);
    ctx.lineCap = 'round';
    if (key === 'broom') {
      ctx.strokeStyle = '#b98a4e'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(wp.len - 10, 0); ctx.stroke();
      ctx.fillStyle = '#e8c46a';
      ctx.fillRect(wp.len - 12, -7, 20, 14);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3;
      ctx.strokeRect(wp.len - 12, -7, 20, 14);
    } else if (key === 'cone') {
      ctx.fillStyle = '#ff7f2a';
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(wp.len, -3); ctx.lineTo(wp.len, 12); ctx.lineTo(0, 9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(wp.len * 0.45, -6, 6, 16);
    } else if (key === 'bench') {
      ctx.fillStyle = '#a4713d';
      ctx.fillRect(-4, -6, wp.len + 8, 13);
      ctx.fillStyle = '#7d5228';
      ctx.fillRect(-4, 3, wp.len + 8, 4);
    }
    ctx.restore();
  }

  function drawFighter(f) {
    const pts = f.pts;
    const flash = f.flash > 0;
    const col = flash ? '#ffffff' : f.color;

    // weapon (behind body)
    if (f.weapon !== 'fist') {
      const hand = pts[S.HAND_R], elbow = pts[5];
      const ang = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
      drawWeapon(hand.x, hand.y, ang, f.weapon, 1);
    }

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // glow pass
    ctx.globalAlpha = f.alive ? 0.25 : 0.08;
    ctx.strokeStyle = f.color; ctx.lineWidth = 13;
    ctx.beginPath();
    for (const [a, b] of LIMBS) { ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); }
    ctx.stroke();
    // core pass
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 6.5;
    ctx.beginPath();
    for (const [a, b] of LIMBS) { ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); }
    ctx.stroke();

    // head
    const hd = pts[0];
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(hd.x, hd.y, 11, 0, Math.PI * 2); ctx.fill();

    // face
    const fx = f.facing;
    ctx.strokeStyle = '#0b0f1a'; ctx.fillStyle = '#0b0f1a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    if (f.alive) {
      const ex = hd.x + fx * 3;
      ctx.beginPath(); ctx.arc(ex - 2.5, hd.y - 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 3.5, hd.y - 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();                                   // angry brows
      ctx.moveTo(ex - 5.5, hd.y - 6.5); ctx.lineTo(ex - 0.5, hd.y - 4.5);
      ctx.moveTo(ex + 6.5, hd.y - 6.5); ctx.lineTo(ex + 1.5, hd.y - 4.5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(exX(-4), exY(-4)); ctx.lineTo(exX(2), exY(2));
      ctx.moveTo(exX(2), exY(-4)); ctx.lineTo(exX(-4), exY(2));
      ctx.moveTo(exX(3), exY(-4)); ctx.lineTo(exX(9), exY(2));
      ctx.moveTo(exX(9), exY(-4)); ctx.lineTo(exX(3), exY(2));
      ctx.stroke();
    }
    function exX(o) { return hd.x + fx * 3 + o - 2.5; }
    function exY(o) { return hd.y - 2 + o; }

    // charge arc + aim arrow (player only)
    if (f.idx === 0 && mode === 'fight' && f.input.charge > 0 && f.alive) {
      const ch0 = pts[1];
      const c = f.input.charge;
      ctx.strokeStyle = 'hsl(' + Math.round(55 - c * 55) + ',100%,60%)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ch0.x, ch0.y, 26, -Math.PI / 2, -Math.PI / 2 + c * Math.PI * 2);
      ctx.stroke();
      if (f.input.aim) {
        const ax = f.input.aim.x, ay = f.input.aim.y;
        let dx = ax - ch0.x, dy = ay - ch0.y;
        const d = Math.hypot(dx, dy) || 1;
        const cl = Math.min(d, 300);
        dx = dx / d * cl; dy = dy / d * cl;
        const tx = ch0.x + dx, ty = ch0.y + dy;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 9]);
        ctx.beginPath(); ctx.moveTo(ch0.x + dx * 0.2, ch0.y + dy * 0.2); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(tx, ty, 7 + c * 9, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  function drawCrate() {
    const c = world.crate;
    if (!c) return;
    const wp = S.WEAPONS[c.key];
    if (!c.landed) {
      // parachute
      ctx.strokeStyle = 'rgba(200,214,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c.x - 16, c.y - 18); ctx.lineTo(c.x - 26, c.y - 44);
      ctx.moveTo(c.x + 16, c.y - 18); ctx.lineTo(c.x + 26, c.y - 44);
      ctx.stroke();
      ctx.fillStyle = wp.color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(c.x, c.y - 48, 26, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#232e4a';
    ctx.strokeStyle = wp.color; ctx.lineWidth = 2.5;
    const s = 17;
    ctx.beginPath(); ctx.roundRect(c.x - s, c.y - s, s * 2, s * 2, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = wp.color;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', c.x, c.y + 1);
  }

  function drawGroundWeapons() {
    for (const gw of world.groundWeapons) {
      drawWeapon(gw.x, gw.y + 6, -0.14 + Math.sin(world.time * 2 + gw.x) * 0.02, gw.key, 0.9);
    }
  }

  function drawWorldBg() {
    const t = tierStyle();
    const g = ctx.createLinearGradient(0, 0, 0, S.H);
    g.addColorStop(0, t.bg2); g.addColorStop(1, t.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(-40, -40, S.W + 80, S.H + 80);

    // diagonal grid
    ctx.strokeStyle = 'rgba(255,255,255,0.028)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -S.H; x < S.W + S.H; x += 64) {
      ctx.moveTo(x, -20); ctx.lineTo(x + S.H, S.H + 20);
    }
    ctx.stroke();

    // center glow
    const rg = ctx.createRadialGradient(S.W / 2, S.FLOOR - 180, 40, S.W / 2, S.FLOOR - 180, 560);
    rg.addColorStop(0, 'rgba(255,255,255,0.05)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, S.W, S.H);

    // floor
    ctx.fillStyle = t.floor;
    ctx.fillRect(-40, S.FLOOR, S.W + 80, S.H - S.FLOOR + 40);
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(-40, S.FLOOR); ctx.lineTo(S.W + 40, S.FLOOR); ctx.stroke();
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.moveTo(-40, S.FLOOR + 7); ctx.lineTo(S.W + 40, S.FLOOR + 7); ctx.stroke();
    ctx.globalAlpha = 1;

    // floor emblem
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('RAGDUEL', S.W / 2, S.FLOOR + 62);
  }

  function drawHud() {
    const p = world.fighters[0], e = world.fighters[1];
    ctx.textBaseline = 'alphabetic';

    const bar = (x, y, w, h, frac, color, alignRight) => {
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
      const fw = Math.max(0, w * Math.min(1, frac));
      ctx.fillStyle = color;
      ctx.beginPath();
      if (alignRight) ctx.roundRect(x + w - fw, y, fw, h, h / 2);
      else ctx.roundRect(x, y, fw, h, h / 2);
      ctx.fill();
    };

    // player (left)
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(p.name, 24, 30);
    bar(24, 38, 230, 11, p.hp / p.maxHp, p.alive ? '#ffd23f' : '#555');
    const wpl = S.WEAPONS[p.weapon];
    ctx.fillStyle = wpl.color;
    ctx.font = '800 11px system-ui, sans-serif';
    let wtxt = wpl.name + (wpl.dur !== Infinity ? ' ' + '▮'.repeat(Math.max(0, p.weaponHp)) : '');
    ctx.fillText(wtxt, 24, 66);

    // enemy (right)
    ctx.textAlign = 'right';
    ctx.fillStyle = e.color;
    ctx.font = '700 13px system-ui, sans-serif';
    const ghostTag = world.enemyDef && world.enemyDef.ghost ? ' ☠' : '';
    ctx.fillText(e.name + ghostTag, cw - 24, 30);
    bar(cw - 24 - 230, 38, 230, 11, e.hp / e.maxHp, e.alive ? e.color : '#555', true);
    const wpe = S.WEAPONS[e.weapon];
    ctx.fillStyle = wpe.color;
    ctx.font = '800 11px system-ui, sans-serif';
    let wtxte = S.WEAPONS[e.weapon].name + (wpe.dur !== Infinity ? ' ' + '▮'.repeat(Math.max(0, e.weaponHp)) : '');
    ctx.fillText(wtxte, cw - 24, 66);

    // center: mode label + pips
    const t = tierStyle();
    ctx.textAlign = 'center';
    if (world.versus) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.fillText('2P VERSUS', cw / 2, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('FIRST TO ' + world.vsTarget, cw / 2, 42);
      // win pips under each hp bar
      const pip = (x, filled, color, pulse) => {
        ctx.beginPath(); ctx.arc(x, 82, 5, 0, Math.PI * 2);
        if (filled) { ctx.fillStyle = color; ctx.fill(); }
        else {
          ctx.strokeStyle = color; ctx.lineWidth = 1.5;
          if (pulse) ctx.globalAlpha = 0.45 + 0.45 * Math.sin(world.time * 6);
          ctx.stroke(); ctx.globalAlpha = 1;
        }
      };
      for (let i = 0; i < world.vsTarget; i++) pip(28 + 16 + i * 18, i < world.vsWins[0], p.color, i === world.vsWins[0]);
      for (let i = 0; i < world.vsTarget; i++) pip(cw - 44 - i * 18, i < world.vsWins[1], e.color, i === world.vsWins[1]);
    } else {
      ctx.fillStyle = t.line;
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.fillText(t.name, cw / 2, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('DUEL ' + world.round + '/5', cw / 2, 42);
      for (let i = 0; i < 5; i++) {
        const px = cw / 2 - 44 + i * 22, py = 54;
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
        if (i < world.round - 1) { ctx.fillStyle = t.line; ctx.fill(); }
        else if (i === world.round - 1) {
          ctx.strokeStyle = t.line; ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(world.time * 6);
          ctx.stroke(); ctx.globalAlpha = 1;
        } else { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    }

    // crate incoming marker
    if (world.crate && !world.crate.landed) {
      const sx = ox + world.crate.x * scale;
      ctx.fillStyle = S.WEAPONS[world.crate.key].color;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText('▼', Math.max(30, Math.min(cw - 30, sx)), 80);
    }

    // hints (first round only)
    if (mode === 'fight' && world.phase === 'fight' && world.round === 1 && world.tier === 1) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(world.time * 4)) + ')';
      ctx.font = '700 14px system-ui, sans-serif';
      let msg = '';
      if (world.versus) {
        const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        msg = touch
          ? 'P1 DRAG LEFT HALF · P2 DRAG RIGHT HALF · TAP = JUMP'
          : 'P1: A/D + W · hold S = fling   |   P2: ◀ ▶ + ▲ · hold ▼ = fling';
      } else if (!taughtFling) {
        msg = 'HOLD & DRAG to fling · harder hold = harder hit';
      } else if (!taughtTap) {
        msg = 'QUICK TAP to jump';
      }
      if (msg) ctx.fillText(msg, cw / 2, ch - 28);
    }
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, cw, ch);

    // camera
    cam.x += (cam.tx - cam.x) * 0.08;
    cam.y += (cam.ty - cam.y) * 0.08;
    cam.zoom += (cam.tzoom - cam.zoom) * 0.08;
    const shx = (Math.random() - 0.5) * shake, shy = (Math.random() - 0.5) * shake;

    ctx.save();
    ctx.translate(ox + shx, oy + shy);
    ctx.scale(scale, scale);
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    drawWorldBg();
    drawGroundWeapons();
    drawCrate();

    // fighters (enemy behind player)
    const order = world.fighters[0].idx === 0 ? [1, 0] : [0, 1];
    for (const i of order) drawFighter(world.fighters[i]);

    // particles
    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.type === 'spark') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 9);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.type === 'rubble') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.4 - a * 0.4), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // damage floaters
    ctx.textAlign = 'center';
    for (const f of floaters) {
      ctx.globalAlpha = Math.min(1, f.life / f.max * 1.6);
      ctx.font = '900 ' + (f.big ? 26 : 17) + 'px system-ui, sans-serif';
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // name tags
    ctx.font = '800 15px system-ui, sans-serif';
    for (const f of world.fighters) {
      const hd = f.pts[0];
      ctx.fillStyle = f.color;
      ctx.globalAlpha = f.alive ? 0.85 : 0.3;
      ctx.fillText(f.name + (f.idx === 1 && world.enemyDef && world.enemyDef.ghost ? ' ☠' : ''), hd.x, hd.y - 24);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // ko flash
    if (flashA > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + flashA + ')';
      ctx.fillRect(0, 0, cw, ch);
    }

    // hud
    if (mode === 'fight') drawHud();
  }

  /* ---------------- main loop ---------------- */
  let last = performance.now();
  function frame(t) {
    const rdt = Math.min((t - last) / 1000, 0.05);
    last = t;

    if (!paused && world) {
      // ko slow-mo & hit-stop
      if (koSlowT > 0) { koSlowT -= rdt; timeScale = 0.3; } else timeScale = 1;
      if (freeze > 0) freeze -= rdt;
      else S.stepWorld(world, rdt * timeScale);
      if (mode === 'fight') {
        // keyboard movement per side (humans only — bots drive themselves)
        world.fighters[0].input.move = keyMoveFor(0);
        if (world.versus) world.fighters[1].input.move = keyMoveFor(1);
        // keyboard charge visuals (S / ArrowDown)
        for (const code in keyCharge) {
          if (!keyCharge[code]) continue;
          const side = keySideFor(code);
          const f = world.fighters[side], en = world.fighters[1 - side];
          if (f && en && f.alive) {
            f.input.charge = Math.min(1, (performance.now() - keyCharge[code]) / 850);
            const c = en.pts[S.CHEST];
            f.input.aim = { x: c.x, y: c.y };
          }
        }
      }
      handleEvents();
      stepFx(rdt);
      shake *= Math.pow(0.0008, rdt);
      if (shake < 0.05) shake = 0;
      flashA = Math.max(0, flashA - rdt * 2.2);
    }
    render();
    requestAnimationFrame(frame);
  }

  /* ---------------- boot ---------------- */
  refreshMenu();
  newDemo();
  requestAnimationFrame(frame);
})();
