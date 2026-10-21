/*
 * PIXEL CUP '96 — scene renderer
 * ------------------------------
 * Turns the state of the model into triangles and puts them in the pixel
 * buffer. Everything is flat shaded: a face has one colour, computed from
 * its normal against a single light, and then quantised to the retro
 * palette. That combination — faceted geometry plus a limited number of
 * steps per colour — is what makes the picture read as low-poly pixel art
 * rather than as a small smooth render.
 *
 * The browser loads this as `window.PixelRender`.
 */

(function (root, factory) {
  "use strict";
  var api = factory(
    typeof PixelRaster !== "undefined" ? PixelRaster :
    (typeof require === "function" ? require("./raster.js") : null)
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelRender = api;
})(typeof self !== "undefined" ? self : this, function (Raster) {
  "use strict";

  var NEAR = 0.35;

  /* ---- palette ---------------------------------------------------- */

  var PAL = {
    grassLine: [222, 228, 226],
    ball: [244, 246, 250],
    ballDark: [26, 28, 38],
    skin: [[232, 184, 140], [196, 136, 92], [148, 96, 62], [92, 60, 40]],
    shadow: [30, 74, 44],
    flash: [255, 255, 255],
  };

  /*
   * The weather. Each one is a whole picture: the sky, the grass, the
   * stands, the light and how much of it reaches the ground. The rain is
   * more than a filter — the pitch is wet, and the rules know it.
   */
  var WEATHER = {
    day: {
      label: "CLEAR DAY",
      sky: [[34, 62, 122], [132, 190, 242]],
      grass: [[46, 118, 62], [38, 104, 54]],
      surround: [26, 58, 36],
      stand: [74, 78, 108], standDark: [52, 56, 84], wall: [30, 32, 52],
      post: [236, 238, 240], net: [176, 186, 196],
      ambient: 0.44, light: [-0.42, 0.86, 0.30],
      crowd: 1, flash: false, rain: false,
    },
    dusk: {
      label: "DUSK",
      sky: [[92, 44, 78], [240, 150, 86]],
      grass: [[86, 112, 46], [68, 94, 38]],
      surround: [42, 52, 28],
      stand: [80, 58, 68], standDark: [54, 38, 50], wall: [40, 28, 40],
      post: [246, 228, 208], net: [198, 178, 170],
      ambient: 0.40, light: [-0.66, 0.58, 0.30],
      crowd: 0.88, flash: false, rain: false,
    },
    night: {
      label: "NIGHT",
      sky: [[8, 12, 34], [28, 42, 82]],
      grass: [[28, 68, 46], [22, 58, 40]],
      surround: [14, 34, 24],
      stand: [40, 44, 68], standDark: [26, 30, 48], wall: [18, 20, 38],
      post: [212, 222, 238], net: [122, 142, 162],
      ambient: 0.30, light: [-0.18, 0.96, 0.20],
      crowd: 0.5, flash: true, rain: false,
    },
    rain: {
      label: "RAIN",
      sky: [[56, 60, 72], [118, 124, 134]],
      grass: [[40, 92, 54], [34, 80, 46]],
      surround: [24, 46, 34],
      stand: [56, 60, 70], standDark: [38, 42, 52], wall: [28, 30, 38],
      post: [224, 228, 234], net: [166, 174, 182],
      ambient: 0.40, light: [-0.34, 0.88, 0.34],
      crowd: 0.78, flash: false, rain: true,
    },
  };

  var WEATHER_NAMES = ["day", "dusk", "night", "rain"];

  /* The weather in force. The renderer draws one scene at a time and is
     single-threaded, so this is the cheapest way to let every helper see
     it without threading it through twenty arguments. */
  var wx = WEATHER.day;

  function setWeather(name) {
    wx = WEATHER[name] || WEATHER.day;
    return wx;
  }

  function weatherName() {
    for (var k in WEATHER) if (WEATHER[k] === wx) return k;
    return "day";
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* The size of the pitch, taken from the match so the picture and the
     rules can never disagree about it. */
  function pitchOf(m) {
    var p = (m && m.pitch) || { len: 72, wid: 48 };
    return { half: p.len / 2, wide: p.wid / 2 };
  }

  /* Counters, so a preview can say how much work a frame did. */
  var stats = { crowd: 0, crowdFar: 0, crowdOff: 0, tris: 0 };

  function hexToRgb(h) {
    var v = parseInt(h.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function shade(rgb, amount) {
    return [
      Raster.quantise(rgb[0] * amount),
      Raster.quantise(rgb[1] * amount),
      Raster.quantise(rgb[2] * amount),
    ];
  }

  /* ---- camera ----------------------------------------------------- */

  function createCamera() {
    return {
      x: -34, y: 17, z: 0,
      lx: 0, ly: 1.5, lz: 0,
      fx: 1, fy: 0, fz: 0,
      rx: 0, ry: 0, rz: 1,
      ux: 0, uy: 1, uz: 0,
      cx: 0, cy: 0,
      focal: 175,
      fov: 0.46,
      shake: 0,
      shakeX: 0,
      shakeY: 0,
      zoom: 1,
    };
  }

  /*
   * Rebuild the camera basis from a position and a point to look at.
   * Everything else in the file works in camera space, so this is the one
   * place that knows about the world.
   */
  function aimCamera(cam, buf, px, py, pz, lx, ly, lz) {
    cam.x = px; cam.y = py; cam.z = pz;
    cam.lx = lx; cam.ly = ly; cam.lz = lz;
    var fx = lx - px, fy = ly - py, fz = lz - pz;
    var fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
    var fx2 = fx / fl, fy2 = fy / fl, fz2 = fz / fl;
    /* right = forward x worldUp, normalised; up = right x forward. */
    var rx = -fz2, ry = 0, rz = fx2;
    var rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rl; ry /= rl; rz /= rl;
    var ux = ry * fz2 - rz * fy2;
    var uy = rz * fx2 - rx * fz2;
    var uz = rx * fy2 - ry * fx2;
    cam.fx = fx2; cam.fy = fy2; cam.fz = fz2;
    cam.rx = rx; cam.ry = ry; cam.rz = rz;
    cam.ux = ux; cam.uy = uy; cam.uz = uz;
    cam.cx = buf.w / 2;
    cam.cy = buf.h / 2;
    cam.focal = (buf.h / 2) / Math.tan(cam.fov / 2);
  }

  /*
   * The two cameras, and the director that chooses between them.
   *
   * "top" is the camera behind the play, high enough to see the shape of
   * the game; "side" is the camera on the touchline, which is what you
   * want when the ball is out wide and the far side of the pitch is where
   * the action is. A director changes camera when the other one has been
   * the better choice for a moment, not the instant the ball moves.
   */
  function updateSideCamera(cam, buf, dt, focus) {
    var pc = pitchOf(null);
    /* From the front row of the stand, high enough to see across the
       pitch and low enough to keep the players the right size. */
    var lx = focus.x * 0.85;
    var z = pc.wide + 2.5;
    aimCamera(cam, buf, lx - 11, 15.0, z, lx, 1.4, focus.z * 0.4);
  }

  function chooseShot(m) {
    if (!m || !m.ball) return "top";
    /* Wide play wants the touchline camera. */
    if (Math.abs(m.ball.z) > 12) return "side";
    /* A ball in a corner wants it too. */
    if (Math.abs(m.ball.x) > 26 && Math.abs(m.ball.z) > 7) return "side";
    return "top";
  }

  /*
   * The attract-mode camera: a broadcast pan. It drifts slowly along
   * the pitch the way a camera operator pans before kick-off, and it
   * leans towards the ball when the ball wanders out of frame, so the
   * action never leaves the picture entirely.
   */
  function updateDemoCamera(cam, buf, dt, t, bx, bz) {
    var drift = Math.sin(t * 0.085) * 11;
    var lx = bx * 0.5 + drift;
    var lz = bz * 0.32;
    var back = 31 + Math.sin(t * 0.05) * 5;
    var height = 15.5 + Math.sin(t * 0.07) * 1.5;
    aimCamera(cam, buf, lx - back, height, lz * 0.45, lx, 1.2, lz);
  }

  function updateCamera(cam, buf, dt, focus) {
    var pc = pitchOf(null);
    var k = 1 - Math.pow(0.0008, dt);
    /* The camera keeps its distance, but it pulls back when the ball
       goes near the goal: from thirty units the net fills the frame and
       the pitch is squeezed into the bottom of it. */
    var deep = clamp((Math.abs(focus.x) - 18) / 22, 0, 1);
    var back = (34 + 12 * deep) * cam.zoom;
    var tx = focus.x - back;
    var tz = focus.z * 0.36;
    /* The camera follows the ball at a fixed distance, even when that
       takes it outside the stand: the stand the camera is behind is cut
       away, the way the old football games cut the near crowd away. */
    cam.x += (tx - cam.x) * k;
    cam.z += (tz - cam.z) * k;
    cam.y = (16.0 + 2 * deep) * cam.zoom;
    /* And it never aims past the end of the ground, or the view tilts up
       into the stand. */
    var look = clamp(focus.x + 11, -(pc.half + 3), pc.half + 3);

    /* Shake decays quickly; the noise is deterministic so the picture does
       not jitter differently on two machines. */
    if (cam.shake > 0.001) {
      cam.shake = Math.max(0, cam.shake - dt * 2.6);
      var t = performance.now() / 1000;
      cam.shakeX = Math.sin(t * 71.3) * cam.shake * 0.7;
      cam.shakeY = Math.sin(t * 53.7) * cam.shake * 0.5;
    } else {
      cam.shake = 0; cam.shakeX = 0; cam.shakeY = 0;
    }

    aimCamera(cam, buf, cam.x + cam.shakeX, cam.y + cam.shakeY, cam.z,
              look, 1.1, focus.z * 0.5);
  }

  function toCam(cam, x, y, z, out) {
    var dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    out.x = dx * cam.rx + dy * cam.ry + dz * cam.rz;
    out.y = dx * cam.ux + dy * cam.uy + dz * cam.uz;
    out.d = dx * cam.fx + dy * cam.fy + dz * cam.fz;
    return out;
  }

  function project(cam, cs, out) {
    var d = cs.d;
    if (d < NEAR) { out.ok = false; return out; }
    out.ok = true;
    out.x = cam.cx + cs.x * cam.focal / d;
    out.y = cam.cy - cs.y * cam.focal / d;
    out.invd = 1 / d;
    return out;
  }

  var _a = { x: 0, y: 0, d: 0 }, _b = { x: 0, y: 0, d: 0 }, _c = { x: 0, y: 0, d: 0 };
  var _p0 = { x: 0, y: 0, ok: false }, _p1 = { x: 0, y: 0, ok: false }, _p2 = { x: 0, y: 0, ok: false };

  function clipNear(poly) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var cur = poly[i], nxt = poly[(i + 1) % poly.length];
      var curIn = cur.d >= NEAR, nxtIn = nxt.d >= NEAR;
      if (curIn) out.push(cur);
      if (curIn !== nxtIn) {
        var t = (NEAR - cur.d) / (nxt.d - cur.d);
        out.push({
          x: cur.x + (nxt.x - cur.x) * t,
          y: cur.y + (nxt.y - cur.y) * t,
          d: NEAR,
        });
      }
    }
    return out;
  }

  /* One flat-shaded triangle in world space. */
  function tri(buf, cam, p0, p1, p2, r, g, b) {
    toCam(cam, p0[0], p0[1], p0[2], _a);
    toCam(cam, p1[0], p1[1], p1[2], _b);
    toCam(cam, p2[0], p2[1], p2[2], _c);
    var poly = clipNear([_a, _b, _c]);
    if (poly.length < 3) return;
    for (var i = 1; i + 1 < poly.length; i++) {
      project(cam, poly[0], _p0);
      project(cam, poly[i], _p1);
      project(cam, poly[i + 1], _p2);
      Raster.triangle(buf, _p0.x, _p0.y, _p0.invd, _p1.x, _p1.y, _p1.invd,
                      _p2.x, _p2.y, _p2.invd, r, g, b);
    }
  }

  /* A quad, given in order. */
  function quad(buf, cam, p0, p1, p2, p3, r, g, b) {
    tri(buf, cam, p0, p1, p2, r, g, b);
    tri(buf, cam, p0, p2, p3, r, g, b);
  }

  /* A horizontal quad on the ground: the workhorse for the pitch. */
  function groundQuad(buf, cam, x0, z0, x1, z1, y, r, g, b) {
    quad(buf, cam, [x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], r, g, b);
  }

  /* A line on the ground, given as two points and a width. */
  function groundLine(buf, cam, x0, z0, x1, z1, w, r, g, b, y) {
    var dx = x1 - x0, dz = z1 - z0;
    var l = Math.sqrt(dx * dx + dz * dz) || 1;
    var nx = -dz / l * w / 2, nz = dx / l * w / 2;
    var yy = y === undefined ? 0.06 : y;
    quad(buf, cam,
      [x0 + nx, yy, z0 + nz], [x0 - nx, yy, z0 - nz],
      [x1 - nx, yy, z1 - nz], [x1 + nx, yy, z1 + nz], r, g, b);
  }

  /* ---- boxes ------------------------------------------------------ */

  /*
   * A box with flat-shaded faces. `rot` rotates it about the vertical
   * axis. The colour of each face comes from its normal, so the box
   * turns as the player turns.
   */
  function box(buf, cam, cx, cy, cz, sx, sy, sz, rot, rgb) {
    var co = Math.cos(rot), si = Math.sin(rot);
    var hx = sx / 2, hy = sy / 2, hz = sz / 2;
    var corners = [];
    for (var i = 0; i < 8; i++) {
      var lx = (i & 1) ? hx : -hx;
      var ly = (i & 2) ? hy : -hy;
      var lz = (i & 4) ? hz : -hz;
      corners.push([
        cx + lx * co - lz * si,
        cy + ly,
        cz + lx * si + lz * co,
      ]);
    }
    /* faces: [indices, normal] */
    var faces = [
      [[1, 3, 7, 5], [0, 1, 0]],    // top
      [[0, 4, 6, 2], [0, -1, 0]],   // bottom
      [[0, 1, 5, 4], [0, 0, -1]],   // -z
      [[2, 6, 7, 3], [0, 0, 1]],    // +z
      [[4, 5, 7, 6], [-1, 0, 0]],   // -x
      [[0, 2, 3, 1], [1, 0, 0]],    // +x
    ];
    for (var f = 0; f < faces.length; f++) {
      var idx = faces[f][0], n = faces[f][1];
      /* Rotate the normal with the box. */
      var nx = n[0] * co - n[2] * si, nz = n[0] * si + n[2] * co;
      var diff = Math.max(0, nx * wx.light[0] + n[1] * wx.light[1] + nz * wx.light[2]);
      var amount = wx.ambient + (1.12 - wx.ambient) * diff;
      var c = shade(rgb, amount);
      quad(buf, cam, corners[idx[0]], corners[idx[1]], corners[idx[2]], corners[idx[3]],
           c[0], c[1], c[2]);
    }
  }

  /* ---- the pitch -------------------------------------------------- */

  var CELL = 4;

  function drawPitch(buf, cam, m) {
    var pc = pitchOf(m);
    var L = pc.half + 2, W = pc.wide + 3;
    /* The ground the stadium stands on. Without it the pitch floats in
       the sky whenever the camera looks past its edge. */
    var surround = wx.surround;
    groundQuad(buf, cam, -(L + 70), -(W + 70), L + 70, W + 70, -0.08,
               surround[0], surround[1], surround[2]);
    var x0 = -L, x1 = L, z0 = -W, z1 = W;
    var nx = Math.round((x1 - x0) / CELL), nz = Math.round((z1 - z0) / CELL);
    for (var i = 0; i < nx; i++) {
      var ax = x0 + i * CELL, bx = ax + CELL;
      /* The mown bands. The offset keeps the index positive whatever the
         size of the pitch. */
      var band = Math.floor((ax + 400) / 8) % 2;
      for (var j = 0; j < nz; j++) {
        var az = z0 + j * CELL, bz = az + CELL;
        /* Skip what the camera cannot see. */
        if (bx < cam.x - 6) continue;
        if (ax > cam.x + 150) continue;
        var base = wx.grass[band];
        /* A little variation so the grass is not a flat sheet. */
        var v = ((i * 7 + j * 13) % 5) * 0.022 - 0.04;
        var r = Raster.quantise(base[0] * (1 + v));
        var g = Raster.quantise(base[1] * (1 + v));
        var b = Raster.quantise(base[2] * (1 + v));
        /* Split the cell into two triangles with slightly different
           tints: that is the facet. */
        var v2 = ((i * 5 + j * 3) % 4) * 0.018 - 0.02;
        var r2 = Raster.quantise(base[0] * (1 + v + v2));
        var g2 = Raster.quantise(base[1] * (1 + v + v2));
        var b2 = Raster.quantise(base[2] * (1 + v + v2));
        tri(buf, cam, [ax, 0, az], [ax, 0, bz], [bx, 0, bz], r, g, b);
        tri(buf, cam, [ax, 0, az], [bx, 0, bz], [bx, 0, az], r2, g2, b2);
      }
    }
  }

  function drawPitchLines(buf, cam, m) {
    var pc = pitchOf(m);
    var L = pc.half, W = pc.wide;
    var c = PAL.grassLine;
    var y = 0.07;
    /* touchlines and goal lines */
    groundLine(buf, cam, -L, -W, L, -W, 0.35, c[0], c[1], c[2], y);
    groundLine(buf, cam, -L, W, L, W, 0.35, c[0], c[1], c[2], y);
    groundLine(buf, cam, -L, -W, -L, W, 0.35, c[0], c[1], c[2], y);
    groundLine(buf, cam, L, -W, L, W, 0.35, c[0], c[1], c[2], y);
    /* halfway line */
    groundLine(buf, cam, 0, -W, 0, W, 0.35, c[0], c[1], c[2], y);
    /* penalty areas and goal areas */
    for (var s = -1; s <= 1; s += 2) {
      var gx = s * L;
      groundLine(buf, cam, gx, -12, gx - s * 22, -12, 0.35, c[0], c[1], c[2], y);
      groundLine(buf, cam, gx, 12, gx - s * 22, 12, 0.35, c[0], c[1], c[2], y);
      groundLine(buf, cam, gx - s * 22, -12, gx - s * 22, 12, 0.35, c[0], c[1], c[2], y);
      groundLine(buf, cam, gx, -8.5, gx - s * 7, -8.5, 0.35, c[0], c[1], c[2], y);
      groundLine(buf, cam, gx, 8.5, gx - s * 7, 8.5, 0.35, c[0], c[1], c[2], y);
      groundLine(buf, cam, gx - s * 7, -8.5, gx - s * 7, 8.5, 0.35, c[0], c[1], c[2], y);
      /* penalty spot */
      groundLine(buf, cam, gx - s * 14, 0, gx - s * 14, 0.001, 0.7, c[0], c[1], c[2], y);
    }
    /* centre circle */
    var seg = 28;
    for (var i = 0; i < seg; i++) {
      var a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      groundLine(buf, cam, Math.cos(a0) * 10, Math.sin(a0) * 10,
                 Math.cos(a1) * 10, Math.sin(a1) * 10, 0.35, c[0], c[1], c[2], y);
    }
    /* centre spot */
    groundLine(buf, cam, 0, 0, 0, 0.001, 0.7, c[0], c[1], c[2], y);
  }

  /* ---- goals ------------------------------------------------------ */

  function drawGoal(buf, cam, side, m) {
    var pc = pitchOf(m);
    var L = pc.half, half = 4.5, h = 3.2, depth = 3;
    var gx = side * L;
    var post = wx.post, net = wx.net;
    /* posts */
    box(buf, cam, gx, h / 2, -half, 0.28, h, 0.28, 0, post);
    box(buf, cam, gx, h / 2, half, 0.28, h, 0.28, 0, post);
    /* crossbar */
    box(buf, cam, gx, h, 0, 0.26, 0.26, half * 2, 0, post);
    /* net: the back panel, the two sides and the roof, as thin lines */
    var bx = gx + side * depth;
    var i, j;
    for (i = 0; i <= 6; i++) {
      var zz = -half + (i / 6) * half * 2;
      line3(buf, cam, bx, 0, zz, bx, h, zz, net);
    }
    for (j = 0; j <= 3; j++) {
      var yy = (j / 3) * h;
      line3(buf, cam, bx, yy, -half, bx, yy, half, net);
    }
    for (i = 0; i <= 6; i++) {
      var z2 = -half + (i / 6) * half * 2;
      line3(buf, cam, gx, 0, z2, bx, 0, z2, net);
      line3(buf, cam, gx, h, z2, bx, h, z2, net);
    }
    for (j = 0; j <= 3; j++) {
      var y2 = (j / 3) * h;
      line3(buf, cam, gx, y2, -half, bx, y2, -half, net);
      line3(buf, cam, gx, y2, half, bx, y2, half, net);
    }
  }

  /* A line in space, drawn with the depth buffer. */
  var _la = { x: 0, y: 0, d: 0 }, _lb = { x: 0, y: 0, d: 0 };
  var _pa = { x: 0, y: 0, ok: false }, _pb = { x: 0, y: 0, ok: false };
  function line3(buf, cam, x0, y0, z0, x1, y1, z1, rgb) {
    toCam(cam, x0, y0, z0, _la);
    toCam(cam, x1, y1, z1, _lb);
    if (_la.d < NEAR && _lb.d < NEAR) return;
    if (_la.d < NEAR || _lb.d < NEAR) {
      var t = (NEAR - _la.d) / (_lb.d - _la.d);
      var ix = _la.x + (_lb.x - _la.x) * t;
      var iy = _la.y + (_lb.y - _la.y) * t;
      if (_la.d < NEAR) { _la.x = ix; _la.y = iy; _la.d = NEAR; }
      else { _lb.x = ix; _lb.y = iy; _lb.d = NEAR; }
    }
    project(cam, _la, _pa);
    project(cam, _lb, _pb);
    Raster.line(buf, _pa.x, _pa.y, _pa.invd, _pb.x, _pb.y, _pb.invd, rgb[0], rgb[1], rgb[2]);
  }

  /* ---- stands and crowd -------------------------------------------- */

  function drawStands(buf, cam, m) {
    var pc = pitchOf(m);
    var W = pc.wide + 3.5, L = pc.half + 3;
    /* The banks either side of the pitch, sloping up and away. */
    for (var s = -1; s <= 1; s += 2) {
      for (var row = 0; row < 6; row++) {
        var z0 = s * (W + row * 1.5);
        var z1 = s * (W + (row + 1) * 1.5);
        var y0 = row * 1.15, y1 = (row + 1) * 1.15;
        var col = row % 2 ? wx.stand : wx.standDark;
        quad(buf, cam, [-L, y0, z0], [-L, y1, z1], [L, y1, z1], [L, y0, z0],
             col[0], col[1], col[2]);
      }
    }
    /* The banks behind the goals. They are the tallest thing in the
       picture, so they close the view off instead of leaving a strip of
       empty sky above the crossbar. */
    for (var s2 = -1; s2 <= 1; s2 += 2) {
      /* The stand the camera is behind is cut away. Otherwise the front
         rows sit in the foreground and hide the pitch, which is what the
         old football games did not have to think about because they never
         drew the near crowd. */
      if (cam.x * s2 > pc.half + 2) continue;
      for (var row2 = 0; row2 < 7; row2++) {
        var x0 = s2 * (L + row2 * 1.3);
        var x1 = s2 * (L + (row2 + 1) * 1.3);
        var y0 = row2 * 1.1, y1 = (row2 + 1) * 1.1;
        var col2 = row2 % 2 ? wx.stand : wx.standDark;
        quad(buf, cam, [x0, y0, -W], [x0, y0, W], [x1, y1, W], [x1, y1, -W],
             col2[0], col2[1], col2[2]);
      }
      /* The back wall of the stand. */
      var bx = s2 * (L + 7 * 1.3);
      quad(buf, cam, [bx, 0, -W], [bx, 7.8, -W], [bx, 7.8, W], [bx, 0, W],
           wx.wall[0], wx.wall[1], wx.wall[2]);
    }
  }

  /*
   * The crowd.
   *
   * Drawing one pixel per person at a fixed spacing leaves the stands
   * looking like dotted lines: at this resolution a packed stand would
   * need tens of thousands of people. Instead every seating row is drawn
   * as a continuous run of pixels between its two ends, and the colour of
   * each pixel decides which side that person supports. The result is a
   * solid crowd for the cost of a few thousand pixels.
   */
  function crowdColour(i, seed, homeKit, awayKit, cheer, wave) {
    /* A hash rather than a repeating pattern: seen edge-on, a regular
       pattern turns the stand into a barcode. */
    var h = (((i * 2654435761) ^ (seed * 40503)) >>> 0) % 1000 / 1000;
    var rgb;
    if (h < 0.3) rgb = homeKit;
    else if (h < 0.54) rgb = awayKit;
    else if (h < 0.68) rgb = [176, 174, 170];
    else if (h < 0.84) rgb = [40, 38, 54];
    else if (h < 0.94) rgb = [214, 184, 108];
    else rgb = [96, 104, 128];
    var f = (0.52 + 0.55 * wave) * (0.82 + 0.38 * h);
    return [
      Raster.quantise(rgb[0] * f),
      Raster.quantise(rgb[1] * f),
      Raster.quantise(rgb[2] * f),
    ];
  }

  function drawCrowdRow(buf, cam, cs, ax, ay, az, bx, by, bz,
                        homeKit, awayKit, cheer, t, seed) {
    toCam(cam, ax, ay, az, cs);
    var d0 = cs.d, x0 = cs.x, y0 = cs.y;
    toCam(cam, bx, by, bz, cs);
    var d1 = cs.d, x1 = cs.x, y1 = cs.y;
    /* Clip the row to the near plane: a row that runs past the camera
       still has a visible half. */
    if (d0 < NEAR && d1 < NEAR) return;
    if (d0 < NEAR) {
      var t0 = (NEAR - d0) / (d1 - d0);
      x0 += (x1 - x0) * t0; y0 += (y1 - y0) * t0; d0 = NEAR;
    } else if (d1 < NEAR) {
      var t1 = (NEAR - d1) / (d0 - d1);
      x1 += (x0 - x1) * t1; y1 += (y0 - y1) * t1; d1 = NEAR;
    }
    var sx0 = cam.cx + x0 * cam.focal / d0;
    var sy0 = cam.cy - y0 * cam.focal / d0;
    var sx1 = cam.cx + x1 * cam.focal / d1;
    var sy1 = cam.cy - y1 * cam.focal / d1;
    var len = Math.abs(sx1 - sx0) + Math.abs(sy1 - sy0);
    var steps = Math.ceil(len);
    if (steps < 2 || steps > 4000) return;
    var i0 = 1 / d0, i1 = 1 / d1;
    for (var i = 0; i <= steps; i++) {
      var u = i / steps;
      var sx = sx0 + (sx1 - sx0) * u;
      var sy = sy0 + (sy1 - sy0) * u;
      var px = Math.round(sx), py = Math.round(sy);
      if (px < 0 || py < 0 || px >= buf.w || py >= buf.h) continue;
      /* 1/d is an affine function of the screen position along a straight
         line, so interpolating it here is exact. */
      var invd = i0 + (i1 - i0) * u;
      var wave = Math.sin(t + (ax + (bx - ax) * u) * 0.21 + az * 0.13) * 0.5 + 0.5;
      var bob = (cheer > 0.3 && wave > 0.68) ? 1 : 0;
      var c = crowdColour(i, seed, homeKit, awayKit, cheer, wave);
      /* Each spectator is a body and a head. A row of one-pixel marks is
         a line, and a line of pixels across the screen is an artefact;
         two pixels of a person is a crowd. */
      var dim = wx.crowd;
      Raster.drawPixelOnce(buf, px, py - bob, invd,
                           Raster.quantise(c[0] * dim),
                           Raster.quantise(c[1] * dim),
                           Raster.quantise(c[2] * dim));
      var hair = ((i * 13 + seed) % 5) < 2 ? [232, 216, 186] : [58, 46, 40];
      Raster.drawPixelOnce(buf, px, py - 1 - bob, invd,
                           Raster.quantise(hair[0] * dim),
                           Raster.quantise(hair[1] * dim),
                           Raster.quantise(hair[2] * dim));
      /* At night somebody in the crowd has a camera. */
      if (wx.flash && ((i * 7 + seed * 3) % 89) === 0) {
        Raster.drawPixelOnce(buf, px, py - bob, invd, 250, 248, 236);
      }
    }
  }

  function drawCrowd(buf, cam, m, homeKit, awayKit) {
    var pc = pitchOf(m);
    var W = pc.wide + 3.5, L = pc.half + 3;
    var cheer = m ? m.excitement : 0;
    var t = (m ? m.clock : 0) * 2.2;
    var cs = { x: 0, y: 0, d: 0 };
    var s, row, row2, seed = 0;
    /* Side banks: the rows run along the length of the pitch. Every row
       is drawn twice, once for the bodies and once for the heads, which
       is what makes the stand look packed rather than ruled. */
    for (s = -1; s <= 1; s += 2) {
      for (row = 0; row < 6; row++) {
        var zs = s * (W + row * 1.5 + 0.75);
        var ys = row * 1.15 + 0.8;
        drawCrowdRow(buf, cam, cs, -L, ys, zs, L, ys, zs,
                     homeKit, awayKit, cheer, t, seed++);
        drawCrowdRow(buf, cam, cs, -L, ys + 0.42, zs, L, ys + 0.42, zs,
                     homeKit, awayKit, cheer, t, seed++);
      }
    }
    /* Banks behind the goals: the rows run across the width. The stand
       the camera is behind is cut away, the same as the stand itself. */
    for (s = -1; s <= 1; s += 2) {
      if (cam.x * s > pc.half + 2) continue;
      for (row2 = 0; row2 < 7; row2++) {
        var xe = s * (L + row2 * 1.6 + 0.8);
        var ye = row2 * 1.2 + 0.85;
        drawCrowdRow(buf, cam, cs, xe, ye, -W, xe, ye, W,
                     homeKit, awayKit, cheer, t, seed++);
        drawCrowdRow(buf, cam, cs, xe, ye + 0.42, -W, xe, ye + 0.42, W,
                     homeKit, awayKit, cheer, t, seed++);
      }
    }
  }

  function drawPerson(buf, cam, cs, ps, x, y, z, which, homeKit, awayKit, cheer, t) {
    stats.crowd++;
    toCam(cam, x, y, z, cs);
    if (cs.d < 2) { stats.crowdFar++; return; }
    project(cam, cs, ps);
    if (!ps.ok) { stats.crowdFar++; return; }
    var px = Math.round(ps.x), py = Math.round(ps.y);
    if (px < 0 || py < 0 || px >= buf.w || py >= buf.h) { stats.crowdOff++; return; }
    var kit = which ? awayKit : homeKit;
    /* A wave runs through the crowd when the game is exciting. */
    var wave = Math.sin(t + x * 0.25 + z * 0.17) * 0.5 + 0.5;
    var bob = cheer > 0.35 && wave > 0.72 ? 1 : 0;
    var rgb = kit;
    var r = Raster.quantise(rgb[0] * (0.72 + 0.4 * wave));
    var g = Raster.quantise(rgb[1] * (0.72 + 0.4 * wave));
    var b = Raster.quantise(rgb[2] * (0.72 + 0.4 * wave));
    Raster.drawPixelOnce(buf, px, py - bob, ps.invd, r, g, b);
  }

  /* ---- players ---------------------------------------------------- */

  function drawPlayer(buf, cam, p, kit, shorts, skinIndex) {
    var anim = p.anim;
    var swing = Math.sin(anim) * (p.slide > 0 ? 0 : 0.55);
    var bob = Math.abs(Math.sin(anim)) * 0.09;
    var rot = p.facing;
    var skin = PAL.skin[skinIndex % PAL.skin.length];
    /* shadow */
    shadow(buf, cam, p.x, p.z, 0.55);
    /* legs */
    var legF = 0.28 + swing * 0.28;
    var legB = 0.28 - swing * 0.28;
    box(buf, cam, p.x + Math.cos(rot) * legF, 0.28, p.z + Math.sin(rot) * legF,
        0.2, 0.56, 0.22, rot, shorts);
    box(buf, cam, p.x + Math.cos(rot) * legB, 0.28, p.z + Math.sin(rot) * legB,
        0.2, 0.56, 0.22, rot, shorts);
    /* torso */
    box(buf, cam, p.x, 0.86 + bob, p.z, 0.62, 0.62, 0.44, rot, kit);
    /* head */
    box(buf, cam, p.x, 1.38 + bob, p.z, 0.36, 0.36, 0.36, rot, skin);
  }

  function shadow(buf, cam, x, z, r) {
    var c = PAL.shadow;
    var seg = 8;
    for (var i = 0; i < seg; i++) {
      var a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      tri(buf, cam,
        [x, 0.02, z],
        [x + Math.cos(a0) * r, 0.02, z + Math.sin(a0) * r * 0.8],
        [x + Math.cos(a1) * r, 0.02, z + Math.sin(a1) * r * 0.8],
        c[0], c[1], c[2]);
    }
  }

  /* ---- the ball ---------------------------------------------------- */

  var PHI = (1 + Math.sqrt(5)) / 2;
  var ICO_V = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ];
  var ICO_F = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  (function () {
    for (var i = 0; i < ICO_V.length; i++) {
      var v = ICO_V[i];
      var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      ICO_V[i] = [v[0] / l, v[1] / l, v[2] / l];
    }
  })();

  function drawBall(buf, cam, ball, spin) {
    var r = 0.42;
    var cx = ball.x, cy = ball.y, cz = ball.z;
    shadow(buf, cam, cx, cz, 0.34);
    var ca = Math.cos(spin), sa = Math.sin(spin);
    var cb = Math.cos(spin * 0.7), sb = Math.sin(spin * 0.7);
    var pts = [];
    for (var i = 0; i < ICO_V.length; i++) {
      var v = ICO_V[i];
      var x = v[0] * ca - v[2] * sa;
      var z = v[0] * sa + v[2] * ca;
      var y = v[1] * cb - v[2] * sb;
      var z2 = v[1] * sb + v[2] * cb;
      pts.push([cx + x * r, cy + y * r, cz + z2 * r]);
    }
    for (var f = 0; f < ICO_F.length; f++) {
      var face = ICO_F[f];
      var dark = (f % 3) === 0;
      var rgb = dark ? PAL.ballDark : PAL.ball;
      tri(buf, cam, pts[face[0]], pts[face[1]], pts[face[2]], rgb[0], rgb[1], rgb[2]);
    }
  }

  /*
   * The ball's trail: a short line of fading marks behind it. It is what
   * makes a struck ball read as fast.
   */
  function drawTrail(buf, cam, trail) {
    if (!trail || trail.length < 2) return;
    var n = trail.length;
    for (var i = 0; i < n - 1; i++) {
      var a = trail[i], b = trail[i + 1];
      /* The oldest mark is the faintest. */
      var f = (i + 1) / n;
      var r = Raster.quantise(lerp(120, 255, f));
      var g = Raster.quantise(lerp(150, 250, f));
      var bl = Raster.quantise(lerp(120, 235, f));
      line3(buf, cam, a.x, a.y + 0.1, a.z, b.x, b.y + 0.1, b.z, [r, g, bl]);
    }
  }

  /*
   * The rain, drawn in screen space over the whole picture. The drops
   * belong to the interface, which owns them and moves them; this only
   * puts them on the glass.
   */
  function drawRain(buf, drops) {
    if (!drops || !drops.length) return;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      for (var k = 0; k < d.len; k++) {
        var y = Math.round(d.y + k);
        var x = Math.round(d.x - k * d.slant);
        if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) continue;
        Raster.setPixel(buf, x, y, 186, 200, 214);
      }
    }
  }

  /* ---- assembling the scene ---------------------------------------- */

  function drawScene(buf, cam, m, opts) {
    opts = opts || {};
    setWeather((m && m.weather) || opts.weather);
    Raster.fillGradient(buf, wx.sky[0][0], wx.sky[0][1], wx.sky[0][2],
                        wx.sky[1][0], wx.sky[1][1], wx.sky[1][2]);
    var homeKit = hexToRgb(opts.homeKit || "#2f6fe0");
    var awayKit = hexToRgb(opts.awayKit || "#d8342c");
    var homeShorts = hexToRgb(opts.homeShorts || "#12306e");
    var awayShorts = hexToRgb(opts.awayShorts || "#7d1512");

    drawStands(buf, cam, m);
    drawCrowd(buf, cam, m, homeKit, awayKit);
    drawPitch(buf, cam, m);
    drawPitchLines(buf, cam, m);
    drawGoal(buf, cam, -1, m);
    drawGoal(buf, cam, 1, m);

    /* The marker under the player you are controlling. In the attract
       mode nobody is controlling anybody. */
    if (m.controlled >= 0 && !m.demo && m.players[m.controlled]) {
      var cp = m.players[m.controlled];
      var ring = PAL.grassLine;
      for (var i = 0; i < 10; i++) {
        var a0 = (i / 10) * Math.PI * 2, a1 = ((i + 1) / 10) * Math.PI * 2;
        groundLine(buf, cam,
          cp.x + Math.cos(a0) * 0.95, cp.z + Math.sin(a0) * 0.95,
          cp.x + Math.cos(a1) * 0.95, cp.z + Math.sin(a1) * 0.95,
          0.16, ring[0], ring[1], ring[2], 0.08);
      }
    }

    /* The players, far to near, so the depth buffer has less work to do. */
    var order = m.players.slice().sort(function (a, b) {
      return (b.x - a.x);
    });
    for (var k = 0; k < order.length; k++) {
      var p = order[k];
      var kit = p.team === 0 ? homeKit : awayKit;
      var shorts = p.team === 0 ? homeShorts : awayShorts;
      drawPlayer(buf, cam, p, kit, shorts, p.index);
    }

    if (m.ball) drawBall(buf, cam, m.ball, opts.spin || 0);
    if (opts.trail) drawTrail(buf, cam, opts.trail);

    /* Goal flash. */
    if (opts.flash > 0) {
      var f = opts.flash;
      Raster.fillRect(buf, 0, 0, buf.w, buf.h,
        Raster.quantise(255 * f), Raster.quantise(255 * f), Raster.quantise(255 * f));
    }
  }

  /* ---- the penalty shoot-out --------------------------------------- */

  /*
   * The shoot-out is seen from behind the ball: the goal fills the frame
   * and the keeper waits in it. The aiming marker sweeps across the
   * goal mouth, and the height of the bar above it is the power.
   */
  function drawShootoutScene(buf, cam, s, opts) {
    opts = opts || {};
    Raster.fillGradient(buf, wx.sky[0][0], wx.sky[0][1], wx.sky[0][2],
                        wx.sky[1][0], wx.sky[1][1], wx.sky[1][2]);
    var homeKit = hexToRgb(opts.homeKit || "#2f6fe0");
    var awayKit = hexToRgb(opts.awayKit || "#d8342c");
    drawStands(buf, cam, null);
    drawCrowd(buf, cam, null, homeKit, awayKit);
    drawPitch(buf, cam, s || null);
    drawPitchLines(buf, cam, s || null);
    drawGoal(buf, cam, 1, s || null);
    drawGoal(buf, cam, -1, s || null);

    var pc = pitchOf(s);
    var L = pc.half;
    var spot = L - 13;

    /* The keeper. He dives as the ball is struck. */
    var keeperZ = 0;
    if (s.keeperDir !== undefined) keeperZ = s.keeperDir * (C_GOAL_W / 2 - 0.6);
    var keeper = {
      x: L - 0.6, z: keeperZ, y: 0, facing: Math.PI,
      anim: 0, slide: 0, index: 0,
    };
    var kit = opts.awayKit ? hexToRgb(opts.awayKit) : [240, 96, 72];
    drawPlayer(buf, cam, keeper, kit, [40, 40, 48], 1);

    /* The ball on the spot. */
    var ball = { x: spot, y: 0.42, z: 0 };
    drawBall(buf, cam, ball, opts.spin || 0);

    /* The aiming marker: a bar in the goal mouth. */
    if (s.phase === "aim" || s.phase === "power") {
      var ax = L - 0.2;
      var az = s.aim * (C_GOAL_W / 2 - 0.8);
      var top = 2.6;
      if (s.phase === "power") top = 0.6 + s.power * 2.2;
      quad(buf, cam, [ax, 0, az - 0.16], [ax, top, az - 0.16],
           [ax, top, az + 0.16], [ax, 0, az + 0.16], 255, 220, 90);
      /* A line on the ground showing where the ball would go. */
      groundLine(buf, cam, spot, 0, ax, az, 0.12, 255, 220, 90, 0.09);
    }
  }

  var C_GOAL_W = 9;

  return {
    PAL: PAL,
    stats: stats,
    hexToRgb: hexToRgb,
    pitchOf: pitchOf,
    WEATHER: WEATHER,
    WEATHER_NAMES: WEATHER_NAMES,
    setWeather: setWeather,
    weatherName: weatherName,
    drawRain: drawRain,
    createCamera: createCamera,
    updateCamera: updateCamera,
    updateSideCamera: updateSideCamera,
    updateDemoCamera: updateDemoCamera,
    chooseShot: chooseShot,
    aimCamera: aimCamera,
    drawScene: drawScene,
    drawShootoutScene: drawShootoutScene,
    box: box,
    tri: tri,
    line3: line3,
    groundLine: groundLine,
    drawTrail: drawTrail,
  };
});
