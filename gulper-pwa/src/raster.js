/*
 * GULPER - the software rasteriser.
 *
 * The entire game is drawn into an RGBA byte array by hand and blitted
 * once per frame. Two reasons, and the second is the important one:
 *
 * 1. Speed. One putImageData plus one scaled drawImage per frame, versus
 *    thousands of path fills. On a phone this is the difference between
 *    sixty frames and twenty.
 *
 * 2. Hard edges. Canvas2D antialiases every path, and at two CSS pixels
 *    per buffer pixel a soft edge is a smudge. A scanline rasteriser that
 *    snaps spans to whole pixels is the only way to get an honest pixel
 *    grid, and it is also how the flat-shaded low-poly look survives the
 *    downscale to 480x270.
 *
 * Colours are packed 0xAABBGGRR in a Uint32Array view, so writing a
 * pixel is one store instead of four.
 */
(function (S) {
    "use strict";

    /* Pack an "#rrggbb" string into the fast layout. */
    function pack(hex) {
        var h = hex.charAt(0) === "#" ? hex.slice(1) : hex;
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        if (!isFinite(n)) n = 0;
        var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return (255 << 24) | (b << 16) | (g << 8) | r;
    }

    function unpack(c) {
        return {
            r: c & 255,
            g: (c >> 8) & 255,
            b: (c >> 16) & 255
        };
    }

    /* Blend two packed colours, t in [0,1]. */
    function mix(a, b, t) {
        var ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255;
        var br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255;
        var r = (ar + (br - ar) * t) | 0;
        var g = (ag + (bg - ag) * t) | 0;
        var bl = (ab + (bb - ab) * t) | 0;
        return (255 << 24) | (bl << 16) | (g << 8) | r;
    }

    function create(w, h) {
        var data = new Uint8ClampedArray(w * h * 4);
        return {
            w: w,
            h: h,
            data: data,
            u32: new Uint32Array(data.buffer),
            pack: pack,
            unpack: unpack,
            mix: mix
        };
    }

    function clear(buf, color) {
        buf.u32.fill(color >>> 0);
    }

    function fillRect(buf, x, y, w, h, color) {
        if (w <= 0 || h <= 0) return;
        var x0 = x < 0 ? 0 : x | 0;
        var y0 = y < 0 ? 0 : y | 0;
        var x1 = x + w, y1 = y + h;
        if (x1 > buf.w) x1 = buf.w;
        if (y1 > buf.h) y1 = buf.h;
        if (x0 >= x1 || y0 >= y1) return;
        var row = buf.w;
        var c = color >>> 0;
        for (var yy = y0; yy < y1; yy++) {
            var idx = yy * row + x0;
            var end = yy * row + x1;
            while (idx < end) buf.u32[idx++] = c;
        }
    }

    /* One horizontal run of pixels. The workhorse: everything in this
     * renderer ends up as a run of spans. */
    function span(buf, y, x0, x1, color) {
        if (y < 0 || y >= buf.h) return;
        if (x0 < 0) x0 = 0;
        if (x1 > buf.w) x1 = buf.w;
        if (x1 <= x0) return;
        var idx = y * buf.w + x0;
        var end = y * buf.w + x1;
        var c = color >>> 0;
        while (idx < end) buf.u32[idx++] = c;
    }

    function pixel(buf, x, y, color) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) return;
        buf.u32[y * buf.w + x] = color >>> 0;
    }

    /* Scanline polygon fill.
     *
     * `pts` is a flat array [x0,y0,x1,y1,...] in screen space. Even-odd
     * rule, which handles convex and simple concave shapes alike, and the
     * spans are snapped to whole pixels so the edges stay hard.
     *
     * The inner loop is written out longhand because this is the hottest
     * code in the game: it runs for every face of every object on screen,
     * sixty times a second.
     */
    function poly(buf, pts, color) {
        var n = pts.length >> 1;
        if (n < 3) return;
        var minY = Infinity, maxY = -Infinity, i;
        for (i = 0; i < n; i++) {
            var py = pts[i * 2 + 1];
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
        }
        var y0 = Math.floor(minY);
        var y1 = Math.ceil(maxY);
        if (y0 < 0) y0 = 0;
        if (y1 > buf.h - 1) y1 = buf.h - 1;
        if (y1 < y0) return;

        var c = color >>> 0;
        for (var y = y0; y <= y1; y++) {
            var yc = y + 0.5;
            var sx = Infinity, ex = -Infinity;
            for (i = 0; i < n; i++) {
                var j = (i === n - 1) ? 0 : i + 1;
                var ay = pts[i * 2 + 1], by = pts[j * 2 + 1];
                if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
                    var t = (yc - ay) / (by - ay);
                    var x = pts[i * 2] + t * (pts[j * 2] - pts[i * 2]);
                    if (x < sx) sx = x;
                    if (x > ex) ex = x;
                }
            }
            if (ex < sx) continue;
            var s = Math.round(sx);
            var e = Math.round(ex);
            if (s < 0) s = 0;
            if (e > buf.w) e = buf.w;
            if (e <= s) {
                /* A span narrower than one pixel still has to show up, or
                 * thin geometry vanishes entirely at low resolution. */
                if (ex - sx > 0.05) span(buf, y, Math.round(sx), Math.round(sx) + 1, c);
                continue;
            }
            span(buf, y, s, e, c);
        }
    }

    /* Ordered dithering between two colours.
     *
     * This is what makes a 200-pixel-wide buffer look deliberate instead of
     * merely small: a gradient between two palette entries becomes a
     * checkerboard of them, and the eye reads it as a smooth ramp at
     * distance while the pixels stay honest.
     *
     * `level` in [0,1] picks the mix point; `bayer` is the 4x4 matrix.
     */
    function ditherRect(buf, x, y, w, h, cA, cB, level, bayer) {
        var x0 = x < 0 ? 0 : x | 0;
        var y0 = y < 0 ? 0 : y | 0;
        var x1 = x + w, y1 = y + h;
        if (x1 > buf.w) x1 = buf.w;
        if (y1 > buf.h) y1 = buf.h;
        var threshold = level * 16;
        for (var yy = y0; yy < y1; yy++) {
            var brow = (yy & 3) * 4;
            for (var xx = x0; xx < x1; xx++) {
                var t = bayer[brow + (xx & 3)] + 0.5;
                buf.u32[yy * buf.w + xx] = (t < threshold ? cB : cA) >>> 0;
            }
        }
    }

    /* Ordered dithering that BLENDS toward a colour instead of replacing
     * the pixel.
     *
     * This is the one that matters for light. A lamp pool has to sit on
     * top of the ground and lighten it; overwriting would punch a hole
     * in the scene instead. Each pixel keeps its own colour and mixes a
     * different fraction of the way toward the target, and the bayer
     * threshold decides which pixels move and which do not.
     */
    function ditherBlend(buf, x, y, w, h, color, level, bayer) {
        var x0 = x < 0 ? 0 : x | 0;
        var y0 = y < 0 ? 0 : y | 0;
        var x1 = x + w, y1 = y + h;
        if (x1 > buf.w) x1 = buf.w;
        if (y1 > buf.h) y1 = buf.h;
        var tr = color & 255, tg = (color >> 8) & 255, tb = (color >> 16) & 255;
        for (var yy = y0; yy < y1; yy++) {
            var brow = (yy & 3) * 4;
            for (var xx = x0; xx < x1; xx++) {
                var t = bayer[brow + (xx & 3)] + 0.5;
                var amt = level * (t / 16);
                if (amt <= 0) continue;
                if (amt > 1) amt = 1;
                var i = yy * buf.w + xx;
                var dst = buf.u32[i];
                var dr = dst & 255, dg = (dst >> 8) & 255, db = (dst >> 16) & 255;
                var nr = (dr + (tr - dr) * amt) | 0;
                var ng = (dg + (tg - dg) * amt) | 0;
                var nb = (db + (tb - db) * amt) | 0;
                buf.u32[i] = (255 << 24) | (nb << 16) | (ng << 8) | nr;
            }
        }
    }

    /* A single pixel dot, used by particles. */
    function dot(buf, x, y, color, alpha) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) return;
        var i = y * buf.w + x;
        if (alpha === undefined || alpha >= 1) {
            buf.u32[i] = color >>> 0;
            return;
        }
        if (alpha <= 0) return;
        var a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
        var dst = buf.u32[i];
        var r = (color & 255), g = (color >> 8) & 255, b = (color >> 16) & 255;
        var dr = dst & 255, dg = (dst >> 8) & 255, db = (dst >> 16) & 255;
        var nr = (dr + (r - dr) * a) | 0;
        var ng = (dg + (g - dg) * a) | 0;
        var nb = (db + (b - db) * a) | 0;
        buf.u32[i] = (255 << 24) | (nb << 16) | (ng << 8) | nr;
    }

    S.Raster = {
        create: create,
        clear: clear,
        fillRect: fillRect,
        span: span,
        pixel: pixel,
        poly: poly,
        ditherRect: ditherRect,
        ditherBlend: ditherBlend,
        dot: dot,
        pack: pack,
        unpack: unpack,
        mix: mix
    };
})(window.GU = window.GU || {});
