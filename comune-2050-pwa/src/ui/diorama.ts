import { axisScores } from "../game/engine";
import type { ComuneData, Metrics } from "../data/types";

/*
 * A paper-theatre diorama, not a map. Every layer is drawn from the same
 * real indicators the game uses: trees grow with soil and air, the tram
 * arrives with soft mobility, panels with services, people with the
 * people-and-work axis.
 */
export interface DioramaOptions {
  year?: number;
  compact?: boolean;
  uid?: string;
  label?: string;
}

const WALLS = ["#f4ead6", "#eadcc3", "#f0e2cc", "#e3d0b1", "#f7efe1"];
const ROOFS = ["var(--roof)", "var(--accent)", "#8a5a44", "#6f7f62", "#a86a4a"];

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shadow(rx = 30, x = 0, y = 4): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${Math.max(4, rx * 0.16)}" fill="#2d2118" opacity=".14"/>`;
}

function windows(count: number, width: number, top: number): string {
  const gap = width / (count + 1);
  let out = "";
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < count; col += 1) {
      out += `<rect x="${-width / 2 + gap * (col + 1) - 3.2}" y="${top + row * 12}" width="6.4" height="7" rx="1" fill="#33404a" opacity=".72"/>`;
    }
  }
  return out;
}

function house(
  wall: string,
  roof: string,
  width = 48,
  height = 56,
  floors = 2
): string {
  const half = width / 2;
  return [
    shadow(width * 0.62),
    `<rect x="${-half}" y="${-height}" width="${width}" height="${height}" rx="2.5" fill="${wall}"/>`,
    `<polygon points="${-half},${-height} 0,${-height - 20} ${half},${-height}" fill="${roof}"/>`,
    `<polygon points="${half},${-height} ${half + 8},${-height + 5} ${half + 8},${2} ${half},${0}" fill="#2d2118" opacity=".18"/>`,
    `<rect x="${-half + 4}" y="${-height + 5}" width="${width - 8}" height="2" fill="#fff" opacity=".18"/>`,
    windows(floors, width, -height + 12),
    `<rect x="${-3}" y="-12" width="6" height="12" rx="1" fill="#7c5c43"/>`
  ].join("");
}

function palazzo(wall: string, roof: string): string {
  return [
    shadow(48),
    `<rect x="-42" y="-58" width="84" height="58" rx="3" fill="${wall}"/>`,
    `<polygon points="-46,-58 0,-76 46,-58" fill="${roof}"/>`,
    `<polygon points="42,-58 50,-53 50,2 42,0" fill="#2d2118" opacity=".18"/>`,
    `<rect x="-8" y="-40" width="16" height="16" rx="8" fill="#d9a441" opacity=".85"/>`,
    `<path d="M-34 0 L-34 -28 Q-22 -38 -10 -28 L-10 0 Z" fill="#33404a" opacity=".68"/>`,
    `<path d="M-4 0 L-4 -28 Q8 -38 20 -28 L20 0 Z" fill="#33404a" opacity=".68"/>`,
    `<path d="M26 0 L26 -28 Q38 -38 44 -28 L44 0 Z" fill="#33404a" opacity=".68"/>`,
    `<rect x="-42" y="-58" width="84" height="2" fill="#fff" opacity=".18"/>`
  ].join("");
}

function church(wall: string, roof: string): string {
  return [
    shadow(48),
    `<rect x="-34" y="-52" width="68" height="52" rx="2" fill="${wall}"/>`,
    `<polygon points="-38,-52 0,-72 38,-52" fill="${roof}"/>`,
    `<rect x="24" y="-92" width="20" height="92" rx="2" fill="${WALLS[1]}"/>`,
    `<polygon points="22,-92 34,-106 46,-92" fill="${roof}"/>`,
    `<rect x="30" y="-110" width="3" height="12" fill="#6a4b36"/>`,
    `<rect x="27" y="-104" width="9" height="3" fill="#6a4b36"/>`,
    `<circle cx="34" cy="-72" r="5" fill="#f4ead6"/>`,
    `<path d="M-12 0 L-12 -28 Q0 -38 12 -28 L12 0 Z" fill="#33404a" opacity=".7"/>`,
    `<circle cx="0" cy="-56" r="6" fill="#d9a441" opacity=".85"/>`
  ].join("");
}

function school(wall: string, roof: string, flag: boolean): string {
  return [
    shadow(40),
    `<rect x="-38" y="-44" width="76" height="44" rx="2" fill="${wall}"/>`,
    `<rect x="-42" y="-48" width="84" height="5" rx="2" fill="${roof}"/>`,
    windows(4, 64, -34),
    `<rect x="-8" y="-22" width="16" height="22" rx="1" fill="#7c5c43"/>`,
    flag
      ? `<rect x="30" y="-68" width="2" height="24" fill="#6a4b36"/><polygon points="32,-68 48,-63 32,-58" fill="var(--accent)"/>`
      : ""
  ].join("");
}

function station(wall: string, roof: string): string {
  return [
    shadow(48),
    `<rect x="-44" y="-38" width="88" height="38" rx="2" fill="${wall}"/>`,
    `<rect x="-52" y="-44" width="104" height="7" rx="3" fill="${roof}"/>`,
    `<rect x="-30" y="-26" width="26" height="20" fill="#33404a" opacity=".7"/>`,
    `<rect x="6" y="-26" width="26" height="20" fill="#33404a" opacity=".7"/>`,
    `<rect x="-8" y="-18" width="16" height="18" fill="#7c5c43"/>`,
    `<rect x="-58" y="-2" width="116" height="3" fill="#6a4b36" opacity=".6"/>`,
    `<rect x="-34" y="-56" width="2" height="12" fill="#6a4b36"/><circle cx="-33" cy="-57" r="3" fill="#d9a441"/>`
  ].join("");
}

function tower(wall: string, roof: string, flags: boolean): string {
  return [
    shadow(28),
    `<rect x="-20" y="-86" width="40" height="86" rx="2" fill="${wall}"/>`,
    `<polygon points="-24,-86 0,-102 24,-86" fill="${roof}"/>`,
    `<rect x="-24" y="-88" width="48" height="4" fill="#2d2118" opacity=".18"/>`,
    `<circle cx="0" cy="-62" r="7" fill="#33404a" opacity=".65"/>`,
    `<rect x="-10" y="-36" width="20" height="36" fill="#7c5c43" opacity=".8"/>`,
    flags
      ? `<rect x="18" y="-92" width="2" height="22" fill="#6a4b36"/><polygon points="20,-92 38,-87 20,-82" fill="var(--accent)"/>`
      : ""
  ].join("");
}

function market(wall: string): string {
  return [
    shadow(36),
    `<rect x="-30" y="-4" width="60" height="4" fill="${wall}" opacity=".8"/>`,
    `<rect x="-34" y="-32" width="4" height="28" fill="#7c5c43"/>`,
    `<rect x="30" y="-32" width="4" height="28" fill="#7c5c43"/>`,
    `<polygon points="-40,-32 0,-46 40,-32" fill="var(--accent)" opacity=".85"/>`,
    `<circle cx="-12" cy="-18" r="4" fill="#d9a441"/><circle cx="0" cy="-18" r="4" fill="#7d9b76"/><circle cx="12" cy="-18" r="4" fill="#c65d3b"/>`
  ].join("");
}

function tree(x: number, y: number, scale: number, round = false): string {
  if (round) {
    return `<g transform="translate(${x} ${y}) scale(${scale})"><rect x="-2" y="-16" width="4" height="16" fill="#6a4b36"/><circle cx="0" cy="-25" r="15" fill="#6f8f62"/><circle cx="-8" cy="-20" r="10" fill="#7d9b76"/><circle cx="8" cy="-20" r="9" fill="#5f7d55"/></g>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${scale})"><rect x="-2" y="-16" width="4" height="16" fill="#6a4b36"/><polygon points="0,-50 -15,-16 15,-16" fill="#5f7d55"/><polygon points="0,-38 -18,-6 18,-6" fill="#6f8f62"/><polygon points="0,-48 -9,-24 9,-24" fill="#7d9b76" opacity=".6"/></g>`;
}

function person(x: number, y: number, color: string, scale = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><circle cx="0" cy="-15" r="3.6" fill="#e8c9a5"/><path d="M-4 0 L-2 -12 L2 -12 L4 0 Z" fill="${color}"/></g>`;
}

function car(x: number, y: number, color: string): string {
  return `<g transform="translate(${x} ${y})"><rect x="-13" y="-9" width="26" height="9" rx="3" fill="${color}"/><rect x="-8" y="-14" width="14" height="7" rx="3" fill="${color}" opacity=".8"/><circle cx="-7" cy="0" r="3" fill="#2d2118"/><circle cx="7" cy="0" r="3" fill="#2d2118"/></g>`;
}

function tram(x: number, y: number, color: string): string {
  return `<g transform="translate(${x} ${y})"><rect x="-46" y="-24" width="92" height="24" rx="6" fill="${color}"/><rect x="-38" y="-19" width="18" height="12" rx="2" fill="#f4ead6" opacity=".8"/><rect x="-14" y="-19" width="18" height="12" rx="2" fill="#f4ead6" opacity=".8"/><rect x="10" y="-19" width="18" height="12" rx="2" fill="#f4ead6" opacity=".8"/><rect x="-4" y="-30" width="2" height="8" fill="#6a4b36"/><path d="M-14 -30 L-4 -34 L6 -30" stroke="#6a4b36" stroke-width="2" fill="none"/><circle cx="-30" cy="2" r="4" fill="#2d2118"/><circle cx="30" cy="2" r="4" fill="#2d2118"/></g>`;
}

function panels(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})"><polygon points="-16,-4 0,-12 16,-4 0,4" fill="#4d6b8a"/><path d="M-8 -8 L8 -8 M-4 -6 L4 -6" stroke="#f4ead6" stroke-width=".8" opacity=".6"/><rect x="-1" y="2" width="2" height="7" fill="#6a4b36"/></g>`;
}

function crane(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})" opacity=".9"><rect x="-2" y="-78" width="4" height="78" fill="#8a6a4f"/><rect x="-30" y="-80" width="70" height="4" fill="#8a6a4f"/><rect x="30" y="-88" width="10" height="12" fill="#8a6a4f"/><path d="M32 -100 L32 -80" stroke="#6a4b36" stroke-width="1.5"/><rect x="-8" y="-80" width="16" height="8" fill="#6a4b36" opacity=".5"/></g>`;
}


function landmark(comune: ComuneData): string {
  const ink = `fill="var(--ink)" opacity=".26"`;
  switch (comune.identity.istat) {
    case "034014":
      return `<g transform="translate(730 414) scale(.95)">
        <rect x="-32" y="-48" width="64" height="48" ${ink}/>
        <path d="M-36 -48 Q0 -74 36 -48 Z" ${ink}/>
        <rect x="24" y="-82" width="16" height="82" ${ink}/>
        <polygon points="22,-82 32,-98 42,-82" ${ink}/>
        <rect x="-6" y="-70" width="12" height="12" fill="var(--paper)" opacity=".4"/>
      </g>`;
    case "100005":
      return `<g transform="translate(730 414) scale(.95)">
        <rect x="-52" y="-38" width="104" height="38" ${ink}/>
        <rect x="18" y="-112" width="18" height="112" ${ink}/>
        <rect x="14" y="-118" width="26" height="8" ${ink}/>
        <path d="M26 -124 Q10 -140 28 -154 Q46 -168 28 -182" stroke="var(--ink)" stroke-width="7" fill="none" opacity=".13"/>
        <rect x="-40" y="-52" width="22" height="14" ${ink}/>
        <rect x="-10" y="-52" width="22" height="14" ${ink}/>
      </g>`;
    case "075035":
      return `<g transform="translate(730 414) scale(.95)">
        <rect x="-46" y="-50" width="92" height="50" ${ink}/>
        <path d="M-50 -50 Q-36 -70 -18 -58 Q0 -76 18 -58 Q36 -70 50 -50 Z" ${ink}/>
        <rect x="-40" y="-40" width="8" height="40" fill="var(--paper)" opacity=".35"/>
        <rect x="-12" y="-40" width="8" height="40" fill="var(--paper)" opacity=".35"/>
        <rect x="16" y="-40" width="8" height="40" fill="var(--paper)" opacity=".35"/>
        <circle cx="0" cy="-28" r="6" fill="var(--paper)" opacity=".4"/>
      </g>`;
    case "066049":
      return `<g transform="translate(730 414) scale(.95)">
        <path d="M-80 0 L-52 -34 L-38 -26 L-6 -70 L20 -36 L40 -52 L80 0 Z" ${ink}/>
        <rect x="-4" y="-98" width="22" height="38" ${ink}/>
        <polygon points="-8,-98 7,-112 22,-98" ${ink}/>
        <rect x="-14" y="-78" width="42" height="10" ${ink}/>
      </g>`;
    case "118006":
      return `<g transform="translate(730 414) scale(.95)">
        <rect x="-16" y="-96" width="32" height="96" ${ink}/>
        <rect x="-24" y="-108" width="48" height="14" ${ink}/>
        <rect x="-12" y="-122" width="24" height="15" ${ink}/>
        <polygon points="-12,-122 0,-136 12,-122" ${ink}/>
        <path d="M-18 -112 L-90 -126 M18 -112 L90 -126" stroke="var(--ink)" stroke-width="5" opacity=".12"/>
      </g>`;
    case "022205":
      return `<g transform="translate(730 414) scale(.95)">
        <rect x="-54" y="-44" width="108" height="44" ${ink}/>
        <rect x="-58" y="-54" width="116" height="12" ${ink}/>
        <rect x="-28" y="-94" width="24" height="52" ${ink}/>
        <polygon points="-32,-94 -16,-110 0,-94" ${ink}/>
        <rect x="22" y="-72" width="24" height="30" ${ink}/>
        <path d="M-120 -86 Q-30 -122 80 -78" stroke="var(--ink)" stroke-width="2" fill="none" opacity=".14"/>
        <rect x="-84" y="-92" width="14" height="8" ${ink}/>
      </g>`;
    default:
      return "";
  }
}

export function renderDiorama(
  comune: ComuneData,
  metrics: Metrics,
  options: DioramaOptions = {}
): string {
  const year = options.year ?? 2026;
  const compact = options.compact ?? false;
  const uid = options.uid ?? `d-${comune.identity.istat}-${year}`;
  const axes = axisScores(metrics);
  const palette = comune.palette;
  const label = options.label ?? `Diorama di ${comune.identity.name} nel ${year}`;

  const treeScore = (metrics.suolo + metrics.aria) / 2;
  const treeCount = 3 + Math.round((treeScore / 100) * (compact ? 6 : 10));
  const peopleCount = 4 + Math.round((axes.persone / 100) * (compact ? 7 : 12));
  const tramOn = axes.mobilita >= 55;
  const panelsOn = axes.servizi >= 55 || metrics.digitale >= 80;
  const craneOn = axes.abitare >= 62;
  const smog = metrics.aria < 45;
  const tourists = metrics.turismo >= 55;
  const marketOn = metrics.comunita >= 55;
  const flagOn = metrics.scuola >= 45;
  const antennaOn = metrics.digitale >= 75;
  const bikes = metrics.incidenti >= 55 && axes.mobilita >= 50;
  const extraHouses = axes.abitare >= 60 ? 2 : 0;
  const cars = Math.max(0, 4 - Math.round((axes.mobilita / 100) * 4));

  const peopleColors = ["#c65d3b", "#7d9b76", "#d9a441", "#4d6b8a", "#8a6a4f"];
  const people = Array.from({ length: peopleCount }, (_, index) => {
    const x = 70 + ((index * 67) % 760);
    const y = 505 + ((index * 13) % 26);
    return person(x, y, peopleColors[index % peopleColors.length], 0.9 + (index % 3) * 0.12);
  }).join("");

  const trees = Array.from({ length: treeCount }, (_, index) => {
    const x = 55 + ((index * 83) % 800);
    const y = 470 + ((index * 17) % 42);
    return tree(x, y, 0.7 + (index % 3) * 0.16, index % 3 === 0);
  }).join("");

  const carsMarkup = Array.from({ length: cars }, (_, index) => {
    const x = 120 + ((index * 147) % 650);
    const y = 535 + (index % 2) * 8;
    return car(x, y, index % 2 === 0 ? "#c65d3b" : "#4d6b8a");
  }).join("");

  const fields = [
    `<polygon points="40,470 170,452 230,492 100,512" fill="var(--accent)" opacity=".22"/>`,
    `<polygon points="60,482 150,468 200,496 110,510" fill="var(--ground)" opacity=".55"/>`,
    `<polygon points="690,460 840,442 860,486 720,504" fill="var(--accent)" opacity=".18"/>`,
    `<polygon points="710,472 820,458 838,488 730,500" fill="var(--ground)" opacity=".5"/>`
  ].join("");

  const cloud = (x: number, y: number, scale: number): string =>
    `<g transform="translate(${x} ${y}) scale(${scale})" opacity=".65"><ellipse cx="0" cy="0" rx="36" ry="13" fill="#fff"/><ellipse cx="-22" cy="-6" rx="22" ry="12" fill="#fff"/><ellipse cx="18" cy="-7" rx="25" ry="14" fill="#fff"/></g>`;

  const antenna = antennaOn
    ? `<g transform="translate(742 407)"><rect x="-1" y="-54" width="2" height="54" fill="#6a4b36"/><path d="M-10 -54 Q0 -64 10 -54" stroke="#6a4b36" stroke-width="1.5" fill="none"/><path d="M-16 -60 Q0 -74 16 -60" stroke="#6a4b36" stroke-width="1" fill="none" opacity=".6"/></g>`
    : "";

  const bikeLane = bikes
    ? `<path d="M70 548 C 250 532, 650 532, 830 548" stroke="#7d9b76" stroke-width="5" stroke-dasharray="10 8" fill="none" opacity=".9"/>`
    : "";

  const smogLayer = smog
    ? `<g opacity=".22"><ellipse cx="260" cy="360" rx="90" ry="24" fill="#5b6670"/><ellipse cx="540" cy="340" rx="120" ry="28" fill="#5b6670"/><ellipse cx="730" cy="382" rx="76" ry="20" fill="#5b6670"/></g>`
    : "";

  const river = `<path d="M 520 402 C 470 438, 560 460, 520 490 C 486 516, 548 540, 600 570 L 690 570 C 620 540, 566 518, 606 490 C 650 460, 570 430, 590 402 Z" fill="var(--water)" opacity=".8"/><path d="M 540 410 C 500 438, 574 460, 540 488" stroke="#f4ead6" stroke-width="2" fill="none" opacity=".35"/>`;

  return `<svg class="diorama-svg${compact ? " is-compact" : ""}" viewBox="0 0 900 600" role="img" aria-label="${esc(label)}" style="--sky:${palette.sky};--ground:${palette.ground};--accent:${palette.accent};--roof:${palette.roof};--water:${palette.water}">
  <title>${esc(label)}</title>
  <defs>
    <linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--sky)"/>
      <stop offset=".72" stop-color="#f7efe0"/>
      <stop offset="1" stop-color="#f4ead6"/>
    </linearGradient>
    <radialGradient id="sun-${uid}">
      <stop offset="0" stop-color="#f6c35c" stop-opacity=".95"/>
      <stop offset="1" stop-color="#f6c35c" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grain-${uid}" width="7" height="7" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r=".55" fill="#2d2118" opacity=".08"/>
      <circle cx="4.5" cy="3.5" r=".4" fill="#2d2118" opacity=".05"/>
    </pattern>
  </defs>
  <rect width="900" height="600" fill="url(#sky-${uid})"/>
  <circle cx="720" cy="120" r="104" fill="url(#sun-${uid})"/>
  <circle cx="720" cy="120" r="50" fill="#f6c35c" opacity=".9"/>
  ${cloud(150, 118, 1)}
  ${cloud(380, 86, 0.8)}
  ${cloud(780, 196, 0.7)}
  <path d="M0 330 L120 258 L210 310 L330 235 L450 315 L570 250 L690 310 L810 245 L900 300 L900 430 L0 430 Z" fill="var(--ground)" opacity=".35"/>
  <path d="M0 370 L90 315 L190 360 L300 300 L420 370 L530 315 L660 365 L780 310 L900 360 L900 460 L0 460 Z" fill="var(--ground)" opacity=".55"/>
  <path d="M40 430 C 180 385, 340 405, 450 400 C 600 392, 740 380, 860 430 L860 540 C 730 590, 600 570, 450 575 C 300 580, 170 595, 40 540 Z" fill="var(--ground)"/>
  <path d="M40 430 C 180 385, 340 405, 450 400 C 600 392, 740 380, 860 430 L860 452 C 730 500, 600 480, 450 485 C 300 490, 170 505, 40 460 Z" fill="#fff" opacity=".16"/>
  <path d="M40 540 C 170 595, 300 580, 450 575 C 600 570, 730 590, 860 540 L860 570 C 730 610, 600 596, 450 598 C 300 600, 160 612, 40 570 Z" fill="#2d2118" opacity=".12"/>
  ${fields}
  ${river}
  <g class="diorama-back">
    <g transform="translate(112 414) scale(.82)">${church(WALLS[0], ROOFS[0])}</g>
    <g transform="translate(240 410) scale(.78)">${palazzo(WALLS[1], ROOFS[2])}</g>
    <g transform="translate(352 410) scale(.72)">${house(WALLS[2], ROOFS[3], 44, 50, 2)}</g>
    <g transform="translate(474 408) scale(.82)">${school(WALLS[3], ROOFS[3], flagOn)}</g>
    <g transform="translate(610 410) scale(.78)">${tower(WALLS[0], ROOFS[1], tourists)}</g>
    ${landmark(comune)}
  </g>
  <g class="diorama-mid">
    <g transform="translate(96 474) scale(1)">${house(WALLS[2], ROOFS[0], 50, 58, 2)}</g>
    <g transform="translate(190 470) scale(.96)">${house(WALLS[0], ROOFS[1], 48, 54, 2)}</g>
    <g transform="translate(304 470) scale(1)">${station(WALLS[0], ROOFS[2])}</g>
    <g transform="translate(420 472) scale(1)">${house(WALLS[4], ROOFS[3], 52, 60, 3)}</g>
    ${marketOn ? `<g transform="translate(534 474) scale(1)">${market(WALLS[2])}</g>` : `<g transform="translate(534 474) scale(1)">${house(WALLS[1], ROOFS[4], 48, 56, 2)}</g>`}
    <g transform="translate(650 472) scale(1.02)">${house(WALLS[0], ROOFS[2], 50, 58, 2)}</g>
    <g transform="translate(766 472) scale(.96)">${palazzo(WALLS[2], ROOFS[1])}</g>
    ${extraHouses ? `<g transform="translate(880 470) scale(.8)">${house(WALLS[2], ROOFS[3], 44, 50, 2)}</g>` : ""}
  </g>
  ${panelsOn ? panels(160, 416) + panels(646, 414) + panels(770, 414) : ""}
  ${craneOn ? crane(856, 472) : ""}
  ${antenna}
  <g class="diorama-front">
    ${trees}
    ${tramOn ? `<path d="M60 500 C 240 486, 650 486, 850 500" stroke="#6a4b36" stroke-width="3" fill="none" opacity=".45"/>${tram(500, 502, "var(--accent)")}` : ""}
    ${carsMarkup}
    ${people}
    ${bikeLane}
  </g>
  ${smogLayer}
  ${tourists ? `<g opacity=".9"><path d="M104 418 L104 388" stroke="#6a4b36" stroke-width="2"/><polygon points="105,388 122,394 105,400" fill="var(--accent)"/></g>` : ""}
  <rect width="900" height="600" fill="url(#grain-${uid})" pointer-events="none"/>
  <path d="M40 430 C 180 385, 340 405, 450 400 C 600 392, 740 380, 860 430" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/>
  <path d="M40 540 C 170 595, 300 580, 450 575 C 600 570, 730 590, 860 540" stroke="#2d2118" stroke-width="2" fill="none" opacity=".12"/>
</svg>`;
}
