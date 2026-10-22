/* ============================================================
   RAGDUEL.IO — simulation core (pure, no DOM)
   Verlet ragdoll stickmen, physics flings, weapons, bot AI.
   Loaded as a plain script (window.RAGDUEL_SIM) or CommonJS.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RAGDUEL_SIM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- world constants ---------- */
  const W = 1600, H = 900;            // logical arena size
  const FLOOR = 800, WALL = 70, CEIL = 30;
  const SDT = 1 / 120;                // physics substep
  const GRAV = 2400;                  // px/s^2
  const ITER = 6;                     // constraint iterations

  /* ---------- weapons ---------- */
  const WEAPONS = {
    fist:  { key: 'fist',  name: 'FISTS', len: 0,  mult: 0.7,  cd: 0.40, dur: Infinity, swing: 1.0,  color: '#aab6ff' },
    broom: { key: 'broom', name: 'BROOM', len: 62, mult: 1.25, cd: 0.50, dur: 5,        swing: 1.12, color: '#ff9f43' },
    cone:  { key: 'cone',  name: 'CONE',  len: 38, mult: 1.6,  cd: 0.56, dur: 4,        swing: 0.95, color: '#2ed573' },
    bench: { key: 'bench', name: 'BENCH', len: 76, mult: 2.1,  cd: 0.78, dur: 2,        swing: 0.80, color: '#ff6b81' },
  };
  const DROP_KEYS = ['broom', 'broom', 'cone', 'cone', 'bench'];

  /* ---------- flavour ---------- */
  const NAMES = ['noodle_lord', 'xX_Doodle_Xx', 'WobblyWizard', 'Sir_Flops', 'TwigTitan',
    'mr_snaps', 'PretzelPete', 'Boneless_Bob', 'LimbLord', 'Sk1ll_Shade',
    'GumbyGoblin', 'FloppyFred', 'joint_jester', 'RagdollRick', 'noodle_ninja',
    'Wiggles', 'SpaghettiRay', 'TwistyTina', 'noodle_knight', 'SirSwingsalot',
    'limb_zero', 'KnottyBoy', 'Gumbo_Limb', 'Floppino', 'WindmillJoe',
    'RubberLegs', 'Marionetta', 'StickneyCrane'];

  const TIERS = [
    { name: 'PARKING LOT', bg1: '#0b0f1a', bg2: '#151d33', floor: '#1c2438', line: '#ffd23f' },
    { name: 'NEON DOJO',   bg1: '#0d0a1a', bg2: '#1e1240', floor: '#251a44', line: '#e15eff' },
    { name: 'TOXIC YARD',  bg1: '#081409', bg2: '#0f2412', floor: '#14301b', line: '#4ade80' },
    { name: 'ROOFTOP 3AM', bg1: '#0a0e1c', bg2: '#101a38', floor: '#182447', line: '#38bdf8' },
    { name: 'THE VOID',    bg1: '#07070c', bg2: '#120d18', floor: '#1a1424', line: '#ff5e7a' },
  ];

  const ENEMY_COLORS = ['#ff5e7a', '#ff8f5e', '#e15eff', '#ff5252', '#ff9f1c', '#4ade80', '#38bdf8'];

  /* ---------- skeleton ---------- */
  // point indices: 0 head, 1 chest, 2 hip, 3 elbowL, 4 handL, 5 elbowR, 6 handR,
  //                7 kneeL, 8 footL, 9 kneeR, 10 footR
  const HEAD = 0, CHEST = 1, HIP = 2, HAND_L = 4, HAND_R = 6, FOOT_L = 8, FOOT_R = 10;
  const RADII = [11, 8, 8, 6, 7, 6, 7, 6, 7, 6, 7];
  const STICKS = [
    [0, 1, 24, 1], [1, 2, 30, 1],                       // spine
    [1, 3, 20, 1], [3, 4, 20, 1],                       // left arm
    [1, 5, 20, 1], [5, 6, 20, 1],                       // right arm
    [2, 7, 26, 1], [7, 8, 26, 1],                       // left leg
    [2, 9, 26, 1], [9, 10, 26, 1],                      // right leg
    [0, 2, 52, 0.6],                                    // soft spine support
  ];

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function addV(p, vx, vy) {        // add velocity (px/s) to a verlet point
    p.px -= vx * SDT;
    p.py -= vy * SDT;
  }
  function vel(p) {                 // velocity in px/s
    return { x: (p.x - p.px) / SDT, y: (p.y - p.py) / SDT };
  }

  /* ============================================================
     Fighter
     ============================================================ */
  function createFighter(opts) {
    const f = {
      idx: opts.idx | 0,
      name: opts.name || 'STICK',
      color: opts.color || '#ffd23f',
      isBot: !!opts.isBot,
      brain: null,
      hp: opts.hp || 100,
      maxHp: opts.hp || 100,
      dmgMult: opts.dmgMult || 1,
      alive: true,
      stun: 0, cooldown: 0, hitTimer: 0, jumpCd: 0, pickCd: 0, swingT: 0, flash: 0,
      facing: opts.facing || 1,
      weapon: 'fist', weaponHp: Infinity,
      charge: 0, aim: null, pendingFling: null,
      input: { move: null, jump: false, charge: 0, aim: null },
      pts: [],
    };
    if (f.isBot) f.brain = makeBrain(opts);
    resetFighter(f, opts.x);
    return f;
  }

  function resetFighter(f, x) {
    const y = FLOOR;
    const P = (dx, dy) => ({ x: x + dx, y: y + dy, px: x + dx, py: y + dy });
    f.pts = [
      P(0, -106), P(0, -82), P(0, -52),                    // head chest hip
      P(-7, -66), P(-9, -48), P(7, -66), P(9, -48),        // arms
      P(-12, -26), P(-13, 0), P(12, -26), P(13, 0),        // legs
    ];
    f.hp = f.maxHp;
    f.alive = true;
    f.stun = 0; f.cooldown = 0; f.hitTimer = 0; f.jumpCd = 0;
    f.pickCd = 0; f.swingT = 0; f.flash = 0;
    f.weapon = 'fist'; f.weaponHp = Infinity;
    f.charge = 0; f.aim = null; f.pendingFling = null;
    f.input.move = null; f.input.jump = false; f.input.charge = 0; f.input.aim = null;
    if (f.brain) { f.brain.st = 'seek'; f.brain.t = rnd(0.8, 1.6); }
  }

  /* pose targets relative to hip, in world orientation (x already facing-adjusted) */
  function poseTarget(i, f, chg, swing) {
    const fx = f.facing;
    switch (i) {
      case HEAD: return { x: 0, y: -54, k: 100 };
      case CHEST: return { x: 0, y: -30, k: 130 };
      case 3: return chg ? { x: -fx * 9, y: -42, k: 60 } : { x: -7, y: -14, k: 45 };
      case HAND_L: return chg ? { x: -fx * 11, y: -60, k: 80 } : { x: -9, y: 4, k: 40 };
      case 5: return chg ? { x: fx * 7, y: -48, k: 60 } : { x: 7, y: -14, k: 45 };
      case HAND_R:
        if (swing) return { x: fx * 30, y: -38, k: 90 };
        return chg ? { x: fx * 9, y: -66, k: 80 } : { x: 9, y: 4, k: 40 };
      case 7: return { x: -12, y: 26, k: 70 };
      case FOOT_L: return { x: -13, y: 52, k: 60 };
      case 9: return { x: 12, y: 26, k: 70 };
      case FOOT_R: return { x: 13, y: 52, k: 60 };
    }
    return { x: 0, y: 0, k: 0 };
  }

  /* ============================================================
     Bot brain — produces the same input struct as the player
     ============================================================ */
  function makeBrain(opts) {
    return {
      st: 'seek', t: rnd(0.8, 1.6),
      windup: opts.reaction != null ? opts.reaction : 0.5,
      acc: opts.accuracy != null ? opts.accuracy : 0.8,
      aggro: opts.aggression != null ? opts.aggression : 0.7,
      jump: opts.jumpiness != null ? opts.jumpiness : 0.3,
    };
  }

  function nearestPickup(f, w) {
    let best = null, bd = 480;
    const hx = f.pts[HIP].x;
    const consider = (x, key) => {
      const upgrade = f.weapon === 'fist' ||
        (key === 'bench' && f.weapon !== 'bench') ||
        (key === 'cone' && f.weapon === 'broom');
      if (!upgrade) return;
      const d = Math.abs(x - hx);
      if (d < bd) { bd = d; best = { x, key }; }
    };
    if (w.crate && w.crate.landed) consider(w.crate.x, w.crate.key);
    for (const gw of w.groundWeapons) consider(gw.x, gw.key);
    return best;
  }

  function brainUpdate(f, w, dt) {
    const b = f.brain;
    if (!b) return;
    const e = w.fighters[1 - f.idx];
    if (w.phase !== 'fight' || !f.alive) {
      f.input.charge = 0; f.input.move = null; return;
    }
    b.t -= dt;
    const hx = f.pts[HIP].x, ex = e.pts[HIP].x;
    const dx = ex - hx, adx = Math.abs(dx);
    const range = 120 + WEAPONS[f.weapon].len * 0.9;

    // fetch a pickup only when it's safe (or right there), and give up eventually
    b.fetchBan = Math.max(0, (b.fetchBan || 0) - dt);
    const gw = b.fetchBan > 0 ? null : nearestPickup(f, w);
    if (gw) {
      const d = Math.abs(gw.x - hx);
      if (d < 150 || adx > 260) {
        if (!b.fetching) { b.fetching = true; b.fetchT = 0; }
        b.fetchT += dt;
        if (b.fetchT > 3.5) { b.fetching = false; b.fetchBan = 6; }
        f.input.charge = 0;
        f.input.move = d < 26 ? 0 : clamp((gw.x - hx) / 70, -1, 1);
        return;
      }
    }
    b.fetching = false;
    if (f.stun > 0.2) { b.st = 'seek'; b.t = Math.max(b.t, 0.3); }

    switch (b.st) {
      case 'seek': {
        f.input.charge = 0;
        f.input.move = null;                       // auto-approach keeps duel range
        if (b.jump > 0 && f.jumpCd <= 0 && Math.random() < b.jumpiness * dt * 1.5) {
          f.input.jump = true;
        }
        const standing = f.pts[HIP].y < FLOOR - 34 || b.t < -3;   // ...or desperate
        if (f.cooldown <= 0 && adx < range + 70 && b.t <= 0 && Math.random() < b.aggro && standing) {
          b.st = 'windup';
          b.t = b.windup * rnd(0.85, 1.3);
        }
        break;
      }
      case 'windup': {
        const tx = e.pts[CHEST].x + (1 - b.acc) * rnd(-140, 140);
        const ty = e.pts[CHEST].y + (1 - b.acc) * rnd(-90, 70);
        f.input.aim = { x: tx, y: ty };
        f.input.charge = clamp(1 - b.t / Math.max(0.2, b.windup), 0, 1);
        if (b.t <= 0) {
          const h = f.pts[HAND_R];
          const ax = tx - h.x, ay = ty - h.y;
          const d = Math.hypot(ax, ay) || 1;
          f.pendingFling = { dx: ax / d, dy: ay / d, power: clamp(0.5 + 0.5 * b.aggro + rnd(-0.1, 0.1), 0.2, 1) };
          f.input.charge = 0;
          b.st = 'recover';
          b.t = rnd(0.25, 0.7);
        }
        break;
      }
      case 'recover': {
        f.input.charge = 0;
        f.input.move = dx > 0 ? -0.5 : 0.5;        // back off after a swing
        if (b.t <= 0) { b.st = 'seek'; b.t = b.windup * rnd(0.9, 1.8); }
        break;
      }
    }
  }

  /* ============================================================
     World
     ============================================================ */
  function createWorld(opts) {
    opts = opts || {};
    const w = {
      demo: !!opts.demo,
      versus: !!opts.versus,
      playerName: opts.playerName || 'YOU',
      fighters: [],
      phase: 'intro', phaseT: 0,
      time: 0, acc: 0,
      round: 1, tier: 1, runWins: 0,
      vsWins: [0, 0], vsTarget: 3,
      crate: null, crateT: 6,
      groundWeapons: [],
      events: [],
      usedNames: new Set(),
      trophies: Array.isArray(opts.trophies) ? opts.trophies : [],
      result: null,
      koCount: 0,
    };

    const p1name = w.versus ? ((opts.vsNames && opts.vsNames[0]) || 'P1') : w.playerName;
    const player = createFighter({
      idx: 0, name: p1name, color: '#ffd23f', x: 330, facing: 1, hp: 100,
      isBot: w.demo && !w.versus,
      reaction: 0.38, accuracy: 0.82, aggression: 0.85, jumpiness: 0.45,
    });
    if (w.versus) {
      const p2 = createFighter({
        idx: 1, name: (opts.vsNames && opts.vsNames[1]) || 'P2', color: '#ff5e7a',
        x: 1270, facing: -1, hp: 100,
      });
      w.fighters = [player, p2];
    } else {
      w.fighters = [player, null];
    }

    w.startRound = function () { startRound(w); };
    w.resetMatch = function () {
      w.vsWins = [0, 0];
      w.round = 1;
      w.runWins = 0;
      startRound(w);
    };
    w.startRound();
    return w;
  }

  function chooseName(w) {
    // occasionally resurrect a defeated rival (revenge match)
    if (w.trophies.length && Math.random() < 0.3) return pick(w.trophies);
    const avail = NAMES.filter((n) => !w.usedNames.has(n) && n !== w.playerName);
    const name = avail.length ? pick(avail) : pick(NAMES) + '_' + ((Math.random() * 90 + 10) | 0);
    w.usedNames.add(name);
    if (w.usedNames.size > 40) w.usedNames.delete(w.usedNames.values().next().value);
    return name;
  }

  function makeOpponent(w) {
    const t = w.tier, r = w.round;
    const name = chooseName(w);
    if (w.demo) {
      // menu backdrop fights: snappy, aggressive, self-resetting
      return { name, ghost: false, color: pick(ENEMY_COLORS), hp: 80, dmgMult: 1.5,
        reaction: 0.3, accuracy: 0.85, aggression: 0.9, jumpiness: 0.5 };
    }
    return {
      name,
      ghost: w.trophies.includes(name),
      color: ENEMY_COLORS[(r - 1 + (t - 1) * 2) % ENEMY_COLORS.length],
      hp: Math.round(88 + t * 7 + r * 5),
      dmgMult: +(0.85 + t * 0.09 + r * 0.03).toFixed(2),
      reaction: +Math.max(0.16, 0.6 - t * 0.055 - r * 0.035).toFixed(2),
      accuracy: +Math.min(0.97, 0.5 + t * 0.08 + r * 0.05).toFixed(2),
      aggression: +Math.min(0.95, 0.45 + t * 0.07 + r * 0.06).toFixed(2),
      jumpiness: +Math.min(0.8, 0.15 + t * 0.1).toFixed(2),
    };
  }

  function startRound(w) {
    w.phase = 'intro'; w.phaseT = 0;
    w.crate = null;
    w.crateT = rnd(5, 9);
    w.groundWeapons.length = 0;
    w.result = null;

    const p = w.fighters[0];
    p.idx = 0;
    resetFighter(p, 330);
    p.facing = 1;

    if (w.versus) {
      // 2P local versus: both fighters human, equal stats, palette rotates each duel
      w.tier = ((w.round - 1) % TIERS.length) + 1;
      const e = w.fighters[1];
      resetFighter(e, 1270);
      e.facing = -1;
      w.enemyDef = { name: e.name, ghost: false };
      w.events.push({ type: 'round', round: w.round, tier: w.tier, name: p.name + ' vs ' + e.name, vs: true });
      return;
    }

    const def = makeOpponent(w);
    const e = createFighter({
      idx: 1, name: def.name, color: def.color, x: 1270, facing: -1,
      hp: def.hp, dmgMult: def.dmgMult, isBot: true,
      reaction: def.reaction, accuracy: def.accuracy,
      aggression: def.aggression, jumpiness: def.jumpiness,
    });
    w.fighters[1] = e;
    w.enemyDef = def;

    w.events.push({ type: 'round', round: w.round, tier: w.tier, name: def.name, ghost: def.ghost });
  }

  /* ---------- fling ---------- */
  function doFling(f, w) {
    const p = f.pendingFling;
    f.pendingFling = null;
    if (!p || !f.alive || f.cooldown > 0 || w.phase !== 'fight') return;
    const wp = WEAPONS[f.weapon];
    const sp = (520 + 1450 * p.power) * wp.swing;
    // the classic ragdoll move: launch your whole body fist-first
    addV(f.pts[HAND_R], p.dx * sp, p.dy * sp);
    addV(f.pts[HAND_L], p.dx * sp * 0.8, p.dy * sp * 0.8);
    addV(f.pts[HIP], p.dx * sp * 0.5, p.dy < 0 ? p.dy * sp * 0.3 : 0);
    addV(f.pts[CHEST], p.dx * sp * 0.45, p.dy < 0 ? p.dy * sp * 0.25 : 0);
    addV(f.pts[HEAD], p.dx * sp * 0.3, p.dy < 0 ? p.dy * sp * 0.2 : 0);
    f.cooldown = wp.cd * (0.9 + 0.2 * (1 - p.power));
    f.swingT = 0.2;
    w.events.push({ type: 'fling', id: f.idx, x: f.pts[CHEST].x, y: f.pts[CHEST].y });
  }

  /* ---------- combat ---------- */
  function weaponTip(f) {
    if (f.weapon === 'fist') return null;
    const wp = WEAPONS[f.weapon];
    const hand = f.pts[HAND_R], elbow = f.pts[5];
    let dx = hand.x - elbow.x, dy = hand.y - elbow.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    return { x: hand.x + dx * wp.len, y: hand.y + dy * wp.len, hx: hand.x, hy: hand.y };
  }

  function distSegPoint(ax, ay, bx, by, px, py) {
    const abx = bx - ax, aby = by - ay;
    const t = clamp(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1), 0, 1);
    return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
  }

  function applyHit(w, a, b, q, relSpeed, mult) {
    const wp = WEAPONS[a.weapon];
    const head = q === b.pts[HEAD];
    let dmg = relSpeed * 0.015 * mult * a.dmgMult * (head ? 1.6 : 1);
    dmg = clamp(dmg, 3, 36);
    b.hp -= dmg;
    b.stun = Math.max(b.stun, dmg > 15 ? 0.5 : 0.18);
    b.flash = 1;

    const hand = a.pts[HAND_R];
    let nx = q.x - hand.x, ny = q.y - hand.y;
    const nd = Math.hypot(nx, ny) || 1;
    nx /= nd; ny /= nd;
    addV(q, nx * (50 + dmg * 8), ny * (50 + dmg * 8) - dmg * 6);
    addV(b.pts[CHEST], nx * dmg * 4, -dmg * 2.5 - (dmg > 18 ? 120 : 0));

    if (wp.dur !== Infinity) {
      a.weaponHp--;
      if (a.weaponHp <= 0) {
        w.groundWeapons.push({ x: a.pts[HIP].x, y: FLOOR - 8, key: a.weapon });
        a.weapon = 'fist';
        w.events.push({ type: 'shatter', x: q.x, y: q.y, id: a.idx });
      }
    }
    a.hitTimer = 0.14;
    w.events.push({ type: 'hit', x: q.x, y: q.y, dmg: Math.round(dmg), big: dmg > 16, victim: b.idx, by: a.idx });

    if (b.hp <= 0 && b.alive) {
      b.hp = 0; b.alive = false;
      w.phase = 'ko'; w.phaseT = 0; w.koCount++;
      w.koWinner = a.idx;
      w.events.push({ type: 'ko', winner: a.idx, loser: b.idx, x: q.x, y: q.y });
    }
  }

  function checkHits(w, a, b) {
    if (w.phase !== 'fight' || !a.alive || !b.alive || a.hitTimer > 0) return;
    const wp = WEAPONS[a.weapon];
    const tip = weaponTip(a);

    if (tip) {
      const vh = vel(a.pts[HAND_R]);
      for (let i = 0; i < b.pts.length; i++) {
        const q = b.pts[i];
        const d = distSegPoint(tip.hx, tip.hy, tip.x, tip.y, q.x, q.y);
        if (d < RADII[i] + 8) {
          const vq = vel(q);
          const rel = Math.hypot(vh.x - vq.x, vh.y - vq.y) * 1.25;
          if (rel > 380) { applyHit(w, a, b, q, rel, wp.mult); return; }
        }
      }
    } else {
      for (const hi of [HAND_L, HAND_R]) {
        const hand = a.pts[hi];
        const vh = vel(hand);
        for (let i = 0; i < b.pts.length; i++) {
          const q = b.pts[i];
          if (Math.hypot(q.x - hand.x, q.y - hand.y) < RADII[i] + 7) {
            const vq = vel(q);
            const rel = Math.hypot(vh.x - vq.x, vh.y - vq.y);
            if (rel > 500) { applyHit(w, a, b, q, rel, wp.mult); return; }
          }
        }
      }
    }
  }

  /* ---------- pickups ---------- */
  function equip(w, f, key) {
    if (f.weapon !== 'fist') {
      w.groundWeapons.push({ x: f.pts[HIP].x, y: FLOOR - 8, key: f.weapon });
    }
    f.weapon = key;
    f.weaponHp = WEAPONS[key].dur;
    f.pickCd = 0.5;
    w.events.push({ type: 'pickup', id: f.idx, key, x: f.pts[HIP].x, y: f.pts[HIP].y });
  }

  function updatePickups(w, h) {
    // crate falling / landed
    const c = w.crate;
    if (c && !c.landed) {
      c.vy += 500 * h;
      c.y += c.vy * h;
      c.x += Math.sin(w.time * 3 + c.seed) * 12 * h;
      if (c.y >= FLOOR - 26) {
        c.y = FLOOR - 26; c.landed = true;
        w.events.push({ type: 'land', x: c.x, y: c.y });
      }
    }
    if (w.phase === 'fight' && !w.crate) {
      w.crateT -= h;
      if (w.crateT <= 0) {
        w.crate = { x: rnd(300, 1300), y: -40, vy: 0, key: pick(DROP_KEYS), landed: false, seed: Math.random() * 10 };
        w.events.push({ type: 'drop', x: w.crate.x });
        w.crateT = rnd(9, 15);
      }
    }

    // pickup by touch
    if (w.crate && w.crate.landed) {
      for (const f of w.fighters) {
        if (!f.alive || f.pickCd > 0) continue;
        for (const p of f.pts) {
          if (Math.hypot(p.x - w.crate.x, p.y - w.crate.y) < 40) {
            equip(w, f, w.crate.key);
            w.crate = null;
            w.crateT = rnd(9, 15);
            return;
          }
        }
      }
    }
    for (let gi = w.groundWeapons.length - 1; gi >= 0; gi--) {
      const gw = w.groundWeapons[gi];
      for (const f of w.fighters) {
        if (!f.alive || f.pickCd > 0) continue;
        for (const p of f.pts) {
          if (Math.hypot(p.x - gw.x, p.y - gw.y) < 36) {
            equip(w, f, gw.key);
            w.groundWeapons.splice(gi, 1);
            break;
          }
        }
        if (!w.groundWeapons.includes(gw)) break;
      }
    }
  }

  /* ---------- physics ---------- */
  function stepFighter(f, w, h) {
    // timers
    f.stun = Math.max(0, f.stun - h);
    f.cooldown = Math.max(0, f.cooldown - h);
    f.hitTimer = Math.max(0, f.hitTimer - h);
    f.jumpCd = Math.max(0, f.jumpCd - h);
    f.pickCd = Math.max(0, f.pickCd - h);
    f.swingT = Math.max(0, f.swingT - h);
    f.flash = Math.max(0, f.flash - h * 3);

    doFling(f, w);

    const e = w.fighters[1 - f.idx];
    const hip = f.pts[HIP];
    const hx = hip.x;

    // facing (only when conscious)
    if (f.alive && f.stun <= 0 && e) {
      f.facing = (e.pts[HIP].x - hx) >= 0 ? 1 : -1;
    }

    // jump
    if (f.input.jump) {
      f.input.jump = false;
      if (f.alive && f.jumpCd <= 0 && w.phase === 'fight' &&
          (f.pts[FOOT_L].y > FLOOR - 10 || f.pts[FOOT_R].y > FLOOR - 10)) {
        for (const p of f.pts) addV(p, 0, -950);
        f.jumpCd = 0.9;
        w.events.push({ type: 'jump', id: f.idx, x: hx, y: FLOOR });
      }
    }

    // movement (manual or auto-approach)
    let mv = f.input.move;
    if (mv == null) {
      mv = 0;
      if (w.phase === 'fight' && f.alive && e) {
        const dx = e.pts[HIP].x - hx;
        const range = 120 + WEAPONS[f.weapon].len * 0.9;
        if (Math.abs(dx) > range) mv = Math.sign(dx);
        else if (Math.abs(dx) < range * 0.55) mv = -Math.sign(dx) * 0.6;
      }
    }
    if (w.phase !== 'fight') mv = 0;
    if (mv !== 0 && f.alive) {
      const CAPW = 300, ACC = 2600;
      const cur = (hip.x - hip.px) / h;
      const target = mv * CAPW;
      const nv = cur + clamp(target - cur, -ACC * h, ACC * h);
      const d = nv - cur;
      addV(hip, d, 0);
      addV(f.pts[CHEST], d * 0.6, 0);
      addV(f.pts[HEAD], d * 0.35, 0);
      addV(f.pts[FOOT_L], d * 0.5, 0);
      addV(f.pts[FOOT_R], d * 0.5, 0);
    }

    // integrate + muscles
    const chg = clamp(f.input.charge || 0, 0, 1);
    const mus = f.alive ? (f.stun > 0 ? 0.12 : 1) : 0;
    const grounded = f.pts[FOOT_L].y > FLOOR - 24 || f.pts[FOOT_R].y > FLOOR - 24;
    // pose root: anchored to standing height while grounded (lets a knocked-down
    // fighter fold its legs back under itself and rise), free-floating in air
    const rootY = grounded ? FLOOR - 52 : hip.y;
    const feetMidX = (f.pts[FOOT_L].x + f.pts[FOOT_R].x) / 2;
    for (let i = 0; i < f.pts.length; i++) {
      const p = f.pts[i];
      let ax = 0, ay = 0;
      if (mus > 0) {
        const T = poseTarget(i, f, chg, f.swingT > 0);
        ax = (hip.x + T.x - p.x) * T.k * mus;
        ay = (rootY + T.y - p.y) * T.k * mus;
        if (i === HIP && grounded) {
          // stand-up muscle: hold the hip at standing height over the feet
          ax += (feetMidX - p.x) * 120 * mus;
          ay += (FLOOR - 52 - p.y) * 300 * mus;
        }
      }
      const vx = (p.x - p.px) * 0.999;
      const vy = (p.y - p.py) * 0.999;
      p.px = p.x; p.py = p.y;
      p.x += vx + ax * h * h;
      p.y += vy + (GRAV + ay) * h * h;
    }

    // constraints
    for (let it = 0; it < ITER; it++) {
      for (const [ia, ib, len, k] of STICKS) {
        const p1 = f.pts[ia], p2 = f.pts[ib];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const diff = ((d - len) / d) * 0.5 * k;
        p1.x += dx * diff; p1.y += dy * diff;
        p2.x -= dx * diff; p2.y -= dy * diff;
      }
    }

    // collisions
    for (let i = 0; i < f.pts.length; i++) {
      const p = f.pts[i], r = RADII[i];
      if (p.y > FLOOR - r) {                     // floor
        const vy = p.y - p.py;
        p.y = FLOOR - r;
        p.py = p.y + vy * 0.35;
        const fr = Math.exp(-8 * h);             // friction: ~8/s decay rate
        p.px = p.x - (p.x - p.px) * fr;
      }
      if (p.y < CEIL + r) { p.y = CEIL + r; p.py = p.y; }
      if (p.x < WALL + r) { p.x = WALL + r; p.px = p.x; }
      if (p.x > W - WALL - r) { p.x = W - WALL - r; p.px = p.x; }
    }
  }

  function repelFighters(w) {
    const [a, b] = w.fighters;
    if (!a || !b) return;
    for (const p of a.pts) {
      for (const q of b.pts) {
        const dx = q.x - p.x, dy = q.y - p.y;
        const d2 = dx * dx + dy * dy;
        const min = RADII[a.pts.indexOf(p)] + RADII[b.pts.indexOf(q)];
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = (min - d) / d * 0.25;
          p.x -= dx * push; p.y -= dy * push;
          q.x += dx * push; q.y += dy * push;
        }
      }
    }
  }

  function substep(w, h) {
    for (const f of w.fighters) stepFighter(f, w, h);
    repelFighters(w);
    checkHits(w, w.fighters[0], w.fighters[1]);
    checkHits(w, w.fighters[1], w.fighters[0]);
    updatePickups(w, h);
  }

  function stepWorld(w, dt) {
    if (w.phase === 'over' && !w.demo) return;
    dt = Math.min(dt, 0.05);
    w.time += dt;
    w.phaseT += dt;

    // phase machine
    if (w.phase === 'intro' && w.phaseT >= 1.5) {
      w.phase = 'fight'; w.phaseT = 0;
      w.events.push({ type: 'fight' });
    } else if (w.phase === 'ko' && w.phaseT >= 2.2) {
      w.phase = 'over'; w.phaseT = 0;
      const winner = w.fighters.find((f) => f.idx === w.koWinner);
      if (winner && !w.result) {
        w.result = { winner: winner.idx, round: w.round, tier: w.tier };
        if (w.versus) w.vsWins[winner.idx]++;
        else if (winner.idx === 0) w.runWins++;
        w.events.push({ type: 'over', winner: winner.idx, round: w.round, tier: w.tier });
      }
    } else if (w.phase === 'over' && w.demo && w.phaseT > 2) {
      w.startRound();
    }

    // brains (once per frame)
    for (const f of w.fighters) {
      f.input.charge = f.input.charge || 0;
      if (f.brain) brainUpdate(f, w, dt);
    }

    // physics substeps
    w.acc += dt;
    let n = 0;
    while (w.acc >= SDT && n < 8) { substep(w, SDT); w.acc -= SDT; n++; }
    if (n === 8) w.acc = 0;
  }

  return {
    createWorld, stepWorld,
    WEAPONS, DROP_KEYS, NAMES, TIERS, ENEMY_COLORS,
    W, H, FLOOR, WALL,
    HEAD, CHEST, HIP, HAND_L, HAND_R,
  };
});
