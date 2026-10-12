/*
 * Generates the raster icons from the same silhouette as the SVG ones.
 * Plain Node, no dependencies: the PNG container and the rasteriser are both
 * written here, zlib comes from the standard library.
 *
 *   node scripts/gen-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");

/* ===== PNG encoding ===== */
const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0;
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

/* ===== Tiny rasteriser: polygon fill with 3x3 supersampling ===== */
function surface(w, h) {
    const buf = Buffer.alloc(w * h * 4, 0);
    return {
        w: w,
        h: h,
        buf: buf,
        px(x, y, r, g, b, a) {
            if (x < 0 || y < 0 || x >= w || y >= h) return;
            const i = (y * w + x) * 4;
            const na = a / 255;
            buf[i] = Math.round(buf[i] * (1 - na) + r * na);
            buf[i + 1] = Math.round(buf[i + 1] * (1 - na) + g * na);
            buf[i + 2] = Math.round(buf[i + 2] * (1 - na) + b * na);
            buf[i + 3] = Math.max(buf[i + 3], a);
        },
        fill(points, [r, g, b], alpha) {
            const S = 3;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    let hits = 0;
                    for (let sy = 0; sy < S; sy++) {
                        for (let sx = 0; sx < S; sx++) {
                            const px = x + (sx + 0.5) / S;
                            const py = y + (sy + 0.5) / S;
                            let inside = false;
                            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                                const [xi, yi] = points[i];
                                const [xj, yj] = points[j];
                                if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
                            }
                            if (inside) hits++;
                        }
                    }
                    if (hits) this.px(x, y, r, g, b, Math.round((alpha * hits) / (S * S)));
                }
            }
        },
    };
}

function rounded(surf, x, y, w, h, r, colour, alpha) {
    const pts = [];
    const corners = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    pts.push([x, y]);
    for (const [cx, cy, a0] of corners) {
        for (let i = 0; i <= 8; i++) {
            const a = a0 + (i / 8) * (Math.PI / 2);
            pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
    }
    surf.fill(pts, colour, alpha);
}

function disc(surf, cx, cy, r, colour, alpha) {
    const pts = [];
    for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    surf.fill(pts, colour, alpha);
}

/* ===== The icon: a top-down P-51, same silhouette as the SVG ===== */
function drawIcon(size, maskable) {
    const s = size;
    const k = s / 192;
    const surf = surface(s, s);

    const bg = [0x14, 0x18, 0x0f];
    const border = [0xd4, 0xaf, 0x37];
    const wing = [0x55, 0x63, 0x2f];
    const wingLo = [0x41, 0x4d, 0x24];
    const body = [0x8a, 0x9a, 0x4e];
    const bodyLo = [0x6d, 0x7c, 0x3c];
    const dark = [0x2c, 0x33, 0x1a];
    const glass = [0xa8, 0xc8, 0xd8];

    if (maskable) {
        surf.fill([[0, 0], [s, 0], [s, s], [0, s]], bg, 255);
    } else {
        rounded(surf, 0, 0, s, s, 32 * k, bg, 255);
    }

    const inset = maskable ? 0.26 : 0.146;
    const bw = s * (1 - inset * 2);
    surf.fill([[s * inset, s * inset], [s * inset + bw, s * inset], [s * inset + bw, s * inset + bw], [s * inset, s * inset + bw]], bg, 255);

    const cx = s / 2;
    const cx0 = maskable ? cx : cx;

    if (!maskable) {
        const t = 2.5 * k;
        const edges = [
            [[s * inset, s * inset], [s * inset + bw, s * inset], [s * inset + bw, s * inset + t], [s * inset, s * inset + t]],
            [[s * inset, s * inset + bw - t], [s * inset + bw, s * inset + bw - t], [s * inset + bw, s * inset + bw], [s * inset, s * inset + bw]],
            [[s * inset, s * inset], [s * inset + t, s * inset], [s * inset + t, s * inset + bw], [s * inset, s * inset + bw]],
            [[s * inset + bw - t, s * inset], [s * inset + bw, s * inset], [s * inset + bw, s * inset + bw], [s * inset + bw - t, s * inset + bw]],
        ];
        for (const e of edges) surf.fill(e, border, 0.55 * 255);
    }

    // wings
    surf.fill([[cx0, 82 * k], [cx0 - 35 * k, 103 * k], [cx0 - 38 * k, 117 * k], [cx0, 109 * k], [cx0 + 38 * k, 117 * k], [cx0 + 35 * k, 103 * k]], wing, 255);
    // tailplane
    surf.fill([[cx0, 117 * k], [cx0 - 15 * k, 129 * k], [cx0 - 17 * k, 140 * k], [cx0, 135 * k], [cx0 + 17 * k, 140 * k], [cx0 + 15 * k, 129 * k]], wingLo, 255);
    // fuselage
    surf.fill([
        [cx0, 44 * k], [cx0 + 7 * k, 58 * k], [cx0 + 7 * k, 118 * k], [cx0 + 4 * k, 134 * k],
        [cx0, 140 * k], [cx0 - 4 * k, 134 * k], [cx0 - 7 * k, 118 * k], [cx0 - 7 * k, 58 * k],
    ], body, 255);
    // panel line
    surf.fill([[cx0 - 3 * k, 64 * k], [cx0 - 3 * k, 126 * k], [cx0 - 1 * k, 126 * k], [cx0 - 1 * k, 64 * k]], bodyLo, 255);
    // canopy
    surf.fill([[cx0 - 6 * k, 70 * k], [cx0 + 6 * k, 70 * k], [cx0 + 4 * k, 94 * k], [cx0 - 4 * k, 94 * k]], glass, 0.9 * 255);
    // spinner
    disc(surf, cx0, 49 * k, 5 * k, border, 255);
    // gold wing bars
    surf.fill([[cx0 - 30 * k, 107 * k], [cx0 - 14 * k, 107 * k], [cx0 - 14 * k, 111 * k], [cx0 - 30 * k, 111 * k]], border, 0.9 * 255);
    surf.fill([[cx0 + 14 * k, 107 * k], [cx0 + 30 * k, 107 * k], [cx0 + 30 * k, 111 * k], [cx0 + 14 * k, 111 * k]], border, 0.9 * 255);
    // panel outline
    surf.fill([[cx0 - 3 * k, 70 * k], [cx0 - 3 * k, 126 * k], [cx0 - 1.4 * k, 126 * k], [cx0 - 1.4 * k, 70 * k]], dark, 0.45 * 255);

    return surf.buf;
}

function png(size, maskable) {
    return encodePng(size, size, drawIcon(size, maskable));
}

writeFileSync(join(outDir, "icon-180.png"), png(180, false));
writeFileSync(join(outDir, "icon-192.png"), png(192, false));
writeFileSync(join(outDir, "icon-512.png"), png(512, false));
writeFileSync(join(outDir, "icon-maskable-192.png"), png(192, true));
writeFileSync(join(outDir, "icon-maskable-512.png"), png(512, true));
console.log("wrote 5 PNG icons");