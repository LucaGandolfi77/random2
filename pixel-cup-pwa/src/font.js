/*
 * PIXEL CUP '96 — bitmap font
 * ----------------------------
 * A 5x7 pixel font drawn by hand into the framebuffer. No web fonts, no
 * canvas text: the letters are rectangles of pixels, so they stay crisp
 * at any scale and they cost nothing to cache.
 *
 * Each glyph is seven rows of five characters, '#' being ink.
 */

(function (root, factory) {
  "use strict";
  var api = factory(
    typeof PixelRaster !== "undefined" ? PixelRaster :
    (typeof require === "function" ? require("./raster.js") : null)
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelFont = api;
})(typeof self !== "undefined" ? self : this, function (Raster) {
  "use strict";

  var GLYPHS = {
    "A": ".###./#...#/#...#/#####/#...#/#...#/#...#",
    "B": "####./#...#/#...#/####./#...#/#...#/####.",
    "C": ".####/#..../#..../#..../#..../#..../.####",
    "D": "####./#...#/#...#/#...#/#...#/#...#/####.",
    "E": "#####/#..../#..../####./#..../#..../#####",
    "F": "#####/#..../#..../####./#..../#..../#....",
    "G": ".###./#...#/#..../#.###/#...#/#...#/.###.",
    "H": "#...#/#...#/#...#/#####/#...#/#...#/#...#",
    "I": "#####/..#../..#../..#../..#../..#../#####",
    "J": "..###/...#./...#./...#./...#./#..#./.##..",
    "K": "#...#/#..#./#.#../##.../#.#../#..#./#...#",
    "L": "#..../#..../#..../#..../#..../#..../#####",
    "M": "#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#",
    "N": "#...#/##..#/#.#.#/#..##/#...#/#...#/#...#",
    "O": ".###./#...#/#...#/#...#/#...#/#...#/.###.",
    "P": "####./#...#/#...#/####./#..../#..../#....",
    "Q": ".###./#...#/#...#/#...#/#.#.#/#..#./.##.#",
    "R": "####./#...#/#...#/####./#.#../#..#./#...#",
    "S": ".####/#..../#..../.###./....#/....#/####.",
    "T": "#####/..#../..#../..#../..#../..#../..#..",
    "U": "#...#/#...#/#...#/#...#/#...#/#...#/.###.",
    "V": "#...#/#...#/#...#/#...#/#...#/.#.#./..#..",
    "W": "#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#",
    "X": "#...#/#...#/.#.#./..#../.#.#./#...#/#...#",
    "Y": "#...#/#...#/.#.#./..#../..#../..#../..#..",
    "Z": "#####/....#/...#./..#../.#.../#..../#####",
    "0": ".###./#...#/#..##/#.#.#/##..#/#...#/.###.",
    "1": "..#../.##../..#../..#../..#../..#../.###.",
    "2": ".###./#...#/....#/...#./..#../.#.../#####",
    "3": "####./....#/....#/.###./....#/....#/####.",
    "4": "...#./..##./.#.#./#..#./#####/...#./...#.",
    "5": "#####/#..../####./....#/....#/#...#/.###.",
    "6": "..##./.#.../#..../####./#...#/#...#/.###.",
    "7": "#####/....#/...#./..#../.#.../.#.../.#...",
    "8": ".###./#...#/#...#/.###./#...#/#...#/.###.",
    "9": ".###./#...#/#...#/.####/....#/...#./.##..",
    " ": "...../...../...../...../...../...../.....",
    ".": "...../...../...../...../...../.##../.##..",
    ",": "...../...../...../...../.##../.##../.#...",
    ":": "...../.##../.##../...../.##../.##../.....",
    "!": "..#../..#../..#../..#../..#../...../..#..",
    "?": ".###./#...#/....#/..##./..#../...../..#..",
    "-": "...../...../...../#####/...../...../.....",
    "+": "...../..#../..#../#####/..#../..#../.....",
    "=": "...../...../#####/...../#####/...../.....",
    "'": "..#../..#../...../...../...../...../.....",
    "/": "....#/....#/...#./..#../.#.../#..../#....",
    "\\": "#..../#..../.#.../..#../...#./....#/....#",
    "*": "...../#.#.#/.###./#####/.###./#.#.#/.....",
    "%": "##..#/##..#/...#./..#../.#.../#..##/#..##",
    "(": "...#./..#../.#.../.#.../.#.../..#../...#.",
    ")": ".#.../..#../...#./...#./...#./..#../.#...",
    "[": "..###/..#../..#../..#../..#../..#../..###",
    "]": "###../..#../..#../..#../..#../..#../###..",
    "<": "...#./..#../.#.../#..../.#.../..#../...#.",
    ">": ".#.../..#../...#./....#/...#./..#../.#...",
    "_": "...../...../...../...../...../...../#####",
    "|": "..#../..#../..#../..#../..#../..#../..#..",
    "#": ".#.#./#####/.#.#./.#.#./#####/.#.#./.....",
    "@": ".###./#...#/#.###/#.#.#/#.###/#..../.###.",
    "^": "..#../.#.#./#...#/...../...../...../.....",
    "~": "...../...../.##.#/#.##./...../...../.....",
    "\u00a9": "..#../.###./#.#../#.###/..#../...../.....",  /* (c) */
    "\u00d7": "...../#...#/.#.#./..#../.#.#./#...#/.....",  /* multiplication sign */
  };

  /* Compile the strings into row arrays once. */
  var FONT = {};
  (function () {
    for (var ch in GLYPHS) {
      FONT[ch] = GLYPHS[ch].split("/");
    }
  })();

  var GLYPH_W = 5, GLYPH_H = 7, ADVANCE = 6;

  function textWidth(text, scale) {
    var s = scale || 1;
    if (!text || !text.length) return 0;
    return (text.length * ADVANCE - 1) * s;
  }

  function textHeight(scale) { return GLYPH_H * (scale || 1); }

  /*
   * Draw a string. `rgb` is [r,g,b]. Unknown characters are drawn as a
   * blank so a stray accented letter does not break the layout.
   */
  function drawText(buf, x, y, text, rgb, scale) {
    var s = scale || 1;
    if (!text) return 0;
    text = String(text).toUpperCase();
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      var rows = FONT[text[i]];
      if (rows) {
        for (var r = 0; r < GLYPH_H; r++) {
          var row = rows[r];
          for (var c = 0; c < GLYPH_W; c++) {
            if (row.charCodeAt(c) === 35 /* # */) {
              Raster.fillRect(buf, cx + c * s, y + r * s, s, s, rgb[0], rgb[1], rgb[2]);
            }
          }
        }
      }
      cx += ADVANCE * s;
    }
    return cx - x;
  }

  function drawTextCentered(buf, cx, y, text, rgb, scale) {
    var w = textWidth(text, scale);
    return drawText(buf, Math.round(cx - w / 2), y, text, rgb, scale);
  }

  function drawTextRight(buf, right, y, text, rgb, scale) {
    var w = textWidth(text, scale);
    return drawText(buf, Math.round(right - w), y, text, rgb, scale);
  }

  /* A panel with a border, for the heads-up display. */
  function drawPanel(buf, x, y, w, h, fill, border) {
    Raster.fillRect(buf, x, y, w, h, fill[0], fill[1], fill[2]);
    Raster.fillRect(buf, x, y, w, 1, border[0], border[1], border[2]);
    Raster.fillRect(buf, x, y + h - 1, w, 1, border[0], border[1], border[2]);
    Raster.fillRect(buf, x, y, 1, h, border[0], border[1], border[2]);
    Raster.fillRect(buf, x + w - 1, y, 1, h, border[0], border[1], border[2]);
  }

  /* A horizontal meter, filled from the left. */
  function drawMeter(buf, x, y, w, h, value, fill, back, border) {
    Raster.fillRect(buf, x, y, w, h, back[0], back[1], back[2]);
    var fw = Math.round(clamp01(value) * (w - 2));
    if (fw > 0) Raster.fillRect(buf, x + 1, y + 1, fw, h - 2, fill[0], fill[1], fill[2]);
    if (border) {
      Raster.fillRect(buf, x, y, w, 1, border[0], border[1], border[2]);
      Raster.fillRect(buf, x, y + h - 1, w, 1, border[0], border[1], border[2]);
      Raster.fillRect(buf, x, y, 1, h, border[0], border[1], border[2]);
      Raster.fillRect(buf, x + w - 1, y, 1, h, border[0], border[1], border[2]);
    }
  }

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  return {
    drawText: drawText,
    drawTextCentered: drawTextCentered,
    drawTextRight: drawTextRight,
    drawPanel: drawPanel,
    drawMeter: drawMeter,
    textWidth: textWidth,
    textHeight: textHeight,
    FONT: FONT,
  };
});
