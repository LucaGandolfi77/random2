/*
 * portfolio · the hero canvas.
 *
 * The page claims "0 binary art assets" in words. A running canvas makes the
 * page perform the claim instead: every pixel below is computed, and there
 * is not one image file in it.
 *
 * One point per project in the arcade — fifty-four of them — drifting
 * slowly, with a line to each near neighbour. The shape is the catalogue.
 *
 * The house rules apply:
 *   - prefers-reduced-motion stops the animation rather than shortening it,
 *     so one static frame is drawn and nothing moves;
 *   - the canvas is aria-hidden and the page says the same thing in text,
 *     because a canvas a screen reader cannot read is not an accessible
 *     canvas, it is a picture with extra steps;
 *   - the loop stops when the tab is hidden, because a background tab that
 *     keeps animating is a background tab that keeps the CPU warm.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  /* The fifty-four projects, in the order the catalogue lists them. The
     count is the point: one point per project, and no more. */
  var COUNT = 54;

  var points = [];
  var raf = null;
  var running = false;

  var reduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener: function () {} };

  function readTokens() {
    var cs = getComputedStyle(document.documentElement);
    return {
      accent: cs.getPropertyValue("--accent").trim() || "#8b5cf6",
      accent2: cs.getPropertyValue("--accent-2").trim() || "#ec4899",
      text: cs.getPropertyValue("--text").trim() || "#f4f5fb",
    };
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!points.length) seed(w, h);
  }

  function seed(w, h) {
    points = [];
    for (var i = 0; i < COUNT; i++) {
      /* A seeded scatter, so the same page always opens the same way. */
      /* A phyllotaxis scatter: even over the area, and the same shape
         every time the page opens. */
      var a = (i * 2.399963) % (Math.PI * 2);
      var r = Math.sqrt((i + 0.5) / COUNT);
      points.push({
        x: w * (0.5 + Math.cos(a) * r * 0.62),
        y: h * (0.5 + Math.sin(a) * r * 0.48),
        vx: (Math.sin(i * 12.9898) * 0.5 + 0.5) * 0.16 - 0.08,
        vy: (Math.cos(i * 78.233) * 0.5 + 0.5) * 0.16 - 0.08,
        r: 1.4 + ((i * 7) % 5) * 0.45,
      });
    }
  }

  function step(w, h) {
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }
  }

  function draw() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var t = readTokens();
    ctx.clearRect(0, 0, w, h);

    /* The links first, so the points sit on top of them. */
    ctx.lineWidth = 1;
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var a = points[i];
        var b = points[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > 132) continue;
        ctx.strokeStyle = t.accent;
        ctx.globalAlpha = 0.16 * (1 - d / 132);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    for (var k = 0; k < points.length; k++) {
      var p = points[k];
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.4);
      g.addColorStop(0, t.accent2);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = t.text;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame() {
    if (!running) return;
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    step(w, h);
    draw();
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced.matches) return;
    running = true;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = null;
  }

  function onMotionChange() {
    if (reduced.matches) {
      stop();
      draw();          /* one static frame: the claim, without the movement */
    } else {
      start();
    }
  }

  resize();
  draw();

  if (reduced.addEventListener) {
    reduced.addEventListener("change", onMotionChange);
  } else if (reduced.addListener) {
    reduced.addListener(onMotionChange);
  }

  window.addEventListener("resize", function () {
    resize();
    if (!running) draw();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  if (!reduced.matches) start();
})();
