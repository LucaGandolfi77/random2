import type { Expression, PoseName } from '../data/types';
import { getCharacterSpec, type CharacterSpec } from './specs';

export interface PoseParams {
  lean: number;
  head: number;
  armL: number;
  armR: number;
  elbowL: number;
  elbowR: number;
  bodyY: number;
  step: number;
}

export interface ExpressionParams {
  eyeOpen: number;
  brow: number;
  browRaise: number;
  mouthCurve: number;
  mouthOpen: number;
  mouthWidth: number;
  headTilt: number;
}

const POSES: Record<PoseName, PoseParams> = {
  stand: { lean: 0, head: 0, armL: -2, armR: 2, elbowL: 8, elbowR: -8, bodyY: 0, step: 0 },
  turn: { lean: 2, head: 8, armL: 6, armR: -7, elbowL: 4, elbowR: -5, bodyY: 0, step: 0 },
  reach: { lean: -2, head: -3, armL: 5, armR: 48, elbowL: 2, elbowR: -8, bodyY: -2, step: 0 },
  embrace: { lean: 1, head: 5, armL: -34, armR: 34, elbowL: -42, elbowR: 42, bodyY: 0, step: 0 },
  bow: { lean: 13, head: 8, armL: 12, armR: -14, elbowL: 6, elbowR: -8, bodyY: 4, step: 0 },
  clasp: { lean: 0, head: -2, armL: -17, armR: 17, elbowL: 58, elbowR: -58, bodyY: 0, step: 0 },
  recoil: { lean: -6, head: -10, armL: -24, armR: 25, elbowL: -18, elbowR: 20, bodyY: -2, step: 0 },
  walk: { lean: 1, head: 0, armL: 15, armR: -15, elbowL: -4, elbowR: 4, bodyY: -1, step: 4 },
  ride: { lean: 9, head: 2, armL: 28, armR: 38, elbowL: -16, elbowR: -20, bodyY: 6, step: 0 },
  cover: { lean: -3, head: 4, armL: -52, armR: 52, elbowL: 92, elbowR: -92, bodyY: 0, step: 0 }
};

const EXPRESSIONS: Record<Expression, ExpressionParams> = {
  neutral: { eyeOpen: 1, brow: 0, browRaise: 0, mouthCurve: 0, mouthOpen: 0, mouthWidth: 0, headTilt: 0 },
  soft: { eyeOpen: 0.86, brow: 2, browRaise: 1, mouthCurve: 2, mouthOpen: 0.5, mouthWidth: 0, headTilt: 1 },
  joy: { eyeOpen: 0.68, brow: 4, browRaise: 2, mouthCurve: 7, mouthOpen: 2, mouthWidth: 2, headTilt: 2 },
  desire: { eyeOpen: 0.64, brow: -3, browRaise: -1, mouthCurve: 2.5, mouthOpen: 1, mouthWidth: 0, headTilt: 3 },
  fear: { eyeOpen: 1.18, brow: 9, browRaise: 4, mouthCurve: -3, mouthOpen: 4, mouthWidth: 1, headTilt: -2 },
  shame: { eyeOpen: 0.42, brow: 7, browRaise: 2, mouthCurve: -4, mouthOpen: 0, mouthWidth: -1, headTilt: -4 },
  grief: { eyeOpen: 0.52, brow: 10, browRaise: 2, mouthCurve: -6, mouthOpen: 0.8, mouthWidth: -1, headTilt: -3 },
  anger: { eyeOpen: 0.7, brow: -10, browRaise: -2, mouthCurve: -5, mouthOpen: 0, mouthWidth: -2, headTilt: 1 },
  tender: { eyeOpen: 0.76, brow: 3, browRaise: 1, mouthCurve: 4, mouthOpen: 1, mouthWidth: 1, headTilt: 3 },
  cold: { eyeOpen: 0.46, brow: -4, browRaise: 0, mouthCurve: -1, mouthOpen: 0, mouthWidth: -1, headTilt: 0 },
  wonder: { eyeOpen: 1.04, brow: 5, browRaise: 3, mouthCurve: 1, mouthOpen: 2, mouthWidth: 1, headTilt: 2 }
};

export function getPoseParams(pose: PoseName): PoseParams {
  return POSES[pose] ?? POSES.stand;
}

export function getExpressionParams(expression: Expression): ExpressionParams {
  return EXPRESSIONS[expression] ?? EXPRESSIONS.neutral;
}

export function lerpPose(a: PoseParams, b: PoseParams, t: number): PoseParams {
  return {
    lean: a.lean + (b.lean - a.lean) * t,
    head: a.head + (b.head - a.head) * t,
    armL: a.armL + (b.armL - a.armL) * t,
    armR: a.armR + (b.armR - a.armR) * t,
    elbowL: a.elbowL + (b.elbowL - a.elbowL) * t,
    elbowR: a.elbowR + (b.elbowR - a.elbowR) * t,
    bodyY: a.bodyY + (b.bodyY - a.bodyY) * t,
    step: a.step + (b.step - a.step) * t
  };
}

export function lerpExpression(a: ExpressionParams, b: ExpressionParams, t: number): ExpressionParams {
  return {
    eyeOpen: a.eyeOpen + (b.eyeOpen - a.eyeOpen) * t,
    brow: a.brow + (b.brow - a.brow) * t,
    browRaise: a.browRaise + (b.browRaise - a.browRaise) * t,
    mouthCurve: a.mouthCurve + (b.mouthCurve - a.mouthCurve) * t,
    mouthOpen: a.mouthOpen + (b.mouthOpen - a.mouthOpen) * t,
    mouthWidth: a.mouthWidth + (b.mouthWidth - a.mouthWidth) * t,
    headTilt: a.headTilt + (b.headTilt - a.headTilt) * t
  };
}

let uidCounter = 0;

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildMarkup(spec: CharacterSpec, uid: string, back: boolean): string {
  const child = spec.body === 'child';
  const silhouette = spec.body === 'silhouette';
  const female = spec.body === 'female';
  const headY = child ? 258 : 164;
  const shoulderY = child ? 362 : 286;
  const waistY = child ? 464 : 432;
  const hemY = child ? 760 : 788;
  const headScale = child ? 0.98 : 0.9;
  const elbowY = shoulderY + 104;
  const handY = shoulderY + 206;
  const eyeY = -8;
  const neckTop = headY + 58;
  const neckBottom = shoulderY + 4;

  const headGradient = `<radialGradient id="${uid}-skin" cx="36%" cy="26%" r="80%">
    <stop offset="0" stop-color="${spec.skin}"/>
    <stop offset="0.62" stop-color="${spec.skin}"/>
    <stop offset="1" stop-color="${spec.skinShade}"/>
  </radialGradient>`;
  const neckGradient = `<linearGradient id="${uid}-neck" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${spec.skin}"/>
    <stop offset=".55" stop-color="${spec.skin}"/>
    <stop offset="1" stop-color="${spec.skinShade}"/>
  </linearGradient>`;
  const hairGradient = `<linearGradient id="${uid}-hair" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${spec.hair}"/>
    <stop offset="0.6" stop-color="${spec.hair}"/>
    <stop offset="1" stop-color="${spec.hairShade}"/>
  </linearGradient>`;
  const dressGradient = `<linearGradient id="${uid}-dress" x1="0.1" y1="0" x2="0.9" y2="1">
    <stop offset="0" stop-color="${spec.dress}"/>
    <stop offset="0.46" stop-color="${spec.dress}"/>
    <stop offset="1" stop-color="${spec.dressShade}"/>
  </linearGradient>`;
  const skinShadow = `<radialGradient id="${uid}-faceshade" cx="26%" cy="22%" r="78%">
    <stop offset="0" stop-color="${spec.skin}" stop-opacity="0"/>
    <stop offset="0.55" stop-color="${spec.skinShade}" stop-opacity=".08"/>
    <stop offset="1" stop-color="${spec.skinShade}" stop-opacity=".5"/>
  </radialGradient>`;
  const faceLight = `<radialGradient id="${uid}-facelight" cx="32%" cy="24%" r="58%">
    <stop offset="0" stop-color="#fff4df" stop-opacity=".3"/>
    <stop offset="1" stop-color="#fff4df" stop-opacity="0"/>
  </radialGradient>`;
  const faceSide = `<linearGradient id="${uid}-faceside" x1="1" y1="0" x2="0.1" y2="0">
    <stop offset="0" stop-color="${spec.skinShade}" stop-opacity=".62"/>
    <stop offset=".55" stop-color="${spec.skinShade}" stop-opacity="0"/>
    <stop offset="1" stop-color="${spec.skinShade}" stop-opacity="0"/>
  </linearGradient>`;

  const hairBack = (() => {
    if (silhouette) return `<ellipse cx="0" cy="-4" rx="56" ry="74" fill="${spec.hairShade}"/>`;
    switch (spec.hairStyle) {
      case 'chignon':
        return `
          <path d="M -60 8 C -76 -58 -42 -108 0 -108 C 42 -108 76 -58 60 8 C 70 48 54 88 28 106 L -28 106 C -54 88 -70 48 -60 8 Z" fill="url(#${uid}-hair)"/>
          <ellipse cx="-55" cy="42" rx="29" ry="35" fill="${spec.hairShade}"/>
          <ellipse cx="-62" cy="36" rx="17" ry="23" fill="${spec.hair}"/>
          <path d="M -66 20 C -80 46 -66 80 -40 94" fill="none" stroke="${spec.hairShade}" stroke-width="8" stroke-linecap="round"/>
          <path d="M -46 -66 C -24 -92 22 -96 46 -72" fill="none" stroke="#f0d1ac" stroke-width="2.2" opacity=".15"/>`;
      case 'curls':
        return `
          <ellipse cx="0" cy="-6" rx="64" ry="78" fill="url(#${uid}-hair)"/>
          <circle cx="-52" cy="-40" r="21" fill="${spec.hair}"/>
          <circle cx="-59" cy="-5" r="18" fill="${spec.hairShade}"/>
          <circle cx="52" cy="-40" r="21" fill="${spec.hair}"/>
          <circle cx="59" cy="-5" r="18" fill="${spec.hairShade}"/>
          <circle cx="-45" cy="30" r="16" fill="${spec.hair}"/>
          <circle cx="45" cy="30" r="16" fill="${spec.hair}"/>
          <path d="M -40 -74 C -18 -96 24 -94 44 -70" fill="none" stroke="#f0d1ac" stroke-width="2" opacity=".16"/>`;
      case 'short':
      case 'beard':
        return `<path d="M -58 -2 C -58 -60 -28 -90 0 -90 C 30 -90 58 -58 58 -2 C 38 -28 20 -38 0 -36 C -22 -38 -42 -26 -58 -2 Z" fill="url(#${uid}-hair)"/>
          <path d="M -30 -72 C -10 -84 18 -82 38 -66" fill="none" stroke="#e0c49a" stroke-width="2" opacity=".12"/>`;
      case 'cap':
        return `<path d="M -58 -2 C -58 -54 -30 -84 0 -84 C 30 -84 58 -54 58 -2 C 40 -24 20 -34 0 -32 C -20 -34 -40 -24 -58 -2 Z" fill="${spec.hairShade}"/>`;
      default:
        return '';
    }
  })();

  const hairFront = (() => {
    if (silhouette) return '';
    switch (spec.hairStyle) {
      case 'chignon':
        return `
          <path d="M -58 -26 C -50 -76 -18 -92 10 -86 C 36 -82 58 -58 58 -24 C 40 -54 18 -66 -2 -60 C -24 -54 -42 -38 -58 -26 Z" fill="url(#${uid}-hair)"/>
          <path d="M -56 -22 C -70 -4 -68 18 -58 32" fill="none" stroke="${spec.hairShade}" stroke-width="9" stroke-linecap="round"/>
          <path d="M 56 -24 C 68 -2 64 18 56 34" fill="none" stroke="${spec.hairShade}" stroke-width="7" stroke-linecap="round"/>
          <path d="M -42 -60 C -20 -82 16 -84 38 -66" fill="none" stroke="#f1d3ad" stroke-width="2" opacity=".14"/>
          <path d="M -55 40 C -48 56 -38 70 -24 78" fill="none" stroke="${spec.hairShade}" stroke-width="4" opacity=".45"/>
          <path d="M 52 38 C 46 52 36 66 24 74" fill="none" stroke="${spec.hairShade}" stroke-width="3" opacity=".35"/>
          <path d="M -55 42 C -48 36 -38 32 -28 34" fill="none" stroke="${spec.trim}" stroke-width="2.5" opacity=".55"/>`;
      case 'curls':
        return `
          <path d="M -56 -30 C -46 -80 -14 -90 12 -84 C 38 -78 58 -54 58 -22 C 36 -50 12 -58 -8 -50 C -28 -44 -44 -34 -56 -30 Z" fill="${spec.hair}"/>
          <circle cx="-47" cy="-34" r="14" fill="${spec.hair}"/>
          <circle cx="-31" cy="-54" r="12" fill="${spec.hair}"/>
          <circle cx="-9" cy="-60" r="13" fill="${spec.hair}"/>
          <path d="M -48 -42 C -30 -58 -4 -64 14 -54" fill="none" stroke="#f8dfb7" stroke-width="2" opacity=".2"/>
          <circle cx="42" cy="-46" r="7" fill="#c18189" opacity=".7"/>
          <path d="M 42 -52 C 38 -44 38 -38 42 -32" fill="none" stroke="${spec.trim}" stroke-width="1.6" opacity=".5"/>`;
      case 'short':
      case 'beard':
        return `<path d="M -56 -18 C -46 -66 -18 -84 8 -80 C 34 -76 56 -52 56 -16 C 36 -42 14 -52 -6 -46 C -28 -40 -44 -28 -56 -18 Z" fill="${spec.hair}"/>
          <path d="M -30 -62 C -8 -74 18 -72 38 -58" fill="none" stroke="#e2c59a" stroke-width="2" opacity=".13"/>`;
      case 'cap':
        return `<path d="M -58 -48 C -46 -82 46 -82 58 -48 L 66 -36 L -66 -36 Z" fill="${spec.dressShade}"/><path d="M -66 -36 L 66 -36" stroke="${spec.trim}" stroke-width="4"/>`;
      default:
        return '';
    }
  })();

  const backHead = back
    ? `<ellipse cx="0" cy="0" rx="53" ry="68" fill="${spec.skinShade}"/>
       ${spec.body === 'female' ? `<path d="M -52 -28 C -48 -78 -22 -94 0 -94 C 22 -94 48 -78 52 -28 C 42 -8 24 2 0 2 C -24 2 -42 -8 -52 -28 Z" fill="url(#${uid}-hair)"/><ellipse cx="0" cy="58" rx="24" ry="28" fill="${spec.hairShade}"/>` : `<path d="M -53 -35 C -50 -80 -22 -94 0 -94 C 22 -94 50 -80 53 -35 C 46 4 26 24 0 24 C -26 24 -46 4 -53 -35 Z" fill="url(#${uid}-hair)"/><path d="M -30 16 C -12 26 12 26 30 16" fill="none" stroke="${spec.skinShade}" stroke-width="2" opacity=".35"/>`}
       <path d="M -42 42 C -26 64 26 64 42 42" fill="none" stroke="${spec.skin}" stroke-width="2" opacity=".2"/>
       <path d="M -36 -30 C -18 -48 18 -48 36 -30" fill="none" stroke="#f0d1ac" stroke-width="2" opacity=".12"/>`
    : '';

  const face = silhouette
    ? `<ellipse cx="0" cy="-2" rx="55" ry="70" fill="${spec.hairShade}"/>`
    : back
      ? ''
      : `<path d="M -54 -16 C -54 -64 -29 -84 0 -84 C 29 -84 54 -64 54 -16 C 54 34 30 70 0 79 C -30 70 -54 34 -54 -16 Z" fill="url(#${uid}-skin)"/>
        <path d="M -54 -16 C -49 -42 -32 -58 -8 -64 C -28 -48 -40 -30 -44 -8 Z" fill="${spec.skinShade}" opacity=".38"/>
        <path d="M 22 46 C 14 61 -8 70 -20 68 C -36 64 -46 50 -50 34 C -36 54 -14 62 4 58 C 16 56 20 52 22 46 Z" fill="${spec.skinShade}" opacity=".42"/>
        <path d="M -40 -60 C -22 -76 22 -78 40 -58" fill="none" stroke="${spec.skinShade}" stroke-width="2" opacity=".24"/>
        <path d="M -54 -16 C -54 -64 -29 -84 0 -84 C 29 -84 54 -64 54 -16 C 54 34 30 70 0 79 C -30 70 -54 34 -54 -16 Z" fill="url(#${uid}-faceshade)" opacity=".55"/>
        <ellipse cx="-18" cy="15" rx="18" ry="12" fill="${spec.lips}" opacity=".07"/>
        <ellipse cx="18" cy="15" rx="18" ry="12" fill="${spec.lips}" opacity=".07"/>
        <path d="M -34 -48 C -16 -62 6 -64 22 -54" fill="none" stroke="#fff2dc" stroke-width="7" opacity=".06" stroke-linecap="round"/>
        <path d="M -8 62 C 0 68 8 68 12 64" fill="none" stroke="${spec.skinShade}" stroke-width="1.5" opacity=".3"/>`;

  const ears = silhouette || back
    ? ''
    : `<ellipse cx="-55" cy="-2" rx="9" ry="15" fill="${spec.skinShade}"/>
       <ellipse cx="-55" cy="-2" rx="4" ry="8" fill="${spec.skin}" opacity=".5"/>
       <ellipse cx="55" cy="-2" rx="9" ry="15" fill="${spec.skinShade}"/>
       <ellipse cx="55" cy="-2" rx="4" ry="8" fill="${spec.skin}" opacity=".5"/>`;

  const eyes = silhouette || back
    ? ''
    : `<g class="ch-eye-l">
        <path d="M -32 ${eyeY} Q -18 ${eyeY - 11} -4 ${eyeY} Q -18 ${eyeY + 5} -32 ${eyeY} Z" fill="#f7f1e7"/>
        <g class="ch-pupil ch-pupil-l">
          <circle cx="-18" cy="${eyeY - 1}" r="5.7" fill="${spec.eye}"/>
          <circle cx="-18" cy="${eyeY - 1}" r="2.6" fill="#130d0c"/>
          <circle cx="-16.4" cy="${eyeY - 3.2}" r="1.25" fill="#fff8ed" opacity=".9"/>
        </g>
        <path d="M -32 ${eyeY} Q -18 ${eyeY - 12} -4 ${eyeY}" fill="none" stroke="${spec.hairShade}" stroke-width="2.2" opacity=".8"/>
        <path d="M -32 ${eyeY} Q -29 ${eyeY + 3} -25 ${eyeY + 2}" fill="none" stroke="${spec.skinShade}" stroke-width="1.4" opacity=".4"/>
        ${female ? `<path d="M -33 ${eyeY - 1} L -36 ${eyeY - 4} M -30 ${eyeY - 4} L -32 ${eyeY - 7}" stroke="${spec.hairShade}" stroke-width="1.4" opacity=".55"/>` : ''}
      </g>
      <g class="ch-eye-r">
        <path d="M 4 ${eyeY} Q 18 ${eyeY - 11} 32 ${eyeY} Q 18 ${eyeY + 5} 4 ${eyeY} Z" fill="#f7f1e7"/>
        <g class="ch-pupil ch-pupil-r">
          <circle cx="18" cy="${eyeY - 1}" r="5.7" fill="${spec.eye}"/>
          <circle cx="18" cy="${eyeY - 1}" r="2.6" fill="#130d0c"/>
          <circle cx="19.6" cy="${eyeY - 3.2}" r="1.25" fill="#fff8ed" opacity=".9"/>
        </g>
        <path d="M 4 ${eyeY} Q 18 ${eyeY - 12} 32 ${eyeY}" fill="none" stroke="${spec.hairShade}" stroke-width="2.2" opacity=".8"/>
        <path d="M 32 ${eyeY} Q 29 ${eyeY + 3} 25 ${eyeY + 2}" fill="none" stroke="${spec.skinShade}" stroke-width="1.4" opacity=".4"/>
        ${female ? `<path d="M 33 ${eyeY - 1} L 36 ${eyeY - 4} M 30 ${eyeY - 4} L 32 ${eyeY - 7}" stroke="${spec.hairShade}" stroke-width="1.4" opacity=".55"/>` : ''}
      </g>`;

  const brows = silhouette || back
    ? ''
    : `<path class="ch-brow-l" d="M -34 -27 Q -20 -35 -6 -27" fill="none" stroke="${spec.hairShade}" stroke-width="3.6" stroke-linecap="round"/>
       <path class="ch-brow-r" d="M 6 -27 Q 20 -35 34 -27" fill="none" stroke="${spec.hairShade}" stroke-width="3.6" stroke-linecap="round"/>`;

  const nose = silhouette || back
    ? ''
    : `<path d="M -1 -3 C -4 8 -7 17 -1 21 C 4 24 8 20 9 16" fill="none" stroke="${spec.skinShade}" stroke-width="1.9" opacity=".62"/>
       <ellipse cx="1" cy="19" rx="6" ry="2" fill="${spec.skinShade}" opacity=".22"/>
       <path d="M -5 12 C -2 9 2 8 5 10" fill="none" stroke="#fff1da" stroke-width="1.4" opacity=".2"/>`;

  const mouth = silhouette || back
    ? ''
    : `<g class="ch-mouth">
        <path class="ch-mouth-inner" d="M -18 38 Q 0 42 18 38 Q 0 44 -18 38 Z" fill="#42171d" opacity="0"/>
        <path class="ch-lower-lip" d="M -19 40 Q 0 43 19 40 Q 0 47 -19 40 Z" fill="${spec.lips}" opacity=".72"/>
        <path class="ch-mouth-lip" d="M -25 38 Q 0 36 25 38 Q 0 41 -25 38 Z" fill="${spec.lips}" opacity=".9"/>
        <path class="ch-mouth-line" d="M -20 38 Q 0 39.5 20 38" fill="none" stroke="#4c1d23" stroke-width="1.2" opacity=".45"/>
        <path d="M -2 30 C 0 33 0 35 -1 37" fill="none" stroke="${spec.skinShade}" stroke-width="1.2" opacity=".22"/>
      </g>`;

  const beard = spec.features.beard && !silhouette && !back
    ? `<path d="M -50 18 C -42 60 -20 84 0 86 C 20 84 42 60 50 18 C 38 52 20 64 0 64 C -20 64 -38 52 -50 18 Z" fill="${spec.hair}"/>
       <path d="M -20 62 C -10 70 10 70 20 62" fill="none" stroke="${spec.hairShade}" stroke-width="2.6"/>
       <path d="M -30 46 C -20 52 -8 54 2 52 M 10 50 C 18 48 26 42 30 34" fill="none" stroke="${spec.hairShade}" stroke-width="1.6" opacity=".6"/>`
    : '';

  const glasses = spec.features.glasses && !silhouette && !back
    ? `<g class="ch-glasses" fill="none" stroke="${spec.trim}" stroke-width="2.2" opacity=".92">
         <rect x="-36" y="-20" width="27" height="22" rx="8"/>
         <rect x="9" y="-20" width="27" height="22" rx="8"/>
         <path d="M -9 -10 Q 0 -15 9 -10 M -36 -10 L -52 -16 M 36 -10 L 52 -16"/>
       </g>`
    : '';

  const cap = spec.features.cap
    ? `<path d="M -62 -52 C -50 -90 50 -90 62 -52 L 72 -42 L -72 -42 Z" fill="${spec.dressShade}"/>
       <path d="M -72 -42 L 72 -42" stroke="${spec.trim}" stroke-width="5"/>
       <path d="M -64 -42 C -58 -32 58 -32 64 -42" fill="${spec.dress}" opacity=".9"/>`
    : '';

  const fur = spec.features.fur
    ? `<g class="ch-fur" opacity=".96">
         <ellipse cx="148" cy="${shoulderY - 4}" rx="37" ry="23" fill="#81796f"/>
         <ellipse cx="176" cy="${shoulderY - 17}" rx="35" ry="26" fill="#a89d8d"/>
         <ellipse cx="224" cy="${shoulderY - 17}" rx="35" ry="26" fill="#a89d8d"/>
         <ellipse cx="252" cy="${shoulderY - 4}" rx="37" ry="23" fill="#81796f"/>
         <ellipse cx="200" cy="${shoulderY - 24}" rx="44" ry="21" fill="#b9ad9b"/>
         <path d="M 140 ${shoulderY + 4} C 168 ${shoulderY + 18} 232 ${shoulderY + 18} 260 ${shoulderY + 4}" fill="none" stroke="#665e55" stroke-width="3" opacity=".5"/>
       </g>`
    : '';

  const cameo = spec.features.cameo
    ? `<g class="ch-cameo">
         <path d="M 186 ${shoulderY - 6} C 194 ${shoulderY - 2} 206 ${shoulderY - 2} 214 ${shoulderY - 6}" fill="none" stroke="${spec.trim}" stroke-width="1.4" opacity=".55"/>
         <ellipse cx="200" cy="${shoulderY + 16}" rx="11" ry="14" fill="${spec.trim}"/>
         <ellipse cx="200" cy="${shoulderY + 16}" rx="7" ry="10" fill="#f0e2cf"/>
         <path d="M 197 ${shoulderY + 21} C 198 ${shoulderY + 14} 203 ${shoulderY + 16} 203 ${shoulderY + 23}" fill="none" stroke="${spec.dressShade}" stroke-width="2"/>
       </g>`
    : '';

  const epaulettes = spec.features.epaulettes
    ? `<g class="ch-epaulettes" fill="${spec.trim}">
         <path d="M 134 ${shoulderY - 8} L 172 ${shoulderY - 16} L 178 ${shoulderY + 2} L 142 ${shoulderY + 6} Z"/>
         <path d="M 266 ${shoulderY - 8} L 228 ${shoulderY - 16} L 222 ${shoulderY + 2} L 258 ${shoulderY + 6} Z"/>
         <path d="M 140 ${shoulderY + 4} L 149 ${shoulderY + 28} M 151 ${shoulderY + 2} L 159 ${shoulderY + 25} M 162 ${shoulderY - 1} L 168 ${shoulderY + 21}" stroke="${spec.trim}" stroke-width="3"/>
         <path d="M 260 ${shoulderY + 4} L 251 ${shoulderY + 28} M 249 ${shoulderY + 2} L 241 ${shoulderY + 25} M 238 ${shoulderY - 1} L 232 ${shoulderY + 21}" stroke="${spec.trim}" stroke-width="3"/>
         <circle cx="154" cy="${shoulderY + 6}" r="3" fill="#f0d79a"/>
         <circle cx="246" cy="${shoulderY + 6}" r="3" fill="#f0d79a"/>
       </g>`
    : '';

  const sash = spec.features.sash
    ? `<path d="M 158 ${shoulderY + 16} L 236 ${waistY - 18} L 244 ${waistY - 2} L 166 ${shoulderY + 34} Z" fill="${spec.accent}" opacity=".9"/>
       <path d="M 162 ${shoulderY + 18} L 240 ${waistY - 16}" stroke="${spec.trim}" stroke-width="2" opacity=".8"/>
       <path d="M 156 ${shoulderY + 14} L 168 ${shoulderY + 8}" stroke="${spec.trim}" stroke-width="3" opacity=".7"/>`
    : '';

  const medals = spec.features.medals
    ? `<g class="ch-medals">
         <circle cx="225" cy="${shoulderY + 58}" r="7" fill="${spec.trim}"/>
         <circle cx="237" cy="${shoulderY + 74}" r="6" fill="#d9c08a"/>
         <path d="M 225 ${shoulderY + 65} L 225 ${shoulderY + 86} M 237 ${shoulderY + 80} L 237 ${shoulderY + 96}" stroke="${spec.trim}" stroke-width="2"/>
         <circle cx="225" cy="${shoulderY + 58}" r="2.5" fill="#f5ddb0"/>
       </g>`
    : '';

  const torso = (() => {
    if (silhouette) {
      return `
        <path d="M 146 ${shoulderY} C 160 ${shoulderY - 20} 240 ${shoulderY - 20} 254 ${shoulderY} L 242 ${waistY} L 158 ${waistY} Z" fill="${spec.dress}"/>
        <path d="M 158 ${waistY} L 242 ${waistY} L 238 ${waistY + 18} L 162 ${waistY + 18} Z" fill="${spec.dressShade}"/>
        <path d="M 252 ${shoulderY} C 256 ${shoulderY + 80} 246 ${waistY - 30} 242 ${waistY}" fill="none" stroke="${spec.trim}" stroke-width="2" opacity=".6"/>`;
    }
    if (female) {
      return `
        <path d="M 150 ${shoulderY} C 166 ${shoulderY - 16} 234 ${shoulderY - 16} 250 ${shoulderY} L 242 ${waistY} C 218 ${waistY + 12} 182 ${waistY + 12} 158 ${waistY} Z" fill="url(#${uid}-dress)" stroke="${spec.dressShade}" stroke-width="1" stroke-opacity=".35"/>
        <path d="M 168 ${shoulderY - 4} C 182 ${shoulderY + 2} 188 ${shoulderY + 20} 200 ${shoulderY + 20} C 212 ${shoulderY + 20} 218 ${shoulderY + 2} 232 ${shoulderY - 4} L 232 ${shoulderY + 3} C 218 ${shoulderY + 11} 210 ${shoulderY + 27} 200 ${shoulderY + 27} C 190 ${shoulderY + 27} 182 ${shoulderY + 11} 168 ${shoulderY + 3} Z" fill="${spec.skin}"/>
        <path d="M 170 ${shoulderY - 2} C 184 ${shoulderY + 4} 190 ${shoulderY + 22} 200 ${shoulderY + 22} C 210 ${shoulderY + 22} 216 ${shoulderY + 4} 230 ${shoulderY - 2}" fill="none" stroke="${spec.trim}" stroke-width="2.2"/>
        <path d="M 174 ${shoulderY + 2} C 186 ${shoulderY + 8} 192 ${shoulderY + 24} 200 ${shoulderY + 24} C 208 ${shoulderY + 24} 214 ${shoulderY + 8} 226 ${shoulderY + 2}" fill="none" stroke="${spec.dressShade}" stroke-width="1" opacity=".4"/>
        <path d="M 184 ${shoulderY - 8} C 192 ${shoulderY - 3} 208 ${shoulderY - 3} 216 ${shoulderY - 8}" fill="none" stroke="${spec.trim}" stroke-width="3" opacity=".65"/>
        <path d="M 188 ${shoulderY - 5} C 194 ${shoulderY + 2} 206 ${shoulderY + 2} 212 ${shoulderY - 5}" fill="none" stroke="${spec.skinShade}" stroke-width="1.8" opacity=".3"/>
        <path d="M 166 ${shoulderY + 16} C 178 ${shoulderY + 34} 222 ${shoulderY + 34} 234 ${shoulderY + 16}" fill="none" stroke="${spec.dressShade}" stroke-width="2" opacity=".55"/>
        <path d="M 154 ${shoulderY + 10} C 172 ${shoulderY + 2} 228 ${shoulderY + 2} 246 ${shoulderY + 10}" fill="none" stroke="#fff1d6" stroke-width="2" opacity=".1"/>
        <path d="M 158 ${waistY - 8} L 242 ${waistY - 8} L 240 ${waistY + 5} L 160 ${waistY + 5} Z" fill="${spec.trim}" opacity=".92"/>
        <rect x="194" y="${waistY - 5}" width="12" height="7" rx="1" fill="${spec.dressShade}" opacity=".8"/>
        <rect x="197" y="${waistY - 3}" width="6" height="3" fill="${spec.trim}" opacity=".8"/>`;
    }
    if (spec.outfit === 'uniform') {
      return `
        <path d="M 136 ${shoulderY} C 158 ${shoulderY - 18} 242 ${shoulderY - 18} 264 ${shoulderY} L 246 ${waistY} L 154 ${waistY} Z" fill="url(#${uid}-dress)"/>
        <path d="M 176 ${shoulderY - 8} L 200 ${shoulderY + 28} L 224 ${shoulderY - 8} L 214 ${shoulderY - 18} L 186 ${shoulderY - 18} Z" fill="${spec.accent}"/>
        <path d="M 182 ${shoulderY - 10} L 192 ${shoulderY + 2} L 184 ${shoulderY + 12} M 218 ${shoulderY - 10} L 208 ${shoulderY + 2} L 216 ${shoulderY + 12}" fill="none" stroke="${spec.trim}" stroke-width="2.5" opacity=".7"/>
        <path d="M 200 ${shoulderY + 28} L 200 ${waistY}" stroke="${spec.accent}" stroke-width="2.5" opacity=".8"/>
        <path d="M 160 ${waistY - 10} L 240 ${waistY - 10} L 238 ${waistY + 2} L 162 ${waistY + 2} Z" fill="${spec.trim}" opacity=".9"/>
        ${[0, 1, 2, 3, 4].map((i) => `<circle cx="200" cy="${shoulderY + 40 + i * 19}" r="2.6" fill="${spec.trim}" opacity=".9"/>`).join('')}
        <path d="M 158 ${shoulderY + 14} C 176 ${shoulderY + 4} 224 ${shoulderY + 4} 242 ${shoulderY + 14}" fill="none" stroke="#fff5de" stroke-width="1.6" opacity=".25"/>`;
    }
    if (spec.outfit === 'country') {
      return `
        <path d="M 136 ${shoulderY} C 158 ${shoulderY - 18} 242 ${shoulderY - 18} 264 ${shoulderY} L 246 ${waistY} L 154 ${waistY} Z" fill="url(#${uid}-dress)"/>
        <path d="M 180 ${shoulderY - 6} L 200 ${shoulderY + 28} L 220 ${shoulderY - 6} L 212 ${shoulderY - 18} L 188 ${shoulderY - 18} Z" fill="${spec.trim}" opacity=".9"/>
        <path d="M 168 ${shoulderY + 12} C 184 ${shoulderY + 24} 216 ${shoulderY + 24} 232 ${shoulderY + 12} L 238 ${waistY - 10} L 162 ${waistY - 10} Z" fill="${spec.accent}" opacity=".35"/>
        ${[0, 1, 2].map((i) => `<circle cx="200" cy="${shoulderY + 44 + i * 22}" r="2.4" fill="${spec.trim}" opacity=".7"/>`).join('')}
        <path d="M 158 ${waistY - 8} L 242 ${waistY - 8} L 240 ${waistY + 4} L 160 ${waistY + 4} Z" fill="${spec.trim}" opacity=".65"/>`;
    }
    return `
      <path d="M 134 ${shoulderY} C 158 ${shoulderY - 20} 242 ${shoulderY - 20} 266 ${shoulderY} L 246 ${waistY} L 154 ${waistY} Z" fill="url(#${uid}-dress)"/>
      <path d="M 176 ${shoulderY - 8} L 200 ${shoulderY + 32} L 224 ${shoulderY - 8} L 214 ${shoulderY - 20} L 186 ${shoulderY - 20} Z" fill="${spec.trim}" opacity=".95"/>
      <path d="M 200 ${shoulderY + 32} L 200 ${waistY - 6}" stroke="${spec.dressShade}" stroke-width="2" opacity=".8"/>
      <path d="M 158 ${waistY - 8} L 242 ${waistY - 8} L 240 ${waistY + 4} L 160 ${waistY + 4} Z" fill="${spec.dressShade}"/>
      <circle cx="225" cy="${shoulderY + 64}" r="4" fill="${spec.trim}" opacity=".5"/>
      <path d="M 225 ${shoulderY + 68} C 220 ${shoulderY + 94} 212 ${shoulderY + 110} 204 ${shoulderY + 118}" fill="none" stroke="${spec.trim}" stroke-width="1.6" opacity=".5"/>`;
  })();

  const skirt = (() => {
    if (silhouette) {
      return `<path d="M 158 ${waistY} C 104 ${waistY + 90} 74 ${hemY - 80} 70 ${hemY} L 330 ${hemY} C 326 ${hemY - 80} 296 ${waistY + 90} 242 ${waistY} Z" fill="${spec.dress}"/>
        <path d="M 158 ${waistY} C 104 ${waistY + 90} 74 ${hemY - 80} 70 ${hemY}" fill="none" stroke="${spec.trim}" stroke-width="2" opacity=".5"/>`;
    }
    if (female) {
      const loose = spec.features.nightdress;
      return `
        <path d="M 158 ${waistY} C ${loose ? 94 : 112} ${waistY + 76} 74 ${hemY - 70} 66 ${hemY} L 334 ${hemY} C 326 ${hemY - 70} ${loose ? 306 : 288} ${waistY + 76} 242 ${waistY} Z" fill="url(#${uid}-dress)" stroke="${spec.dressShade}" stroke-width="1" stroke-opacity=".3"/>
        <path d="M 158 ${waistY} C ${loose ? 118 : 140} ${waistY + 86} 104 ${hemY - 80} 94 ${hemY}" fill="none" stroke="${spec.dressShade}" stroke-width="2" opacity=".5"/>
        <path d="M 146 ${waistY + 24} C 132 ${waistY + 146} 120 ${hemY - 100} 110 ${hemY - 10}" fill="none" stroke="${spec.dressShade}" stroke-width="2" opacity=".45"/>
        <path d="M 178 ${waistY + 28} C 174 ${waistY + 160} 168 ${hemY - 90} 162 ${hemY - 8}" fill="none" stroke="${spec.dressShade}" stroke-width="2" opacity=".35"/>
        <path d="M 222 ${waistY + 28} C 226 ${waistY + 160} 232 ${hemY - 90} 238 ${hemY - 8}" fill="none" stroke="${spec.dressShade}" stroke-width="2" opacity=".35"/>
        <path d="M 254 ${waistY + 24} C 268 ${waistY + 146} 280 ${hemY - 100} 290 ${hemY - 10}" fill="none" stroke="${spec.dressShade}" stroke-width="2" opacity=".45"/>
        <path d="M 100 ${waistY + 110} C 138 ${waistY + 138} 186 ${waistY + 146} 220 ${waistY + 140}" fill="none" stroke="#fff0d4" stroke-width="2" opacity=".08"/>
        <path d="M 66 ${hemY} L 334 ${hemY}" stroke="${spec.trim}" stroke-width="3" opacity=".7"/>
        ${loose ? `<path d="M 116 ${waistY + 120} C 160 ${waistY + 148} 240 ${waistY + 148} 284 ${waistY + 120}" fill="none" stroke="${spec.trim}" stroke-width="2" opacity=".3"/>` : ''}`;
    }
    const trouserColor = spec.character === 'vronsky' ? '#202a36' : spec.character === 'levin' ? '#3a3023' : spec.character === 'karenin' ? '#171c18' : spec.dressShade;
    return `
      <path d="M 174 ${waistY - 4} L 166 ${hemY - 36} L 190 ${hemY - 36} L 198 ${waistY - 4} Z" fill="${trouserColor}" stroke="${spec.hairShade}" stroke-width=".8" stroke-opacity=".3"/>
      <path d="M 202 ${waistY - 4} L 210 ${hemY - 36} L 234 ${hemY - 36} L 226 ${waistY - 4} Z" fill="${trouserColor}" stroke="${spec.hairShade}" stroke-width=".8" stroke-opacity=".3"/>
      <path d="M 176 ${waistY + 20} L 172 ${hemY - 48} M 226 ${waistY + 20} L 230 ${hemY - 48}" stroke="#fff1d6" stroke-width="2" opacity=".07"/>
      <path d="M 176 ${waistY - 2} L 170 ${hemY - 40} L 180 ${hemY - 40} L 188 ${waistY - 2} Z" fill="#fff0d6" opacity=".06"/>
      <path d="M 204 ${waistY - 2} L 212 ${hemY - 40} L 222 ${hemY - 40} L 228 ${waistY - 2} Z" fill="#fff0d6" opacity=".05"/>
      <path d="M 164 ${hemY - 44} L 194 ${hemY - 44} L 191 ${hemY} L 167 ${hemY} Z" fill="#17120e"/>
      <path d="M 206 ${hemY - 44} L 236 ${hemY - 44} L 233 ${hemY} L 209 ${hemY} Z" fill="#17120e"/>
      <path d="M 168 ${hemY - 40} L 192 ${hemY - 40}" stroke="${spec.trim}" stroke-width="2" opacity=".4"/>
      <path d="M 208 ${hemY - 40} L 232 ${hemY - 40}" stroke="${spec.trim}" stroke-width="2" opacity=".4"/>
      <path d="M 168 ${hemY - 4} L 191 ${hemY - 4} M 209 ${hemY - 4} L 232 ${hemY - 4}" stroke="#c8b08b" stroke-width="2" opacity=".18"/>`;
  })();

  const torsoShadow = silhouette
    ? ''
    : `<path d="M 150 ${shoulderY + 18} C 174 ${shoulderY + 8} 226 ${shoulderY + 8} 250 ${shoulderY + 18} L 242 ${waistY - 4} C 218 ${waistY + 8} 182 ${waistY + 8} 158 ${waistY - 4} Z" fill="${spec.skinShade}" opacity=".12"/>`;

  const neck = silhouette
    ? ''
    : `<path d="M 187 ${neckTop} C 185 ${neckTop + 28} 179 ${neckBottom - 16} 175 ${neckBottom} L 225 ${neckBottom} C 221 ${neckBottom - 16} 214 ${neckTop + 28} 212 ${neckTop} Z" fill="url(#${uid}-neck)" stroke="${spec.skinShade}" stroke-width=".8" stroke-opacity=".35"/>
       <path d="M 202 ${neckTop + 2} C 207 ${neckTop + 24} 211 ${neckBottom - 22} 216 ${neckBottom} L 225 ${neckBottom} C 221 ${neckBottom - 16} 214 ${neckTop + 28} 212 ${neckTop} Z" fill="${spec.skinShade}" opacity=".3"/>
       <ellipse cx="200" cy="${neckTop + 4}" rx="20" ry="10" fill="${spec.skinShade}" opacity=".32"/>
       <path d="M 186 ${neckTop + 8} C 192 ${neckTop + 18} 208 ${neckTop + 18} 214 ${neckTop + 8}" fill="none" stroke="${spec.skinShade}" stroke-width="2.4" opacity=".28"/>
       <path d="M 191 ${neckTop + 8} C 194 ${neckTop + 28} 194 ${neckBottom - 24} 192 ${neckBottom - 8}" fill="none" stroke="#fff2dc" stroke-width="2" opacity=".16"/>`;

  const collar = (() => {
    if (silhouette) return '';
    if (female) {
      return `<g class="ch-collar">
        <path d="M 184 ${shoulderY - 15} C 192 ${shoulderY - 9} 208 ${shoulderY - 9} 216 ${shoulderY - 15} L 216 ${shoulderY - 5} C 208 ${shoulderY + 1} 192 ${shoulderY + 1} 184 ${shoulderY - 5} Z" fill="${spec.dressShade}" stroke="${spec.trim}" stroke-width="1.2" opacity=".92"/>
        <path d="M 186 ${shoulderY - 11} C 194 ${shoulderY - 6} 206 ${shoulderY - 6} 214 ${shoulderY - 11}" fill="none" stroke="${spec.trim}" stroke-width="1.4" opacity=".7"/>
        <circle cx="200" cy="${shoulderY - 3}" r="3.6" fill="${spec.trim}" opacity=".75"/>
        <path d="M 184 ${shoulderY - 14} C 192 ${shoulderY - 20} 208 ${shoulderY - 20} 216 ${shoulderY - 14}" fill="none" stroke="${spec.skinShade}" stroke-width="2" opacity=".25"/>
      </g>`;
    }
    if (spec.outfit === 'uniform') {
      return `<g class="ch-collar">
        <path d="M 178 ${shoulderY - 33} C 184 ${shoulderY - 42} 216 ${shoulderY - 42} 222 ${shoulderY - 33} L 224 ${shoulderY + 4} C 210 ${shoulderY + 12} 190 ${shoulderY + 12} 176 ${shoulderY + 4} Z" fill="${spec.accent}" stroke="${spec.trim}" stroke-width="2" opacity=".92"/>
        <path d="M 182 ${shoulderY - 34} C 188 ${shoulderY - 40} 212 ${shoulderY - 40} 218 ${shoulderY - 34}" fill="none" stroke="${spec.trim}" stroke-width="2.4" opacity=".8"/>
        <path d="M 194 ${shoulderY - 28} L 200 ${shoulderY - 14} L 206 ${shoulderY - 28}" fill="#f1e4cf" opacity=".75"/>
      </g>`;
    }
    if (spec.outfit === 'nightshirt') {
      return `<path d="M 180 ${shoulderY - 26} C 186 ${shoulderY - 36} 214 ${shoulderY - 36} 220 ${shoulderY - 26} L 220 ${shoulderY + 4} C 208 ${shoulderY + 10} 192 ${shoulderY + 10} 180 ${shoulderY + 4} Z" fill="${spec.dressShade}" opacity=".8"/>`;
    }
    return `<g class="ch-collar">
      <path d="M 180 ${shoulderY - 30} C 186 ${shoulderY - 40} 214 ${shoulderY - 40} 220 ${shoulderY - 30} L 220 ${shoulderY + 2} L 200 ${shoulderY + 18} L 180 ${shoulderY + 2} Z" fill="${spec.trim}" opacity=".8"/>
      <path d="M 190 ${shoulderY - 26} L 200 ${shoulderY + 4} L 210 ${shoulderY - 26}" fill="${spec.accent}" opacity=".6"/>
    </g>`;
  })();

  const rim = silhouette
    ? `<path d="M 254 ${shoulderY} C 260 ${shoulderY + 60} 250 ${waistY - 20} 242 ${waistY}" fill="none" stroke="${spec.trim}" stroke-width="2.4" opacity=".8"/>
       <path d="M 54 -20 C 60 20 44 54 26 68" fill="none" stroke="${spec.trim}" stroke-width="2" opacity=".55"/>`
    : `<path d="M 250 ${shoulderY + 4} C 258 ${shoulderY + 60} 252 ${waistY - 20} 243 ${waistY}" fill="none" stroke="${spec.trim}" stroke-width="1.6" opacity=".35"/>
       <path d="M 43 -58 C 58 -30 53 10 38 36" fill="none" stroke="#f7e3c8" stroke-width="2.5" opacity=".2"/>
       <path d="M -52 -18 C -58 8 -52 34 -38 48" fill="none" stroke="#0b0a08" stroke-width="2" opacity=".18"/>`;

  const sleeveColor = spec.dress;
  const cuffColor = spec.outfit === 'uniform' ? spec.accent : spec.trim;

  const arm = (side: 'l' | 'r') => {
    const s = side === 'l' ? 1 : -1;
    const sx = side === 'l' ? 148 : 252;
    const ex = side === 'l' ? 130 : 270;
    const hx = side === 'l' ? 122 : 278;
    const forearmClass = side === 'l' ? 'ch-fore-l' : 'ch-fore-r';
    return `
      <g class="ch-arm-${side}">
        <path d="M ${sx - 17} ${shoulderY + 2} C ${sx - 20} ${shoulderY + 42} ${ex - 13} ${elbowY - 34} ${ex - 10} ${elbowY} L ${ex + 10} ${elbowY} C ${ex + 13} ${elbowY - 34} ${sx + 17} ${shoulderY + 42} ${sx + 17} ${shoulderY + 2} Z" fill="${sleeveColor}" stroke="${spec.dressShade}" stroke-width="1.2" stroke-opacity=".4"/>
        <path d="M ${sx - 15} ${shoulderY + 4} C ${sx - 7} ${shoulderY + 12} ${sx + 7} ${shoulderY + 12} ${sx + 15} ${shoulderY + 4}" fill="none" stroke="${spec.dressShade}" stroke-width="1.8" opacity=".3"/>
        <path d="M ${sx - 7} ${shoulderY + 22} C ${sx - 10} ${shoulderY + 48} ${ex - 5} ${elbowY - 28} ${ex - 4} ${elbowY - 12}" fill="none" stroke="${spec.trim}" stroke-width="1.4" opacity=".18"/>
        <g class="${forearmClass}">
          <path d="M ${ex - 9} ${elbowY - 2} C ${ex - 8} ${elbowY + 34} ${hx - 7} ${handY - 34} ${hx - 7} ${handY - 10} L ${hx + 8} ${handY - 10} C ${hx + 8} ${handY - 34} ${ex + 8} ${elbowY + 34} ${ex + 9} ${elbowY - 2} Z" fill="${sleeveColor}" stroke="${spec.dressShade}" stroke-width="1.1" stroke-opacity=".35"/>
          <path d="M ${ex - 5} ${elbowY + 16} C ${ex - 4} ${elbowY + 46} ${hx - 3} ${handY - 40} ${hx - 3} ${handY - 16}" fill="none" stroke="${spec.trim}" stroke-width="1.4" opacity=".16"/>
          <path d="M ${hx - 13} ${handY - 18} Q ${hx} ${handY - 24} ${hx + 13} ${handY - 18} L ${hx + 13} ${handY - 10} Q ${hx} ${handY - 5} ${hx - 13} ${handY - 10} Z" fill="${cuffColor}" opacity=".78"/>
          <path d="M ${hx - 11} ${handY - 8} C ${hx - 16} ${handY + 8} ${hx - 13} ${handY + 24} ${hx - 3} ${handY + 28} C ${hx + 8} ${handY + 26} ${hx + 13} ${handY + 12} ${hx + 10} ${handY + 1} C ${hx + 5} ${handY - 5} ${hx - 5} ${handY - 6} ${hx - 11} ${handY - 8} Z" fill="${spec.skin}" stroke="${spec.skinShade}" stroke-width=".8" stroke-opacity=".4"/>
          <path d="M ${hx - 8} ${handY + 2} C ${hx - 4} ${handY + 4} ${hx + 3} ${handY + 4} ${hx + 7} ${handY} " fill="none" stroke="${spec.skinShade}" stroke-width="1.4" opacity=".55"/>
          <path d="M ${hx - 7} ${handY + 10} C ${hx - 2} ${handY + 12} ${hx + 4} ${handY + 11} ${hx + 7} ${handY + 7}" fill="none" stroke="${spec.skinShade}" stroke-width="1.3" opacity=".45"/>
          <path d="M ${hx - 2} ${handY + 18} C ${hx + 1} ${handY + 21} ${hx + 5} ${handY + 20} ${hx + 7} ${handY + 16}" fill="none" stroke="${spec.skinShade}" stroke-width="1.2" opacity=".35"/>
          <path d="M ${hx - 11} ${handY - 1} C ${hx - 16} ${handY + 4} ${hx - 17} ${handY + 10} ${hx - 13} ${handY + 14}" fill="none" stroke="${spec.skinShade}" stroke-width="1.3" opacity=".45"/>
        </g>
      </g>`;
  };

  const headContent = back
    ? `${backHead}${hairBack}${ears}${cap}${rim}
       <path d="M -30 68 C -12 78 12 78 30 68" fill="none" stroke="${spec.skinShade}" stroke-width="2" opacity=".3"/>
       <path d="M -40 -60 C -20 -82 20 -84 40 -62" fill="none" stroke="#f0d1ac" stroke-width="2.2" opacity=".12"/>`
    : `${hairBack}${ears}${face}${beard}${eyes}${brows}${nose}${mouth}${hairFront}${glasses}${cap}${rim}`;

  return `
    <div class="actor-root" data-character="${spec.character}" data-variant="${escapeAttr(spec.character)}">
      <svg class="character-svg" viewBox="0 0 400 800" role="img" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
        <defs>
          ${headGradient}
          ${neckGradient}
          ${hairGradient}
          ${dressGradient}
          ${skinShadow}
          ${faceLight}
          ${faceSide}
          <filter id="${uid}-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12"/>
          </filter>
          <filter id="${uid}-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2"/>
          </filter>
        </defs>
        <g class="ch-root">
          <ellipse class="ch-shadow" cx="200" cy="${hemY + 2}" rx="${female ? 118 : 82}" ry="18" fill="#000" opacity=".32" filter="url(#${uid}-shadow)"/>
          <g class="ch-skirt">${skirt}</g>
          <g class="ch-torso">
            ${torsoShadow}
            ${torso}
            ${sash}
            ${arm('l')}
            ${arm('r')}
            ${neck}
            ${collar}
            ${epaulettes}
            ${medals}
            ${fur}
            ${cameo}
            <g class="ch-head" transform="translate(200 ${headY}) scale(${headScale})">
              ${headContent}
            </g>
          </g>
        </g>
      </svg>
    </div>`;
}

export interface CharacterRenderState {
  time: number;
  pose: PoseParams;
  expression: ExpressionParams;
  gaze: { x: number; y: number };
  seed: number;
}

export interface CharacterRendererOptions {
  back?: boolean;
}

export class CharacterRenderer {
  readonly element: HTMLDivElement;
  private readonly spec: CharacterSpec;
  private readonly uid: string;
  private readonly head: SVGGElement;
  private readonly torso: SVGGElement;
  private readonly skirt: SVGGElement;
  private readonly armL: SVGGElement;
  private readonly armR: SVGGElement;
  private readonly foreL: SVGGElement;
  private readonly foreR: SVGGElement;
  private readonly eyeL: SVGGElement | null;
  private readonly eyeR: SVGGElement | null;
  private readonly pupilL: SVGGElement | null;
  private readonly pupilR: SVGGElement | null;
  private readonly browL: SVGPathElement | null;
  private readonly browR: SVGPathElement | null;
  private readonly mouthInner: SVGPathElement | null;
  private readonly mouthLip: SVGPathElement | null;
  private readonly mouthLine: SVGPathElement | null;
  private readonly lowerLip: SVGPathElement | null;
  private readonly isSilhouette: boolean;
  private readonly isBack: boolean;
  private readonly headY: number;
  private readonly headScale: number;
  private readonly shoulderY: number;
  private readonly waistY: number;
  private readonly elbowY: number;

  constructor(spec: CharacterSpec, options: CharacterRendererOptions = {}) {
    this.spec = spec;
    this.isSilhouette = spec.body === 'silhouette';
    this.isBack = Boolean(options.back);
    this.uid = `ch${++uidCounter}`;
    this.headY = spec.body === 'child' ? 250 : 148;
    this.headScale = spec.body === 'child' ? 0.98 : 0.9;
    this.shoulderY = spec.body === 'child' ? 362 : 286;
    this.waistY = spec.body === 'child' ? 464 : 432;
    this.elbowY = this.shoulderY + 104;
    this.element = document.createElement('div');
    this.element.className = 'actor';
    this.element.dataset.character = spec.character;
    this.element.innerHTML = buildMarkup(spec, this.uid, this.isBack);
    const q = <T extends Element>(selector: string): T => {
      const node = this.element.querySelector<T>(selector);
      if (!node) throw new Error(`Character part not found: ${selector}`);
      return node;
    };
    const qOpt = <T extends Element>(selector: string): T | null => this.element.querySelector<T>(selector);
    this.head = q('.ch-head');
    this.torso = q('.ch-torso');
    this.skirt = q('.ch-skirt');
    this.armL = q('.ch-arm-l');
    this.armR = q('.ch-arm-r');
    this.foreL = q('.ch-fore-l');
    this.foreR = q('.ch-fore-r');
    this.eyeL = qOpt('.ch-eye-l');
    this.eyeR = qOpt('.ch-eye-r');
    this.pupilL = qOpt('.ch-pupil-l');
    this.pupilR = qOpt('.ch-pupil-r');
    this.browL = qOpt('.ch-brow-l');
    this.browR = qOpt('.ch-brow-r');
    this.mouthInner = qOpt('.ch-mouth-inner');
    this.mouthLip = qOpt('.ch-mouth-lip');
    this.mouthLine = qOpt('.ch-mouth-line');
    this.lowerLip = qOpt('.ch-lower-lip');
  }

  get id(): string {
    return this.spec.character;
  }

  render(state: CharacterRenderState): void {
    const { time, pose, expression, gaze, seed } = state;
    const breath = Math.sin(time * 1.55 + seed * 2.3) * 1.2;
    const sway = Math.sin(time * 0.72 + seed * 1.7) * 0.7;
    const blinkPhase = (time * 1.0 + seed * 1.37) % 5.4;
    const blink = blinkPhase < 0.11 ? 0.06 : blinkPhase < 0.2 ? 0.35 : 1;
    const eyeOpen = Math.max(0.05, expression.eyeOpen * blink);
    const lean = pose.lean + sway * 0.25;
    const headShift = gaze.x * 0.8;
    this.torso.setAttribute(
      'transform',
      `rotate(${lean.toFixed(3)} 200 ${this.waistY}) translate(0 ${(pose.bodyY + breath).toFixed(3)})`
    );
    this.head.setAttribute(
      'transform',
      `translate(${(200 + headShift).toFixed(2)} ${this.headY}) scale(${this.headScale}) rotate(${(pose.head + expression.headTilt + sway * 0.35).toFixed(3)})`
    );
    this.armL.setAttribute('transform', `rotate(${pose.armL.toFixed(3)} 148 ${this.shoulderY})`);
    this.armR.setAttribute('transform', `rotate(${pose.armR.toFixed(3)} 252 ${this.shoulderY})`);
    this.foreL.setAttribute('transform', `rotate(${pose.elbowL.toFixed(3)} 130 ${this.elbowY})`);
    this.foreR.setAttribute('transform', `rotate(${pose.elbowR.toFixed(3)} 270 ${this.elbowY})`);
    this.skirt.setAttribute('transform', `rotate(${(sway + pose.step).toFixed(3)} 200 ${this.waistY})`);
    if (!this.isSilhouette && !this.isBack) {
      const leftEyeTransform = `translate(-18 ${-8}) scale(1 ${eyeOpen.toFixed(3)}) translate(18 8)`;
      const rightEyeTransform = `translate(18 ${-8}) scale(1 ${eyeOpen.toFixed(3)}) translate(-18 8)`;
      this.eyeL?.setAttribute('transform', leftEyeTransform);
      this.eyeR?.setAttribute('transform', rightEyeTransform);
      const gx = Math.max(-4, Math.min(4, gaze.x));
      const gy = Math.max(-3, Math.min(3, gaze.y));
      this.pupilL?.setAttribute('transform', `translate(${gx.toFixed(2)} ${gy.toFixed(2)})`);
      this.pupilR?.setAttribute('transform', `translate(${gx.toFixed(2)} ${gy.toFixed(2)})`);
      this.browL?.setAttribute(
        'transform',
        `rotate(${(-expression.brow * 0.65).toFixed(2)} -4 -26) translate(0 ${(-expression.browRaise).toFixed(2)})`
      );
      this.browR?.setAttribute(
        'transform',
        `rotate(${(expression.brow * 0.65).toFixed(2)} 4 -26) translate(0 ${(-expression.browRaise).toFixed(2)})`
      );
      const my = 38;
      const width = 24 + expression.mouthWidth;
      const curve = expression.mouthCurve;
      const open = Math.max(0, expression.mouthOpen);
      const lipPath = `M ${-width} ${my - 1} Q 0 ${my - 2.2 + curve * 0.35} ${width} ${my - 1} Q 0 ${my + 1.2 + curve * 0.3} ${-width} ${my - 1} Z`;
      const innerPath = `M ${-width * 0.72} ${my + 0.2} Q 0 ${my + 0.8 + curve * 0.2} ${width * 0.72} ${my + 0.2} Q 0 ${my + 1.4 + open * 2.1 + curve * 0.2} ${-width * 0.72} ${my + 0.2} Z`;
      const linePath = `M ${-width * 0.84} ${my + 0.6} Q 0 ${my + 1.8 + curve * 0.22} ${width * 0.84} ${my + 0.6}`;
      const lowerPath = `M ${-width * 0.78} ${my + 1.2} Q 0 ${my + 2.3 + curve * 0.24} ${width * 0.78} ${my + 1.2} Q 0 ${my + 5.2 + open * 0.6} ${-width * 0.78} ${my + 1.2} Z`;
      this.mouthLip?.setAttribute('d', lipPath);
      this.mouthInner?.setAttribute('d', innerPath);
      this.mouthInner?.setAttribute('opacity', open > 0.8 ? Math.min(0.8, 0.18 + open * 0.17).toFixed(2) : '0');
      this.mouthLine?.setAttribute('d', linePath);
      this.lowerLip?.setAttribute('d', lowerPath);
    }
  }
}
