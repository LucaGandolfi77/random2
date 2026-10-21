/*
 * PIXEL CUP '96 — software rasteriser
 * -----------------------------------
 * A tiny z-buffered triangle rasteriser that writes into a raw RGB
 * byte buffer. There is no canvas in here: the game draws its own pixels
 * so that the output is genuinely pixel art rather than smooth vector
 * art scaled down.
 *
 * The depth test uses 1/d, where d is the distance along the camera's view
 * axis. 1/d is an exact affine function of the screen coordinates for any
 * plane, so interpolating it linearly across a triangle is not an
 * approximation: the depth test is exact, which is what lets the pitch,
 * the players and the goalposts share one buffer without sorting.
 *
 * The browser loads this as `window.PixelRaster`.
 */

(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelRaster = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /*
   * A frame buffer. Pass `data` to draw straight into an ImageData the
   * browser already owns, so putting the picture on the screen is one
   * copy rather than two.
   */
  function createBuffer(w, h, data) {
    return {
      w: w,
      h: h,
      data: data || new Uint8ClampedArray(w * h * 4),
      depth: new Float32Array(w * h),
      mask: new Uint8Array(w * h),
      drawn: 0,
    };
  }

  /* Start a frame: the depth buffer holds 0 (nothing yet) and the mask
     records which pixels have been touched, so the crowd does not paint
     the same pixel twice. */
  function beginFrame(buf) {
    buf.depth.fill(0);
    buf.mask.fill(0);
    buf.drawn = 0;
  }

  function setPixel(buf, x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) return;
    var i = (y * buf.w + x) * 4;
    buf.data[i] = r; buf.data[i + 1] = g; buf.data[i + 2] = b; buf.data[i + 3] = 255;
  }

  function getPixel(buf, x, y) {
    if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) return [0, 0, 0];
    var i = (y * buf.w + x) * 4;
    return [buf.data[i], buf.data[i + 1], buf.data[i + 2]];
  }

  /* A pixel that respects the depth buffer. `invd` is 1/d: bigger is
     nearer. */
  function drawPixel(buf, x, y, invd, r, g, b) {
    if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) return false;
    var p = y * buf.w + x;
    if (invd <= buf.depth[p]) return false;
    buf.depth[p] = invd;
    var i = p * 4;
    buf.data[i] = r; buf.data[i + 1] = g; buf.data[i + 2] = b; buf.data[i + 3] = 255;
    buf.drawn++;
    return true;
  }

  /* A pixel that only paints if nothing else has painted here this
     frame. Used for the crowd, which is thousands of dots. */
  function drawPixelOnce(buf, x, y, invd, r, g, b) {
    if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) return false;
    var p = y * buf.w + x;
    if (buf.mask[p]) return false;
    if (invd <= buf.depth[p]) return false;
    buf.mask[p] = 1;
    buf.depth[p] = invd;
    var i = p * 4;
    buf.data[i] = r; buf.data[i + 1] = g; buf.data[i + 2] = b; buf.data[i + 3] = 255;
    buf.drawn++;
    return true;
  }

  function fillRect(buf, x, y, w, h, r, g, b) {
    var x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    var x1 = Math.min(buf.w, (x | 0) + w), y1 = Math.min(buf.h, (y | 0) + h);
    for (var py = y0; py < y1; py++) {
      var row = py * buf.w;
      for (var px = x0; px < x1; px++) {
        var i = (row + px) * 4;
        buf.data[i] = r; buf.data[i + 1] = g; buf.data[i + 2] = b; buf.data[i + 3] = 255;
      }
    }
  }

  /* A vertical gradient, the sky. */
  function fillGradient(buf, topR, topG, topB, botR, botG, botB) {
    for (var y = 0; y < buf.h; y++) {
      var t = y / (buf.h - 1 || 1);
      var r = Math.round(topR + (botR - topR) * t);
      var g = Math.round(topG + (botG - topG) * t);
      var b = Math.round(topB + (botB - topB) * t);
      fillRect(buf, 0, y, buf.w, 1, r, g, b);
    }
  }

  function edge(ax, ay, bx, by, px, py) {
    return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  }

  /*
   * One screen-space triangle.
   *   x0,y0,d0 - vertex, with d = 1/distance (bigger is nearer)
   * Screen coordinates are in pixels, sampled at the pixel centre.
   */
  function triangle(buf, x0, y0, d0, x1, y1, d1, x2, y2, d2, r, g, b) {
    var area = edge(x0, y0, x1, y1, x2, y2);
    if (area === 0 || !isFinite(area)) return;
    if (area < 0) {
      /* Keep the winding positive so the edge tests are all ">= 0". */
      var tx = x1, ty = y1, td = d1;
      x1 = x2; y1 = y2; d1 = d2;
      x2 = tx; y2 = ty; d2 = td;
      area = -area;
    }
    var minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    var maxX = Math.min(buf.w - 1, Math.ceil(Math.max(x0, x1, x2)));
    var minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    var maxY = Math.min(buf.h - 1, Math.ceil(Math.max(y0, y1, y2)));
    if (minX > maxX || minY > maxY) return;

    for (var py = minY; py <= maxY; py++) {
      var cy = py + 0.5;
      var row = py * buf.w;
      for (var px = minX; px <= maxX; px++) {
        var cx = px + 0.5;
        var w0 = edge(x1, y1, x2, y2, cx, cy);
        if (w0 < 0) continue;
        var w1 = edge(x2, y2, x0, y0, cx, cy);
        if (w1 < 0) continue;
        var w2 = edge(x0, y0, x1, y1, cx, cy);
        if (w2 < 0) continue;
        var invd = (w0 * d0 + w1 * d1 + w2 * d2) / area;
        var p = row + px;
        if (invd <= buf.depth[p]) continue;
        buf.depth[p] = invd;
        var i = p * 4;
        buf.data[i] = r; buf.data[i + 1] = g; buf.data[i + 2] = b; buf.data[i + 3] = 255;
        buf.drawn++;
      }
    }
  }

  /*
   * A screen-space line with a width, used for the nets and the goal
   * frame. Depth-tested like everything else.
   */
  function line(buf, x0, y0, d0, x1, y1, d1, r, g, b) {
    var dx = x1 - x0, dy = y1 - y0;
    var steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
    if (steps <= 0) {
      drawPixel(buf, Math.round(x0), Math.round(y0), d0, r, g, b);
      return;
    }
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var invd = d0 + (d1 - d0) * t;
      drawPixel(buf, Math.round(x0 + dx * t), Math.round(y0 + dy * t), invd, r, g, b);
    }
  }

  /* Quantise a colour to the retro palette. Everything in the 3D scene
     goes through this, which is what makes the facets read as flat. */
  function quantise(c, step) {
    var s = step || 16;
    return Math.min(255, Math.round(c / s) * s);
  }

  return {
    createBuffer: createBuffer,
    beginFrame: beginFrame,
    setPixel: setPixel,
    getPixel: getPixel,
    drawPixel: drawPixel,
    drawPixelOnce: drawPixelOnce,
    fillRect: fillRect,
    fillGradient: fillGradient,
    triangle: triangle,
    line: line,
    quantise: quantise,
  };
});
