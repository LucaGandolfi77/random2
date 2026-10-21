/*
 * PIXEL CUP '96 — the game
 * ------------------------
 * Boot, the loop, and the rules of the flow: which screen is showing,
 * what a goal does to the screen, when the cup moves to the next round.
 *
 * The picture is drawn at 320x180 into a byte buffer and pushed into a
 * canvas that the browser scales up with nearest-neighbour sampling, so
 * every pixel in the game stays a square pixel on the screen.
 */

(function () {
  "use strict";

  var Core = window.PixelCupCore;
  var Render = window.PixelRender;
  var Raster = window.PixelRaster;
  var Font = window.PixelFont;
  var Input = window.PixelInput;
  var Audio = window.PixelAudio;
  var Storage = window.PixelStorage;
  var UI = window.PixelUI;

  var W = 320, H = 180;
  var STEP = 1 / 60;

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });
  canvas.width = W;
  canvas.height = H;

  var buf = Raster.createBuffer(W, H);
  var image = ctx.createImageData(W, H);
  /* The renderer draws into the very same array the browser owns, so the
     frame is uploaded without a copy. */
  buf.data = image.data;
  var cam = Render.createCamera();
  var input = Input.createInput();
  var audio = Audio.createAudio();
  var ui = UI.createUI({
    screen: document.getElementById("screen"),
    live: document.getElementById("live"),
    audio: audio,
    onAction: onAction,
  });

  /* The recording: twenty frames a second for twelve seconds. */
  var REC_MAX = 260, REC_STRIDE = 33, REC_HZ = 20;

  var game = {
    mode: "title",       /* title | match | shootout | replay */
    match: null,
    cup: null,
    shootout: null,
    paused: false,
    pauseMenu: false,    /* the pause sheet is up */
    difficulty: 1,       /* 0 rookie, 1 pro, 2 legend */
    settings: Storage.getSettings(),
    flash: 0,
    slow: 0,
    shake: 0,
    spin: 0,
    banner: null,
    bannerTime: 0,
    commentary: null,
    commentaryTime: 0,
    confetti: [],
    trail: [],
    demo: null,           /* the match that plays itself on the title screen */
    demoTime: 0,
    rec: new Float32Array(REC_MAX * REC_STRIDE),
    recHead: 0,
    recN: 0,
    recTick: 0,
    bestGoal: null,
    replayIndex: 0,
    replayTimer: 0,
    replayGoal: false,
    shot: "top",        /* which camera is on: top or side */
    shotTimer: 0,
    weather: "day",     /* what the match is played in */
    drops: [],          /* the rain */
    camera: "auto",     /* auto, top or side */
  };

  /* ---- helpers ---- */

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function setBanner(text, time) {
    game.banner = text;
    game.bannerTime = time || 1.6;
  }

  function setCommentary(text, time) {
    game.commentary = text;
    game.commentaryTime = time || 2.4;
  }

  function addConfetti(x, y, count) {
    var cols = [[255, 214, 64], [240, 240, 250], [96, 214, 120], [255, 120, 96], [120, 170, 255]];
    for (var i = 0; i < (count || 60); i++) {
      game.confetti.push({
        x: x, y: y,
        vx: rnd(-70, 70),
        vy: rnd(-150, -40),
        life: rnd(0.7, 1.8),
        color: cols[(Math.random() * cols.length) | 0],
      });
    }
  }

  /* ---- the rain ---- */

  /*
   * The drops live in the interface, because they are screen-space and
   * they move whether or not the match is running. The renderer only
   * puts them on the glass.
   */
  function makeRain() {
    game.drops.length = 0;
    if (game.weather !== "rain") return;
    for (var i = 0; i < 110; i++) {
      game.drops.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 2 + ((Math.random() * 3) | 0),
        speed: 260 + Math.random() * 220,
        slant: 0.22 + Math.random() * 0.2,
      });
    }
  }

  function updateRain(dt) {
    if (!game.drops.length) return;
    for (var i = 0; i < game.drops.length; i++) {
      var d = game.drops[i];
      d.y += d.speed * dt;
      d.x -= d.speed * d.slant * dt;
      if (d.y > H + 4) {
        d.y = -4;
        d.x = Math.random() * (W + 40);
      }
      if (d.x < -6) d.x += W + 12;
    }
  }

  /* ---- the settings ---- */

  function applySetting(name, on, settings) {
    Storage.setSettings(settings);
    if (name === "sound") audio.setSoundEnabled(on);
    if (name === "music") audio.setMusicEnabled(on);
    if (name === "haptics" && R2) R2.setSettings({ haptics: on });
  }

  /* Which camera is on, for the heads-up display. */
  function cameraLabel() {
    if (game.camera !== "auto") return game.camera.toUpperCase();
    return "AUTO · " + game.shot.toUpperCase();
  }

  /* The camera the player wants. It takes effect at once: the next frame
     is drawn from where they asked. */
  function setCamera(name) {
    game.camera = name;
    Storage.setCamera(name);
    if (name !== "auto" && name !== game.shot) {
      game.shot = name;
      game.shotTimer = 0;
    }
  }

  /* ---- pausing ----------------------------------------------------- */

  /*
   * Pausing is more than stopping the simulation: the music ducks, the
   * crowd goes quiet, and the sheet offers a way out. Without this there
   * is no way out of a match at all.
   */
  function openPause() {
    if (game.mode !== "match" || game.paused) return;
    game.pauseMenu = true;
    game.paused = true;
    audio.setPaused(true);
    ui.showPause(game.settings, {
      onSetting: applySetting,
      onCamera: setCamera,
      onAction: onAction,
    });
    announce("Paused.");
  }

  function closePause() {
    if (!game.pauseMenu) return;
    game.pauseMenu = false;
    game.paused = false;
    audio.setPaused(false);
    ui.hide();
  }

  /* ---- the match ---- */

  function startMatch(homeId, awayId, options) {
    options = options || {};
    var seed = (Math.random() * 0xffffffff) >>> 0;
    game.match = Core.createMatch({
      seed: seed,
      home: homeId,
      away: awayId,
      difficulty: options.difficulty == null ? 1 : options.difficulty,
      halfSeconds: options.halfSeconds || Core.C.HALF_SECONDS,
      weather: options.weather || game.weather,
    });
    makeRain();
    game.mode = "match";
    game.paused = false;
    game.flash = 0;
    game.slow = 0;
    game.confetti.length = 0;
    game.trail.length = 0;
    ui.hide();
    audio.startCrowd();
    audio.startMusic();
    if (window.R2) { R2.markPlayed("pixel-cup-pwa/"); R2.trackPlaytime("pixel-cup-pwa/"); }
    announce("Kick off. " + game.match.home.name + " against " + game.match.away.name + ".");
  }

  function announce(text) { ui.announce(text); }

  /*
   * The card at the end of a match. It is shown twice: once when the
   * match ends, and once more after the replay, so the replay is a
   * detour rather than a dead end.
   */
  function showFullTimeCard() {
    var m = game.match;
    var result = m.score[0] > m.score[1] ? "win" : (m.score[0] === m.score[1] ? "draw" : "loss");
    var options = { rematch: !game.cup, newCup: !!game.cup && result === "loss" };
    if (game.bestGoal && game.bestGoal.n > 4) options.replay = true;
    if (options.replay) options.report = true;
    ui.showFullTime(m, result, options);
    game.paused = true;
  }

  /* The match report: the numbers, and where the ball spent the match. */
  function showReport(back) {
    if (!game.match) return;
    ui.showStats(game.match, {
      onBack: function () {
        if (back === "halftime") ui.showHalftime(game.match, { report: true });
        else showFullTimeCard();
      },
    });
    game.paused = true;
  }

  function onMatchEnd() {
    var m = game.match;
    var result = m.score[0] > m.score[1] ? "win" : (m.score[0] === m.score[1] ? "draw" : "loss");
    Storage.addMatch({
      win: result === "win",
      draw: result === "draw",
      goals: m.score[0],
      conceded: m.score[1],
    });
    if (window.R2) {
      R2.stats.run({
        slug: "pixel-cup-pwa",
        score: m.score[0],
        durMs: Math.round(m.clock * 1000),
        outcome: result,
        meta: { conceded: m.score[1], shots: m.stats[0].shots },
      });
      R2.stats.event("pixel-cup-pwa", "goals", m.score[0]);
    }
    audio.whistle();
    audio.crowdRoar(result === "win" ? 1 : 0.5);
    showFullTimeCard();
  }

  /* The events the model raises, turned into noise, words and movement. */
  function handleEvents(m) {
    for (var i = 0; i < m.events.length; i++) {
      var e = m.events[i];
      switch (e.type) {
        case "goal":
          audio.fanfare();
          audio.net();
          game.flash = 1;
          game.slow = 0.45;
          game.shake = 0.5;
          setBanner("GOOOOL!", 2.2);
          setCommentary(e.text || "Che gola!", 2.6);
          addConfetti(W / 2, 40, 90);
          keepBestGoal(m);
          announce("Goal! " + m.home.name + " " + m.score[0] + ", " + m.away.name + " " + m.score[1] + ".");
          break;
        case "post":
          audio.post();
          game.shake = 0.35;
          setCommentary("Ooooh! Ci siamo vicini!", 2);
          break;
        case "save":
          audio.save();
          setCommentary(e.text || "Grande parata!", 1.8);
          break;
        case "tackle":
          audio.tackle();
          setCommentary("Bella difesa!", 1.6);
          break;
        case "shot":
          game.shake = Math.max(game.shake, 0.16);
          break;
        case "corner":
          setBanner("CORNER", 1.4);
          break;
        case "throwin":
          setBanner("THROW-IN", 1.2);
          break;
        case "goalkick":
          setBanner("GOAL KICK", 1.2);
          break;
        case "foul":
          setCommentary("Fallo! Annullato!", 2);
          break;
        case "through":
          setCommentary("Passa! Passa!", 1.4);
          break;
        case "header":
          audio.kick(1.1);
          game.shake = Math.max(game.shake, 0.25);
          setCommentary(e.text || "Che testa!", 1.6);
          break;
        case "cross":
          audio.kick(0.7);
          setBanner("CROSS!", 1.1);
          break;
        case "clearance":
          audio.kick(0.9);
          setCommentary(e.text || "Via!", 1.2);
          break;
        case "halftime":
          audio.whistle();
          setBanner("HALF TIME", 2);
          break;
        default:
          break;
      }
    }
    m.events.length = 0;
  }

  /* ---- the cup ---- */

  function cupOpponent() {
    var cup = game.cup;
    var tie = cup.ties[cup.round];
    if (!tie) return null;
    for (var i = 0; i < tie.length; i++) {
      if (tie[i] === cup.playerIndex) return tie[i === 0 ? 1 : 0];
    }
    return null;
  }

  function startCup() {
    var saved = Storage.getCup();
    if (saved && !saved.done) {
      game.cup = saved;
    } else {
      game.cup = Core.createCup({
        seed: (Math.random() * 0xffffffff) >>> 0,
        playerIndex: Math.floor(Math.random() * 8),
      });
      Storage.setCup(game.cup);
    }
    var opp = cupOpponent();
    if (opp == null) { showBracket(); return; }
    var myTeam = Core.cupPlayerTeam(game.cup);
    var theirTeam = game.cup.teams[opp];
    startMatch(myTeam.id, theirTeam.id, { difficulty: 1 + game.cup.round * 0.4 });
  }

  function showBracket() {
    ui.showBracket(game.cup);
    game.paused = true;
  }

  function cupAdvance(won) {
    var cup = game.cup;
    var tie = cup.ties[cup.round];
    var winners = [];
    for (var i = 0; i < tie.length; i++) {
      var a = tie[i], b = tie[i === 0 ? 1 : 0];
      if (a === cup.playerIndex || b === cup.playerIndex) {
        winners.push(won ? cup.playerIndex : (a === cup.playerIndex ? b : a));
      } else {
        var r = Core.simulateTie(cup, a, b);
        winners.push(r.ga > r.gb ? a : b);
      }
    }
    cup.history.push({ round: cup.round, winners: winners.slice() });
    cup.round++;
    if (cup.round === 1) {
      cup.ties = [[winners[0], winners[1]]];
    } else if (cup.round === 2) {
      cup.ties = [[winners[0], winners[1]]];
    } else {
      cup.champion = winners[0];
      cup.done = true;
    }
    Storage.setCup(cup);
  }

  function afterCupMatch() {
    var m = game.match;
    var won = m.score[0] > m.score[1];
    var drew = m.score[0] === m.score[1];
    if (drew) {
      /* A cup tie is settled on penalties. The draw is decided here, in
         the same way the shoot-out mode would decide it. */
      var s = Core.createShootout({ seed: (Math.random() * 0xffffffff) >>> 0, difficulty: 1 });
      var guard = 0;
      while (!s.finished && guard++ < 400) {
        Core.stepShootout(s, 1 / 60, { tap: s.phase === "aim" || s.phase === "power" });
      }
      won = s.score[0] > s.score[1];
    }
    cupAdvance(won);
    if (!won) {
      Storage.clearCup();
      game.cup = null;
      ui.showFullTime(m, "loss", { newCup: true });
      return;
    }
    if (game.cup.done) {
      Storage.addTrophy();
      Storage.clearCup();
      var champ = game.cup.teams[game.cup.champion];
      ui.showTrophy(game.cup, champ);
      game.cup = null;
      return;
    }
    /* Next round: the bracket is on screen for a moment. */
    ui.showBracket(game.cup);
  }

  /* ---- the shoot-out ---- */

  function startShootout() {
    game.shootout = Core.createShootout({
      seed: (Math.random() * 0xffffffff) >>> 0,
      difficulty: 1,
    });
    game.mode = "shootout";
    game.paused = false;
    ui.hide();
    audio.startCrowd();
    audio.startMusic();
    if (window.R2) { R2.markPlayed("pixel-cup-pwa/"); R2.trackPlaytime("pixel-cup-pwa/"); }
  }

  /* ---- the attract mode ---- */

  /*
   * The title screen is not a still picture: a match is being played
   * behind the menu, with both sides on the computer. It is the first
   * thing anybody sees, and a word on a blue screen is a waste of it.
   */
  function startDemo() {
    var a = Math.floor(Math.random() * Core.TEAMS.length);
    var b = (a + 1 + Math.floor(Math.random() * (Core.TEAMS.length - 1))) % Core.TEAMS.length;
    /* The attract mode picks its own weather, and a new one whenever it
       re-pairs. */
    var names = Render.WEATHER_NAMES;
    game.demo = Core.createMatch({
      seed: (Math.random() * 0xffffffff) >>> 0,
      home: Core.TEAMS[a].id,
      away: Core.TEAMS[b].id,
      difficulty: 1,
      demo: true,
      weather: names[Math.floor(Math.random() * names.length)],
    });
    game.demoTime = 0;
    game.demoSwap = 0;
  }

  function updateDemo(dt) {
    if (!game.demo) return;
    game.demoTime += dt;
    /* A new pairing every couple of minutes, so it never looks like a
       loop. */
    if (game.demoTime > 105) {
      startDemo();
      return;
    }
    Core.stepMatch(game.demo, dt, { mx: 0, my: 0 });
    /* The demo's own events are not worth announcing, but the crowd
       should still react to the match going on behind the menu. */
    game.demo.events.length = 0;
    audio.setExcitement(game.demo.excitement);
  }

  /* ---- the recording, for the replay ---- */

  /*
   * The last twelve seconds of the match, at twenty frames a second:
   * where the ten players were, and where the ball was. It is about
   * thirty kilobytes, it is written while the match is being played,
   * and it is what the best-goal replay is made of.
   */
  function recordFrame() {
    var m = game.match;
    if (!m || m.players.length < 10) return;
    var o = game.recHead * REC_STRIDE;
    for (var i = 0; i < 10; i++) {
      var p = m.players[i];
      game.rec[o + i * 3] = p.x;
      game.rec[o + i * 3 + 1] = p.z;
      game.rec[o + i * 3 + 2] = p.facing;
    }
    var b = o + 30;
    game.rec[b] = m.ball.x;
    game.rec[b + 1] = m.ball.y;
    game.rec[b + 2] = m.ball.z;
    game.recHead = (game.recHead + 1) % REC_MAX;
    if (game.recN < REC_MAX) game.recN++;
  }

  /* The oldest frame is the one before the write head. */
  function recOffset(index) {
    var start = (game.recHead - game.recN + REC_MAX) % REC_MAX;
    return ((start + index) % REC_MAX) * REC_STRIDE;
  }

  /* How far the ball travelled over the recording, and how far it was
     from the goal when it got there: a long one is worth watching. */
  function scoreGoal(m) {
    var travel = 0;
    var fromX = 0;
    for (var i = 1; i < game.recN; i++) {
      var a = recOffset(i - 1) + 30, b = recOffset(i) + 30;
      var dx = game.rec[b] - game.rec[a];
      var dz = game.rec[b + 2] - game.rec[a + 2];
      travel += Math.sqrt(dx * dx + dz * dz);
    }
    /* Where the ball was when it crossed the line. */
    var last = recOffset(game.recN - 1) + 30;
    fromX = Math.abs(game.rec[last]);
    var range = Math.max(0, Core.C.GOAL_LINE - fromX);
    return travel + range * 2.2;
  }

  function keepBestGoal(m) {
    var score = scoreGoal(m);
    if (!game.bestGoal || score > game.bestGoal.score) {
      game.bestGoal = {
        score: score,
        n: game.recN,
        rec: game.rec.slice(0, REC_MAX * REC_STRIDE),
        goals: [m.score[0], m.score[1]],
        clock: m.clock,
        half: m.half,
      };
    }
  }

  /*
   * Rebuild a match-shaped object out of the recording, so the renderer
   * can draw a replay without knowing anything about recordings.
   */
  function replayFrame(index, prevIndex) {
    var m = game.match;
    var o = recOffsetFrom(game.bestGoal, index);
    var po = prevIndex >= 0 ? recOffsetFrom(game.bestGoal, prevIndex) : -1;
    var players = [];
    for (var i = 0; i < 10; i++) {
      var x = game.bestGoal.rec[o + i * 3];
      var z = game.bestGoal.rec[o + i * 3 + 1];
      var anim = 0;
      if (po >= 0) {
        var px = game.bestGoal.rec[po + i * 3];
        var pz = game.bestGoal.rec[po + i * 3 + 1];
        anim = Math.sqrt((x - px) * (x - px) + (z - pz) * (z - pz)) * 2.4;
      }
      players.push({
        index: i, id: i, team: i < 5 ? 0 : 1, role: "MID",
        x: x, z: z, facing: game.bestGoal.rec[o + i * 3 + 2],
        anim: anim, slide: 0, stamina: 100, dir: i < 5 ? 1 : -1,
      });
    }
    var ball = {
      x: game.bestGoal.rec[o + 30],
      y: game.bestGoal.rec[o + 31],
      z: game.bestGoal.rec[o + 32],
      vx: 0, vy: 0, vz: 0, spin: 0, owner: -1,
    };
    return {
      players: players, ball: ball, controlled: -1,
      excitement: 0.85, demo: false,
      clock: game.bestGoal.clock || 0,
      half: game.bestGoal.half || 1,
      home: { kit: m.home.kit, shorts: m.home.shorts, short: m.home.short, name: m.home.name },
      away: { kit: m.away.kit, shorts: m.away.shorts, short: m.away.short, name: m.away.name },
      score: game.bestGoal.goals || [0, 0],
    };
  }

  function recOffsetFrom(best, index) {
    var start = (game.recHead - best.n + REC_MAX) % REC_MAX;
    return ((start + index) % REC_MAX) * REC_STRIDE;
  }

  function startReplay() {
    if (!game.bestGoal) return false;
    game.mode = "replay";
    game.replayIndex = 0;
    game.replayTimer = 0;
    game.replayGoal = false;
    game.paused = false;
    ui.hide();
    setBanner("THE BEST GOAL", 1.6);
    audio.crowdRoar(0.4);
    return true;
  }

  /* ---- the squad ---- */

  /*
   * The five who start. The player's choice is remembered per club; the
   * computer picks its own best five.
   */
  function squadFor(team) {
    var squad = Core.makeSquad(team);
    var saved = Storage.getSquad(team.id);
    var picked = saved ? Core.validateSelection(squad, saved) : null;
    return picked || Core.autoSelection(squad);
  }

  function showSquadPicker(team) {
    var squad = Core.makeSquad(team);
    var current = squadFor(team);
    ui.showSquadPicker(squad, current, {
      title: team.name + " — pick your five",
      action: "kickoff",
      onAction: onAction,
    });
  }

  /* The team and the difficulty are chosen first; the five are chosen
     next; then the whistle. */
  function beginMatch() {
    var team = Core.teamById(game.pickedTeam);
    if (game.pending === "cup") {
      var cup = game.cup;
      startMatch(cup.teams[cup.playerIndex].id,
                 cup.teams[cupOpponentFor(cup)].id,
                 { difficulty: Math.min(2, 0.5 + game.difficulty * 0.75) });
    } else {
      var others = Core.TEAMS.filter(function (t) { return t.id !== team.id; });
      var other = others[Math.floor(Math.random() * others.length)];
      startMatch(team.id, other.id, { difficulty: game.difficulty });
    }
  }

  /* Put the chosen men on the pitch, slot by slot. */
  function applySubstitutions(ids) {
    var m = game.match;
    if (!m || !ids) return;
    var squad = Core.makeSquad(m.home);
    for (var s = 0; s < 5; s++) {
      var on = m.players[s];
      var sp = null;
      for (var k = 0; k < squad.length; k++) if (squad[k].id === ids[s]) sp = squad[k];
      if (sp && on.squadId !== sp.id) Core.substitute(m, 0, s, sp);
    }
    ui.hide();
    Core.startSecondHalf(m);
    game.paused = false;
  }

  /*
   * A substitution at half-time: the same picker, but the five on the
   * pitch are the ones already playing, and what comes back is a swap
   * on the field rather than a new line-up.
   */
  function showSubstitution() {
    var m = game.match;
    if (!m) return;
    var team = m.home;
    var squad = Core.makeSquad(team);
    var current = [];
    for (var i = 0; i < 5; i++) {
      var p = m.players[i];
      current.push({
        id: p.squadId, name: p.name, num: p.num, role: p.role,
        pace: p.pace, power: p.power, technique: p.technique,
      });
    }
    ui.showSquadPicker(squad, current, {
      title: "Substitution",
      hint: "Tap a man on the pitch to send him off, or a man on the bench to bring him on.",
      action: "subconfirm",
      onAction: onAction,
    });
  }

  /* ---- the menu ---- */

  function showTitle() {
    game.mode = "title";
    game.paused = true;
    game.pauseMenu = false;
    audio.setPaused(false);
    var records = Storage.getRecords();
    if (!game.demo) startDemo();
    ui.showTitle({
      hasCup: !!Storage.getCup(),
      settings: game.settings,
      camera: game.camera,
      onSetting: applySetting,
      onCamera: setCamera,
    });
    if (records.matches) {
      announce("You have played " + records.matches + " matches and won " + records.wins + ".");
    }
  }

  function onAction(action, extra, level, weather) {
    switch (action) {
      case "quick":
        game.pending = "quick";
        ui.showTeamSelect(Core.TEAMS, 0, "Quick match — pick your team", onAction,
                          { difficulty: game.difficulty, weather: game.weather });
        break;
      case "cup":
        game.pending = "cup";
        ui.showTeamSelect(Core.TEAMS, Math.floor(Math.random() * 8),
                          "The Cup — pick your team", onAction,
                          { difficulty: game.difficulty, weather: game.weather });
        break;
      case "shootout":
        ui.showShootoutIntro();
        break;
      case "go":
        startShootout();
        break;
      case "start":
        game.difficulty = level == null ? 1 : level;
        if (weather) {
          game.weather = weather;
          makeRain();
        }
        game.pickedIndex = extra;
        game.pickedTeam = Core.TEAMS[extra].id;
        if (game.pending === "cup") {
          /* The cup is already drawn; the club the player picked is the
             one they take through it. */
          var cup = game.cup || Core.createCup({
            seed: (Math.random() * 0xffffffff) >>> 0,
            playerIndex: extra,
          });
          for (var ci = 0; ci < cup.teams.length; ci++) {
            if (cup.teams[ci].id === Core.TEAMS[extra].id) cup.playerIndex = ci;
          }
          game.cup = cup;
          Storage.setCup(cup);
        }
        showSquadPicker(Core.TEAMS[extra]);
        break;
      case "how":
        ui.showHelp();
        break;
      case "back":
        showTitle();
        break;
      case "continue":
        if (game.mode === "match" && game.match && game.match.phase === "halftime") {
          Core.startSecondHalf(game.match);
          game.paused = false;
          ui.hide();
        } else if (game.mode === "match" && game.match && game.match.phase === "fulltime") {
          if (game.cup) afterCupMatch();
          else showTitle();
        } else if (game.mode === "shootout") {
          showTitle();
        } else {
          showTitle();
        }
        break;
      case "rematch":
        var m = game.match;
        startMatch(m.home.id, m.away.id, { difficulty: game.difficulty });
        break;
      case "resume":
        closePause();
        break;
      case "replay":
        startReplay();
        break;
      case "sub":
        showSubstitution();
        break;
      case "report":
        showReport(game.reportBack || "fulltime");
        break;
      case "kickoff":
        /* The five the player chose. */
        if (extra && game.pickedTeam) {
          var chosen = Core.validateSelection(Core.makeSquad(Core.teamById(game.pickedTeam)), extra);
          if (chosen) Storage.setSquad(game.pickedTeam, extra);
        }
        beginMatch();
        break;
      case "subconfirm":
        applySubstitutions(extra);
        break;
      case "restart":
        var again = game.match;
        game.pauseMenu = false;
        startMatch(again.home.id, again.away.id, { difficulty: game.difficulty });
        break;
      case "quit":
        game.pauseMenu = false;
        game.paused = true;
        audio.setPaused(false);
        showTitle();
        break;
      case "newcup":
        showTitle();
        break;
      default:
        break;
    }
  }

  function cupOpponentFor(cup) {
    var tie = cup.ties[0];
    for (var i = 0; i < tie.length; i++) {
      if (tie[i] === cup.playerIndex) return tie[i === 0 ? 1 : 0];
    }
    return tie[0] === cup.playerIndex ? tie[1] : tie[0];
  }

  /* ---- the loop ---- */

  var last = 0, acc = 0;

  function update(dt) {
    /* The pause key works whatever is on the screen. */
    if (input.state.pause) {
      if (game.pauseMenu) closePause();
      else openPause();
    }

    /* The attract mode runs on the title screen. */
    if (game.mode === "title") {
      updateDemo(dt);
      game.spin += dt * 6;
    }

    /* The replay runs at the speed it was recorded. */
    if (game.mode === "replay" && game.bestGoal) {
      game.replayTimer += dt;
      var step = 1 / REC_HZ;
      while (game.replayTimer >= step && game.replayIndex < game.bestGoal.n - 1) {
        game.replayTimer -= step;
        game.replayIndex++;
      }
      /* The last frame is the goal: hold it a moment, then go back to
         the card. */
      if (game.replayIndex >= game.bestGoal.n - 1) {
        if (game.replayTimer > 2.4) {
          game.mode = "match";
          game.paused = true;
          setBanner(null);
          showFullTimeCard();
        } else if (game.replayTimer > step * 3 && !game.replayGoal) {
          game.replayGoal = true;
          setBanner("GOOOOL!", 1.6);
          audio.fanfare();
        }
      }
    }

    if (game.mode === "match" && game.match && !game.paused) {
      var m = game.match;
      var scale = game.slow > 0 ? 0.35 : 1;
      if (game.slow > 0) game.slow -= dt;
      Core.stepMatch(m, dt * scale, input.state);
      handleEvents(m);
      audio.setExcitement(m.excitement);
      game.spin += dt * 6;
      /* The camera: a director, not a tripod. It changes shot when the
         other one has been the better choice for a moment — unless the
         player has asked for a fixed one, in which case the director
         keeps its hands off. */
      if (game.camera === "auto") {
        var want = Render.chooseShot(m);
        if (want !== game.shot) {
          game.shotTimer += dt;
          if (game.shotTimer > 1.3) {
            game.shot = want;
            game.shotTimer = 0;
            game.shake = Math.max(game.shake, 0.22);
          }
        } else {
          game.shotTimer = 0;
        }
      } else if (game.shot !== game.camera) {
        game.shot = game.camera;
        game.shotTimer = 0;
      }

      /* The ball leaves a short trail, so a hard shot reads as a hard
         shot and not as a dot teleporting about. */
      game.trail.push({ x: m.ball.x, y: m.ball.y, z: m.ball.z });
      if (game.trail.length > 12) game.trail.shift();
      /* And the last twelve seconds go into the recorder, in case this
         goal turns out to be the one worth watching again. */
      game.recTick += dt;
      if (game.recTick >= 1 / REC_HZ) {
        game.recTick -= 1 / REC_HZ;
        recordFrame();
      }
      if (m.phase === "halftime" && !game.paused) {
        game.paused = true;
        game.reportBack = "halftime";
        ui.showHalftime(m, { report: true });
      } else if (m.phase === "fulltime" && !game.paused) {
        game.paused = true;
        if (game.cup) {
          /* A cup tie counts for the record book too. */
          Storage.addMatch({
            win: m.score[0] > m.score[1],
            draw: m.score[0] === m.score[1],
            goals: m.score[0],
            conceded: m.score[1],
          });
          showFullTimeCard();
        } else {
          onMatchEnd();
        }
      }
    } else if (game.mode === "shootout" && game.shootout && !game.paused) {
      var s = game.shootout;
      Core.stepShootout(s, dt, { tap: input.state.tap || input.state.passDown });
      if (s.result && s.phase === "result" && !s._said) {
        s._said = true;
        if (s.result === "G") { audio.net(); audio.crowdRoar(0.7); }
        else { audio.crowdGroan(); }
        announce(s.result === "G" ? "Goal!" : "Missed!");
      }
      if (s.phase !== "result") s._said = false;
      if (s.finished && !game.paused) {
        game.paused = true;
        Storage.addShootout(s.outcome === "win");
        audio.whistle();
        ui.showFullTime(
          { home: { short: "YOU" }, away: { short: "CPU", name: "CPU" },
            score: s.score, stats: [{ shots: 0, passes: 0, saves: 0 }, { shots: 0, passes: 0, saves: 0 }] },
          s.outcome, { rematch: true });
      }
    }

    /* The effects. */
    updateRain(dt);
    if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 2.4);
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 1.8);
    if (game.bannerTime > 0) { game.bannerTime -= dt; if (game.bannerTime <= 0) game.banner = null; }
    if (game.commentaryTime > 0) {
      game.commentaryTime -= dt;
      if (game.commentaryTime <= 0) game.commentary = null;
    }
    for (var i = game.confetti.length - 1; i >= 0; i--) {
      var p = game.confetti[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
      if (p.life <= 0) game.confetti.splice(i, 1);
    }
  }

  function render() {
    Raster.beginFrame(buf);
    if (game.mode === "match" && game.match) {
      var m = game.match;
      cam.shake = game.shake;
      if (game.shot === "side") {
        Render.updateSideCamera(cam, buf, STEP, { x: m.ball.x, z: m.ball.z });
      } else {
        Render.updateCamera(cam, buf, STEP, { x: m.ball.x, z: m.ball.z });
      }
      Render.drawScene(buf, cam, m, {
        homeKit: m.home.kit, awayKit: m.away.kit,
        homeShorts: m.home.shorts, awayShorts: m.away.shorts,
        spin: game.spin, flash: game.flash,
        trail: game.trail,
      });
      Render.drawRain(buf, game.drops);
      ui.drawHUD(buf, m, {
        banner: game.banner,
        commentary: game.commentary,
        camera: cameraLabel(),
      });
    } else if (game.mode === "shootout" && game.shootout) {
      /* The shoot-out is framed from behind the ball. */
      cam.fov = 0.52;
      var goalX = Core.C.GOAL_LINE;
      Render.aimCamera(cam, buf, goalX - 26, 3.4, 0, goalX, 1.8, 0);
      Render.drawShootoutScene(buf, cam, game.shootout, {
        homeKit: "#2f6fe0", awayKit: "#d8342c", spin: game.spin,
      });
      ui.drawShootoutHUD(buf, game.shootout);
      if (game.shootout.phase === "aim") {
        Font.drawTextCentered(buf, W / 2, H - 30, "STOP THE MARKER", [255, 214, 64], 1);
      } else if (game.shootout.phase === "power") {
        Font.drawTextCentered(buf, W / 2, H - 30, "STOP THE POWER", [255, 214, 64], 1);
      } else if (game.shootout.phase === "result") {
        Font.drawTextCentered(buf, W / 2, H - 30,
          game.shootout.result === "G" ? "GOOOOL!" : "MISSED!",
          game.shootout.result === "G" ? [96, 214, 120] : [232, 88, 76], 2);
      }
    } else if (game.mode === "replay" && game.bestGoal) {
      var rm = replayFrame(game.replayIndex, game.replayIndex - 1);
      cam.shake = 0;
      Render.updateCamera(cam, buf, STEP, { x: rm.ball.x, z: rm.ball.z });
      Render.drawScene(buf, cam, rm, {
        homeKit: rm.home.kit, awayKit: rm.away.kit,
        homeShorts: rm.home.shorts, awayShorts: rm.away.shorts,
        spin: game.spin,
      });
      Render.drawRain(buf, game.drops);
      ui.drawHUD(buf, rm, { banner: game.banner, commentary: game.commentary });
    } else {
      /* The title screen: a match plays itself behind the menu. */
      if (game.demo) {
        var d = game.demo;
        cam.fov = 0.47;
        Render.updateDemoCamera(cam, buf, STEP, game.demoTime || 0, d.ball.x, d.ball.z);
        Render.drawScene(buf, cam, d, {
          homeKit: d.home.kit, awayKit: d.away.kit,
          homeShorts: d.home.shorts, awayShorts: d.away.shorts,
          spin: game.spin,
        });
      } else {
        Raster.fillGradient(buf, 14, 18, 34, 26, 34, 60);
        Font.drawTextCentered(buf, W / 2, 70, "PIXEL CUP 96", [255, 214, 64], 3);
      }
    }
    drawConfetti();
    ctx.putImageData(image, 0, 0);
  }

  function drawConfetti() {
    for (var i = 0; i < game.confetti.length; i++) {
      var p = game.confetti[i];
      var x = Math.round(p.x), y = Math.round(p.y);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      var idx = (y * W + x) * 4;
      buf.data[idx] = p.color[0];
      buf.data[idx + 1] = p.color[1];
      buf.data[idx + 2] = p.color[2];
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    input.poll();
    var steps = 0;
    while (acc >= STEP && steps < 5) {
      update(STEP);
      acc -= STEP;
      steps++;
      /* The edge-triggered actions are consumed by the first step of the
         frame, so a tap cannot fire twice. */
      input.endFrame();
    }
    if (steps === 0) input.endFrame();
    render();
  }

  /* ---- the touch controls ---- */

  function setupTouch() {
    var stickEl = document.getElementById("stick");
    var padEl = document.getElementById("stick-base");
    if (!stickEl || !padEl) return;

    function stickStart(e) {
      var t = e.changedTouches ? e.changedTouches[0] : e;
      var rect = padEl.getBoundingClientRect();
      input.stickDown(t.identifier, t.clientX - rect.left, t.clientY - rect.top);
      e.preventDefault();
    }
    function stickMove(e) {
      var t = e.changedTouches ? e.changedTouches[0] : e;
      var rect = padEl.getBoundingClientRect();
      input.stickMove(t.identifier, t.clientX - rect.left, t.clientY - rect.top);
      e.preventDefault();
    }
    function stickEnd(e) {
      var t = e.changedTouches ? e.changedTouches[0] : e;
      input.stickUp(t.identifier);
      e.preventDefault();
    }
    padEl.addEventListener("touchstart", stickStart, { passive: false });
    padEl.addEventListener("touchmove", stickMove, { passive: false });
    padEl.addEventListener("touchend", stickEnd, { passive: false });
    padEl.addEventListener("touchcancel", stickEnd, { passive: false });

    /* The stick is drawn where the thumb is. */
    (function () {
      var raf = 0;
      function paint() {
        raf = requestAnimationFrame(paint);
        var st = input.stick;
        if (!st.active) { stickEl.style.display = "none"; return; }
        stickEl.style.display = "block";
        stickEl.style.transform = "translate(" + (st.ox + st.x * st.radius) + "px," +
                                  (st.oy + st.y * st.radius) + "px)";
      }
      paint();
      window.addEventListener("beforeunload", function () { cancelAnimationFrame(raf); });
    })();

    var buttons = document.querySelectorAll("[data-btn]");
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        var name = btn.getAttribute("data-btn");
        function down(e) { input.setButton(name, true); e.preventDefault(); }
        function up(e) { input.setButton(name, false); e.preventDefault(); }
        btn.addEventListener("touchstart", down, { passive: false });
        btn.addEventListener("touchend", up, { passive: false });
        btn.addEventListener("touchcancel", up, { passive: false });
        btn.addEventListener("mousedown", down);
        btn.addEventListener("mouseup", up);
        btn.addEventListener("mouseleave", up);
      })(buttons[i]);
    }
  }

  /* ---- boot ---- */

  function boot() {
    input.attach(window);
    setupTouch();

    var settings = Storage.getSettings();
    audio.setSoundEnabled(settings.sound);
    audio.setMusicEnabled(settings.music);
    game.camera = Storage.getCamera();

    /* The on-screen controls only make sense on a touch screen, and they
       must not sit on top of the menus. */
    var touchEl = document.getElementById("touch");
    var pauseBtn = document.getElementById("pause-btn");
    var isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
    function updateTouch() {
      if (touchEl) {
        var on = isTouch && game.mode !== "title";
        touchEl.className = "touch" + (on ? " on" : "");
      }
      if (pauseBtn) {
        /* The pause button belongs to the match and to the shoot-out. */
        pauseBtn.className = "iconbtn" + (game.mode === "title" ? " hidden" : "");
      }
    }

    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        if (game.pauseMenu) closePause();
        else openPause();
      });
    }

    /* Leaving the tab pauses the match: nobody wants to come back to a
       match that ran on without them. */
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && game.mode === "match" && !game.paused) {
        openPause();
      }
    });
    window.addEventListener("blur", function () {
      if (game.mode === "match" && !game.paused && !game.pauseMenu) openPause();
    });

    /* The sound can only start after a gesture, so the first touch or key
       wakes it up. */
    function wake() {
      audio.resume();
      if (settings.sound) audio.startCrowd();
    }
    window.addEventListener("pointerdown", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });

    showTitle();
    requestAnimationFrame(frame);

    /* A small handle for the smoke test and for anyone who wants to poke
       at the game from the console. */
    window.PixelCupGame = {
      core: Core,
      state: function () {
        return {
          mode: game.mode,
          phase: game.match ? game.match.phase : null,
          score: game.match ? game.match.score : null,
          clock: game.match ? game.match.clock : 0,
          half: game.match ? game.match.half : 0,
          paused: game.paused,
          shootout: game.shootout ? {
            round: game.shootout.round,
            score: game.shootout.score,
            finished: game.shootout.finished,
          } : null,
          cup: game.cup ? { round: game.cup.round, done: game.cup.done } : null,
          shot: game.shot,
          camera: game.camera,
          replay: game.mode === "replay" ? {
            index: game.replayIndex,
            frames: game.bestGoal ? game.bestGoal.n : 0,
          } : null,
          bestGoal: game.bestGoal ? { frames: game.bestGoal.n } : null,
        };
      },
      /* The button handler, so a test can walk the menus without a
         browser: it is the same function the buttons call. */
      action: onAction,
      camera: setCamera,
      match: function () { return game.match; },
      updateTouch: updateTouch,
    };
    var tick = function () { updateTouch(); requestAnimationFrame(tick); };
    tick();

    if (window.R2) {
      R2.trackPlaytime("pixel-cup-pwa/");
      if (R2.installHint) R2.installHint();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
