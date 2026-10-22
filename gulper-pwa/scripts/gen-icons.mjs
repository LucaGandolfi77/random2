/*
 * GULPER - draw the icon set and the social card.
 *
 * The artwork is generated rather than drawn by hand: a 32x32 pixel grid
 * is composed in code and emitted as an SVG of horizontal runs, then
 * rasterised with sharp. That way the icon is genuinely pixel art - the
 * same art direction as the game - and it can be edited by changing
 * numbers rather than by redrawing rectangles in a vector editor.
 *
 * The PNGs are committed. This never runs in CI; it exists so the
 * artwork can be regenerated rather than being drawn once and never
 * touched again.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const ICONS = join(here, "..", "icons");
const ROOT = join(here, "..");

let sharp = null;
/* Resolved by walking UP as well as down, because bucio/ is a SIBLING of
 * this folder rather than a child of it. */
const candidates = [
    join(here, "..", "..", "bucio", "node_modules", "sharp"),
    join(here, "..", "node_modules", "sharp"),
    "sharp"
];
for (const spec of candidates) {
    try { sharp = require(spec); break; } catch { /* try the next one */ }
}

if (!sharp) {
    console.error(
        "sharp is not available.\n" +
        "Install it (npm i sharp) or run this from a checkout that has\n" +
        "bucio/node_modules. The committed PNGs are unaffected - this script\n" +
        "only regenerates them."
    );
    process.exit(1);
}

/* ===== the palette, taken from the docks palette in src/palette.js ===== */
const P = {
    outline: "#1b2413",
    dark: "#3d5424",
    mid: "#6b7a44",
    light: "#8fbf5c",
    pale: "#b8d97a",
    maw: "#6b1f26",
    mawLit: "#d9714f",
    amber: "#f2b23c"
};

const N = 32;

/* A pixel grid. null is transparent. */
function grid(n) {
    const g = [];
    for (let y = 0; y < n; y++) g.push(new Array(n).fill(null));
    return g;
}

function put(g, x, y, c) {
    if (x < 0 || y < 0 || y >= g.length || x >= g[0].length) return;
    g[y][x] = c;
}

function fillRect(g, x0, y0, w, h, c) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(g, x, y, c);
}

function disc(g, cx, cy, r, c) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            const dx = x - cx, dy = y - cy;
            if (dx * dx + dy * dy <= r * r) put(g, x, y, c);
        }
    }
}

function ring(g, cx, cy, r, c) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            const dx = x - cx, dy = y - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= r && d > r - 1.2) put(g, x, y, c);
        }
    }
}

/* An axis-aligned ellipse. The head is an ellipse rather than a disc
 * because a xenomorph head is tall and narrow, and a disc reads as a
 * ball. */
function ellipse(g, cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            const dx = (x - cx) / rx, dy = (y - cy) / ry;
            if (dx * dx + dy * dy <= 1) put(g, x, y, c);
        }
    }
}

/* A tapered limb: a line that thins as it goes. */
function limb(g, x0, y0, x1, y1, c) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        const w = Math.max(0, 1.1 * (1 - t * 0.8));
        for (let dy = -Math.floor(w); dy <= Math.floor(w); dy++) {
            for (let dx = -Math.floor(w); dx <= Math.floor(w); dx++) {
                if (dx * dx + dy * dy > w * w) continue;
                put(g, Math.round(x) + dx, Math.round(y) + dy, c);
            }
        }
    }
}

function line(g, x0, y0, x1, y1, c) {
    let x = Math.round(x0), y = Math.round(y0);
    const ex = Math.round(x1), ey = Math.round(y1);
    const dx = Math.abs(ex - x), dy = Math.abs(ey - y);
    const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while (guard++ < 4000) {
        put(g, x, y, c);
        if (x === ex && y === ey) break;
        const e2 = err * 2;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

/*
 * The creature.
 *
 * Eight tentacles, a soft trunk, a canted dome and a vertical maw.
 * Drawn at 32x32 and scaled up, so it reads as pixel art at every size
 * rather than as a smooth vector shape pretending to be one.
 */
function creature() {
    const g = grid(N);

    /* Tentacles, behind the body. Six of them, each one curving and
     * thinning, so they read as limbs rather than as spokes. */
    const arms = [
        [-15, 4, -4, -3], [-16, 12, -5, 4], [-13, 20, -4, 10],
        [13, 20, 4, 10], [16, 12, 5, 4], [15, 4, 4, -3]
    ];
    for (const [ex, ey, mx, my] of arms) {
        const sx = 16 + (ex > 0 ? 4 : -4), sy = 20;
        /* Two segments with a bend at the midpoint: a tentacle curls. */
        limb(g, sx, sy, 16 + mx, 20 + my, P.outline);
        limb(g, 16 + mx, 20 + my, 16 + ex, 20 + ey, P.outline);
        limb(g, sx, sy, 16 + mx, 20 + my, P.dark);
        limb(g, 16 + mx, 20 + my, 16 + ex, 20 + ey, P.mid);
    }

    /* The trunk: a soft, wide body. */
    ellipse(g, 16, 21, 9, 8, P.outline);
    ellipse(g, 16, 21.5, 8, 7, P.dark);
    ellipse(g, 16, 22, 6.8, 5.8, P.mid);
    ellipse(g, 13.8, 19.6, 3.4, 2.8, P.light);
    ellipse(g, 13, 18.6, 1.4, 1.2, P.pale);

    /* The neck. */
    fillRect(g, 14, 14, 5, 5, P.outline);
    fillRect(g, 15, 14, 3, 5, P.dark);

    /* The head: tall, narrow, canted forward. No eyes - the silhouette
     * is the whole point. */
    ellipse(g, 16, 9, 5.2, 7.4, P.outline);
    ellipse(g, 16, 9.4, 4.4, 6.6, P.mid);
    ellipse(g, 14.5, 7, 1.6, 2.2, P.light);
    ellipse(g, 14, 5.6, 0.8, 1.0, P.pale);

    /* The maw: a vertical slot, open, with a lit inner edge. */
    fillRect(g, 14, 5, 4, 9, P.outline);
    fillRect(g, 15, 6, 2, 7, P.maw);
    fillRect(g, 15, 6, 1, 5, P.mawLit);
    put(g, 16, 12, P.mawLit);

    /* Dorsal spines at the shoulders. */
    put(g, 10, 16, P.outline); put(g, 10, 17, P.dark);
    put(g, 22, 16, P.outline); put(g, 22, 17, P.dark);

    return g;
}

/* Turn a pixel grid into an SVG of horizontal runs. */
function gridToSvg(g, scale, background) {
    const parts = [];
    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${N * scale}" height="${N * scale}" ` +
        `viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges">`
    );
    if (background) {
        parts.push(`<rect width="${N}" height="${N}" fill="${background}"/>`);
    }
    for (let y = 0; y < N; y++) {
        let x = 0;
        while (x < N) {
            const c = g[y][x];
            if (!c) { x++; continue; }
            let run = 1;
            while (x + run < N && g[y][x + run] === c) run++;
            parts.push(
                `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`
            );
            x += run;
        }
    }
    parts.push("</svg>");
    return parts.join("\n");
}

/* The maskable variant needs its art inside the safe zone, which is the
 * middle eighty per cent, so the grid is padded rather than scaled. */
function padGrid(g, pad, background) {
    const n = N + pad * 2;
    const out = grid(n);
    if (background) fillRect(out, 0, 0, n, n, background);
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) out[y + pad][x + pad] = g[y][x];
    }
    return out;
}

/* ===== the social card =====
 * A pixel scene rather than a logo: the docks at night, with the
 * creature in the middle of it. No text, because text in an SVG needs a
 * font that may not exist on the machine that renders it. */
function cover() {
    const W = 1200, H = 630;
    const px = 12;                    /* size of one art pixel on the card */
    const g = grid(Math.ceil(W / px), Math.ceil(H / px));
    const CW = g[0].length, CH = g.length;

    /* Sky. */
    for (let y = 0; y < CH; y++) {
        const t = y / CH;
        const c = t < 0.45 ? "#05070c" : (t < 0.7 ? "#0e1219" : "#161c25");
        fillRect(g, 0, y, CW, 1, c);
    }
    /* The dock floor. */
    for (let y = Math.floor(CH * 0.62); y < CH; y++) {
        for (let x = 0; x < CW; x++) {
            const n = (x * 7 + y * 13) % 11;
            g[y][x] = n < 4 ? "#1b212a" : (n < 8 ? "#202832" : "#161c24");
        }
    }
    /* Containers along the back. */
    const boxes = [
        [2, 26, 12, 10, "#3a434f"], [15, 29, 14, 9, "#4d5866"],
        [31, 27, 11, 10, "#6b3d21"], [43, 30, 13, 8, "#3a434f"],
        [58, 28, 12, 9, "#43291a"], [72, 26, 14, 10, "#2b323c"]
    ];
    for (const [bx, by, bw, bh, c] of boxes) {
        fillRect(g, bx, by, bw, bh, "#0e1219");
        fillRect(g, bx + 1, by + 1, bw - 2, bh - 2, c);
        for (let i = bx + 3; i < bx + bw - 2; i += 4) fillRect(g, i, by + 1, 1, bh - 2, "#1b212a");
    }
    /* Lamps. */
    for (const lx of [9, 40, 68]) {
        fillRect(g, lx, 18, 1, 22, "#2b323c");
        fillRect(g, lx - 1, 17, 3, 2, "#f2b23c");
        for (let y = 18; y < 38; y++) {
            const half = Math.max(1, (y - 18) * 0.5);
            for (let x = Math.floor(lx - half); x <= lx + half; x++) {
                if (g[y][x] === "#161c24" || g[y][x] === "#1b212a" || g[y][x] === "#202832") {
                    if (((x + y) % 3) !== 0) g[y][x] = "#2a2113";
                }
            }
        }
    }
    /* The creature, in the middle, big. */
    const c = creature();
    const scale = 3;
    const ox = Math.floor(CW / 2 - (N * scale) / 2);
    const oy = Math.floor(CH * 0.42);
    for (let y = 0; y < N * scale; y++) {
        for (let x = 0; x < N * scale; x++) {
            const col = c[Math.floor(y / scale)][Math.floor(x / scale)];
            if (!col) continue;
            put(g, ox + x, oy + y, col);
        }
    }
    /* A vignette, so the middle is where the eye goes. */
    for (let y = 0; y < CH; y++) {
        for (let x = 0; x < CW; x++) {
            const dx = (x - CW / 2) / (CW / 2), dy = (y - CH / 2) / (CH / 2);
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0.78 && ((x + y) % 4 < 2)) {
                const cur = g[y][x];
                if (cur === "#05070c" || cur === "#0e1219" || cur === "#161c24") g[y][x] = "#020306";
            }
        }
    }

    const parts = [];
    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ` +
        `viewBox="0 0 ${CW} ${CH}" shape-rendering="crispEdges">`
    );
    for (let y = 0; y < CH; y++) {
        let x = 0;
        while (x < CW) {
            const col = g[y][x];
            if (!col) { x++; continue; }
            let run = 1;
            while (x + run < CW && g[y][x + run] === col) run++;
            parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${col}"/>`);
            x += run;
        }
    }
    parts.push("</svg>");
    return parts.join("\n");
}

/* ===== write the art ===== */
const art = creature();

const svg512 = gridToSvg(art, 16, null);
const svg192 = gridToSvg(art, 6, null);
const svgMask = gridToSvg(padGrid(art, 3, "#0a0c10"), 14, null);
const coverSvg = cover();

writeFileSync(join(ICONS, "icon-512.svg"), svg512);
writeFileSync(join(ICONS, "icon-192.svg"), svg192);
writeFileSync(join(ICONS, "icon-512-maskable.svg"), svgMask);
writeFileSync(join(ROOT, "og-cover.svg"), coverSvg);
console.log("  wrote the SVG art");

const jobs = [
    [join(ICONS, "icon-512.svg"), join(ICONS, "icon-512.png"), 512, 512],
    [join(ICONS, "icon-192.svg"), join(ICONS, "icon-192.png"), 192, 192],
    [join(ICONS, "icon-512-maskable.svg"), join(ICONS, "icon-512-maskable.png"), 512, 512],
    /* apple-touch-icon is never maskable: iOS applies its own rounding and
     * a pre-masked icon would arrive with its corners cut twice. */
    [join(ICONS, "icon-512.svg"), join(ICONS, "apple-touch-icon.png"), 180, 180],
    [join(ROOT, "og-cover.svg"), join(ROOT, "og-cover.png"), 1200, 630]
];

for (const [src, out, w, h] of jobs) {
    const svg = readFileSync(src);
    const png = await sharp(svg, { density: 384 }).resize(w, h, { fit: "fill" }).png().toBuffer();
    writeFileSync(out, png);
    console.log("  " + src.split("/").slice(-2).join("/") + "  ->  " + out.split("/").slice(-2).join("/") + "  " + w + "x" + h);
}
