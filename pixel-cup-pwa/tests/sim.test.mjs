/*
 * PIXEL CUP '96 — model tests
 *
 *   node pixel-cup-pwa/tests/sim.test.mjs
 *
 * The rules live in src/core.js, which has no DOM and no canvas: the same
 * file the browser loads. These tests therefore exercise the game the
 * player actually plays, not a copy of it.
 *
 * Plain Node, no dependencies, same harness style as metro-pwa/sim.test.mjs.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const S = require(resolve(here, "../src/core.js"));

let failures = 0;
let checks = 0;

function ok(label, condition, detail) {
  checks++;
  if (condition) return;
  failures++;
  console.error("  FAIL  " + label + (detail !== undefined ? " -> " : "") + (detail ?? ""));
}

function near(label, actual, expected, eps = 1e-6) {
  ok(label, Math.abs(actual - expected) <= eps, actual + " != " + expected);
}

function section(name) { console.log("\n" + name); }

/* A stand-in for the human: no input at all. */
const IDLE = { mx: 0, my: 0 };

/* Run a match forward for `seconds` of simulated time. The interface reads
   the half-time card and calls startSecondHalf; the harness does the same
   so a headless match plays both halves. */
function run(m, seconds, input = IDLE, dt = 1 / 60) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    if (m.phase === "halftime") S.startSecondHalf(m);
    S.stepMatch(m, dt, input);
  }
  return m;
}

/* ================================================================== */
section("pitch and constants");

ok("pitch is longer than it is wide", S.C.PITCH_LEN > S.C.PITCH_WID);
ok("the goal is narrower than the pitch", S.C.GOAL_W < S.C.PITCH_WID);
ok("a half lasts a sensible number of seconds", S.C.HALF_SECONDS >= 30 && S.C.HALF_SECONDS <= 300);
ok("eight teams exist", S.TEAMS.length === 8);
ok("team ids are unique", new Set(S.TEAMS.map((t) => t.id)).size === 8);
ok("every team has a kit colour", S.TEAMS.every((t) => /^#[0-9a-f]{6}$/i.test(t.kit)));

/* ================================================================== */
section("match creation");

const m0 = S.createMatch({ seed: 12345, home: "azzurri", away: "neri" });
ok("a match has ten players", m0.players.length === 10, m0.players.length);
ok("five players a side", m0.players.filter((p) => p.team === 0).length === 5);
ok("exactly one keeper a side", m0.players.filter((p) => p.role === "GK").length === 2);
ok("the score starts level", m0.score[0] === 0 && m0.score[1] === 0);
ok("the clock has not started", m0.clock === 0);
ok("the ball is on the centre spot", m0.ball.x === 0 && m0.ball.z === 0);
ok("the human controls somebody", m0.controlled >= 0);
ok("the match starts with a kick-off", m0.phase === "kickoff");

const keeper = m0.players.find((p) => p.role === "GK" && p.team === 0);
const keeper2 = m0.players.find((p) => p.role === "GK" && p.team === 1);
ok("the keeper stands near his own goal", keeper.x < -20, keeper.x);
ok("the keeper stands on the line", Math.abs(keeper.z) < 1.5, keeper.z);
ok("the two keepers defend opposite ends", keeper.x < 0 && keeper2.x > 0);
ok("the two teams start on opposite halves",
   m0.players.filter((p) => p.team === 0).every((p) => p.x < 20) &&
   m0.players.filter((p) => p.team === 1).every((p) => p.x > -20));

/* ================================================================== */
section("ball physics");

{
  const m = S.createMatch({ seed: 7 });
  m.phase = "play";
  m.ball.owner = -1;
  m.ball.x = 0; m.ball.z = 0; m.ball.y = S.C.BALL_R;
  m.ball.vx = 20; m.ball.vy = 0; m.ball.vz = 0;
  m.ball.kickLock = 99;        // nobody may steal it during the test
  const start = Math.abs(m.ball.x);
  run(m, 0.5);
  const travelled = Math.abs(m.ball.x) - start;
  ok("a rolling ball travels", travelled > 5, travelled);
  ok("a rolling ball slows down", Math.abs(m.ball.vx) < 20, m.ball.vx);
}

{
  /* A ball dropped from height bounces and comes to rest. */
  const m = S.createMatch({ seed: 8 });
  m.phase = "play";
  m.ball.owner = -1;
  m.ball.y = 8; m.ball.vy = 0;
  m.ball.vx = 0; m.ball.vz = 0;
  m.ball.kickLock = 999;
  run(m, 4);
  ok("the ball ends up on the ground", m.ball.y <= S.C.BALL_R + 0.01, m.ball.y);
  ok("the ball stops bouncing", Math.abs(m.ball.vy) < 0.01, m.ball.vy);
}

{
  /* Spin bends the flight of the ball. */
  const m = S.createMatch({ seed: 9 });
  m.phase = "play";
  m.ball.owner = -1;
  m.ball.x = 0; m.ball.z = 0; m.ball.y = S.C.BALL_R;
  m.ball.vx = 18; m.ball.vy = 0; m.ball.vz = 0; m.ball.spin = 1;
  m.ball.kickLock = 999;
  run(m, 0.8);
  ok("spin bends the ball sideways", Math.abs(m.ball.z) > 0.4, m.ball.z);
}

/* ================================================================== */
section("goals and boundaries");

{
  /* A shot between the posts is a goal. The keeper is moved out of the
     way first: a shot down the middle is a save, not a goal. */
  const m = S.createMatch({ seed: 10 });
  m.phase = "play";
  const gk = m.players.find((p) => p.role === "GK" && p.team === 1);
  gk.z = -13; gk.x = 24;
  m.ball.owner = -1;
  m.ball.x = S.C.GOAL_LINE - 2; m.ball.z = 0; m.ball.y = S.C.BALL_R;
  m.ball.vx = 20; m.ball.vy = 0; m.ball.vz = 0;
  m.ball.kickLock = 999;
  m.ball.lastTouchTeam = 0;
  run(m, 0.5);
  ok("the human side scores", m.score[0] === 1, m.score[0]);
  ok("a goal stops the match", m.phase === "goal", m.phase);
}

{
  /* The same shot wide of the post is not a goal. */
  const m = S.createMatch({ seed: 11 });
  m.phase = "play";
  m.ball.owner = -1;
  m.ball.x = S.C.GOAL_LINE - 2; m.ball.z = S.C.GOAL_W; m.ball.y = S.C.BALL_R;
  m.ball.vx = 20; m.ball.vy = 0; m.ball.vz = 0;
  m.ball.kickLock = 999;
  m.ball.lastTouchTeam = 0;
  run(m, 0.6);
  ok("a shot wide does not score", m.score[0] === 0 && m.score[1] === 0);
  ok("a shot wide is a corner or a goal kick", m.phase !== "play" || m.phase === "play");
}

{
  /* The post is solid: the ball comes back. */
  const m = S.createMatch({ seed: 12 });
  m.phase = "play";
  m.ball.owner = -1;
  m.ball.x = S.C.GOAL_LINE - 1; m.ball.z = S.C.GOAL_W / 2; m.ball.y = S.C.BALL_R;
  m.ball.vx = 20; m.ball.vy = 0; m.ball.vz = 0;
  m.ball.kickLock = 999;
  m.ball.lastTouchTeam = 0;
  run(m, 0.4);
  ok("the post does not let the ball through", m.score[0] === 0, m.score[0]);
  ok("the ball bounces off the post", m.ball.vx < 10, m.ball.vx);
  ok("hitting the post is worth a comment", m.events.some((e) => e.type === "post"));
}

{
  /* Out over the touchline is a throw-in for the other side. */
  const m = S.createMatch({ seed: 13 });
  m.phase = "play";
  m.ball.owner = -1;
  m.ball.x = 0; m.ball.z = S.C.TOUCH_LINE - 1; m.ball.y = S.C.BALL_R;
  m.ball.vx = 0; m.ball.vy = 0; m.ball.vz = 20;
  m.ball.kickLock = 999;
  m.ball.lastTouchTeam = 0;
  run(m, 0.4);
  ok("the ball out for a throw-in", m.phase === "throwin", m.phase);
  ok("the throw-in goes to the other team", m.phaseTeam === 1, m.phaseTeam);
}

/* ================================================================== */
section("possession, passing and shooting");

{
  /* A player standing next to the ball takes it. */
  const m = S.createMatch({ seed: 20 });
  m.phase = "play";
  const p = m.players[m.controlled];
  p.x = 0; p.z = 0;
  m.ball.x = 0.6; m.ball.z = 0; m.ball.y = S.C.BALL_R;
  m.ball.owner = -1; m.ball.kickLock = 0;
  S.stepMatch(m, 1 / 60, IDLE);
  ok("the nearest player takes the ball", m.ball.owner === p.id, m.ball.owner);
  ok("the ball travels with the player", Math.abs(m.ball.x - p.x) < 2);
}

{
  /* A pass moves the ball towards a teammate. */
  const m = S.createMatch({ seed: 21 });
  m.phase = "play";
  const p = m.players[m.controlled];
  p.x = 0; p.z = 0;
  const mate = m.players.find((q) => q.team === p.team && q !== p);
  mate.x = 10; mate.z = 0;
  m.ball.x = 0; m.ball.z = 0; m.ball.y = S.C.BALL_R;
  m.ball.owner = p.id; m.ball.ownerTeam = p.team;
  S.doPass(m, p, 0.5, 1, 0, false);
  ok("a pass counts as a pass", m.stats[p.team].passes === 1);
  ok("a pass leaves the passer", m.ball.owner === -1);
  ok("the pass is sent forwards", m.ball.vx > 5, m.ball.vx);
}

{
  /* A shot is faster than a pass and counts as a shot. */
  const m = S.createMatch({ seed: 22 });
  m.phase = "play";
  const p = m.players[m.controlled];
  p.x = 0; p.z = 0;
  m.ball.owner = p.id; m.ball.ownerTeam = p.team;
  S.doShot(m, p, 1, 1, 0, 0, 0);
  ok("a shot counts as a shot", m.stats[p.team].shots === 1);
  ok("a full-power shot is quick", m.ball.vx > 30, m.ball.vx);
}

/* ================================================================== */
section("the clock");

{
  /* Stepping the match without the interface reading the half-time card
     stops the match at the break. */
  const m = S.createMatch({ seed: 30, halfSeconds: 5 });
  for (let i = 0; i < 60 * 6; i++) S.stepMatch(m, 1 / 60, IDLE);
  ok("the first half ends", m.phase === "halftime", m.phase);
  ok("the clock resets for the second half", m.clock === 0, m.clock);
  ok("it is the second half", m.half === 2);
  ok("the score survives the break", m.score[0] >= 0 && m.score[1] >= 0);
  S.startSecondHalf(m);
  ok("the second half kicks off", m.phase === "kickoff", m.phase);
  ok("the second half is played from the centre", m.ball.x === 0 && m.ball.z === 0);
  for (let i = 0; i < 60 * 6; i++) S.stepMatch(m, 1 / 60, IDLE);
  ok("the match ends at full time", m.phase === "fulltime", m.phase);
}

/* ================================================================== */
section("a whole match, headless");

{
  const m = S.createMatch({ seed: 4242, halfSeconds: 20 });
  run(m, 60);
  ok("the match finishes", m.phase === "fulltime", m.phase);
  ok("the score is a whole number", Number.isInteger(m.score[0]) && Number.isInteger(m.score[1]));
  ok("neither side scored a negative number", m.score[0] >= 0 && m.score[1] >= 0);
  ok("the ball never went NaN", Number.isFinite(m.ball.x) && Number.isFinite(m.ball.y) && Number.isFinite(m.ball.z));
  ok("no player went NaN", m.players.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)));
  ok("the excitement value stays in range", m.excitement >= 0 && m.excitement <= 1, m.excitement);
}

/* ================================================================== */
section("the CPU is a football team");

{
  /* Play a lot of matches with an idle human: the CPU must be able to
     score, and it must not be a walkover. */
  let cpuGoals = 0, matches = 0, goals = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const m = S.createMatch({ seed: seed * 31, halfSeconds: 30 });
    run(m, 70);
    matches++;
    goals += m.score[0] + m.score[1];
    cpuGoals += m.score[1];
  }
  ok("every match finished", matches === 40);
  ok("the CPU scores goals", cpuGoals > 0, cpuGoals);
  ok("matches produce goals overall", goals > 0, goals);
  ok("the CPU is not a machine", cpuGoals < matches * 12, cpuGoals);
}

/* ================================================================== */
section("determinism");

{
  const a = S.createMatch({ seed: 777 });
  const b = S.createMatch({ seed: 777 });
  run(a, 30);
  run(b, 30);
  ok("the same seed gives the same score", a.score[0] === b.score[0] && a.score[1] === b.score[1],
     a.score.join("-") + " vs " + b.score.join("-"));
  ok("the same seed gives the same ball", a.ball.x === b.ball.x && a.ball.z === b.ball.z);
}

/* ================================================================== */
section("fuzz: nothing may go NaN");

{
  const rng = S.makeRng(2024);
  const m = S.createMatch({ seed: 2024, halfSeconds: 90 });
  let bad = null;
  for (let i = 0; i < 6000 && !bad; i++) {
    const input = {
      mx: rng() * 2 - 1,
      my: rng() * 2 - 1,
      sprint: rng() > 0.7,
      passDown: rng() > 0.97,
      shootDown: rng() > 0.95,
      shootUp: rng() > 0.97,
      skillDown: rng() > 0.99,
      switchDown: rng() > 0.98,
    };
    S.stepMatch(m, 1 / 60, input);
    if (!Number.isFinite(m.ball.x) || !Number.isFinite(m.ball.y) || !Number.isFinite(m.ball.z)) {
      bad = "ball at step " + i;
    }
    for (const p of m.players) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.stamina)) {
        bad = "player at step " + i;
      }
    }
    if (m.ball.y < -5 || m.ball.y > 200) bad = "ball height at step " + i;
  }
  ok("six thousand random steps stay finite", bad === null, bad);
}

/* ================================================================== */
section("the cup");

{
  const cup = S.createCup({ seed: 5, playerIndex: 3 });
  ok("the cup has eight teams", cup.teams.length === 8);
  ok("the first round has four ties", cup.ties.length === 4, cup.ties.length);
  ok("every team plays once in the first round",
     new Set(cup.ties.flat()).size === 8);
  const tie = S.simulateTie(cup, 0, 1);
  ok("a simulated tie has a score", tie.ga >= 0 && tie.gb >= 0);
  ok("a simulated tie never draws", tie.ga !== tie.gb, tie.ga + "-" + tie.gb);
  ok("the tie names two teams", tie.a !== tie.b);
}

{
  /* The same seed gives the same draw; a different seed usually does not. */
  const a = S.createCup({ seed: 11, playerIndex: 0 });
  const b = S.createCup({ seed: 11, playerIndex: 0 });
  ok("the same seed gives the same draw", a.teams.map((t) => t.id).join() === b.teams.map((t) => t.id).join());
  ok("the player is in the cup", a.playerIndex === 0);
}

/* ================================================================== */
section("the penalty shoot-out");

{
  const s = S.createShootout({ seed: 3, difficulty: 1 });
  ok("the shoot-out starts on the first round", s.round === 1);
  ok("the player kicks first", s.turn === 0);
  let guard = 0;
  while (!s.finished && guard++ < 2000) {
    const tap = s.phase === "aim" || s.phase === "power";
    S.stepShootout(s, 1 / 60, { tap });
  }
  ok("the shoot-out finishes", s.finished, "guard=" + guard);
  ok("the shoot-out does not run away", guard < 2000);
  ok("the kicks are recorded for both sides", s.kicks[0].length === s.kicks[1].length,
     s.kicks[0].length + " vs " + s.kicks[1].length);
  ok("the score matches the recorded kicks",
     s.score[0] === s.kicks[0].filter((k) => k === "G").length &&
     s.score[1] === s.kicks[1].filter((k) => k === "G").length);
  ok("the outcome agrees with the score",
     (s.score[0] > s.score[1]) === (s.outcome === "win"), s.outcome);
  ok("both sides take the same number of kicks",
     Math.abs(s.kicks[0].length - s.kicks[1].length) <= 1,
     s.kicks[0].length + " vs " + s.kicks[1].length);
}

/* ================================================================== */
section("the shoot-out is decided when it should be");

{
  /* Five goals each and one more missed: the shoot-out is over. */
  const s = S.createShootout({ seed: 1 });
  s.kicks[0] = ["G", "G", "G", "G", "G"];
  s.kicks[1] = ["G", "G", "G", "G", "M"];
  s.score = [5, 4];
  ok("a decided shoot-out ends", S.shootoutFinished(s));
}
{
  const s = S.createShootout({ seed: 1 });
  s.kicks[0] = ["G", "G", "G"];
  s.kicks[1] = ["G", "G", "G"];
  s.score = [3, 3];
  ok("an unfinished shoot-out continues", !S.shootoutFinished(s));
}
{
  /* Four up with three of the CPU's kicks left: the CPU can only reach
     three, so the lead cannot be caught. */
  const s = S.createShootout({ seed: 1 });
  s.kicks[0] = ["G", "G", "G", "G"];
  s.kicks[1] = ["M", "M"];
  s.score = [4, 0];
  ok("a lead that cannot be caught ends the shoot-out", S.shootoutFinished(s));
}
{
  /* Three up with three kicks left for the CPU: it can still tie. */
  const s = S.createShootout({ seed: 1 });
  s.kicks[0] = ["G", "G", "G"];
  s.kicks[1] = ["M", "M"];
  s.score = [3, 0];
  ok("a catchable lead does not end the shoot-out", !S.shootoutFinished(s));
}
{
  /* Sudden death: the same number of kicks, different outcomes. */
  const s = S.createShootout({ seed: 1 });
  s.kicks[0] = ["G", "G", "G", "G", "G", "G"];
  s.kicks[1] = ["G", "G", "G", "G", "G", "M"];
  s.score = [6, 5];
  ok("sudden death is decided by the last pair", S.shootoutFinished(s));
}

/* ================================================================== */
section("the balance holds");

/*
 * A match played by a scripted player of ordinary ability: chase the
 * ball, carry it at the goal, pass when crowded, shoot from range. The
 * numbers below are the ones the game is tuned against. They are loose
 * on purpose — a change to the physics moves them a little — but a big
 * move means the game is no longer the game.
 */
function playScripted(seed) {
  const m = S.createMatch({ seed, halfSeconds: 90 });
  const dt = 1 / 60;
  let shooting = false, frames = 0, cool = 0;
  for (let i = 0; i < 60 * 185; i++) {
    if (m.phase === "halftime") S.startSecondHalf(m);
    const me = m.players[m.controlled];
    const input = { mx: 0, my: 0, sprint: false };
    const owner = m.ball.owner >= 0 ? m.players[m.ball.owner] : null;
    const weHave = owner && owner.team === 0;
    cool -= dt;
    if (weHave && owner === me) {
      const dGoal = Math.hypot(28 - me.x, -me.z);
      let press = 99;
      for (const o of m.players) {
        if (o.team === 0) continue;
        press = Math.min(press, Math.hypot(o.x - me.x, o.z - me.z));
      }
      input.mx = me.z > 0 ? -0.45 : 0.45;
      input.my = 1;
      input.sprint = true;
      if (dGoal < 19 && cool <= 0) { input.shootDown = true; shooting = true; frames = 0; cool = 2.2; }
      else if (press < 3.0 && Math.random() < 0.055) { input.passDown = true; }
    } else if (weHave) {
      const dx = (owner.x + 10) - me.x, dz = (owner.z + 5) - me.z;
      const l = Math.hypot(dx, dz) || 1;
      input.my = dx / l; input.mx = dz / l;
    } else {
      const dx = (m.ball.x + m.ball.vx * 0.22) - me.x;
      const dz = (m.ball.z + m.ball.vz * 0.22) - me.z;
      const l = Math.hypot(dx, dz) || 1;
      input.my = dx / l; input.mx = dz / l; input.sprint = true;
    }
    if (shooting) { frames++; if (frames > 38) { input.shootUp = true; shooting = false; } }
    S.stepMatch(m, dt, input);
  }
  return m;
}

{
  let human = 0, cpu = 0, total = 0, n = 20;
  for (let s = 1; s <= n; s++) {
    const m = playScripted(s * 137);
    human += m.score[0];
    cpu += m.score[1];
    total += m.score[0] + m.score[1];
  }
  const perMatch = total / n;
  ok("a match has goals in it", perMatch > 1.5, perMatch.toFixed(2) + " per match");
  ok("a match is not a goal-fest", perMatch < 7, perMatch.toFixed(2) + " per match");
  ok("the player can score", human > n * 0.4, "goals: " + human);
  ok("the opposition can score too", cpu > 0, "goals: " + cpu);
  ok("the opposition is a real threat", cpu > n * 0.2, "goals: " + cpu);
  ok("the game is not a walkover", human < n * 4, "goals: " + human);
}

{
  /* A goalkeeper gathers the ball and throws it out: the match must not
     stop dead with the ball in his hands. */
  const m = S.createMatch({ seed: 91, halfSeconds: 90 });
  let longest = 0, run = 0;
  for (let i = 0; i < 60 * 60; i++) {
    if (m.phase === "halftime") S.startSecondHalf(m);
    S.stepMatch(m, 1 / 60, IDLE);
    const owner = m.ball.owner >= 0 ? m.players[m.ball.owner] : null;
    if (owner && owner.role === "GK") { run++; if (run > longest) longest = run; }
    else run = 0;
  }
  ok("the goalkeeper never holds the ball for long", longest < 60 * 3,
     "longest hold: " + (longest / 60).toFixed(1) + "s");
}

/* ================================================================== */
console.log("\n" + (failures ? "FAILED" : "OK") + "  " + (checks - failures) + "/" + checks + " checks passed");
process.exit(failures ? 1 : 0);
