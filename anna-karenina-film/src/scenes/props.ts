import type { PropId } from '../data/types';

export interface PropView {
  id: PropId;
  element: HTMLDivElement;
  width: number;
  height: number;
}

const VIEWBOXES: Record<PropId, [number, number]> = {
  horse: [900, 560],
  toyTrain: [280, 180],
  redGlove: [220, 180],
  closedDoor: [520, 920],
  babyBundle: [220, 190],
  suitcase: [300, 210]
};

function svg(id: PropId, inner: string): string {
  const [w, h] = VIEWBOXES[id];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${inner}</svg>`;
}

function markup(id: PropId): string {
  switch (id) {
    case 'redGlove':
      return svg(
        id,
        `<defs>
          <radialGradient id="glove-g" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#b43a48"/><stop offset="1" stop-color="#64121d"/></radialGradient>
          <filter id="glove-shadow"><feGaussianBlur stdDeviation="8"/></filter>
        </defs>
        <ellipse cx="110" cy="150" rx="82" ry="18" fill="#05070b" opacity=".45" filter="url(#glove-shadow)"/>
        <path d="M 60 142 C 48 112 58 82 82 70 C 104 58 132 64 148 84 C 162 102 158 126 144 140 C 128 154 78 160 60 142 Z" fill="url(#glove-g)"/>
        <path d="M 84 72 C 70 55 72 36 84 30 C 94 25 104 34 106 48 L 108 68 Z" fill="#8b2533"/>
        <path d="M 108 68 C 108 47 118 33 130 38 C 140 43 138 60 130 74 Z" fill="#7a1e2b"/>
        <path d="M 84 118 C 103 126 128 122 144 108" fill="none" stroke="#3d0a10" stroke-width="3" opacity=".5"/>
        <path d="M 68 104 C 85 110 102 108 116 98" fill="none" stroke="#d77a80" stroke-width="2.5" opacity=".3"/>
        <path d="M 52 142 C 82 152 130 152 154 136" fill="none" stroke="#e0c8b1" stroke-width="3" opacity=".4"/>`
      );
    case 'toyTrain':
      return svg(
        id,
        `<defs><linearGradient id="toy-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6b3e"/><stop offset="1" stop-color="#5c3820"/></linearGradient></defs>
        <ellipse cx="140" cy="160" rx="100" ry="12" fill="#05070b" opacity=".3"/>
        <rect x="56" y="86" width="148" height="48" rx="12" fill="url(#toy-wood)"/>
        <rect x="70" y="60" width="58" height="34" rx="8" fill="#7a4c2a"/>
        <rect x="80" y="44" width="26" height="22" rx="4" fill="#5c3820"/>
        <path d="M 80 44 L 93 28 L 106 44 Z" fill="#3b2415"/>
        <rect x="146" y="66" width="42" height="28" rx="6" fill="#b88a55"/>
        <circle cx="84" cy="138" r="16" fill="#2a1a10"/>
        <circle cx="84" cy="138" r="8" fill="#c8a15b"/>
        <circle cx="158" cy="138" r="16" fill="#2a1a10"/>
        <circle cx="158" cy="138" r="8" fill="#c8a15b"/>
        <path d="M 66 104 L 194 104" stroke="#e0c08a" stroke-width="2" opacity=".35"/>
        <path d="M 192 70 C 204 56 216 62 218 76" fill="none" stroke="#c8a15b" stroke-width="3" opacity=".45"/>`
      );
    case 'closedDoor':
      return svg(
        id,
        `<defs><linearGradient id="door-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#271b13"/><stop offset="1" stop-color="#0c0806"/></linearGradient></defs>
        <rect x="20" y="20" width="480" height="900" fill="#0a0705"/>
        <rect x="38" y="38" width="444" height="862" fill="url(#door-g)" stroke="#7d6744" stroke-width="6" opacity=".95"/>
        <rect x="70" y="80" width="170" height="760" fill="none" stroke="#6f5b3d" stroke-width="4" opacity=".3"/>
        <rect x="280" y="80" width="170" height="760" fill="none" stroke="#6f5b3d" stroke-width="4" opacity=".3"/>
        <circle cx="258" cy="470" r="12" fill="#b08a4f" opacity=".8"/>
        <circle cx="262" cy="500" r="5" fill="#b08a4f" opacity=".6"/>
        <path d="M 258 470 L 258 540" stroke="#8b6c3b" stroke-width="4" opacity=".5"/>
        <rect x="20" y="20" width="480" height="18" fill="#7d6744" opacity=".25"/>`
      );
    case 'babyBundle':
      return svg(
        id,
        `<defs><radialGradient id="bundle-g" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#f0e7d7"/><stop offset="1" stop-color="#c9b9a2"/></radialGradient></defs>
        <ellipse cx="110" cy="172" rx="85" ry="12" fill="#05070b" opacity=".25"/>
        <path d="M 45 150 C 38 104 62 62 112 54 C 160 48 190 82 186 124 C 182 156 142 176 100 172 C 72 170 50 162 45 150 Z" fill="url(#bundle-g)"/>
        <ellipse cx="118" cy="90" rx="34" ry="40" fill="#e7d7c2"/>
        <path d="M 92 76 C 104 64 130 64 144 76" fill="none" stroke="#b49b7f" stroke-width="3" opacity=".5"/>
        <path d="M 100 96 C 108 102 118 102 126 96" fill="none" stroke="#a98f76" stroke-width="2.5" opacity=".6"/>
        <path d="M 54 132 C 92 144 144 144 180 126" fill="none" stroke="#bda98e" stroke-width="3" opacity=".55"/>
        <path d="M 68 144 C 110 156 154 152 178 138" fill="none" stroke="#e6d8c4" stroke-width="2" opacity=".5"/>`
      );
    case 'suitcase':
      return svg(
        id,
        `<defs><linearGradient id="case-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a24"/><stop offset="1" stop-color="#2a1a10"/></linearGradient></defs>
        <ellipse cx="150" cy="196" rx="116" ry="12" fill="#05070b" opacity=".3"/>
        <rect x="34" y="76" width="232" height="116" rx="14" fill="url(#case-g)" stroke="#8d6b3e" stroke-width="4"/>
        <path d="M 86 76 L 86 58 C 86 40 214 40 214 58 L 214 76" fill="none" stroke="#8d6b3e" stroke-width="8"/>
        <path d="M 34 116 L 266 116" stroke="#a57d4a" stroke-width="3" opacity=".4"/>
        <rect x="132" y="104" width="36" height="28" rx="5" fill="#a57d4a" opacity=".65"/>
        <circle cx="150" cy="118" r="5" fill="#2a1a10"/>
        <path d="M 54 90 L 54 180 M 246 90 L 246 180" stroke="#c8a15b" stroke-width="2" opacity=".25"/>`
      );
    case 'horse':
      return svg(
        id,
        `<defs>
          <filter id="horse-shadow"><feGaussianBlur stdDeviation="14"/></filter>
          <linearGradient id="horse-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#211a15"/><stop offset="1" stop-color="#080605"/></linearGradient>
        </defs>
        <ellipse cx="450" cy="500" rx="300" ry="34" fill="#05070b" opacity=".45" filter="url(#horse-shadow)"/>
        <g class="horse-body">
          <path d="M 170 330 C 250 230 390 210 530 240 C 620 210 710 240 760 300 C 800 350 790 410 750 440 L 670 448 C 640 380 570 350 490 365 C 420 380 360 420 330 480 L 250 480 C 235 420 210 370 170 330 Z" fill="url(#horse-g)"/>
          <path d="M 720 260 C 720 205 770 170 820 190 C 858 206 866 246 844 280 L 790 320 Z" fill="#1a1410"/>
          <path d="M 792 178 L 830 115 L 852 130 L 824 208 Z" fill="#1a1410"/>
          <path d="M 754 156 C 768 142 790 146 800 160" fill="none" stroke="#c8a15b" stroke-width="4" opacity=".3"/>
          <path d="M 300 365 C 250 340 220 300 230 250" fill="none" stroke="#1a1410" stroke-width="24" stroke-linecap="round"/>
          <path d="M 560 300 C 590 340 620 350 660 330" fill="none" stroke="#c8a15b" stroke-width="3" opacity=".25"/>
        </g>
        <g class="horse-leg horse-leg-a"><path d="M 300 440 L 270 520 L 235 540" fill="none" stroke="#15100d" stroke-width="26" stroke-linecap="round"/></g>
        <g class="horse-leg horse-leg-b"><path d="M 390 440 L 395 535 L 365 555" fill="none" stroke="#15100d" stroke-width="26" stroke-linecap="round"/></g>
        <g class="horse-leg horse-leg-c"><path d="M 620 440 L 635 535 L 665 555" fill="none" stroke="#15100d" stroke-width="26" stroke-linecap="round"/></g>
        <g class="horse-leg horse-leg-d"><path d="M 700 420 L 745 515 L 775 530" fill="none" stroke="#15100d" stroke-width="26" stroke-linecap="round"/></g>
        <path d="M 830 200 C 880 180 930 200 950 250" fill="none" stroke="#15100d" stroke-width="10" opacity=".8"/>`
      );
  }
}

export function createProp(id: PropId): PropView {
  const [w, h] = VIEWBOXES[id];
  const element = document.createElement('div');
  element.className = `scene-prop prop-${id}`;
  element.dataset.prop = id;
  element.style.width = `${w}px`;
  element.style.height = `${h}px`;
  element.innerHTML = markup(id);
  return { id, element, width: w, height: h };
}

export function renderProp(
  view: PropView,
  x: number,
  y: number,
  scale: number,
  opacity: number,
  time: number
): void {
  const w = view.width * scale;
  const h = view.height * scale;
  view.element.style.width = `${view.width}px`;
  view.element.style.height = `${view.height}px`;
  view.element.style.transform = `translate(${x - w / 2}px, ${y - h}px) scale(${scale})`;
  view.element.style.transformOrigin = '0 0';
  view.element.style.opacity = `${opacity}`;
  if (view.id === 'horse') {
    const legs = view.element.querySelectorAll<SVGGElement>('.horse-leg');
    legs.forEach((leg, i) => {
      const angle = Math.sin(time * 7 + i * Math.PI * 0.72) * 18;
      leg.setAttribute('transform', `rotate(${angle.toFixed(2)} 0 0)`);
    });
    const body = view.element.querySelector<SVGGElement>('.horse-body');
    if (body) body.setAttribute('transform', `translate(0 ${(Math.sin(time * 7) * 4).toFixed(2)})`);
  }
}
