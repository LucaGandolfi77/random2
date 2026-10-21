/*
 * PIXEL CUP '96 — game model
 * ---------------------------
 * Everything that is a rule, a number or a decision lives here: pitch
 * geometry, ball physics, player control, the AI of both teams, the match
 * clock, the cup bracket and the penalty shoot-out.
 *
 * There is no DOM in this file and there is no canvas. It is loaded twice:
 * once by the browser (as `window.PixelCupCore`) and once by the Node test
 * harness (as `module.exports`). One copy of the rules means the tests
 * exercise the game the player actually plays.
 *
 * Coordinate system
 *   x  along the length of the pitch, -LEN/2 .. +LEN/2
 *   z  across the pitch,          -WID/2 .. +WID/2
 *   y  up; 0 is the grass
 * The human team always attacks towards +x, so "up" on the stick is always
 * "forward" and the camera never has to be inverted to explain itself.
 */

(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelCupCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Tunables                                                            */
  /* ------------------------------------------------------------------ */

  var C = {
    PITCH_LEN: 56,
    PITCH_WID: 36,
    GOAL_W: 9,
    GOAL_H: 3.2,
    GOAL_DEPTH: 3,
    GOAL_LINE: 28,          // half the length
    TOUCH_LINE: 18,         // half the width

    HALF_SECONDS: 90,       // real seconds per half
    GRAVITY: 20,
    BALL_R: 0.48,
    BOUNCE: 0.52,
    GROUND_FRICTION: 2.1,    // per second, exponential
    AIR_DRAG: 0.25,

    CONTROL_R: 1.75,        // how close a player must be to take the ball
    DRIBBLE_OFFSET: 1.0,
    KICK_LOCK: 0.22,        // seconds the ball cannot be re-taken after a kick

    PLAYER_SPEED: 8.2,
    SPRINT_MULT: 1.52,
    GK_SPEED: 9.4,
    PLAYER_ACCEL: 46,
    PLAYER_FRICTION: 9,

    SHOT_BASE: 15,
    SHOT_POWER: 21,
    PASS_BASE: 12,
    PASS_POWER: 12,
    LOFT: 7.2,

    /* A cross is a different thing from a lofted pass: it goes right
       up, over the top of the defence, and lands in the box. */
    CROSS_LIFT: 11.6,
    CROSS_SPEED: 15,
    HEADER_MIN_Y: 1.15,   /* above this the ball is headed, not carried */
    HEADER_MAX_Y: 4.6,
    HEADER_RANGE: 2.1,
    CLEARANCE_RANGE: 2.6,

    STAMINA_MAX: 100,
    STAMINA_DRAIN: 26,
    STAMINA_REGEN: 15,

    CHARGING_TIME: 0.85,
    TACKLE_RANGE: 1.9,
    TACKLE_WINDOW: 0.22,
    SLIDE_SPEED: 17,
    SLIDE_TIME: 0.42,
    FOUL_CHANCE: 0.18,

    CPU_REACTION: 0.16,
    CPU_PASS_RANGE: 26,
    CPU_SHOOT_RANGE: 15,
    CPU_AGGRESSION: 0.62,
    SHOT_COOLDOWN: 2.4,
    SHIELD_TIME: 0.55,

    PEN_ROUNDS: 5,
    PEN_AIM_SPEED: 1.55,    // radians per second
    PEN_POWER_SPEED: 1.15,
  };

  /* Formation in team-local coordinates: x forward, z lateral. */
  var FORMATION = [
    { role: "GK",  x: -27.0, z: 0 },
    { role: "DEF", x: -13.0, z: -9 },
    { role: "DEF", x: -12.0, z: 9 },
    { role: "MID", x: 1.0,  z: 2 },
    { role: "FWD", x: 14.0, z: 0 },
  ];

  /*
   * A squad is ten players: two keepers and eight outfielders. The
   * attributes are derived from the club's rating with a seeded spread,
   * so the best five on the pitch are about as good as the club was
   * before anybody had attributes at all.
   */
  var SURNAMES = [
    "ROSSI", "FERRARI", "ESPOSITO", "RUSSO", "BIANCHI", "ROMANO", "COLOMBO",
    "RICCI", "MARINO", "GRECO", "BRUNO", "GALLO", "CONTI", "MANCINI", "COSTA",
    "GIORDANO", "RIZZO", "LOMBARDI", "MORETTI", "BARBIERI", "FONTANA",
    "SANTORO", "MARIANI", "RINALDI", "CARUSO", "FERRARA", "MARTINI", "LEONE",
    "LONGO", "GENTILE", "MARTINELLI", "VITALE", "LOMBARDO", "SERRA",
    "COPPOLA", "PALMIERI", "MONTI", "MANCUSO", "LOCATELLI", "DE ROSA",
  ];

  var SQUAD_ROLES = ["GK", "GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD"];

  function attrValue(p) {
    if (p.role === "GK") return p.power * 0.35 + p.technique * 0.65;
    return p.pace * 0.4 + p.power * 0.3 + p.technique * 0.3;
  }

  /* The attributes bend the behaviour by about a tenth either way, which
     is enough to matter and small enough not to wreck the balance. */
  function paceMul(p) { return 0.94 + (p.pace - 40) * 0.0022; }
  function powerMul(p) { return 0.94 + (p.power - 40) * 0.0022; }
  function techMul(p) { return 0.94 + (p.technique - 40) * 0.0022; }

  var SQUAD_CACHE = {};

  function makeSquad(team) {
    if (SQUAD_CACHE[team.id]) return SQUAD_CACHE[team.id];
    var seed = hashSeed(hashSeed(team.rating, 17), hashSeed(0, 7) ^ (team.id.length * 131));
    var rng = makeRng(seed);
    var squad = [];
    for (var i = 0; i < SQUAD_ROLES.length; i++) {
      var base = team.rating + (rng() - 0.5) * 26;
      squad.push({
        id: team.id + "-" + i,
        name: SURNAMES[Math.floor(rng() * SURNAMES.length)],
        role: SQUAD_ROLES[i],
        pace: Math.round(clamp(base + (rng() - 0.5) * 16, 30, 99)),
        power: Math.round(clamp(base + (rng() - 0.5) * 18, 30, 99)),
        technique: Math.round(clamp(base + (rng() - 0.5) * 20, 30, 99)),
        num: i + 1,
      });
    }
    /* The best player wears the lowest number, and a keeper wears 1. */
    squad.sort(function (a, b) { return attrValue(b) - attrValue(a); });
    var num = 2, keepers = 0;
    for (var j = 0; j < squad.length; j++) {
      if (squad[j].role === "GK") {
        squad[j].num = keepers === 0 ? 1 : 12;
        keepers++;
      } else {
        squad[j].num = num++;
      }
    }
    SQUAD_CACHE[team.id] = squad;
    return squad;
  }

  /*
   * The best five: the best keeper, then the best player for each
   * outfield slot. A player whose role does not match the slot can
   * still be picked, but only when nobody better is left.
   */
  function autoSelection(squad) {
    var rest = squad.slice();
    var out = [];
    var gk = null;
    for (var i = 0; i < rest.length; i++) {
      if (rest[i].role === "GK" && (!gk || attrValue(rest[i]) > attrValue(gk))) gk = rest[i];
    }
    out.push(gk);
    rest = rest.filter(function (p) { return p !== gk; });
    for (var s = 1; s < FORMATION.length; s++) {
      var want = FORMATION[s].role;
      var best = null;
      for (var j = 0; j < rest.length; j++) {
        if (rest[j].role !== want) continue;
        if (!best || attrValue(rest[j]) > attrValue(best)) best = rest[j];
      }
      if (!best) {
        for (var k = 0; k < rest.length; k++) {
          if (!best || attrValue(rest[k]) > attrValue(best)) best = rest[k];
        }
      }
      out.push(best);
      rest = rest.filter(function (p) { return p !== best; });
    }
    return out;
  }

  /*
   * Check a chosen five. The keeper slot has to be a keeper; the
   * outfield slots take anybody who is not the keeper. Returns the
   * selection in slot order, or null if it does not make sense.
   */
  function validateSelection(squad, ids) {
    if (!ids || ids.length !== FORMATION.length) return null;
    var picked = [];
    for (var i = 0; i < ids.length; i++) {
      var p = null;
      for (var j = 0; j < squad.length; j++) if (squad[j].id === ids[i]) p = squad[j];
      if (!p) return null;
      picked.push(p);
    }
    if (picked[0].role !== "GK") return null;
    for (var k = 1; k < picked.length; k++) {
      if (picked[k].role === "GK") return null;
      if (picked.indexOf(picked[k]) !== k) return null;
    }
    return picked;
  }

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sign(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); }
  function len(x, z) { return Math.sqrt(x * x + z * z); }
  function dist(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

  /* mulberry32 — small, fast, good enough, and reproducible from a seed. */
  function makeRng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Deterministic per-team jitter so the same seed always produces the
     same match, but two seeded matches do not look like a photocopy. */
  function hashSeed(seed, salt) {
    var h = (seed >>> 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (salt >>> 0), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function approach(cur, target, rate) {
    if (cur < target) return Math.min(cur + rate, target);
    if (cur > target) return Math.max(cur - rate, target);
    return target;
  }

  /* ------------------------------------------------------------------ */
  /* Teams                                                               */
  /* ------------------------------------------------------------------ */

  var TEAMS = [
    { id: "azzurri", name: "AZZURRI",  short: "AZZ", kit: "#2f6fe0", trim: "#eef4ff", shorts: "#12306e", rating: 78 },
    { id: "rossi",   name: "ROSSI",    short: "ROS", kit: "#d8342c", trim: "#ffe9e4", shorts: "#7d1512", rating: 74 },
    { id: "verdi",   name: "VERDI",    short: "VER", kit: "#2aa845", trim: "#eaffef", shorts: "#125c23", rating: 72 },
    { id: "gialli",  name: "GIALLI",   short: "GIA", kit: "#e8c020", trim: "#3a3208", shorts: "#8a7412", rating: 70 },
    { id: "blu",     name: "BLU NOTTE", short: "BLU", kit: "#2846a8", trim: "#dfe6ff", shorts: "#16245c", rating: 71 },
    { id: "arancioni", name: "ARANCIONI", short: "ARA", kit: "#e8721c", trim: "#fff2e0", shorts: "#8a3d0b", rating: 69 },
    { id: "bianchi", name: "BIANCHI",  short: "BIA", kit: "#e8e8e4", trim: "#2a2a2c", shorts: "#c9c9c4", rating: 73 },
    { id: "neri",   name: "NERI",     short: "NER", kit: "#26262c", trim: "#d8d8e0", shorts: "#111114", rating: 76 },
  ];

  function teamById(id) {
    for (var i = 0; i < TEAMS.length; i++) if (TEAMS[i].id === id) return TEAMS[i];
    return TEAMS[0];
  }

  /* ------------------------------------------------------------------ */
  /* Match creation                                                      */
  /* ------------------------------------------------------------------ */

  function makePlayer(team, index, slot, dir, rng, squadPlayer) {
    var jx = (rng() - 0.5) * 1.6;
    var jz = (rng() - 0.5) * 1.6;
    var sp = squadPlayer || {
      id: team + "-" + index, role: slot.role, name: "", num: index + 1,
      pace: 60, power: 60, technique: 60,
    };
    return {
      id: team * 100 + index,   // stable identity, used for "last touch"
      index: -1,                // position in the players array
      team: team,
      role: slot.role,
      slot: slot,
      dir: dir,                 // +1 attacks +x, -1 attacks -x
      x: dir * slot.x + jx,
      z: dir * slot.z + jz,
      vx: 0,
      vz: 0,
      facing: dir > 0 ? 0 : Math.PI,
      stamina: C.STAMINA_MAX,
      boost: 0,
      slide: 0,                // slide-tackle timer
      slideCd: 0,
      kickCd: 0,
      shotCd: 0,
      aerialCd: 0,
      anim: rng() * 6.28,
      sweat: 0,
      rated: 1,
      /* Who this is, and how good he is. */
      name: sp.name,
      num: sp.num,
      squadId: sp.id,
      pace: sp.pace,
      power: sp.power,
      technique: sp.technique,
      paceMul: paceMul(sp),
      powerMul: powerMul(sp),
      techMul: techMul(sp),
    };
  }

  function createMatch(opts) {
    opts = opts || {};
    var seed = opts.seed == null ? 1 : opts.seed >>> 0;
    var rng = makeRng(seed);
    var home = teamById(opts.home || "azzurri");
    var away = teamById(opts.away || "neri");
    var halfSeconds = opts.halfSeconds || C.HALF_SECONDS;
    var difficulty = opts.difficulty == null ? 1 : opts.difficulty; // 0 easy .. 2 hard

    var m = {
      seed: seed,
      rng: rng,
      home: home,
      away: away,
      halfSeconds: halfSeconds,
      difficulty: difficulty,
      players: [],
      ball: {
        x: 0, y: C.BALL_R, z: 0,
        vx: 0, vy: 0, vz: 0,
        spin: 0,
        lastTouch: -1,
        lastTouchTeam: -1,
        owner: -1,
        ownerTeam: -1,
        kickLock: 0,
        shield: 0,
      },
      score: [0, 0],
      clock: 0,
      half: 1,
      phase: "kickoff",
      phaseTimer: 1.4,
      phaseTeam: 0,
      controlled: -1,
      switchCd: 0,
      charge: 0,
      charging: false,
      excitement: 0,
      boost: 0,
      stats: [
        { shots: 0, passes: 0, tackles: 0, possession: 0, saves: 0 },
        { shots: 0, passes: 0, tackles: 0, possession: 0, saves: 0 },
      ],
      events: [],
      lastGoal: null,
      kickoffTeam: 0,
      /* The human always plays the home side; the AI plays the away side. */
      humanTeam: 0,
      /* In the attract mode nobody is playing: both sides are the
         computer and the match is a performance. */
      demo: !!opts.demo,
    };

    for (var t = 0; t < 2; t++) {
      var dir = t === 0 ? 1 : -1;
      var team = t === 0 ? home : away;
      var chosen = resolveSelection(team, opts.squads);
      for (var i = 0; i < FORMATION.length; i++) {
        var pl = makePlayer(t, i, FORMATION[i], dir, rng, chosen[i]);
        pl.index = m.players.length;
        m.players.push(pl);
      }
    }

    resetPositions(m, 0);
    m.controlled = nearestToBall(m, 0);
    return m;
  }

  /* The five who start: the ones the player chose, or the best five. */
  function resolveSelection(team, squads) {
    var squad = makeSquad(team);
    if (squads && squads[team.id]) {
      var picked = validateSelection(squad, squads[team.id]);
      if (picked) return picked;
    }
    return autoSelection(squad);
  }

  function playerIndex(m, team, role, n) {
    var seen = 0;
    for (var i = 0; i < m.players.length; i++) {
      if (m.players[i].team !== team) continue;
      if (m.players[i].role !== role) continue;
      if (seen === (n || 0)) return i;
      seen++;
    }
    return -1;
  }

  function nearestToBall(m, team) {
    var best = -1, bd = Infinity;
    for (var i = 0; i < m.players.length; i++) {
      var p = m.players[i];
      if (team != null && p.team !== team) continue;
      var d = dist2(p.x, p.z, m.ball.x, m.ball.z);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /* Put everyone back on their formation lines and hand the ball to the
     team that gets it. */
  /* Put a different man in a slot: the slot keeps its place on the
     pitch, the player brings his attributes with him. */
  function substitute(m, team, slot, squadPlayer) {
    var idx = team * FORMATION.length + slot;
    var p = m.players[idx];
    if (!p || !squadPlayer) return false;
    p.name = squadPlayer.name;
    p.num = squadPlayer.num;
    p.squadId = squadPlayer.id;
    p.pace = squadPlayer.pace;
    p.power = squadPlayer.power;
    p.technique = squadPlayer.technique;
    p.paceMul = paceMul(squadPlayer);
    p.powerMul = powerMul(squadPlayer);
    p.techMul = techMul(squadPlayer);
    return true;
  }

  function resetPositions(m, kickoffTeam) {
    for (var i = 0; i < m.players.length; i++) {
      var p = m.players[i];
      p.x = p.dir * p.slot.x;
      p.z = p.dir * p.slot.z;
      p.vx = 0; p.vz = 0;
      p.facing = p.dir > 0 ? 0 : Math.PI;
      p.stamina = C.STAMINA_MAX;
      p.slide = 0; p.slideCd = 0; p.kickCd = 0;
    }
    m.ball.x = 0; m.ball.y = C.BALL_R; m.ball.z = 0;
    m.ball.vx = 0; m.ball.vy = 0; m.ball.vz = 0;
    m.ball.spin = 0;
    m.ball.owner = -1;
    m.ball.lastTouch = -1;
    m.ball.lastTouchTeam = -1;
    m.kickoffTeam = kickoffTeam;
    m.phase = "kickoff";
    m.phaseTimer = 1.2;
    m.charge = 0;
    m.charging = false;
    /* The midfielder of the kicking team takes the ball. */
    var mid = playerIndex(m, kickoffTeam, "MID", 0);
    if (mid >= 0) {
      m.players[mid].x = -m.players[mid].dir * 1.2;
      m.players[mid].z = 0;
      m.controlled = (m.humanTeam === kickoffTeam) ? mid : nearestToBall(m, m.humanTeam);
    }
    m.phaseTeam = kickoffTeam;
  }

  /* Called by the interface once the half-time card has been read. */
  function startSecondHalf(m) {
    m.half = 2;
    m.clock = 0;
    resetPositions(m, 1 - m.kickoffTeam);
    m.phase = "kickoff";
    m.phaseTimer = 1.4;
    m.controlled = nearestToBall(m, m.humanTeam);
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  function pushEvent(m, type, text, weight) {
    m.events.push({ type: type, text: text, weight: weight || 1 });
    if (m.events.length > 12) m.events.shift();
  }

  /* ------------------------------------------------------------------ */
  /* Possession                                                          */
  /* ------------------------------------------------------------------ */

  function ownerOf(m) {
    return m.ball.owner >= 0 ? m.players[m.ball.owner] : null;
  }

  function canTake(m, p) {
    if (m.phase !== "play" && m.phase !== "kickoff") return false;
    if (m.ball.kickLock > 0) return false;
    if (m.ball.owner === p.index) return true;
    if (m.ball.y > 1.5) return false;
    return dist2(p.x, p.z, m.ball.x, m.ball.z) < C.CONTROL_R * C.CONTROL_R;
  }

  /* Give the ball to the closest eligible player. */
  function updatePossession(m) {
    var b = m.ball;
    if (b.owner >= 0) {
      var o = m.players[b.owner];
      if (!o || o.team !== b.ownerTeam || b.kickLock > 0) b.owner = -1;
    }
    if (b.owner >= 0) return;
    if (b.kickLock > 0) return;
    if (b.y > 1.6) return;
    /* A ball travelling at speed is a shot, not a loose ball: nobody
       simply picks it up on the way past. This is what makes a strike
       from distance worth taking on. */
    if (len(b.vx, b.vz) > 17) return;

    var best = null, bd = Infinity;
    for (var i = 0; i < m.players.length; i++) {
      var p = m.players[i];
      if (p.slide > 0) continue;
      var d = dist2(p.x, p.z, b.x, b.z);
      if (d > C.CONTROL_R * C.CONTROL_R) continue;
      /* A player who has just kicked the ball cannot snatch it back
         immediately — that is what makes a pass to yourself useless. */
      if (b.lastTouch === p.id && b.kickLock > 0) continue;
      var score = d - (p.team === m.humanTeam ? 0 : 0.02);
      if (score < bd) { bd = score; best = p; }
    }
    if (best) {
      b.owner = best.index;
      b.ownerTeam = best.team;
      b.y = C.BALL_R;
      /* A moment to turn away from the tackle. Without it the ball goes
         straight back to the player who just lost it, and nobody can
         ever build an attack. */
      b.shield = C.SHIELD_TIME;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Kicks                                                               */
  /* ------------------------------------------------------------------ */

  function facingDir(p) { return { x: Math.cos(p.facing), z: Math.sin(p.facing) }; }

  /* Where should the ball go to reach `target`? Accounts for gravity and
     gives the ball a little loft when the target is far. */
  function aimAt(p, tx, tz, power, loft) {
    var dx = tx - p.x, dz = tz - p.z;
    var d = len(dx, dz);
    if (d < 0.001) { dx = Math.cos(p.facing); dz = Math.sin(p.facing); d = 1; }
    var nx = dx / d, nz = dz / d;
    var vy = loft ? C.LOFT * (0.5 + loft * 0.5) : 0;
    var speed = power;
    return { x: nx * speed, y: vy, z: nz * speed };
  }

  function kick(m, p, vx, vy, vz, spin) {
    var b = m.ball;
    b.x = p.x + vx * 0.02;
    b.z = p.z + vz * 0.02;
    b.y = Math.max(b.y, C.BALL_R);
    b.vx = vx; b.vy = vy; b.vz = vz;
    b.spin = spin || 0;
    b.shotId = (b.shotId || 0) + 1;
    b.owner = -1;
    b.ownerTeam = -1;
    b.lastTouch = p.id;
    b.lastTouchTeam = p.team;
    b.kickLock = C.KICK_LOCK;
    p.kickCd = 0.25;
    m.excitement = clamp(m.excitement + 0.05, 0, 1);
  }

  /* The pass target: the teammate most in the direction the stick points.
     With no stick input the best-placed teammate is taken. */
  function pickPassTarget(m, p, aimX, aimZ) {
    var best = null, bestScore = -Infinity;
    var goalX = p.dir * C.GOAL_LINE;
    for (var i = 0; i < m.players.length; i++) {
      var q = m.players[i];
      if (q.team !== p.team || q === p) continue;
      var dx = q.x - p.x, dz = q.z - p.z;
      var d = len(dx, dz);
      if (d < 1.5 || d > 34) continue;
      var nx = dx / d, nz = dz / d;
      /* Progress towards the goal is what makes a pass a pass. */
      var progress = (q.x - p.x) * p.dir;
      var align = nx * aimX + nz * aimZ;
      var openness = q.role === "GK" ? -6 : 0;
      var score = progress * 0.9 + align * 8 + openness - d * 0.12;
      if (q.x * p.dir > goalX - 2) score += 6;    // in the box
      if (score > bestScore) { bestScore = score; best = q; }
    }
    return best;
  }

  function doPass(m, p, charge, aimX, aimZ, through) {
    var target = pickPassTarget(m, p, aimX, aimZ);
    if (!target) return false;
    var d = dist(p.x, p.z, target.x, target.z);
    var power = C.PASS_BASE + C.PASS_POWER * charge;
    var lead = through ? 0.42 : 0.18;
    /* Lead the runner so a pass into space actually arrives in space. */
    var tx = target.x + target.vx * lead * d * 0.1;
    var tz = target.z + target.vz * lead * d * 0.1;
    var v = aimAt(p, tx, tz, power, 0);
    kick(m, p, v.x, v.y, v.z, 0);
    m.stats[p.team].passes++;
    pushEvent(m, "pass", null, 0.1);
    return true;
  }

  /*
   * A cross: a high ball over the defence and into the box. It has its
   * own button, because "up" on the stick already means "forwards", and
   * a cross that anybody can trigger by running at the goal is not a
   * cross at all.
   */
  function doCross(m, p) {
    var b = m.ball;
    var owner = ownerOf(m);
    if (!owner || owner.team !== p.team) {
      /* A loose ball at your feet: hoof it upfield rather than let it
         roll to somebody else. */
      if (b.y < 2.4 && dist(p.x, p.z, b.x, b.z) < C.CLEARANCE_RANGE) {
        var away = p.z > 0 ? -1 : 1;
        kick(m, p, p.dir * 15, 6.4, away * 5, 0);
        pushEvent(m, "clearance", "Via!", 0.5);
        return true;
      }
      return false;
    }
    /* Aim it at the space in front of the far post. */
    var gz = (p.z > 0 ? -1 : 1) * (C.GOAL_W / 2 - 1.6);
    var tx = p.dir * (C.GOAL_LINE - 3);
    var dx = tx - p.x, dz = gz - p.z;
    var l = len(dx, dz) || 1;
    kick(m, p, dx / l * C.CROSS_SPEED, C.CROSS_LIFT, dz / l * C.CROSS_SPEED, 0);
    m.stats[p.team].passes++;
    pushEvent(m, "cross", "Cross!", 0.8);
    m.excitement = clamp(m.excitement + 0.2, 0, 1);
    return true;
  }

  /*
   * A header. The ball has to be in the air and the player has to be
   * under it, which is what makes a cross worth crossing.
   */
  function canHead(m, p) {
    var b = m.ball;
    if (b.owner >= 0) return false;
    if (b.y < C.HEADER_MIN_Y || b.y > C.HEADER_MAX_Y) return false;
    return dist(p.x, p.z, b.x, b.z) < C.HEADER_RANGE;
  }

  function doHeader(m, p, charge, aimX, aimZ) {
    var b = m.ball;
    var dx = Math.cos(p.facing) + aimX * 0.95;
    var dz = Math.sin(p.facing) + aimZ * 0.95;
    var l = len(dx, dz) || 1;
    dx /= l; dz /= l;
    var power = (C.SHOT_BASE * 0.75 + C.SHOT_POWER * charge * 0.8) * (p.techMul || 1);
    /* The ball leaves from the head, not from the feet. */
    b.x = p.x + dx * 0.5;
    b.z = p.z + dz * 0.5;
    b.y = Math.max(b.y, 1.45);
    b.vx = dx * power;
    b.vy = 1.2;
    b.vz = dz * power;
    b.spin = 0;
    b.owner = -1;
    b.ownerTeam = -1;
    b.lastTouch = p.id;
    b.lastTouchTeam = p.team;
    b.kickLock = C.KICK_LOCK;
    p.kickCd = 0.25;
    m.stats[p.team].shots++;
    p.shotCd = C.SHOT_COOLDOWN;
    m.excitement = clamp(m.excitement + 0.4, 0, 1);
    pushEvent(m, "header", "Che testa!", 1);
    return true;
  }

  function doShot(m, p, charge, aimX, aimZ, loft, curl) {
    var power = (C.SHOT_BASE + C.SHOT_POWER * charge) * (p.techMul || 1);
    var dx = Math.cos(p.facing) + aimX * 0.95;
    var dz = Math.sin(p.facing) + aimZ * 0.95;
    var l = len(dx, dz) || 1;
    dx /= l; dz /= l;
    var vy = loft ? C.LOFT * (0.45 + loft * 0.55) : 0;
    kick(m, p, dx * power, vy, dz * power, curl || 0);
    m.stats[p.team].shots++;
    p.shotCd = C.SHOT_COOLDOWN;
    m.excitement = clamp(m.excitement + 0.35, 0, 1);
    pushEvent(m, "shot", null, 0.6);
    return true;
  }

  /* A skill move: through-ball when attacking, a clearance when the ball
     is loose, a slide tackle when defending. */
  function doSkill(m, p) {
    var b = m.ball;
    var owner = ownerOf(m);
    if (owner && owner.team === p.team) {
      /* through ball */
      var target = pickPassTarget(m, p, p.dir, 0);
      if (target) {
        var d = dist(p.x, p.z, target.x, target.z);
        var v = aimAt(p, target.x + target.vx * 0.5, target.z + target.vz * 0.5,
                      C.PASS_BASE + 9, 0.18);
        kick(m, p, v.x, v.y, v.z, 0);
        m.stats[p.team].passes++;
        pushEvent(m, "through", "Passa! Passa!", 0.5);
        return true;
      }
      return false;
    }
    /* A loose ball at your feet: the cross button hoofs it away. */
    if (!owner && b.y < 2.4 && dist(p.x, p.z, b.x, b.z) < C.CLEARANCE_RANGE) {
      var away = p.z > 0 ? -1 : 1;
      kick(m, p, p.dir * 15, 6.4, away * 5, 0);
      pushEvent(m, "clearance", "Via!", 0.5);
      return true;
    }
    /* slide tackle */
    if (p.slideCd > 0) return false;
    if (dist(p.x, p.z, b.x, b.z) > C.TACKLE_RANGE + 1.2) return false;
    p.slide = C.SLIDE_TIME;
    p.slideCd = 0.9;
    p.vx = Math.cos(p.facing) * C.SLIDE_SPEED;
    p.vz = Math.sin(p.facing) * C.SLIDE_SPEED;
    pushEvent(m, "slide", null, 0.4);
    if (owner && owner.team !== p.team) {
      if (m.rng() < C.FOUL_CHANCE) {
        /* the foul gives the ball away */
        m.ball.owner = -1;
        m.ball.ownerTeam = -1;
        m.ball.kickLock = 0.4;
        m.ball.vx = 0; m.ball.vy = 0; m.ball.vz = 0;
        m.stats[owner.team].tackles++;
        pushEvent(m, "foul", "Fallo! Anullato!", 0.8);
      } else {
        steal(m, p, owner);
        pushEvent(m, "tackle", "Bella difesa!", 0.6);
      }
    }
    return true;
  }

  function steal(m, defender, victim) {
    var b = m.ball;
    b.owner = -1;
    b.ownerTeam = -1;
    b.kickLock = 0.18;
    b.lastTouch = defender.id;
    b.lastTouchTeam = defender.team;
    b.x = defender.x + Math.cos(defender.facing) * 0.6;
    b.z = defender.z + Math.sin(defender.facing) * 0.6;
    b.y = C.BALL_R;
    b.vx = defender.vx * 0.4;
    b.vz = defender.vz * 0.4;
    m.stats[defender.team].tackles++;
    victim.stamina = Math.max(0, victim.stamina - 8);
  }

  /* ------------------------------------------------------------------ */
  /* Ball physics                                                        */
  /* ------------------------------------------------------------------ */

  function updateBall(m, dt) {
    var b = m.ball;
    /* These two run whether or not the ball is being dribbled: the
       timers must not stop just because somebody has it. */
    if (b.kickLock > 0) b.kickLock = Math.max(0, b.kickLock - dt);
    if (b.shield > 0) b.shield = Math.max(0, b.shield - dt);
    if (b.owner >= 0) {
      var o = m.players[b.owner];
      if (o) {
        var f = facingDir(o);
        var tx = o.x + f.x * C.DRIBBLE_OFFSET;
        var tz = o.z + f.z * C.DRIBBLE_OFFSET;
        b.x = tx; b.z = tz; b.y = C.BALL_R;
        b.vx = o.vx; b.vy = 0; b.vz = o.vz;
        b.spin *= 0.9;
        return;
      }
      b.owner = -1;
    }

    b.vy -= C.GRAVITY * dt;
    /* Magnus-ish curl: spin pushes the ball sideways, more at speed. */
    if (b.spin !== 0) {
      var sp = len(b.vx, b.vz);
      if (sp > 0.5) {
        var cx = -b.vz / sp, cz = b.vx / sp;
        b.vx += cx * b.spin * dt * 26;
        b.vz += cz * b.spin * dt * 26;
      }
      b.spin *= (1 - 1.2 * dt);
    }
    b.vx -= b.vx * C.AIR_DRAG * dt;
    b.vz -= b.vz * C.AIR_DRAG * dt;

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    if (b.y <= C.BALL_R) {
      b.y = C.BALL_R;
      if (b.vy < -0.6) {
        b.vy = -b.vy * C.BOUNCE;
        b.vx *= 0.88; b.vz *= 0.88;
        m.excitement = clamp(m.excitement + 0.03, 0, 1);
      } else {
        b.vy = 0;
      }
      /* Rolling friction, exponential so the ball never crawls forever. */
      var f = Math.max(0, 1 - C.GROUND_FRICTION * dt);
      b.vx *= f; b.vz *= f;
      b.spin *= (1 - 2.0 * dt);
    }

    /* Posts. */
    for (var s = -1; s <= 1; s += 2) {
      var gx = s * C.GOAL_LINE;
      /* near the goal line, close to a post */
      if (Math.abs(b.x - gx) < C.BALL_R + 0.18 && Math.abs(Math.abs(b.z) - C.GOAL_W / 2) < C.BALL_R + 0.18 && b.y < C.GOAL_H) {
        b.x = gx - s * (C.BALL_R + 0.2);
        b.vx = -b.vx * 0.62;
        b.vz += (b.z > 0 ? -1 : 1) * 3;
        m.excitement = clamp(m.excitement + 0.5, 0, 1);
        pushEvent(m, "post", "Ooooh!", 1.2);
      }
    }

    checkBounds(m);
  }

  function checkBounds(m) {
    var b = m.ball;
    if (m.phase !== "play" && m.phase !== "kickoff") return;

    /* Goal line first: a ball that crosses between the posts and under the
       bar is a goal, whatever else is true. */
    for (var s = -1; s <= 1; s += 2) {
      var line = s * C.GOAL_LINE;
      if (s > 0 ? b.x > line + C.BALL_R : b.x < line - C.BALL_R) {
        if (Math.abs(b.z) < C.GOAL_W / 2 - C.BALL_R * 0.4 && b.y < C.GOAL_H) {
          scoreGoal(m, s > 0 ? 0 : 1);
          return;
        }
        /* Out of play behind the goal line. */
        var lastTeam = b.lastTouchTeam;
        if (lastTeam < 0) lastTeam = 0;
        var conceded = (s > 0) ? (lastTeam === 0) : (lastTeam === 1);
        if (conceded) awardCorner(m, s > 0 ? 1 : 0, b.z);
        else awardGoalKick(m, s > 0 ? 1 : 0);
        return;
      }
    }

    /* Touchlines. */
    if (Math.abs(b.z) > C.TOUCH_LINE + C.BALL_R) {
      var last = b.lastTouchTeam < 0 ? 0 : b.lastTouchTeam;
      awardThrowIn(m, last === 0 ? 1 : 0, sign(b.z) * C.TOUCH_LINE, b.x);
    }
  }

  function scoreGoal(m, team) {
    var b = m.ball;
    m.score[team]++;
    m.phase = "goal";
    m.phaseTimer = 2.6;
    m.phaseTeam = team;
    m.lastGoal = { team: team, x: b.x, z: b.z, clock: m.clock };
    m.excitement = 1;
    b.owner = -1;
    b.vx = 0; b.vy = 0; b.vz = 0;
    b.y = C.BALL_R;
    m.charge = 0; m.charging = false;
    pushEvent(m, "goal", "Che gola!", 3);
  }

  function awardThrowIn(m, team, z, x) {
    var b = m.ball;
    b.x = clamp(x, -C.GOAL_LINE + 1, C.GOAL_LINE - 1);
    b.z = z;
    b.y = C.BALL_R;
    b.vx = 0; b.vy = 0; b.vz = 0;
    b.owner = -1; b.ownerTeam = -1;
    b.lastTouch = -1; b.lastTouchTeam = -1;
    m.phase = "throwin";
    m.phaseTimer = 1.3;
    m.phaseTeam = team;
    var taker = nearestToBall(m, team);
    if (taker >= 0) {
      m.players[taker].x = clamp(b.x, -C.GOAL_LINE + 1, C.GOAL_LINE - 1);
      m.players[taker].z = z - sign(z || 1) * 1.2;
      m.controlled = (m.humanTeam === team) ? taker : m.controlled;
    }
    pushEvent(m, "throwin", null, 0.2);
  }

  function awardGoalKick(m, team) {
    var b = m.ball;
    var gk = playerIndex(m, team, "GK", 0);
    var gx = -m.players[gk >= 0 ? gk : 0].dir * (C.GOAL_LINE - 3);
    b.x = gx; b.z = 0; b.y = C.BALL_R;
    b.vx = 0; b.vy = 0; b.vz = 0;
    b.owner = -1; b.ownerTeam = -1;
    b.lastTouch = -1; b.lastTouchTeam = -1;
    m.phase = "goalkick";
    m.phaseTimer = 1.3;
    m.phaseTeam = team;
    if (gk >= 0) {
      m.players[gk].x = gx + m.players[gk].dir * 1.4;
      m.players[gk].z = 0;
      m.controlled = (m.humanTeam === team) ? gk : m.controlled;
    }
    pushEvent(m, "goalkick", null, 0.2);
  }

  function awardCorner(m, team, z) {
    var b = m.ball;
    var sx = sign(z || 1) * C.GOAL_LINE;
    b.x = sx; b.z = sign(z || 1) * (C.TOUCH_LINE - 0.6);
    b.y = C.BALL_R;
    b.vx = 0; b.vy = 0; b.vz = 0;
    b.owner = -1; b.ownerTeam = -1;
    b.lastTouch = -1; b.lastTouchTeam = -1;
    m.phase = "corner";
    m.phaseTimer = 1.6;
    m.phaseTeam = team;
    var taker = nearestToBall(m, team);
    if (taker >= 0) {
      m.players[taker].x = sx - m.players[taker].dir * 1.2;
      m.players[taker].z = b.z - sign(b.z || 1) * 1.2;
      m.controlled = (m.humanTeam === team) ? taker : m.controlled;
    }
    pushEvent(m, "corner", "Corner!", 0.5);
  }

  /* ------------------------------------------------------------------ */
  /* Player movement                                                     */
  /* ------------------------------------------------------------------ */

  function formationTarget(m, p, bx, bz) {
    /* The formation rotates with the ball but never folds in half: the
       shift is deliberately smaller than the ball's distance. */
    var lx = p.slot.x + bx * 0.34;
    var lz = p.slot.z + bz * 0.34;
    var tx = p.dir * lx;
    var tz = p.dir * lz;
    /* The keeper stays near his line. */
    if (p.role === "GK") {
      tx = p.dir * (C.GOAL_LINE - 1.6);
      tz = clamp(bz * 0.42, -(C.GOAL_W / 2 + 2.2), C.GOAL_W / 2 + 2.2);
    }
    return { x: tx, z: tz };
  }

  function movePlayer(m, p, tx, tz, dt, speedScale) {
    var dx = tx - p.x, dz = tz - p.z;
    var d = len(dx, dz);
    var maxSpeed = (p.role === "GK" ? C.GK_SPEED : C.PLAYER_SPEED) *
      (speedScale || 1) * (p.paceMul || 1);
    if (p.sprint > 0) maxSpeed *= C.SPRINT_MULT;
    var want = d > 0.05 ? Math.min(maxSpeed, d * 4.2) : 0;
    var ax = 0, az = 0;
    if (d > 0.001) {
      ax = (dx / d) * want;
      az = (dz / d) * want;
    }
    p.vx = approach(p.vx, ax, C.PLAYER_ACCEL * dt);
    p.vz = approach(p.vz, az, C.PLAYER_ACCEL * dt);
    if (p.sprint > 0) {
      p.stamina = Math.max(0, p.stamina - C.STAMINA_DRAIN * dt);
      if (p.stamina <= 0) p.sprint = 0;
    } else {
      p.stamina = Math.min(C.STAMINA_MAX, p.stamina + C.STAMINA_REGEN * dt);
    }
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    /* Keep everybody on the pitch, keepers included. */
    p.z = clamp(p.z, -C.TOUCH_LINE - 1.4, C.TOUCH_LINE + 1.4);
    p.x = clamp(p.x, -C.GOAL_LINE - 1.2, C.GOAL_LINE + 1.2);
    if (d > 0.35 && (Math.abs(p.vx) + Math.abs(p.vz)) > 0.6) {
      p.facing = Math.atan2(p.vz, p.vx);
      p.anim += (Math.abs(p.vx) + Math.abs(p.vz)) * dt * 2.6;
    }
  }

  /* ------------------------------------------------------------------ */
  /* The AI                                                              */
  /* ------------------------------------------------------------------ */

  /* Where should this team want the ball to be? */
  function attackTarget(m, team) {
    var dir = team === 0 ? 1 : -1;
    var goalZ = 0;
    return { x: dir * (C.GOAL_LINE - 1), z: goalZ };
  }

  /* A defender who is close enough to the carrier can try to take the
     ball off him. Without this a team that simply stands on the ball can
     never be dispossessed, and a match against a passive opponent would
     never see a goal. */
  function tryChallenge(m, defender, chance) {
    var owner = ownerOf(m);
    if (!owner || owner.team === defender.team) return false;
    if (m.ball.shield > 0) return false;
    if (defender.slideCd > 0) return false;
    if (defender.slide > 0) return false;
    if (dist(defender.x, defender.z, owner.x, owner.z) > C.TACKLE_RANGE) return false;
    if (m.rng() < chance * (defender.powerMul || 1)) {
      steal(m, defender, owner);
      pushEvent(m, "tackle", "Bella difesa!", 0.6);
      return true;
    }
    return false;
  }

  /*
   * A ball in the air is a chance to head it. Whoever is under it gets
   * it, and a cross into the box becomes a real opportunity rather than
   * a ball everybody watches go past.
   */
  function aerialChance(m, p, dt) {
    if (!canHead(m, p)) return false;
    /* Do not thrash at it: one attempt per player per ball. */
    if (p.aerialCd > 0) { p.aerialCd -= dt; return false; }
    p.aerialCd = 0.6;
    var goal = attackTarget(m, p.team);
    var dx = goal.x - p.x, dz = goal.z - p.z;
    var l = len(dx, dz) || 1;
    p.facing = Math.atan2(dz, dx);
    /* The power depends on how good the player is and on how much
       charge there is in the swing. */
    var charge = clamp(0.45 + m.difficulty * 0.15 + m.rng() * 0.3, 0, 1);
    doHeader(m, p, charge, 0, 0);
    return true;
  }

  /*
   * The intelligence of one team. The computer plays this way; in the
   * attract mode both sides do, which is why it takes a team rather
   * than assuming it is the away side.
   */
  function runTeamAI(m, team, dt) {
    var owner = ownerOf(m);
    var weHaveBall = owner && owner.team === team;
    var chaser = -1;
    for (var i = 0; i < m.players.length; i++) {
      var p = m.players[i];
      if (p.team !== team) continue;
      if (p.slide > 0) { p.slide -= dt; continue; }

      if (p.role === "GK") { keeperAI(m, p, dt); continue; }

      /* A ball in the air is headed before anything else is considered. */
      if (aerialChance(m, p, dt)) continue;

      if (weHaveBall) {
        if (owner === p) carrierAI(m, p, dt);
        else supportAI(m, p, dt, owner);
      } else {
        if (chaser < 0) chaser = nearestToBall(m, team);
        if (i === chaser) {
          if (owner) pressCarrier(m, p, owner, dt);
          else chaseAI(m, p, dt);
        } else {
          markAI(m, p, dt);
        }
      }
      /* Anybody close to the carrier goes in for the ball. */
      if (!weHaveBall && p.role !== "GK") {
        tryChallenge(m, p, (i === chaser ? 0.05 : 0.025) + m.difficulty * 0.02);
      }
    }
  }

  function updateCPU(m, dt) {
    runTeamAI(m, 1 - m.humanTeam, dt);
  }

  function keeperAI(m, p, dt) {
    var b = m.ball;
    var ownGoalX = -p.dir * C.GOAL_LINE;

    /* The keeper has it in his hands: hold it for a moment, then throw
       it up the pitch. Without this the game stops dead the first time
       a goalkeeper gathers a ball. */
    if (b.owner === p.index) {
      p.hold = (p.hold || 0) - dt;
      movePlayer(m, p, ownGoalX + p.dir * 1.2, 0, dt, 0.4);
      if (p.hold <= 0) {
        var mate = pickPassTarget(m, p, p.dir, 0);
        if (mate) {
          doPass(m, p, 0.85, p.dir, 0, true);
        } else {
          kick(m, p, p.dir * 18, 7, 0, 0);
        }
        p.hold = 0;
      }
      return;
    }

    var incoming = (b.vx * p.dir) < -2 && Math.abs(b.x - ownGoalX) < 22;
    /* A keeper is not a computer. Every time a new shot comes at him he
       guesses where it is going, and the guess is wrong by a bit — which
       is why a well-placed shot beats him. */
    if (b.shotId !== p.lastShot) {
      p.lastShot = b.shotId;
      p.diveErr = (m.rng() - 0.5) * (2.0 + len(b.vx, b.vz) * 0.075);
    }
    var targetZ = clamp(b.z * 0.55, -(C.GOAL_W / 2 + 1.6), C.GOAL_W / 2 + 1.6);
    var tx = ownGoalX + p.dir * 1.2;
    if (incoming) {
      /* Guess where the ball will cross the line and dive for it. */
      var t = (ownGoalX - b.x) / (b.vx || 1);
      if (t > 0 && t < 2.2) {
        var predZ = b.z + b.vz * t + (p.diveErr || 0);
        targetZ = clamp(predZ, -(C.GOAL_W / 2 + 2.4), C.GOAL_W / 2 + 2.4);
      }
      var speed = 2.4;
      movePlayer(m, p, tx, targetZ, dt, speed);
      /* A dive: the keeper throws himself at the ball. */
      if (Math.abs(b.x - ownGoalX) < 8 && b.y < 2.2 &&
          Math.abs(b.z - p.z) < 1.9 && Math.abs(b.x - p.x) < 2.2) {
        var power = len(b.vx, b.vz);
        var reach = 2.4;
        var chance = clamp(0.93 - power / 78, 0.22, 0.93);
        if (m.rng() < chance) {
          if (dist(p.x, p.z, b.x, b.z) < reach) {
            m.ball.owner = p.index;
            m.ball.ownerTeam = p.team;
            m.ball.vx = 0; m.ball.vy = 0; m.ball.vz = 0;
            p.hold = 1.1;
            m.stats[p.team].saves++;
            pushEvent(m, "save", "Grande parata!", 1);
          }
        } else {
          /* parried */
          b.vx = -b.vx * 0.4;
          b.vz = (b.z > p.z ? 1 : -1) * 6;
          b.vy = 4;
          b.kickLock = 0.3;
          m.stats[p.team].saves++;
          pushEvent(m, "save", "Parata!", 0.9);
        }
      }
      return;
    }
    movePlayer(m, p, tx, targetZ, dt, 0.8);
  }

  function carrierAI(m, p, dt) {
    var b = m.ball;
    var goal = attackTarget(m, p.team);
    var dGoal = dist(p.x, p.z, goal.x, goal.z);
    var pressure = nearestOpponentDistance(m, p);

    /* Shoot? Only from somewhere a goal can be scored from, and not again
       until the shot has had time to be dealt with. */
    var shootRange = C.CPU_SHOOT_RANGE * (0.7 + m.difficulty * 0.28);
    if (dGoal < shootRange && Math.abs(p.z) < 13 && p.shotCd <= 0 &&
        m.rng() < (0.9 + m.difficulty * 0.7) * dt) {
      /* aim at a corner of the goal */
      var gz = (m.rng() < 0.5 ? -1 : 1) * (C.GOAL_W / 2 - 1.1);
      var charge = clamp(0.45 + m.difficulty * 0.2 + m.rng() * 0.3, 0, 1);
      /* From far out the shot is lifted, so it goes over the legs of the
         people standing in the way. */
      var lift = dGoal > 11 ? 0.42 : 0;
      doShot(m, p, charge, 0, 0, lift, 0);
      /* steer the shot towards the chosen corner */
      var dx = goal.x - p.x, dz = gz - p.z;
      var l = len(dx, dz) || 1;
      var power = C.SHOT_BASE + C.SHOT_POWER * charge;
      b.vx = dx / l * power; b.vz = dz / l * power;
      return;
    }

    /* Pass when crowded. */
    if (pressure < 3.0 && m.rng() < 0.055 + m.difficulty * 0.03) {
      var t = pickPassTarget(m, p, p.dir, 0);
      if (t) {
        doPass(m, p, 0.35 + m.rng() * 0.3, p.dir, 0, false);
        return;
      }
    }

    /* Cross when wide and getting near the goal: a ball into the box is
       the only way to score from out there. */
    if (Math.abs(p.z) > 7 && Math.abs(p.x) > 12 && p.shotCd <= 0 &&
        m.rng() < 0.02 + m.difficulty * 0.012) {
      doCross(m, p);
      return;
    }

    /* Otherwise drive at the goal, steering around opponents. */
    var tx = goal.x, tz = goal.z;
    var avoid = 0;
    for (var i = 0; i < m.players.length; i++) {
      var o = m.players[i];
      if (o.team === p.team) continue;
      var dd = dist(o.x, o.z, p.x, p.z);
      if (dd < 3.2) { avoid += sign(p.z - o.z) * (3.2 - dd) * 0.8; }
    }
    tz += clamp(avoid, -5, 5);
    p.sprint = (dGoal > 9 && p.stamina > 20) ? 1 : 0;
    movePlayer(m, p, tx, tz, dt, 1);
  }

  function supportAI(m, p, dt, owner) {
    var t = formationTarget(m, p, m.ball.x, m.ball.z);
    /* Offer an option: stand a little ahead of the carrier. */
    t.x += p.dir * 3;
    if (owner) {
      var side = sign(p.z - owner.z) || 1;
      t.z += side * 2.2;
    }
    movePlayer(m, p, t.x, t.z, dt, 0.72);
  }

  function chaseAI(m, p, dt) {
    var b = m.ball;
    /* Lead the ball a little so the CPU does not always trail it. */
    var tx = b.x + b.vx * 0.22, tz = b.z + b.vz * 0.22;
    /* Sprint when there is ground to make up, but not for ever: the
       stamina runs out and the CPU slows down like anybody else. */
    p.sprint = (dist(p.x, p.z, tx, tz) > 7 && p.stamina > 22) ? 1 : 0;
    movePlayer(m, p, tx, tz, dt, 1);
    /* Last-ditch slide at the ball carrier. */
    var owner = ownerOf(m);
    if (owner && owner.team !== p.team && p.slideCd <= 0 &&
        dist(p.x, p.z, owner.x, owner.z) < C.TACKLE_RANGE && m.rng() < 0.02) {
      p.facing = Math.atan2(owner.z - p.z, owner.x - p.x);
      doSkill(m, p);
    }
  }

  /*
   * Pressing the man with the ball. A defender goes for the carrier, not
   * for the ball: the carrier is where the ball is going to be.
   */
  function pressCarrier(m, p, owner, dt) {
    var tx = owner.x + owner.vx * 0.18;
    var tz = owner.z + owner.vz * 0.18;
    p.sprint = (dist(p.x, p.z, tx, tz) > 6 && p.stamina > 18) ? 1 : 0;
    movePlayer(m, p, tx, tz, dt, 1);
    tryChallenge(m, p, 0.05 + m.difficulty * 0.02);
    if (p.slideCd <= 0 && dist(p.x, p.z, owner.x, owner.z) < C.TACKLE_RANGE &&
        m.rng() < 0.012) {
      p.facing = Math.atan2(owner.z - p.z, owner.x - p.x);
      doSkill(m, p);
    }
  }

  function markAI(m, p, dt) {
    var t = formationTarget(m, p, m.ball.x, m.ball.z);
    /* find the nearest unmarked opponent and stand off them */
    var best = null, bd = Infinity;
    for (var i = 0; i < m.players.length; i++) {
      var o = m.players[i];
      if (o.team === p.team) continue;
      var d = dist2(o.x, o.z, m.ball.x, m.ball.z);
      if (d < bd) { bd = d; best = o; }
    }
    if (best && p.role === "DEF") {
      t.x = lerp(t.x, best.x - p.dir * 1.6, 0.75);
      t.z = lerp(t.z, best.z, 0.75);
    }
    movePlayer(m, p, t.x, t.z, dt, 0.9);
  }

  function nearestOpponentDistance(m, p) {
    var best = Infinity;
    for (var i = 0; i < m.players.length; i++) {
      var o = m.players[i];
      if (o.team === p.team) continue;
      var d = dist(o.x, o.z, p.x, p.z);
      if (d < best) best = d;
    }
    return best;
  }

  /* ------------------------------------------------------------------ */
  /* Human control                                                       */
  /* ------------------------------------------------------------------ */

  function updateHuman(m, input, dt) {
    var p = m.players[m.controlled];
    if (!p) { m.controlled = nearestToBall(m, m.humanTeam); return; }

    var mag = len(input.mx, input.my);
    var nx = 0, nz = 0;
    if (mag > 0.08) {
      /* Stick up = forward (+x for the human team). */
      nx = input.my;
      nz = input.mx;
      var l = len(nx, nz);
      nx /= l; nz /= l;
      p.facing = Math.atan2(nz, nx);
    } else if (m.ball.owner === p.index) {
      /* Standing still with the ball: face the goal. */
      p.facing = Math.atan2(0, p.dir);
    }

    /* Sprinting needs something left in the tank. Without this the
       stamina runs down and the sprint comes straight back, and the
       boost meter means nothing. */
    p.sprint = (input.sprint && p.stamina > 4) ? 1 : 0;
    var speedScale = 1;
    movePlayer(m, p, p.x + nx * 10, p.z + nz * 10, dt, speedScale);

    /* Running at the man with the ball wins it back. The skill button is
       for the dramatic sliding tackle, not for the ordinary one. */
    var carrier = ownerOf(m);
    if (carrier && carrier.team !== p.team) {
      tryChallenge(m, p, 0.05);
    }

    /* Charging the shot. */
    if (input.shootDown) {
      m.charging = true;
      m.charge = Math.min(1, m.charge + dt / C.CHARGING_TIME);
    }
    if (input.shootUp && m.charging) {
      m.charging = false;
      var charge = m.charge;
      m.charge = 0;
      if (canHead(m, p)) {
        /* The ball is in the air and you are under it: that is a header,
           and it beats a shot off the ground. */
        doHeader(m, p, charge, input.mx, input.my);
      } else if (m.ball.owner === p.index && p.shotCd <= 0) {
        var loft = clamp(input.my, 0, 1);
        var curl = clamp(-input.mx, -1, 1) * 0.6;
        doShot(m, p, charge, input.mx, input.my, loft, curl);
      }
    } else if (input.shootUp) {
      m.charging = false;
      m.charge = 0;
    }

    if (input.passDown && m.ball.owner === p.index) {
      doPass(m, p, 0.25, input.mx, input.my, false);
    }
    if (input.crossDown) {
      doCross(m, p);
    }
    if (input.skillDown) {
      doSkill(m, p);
    }
    if (input.switchDown && m.switchCd <= 0) {
      switchPlayer(m);
    }
  }

  function switchPlayer(m) {
    var best = -1, bd = Infinity;
    for (var i = 0; i < m.players.length; i++) {
      var p = m.players[i];
      if (p.team !== m.humanTeam || p === m.players[m.controlled]) continue;
      var d = dist2(p.x, p.z, m.ball.x, m.ball.z);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) {
      m.controlled = best;
      m.switchCd = 0.2;
      m.charge = 0;
      m.charging = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Match step                                                          */
  /* ------------------------------------------------------------------ */

  function stepMatch(m, dt, input) {
    input = input || {};
    var mx = input.mx || 0, my = input.my || 0;
    input.mx = mx; input.my = my;

    if (m.switchCd > 0) m.switchCd -= dt;
    for (var i = 0; i < m.players.length; i++) {
      var p = m.players[i];
      if (p.slideCd > 0) p.slideCd -= dt;
      if (p.kickCd > 0) p.kickCd -= dt;
      if (p.shotCd > 0) p.shotCd -= dt;
      if (p.aerialCd > 0) p.aerialCd -= dt;
      if (p.slide > 0) p.slide -= dt;
      p.sprint = 0;
    }

    m.excitement = Math.max(0, m.excitement - dt * 0.55);

    if (m.phase === "halftime" || m.phase === "fulltime") {
      /* Nothing moves while the game is stopped, but the clock does not
         run either. The caller decides when to resume. */
      return m;
    }

    if (m.phase !== "play" && m.phase !== "kickoff") {
      m.phaseTimer -= dt;
      /* Everyone drifts back to shape during a stoppage. */
      for (var k = 0; k < m.players.length; k++) {
        var q = m.players[k];
        if (q.role === "GK") { keeperAI(m, q, dt); continue; }
        var t = formationTarget(m, q, m.ball.x, m.ball.z);
        movePlayer(m, q, t.x, t.z, dt, 0.5);
      }
      if (m.phaseTimer <= 0) {
        if (m.phase === "goal") {
          var next = 1 - m.lastGoal.team;
          resetPositions(m, next);
          m.controlled = (m.humanTeam === next) ? nearestToBall(m, m.humanTeam) : m.controlled;
        } else if (m.phase === "throwin" || m.phase === "goalkick" || m.phase === "corner") {
          m.phase = "play";
          m.phaseTimer = 0;
          /* The ball is put back in play by the nearest player of the
             awarded team. */
          var taker = nearestToBall(m, m.phaseTeam);
          if (taker >= 0 && m.humanTeam === m.phaseTeam) m.controlled = taker;
          m.ball.kickLock = 0.25;
        }
      }
      return m;
    }

    /* Kick-off: the ball is live, but nobody may touch it for a moment. */
    if (m.phase === "kickoff") {
      m.phaseTimer -= dt;
      if (m.phaseTimer <= 0) m.phase = "play";
    }

    /* The clock only runs while the ball is in play. */
    if (!m.demo) m.clock += dt;
    if (m.clock >= m.halfSeconds) {
      if (m.half === 1) {
        m.half = 2;
        m.phase = "halftime";
        m.phaseTimer = 0;
        m.clock = 0;
        resetPositions(m, 1 - m.kickoffTeam);
        m.phase = "halftime";
        pushEvent(m, "halftime", "Fine primo tempo", 1);
      } else {
        m.phase = "fulltime";
        m.phaseTimer = 0;
        pushEvent(m, "fulltime", null, 1);
      }
      return m;
    }

    if (m.demo) {
      /* The attract mode: nobody is playing, so both sides are the
         computer and the picture keeps itself busy. */
      runTeamAI(m, m.humanTeam, dt);
      runTeamAI(m, 1 - m.humanTeam, dt);
      updateBall(m, dt);
      updatePossession(m);
      m.excitement = Math.max(0, m.excitement - dt * 0.55);
      return m;
    }

    updateHuman(m, input, dt);
    updateCPU(m, dt);
    /* AI for the human's teammates: they support and hold their shape. */
    for (var j = 0; j < m.players.length; j++) {
      var h = m.players[j];
      if (h.team !== m.humanTeam) continue;
      if (h === m.players[m.controlled]) continue;
      if (h.role === "GK") { keeperAI(m, h, dt); continue; }
      /* The human's teammates head the ball too, or a cross would only
         ever be for the opposition. */
      if (aerialChance(m, h, dt)) continue;
      var owner = ownerOf(m);
      if (owner && owner.team === h.team) {
        /* a human teammate has the ball: hold the shape, offer an option */
        var t2 = formationTarget(m, h, m.ball.x, m.ball.z);
        t2.x += h.dir * 6;
        movePlayer(m, h, t2.x, t2.z, dt, 0.7);
      } else {
        var chaser = nearestToBall(m, m.humanTeam);
        if (h === m.players[chaser]) {
          /* The man you are controlling is the presser. A team-mate who
             also went charging in would leave the shape open, and the
             opposition would walk straight through it. */
          if (owner && owner.team !== h.team &&
              dist(h.x, h.z, owner.x, owner.z) < 9) {
            markAI(m, h, dt);
          } else {
            supportAI(m, h, dt, owner);
          }
        } else {
          /* the rest of the team marks, and closes down a little */
          markAI(m, h, dt);
        }
        /* Your own teammates crowd the ball carrier too, but they are not
           as committed as the opposition: they help, they do not hunt. */
        if (owner && owner.team !== h.team) {
          tryChallenge(m, h, 0.025);
        }
      }
    }

    updateBall(m, dt);
    updatePossession(m);

    /* You control whoever has the ball. Without this the player keeps
       the man he started with while a team-mate runs off with the ball,
       and the game is unplayable. */
    if (m.ball.owner >= 0 && m.players[m.ball.owner] &&
        m.players[m.ball.owner].team === m.humanTeam &&
        m.players[m.ball.owner].role !== "GK" &&
        m.ball.owner !== m.controlled) {
      m.controlled = m.ball.owner;
    }

    /* Possession is measured in seconds, not in guessed increments. */
    if (m.ball.owner >= 0 && m.players[m.ball.owner]) {
      m.stats[m.players[m.ball.owner].team].possession += dt;
    }

    /* The boost meter fills while your team has the ball. */
    if (m.ball.owner >= 0 && m.players[m.ball.owner] &&
        m.players[m.ball.owner].team === m.humanTeam) {
      m.boost = Math.min(100, m.boost + dt * 14);
    } else {
      m.boost = Math.max(0, m.boost - dt * 6);
    }

    return m;
  }

  /* ------------------------------------------------------------------ */
  /* Penalty shoot-out                                                   */
  /* ------------------------------------------------------------------ */

  function createShootout(opts) {
    opts = opts || {};
    var seed = opts.seed == null ? 7 : opts.seed >>> 0;
    var s = {
      seed: seed,
      rng: makeRng(seed),
      round: 1,
      kicks: [[], []],     // results per team, "G" (goal) or "M" (miss)
      score: [0, 0],
      turn: 0,             // 0 = the player kicks, 1 = the CPU kicks
      phase: "aim",        // aim -> power -> cpu -> result -> next
      phaseTimer: 0,
      aim: 0,              // -1 .. 1 lateral
      aimDir: 1,
      power: 0,            // 0 .. 1 height
      powerDir: 1,
      dir: 1,              // which goal the player shoots at
      result: null,
      outcome: null,
      difficulty: opts.difficulty == null ? 1 : opts.difficulty,
      finished: false,
      events: [],
    };
    return s;
  }

  /* The whole shoot-out as a small state machine, so the renderer and the
     tests can drive it with the same calls. */
  function stepShootout(s, dt, input) {
    input = input || {};
    if (s.finished) return s;

    if (s.phase === "aim") {
      stepShootoutAim(s, dt);
      if (input.tap) {
        s.phase = "power";
        s.power = 0;
        s.powerDir = 1;
        s.events.push({ type: "aim" });
      }
    } else if (s.phase === "power") {
      stepShootoutPower(s, dt);
      if (input.tap) {
        shootoutLockPower(s);
        s.phase = "result";
        s.phaseTimer = 1.3;
      }
    } else if (s.phase === "cpu") {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) {
        shootoutCPUKick(s);
        s.phase = "result";
        s.phaseTimer = 1.3;
      }
    } else if (s.phase === "result") {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) {
        if (shootoutFinished(s)) {
          s.finished = true;
          s.outcome = s.score[0] > s.score[1] ? "win" : (s.score[0] < s.score[1] ? "loss" : "draw");
          s.events.push({ type: "end", outcome: s.outcome });
          return s;
        }
        if (s.turn === 0) {
          s.turn = 1;
          s.phase = "cpu";
          s.phaseTimer = 1.1;
        } else {
          s.turn = 0;
          s.phase = "aim";
          s.aim = 0;
          s.aimDir = 1;
          s.round++;
          s.events.push({ type: "round", round: s.round });
        }
      }
    }
    return s;
  }

  /* The aim marker sweeps left and right; the player stops it. */
  function stepShootoutAim(s, dt) {
    s.aim += C.PEN_AIM_SPEED * dt * (s.aimDir || 1);
    if (s.aim > 1) { s.aim = 1; s.aimDir = -1; }
    if (s.aim < -1) { s.aim = -1; s.aimDir = 1; }
  }

  function stepShootoutPower(s, dt) {
    s.power += C.PEN_POWER_SPEED * dt * (s.powerDir || 1);
    if (s.power > 1) { s.power = 1; s.powerDir = -1; }
    if (s.power < 0) { s.power = 0; s.powerDir = 1; }
  }

  /* Lock the aim and move on to the power meter. */
  function shootoutLockAim(s) {
    if (s.phase !== "aim") return false;
    s.phase = "power";
    s.power = 0;
    s.powerDir = 1;
    return true;
  }

  function shootoutLockPower(s) {
    if (s.phase !== "power") return false;
    s.phase = "result";
    s.phaseTimer = 1.4;
    /* Where the keeper goes: he reads the aim but not perfectly. */
    var skill = 0.55 + s.difficulty * 0.16;
    var read = s.aim + (s.rng() * 2 - 1) * (1 - skill) * 1.5;
    s.keeperDir = clamp(read, -1, 1);
    s.keeperHeight = s.rng();
    /* The outcome depends on the aim, the height and the keeper. */
    var lateral = Math.abs(s.aim - s.keeperDir);
    var high = s.power > 0.78;
    var wide = Math.abs(s.aim) > 0.92;
    var outcome;
    if (wide) outcome = "M";
    else if (high && s.keeperHeight > 0.72) outcome = "M";
    else if (lateral < 0.30 + (1 - skill) * 0.22) outcome = "M";
    else outcome = "G";
    s.result = outcome;
    s.kicks[s.turn].push(outcome);
    if (outcome === "G") s.score[s.turn]++;
    return true;
  }

  /* The CPU takes its kick: it scores more often than it misses, and a
     stronger difficulty makes it steadier. */
  function shootoutCPUKick(s) {
    var skill = 0.52 + s.difficulty * 0.2;
    var outcome = s.rng() < skill ? "G" : "M";
    s.result = outcome;
    s.kicks[1].push(outcome);
    if (outcome === "G") s.score[1]++;
    return outcome;
  }

  function shootoutFinished(s) {
    var a = s.kicks[0].length, b = s.kicks[1].length;
    var sa = s.score[0], sb = s.score[1];
    if (a === b) {
      if (a > C.PEN_ROUNDS) {
        /* Sudden death: the two sides have taken the same number of kicks,
           so the round is decided by the last pair. */
        return s.kicks[0][a - 1] !== s.kicks[1][b - 1];
      }
      if (sa > sb + (C.PEN_ROUNDS - a)) return true;
      if (sb > sa + (C.PEN_ROUNDS - a)) return true;
      return false;
    }
    /* The player has kicked and the CPU has not: the CPU can only lose
       this if the player is already out of reach. */
    if (a > b && sa > sb + (C.PEN_ROUNDS - b)) return true;
    if (b > a && sb > sa + (C.PEN_ROUNDS - a)) return true;
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* Cup                                                                 */
  /* ------------------------------------------------------------------ */

  function createCup(opts) {
    opts = opts || {};
    var seed = opts.seed == null ? 99 : opts.seed >>> 0;
    var rng = makeRng(seed);
    var teams = TEAMS.slice();
    /* Shuffle into the bracket so the player's team is not always the
       favourite in the first round. */
    for (var i = teams.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = teams[i]; teams[i] = teams[j]; teams[j] = t;
    }
    return {
      seed: seed,
      rng: rng,
      teams: teams,
      playerIndex: opts.playerIndex == null ? 0 : opts.playerIndex,
      round: 0,                  // 0 = quarter, 1 = semi, 2 = final
      ties: [[0, 1], [2, 3], [4, 5], [6, 7]],
      winners: [],
      history: [],
      champion: null,
      done: false,
    };
  }

  /* Simulate a tie between two teams using their ratings. */
  function simulateTie(cup, a, b) {
    var ra = cup.teams[a].rating, rb = cup.teams[b].rating;
    var diff = (ra - rb) / 10;
    var pa = 1 / (1 + Math.pow(10, -diff));
    var goalsA = poisson(cup.rng, 1.15 * pa + 0.35);
    var goalsB = poisson(cup.rng, 1.15 * (1 - pa) + 0.35);
    if (goalsA === goalsB) {
      /* A draw is settled on penalties, which is what a cup is. */
      if (cup.rng() < 0.5) { goalsA++; } else { goalsB++; }
    }
    return { a: a, b: b, ga: goalsA, gb: goalsB };
  }

  function poisson(rng, lambda) {
    var L = Math.exp(-lambda);
    var k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }

  /* Which tie does the player have to play in this round? */
  function playerTie(cup) {
    var t = cup.ties[cup.round];
    if (!t) return null;
    for (var i = 0; i < t.length; i++) {
      if (t[i] === cup.playerIndex) return { tie: t, slot: i };
    }
    /* The player's team may have qualified as a wildcard: find it. */
    for (var j = 0; j < t.length; j++) if (t[j] === cup.playerIndex) return { tie: t, slot: j };
    return null;
  }

  function cupPlayerTeam(cup) { return cup.teams[cup.playerIndex]; }

  return {
    C: C,
    TEAMS: TEAMS,
    FORMATION: FORMATION,
    teamById: teamById,
    makeRng: makeRng,
    makeSquad: makeSquad,
    autoSelection: autoSelection,
    validateSelection: validateSelection,
    substitute: substitute,
    attrValue: attrValue,
    FORMATION: FORMATION,
    createMatch: createMatch,
    stepMatch: stepMatch,
    startSecondHalf: startSecondHalf,
    nearestToBall: nearestToBall,
    switchPlayer: switchPlayer,
    playerIndex: playerIndex,
    doPass: doPass,
    doShot: doShot,
    doSkill: doSkill,
    doCross: doCross,
    doHeader: doHeader,
    canHead: canHead,
    attackTarget: attackTarget,
    createShootout: createShootout,
    stepShootout: stepShootout,
    stepShootoutAim: stepShootoutAim,
    stepShootoutPower: stepShootoutPower,
    shootoutLockAim: shootoutLockAim,
    shootoutLockPower: shootoutLockPower,
    shootoutCPUKick: shootoutCPUKick,
    shootoutFinished: shootoutFinished,
    createCup: createCup,
    simulateTie: simulateTie,
    playerTie: playerTie,
    cupPlayerTeam: cupPlayerTeam,
    poisson: poisson,
  };
});
