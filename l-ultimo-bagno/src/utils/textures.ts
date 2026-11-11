import * as THREE from 'three';

export interface SignTextureOptions {
  text: string;
  subtext?: string;
  background?: string;
  foreground?: string;
  border?: string;
  width?: number;
  height?: number;
  font?: string;
  subFont?: string;
  grain?: boolean;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function makeSignTexture(options: SignTextureOptions): THREE.CanvasTexture {
  const {
    text,
    subtext = '',
    background = '#17150f',
    foreground = '#f4e3c3',
    border = 'rgba(244, 227, 195, 0.65)',
    width = 512,
    height = 256,
    font = '600 64px "Palatino Linotype", Palatino, Georgia, serif',
    subFont = '500 30px "Avenir Next", Avenir, Helvetica, sans-serif',
    grain = true,
  } = options;

  const key = JSON.stringify(options);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) {
    const fallback = new THREE.CanvasTexture(canvas);
    textureCache.set(key, fallback);
    return fallback;
  }

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  if (grain) {
    const random = (() => {
      let seed = 0x2f6e2b1;
      return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
    })();
    for (let index = 0; index < 260; index += 1) {
      context.fillStyle = `rgba(255,255,255,${random() * 0.035})`;
      context.fillRect(random() * width, random() * height, 2 + random() * 3, 1);
    }
  }

  context.strokeStyle = border;
  context.lineWidth = Math.max(3, width * 0.012);
  const inset = Math.max(12, width * 0.035);
  context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = foreground;
  context.font = font;

  const maxWidth = width - inset * 4;
  let measured = context.measureText(text);
  let fontSize = 64;
  while (measured.width > maxWidth && fontSize > 16) {
    fontSize -= 2;
    context.font = font.replace(/\d+px/, `${fontSize}px`);
    measured = context.measureText(text);
  }

  const textY = subtext ? height * 0.43 : height * 0.5;
  context.fillText(text, width / 2, textY);

  if (subtext) {
    context.fillStyle = foreground;
    context.globalAlpha = 0.72;
    context.font = subFont;
    context.fillText(subtext, width / 2, height * 0.68);
    context.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function makeGlowTexture(color = '#ffcf8a'): THREE.CanvasTexture {
  const key = `glow:${color}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.18, color);
    gradient.addColorStop(0.55, 'rgba(255, 190, 110, 0.22)');
    gradient.addColorStop(1, 'rgba(255, 170, 80, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function makeStarTexture(): THREE.CanvasTexture {
  const key = 'star-dot';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 32;
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 250, 235, 1)');
    gradient.addColorStop(0.35, 'rgba(255, 245, 220, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 240, 210, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function disposeTextureCache(): void {
  for (const texture of textureCache.values()) texture.dispose();
  textureCache.clear();
}
