/**
 * Generate the original SVG concept art for the fan store page.
 *
 * Everything here is drawn from scratch: no official screenshots, logos or
 * character art are downloaded or embedded. The illustrations are flat-vector
 * scenes built from reusable brick / minifigure / machine primitives, in the
 * spirit of a brick-built machine-hunting adventure.
 *
 *   npm run art
 *
 * The generated SVGs are committed, so the app itself has no build step.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const screens = join(here, "screens");
const W = 1600;
const H = 900;

/* ------------------------------------------------------------------ utils */

function shade(hex, amount) {
  const n = parseInt(hex.replace("#", ""), 16);
  const clip = (v) => Math.max(0, Math.min(255, v));
  const r = clip(((n >> 16) & 255) + amount);
  const g = clip(((n >> 8) & 255) + amount);
  const b = clip((n & 255) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const rect = (x, y, w, h, fill, rx = 0, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const circle = (cx, cy, r, fill, extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = "") =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const path = (d, fill, extra = "") =>
  `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke, width = 2, extra = "") =>
  `<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;

function ridge(points, color) {
  const d =
    `M 0 ${H} L 0 ${points[0][1]} ` +
    points.map(([x, y]) => `L ${x} ${y}`).join(" ") +
    ` L ${W} ${H} Z`;
  return path(d, color);
}

function brick(x, y, w, h, color, studs = 3) {
  let out = rect(x, y, w, h, color, Math.min(8, h / 5));
  out += rect(x, y, w, Math.max(8, h * 0.16), shade(color, 26), Math.min(8, h / 5));
  const step = w / studs;
  const r = Math.min(15, step * 0.28);
  for (let i = 0; i < studs; i++) {
    const cx = x + step * (i + 0.5);
    out += circle(cx, y + 10, r, shade(color, 40));
    out += circle(cx - r * 0.18, y + 8, r * 0.5, shade(color, 62));
  }
  return out;
}

function tree(x, y, s, leaf = "#2e6b43") {
  let out = rect(x - 8 * s, y, 16 * s, 96 * s, "#5a3a2a", 4 * s);
  out += circle(x - 38 * s, y + 8 * s, 38 * s, shade(leaf, -18));
  out += circle(x + 38 * s, y + 8 * s, 38 * s, shade(leaf, -10));
  out += circle(x, y - 22 * s, 52 * s, leaf);
  out += circle(x - 6 * s, y - 52 * s, 38 * s, shade(leaf, 20));
  return out;
}

function minifig(x, y, s, opts = {}) {
  const {
    skin = "#f1c27d",
    torso = "#c0392b",
    legs = "#2c3e50",
    hair = "#8c3b24",
    bow = false,
    staff = false,
  } = opts;
  let out = "";
  out += rect(x - 11 * s, y + 20 * s, 9 * s, 18 * s, legs, 2 * s);
  out += rect(x + 2 * s, y + 20 * s, 9 * s, 18 * s, legs, 2 * s);
  out += rect(x - 14 * s, y, 28 * s, 24 * s, torso, 5 * s);
  out += rect(x - 20 * s, y + 2 * s, 7 * s, 19 * s, skin, 3 * s);
  out += rect(x + 13 * s, y + 2 * s, 7 * s, 19 * s, skin, 3 * s);
  out += circle(x, y - 11 * s, 11 * s, skin);
  out += path(
    `M ${x - 12 * s} ${y - 13 * s} Q ${x} ${y - 30 * s} ${x + 12 * s} ${y - 13 * s} ` +
      `L ${x + 9 * s} ${y - 16 * s} Q ${x} ${y - 22 * s} ${x - 9 * s} ${y - 16 * s} Z`,
    hair
  );
  if (bow) {
    out += `<path d="M ${x + 20 * s} ${y - 8 * s} Q ${x + 40 * s} ${y + 5 * s} ${x + 20 * s} ${y + 28 * s}" fill="none" stroke="#d9a441" stroke-width="${3 * s}"/>`;
    out += line(x + 20 * s, y - 8 * s, x + 20 * s, y + 28 * s, "#efe7d2", 1.2 * s);
  }
  if (staff) {
    out += line(x + 18 * s, y - 22 * s, x + 22 * s, y + 34 * s, "#8a6a45", 4 * s);
    out += circle(x + 18 * s, y - 26 * s, 7 * s, "#6fd8ff", 'filter="url(#glow)"');
  }
  return out;
}

function machine(x, y, s, color = "#93a6b4") {
  let out = "";
  out += path(
    `M ${x - 70 * s} ${y} Q ${x - 150 * s} ${y - 44 * s} ${x - 210 * s} ${y - 6 * s} ` +
      `L ${x - 196 * s} ${y + 26 * s} Q ${x - 120 * s} ${y + 6 * s} ${x - 64 * s} ${y + 34 * s} Z`,
    shade(color, -26)
  );
  out += rect(x - 52 * s, y + 28 * s, 24 * s, 62 * s, shade(color, -30), 6 * s);
  out += rect(x + 18 * s, y + 28 * s, 24 * s, 62 * s, shade(color, -30), 6 * s);
  out += brick(x - 74 * s, y - 24 * s, 150 * s, 56 * s, color, 6);
  out += rect(x + 38 * s, y - 86 * s, 30 * s, 74 * s, shade(color, -8), 8 * s);
  out += brick(x + 24 * s, y - 118 * s, 72 * s, 38 * s, shade(color, 6), 3);
  out += circle(x + 82 * s, y - 100 * s, 6 * s, "#6fd8ff", 'filter="url(#glow)"');
  return out;
}

function tallneck(x, y, s, color = "#9aa9b5") {
  let out = "";
  out += rect(x - 18 * s, y - 200 * s, 36 * s, 210 * s, shade(color, -14), 8 * s);
  for (let i = 0; i < 5; i++) {
    out += rect(x - 24 * s, y - 184 * s + i * 38 * s, 48 * s, 12 * s, shade(color, 12), 4 * s);
  }
  out += brick(x - 66 * s, y - 232 * s, 132 * s, 38 * s, color, 5);
  out += circle(x, y - 246 * s, 10 * s, "#6fd8ff", 'filter="url(#glow)"');
  return out;
}

function house(x, y, s, wall = "#c98a52", roof = "#8c3b2f") {
  let out = brick(x, y - 90 * s, 170 * s, 90 * s, wall, 4);
  out += path(
    `M ${x - 16 * s} ${y - 90 * s} L ${x + 85 * s} ${y - 156 * s} L ${x + 186 * s} ${y - 90 * s} Z`,
    roof
  );
  out += rect(x + 62 * s, y - 60 * s, 46 * s, 60 * s, "#3b2a22", 4 * s);
  out += rect(x + 22 * s, y - 70 * s, 30 * s, 28 * s, "#9fd8e8", 3 * s);
  out += rect(x + 120 * s, y - 70 * s, 30 * s, 28 * s, "#9fd8e8", 3 * s);
  return out;
}

function sunRays(cx, cy, color) {
  let out = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x2 = cx + Math.cos(a) * 620;
    const y2 = cy + Math.sin(a) * 620;
    out += line(cx, cy, x2, y2, color, 14, 'opacity=".08"');
  }
  return out;
}

function grassTufts(color, count, seed = 1) {
  let out = "";
  let n = seed;
  const rnd = () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = H - 20 - rnd() * 150;
    const h = 18 + rnd() * 40;
    out += path(
      `M ${x} ${y} Q ${x + 6} ${y - h / 2} ${x + 2} ${y - h} Q ${x + 12} ${y - h / 2} ${x + 16} ${y} Z`,
      color,
      'opacity=".8"'
    );
  }
  return out;
}

function wrap(stops, content, extraDefs = "") {
  const sky = stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("");
  const defs = `
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${sky}</linearGradient>
    <radialGradient id="vig" cx="50%" cy="44%" r="76%">
      <stop offset="52%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".58"/>
    </radialGradient>
    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".14"/>
    </linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    ${extraDefs}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  <defs>${defs}</defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${content}
  <rect width="${W}" height="${H}" fill="url(#vig)" pointer-events="none"/>
</svg>
`;
}

/* ----------------------------------------------------------------- scenes */

const scenes = {};

scenes["scene-1"] = () =>
  wrap(
    [
      [0, "#16332c"],
      [0.46, "#3f7048"],
      [1, "#c7b169"],
    ],
    `
    ${sunRays(1210, 190, "#ffe6a0")}
    ${circle(1210, 190, 92, "#ffe1a0", 'opacity=".9"')}
    ${ridge([[0, 560], [260, 470], [560, 520], [880, 420], [1180, 500], [1600, 430]], "#2d5944")}
    ${ridge([[0, 690], [300, 580], [640, 650], [980, 540], [1320, 630], [1600, 560]], "#224b39")}
    ${tallneck(1180, 700, 1.15)}
    ${tree(180, 520, 1.5)}
    ${tree(470, 560, 1.05)}
    ${tree(880, 600, 0.9)}
    ${brick(300, 620, 150, 80, "#7d8a6a", 3)}
    ${brick(330, 552, 90, 70, "#8d9a78", 2)}
    ${path(`M 0 780 Q 400 700 800 770 T 1600 740 L 1600 900 L 0 900 Z`, "#173b2d")}
    ${grassTufts("#4f8a55", 60, 7)}
    ${minifig(650, 720, 2.2, { torso: "#c44536", hair: "#a33a22", bow: true })}
    ${minifig(830, 748, 1.9, { torso: "#3f7fa6", hair: "#d9a441", staff: true })}
    ${path(`M 240 0 Q 280 180 250 340`, "none")}
    ${`<path d="M 240 0 Q 280 180 250 340" fill="none" stroke="#6aa84f" stroke-width="7" opacity=".7"/>`}
    ${`<path d="M 1320 0 Q 1290 160 1340 300" fill="none" stroke="#6aa84f" stroke-width="6" opacity=".6"/>`}
    ${rect(0, 0, W, H, "url(#haze)", 0, 'pointer-events="none"')}
    `
  );

scenes["scene-2"] = () =>
  wrap(
    [
      [0, "#2b3b5c"],
      [0.45, "#d8733f"],
      [1, "#f4c46b"],
    ],
    `
    ${sunRays(800, 470, "#ffdca0")}
    ${circle(800, 470, 118, "#ffe0a0", 'opacity=".92"')}
    ${ridge([[0, 600], [320, 500], [700, 560], [1080, 470], [1600, 540]], "#7c5a52")}
    ${ridge([[0, 700], [360, 600], [780, 660], [1200, 580], [1600, 640]], "#5c4440")}
    ${house(180, 730, 1.0, "#c98a52", "#8c3b2f")}
    ${house(520, 690, 0.85, "#d8a45e", "#9c4a32")}
    ${house(940, 720, 0.95, "#b9794a", "#7d3529")}
    ${house(1280, 680, 0.8, "#d2a05c", "#94402d")}
    ${tree(90, 560, 1.6)}
    ${tree(1500, 600, 1.3)}
    ${path(`M 0 810 Q 500 740 1000 800 T 1600 780 L 1600 900 L 0 900 Z`, "#3d2f2c")}
    ${grassTufts("#8a6a45", 44, 13)}
    ${minifig(620, 790, 2.0, { torso: "#3f7fa6", hair: "#b5472f" })}
    ${minifig(1010, 815, 1.7, { torso: "#c9a227", hair: "#3b2a22", staff: true })}
    ${circle(420, 640, 9, "#ffd873", 'filter="url(#glow)"')}
    ${circle(1150, 620, 9, "#ffd873", 'filter="url(#glow)"')}
    ${rect(0, 0, W, H, "url(#haze)", 0, 'pointer-events="none"')}
    `
  );

scenes["scene-3"] = () =>
  wrap(
    [
      [0, "#274a36"],
      [0.5, "#6d8b4e"],
      [1, "#d8b65f"],
    ],
    `
    ${sunRays(320, 210, "#fff0b0")}
    ${circle(320, 210, 80, "#ffe9a8", 'opacity=".85"')}
    ${ridge([[0, 640], [420, 540], [900, 610], [1300, 520], [1600, 580]], "#3f6a48")}
    ${machine(980, 640, 1.55)}
    ${path(`M 0 820 Q 500 760 1000 810 T 1600 790 L 1600 900 L 0 900 Z`, "#22462f")}
    ${grassTufts("#7fa85a", 90, 23)}
    ${minifig(430, 760, 2.4, { torso: "#c44536", hair: "#a33a22", bow: true })}
    ${circle(1240, 540, 7, "#ffd27a", 'filter="url(#glow)"')}
    ${circle(1280, 516, 5, "#ffd27a", 'filter="url(#glow)"')}
    ${circle(1308, 556, 4, "#ffd27a", 'filter="url(#glow)"')}
    ${ellipse(1180, 800, 160, 26, "#c2a86a", 'opacity=".35"')}
    ${rect(0, 0, W, H, "url(#haze)", 0, 'pointer-events="none"')}
    `
  );

scenes["scene-4"] = () =>
  wrap(
    [
      [0, "#1b2a44"],
      [0.5, "#7184ad"],
      [1, "#f3c07a"],
    ],
    `
    ${sunRays(1180, 280, "#ffe7b5")}
    ${circle(1180, 280, 70, "#ffe7b5", 'opacity=".9"')}
    ${ridge([[0, 560], [360, 480], [760, 540], [1160, 460], [1600, 520]], "#5d6f8a")}
    ${ridge([[0, 690], [420, 610], [880, 670], [1300, 590], [1600, 640]], "#43536c")}
    ${machine(1250, 600, 0.6, "#8fa0b0")}
    ${tallneck(320, 660, 0.6, "#8fa0b0")}
    ${path(`M 0 820 L 0 770 L 260 730 L 560 760 L 900 720 L 1240 770 L 1600 730 L 1600 900 L 0 900 Z`, "#2c3346")}
    ${minifig(520, 730, 2.0, { torso: "#c44536", hair: "#a33a22", bow: true })}
    ${minifig(720, 748, 1.9, { torso: "#3f7fa6", hair: "#d9a441" })}
    ${minifig(920, 738, 1.9, { torso: "#c9a227", hair: "#5d4037", staff: true })}
    ${minifig(1120, 756, 1.8, { torso: "#7b4ea8", hair: "#2c3e50", bow: true })}
    ${grassTufts("#5b6b54", 40, 31)}
    ${rect(0, 0, W, H, "url(#haze)", 0, 'pointer-events="none"')}
    `
  );

scenes["scene-5"] = () =>
  wrap(
    [
      [0, "#08151f"],
      [0.55, "#12303f"],
      [1, "#0a1924"],
    ],
    `
    ${path(`M 0 0 L 260 0 L 180 900 L 0 900 Z`, "#0b1c27")}
    ${path(`M 1600 0 L 1340 0 L 1420 900 L 1600 900 Z`, "#0b1c27")}
    ${path(`M 0 0 Q 400 220 460 900 L 0 900 Z`, "#102834")}
    ${path(`M 1600 0 Q 1200 220 1140 900 L 1600 900 Z`, "#102834")}
    ${rect(180, 120, 60, 560, "#1c3a49", 8)}
    ${rect(1360, 180, 54, 520, "#1c3a49", 8)}
    ${brick(300, 360, 170, 70, "#2b5263", 4)}
    ${brick(1130, 420, 170, 70, "#2b5263", 4)}
    ${ellipse(800, 720, 330, 90, "#0e2b3a")}
    ${ellipse(800, 706, 250, 62, "#1f6d86", 'filter="url(#glow)"')}
    ${ellipse(800, 700, 150, 34, "#7fe3ff", 'filter="url(#glow)"')}
    ${circle(520, 500, 8, "#7fe3ff", 'filter="url(#glow)"')}
    ${circle(1080, 430, 7, "#7fe3ff", 'filter="url(#glow)"')}
    ${circle(940, 560, 5, "#7fe3ff", 'filter="url(#glow)"')}
    ${minifig(800, 650, 2.2, { torso: "#2b4a5c", hair: "#1b2a33", staff: true })}
    ${rect(0, 0, W, H, "url(#haze)", 0, 'pointer-events="none"')}
    `
  );

scenes["scene-6"] = () =>
  wrap(
    [
      [0, "#5a2f2a"],
      [0.48, "#d76b39"],
      [1, "#f2c14e"],
    ],
    `
    ${sunRays(1210, 230, "#ffe2a0")}
    ${circle(1210, 230, 96, "#ffe2a0", 'opacity=".92"')}
    ${ridge([[0, 560], [280, 380], [520, 520], [820, 360], [1120, 500], [1600, 420]], "#a44f32")}
    ${ridge([[0, 690], [340, 540], [700, 650], [1060, 520], [1600, 610]], "#7e3a2a")}
    ${brick(180, 600, 150, 110, "#b35b36", 3)}
    ${brick(1380, 570, 170, 120, "#b35b36", 3)}
    ${tallneck(880, 780, 0.95, "#a8a098")}
    ${path(`M 0 830 Q 500 780 1000 820 T 1600 800 L 1600 900 L 0 900 Z`, "#63312a")}
    ${grassTufts("#a06a3a", 34, 41)}
    ${minifig(450, 810, 1.5, { torso: "#3f7fa6", hair: "#b5472f", bow: true })}
    ${rect(0, 0, W, H, "url(#haze)", 0, 'pointer-events="none"')}
    `
  );

scenes["scene-7"] = () =>
  wrap(
    [
      [0, "#2e6b8a"],
      [0.5, "#90c6d8"],
      [1, "#f2d59a"],
    ],
    `
    ${sunRays(1300, 180, "#fff4cf")}
    ${circle(1300, 180, 80, "#fff4cf", 'opacity=".9"')}
    ${ridge([[0, 600], [400, 510], [820, 570], [1220, 490], [1600, 550]], "#6ba36b")}
    ${path(`M 0 790 Q 500 720 1000 780 T 1600 760 L 1600 900 L 0 900 Z`, "#4b8a55")}
    ${house(560, 760, 1.15, "#d8a45e", "#8c3b2f")}
    ${tree(180, 620, 1.25)}
    ${tree(1460, 640, 1.1)}
    ${brick(1040, 790, 120, 36, "#7a5a3c", 3)}
    ${brick(1180, 790, 120, 36, "#7a5a3c", 3)}
    ${brick(1040, 826, 120, 36, "#8a6a45", 3)}
    ${brick(1180, 826, 120, 36, "#6a8a45", 3)}
    ${minifig(430, 800, 2.0, { torso: "#3f7fa6", hair: "#a33a22" })}
    ${minifig(1000, 820, 1.9, { torso: "#7b4ea8", hair: "#e8c15a" })}
    ${rect(1140, 200, 360, 190, "rgba(12,26,38,.86)", 18, 'stroke="rgba(255,255,255,.18)" stroke-width="3"')}
    ${circle(1190, 250, 18, "#f2c14e")}
    ${circle(1244, 250, 18, "#7fe3ff")}
    ${circle(1298, 250, 18, "#c44536")}
    ${line(1170, 310, 1470, 310, "rgba(255,255,255,.2)", 3)}
    ${line(1170, 350, 1390, 350, "rgba(255,255,255,.12)", 3)}
    ${grassTufts("#7fb55f", 46, 53)}
    ${rect(0, 0, W, H, "url(#haze)", 0, 'pointer-events="none"')}
    `
  );

/* ------------------------------------------------------------------ cover */

const cover = () =>
  wrap(
    [
      [0, "#111a24"],
      [0.5, "#2a475e"],
      [1, "#c28644"],
    ],
    `
    ${sunRays(1080, 400, "#ffd9a0")}
    ${circle(1080, 400, 178, "#ffd9a0", 'opacity=".9"')}
    ${ridge([[0, 640], [400, 540], [900, 600], [1300, 500], [1600, 560]], "#2a4b4a")}
    ${ridge([[0, 770], [420, 680], [880, 750], [1300, 660], [1600, 720]], "#183b36")}
    ${tallneck(1240, 790, 1.1, "#8fa2aa")}
    ${tree(190, 660, 1.5)}
    ${path(`M 0 850 Q 500 800 1000 850 T 1600 830 L 1600 900 L 0 900 Z`, "#10282a")}
    ${rect(110, 130, 92, 92, "#c0392b", 12)}
    ${rect(138, 146, 18, 18, "#e86456", 8)}
    ${rect(170, 146, 18, 18, "#e86456", 8)}
    ${rect(138, 178, 18, 18, "#e86456", 8)}
    ${rect(170, 178, 18, 18, "#e86456", 8)}
    ${`<text x="230" y="200" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="800" letter-spacing="4" fill="#f4f6fa">LEGO®</text>`}
    ${`<text x="104" y="360" font-family="Arial Black, Impact, Arial, sans-serif" font-size="148" font-weight="900" letter-spacing="-3" fill="#f7f9fb" stroke="#0d1a1f" stroke-width="9" paint-order="stroke">HORIZON</text>`}
    ${`<text x="104" y="500" font-family="Arial Black, Impact, Arial, sans-serif" font-size="118" font-weight="900" letter-spacing="-2" fill="#f7f9fb" stroke="#0d1a1f" stroke-width="8" paint-order="stroke">ADVENTURES</text>`}
    ${`<text x="110" y="574" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" letter-spacing="9" fill="#66c0f4">A BRICK-BUILT FAN CONCEPT</text>`}
    ${`<text x="110" y="846" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="5" fill="#c7d5e0" opacity=".85">UNOFFICIAL · NOT FOR SALE</text>`}
    ${rect(0, 0, W, H, "url(#haze)", 0, 'pointer-events="none"')}
    `
  );

/* ------------------------------------------------------------------ icons */

const icon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2838"/><stop offset="1" stop-color="#101820"/></linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd47a"/><stop offset="1" stop-color="#e8733c"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <circle cx="256" cy="234" r="120" fill="url(#sun)" opacity=".95"/>
  <path d="M 60 350 Q 256 280 452 350 L 452 452 L 60 452 Z" fill="#2f7a55"/>
  <path d="M 60 392 Q 256 330 452 392 L 452 452 L 60 452 Z" fill="#1c4d3a"/>
  ${brick(176, 188, 160, 96, "#f2c14e", 2)}
  ${rect(176, 188, 160, 16, "#ffe08a", 0)}
</svg>
`;

const iconMaskable = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2838"/><stop offset="1" stop-color="#101820"/></linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd47a"/><stop offset="1" stop-color="#e8733c"/></linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="250" r="96" fill="url(#sun)" opacity=".95"/>
  <path d="M 90 340 Q 256 286 422 340 L 422 422 L 90 422 Z" fill="#2f7a55"/>
  <path d="M 90 374 Q 256 322 422 374 L 422 422 L 90 422 Z" fill="#1c4d3a"/>
  ${brick(196, 206, 120, 76, "#f2c14e", 2)}
</svg>
`;

/* ------------------------------------------------------------------- write */

await mkdir(screens, { recursive: true });
await mkdir(join(here, "icons"), { recursive: true });

for (const [name, make] of Object.entries(scenes)) {
  await writeFile(join(screens, `${name}.svg`), make(), "utf8");
  console.log(`ok  screens/${name}.svg`);
}
await writeFile(join(screens, "cover.svg"), cover(), "utf8");
console.log("ok  screens/cover.svg");

await writeFile(join(here, "icons", "icon.svg"), icon(), "utf8");
console.log("ok  icons/icon.svg");
await writeFile(join(here, "icons", "icon-maskable.svg"), iconMaskable(), "utf8");
console.log("ok  icons/icon-maskable.svg");
