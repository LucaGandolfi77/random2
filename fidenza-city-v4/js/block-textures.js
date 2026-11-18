/**
 * Generatore di texture pixel 16×16 per i blocchi, condiviso da gioco ed
 * editor. Nessuna dipendenza da Three.js: usa solo canvas 2D.
 *
 * Le texture sono pixel art originale del progetto, non asset Mojang.
 */

import {
  baseBlock, blockColor, blockKey, isCropBlock, isGlassBlock, isLeafBlock,
  isLogBlock, isRoofBlock
} from './block-palette.js';

const canvasCache = new Map();
const patternCache = new WeakMap();

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function shade(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function mix(hexA, hexB, t) {
  const [ar, ag, ab] = hexToRgb(hexA);
  const [br, bg, bb] = hexToRgb(hexB);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

export function textureStyleFor(block) {
  let key = blockKey(block);
  if (isRoofBlock(key) || /(_wall|_button|_pressure_plate|_fence|_fence_gate|_sign|_carpet|_banner)$/.test(key)) {
    key = baseBlock(key);
  }
  if (key.endsWith('_glass_pane')) key = key.slice(0, -5);
  if (key.endsWith('_door') || key.endsWith('_trapdoor')) {
    const wood = key.replace(/(_door|_trapdoor)$/, '');
    key = `${wood}_planks`;
  }
  if (isGlassBlock(key)) return 'glass';
  if (isLeafBlock(key)) return 'leaves';
  if (isLogBlock(key)) return 'log';
  if (isCropBlock(key)) return 'crop';
  if (key.includes('stone_brick') || key.includes('stone_bricks') || key.includes('cracked') || key.includes('chiseled_stone')) return 'stone_bricks';
  if (key === 'bricks' || (key.includes('brick') && !key.includes('nether'))) return 'bricks';
  if (key.includes('nether_brick')) return 'bricks';
  if (key.includes('deepslate')) return 'deepslate';
  if (key.includes('cobblestone')) return 'cobblestone';
  if (key.includes('granite')) return key.includes('polished') ? 'polished_granite' : 'granite';
  if (key.includes('andesite')) return key.includes('polished') ? 'polished_stone' : 'andesite';
  if (key.includes('diorite')) return key.includes('polished') ? 'polished_stone' : 'stone';
  if (key.includes('sandstone')) return 'sandstone';
  if (key.includes('concrete_powder')) return 'powder';
  if (key.includes('concrete')) return 'concrete';
  if (key.includes('terracotta')) return 'terracotta';
  if (key.includes('planks') || key === 'scaffolding' || key === 'barrel' || key === 'chest' || key === 'crafting_table') return 'planks';
  if (key.includes('log')) return 'log';
  if (key === 'grass_block') return 'grass';
  if (key === 'farmland') return 'farmland';
  if (['dirt', 'coarse_dirt', 'podzol', 'mud', 'dirt_path', 'soul_soil'].includes(key)) return 'dirt';
  if (key === 'water') return 'water';
  if (key === 'asphalt') return 'asphalt';
  if (key === 'gravel') return 'gravel';
  if (['glowstone', 'lantern', 'sea_lantern', 'end_rod'].includes(key)) return 'glowstone';
  if (['iron_bars', 'iron_block', 'iron_door', 'chain', 'iron_chain', 'rail', 'powered_rail', 'hopper', 'cauldron', 'lever', 'lightning_rod'].includes(key)) return 'metal';
  if (key.includes('wool') || key.includes('carpet')) return 'wool';
  if (key.includes('leaves')) return 'leaves';
  if (key.includes('tulip') || key.includes('poppy') || key.includes('daisy') || key.includes('dandelion') || key.includes('cornflower') || key.includes('allium') || key.includes('bluet') || key.includes('lily') || key.includes('sunflower') || key.includes('rose') || key.includes('peony') || key.includes('lilac')) return 'flower';
  if (key === 'stone' || key === 'smooth_stone' || key === 'calcite' || key === 'tuff') return 'stone';
  return 'stone';
}

function paintTexture(style, color, seed, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rnd = seededRandom(seed);
  const base = color;
  const dark = shade(base, -26);
  const darker = shade(base, -46);
  const light = shade(base, 24);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const speckle = (count, colors, alpha = 0.8) => {
    for (let i = 0; i < count; i++) {
      ctx.globalAlpha = alpha * (0.4 + rnd() * 0.6);
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      const x = Math.floor(rnd() * size);
      const y = Math.floor(rnd() * size);
      const w = 1 + (rnd() > 0.82 ? 1 : 0);
      ctx.fillRect(x, y, w, 1);
    }
    ctx.globalAlpha = 1;
  };
  const border = (alpha = 0.2, borderColor = darker) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
    ctx.globalAlpha = 1;
  };

  switch (style) {
    case 'stone':
      speckle(70, [dark, light, darker], 0.65);
      border(0.18);
      break;
    case 'andesite':
      speckle(90, [dark, light, '#6f6f6f', '#a8a8a3'], 0.55);
      border(0.16);
      break;
    case 'polished_stone':
      speckle(28, [dark, light], 0.35);
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, 2);
      ctx.globalAlpha = 1;
      border(0.14);
      break;
    case 'granite':
      speckle(80, ['#b98272', '#7a4a3d', '#c9a096', '#8f5a4a'], 0.7);
      border(0.2);
      break;
    case 'polished_granite':
      speckle(35, ['#b98272', '#8f5a4a', '#c9a096'], 0.45);
      border(0.15);
      break;
    case 'stone_bricks': {
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, size, size);
      const brickH = size / 4;
      const brickW = size / 2;
      for (let row = 0; row < 4; row++) {
        const offset = row % 2 ? brickW / 2 : 0;
        for (let x = -brickW; x < size + brickW; x += brickW) {
          const px = x + offset;
          const tone = 0.85 + rnd() * 0.3;
          ctx.fillStyle = shade(base, Math.round((tone - 1) * 30));
          ctx.fillRect(px + 1, row * brickH + 1, brickW - 2, brickH - 2);
          if (rnd() > 0.72) {
            ctx.fillStyle = darker;
            ctx.fillRect(px + 2 + rnd() * (brickW - 6), row * brickH + 2 + rnd() * (brickH - 6), 2, 1);
          }
        }
      }
      break;
    }
    case 'bricks': {
      ctx.fillStyle = shade(base, -34);
      ctx.fillRect(0, 0, size, size);
      const brickH = size / 4;
      const brickW = size / 2;
      for (let row = 0; row < 4; row++) {
        const offset = row % 2 ? brickW / 2 : 0;
        for (let x = -brickW; x < size + brickW; x += brickW) {
          const px = x + offset;
          ctx.fillStyle = shade(base, Math.round((rnd() - 0.5) * 22));
          ctx.fillRect(px + 1, row * brickH + 1, brickW - 2, brickH - 2);
        }
      }
      break;
    }
    case 'cobblestone':
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(rnd() * size);
        const y = Math.floor(rnd() * size);
        const w = 2 + Math.floor(rnd() * 4);
        const h = 2 + Math.floor(rnd() * 4);
        ctx.fillStyle = shade(base, Math.round((rnd() - 0.5) * 46));
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = darker;
        ctx.fillRect(x, y + h - 1, w, 1);
      }
      break;
    case 'deepslate':
      speckle(70, [dark, darker, '#5a5a62'], 0.55);
      ctx.fillStyle = '#2d2d33';
      for (let i = 0; i < 4; i++) ctx.fillRect(rnd() * size, rnd() * size, 3, 1);
      break;
    case 'sandstone':
      for (let y = 0; y < size; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? shade(base, -10) : shade(base, 6);
        ctx.fillRect(0, y, size, 3);
      }
      speckle(30, [dark, light], 0.35);
      break;
    case 'concrete':
      speckle(24, [dark, light], 0.22);
      border(0.1);
      break;
    case 'powder':
      speckle(120, [dark, darker, light], 0.55);
      border(0.16);
      break;
    case 'asphalt': {
      ctx.fillStyle = '#5f6366';
      ctx.fillRect(0, 0, size, size);
      speckle(160, ['#54585b', '#6d7174', '#484c4f', '#787c7e'], 0.55);
      // piccole crepe e macchie di usura
      ctx.strokeStyle = 'rgba(35,38,40,.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        let x = rnd() * size;
        let y = rnd() * size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 3; s++) {
          x += (rnd() - 0.5) * 5;
          y += 1 + rnd() * 3;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,32,34,.18)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(rnd() * size, rnd() * size, 2 + rnd() * 4, 1 + rnd() * 2, rnd() * 3.14, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'gravel': {
      ctx.fillStyle = shade(base, -8);
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 70; i++) {
        const tone = 0.75 + rnd() * 0.4;
        ctx.fillStyle = shade(base, Math.round((tone - 1) * 45));
        const w = 1 + Math.floor(rnd() * 2);
        const h = 1 + Math.floor(rnd() * 2);
        ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), w, h);
      }
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#d9d4c9';
      for (let i = 0; i < 18; i++) ctx.fillRect(rnd() * size, rnd() * size, 1, 1);
      ctx.globalAlpha = 1;
      break;
    }
    case 'terracotta':
      speckle(50, [dark, light], 0.3);
      ctx.strokeStyle = shade(base, -18);
      ctx.globalAlpha = 0.3;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
      ctx.globalAlpha = 1;
      break;
    case 'planks':
      for (let y = 0; y < size; y += 4) {
        ctx.fillStyle = shade(base, Math.round((rnd() - 0.5) * 18));
        ctx.fillRect(0, y, size, 3);
        ctx.fillStyle = darker;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(0, y + 3, size, 1);
        ctx.globalAlpha = 1;
        const seam = 3 + Math.floor(rnd() * (size - 6));
        ctx.fillStyle = darker;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(seam, y, 1, 3);
        ctx.globalAlpha = 1;
      }
      speckle(20, [dark, light], 0.3);
      break;
    case 'log': {
      const bark = mix(base, '#3b2b1b', 0.35);
      ctx.fillStyle = bark;
      ctx.fillRect(0, 0, size, size);
      for (let x = 0; x < size; x += 3) {
        ctx.fillStyle = shade(bark, Math.round((rnd() - 0.5) * 30));
        ctx.fillRect(x, 0, 1, size);
      }
      speckle(22, [darker, light], 0.3);
      break;
    }
    case 'leaves':
      ctx.fillStyle = mix(base, '#1f3a18', 0.2);
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 90; i++) {
        const tone = 0.7 + rnd() * 0.55;
        ctx.fillStyle = shade(base, Math.round((tone - 1) * 40));
        const x = Math.floor(rnd() * size);
        const y = Math.floor(rnd() * size);
        ctx.fillRect(x, y, 1 + (rnd() > 0.7 ? 1 : 0), 1 + (rnd() > 0.7 ? 1 : 0));
      }
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#173012';
      for (let i = 0; i < 16; i++) ctx.fillRect(rnd() * size, rnd() * size, 1, 1);
      ctx.globalAlpha = 1;
      break;
    case 'grass':
      ctx.fillStyle = mix(base, '#3f6b2a', 0.25);
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = shade(base, Math.round((rnd() - 0.5) * 34));
        ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1, 1);
      }
      break;
    case 'dirt':
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = shade(base, Math.round((rnd() - 0.5) * 34));
        ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1 + (rnd() > 0.8 ? 1 : 0), 1);
      }
      break;
    case 'farmland':
      ctx.fillStyle = mix(base, '#2f1f12', 0.3);
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 4) {
        ctx.fillStyle = shade(base, 12);
        ctx.fillRect(0, y, size, 1);
        ctx.fillStyle = darker;
        ctx.fillRect(0, y + 2, size, 1);
      }
      break;
    case 'crop':
      ctx.fillStyle = '#5b4326';
      ctx.fillRect(0, 0, size, size);
      for (let x = 1; x < size; x += 3) {
        ctx.fillStyle = '#6f9a3f';
        ctx.fillRect(x, size - 9 - Math.floor(rnd() * 5), 1, 8 + Math.floor(rnd() * 5));
        if (rnd() > 0.5) {
          ctx.fillStyle = base;
          ctx.fillRect(x - 1, size - 11, 3, 3);
        }
      }
      break;
    case 'water':
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const wave = Math.sin((x + y) * 0.8) * 0.5 + Math.sin(x * 1.6 - y * 0.9) * 0.3;
          ctx.fillStyle = shade(base, Math.round(wave * 16));
          ctx.fillRect(x, y, 1, 1);
        }
      }
      break;
    case 'glass':
      ctx.clearRect(0, 0, size, size);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#e8f8ff';
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#cfeef5';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 1, 7);
      ctx.fillRect(5, 2, 1, 5);
      ctx.globalAlpha = 1;
      break;
    case 'glowstone':
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = shade(base, Math.round((rnd() - 0.5) * 42));
        ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1 + (rnd() > 0.8 ? 1 : 0), 1);
      }
      ctx.fillStyle = '#fff2b0';
      for (let i = 0; i < 8; i++) ctx.fillRect(rnd() * size, rnd() * size, 1, 1);
      break;
    case 'metal':
      speckle(30, [dark, light], 0.25);
      ctx.fillStyle = shade(base, -30);
      ctx.fillRect(0, 0, size, 1);
      ctx.fillRect(0, size - 1, size, 1);
      break;
    case 'wool':
      speckle(60, [dark, light], 0.3);
      ctx.globalAlpha = 0.18;
      for (let y = 0; y < size; y += 2) {
        ctx.fillStyle = y % 4 ? dark : light;
        ctx.fillRect(0, y, size, 1);
      }
      ctx.globalAlpha = 1;
      break;
    case 'flower':
      ctx.fillStyle = mix(base, '#2f5a2a', 0.35);
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#5f8f3f';
      ctx.fillRect(size / 2 - 1, size / 2, 2, size / 2);
      ctx.fillStyle = base;
      for (let i = 0; i < 12; i++) {
        ctx.fillRect(3 + Math.floor(rnd() * 10), 3 + Math.floor(rnd() * 7), 2, 2);
      }
      break;
    default:
      speckle(40, [dark, light], 0.4);
      break;
  }
  return canvas;
}

export function createBlockCanvas(block, { size = 16 } = {}) {
  const key = blockKey(block);
  const style = textureStyleFor(key);
  const cacheKey = `${key}:${style}:${size}`;
  if (canvasCache.has(cacheKey)) return canvasCache.get(cacheKey);
  const canvas = paintTexture(style, blockColor(key), hashString(`${key}:${style}`), size);
  canvasCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Crea un CanvasPattern con un blocco largo `blockPixels` pixel sullo schermo.
 * Il pattern è memorizzato per contesto + blocco + dimensione.
 */
export function createBlockPattern(ctx, block, { blockPixels = 32 } = {}) {
  const key = blockKey(block);
  const size = Math.max(4, Math.round(blockPixels));
  let cache = patternCache.get(ctx);
  if (!cache) {
    cache = new Map();
    patternCache.set(ctx, cache);
  }
  const cacheKey = `${key}:${size}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const canvas = createBlockCanvas(key, { size: 16 });
  const pattern = ctx.createPattern(canvas, 'repeat');
  if (pattern?.setTransform) {
    const scale = size / 16;
    pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, 0, 0]));
  }
  cache.set(cacheKey, pattern);
  return pattern;
}

export function clearTextureCaches() {
  canvasCache.clear();
}
