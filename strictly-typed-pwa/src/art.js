/*
 * All illustrations are inline SVG. No binary art, no CDN, no loading state.
 * The visual language: cosmic bureaucracy, flat ink, one eccentric light.
 */

const INK = "#0b0716";
const PANEL = "#151026";
const AMBER = "#ffb84d";
const MINT = "#7ef0c8";
const VIOLET = "#b79bff";
const CORAL = "#ff7166";
const BLUE = "#9bd8ff";
const GOLD = "#f6d78a";
const PAPER = "#f4ecd9";

const starField = (accent = PAPER) =>
  [
    [34, 28, 1.3, 0],
    [92, 14, 0.8, 0.8],
    [148, 42, 1, 1.6],
    [212, 22, 0.7, 0.4],
    [286, 34, 1.2, 1.1],
    [356, 18, 0.8, 0.3],
    [415, 48, 0.9, 1.4],
    [486, 24, 1.1, 0.6],
    [548, 40, 0.7, 1.2],
    [608, 20, 1, 0.2],
    [62, 148, 0.8, 1.8],
    [132, 184, 1, 0.9],
    [238, 158, 0.7, 1.3],
    [332, 192, 0.9, 0.5],
    [462, 166, 0.7, 1.1],
    [554, 190, 1, 0.7],
    [602, 138, 0.8, 1.5],
    [188, 92, 0.6, 1.7],
    [524, 92, 0.6, 0.25]
  ]
    .map(
      ([x, y, r, delay]) =>
        `<circle class="twinkle" cx="${x}" cy="${y}" r="${r}" fill="${accent}" opacity=".55" style="animation-delay:${delay}s"/>`
    )
    .join("");

function frame(inner, accent = AMBER) {
  return `<svg class="chapter-art-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="640" height="220" fill="${INK}"/>
    <circle cx="568" cy="30" r="110" fill="${accent}" opacity=".055"/>
    <circle cx="70" cy="190" r="90" fill="${accent}" opacity=".04"/>
    ${starField(accent)}
    ${inner}
    <rect x="0" y="0" width="640" height="220" fill="none" stroke="${accent}" stroke-opacity=".14"/>
  </svg>`;
}

export function chapterArt(key) {
  switch (key) {
    case "void":
      return frame(
        `
        <ellipse cx="474" cy="108" rx="86" ry="70" fill="${INK}" stroke="${MINT}" stroke-opacity=".25" stroke-dasharray="3 8"/>
        <circle cx="474" cy="108" r="47" fill="#05040a"/>
        <circle cx="474" cy="108" r="47" fill="none" stroke="${AMBER}" stroke-opacity=".25"/>
        <circle cx="459" cy="94" r="3" fill="${AMBER}" opacity=".9"/>
        <circle cx="488" cy="121" r="1.6" fill="${MINT}" opacity=".8"/>
        <path d="M124 92 L216 74 L216 174 L124 162 Z" fill="${PANEL}" stroke="${PAPER}" stroke-opacity=".22"/>
        <rect x="124" y="92" width="92" height="82" fill="${AMBER}" opacity=".03"/>
        <rect x="138" y="106" width="54" height="4" rx="2" fill="${AMBER}" opacity=".8"/>
        <rect x="138" y="118" width="38" height="3" rx="1.5" fill="${MINT}" opacity=".55"/>
        <rect x="138" y="128" width="48" height="3" rx="1.5" fill="${PAPER}" opacity=".22"/>
        <rect x="138" y="138" width="30" height="3" rx="1.5" fill="${MINT}" opacity=".4"/>
        <circle cx="142" cy="160" r="2.4" fill="${CORAL}" opacity=".7"/>
        <path d="M216 116 L356 76 L428 108 L356 142 Z" fill="${AMBER}" opacity=".08"/>
        <path d="M118 178 L122 184 L128 178" stroke="${MINT}" stroke-opacity=".7" fill="none"/>
        <rect x="286" y="152" width="42" height="2" rx="1" fill="${PAPER}" opacity=".2"/>
        <rect x="338" y="160" width="18" height="2" rx="1" fill="${AMBER}" opacity=".35"/>
        <path d="M548 152 l8 8 -8 8 -8 -8 z" fill="none" stroke="${AMBER}" stroke-opacity=".6"/>
        <text x="358" y="200" font-family="ui-monospace, monospace" font-size="9" fill="${MINT}" opacity=".55" letter-spacing="2">PROCEDURE IN PROGRESS</text>
        `,
        AMBER
      );
    case "house":
      return frame(
        `
        <circle cx="530" cy="58" r="34" fill="${MINT}" opacity=".1"/>
        <circle cx="530" cy="58" r="24" fill="${MINT}" opacity=".18"/>
        <path d="M214 188 L214 92 L320 42 L426 92 L426 188 Z" fill="${PANEL}" stroke="${PAPER}" stroke-opacity=".28"/>
        <path d="M196 96 L320 34 L444 96" fill="none" stroke="${MINT}" stroke-opacity=".55" stroke-width="2"/>
        <path d="M320 42 L320 188" stroke="${PAPER}" stroke-opacity=".08"/>
        <rect x="248" y="112" width="28" height="22" fill="${AMBER}" opacity=".7"/>
        <rect x="292" y="112" width="28" height="22" fill="${MINT}" opacity=".3"/>
        <rect x="336" y="112" width="28" height="22" fill="${PANEL}" stroke="${PAPER}" stroke-opacity=".2"/>
        <rect x="380" y="112" width="24" height="22" fill="${AMBER}" opacity=".3"/>
        <rect x="248" y="152" width="28" height="22" fill="${PANEL}" stroke="${PAPER}" stroke-opacity=".16"/>
        <rect x="336" y="152" width="28" height="22" fill="${MINT}" opacity=".55"/>
        <rect x="380" y="152" width="24" height="22" fill="${PANEL}" stroke="${PAPER}" stroke-opacity=".16"/>
        <path d="M296 188 L296 160 Q310 148 324 160 L324 188 Z" fill="${AMBER}" opacity=".78"/>
        <path d="M310 156 L310 136" stroke="${AMBER}" stroke-width="2"/>
        <circle cx="310" cy="132" r="4" fill="${AMBER}"/>
        <path d="M156 188 Q210 176 240 188 T330 188 T430 188 T494 188" fill="none" stroke="${PAPER}" stroke-opacity=".14"/>
        <rect x="138" y="118" width="3" height="70" fill="${PAPER}" opacity=".18"/>
        <circle cx="139" cy="114" r="5" fill="${AMBER}" opacity=".8"/>
        <circle cx="139" cy="114" r="12" fill="${AMBER}" opacity=".08"/>
        <text x="458" y="200" font-family="ui-monospace, monospace" font-size="9" fill="${MINT}" opacity=".5" letter-spacing="2">EVERY ROOM HAS AN END</text>
        `,
        MINT
      );
    case "package":
      return frame(
        `
        <path d="M320 20 L458 88 L458 174 L320 208 L182 174 L182 88 Z" fill="${PANEL}" stroke="${VIOLET}" stroke-opacity=".32"/>
        <path d="M182 88 L320 116 L458 88" fill="none" stroke="${VIOLET}" stroke-opacity=".25"/>
        <path d="M320 116 L320 208" stroke="${VIOLET}" stroke-opacity=".18"/>
        <rect x="296" y="142" width="48" height="66" rx="24 24 2 2" fill="${VIOLET}" opacity=".22" stroke="${VIOLET}" stroke-opacity=".6"/>
        <circle cx="338" cy="178" r="2.4" fill="${AMBER}"/>
        <rect x="238" y="104" width="38" height="3" rx="1.5" fill="${MINT}" opacity=".5"/>
        <rect x="238" y="114" width="24" height="3" rx="1.5" fill="${PAPER}" opacity=".22"/>
        <path d="M492 52 L548 52 L548 96 L492 96 Z" fill="${INK}" stroke="${VIOLET}" stroke-opacity=".5"/>
        <path d="M500 64 L536 64 M500 74 L524 74 M500 84 L532 84" stroke="${VIOLET}" stroke-opacity=".65" stroke-width="2"/>
        <path d="M492 74 L468 90" stroke="${VIOLET}" stroke-opacity=".35" stroke-dasharray="2 4"/>
        <circle cx="468" cy="90" r="3" fill="${AMBER}"/>
        <ellipse cx="320" cy="112" rx="152" ry="44" fill="none" stroke="${VIOLET}" stroke-opacity=".12"/>
        <text x="470" y="120" font-family="ui-monospace, monospace" font-size="9" fill="${VIOLET}" opacity=".55" letter-spacing="2">SPEC / BODY</text>
        <text x="184" y="200" font-family="ui-monospace, monospace" font-size="9" fill="${MINT}" opacity=".45" letter-spacing="2">KNOCK ON THE FACE</text>
        `,
        VIOLET
      );
    case "heap":
      return frame(
        `
        <path d="M0 68 Q64 34 128 66 T256 58 T386 70 T520 50 T640 66 L640 0 L0 0 Z" fill="${BLUE}" opacity=".06"/>
        <path d="M0 96 Q84 68 160 94 T318 88 T468 96 T640 78" fill="none" stroke="${BLUE}" stroke-opacity=".18"/>
        <path d="M0 220 L0 168 L96 142 L186 170 L268 148 L356 188 L448 152 L548 180 L640 150 L640 220 Z" fill="#0a0d16" stroke="${BLUE}" stroke-opacity=".12"/>
        <rect x="96" y="112" width="54" height="44" rx="4" fill="${PANEL}" stroke="${BLUE}" stroke-opacity=".28" transform="rotate(-7 123 134)"/>
        <rect x="408" y="108" width="62" height="50" rx="4" fill="${PANEL}" stroke="${BLUE}" stroke-opacity=".24" transform="rotate(6 439 133)"/>
        <path d="M276 64 q27 -18 54 0 v34 q0 12 -12 12 h-30 q-12 0 -12 -12 z" fill="${BLUE}" opacity=".12" stroke="${BLUE}" stroke-opacity=".4"/>
        <circle cx="292" cy="76" r="2.6" fill="${BLUE}" opacity=".9"/>
        <circle cx="314" cy="76" r="2.6" fill="${BLUE}" opacity=".9"/>
        <circle cx="303" cy="92" r="7" fill="none" stroke="${CORAL}" stroke-opacity=".8"/>
        <path d="M303 85 L303 99" stroke="${CORAL}" stroke-opacity=".8"/>
        <path d="M176 92 q40 -26 80 0 v26 q0 10 -10 10 h-60 q-10 0 -10 -10 z" fill="${MINT}" opacity=".06" stroke="${MINT}" stroke-opacity=".25"/>
        <circle cx="202" cy="102" r="2" fill="${MINT}" opacity=".7"/>
        <circle cx="228" cy="102" r="2" fill="${MINT}" opacity=".7"/>
        <path d="M446 80 L558 112" stroke="${CORAL}" stroke-opacity=".45" stroke-dasharray="3 6"/>
        <circle cx="558" cy="112" r="4" fill="${CORAL}" opacity=".7"/>
        <text x="184" y="60" font-family="ui-monospace, monospace" font-size="9" fill="${BLUE}" opacity=".55" letter-spacing="2">0x0000 : ADDRESS UNKNOWN</text>
        `,
        BLUE
      );
    case "root":
    default:
      return frame(
        `
        <circle cx="320" cy="82" r="100" fill="${GOLD}" opacity=".05"/>
        <circle cx="320" cy="82" r="58" fill="${GOLD}" opacity=".08"/>
        <path d="M0 202 L160 112 L266 150 L320 94 L392 156 L488 118 L640 204 L640 220 L0 220 Z" fill="${PANEL}" stroke="${GOLD}" stroke-opacity=".18"/>
        <path d="M320 204 L320 72" stroke="${GOLD}" stroke-width="2" opacity=".55"/>
        <path d="M320 150 Q270 132 256 96 M320 134 Q372 118 390 88 M320 174 Q244 164 208 136 M320 168 Q396 154 438 124" fill="none" stroke="${GOLD}" stroke-opacity=".25"/>
        <circle cx="320" cy="72" r="6" fill="${GOLD}"/>
        <circle cx="320" cy="72" r="20" fill="none" stroke="${GOLD}" stroke-opacity=".28" stroke-dasharray="2 5"/>
        <path d="M320 46 L338 64 L320 82 L302 64 Z" fill="none" stroke="${GOLD}" stroke-opacity=".8"/>
        <path d="M0 204 Q100 188 184 200 T360 198 T552 204 T640 200" fill="none" stroke="${GOLD}" stroke-opacity=".15"/>
        <rect x="474" y="58" width="86" height="2" rx="1" fill="${GOLD}" opacity=".25"/>
        <text x="474" y="48" font-family="ui-monospace, monospace" font-size="9" fill="${GOLD}" opacity=".6" letter-spacing="2">PRE =&gt; TRUE</text>
        <text x="474" y="80" font-family="ui-monospace, monospace" font-size="9" fill="${MINT}" opacity=".45" letter-spacing="2">POST =&gt; TRUE</text>
        <text x="180" y="48" font-family="ui-monospace, monospace" font-size="9" fill="${GOLD}" opacity=".5" letter-spacing="2">THE ROOT TYPE</text>
        `,
        GOLD
      );
  }
}

export function bossArt(key) {
  switch (key) {
    case "null":
      return `<svg class="boss-art-svg" viewBox="0 0 220 200" aria-hidden="true" focusable="false">
        <circle cx="110" cy="96" r="72" fill="${VIOLET}" opacity=".05"/>
        <circle cx="110" cy="96" r="58" fill="none" stroke="${VIOLET}" stroke-opacity=".45" stroke-dasharray="4 10"/>
        <path d="M72 68 L148 68 L148 128 L72 128 Z" fill="${PANEL}" stroke="${VIOLET}" stroke-opacity=".4"/>
        <path d="M72 96 L148 96" stroke="${VIOLET}" stroke-opacity=".25" stroke-dasharray="3 6"/>
        <path d="M84 82 L136 82 M84 110 L120 110" stroke="${PAPER}" stroke-opacity=".18" stroke-width="3"/>
        <circle cx="110" cy="96" r="6" fill="${INK}"/>
        <text x="102" y="75" font-family="ui-monospace, monospace" font-size="22" fill="${VIOLET}" opacity=".8">?</text>
        <path d="M46 164 L174 164" stroke="${VIOLET}" stroke-opacity=".18"/>
        <text x="72" y="184" font-family="ui-monospace, monospace" font-size="8" fill="${VIOLET}" opacity=".5" letter-spacing="2">NO BODY</text>
      </svg>`;
    case "constraint":
      return `<svg class="boss-art-svg" viewBox="0 0 220 200" aria-hidden="true" focusable="false">
        <circle cx="110" cy="100" r="76" fill="${CORAL}" opacity=".05"/>
        <path d="M62 172 L62 116 Q62 94 84 90 L136 90 Q158 94 158 116 L158 172 Z" fill="${PANEL}" stroke="${CORAL}" stroke-opacity=".4"/>
        <path d="M84 90 Q84 48 110 48 Q136 48 136 90" fill="${PANEL}" stroke="${CORAL}" stroke-opacity=".45"/>
        <circle cx="96" cy="64" r="2.4" fill="${CORAL}"/>
        <circle cx="124" cy="64" r="2.4" fill="${CORAL}"/>
        <path d="M100 78 Q110 84 120 78" fill="none" stroke="${CORAL}" stroke-opacity=".6"/>
        <path d="M84 112 L58 118 L22 118 M136 112 L162 118 L198 118" stroke="${CORAL}" stroke-opacity=".45"/>
        <path d="M28 104 L38 132 M192 104 L182 132" stroke="${AMBER}" stroke-opacity=".7" stroke-width="3"/>
        <path d="M38 118 Q110 104 182 118" fill="none" stroke="${AMBER}" stroke-opacity=".55" stroke-width="2"/>
        <path d="M110 98 L110 130 M96 114 L124 114" stroke="${PAPER}" stroke-opacity=".25"/>
        <text x="62" y="190" font-family="ui-monospace, monospace" font-size="8" fill="${CORAL}" opacity=".55" letter-spacing="2">RANGE 0 .. 100</text>
      </svg>`;
    case "randy":
      return `<svg class="boss-art-svg" viewBox="0 0 220 200" aria-hidden="true" focusable="false">
        <circle cx="110" cy="100" r="74" fill="${MINT}" opacity=".05"/>
        <path d="M62 150 Q38 120 60 92 Q62 54 102 58 Q134 32 154 64 Q190 76 174 112 Q192 150 150 158 Q126 186 94 164 Q64 176 62 150 Z" fill="${PANEL}" stroke="${MINT}" stroke-opacity=".4"/>
        <circle cx="88" cy="106" r="12" fill="${INK}" stroke="${MINT}" stroke-opacity=".6"/>
        <circle cx="94" cy="102" r="4" fill="${MINT}"/>
        <path d="M72 140 Q110 154 150 136" fill="none" stroke="${MINT}" stroke-opacity=".5" stroke-width="2"/>
        <path d="M134 94 q12 -14 24 0 q12 14 -2 24" fill="none" stroke="${CORAL}" stroke-opacity=".6"/>
        <text x="44" y="64" font-family="ui-monospace, monospace" font-size="13" fill="${MINT}" opacity=".55">0.0</text>
        <text x="150" y="48" font-family="ui-monospace, monospace" font-size="11" fill="${CORAL}" opacity=".55">NaN?</text>
        <text x="34" y="172" font-family="ui-monospace, monospace" font-size="8" fill="${MINT}" opacity=".5" letter-spacing="2">UNINITIALIZED</text>
        <path d="M164 168 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4 z" fill="${AMBER}" opacity=".4"/>
      </svg>`;
    case "segfault":
      return `<svg class="boss-art-svg" viewBox="0 0 220 200" aria-hidden="true" focusable="false">
        <circle cx="110" cy="104" r="74" fill="${BLUE}" opacity=".05"/>
        <path d="M72 158 L72 86 Q72 44 110 44 Q148 44 148 86 L148 158 Q138 148 128 158 Q118 168 110 158 Q102 168 92 158 Q82 148 72 158 Z" fill="${PANEL}" stroke="${BLUE}" stroke-opacity=".4"/>
        <circle cx="94" cy="88" r="5" fill="${INK}" stroke="${BLUE}" stroke-opacity=".7"/>
        <circle cx="126" cy="88" r="5" fill="${INK}" stroke="${BLUE}" stroke-opacity=".7"/>
        <path d="M102 116 Q110 108 118 116 Q110 124 102 116" fill="${CORAL}" opacity=".55"/>
        <circle cx="110" cy="132" r="14" fill="none" stroke="${BLUE}" stroke-opacity=".35" stroke-dasharray="2 4"/>
        <path d="M102 132 L118 132" stroke="${BLUE}" stroke-opacity=".45"/>
        <path d="M96 64 Q110 54 124 64" fill="none" stroke="${BLUE}" stroke-opacity=".25"/>
        <text x="58" y="188" font-family="ui-monospace, monospace" font-size="8" fill="${BLUE}" opacity=".55" letter-spacing="2">0x0000 SOMETHING</text>
        <circle cx="176" cy="58" r="2" fill="${BLUE}" opacity=".6"/>
      </svg>`;
    case "compiler":
    default:
      return `<svg class="boss-art-svg" viewBox="0 0 220 200" aria-hidden="true" focusable="false">
        <circle cx="110" cy="100" r="84" fill="${GOLD}" opacity=".06"/>
        <circle cx="110" cy="100" r="64" fill="none" stroke="${GOLD}" stroke-opacity=".22"/>
        <path d="M50 52 L170 52 L170 148 L50 148 Z" fill="${INK}" stroke="${GOLD}" stroke-opacity=".5"/>
        <path d="M58 60 L162 60 L162 140 L58 140 Z" fill="${PANEL}" stroke="${GOLD}" stroke-opacity=".14"/>
        <circle cx="110" cy="100" r="34" fill="${INK}" stroke="${GOLD}" stroke-opacity=".65"/>
        <circle cx="110" cy="100" r="22" fill="none" stroke="${GOLD}" stroke-opacity=".45"/>
        <circle cx="110" cy="100" r="9" fill="${GOLD}"/>
        <circle cx="103" cy="93" r="3" fill="${PAPER}" opacity=".8"/>
        <path d="M20 100 L44 100 M176 100 L200 100 M110 22 L110 40 M110 160 L110 178" stroke="${GOLD}" stroke-opacity=".35"/>
        <path d="M30 80 L44 86 M30 120 L44 114 M190 80 L176 86 M190 120 L176 114" stroke="${GOLD}" stroke-opacity=".2"/>
        <path d="M66 152 L154 152" stroke="${GOLD}" stroke-opacity=".2" stroke-dasharray="2 5"/>
        <text x="82" y="176" font-family="ui-monospace, monospace" font-size="8" fill="${GOLD}" opacity=".55" letter-spacing="2">NO BLINK</text>
      </svg>`;
  }
}

export function logoMark(size = 48, className = "logo-mark") {
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="29" fill="none" stroke="${AMBER}" stroke-opacity=".22"/>
    <path d="M32 8 L52 32 L32 56 L12 32 Z" fill="none" stroke="${AMBER}" stroke-width="1.6"/>
    <path d="M32 18 L43 32 L32 46 L21 32 Z" fill="${AMBER}" opacity=".14" stroke="${AMBER}" stroke-opacity=".7"/>
    <circle cx="32" cy="32" r="4.2" fill="${MINT}"/>
    <path d="M6 32 L11 32 M53 32 L58 32" stroke="${MINT}" stroke-opacity=".6"/>
    <circle cx="32" cy="6" r="1.4" fill="${MINT}" opacity=".8"/>
    <circle cx="32" cy="58" r="1.4" fill="${MINT}" opacity=".5"/>
  </svg>`;
}

export function companion(kind = "GNAT") {
  if (kind === "COMPILER") {
    return `<span class="avatar avatar--compiler" aria-hidden="true">
      <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="15" fill="none" stroke="${GOLD}" stroke-opacity=".55"/><circle cx="24" cy="24" r="8" fill="none" stroke="${GOLD}" stroke-opacity=".4"/><circle cx="24" cy="24" r="3.2" fill="${GOLD}"/><path d="M4 24h5M39 24h5M24 4v5M24 39v5" stroke="${GOLD}" stroke-opacity=".4"/></svg>
    </span>`;
  }
  if (kind === "SELF") {
    return `<span class="avatar avatar--self" aria-hidden="true">
      <svg viewBox="0 0 48 48"><path d="M24 7 L39 24 L24 41 L9 24 Z" fill="none" stroke="${MINT}" stroke-opacity=".7"/><circle cx="24" cy="24" r="3.4" fill="${AMBER}"/></svg>
    </span>`;
  }
  if (kind === "SEGFAULT") {
    return `<span class="avatar avatar--ghost" aria-hidden="true">
      <svg viewBox="0 0 48 48"><path d="M15 37V22q0-11 9-11t9 11v15l-3-3-3 3-3-3-3 3-3-3z" fill="${BLUE}" opacity=".12" stroke="${BLUE}" stroke-opacity=".55"/><circle cx="21" cy="22" r="1.7" fill="${BLUE}"/><circle cx="28" cy="22" r="1.7" fill="${BLUE}"/></svg>
    </span>`;
  }
  if (kind === "THE NULL") {
    return `<span class="avatar avatar--null" aria-hidden="true">
      <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="none" stroke="${VIOLET}" stroke-opacity=".55" stroke-dasharray="2 5"/><rect x="15" y="15" width="18" height="18" fill="none" stroke="${VIOLET}" stroke-opacity=".4"/><circle cx="24" cy="24" r="2.5" fill="${VIOLET}"/></svg>
    </span>`;
  }
  if (kind === "RANDY") {
    return `<span class="avatar avatar--randy" aria-hidden="true">
      <svg viewBox="0 0 48 48"><path d="M11 34Q7 24 15 18Q17 8 26 11Q38 11 36 22Q44 30 34 35Q28 43 21 37Q13 42 11 34Z" fill="${MINT}" opacity=".1" stroke="${MINT}" stroke-opacity=".5"/><circle cx="22" cy="24" r="4.5" fill="none" stroke="${MINT}" stroke-opacity=".65"/><circle cx="23.5" cy="22.5" r="1.4" fill="${MINT}"/></svg>
    </span>`;
  }
  if (kind === "CONSTRAINT ERROR") {
    return `<span class="avatar avatar--constraint" aria-hidden="true">
      <svg viewBox="0 0 48 48"><path d="M14 38V27q0-6 6-8h8q6 2 6 8v11z" fill="${CORAL}" opacity=".1" stroke="${CORAL}" stroke-opacity=".55"/><path d="M18 19q0-9 6-9t6 9" fill="none" stroke="${CORAL}" stroke-opacity=".5"/><path d="M11 30h26" stroke="${AMBER}" stroke-opacity=".45" stroke-dasharray="2 4"/></svg>
    </span>`;
  }
  return `<span class="avatar avatar--gnat" aria-hidden="true">
    <svg viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="${AMBER}" opacity=".05"/>
      <path d="M24 24C16 11 8 16 13 26C7 32 15 40 24 30C33 40 41 32 35 26C40 16 32 11 24 24Z" fill="${MINT}" opacity=".1" stroke="${MINT}" stroke-opacity=".5"/>
      <path d="M24 20V36" stroke="${AMBER}" stroke-width="1.7"/>
      <path d="M24 20L20 13M24 20L28 13" stroke="${AMBER}" stroke-opacity=".7"/>
      <circle cx="24" cy="20" r="3.2" fill="${AMBER}" opacity=".25" stroke="${AMBER}" stroke-opacity=".7"/>
      <circle cx="23" cy="19.5" r=".9" fill="${PAPER}"/>
      <circle cx="20" cy="12" r="1" fill="${MINT}" opacity=".8"/>
      <circle cx="28" cy="12" r="1" fill="${MINT}" opacity=".8"/>
    </svg>
  </span>`;
}
