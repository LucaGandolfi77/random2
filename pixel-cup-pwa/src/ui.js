/*
 * PIXEL CUP '96 — interface
 * -------------------------
 * The menus are ordinary HTML over the canvas: they can be read by a
 * screen reader, they scale with the browser's zoom, and the buttons are
 * real buttons that work with a keyboard.
 *
 * The heads-up display is the exception. It is drawn into the pixel buffer
 * with the bitmap font, because a scoreboard belongs to the picture and
 * not on top of it.
 */

(function (root, factory) {
  "use strict";
  var api = factory(
    typeof PixelFont !== "undefined" ? PixelFont :
    (typeof require === "function" ? require("./font.js") : null),
    typeof PixelCore !== "undefined" ? PixelCore : null
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelUI = api;
})(typeof self !== "undefined" ? self : this, function (Font, Core) {
  "use strict";

  var COL = {
    panel: [16, 20, 34],
    panelLight: [28, 34, 54],
    border: [70, 84, 120],
    white: [238, 242, 250],
    dim: [140, 152, 176],
    gold: [255, 206, 74],
    green: [96, 214, 120],
    red: [232, 88, 76],
    ink: [8, 10, 18],
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function createUI(opts) {
    opts = opts || {};
    var screen = opts.screen;
    var live = opts.live;
    var audio = opts.audio;
    var onAction = opts.onAction || function () {};

    /*
     * Every screen is built into the same element, so the handlers of
     * the previous screen have to go: otherwise the title screen's
     * handler is still listening when the squad picker's button is
     * clicked, and the game answers a question nobody asked.
     */
    var bound = [];

    function bind(root, type, fn) {
      root.addEventListener(type, fn);
      bound.push([root, type, fn]);
    }

    function unbindAll() {
      for (var i = 0; i < bound.length; i++) {
        bound[i][0].removeEventListener(bound[i][1], bound[i][2]);
      }
      bound.length = 0;
    }

    function show(html, wire) {
      unbindAll();
      screen.innerHTML = html;
      screen.classList.remove("hidden");
      screen.setAttribute("aria-hidden", "false");
      if (wire) wire(screen);
      var first = screen.querySelector("button");
      if (first) first.focus();
    }

    function hide() {
      screen.classList.add("hidden");
      screen.setAttribute("aria-hidden", "true");
      screen.innerHTML = "";
    }

    function announce(text) {
      if (live) live.textContent = text;
    }

    /* ---- the menus ---- */

    /*
     * The settings block. It appears on the title screen and in the
     * pause sheet, and it is the same block in both.
     */
    function toggleHtml(name, label, on) {
      return '<button class="toggle' + (on ? " on" : "") + '" data-setting="' + name +
        '" aria-pressed="' + (on ? "true" : "false") + '">' +
        '<span class="tlabel">' + esc(label) + '</span>' +
        '<span class="tstate">' + (on ? "ON" : "OFF") + '</span></button>';
    }

    function settingsHtml(settings) {
      settings = settings || { sound: true, music: true, haptics: true };
      return '<div class="settings">' +
        toggleHtml("sound", "Sound", settings.sound) +
        toggleHtml("music", "Music", settings.music) +
        toggleHtml("haptics", "Vibration", settings.haptics) +
        '</div>';
    }

    /* Wire the toggles and tell the caller what changed. */
    function wireSettings(root, settings, onChange) {
      bind(root, "click", function (e) {
        var b = e.target.closest("button[data-setting]");
        if (!b) return;
        var name = b.getAttribute("data-setting");
        var on = !settings[name];
        settings[name] = on;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        var state = b.querySelector(".tstate");
        if (state) state.textContent = on ? "ON" : "OFF";
        if (audio) audio.blip(on);
        if (onChange) onChange(name, on, settings);
      });
    }

    function showTitle(state) {
      state = state || {};
      var hasCup = state.hasCup;
      var settings = state.settings || { sound: true, music: true, haptics: true };
      show(
        '<div class="menu">' +
          '<h1 class="logo">PIXEL CUP <span>96</span></h1>' +
          '<p class="tagline">Low-poly arcade football. Five a side, one ball, ' +
          'ninety seconds a half.</p>' +
          '<div class="stack">' +
            '<button class="btn primary" data-action="quick">Quick Match</button>' +
            '<button class="btn" data-action="cup">' +
              (hasCup ? 'Continue the Cup' : 'Cup') + '</button>' +
            '<button class="btn" data-action="shootout">Penalty Shoot-out</button>' +
            '<button class="btn ghost" data-action="how">How to play</button>' +
          '</div>' +
          settingsHtml(settings) +
          '<p class="foot">Plays offline. Your records stay on this device.</p>' +
        '</div>',
        function (root) {
          wireSettings(root, settings, state.onSetting);
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            onAction(b.getAttribute("data-action"));
          });
        }
      );
    }

    function showPause(settings, actions) {
      settings = settings || { sound: true, music: true, haptics: true };
      show(
        '<div class="menu">' +
          '<h2>Paused</h2>' +
          '<div class="stack">' +
            '<button class="btn primary" data-action="resume">Resume</button>' +
            '<button class="btn" data-action="restart">Restart the match</button>' +
            '<button class="btn ghost" data-action="quit">Quit to the menu</button>' +
          '</div>' +
          settingsHtml(settings) +
          '<p class="foot">Esc or the pause button brings you back.</p>' +
        '</div>',
        function (root) {
          wireSettings(root, settings, actions.onSetting);
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            if (actions.onAction) actions.onAction(b.getAttribute("data-action"));
          });
        }
      );
    }

    /*
     * The squad picker. Five slots and five on the bench, and a tap
     * swaps the two: tap a player on the bench and the weakest man of
     * the same role in your five comes off; tap a man in your five and
     * the best replacement for him comes on.
     */
    function attrsHtml(p) {
      function bar(label, value) {
        var w = Math.round(clampInt(value, 0, 99));
        return '<span class="attr"><span class="al">' + label + '</span>' +
          '<span class="ab"><i style="width:' + w + '%"></i></span>' +
          '<span class="av">' + w + '</span></span>';
      }
      return '<span class="attrs">' +
        bar("PAC", p.pace) + bar("POW", p.power) + bar("TEC", p.technique) +
        '</span>';
    }

    function playerHtml(p, onPitch) {
      return '<button class="pl' + (onPitch ? " on" : "") + '" data-id="' + p.id + '">' +
        '<span class="num">' + p.num + '</span>' +
        '<span class="nm">' + esc(p.name) + '</span>' +
        '<span class="rl">' + p.role + '</span>' +
        attrsHtml(p) +
        '</button>';
    }

    function showSquadPicker(squad, current, options) {
      options = options || {};
      var slots = options.slots || ["GK", "DEF", "DEF", "MID", "FWD"];
      var chosen = current.slice();
      var xi = chosen.map(function (p, i) {
        return '<div class="slot"><span class="sl">' + slots[i] + '</span>' +
          playerHtml(p, true) + '</div>';
      }).join("");
      var bench = squad.filter(function (p) {
        return chosen.indexOf(p) === -1;
      }).map(function (p) { return playerHtml(p, false); }).join("");

      show(
        '<div class="menu wide">' +
          '<h2>' + esc(options.title || "Pick your five") + '</h2>' +
          '<p class="tagline">' + (options.hint ||
            "Tap a man on the bench to bring him on; tap one in your five to send him off.") +
            '</p>' +
          '<div class="xi">' + xi + '</div>' +
          '<h3 class="benchhead">The bench</h3>' +
          '<div class="bench">' + bench + '</div>' +
          '<div class="stack row">' +
            '<button class="btn primary" data-action="start">Kick off</button>' +
            '<button class="btn ghost" data-action="back">Back</button>' +
          '</div>' +
        '</div>',
        function (root) {
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-id]");
            if (!b) return;
            var id = b.getAttribute("data-id");
            var onPitch = b.classList.contains("on");
            var picked = null;
            for (var i = 0; i < chosen.length; i++) if (chosen[i].id === id) picked = chosen[i];
            if (picked) {
              /* He comes off; the best replacement for his role comes on. */
              var slot = chosen.indexOf(picked);
              var best = null;
              for (var j = 0; j < squad.length; j++) {
                var q = squad[j];
                if (chosen.indexOf(q) !== -1) continue;
                if (q.role !== picked.role) continue;
                if (!best || attrScore(q) > attrScore(best)) best = q;
              }
              if (!best) {
                for (var k = 0; k < squad.length; k++) {
                  var r = squad[k];
                  if (chosen.indexOf(r) !== -1) continue;
                  if (!best || attrScore(r) > attrScore(best)) best = r;
                }
              }
              if (!best) return;
              chosen[slot] = best;
            } else {
              /* He comes on; the weakest man of his role comes off. */
              var slot2 = -1, weakest = null;
              for (var s = 0; s < chosen.length; s++) {
                var c = chosen[s];
                if (c.role !== bRole(squad, id)) continue;
                if (!weakest || attrScore(c) < attrScore(weakest)) { weakest = c; slot2 = s; }
              }
              if (slot2 < 0) {
                for (var t = 0; t < chosen.length; t++) {
                  var c2 = chosen[t];
                  if (!weakest || attrScore(c2) < attrScore(weakest)) { weakest = c2; slot2 = t; }
                }
              }
              var incoming = null;
              for (var u = 0; u < squad.length; u++) if (squad[u].id === id) incoming = squad[u];
              if (!incoming || slot2 < 0) return;
              chosen[slot2] = incoming;
            }
            if (audio) audio.blip(true);
            showSquadPicker(squad, chosen, options);
          });
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            if (b.getAttribute("data-action") === "start") {
              var ids = chosen.map(function (p) { return p.id; });
              if (options.onAction) options.onAction(options.action || "kickoff", ids);
              else if (options.onStart) options.onStart(chosen);
            } else if (options.onAction) {
              options.onAction("back");
            } else if (options.onBack) {
              options.onBack();
            }
          });
        }
      );
    }

    function bRole(squad, id) {
      for (var i = 0; i < squad.length; i++) if (squad[i].id === id) return squad[i].role;
      return "MID";
    }

    function attrScore(p) {
      if (!p) return 0;
      return p.pace * 0.4 + p.power * 0.3 + p.technique * 0.3;
    }

    function clampInt(v, a, b) { return v < a ? a : (v > b ? b : v); }

    /*
     * The match report: the numbers, and a heat map of where the ball
     * actually spent the match. A score tells you it was 1-0; a heat map
     * tells you the only goal came from a corner on the right and the
     * whole game was played in your own half.
     */
    function heatColour(t) {
      /* A ramp from the grass through the gold to a hot red. */
      if (t <= 0) return null;
      if (t < 0.34) return [30 + t * 60, 70 + t * 90, 46];
      if (t < 0.67) return [90 + (t - 0.34) * 330, 100 + (t - 0.34) * 250, 46];
      return [200 + (t - 0.67) * 150, 160 - (t - 0.67) * 200, 60];
    }

    function drawHeat(canvas, m, cols, rows) {
      if (!canvas || !canvas.getContext) return;
      var g = canvas.getContext("2d");
      var cw = canvas.width / cols, ch = canvas.height / rows;
      var max = 1;
      for (var i = 0; i < m.heat.length; i++) if (m.heat[i] > max) max = m.heat[i];
      g.clearRect(0, 0, canvas.width, canvas.height);
      /* the pitch */
      g.fillStyle = "#16321f";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.strokeStyle = "#5f6a86";
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
      g.beginPath();
      g.moveTo(canvas.width / 2, 0);
      g.lineTo(canvas.width / 2, canvas.height);
      g.stroke();
      /* the heat */
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var v = m.heat[y * cols + x];
          if (!v) continue;
          var t = v / max;
          var c = heatColour(t);
          if (!c) continue;
          g.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
          g.fillRect(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw), Math.ceil(ch));
        }
      }
    }

    function showStats(m, options) {
      options = options || {};
      var s0 = m.stats[0], s1 = m.stats[1];
      var poss = s0.possession + s1.possession;
      var p0 = poss > 0 ? Math.round(100 * s0.possession / poss) : 50;
      var p1 = 100 - p0;
      /* A shot on target either scores or is saved. */
      var t0 = m.score[0] + s1.saves;
      var t1 = m.score[1] + s0.saves;
      var rows = [
        ["Shots", s0.shots, s1.shots],
        ["On target", t0, t1],
        ["Passes", s0.passes, s1.passes],
        ["Tackles", s0.tackles, s1.tackles],
        ["Saves", s0.saves, s1.saves],
      ];
      var body = rows.map(function (r) {
        return '<div class="stat"><span class="sl">' + esc(r[0]) + '</span>' +
          '<span class="sv">' + r[1] + '</span>' +
          '<span class="sv">' + r[2] + '</span></div>';
      }).join("");
      show(
        '<div class="menu wide">' +
          '<h2>Match report</h2>' +
          '<div class="score big"><b>' + esc(m.home.short) + '</b> ' +
            m.score[0] + ' - ' + m.score[1] + ' <b>' + esc(m.away.short) + '</b></div>' +
          '<div class="poss"><span class="pa">' + p0 + '%</span>' +
            '<span class="pbar"><i style="width:' + p0 + '%"></i></span>' +
            '<span class="pb">' + p1 + '%</span></div>' +
          '<div class="statgrid"><div class="stat head">' +
            '<span class="sl"></span><span class="sv">' + esc(m.home.short) + '</span>' +
            '<span class="sv">' + esc(m.away.short) + '</span></div>' + body + '</div>' +
          '<h3 class="benchhead">Where the ball spent the match</h3>' +
          '<canvas id="heat" class="heat" width="288" height="192" role="img" ' +
            'aria-label="A map of the pitch, shaded by how long the ball spent in each part of it."></canvas>' +
          '<div class="stack row">' +
            '<button class="btn primary" data-action="back">Back</button>' +
          '</div>' +
        '</div>',
        function (root) {
          var canvas = root.querySelector("#heat");
          drawHeat(canvas, m, 36, 24);
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            if (options.onBack) options.onBack();
          });
        }
      );
      announce("Match report. " + m.home.name + " " + m.score[0] + ", " +
               m.away.name + " " + m.score[1] + ". Possession " + p0 + " percent.");
    }

    function showTeamSelect(teams, selected, title, action, opts) {
      opts = opts || {};
      var diff = opts.difficulty == null ? 1 : opts.difficulty;
      var cards = teams.map(function (t, i) {
        var cls = "team" + (i === selected ? " sel" : "");
        return '<button class="' + cls + '" data-team="' + i + '" ' +
          'aria-pressed="' + (i === selected) + '">' +
          '<span class="crest" style="background:' + t.kit + '"></span>' +
          '<span class="tname">' + esc(t.name) + '</span>' +
          '<span class="trating">★ ' + t.rating + '</span>' +
          '</button>';
      }).join("");
      var levels = [["0", "Rookie"], ["1", "Pro"], ["2", "Legend"]].map(function (d) {
        return '<button class="diff' + (diff === Number(d[0]) ? " sel" : "") +
          '" data-diff="' + d[0] + '" aria-pressed="' +
          (diff === Number(d[0]) ? "true" : "false") + '">' + d[1] + '</button>';
      }).join("");
      /* The weather: what the match is played in. */
      var wx = opts.weather || "day";
      var weathers = [["day", "Day"], ["dusk", "Dusk"], ["night", "Night"], ["rain", "Rain"]]
        .map(function (w) {
          return '<button class="diff' + (wx === w[0] ? " sel" : "") +
            '" data-wx="' + w[0] + '" aria-pressed="' +
            (wx === w[0] ? "true" : "false") + '">' + w[1] + '</button>';
        }).join("");
      show(
        '<div class="menu wide">' +
          '<h2>' + esc(title || "Pick your team") + '</h2>' +
          '<div class="teams">' + cards + '</div>' +
          '<div class="row"><span class="lbl">Difficulty</span>' +
            '<div class="diffs">' + levels + '</div></div>' +
          '<div class="row"><span class="lbl">Weather</span>' +
            '<div class="diffs">' + weathers + '</div></div>' +
          '<div class="stack row">' +
            '<button class="btn primary" data-action="start">Kick off</button>' +
            '<button class="btn ghost" data-action="back">Back</button>' +
          '</div>' +
        '</div>',
        function (root) {
          var chosen = selected;
          var level = diff;
          var weather = wx;
          bind(root, "click", function (e) {
            var t = e.target.closest("button[data-team]");
            if (t) {
              chosen = Number(t.getAttribute("data-team"));
              var all = root.querySelectorAll("button[data-team]");
              for (var i = 0; i < all.length; i++) {
                all[i].classList.remove("sel");
                all[i].setAttribute("aria-pressed", "false");
              }
              t.classList.add("sel");
              t.setAttribute("aria-pressed", "true");
              if (audio) audio.blip(true);
              return;
            }
            var d = e.target.closest("button[data-diff]");
            if (d) {
              level = Number(d.getAttribute("data-diff"));
              var diffs = root.querySelectorAll("button[data-diff]");
              for (var j = 0; j < diffs.length; j++) {
                diffs[j].classList.remove("sel");
                diffs[j].setAttribute("aria-pressed", "false");
              }
              d.classList.add("sel");
              d.setAttribute("aria-pressed", "true");
              if (audio) audio.blip(true);
              return;
            }
            var w = e.target.closest("button[data-wx]");
            if (w) {
              weather = w.getAttribute("data-wx");
              var ws = root.querySelectorAll("button[data-wx]");
              for (var q = 0; q < ws.length; q++) {
                ws[q].classList.remove("sel");
                ws[q].setAttribute("aria-pressed", "false");
              }
              w.classList.add("sel");
              w.setAttribute("aria-pressed", "true");
              if (audio) audio.blip(true);
              return;
            }
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            if (b.getAttribute("data-action") === "start") onAction("start", chosen, level, weather);
            else onAction(b.getAttribute("data-action"));
          });
        }
      );
    }

    function statRow(label, value) {
      return '<div class="stat"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
    }

    function showHalftime(m, options) {
      options = options || {};
      show(
        '<div class="menu">' +
          '<h2>Half time</h2>' +
          '<div class="score big"><b>' + m.home.short + '</b> ' +
            m.score[0] + ' - ' + m.score[1] + ' <b>' + m.away.short + '</b></div>' +
          '<div class="stats">' +
            statRow("Shots", m.stats[0].shots + " - " + m.stats[1].shots) +
            statRow("Passes", m.stats[0].passes + " - " + m.stats[1].passes) +
            statRow("Tackles", m.stats[0].tackles + " - " + m.stats[1].tackles) +
            statRow("Possession", Math.round(m.stats[0].possession) + "s - " +
                    Math.round(m.stats[1].possession) + "s") +
          '</div>' +
          '<div class="stack row">' +
            '<button class="btn primary" data-action="continue">Second half</button>' +
            (options.report ? '<button class="btn" data-action="report">Report</button>' : '') +
            '<button class="btn" data-action="sub">Substitution</button>' +
          '</div>' +
        '</div>',
        function (root) {
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            onAction("continue");
          });
        }
      );
      announce("Half time. " + m.home.name + " " + m.score[0] + ", " +
               m.away.name + " " + m.score[1] + ".");
    }

    function showFullTime(m, result, options) {
      options = options || {};
      var title = result === "win" ? "You win!" : (result === "draw" ? "A draw" : "You lose");
      var buttons = '<button class="btn primary" data-action="continue">Continue</button>';
      if (options.report) {
        buttons += '<button class="btn" data-action="report">Match report</button>';
      }
      if (options.replay) {
        buttons = '<button class="btn primary" data-action="replay">Watch the best goal</button>' +
                  '<button class="btn ghost" data-action="continue">Continue</button>';
      }
      if (options.rematch) buttons += '<button class="btn" data-action="rematch">Rematch</button>';
      if (options.newCup) buttons += '<button class="btn" data-action="newcup">New cup</button>';
      show(
        '<div class="menu">' +
          '<h2>' + title + '</h2>' +
          '<div class="score big"><b>' + m.home.short + '</b> ' +
            m.score[0] + ' - ' + m.score[1] + ' <b>' + m.away.short + '</b></div>' +
          '<div class="stats">' +
            statRow("Shots", m.stats[0].shots + " - " + m.stats[1].shots) +
            statRow("Passes", m.stats[0].passes + " - " + m.stats[1].passes) +
            statRow("Saves", m.stats[0].saves + " - " + m.stats[1].saves) +
          '</div>' +
          '<div class="stack row">' + buttons + '</div>' +
        '</div>',
        function (root) {
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            onAction(b.getAttribute("data-action"));
          });
        }
      );
      announce("Full time. " + m.home.name + " " + m.score[0] + ", " +
               m.away.name + " " + m.score[1] + ". " + title);
    }

    function showBracket(cup) {
      var rounds = [];
      var names = cup.teams.map(function (t) { return t.short; });
      var qf = "";
      for (var i = 0; i < cup.ties.length; i++) {
        var t = cup.ties[i];
        qf += '<div class="tie">' +
          '<span class="name' + (t[0] === cup.playerIndex ? " you" : "") + '">' +
            esc(names[t[0]]) + '</span>' +
          '<span class="name' + (t[1] === cup.playerIndex ? " you" : "") + '">' +
            esc(names[t[1]]) + '</span></div>';
      }
      rounds.push('<div class="round"><h3>Quarter finals</h3>' + qf + '</div>');
      show(
        '<div class="menu wide">' +
          '<h2>The Cup</h2>' +
          '<div class="bracket">' + rounds.join("") + '</div>' +
          '<button class="btn primary" data-action="continue">Play my tie</button>' +
        '</div>',
        function (root) {
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            onAction("continue");
          });
        }
      );
    }

    function showTrophy(cup, team) {
      show(
        '<div class="menu">' +
          '<div class="trophy">★</div>' +
          '<h2>Champions!</h2>' +
          '<p class="tagline">' + esc(team.name) + ' win the Pixel Cup.</p>' +
          '<button class="btn primary" data-action="continue">Back to the menu</button>' +
        '</div>',
        function (root) {
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            onAction("continue");
          });
        }
      );
      announce("You won the cup!");
    }

    function showHelp() {
      show(
        '<div class="menu wide">' +
          '<h2>How to play</h2>' +
          '<div class="help">' +
            '<p><b>Move</b> — WASD, the arrow keys, the stick on the screen, ' +
            'or a gamepad.</p>' +
            '<p><b>Pass</b> — Space or K. Tap for a short pass; hold for a ' +
            'faster one. Push the stick up for a lob.</p>' +
            '<p><b>Shoot</b> — J or X. Hold for power, then release. Push the ' +
            'stick sideways to bend it, up to lift it.</p>' +
            '<p><b>Sprint</b> — Shift. It eats your boost meter, which fills ' +
            'while you have the ball.</p>' +
            '<p><b>Switch</b> — Q, to hand the ball to whoever is nearest.</p>' +
            '<p><b>Skill</b> — L: a through ball when you have it, a slide ' +
            'tackle when you do not.</p>' +
            '<p><b>Cross</b> — C: a high ball over the defence and into the ' +
            'box. When a cross drops near you, <b>Shoot</b> heads it.</p>' +
            '<p class="note">On a phone, use the stick on the left and the ' +
            'buttons on the right.</p>' +
          '</div>' +
          '<button class="btn primary" data-action="back">Back</button>' +
        '</div>',
        function (root) {
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            onAction("back");
          });
        }
      );
    }

    function showShootoutIntro() {
      show(
        '<div class="menu">' +
          '<h2>Penalty shoot-out</h2>' +
          '<p class="tagline">Five kicks each, then sudden death. Stop the ' +
          'marker, then stop the power meter.</p>' +
          '<button class="btn primary" data-action="go">Let\'s go</button>' +
        '</div>',
        function (root) {
          bind(root, "click", function (e) {
            var b = e.target.closest("button[data-action]");
            if (!b) return;
            if (audio) audio.blip(true);
            onAction("start");
          });
        }
      );
    }

    /* ---- the heads-up display ---- */

    function clockText(clock) {
      var mins = Math.floor(clock / 60);
      var secs = Math.floor(clock % 60);
      return mins + ":" + (secs < 10 ? "0" : "") + secs;
    }

    function drawHUD(buf, m, extra) {
      extra = extra || {};
      var w = buf.w, h = buf.h;

      /* The scoreboard. */
      Font.drawPanel(buf, 3, 3, 118, 13, COL.panel, COL.border);
      Font.drawText(buf, 7, 6, m.home.short, [190, 210, 255], 1);
      Font.drawText(buf, 26, 5, String(m.score[0]), COL.gold, 1);
      Font.drawText(buf, 34, 5, "-", COL.dim, 1);
      Font.drawText(buf, 41, 5, String(m.score[1]), COL.gold, 1);
      Font.drawText(buf, 54, 6, m.away.short, [255, 190, 180], 1);
      Font.drawText(buf, 78, 6, m.half === 1 ? "1ST" : "2ND", COL.dim, 1);
      Font.drawText(buf, 99, 6, clockText(m.clock), COL.white, 1);

      /* The boost meter. */
      Font.drawPanel(buf, w - 63, 3, 60, 13, COL.panel, COL.border);
      Font.drawText(buf, w - 60, 6, "BOOST", COL.dim, 1);
      Font.drawMeter(buf, w - 27, 6, 21, 7, m.boost / 100,
                     m.boost > 60 ? COL.gold : COL.green, COL.panelLight, COL.border);

      /* The radar: the whole pitch from above, in forty pixels. */
      var rw = 46, rh = 30, rx = w - rw - 3, ry = 19;
      Font.drawPanel(buf, rx, ry, rw, rh, COL.panel, COL.border);
      for (var i = 0; i < m.players.length; i++) {
        var p = m.players[i];
        var px = rx + 2 + ((p.x + 28) / 56) * (rw - 4);
        var py = ry + 2 + ((p.z + 18) / 36) * (rh - 4);
        var col = p.team === 0 ? [120, 170, 255] : [255, 130, 120];
        if (p === m.players[m.controlled]) col = COL.gold;
        dot(buf, Math.round(px), Math.round(py), col, p === m.players[m.controlled] ? 2 : 1);
      }
      var bx = rx + 2 + ((m.ball.x + 28) / 56) * (rw - 4);
      var by = ry + 2 + ((m.ball.z + 18) / 36) * (rh - 4);
      dot(buf, Math.round(bx), Math.round(by), COL.white, 2);

      /* The power bar, while a shot is charging. It sits above the
         commentary so the two never fight for the same pixels. */
      if (m.charging && m.charge > 0.01) {
        var bw = 80, bxx = Math.round((w - bw) / 2), byy = h - 42;
        Font.drawPanel(buf, bxx - 2, byy - 2, bw + 4, 12, COL.panel, COL.border);
        Font.drawMeter(buf, bxx, byy, bw, 8, m.charge, COL.gold, COL.panelLight, null);
        Font.drawText(buf, bxx + bw / 2 - 9, byy + 9, "POWER", COL.dim, 1);
      }

      /* A contextual prompt: a ball in the air and a player under it is
         a header waiting to happen, and nobody should have to guess. */
      var me = m.players[m.controlled];
      if (me && m.ball.owner < 0 && m.ball.y > 1.15 && m.ball.y < 4.6) {
        var dx = me.x - m.ball.x, dz = me.z - m.ball.z;
        if (dx * dx + dz * dz < 2.1 * 2.1) {
          Font.drawTextCentered(buf, w / 2, 22, "HEAD IT!", [255, 214, 64], 1);
        }
      }

      /* The commentary, in the language of the terraces. */
      if (extra.commentary) {
        var tw = Font.textWidth(extra.commentary, 1);
        Font.drawPanel(buf, Math.round((w - tw) / 2) - 4, h - 18, tw + 8, 13,
                       COL.panel, COL.border);
        Font.drawTextCentered(buf, w / 2, h - 14, extra.commentary, COL.gold, 1);
      }

      /* A big word in the middle when the game stops. */
      if (extra.banner) {
        var bw2 = Font.textWidth(extra.banner, 2);
        Font.drawPanel(buf, Math.round((w - bw2) / 2) - 6, 44, bw2 + 12, 24,
                       COL.panel, COL.gold);
        Font.drawTextCentered(buf, w / 2, 50, extra.banner, COL.gold, 2);
      }
    }

    /* A square dot, without needing the raster module directly. */
    function dot(buf, x, y, col, size) {
      var s = size || 1;
      for (var dx = 0; dx < s; dx++) {
        for (var dy = 0; dy < s; dy++) {
          var px = x + dx, py = y + dy;
          if (px < 0 || py < 0 || px >= buf.w || py >= buf.h) continue;
          var i = (py * buf.w + px) * 4;
          buf.data[i] = col[0];
          buf.data[i + 1] = col[1];
          buf.data[i + 2] = col[2];
        }
      }
    }

    /* ---- the shoot-out display ---- */

    function drawShootoutHUD(buf, s) {
      var w = buf.w;
      Font.drawPanel(buf, 3, 3, 118, 13, COL.panel, COL.border);
      Font.drawText(buf, 7, 6, "YOU", [190, 210, 255], 1);
      Font.drawText(buf, 30, 5, String(s.score[0]), COL.gold, 1);
      Font.drawText(buf, 40, 5, "-", COL.dim, 1);
      Font.drawText(buf, 48, 5, String(s.score[1]), COL.gold, 1);
      Font.drawText(buf, 62, 6, "CPU", [255, 190, 180], 1);
      Font.drawText(buf, 92, 6, "R" + s.round, COL.dim, 1);

      /* The five kicks of each side. */
      for (var i = 0; i < 5; i++) {
        var kx = 3 + i * 9, ky = 19;
        var r0 = s.kicks[0][i], r1 = s.kicks[1][i];
        Font.drawPanel(buf, kx, ky, 7, 7,
                       r0 === "G" ? [30, 90, 50] : (r0 === "M" ? [110, 30, 26] : COL.panelLight),
                       COL.border);
        Font.drawPanel(buf, kx, ky + 9, 7, 7,
                       r1 === "G" ? [30, 90, 50] : (r1 === "M" ? [110, 30, 26] : COL.panelLight),
                       COL.border);
      }
      Font.drawText(buf, 3, 36, "YOU", COL.dim, 1);
      Font.drawText(buf, 3, 26, "CPU", COL.dim, 1);
    }

    return {
      show: show,
      hide: hide,
      announce: announce,
      showTitle: showTitle,
      showPause: showPause,
      showTeamSelect: showTeamSelect,
      showSquadPicker: showSquadPicker,
      showStats: showStats,
      showHalftime: showHalftime,
      showFullTime: showFullTime,
      showBracket: showBracket,
      showTrophy: showTrophy,
      showHelp: showHelp,
      showShootoutIntro: showShootoutIntro,
      drawHUD: drawHUD,
      drawShootoutHUD: drawShootoutHUD,
      clockText: clockText,
    };
  }

  return { createUI: createUI, COL: COL };
});
