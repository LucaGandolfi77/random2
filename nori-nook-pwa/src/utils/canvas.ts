import { recipeById } from '@/data/recipes';
import { ingredientById } from '@/data/ingredients';

export type StudioBackground = 'cream' | 'sakura' | 'matcha' | 'midnight' | 'coastal' | 'autumn' | 'winter';

export interface ExportPlacement {
  id: string;
  kind: 'sushi' | 'decor';
  recipeId?: string;
  deco?: 'flower' | 'leaf' | 'sesame' | 'ginger';
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const backgrounds: Record<StudioBackground, { top: string; bottom: string; accent: string; ink: string }> = {
  cream: { top: '#F7F1E5', bottom: '#EDE1CE', accent: '#A7B99A', ink: '#393A36' },
  sakura: { top: '#FBF0F1', bottom: '#F2D5DA', accent: '#EF9D91', ink: '#393A36' },
  matcha: { top: '#EFF3EA', bottom: '#DCE6D4', accent: '#607B62', ink: '#393A36' },
  midnight: { top: '#2F332F', bottom: '#20231F', accent: '#F4C36B', ink: '#F7F1E5' },
  coastal: { top: '#EAF3F5', bottom: '#C9E2E8', accent: '#5C8B9A', ink: '#393A36' },
  autumn: { top: '#FBEFDF', bottom: '#F0D2B2', accent: '#B9715F', ink: '#393A36' },
  winter: { top: '#EEF4F5', bottom: '#D6E4E8', accent: '#8FAEB8', ink: '#393A36' },
};

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawFace = (ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) => {
  ctx.fillStyle = '#393A36';
  ctx.beginPath();
  ctx.arc(x - 5 * scale, y, 2 * scale, 0, Math.PI * 2);
  ctx.arc(x + 5 * scale, y, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#393A36';
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.arc(x, y + 2 * scale, 4 * scale, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(239,157,145,.45)';
  ctx.beginPath();
  ctx.ellipse(x - 11 * scale, y + 4 * scale, 3 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 11 * scale, y + 4 * scale, 3 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawSushi = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, recipeId?: string) => {
  const recipe = recipeId ? recipeById(recipeId) : undefined;
  const rice =
    recipe?.ingredients
      .map((item) => ingredientById(item.id))
      .find((item) => item?.category === 'rice')?.color ?? '#FFFDF7';
  const fish =
    recipe?.ingredients
      .map((item) => ingredientById(item.id))
      .find((item) => item && ['fish', 'premium'].includes(item.category))?.color ?? '#EF9D91';
  const nori = recipe?.ingredients.some((item) => item.id === 'nori') ?? false;
  const category = recipe?.category ?? 'nigiri';
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(57,58,54,.12)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.36, size * 0.55, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (category === 'maki' || category === 'roll') {
    const rolls = category === 'roll' ? 3 : 2;
    for (let index = 0; index < rolls; index += 1) {
      const offset = (index - (rolls - 1) / 2) * size * 0.3;
      ctx.fillStyle = '#393A36';
      ctx.beginPath();
      ctx.arc(offset, 0, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rice;
      ctx.beginPath();
      ctx.arc(offset, 0, size * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fish;
      ctx.beginPath();
      ctx.arc(offset, 0, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    drawFace(ctx, 0, -size * 0.02, size / 90);
  } else if (category === 'bowl') {
    ctx.fillStyle = '#80614E';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.08, size * 0.42, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rice;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.02, size * 0.38, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fish;
    ctx.beginPath();
    ctx.arc(-size * 0.15, -size * 0.04, size * 0.07, 0, Math.PI * 2);
    ctx.arc(size * 0.1, -size * 0.08, size * 0.06, 0, Math.PI * 2);
    ctx.arc(size * 0.2, 0, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    drawFace(ctx, 0, 0, size / 90);
  } else {
    ctx.fillStyle = rice;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.1, size * 0.34, size * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fish;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.06, size * 0.38, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    if (nori) {
      ctx.fillStyle = '#393A36';
      roundRect(ctx, -size * 0.08, -size * 0.18, size * 0.16, size * 0.3, size * 0.03);
      ctx.fill();
    }
    drawFace(ctx, 0, -size * 0.03, size / 90);
  }
  ctx.restore();
};

const drawDeco = (ctx: CanvasRenderingContext2D, x: number, y: number, deco: ExportPlacement['deco']) => {
  ctx.save();
  ctx.translate(x, y);
  if (deco === 'flower') {
    ctx.fillStyle = '#EBC6CB';
    for (let index = 0; index < 5; index += 1) {
      ctx.beginPath();
      ctx.ellipse(0, -10, 6, 9, (index / 5) * Math.PI * 2, 0, Math.PI * 2);
      ctx.rotate((Math.PI * 2) / 5);
      ctx.fill();
    }
    ctx.fillStyle = '#F4C36B';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (deco === 'leaf') {
    ctx.fillStyle = '#8FBF8F';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 14, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (deco === 'ginger') {
    ctx.fillStyle = '#F4C3A5';
    ctx.beginPath();
    ctx.ellipse(-5, 0, 8, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(5, 2, 8, 4, 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#80614E';
    for (let index = 0; index < 6; index += 1) {
      ctx.beginPath();
      ctx.ellipse(-10 + index * 4, Math.sin(index) * 4, 1.7, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

export const renderPlatePng = ({
  background,
  placements,
  title,
}: {
  background: StudioBackground;
  placements: ExportPlacement[];
  title: string;
}): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const palette = backgrounds[background];
  const gradient = ctx.createLinearGradient(0, 0, 640, 480);
  gradient.addColorStop(0, palette.top);
  gradient.addColorStop(1, palette.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 640, 480);

  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 2;
  for (let x = 18; x < 640; x += 36) {
    for (let y = 18; y < 480; y += 36) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(57,58,54,.14)';
  ctx.beginPath();
  ctx.ellipse(320, 298, 218, 102, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFDF7';
  ctx.strokeStyle = 'rgba(57,58,54,.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(320, 278, 216, 100, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F7F1E5';
  ctx.beginPath();
  ctx.ellipse(320, 276, 165, 72, 0, 0, Math.PI * 2);
  ctx.fill();

  placements.forEach((placement) => {
    const px = (placement.x / 100) * 640;
    const py = (placement.y / 100) * 480;
    if (placement.kind === 'sushi') {
      drawSushi(ctx, px, py, 100 * placement.scale, placement.recipeId);
    } else {
      drawDeco(ctx, px, py, placement.deco);
    }
  });

  ctx.fillStyle = palette.ink;
  ctx.font = '600 24px "Zen Maru Gothic", "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.slice(0, 42), 320, 430);
  ctx.font = '700 10px "Nunito", sans-serif';
  ctx.globalAlpha = 0.6;
  ctx.fillText('NORI NOOK · LITTLE SUSHI, BIG DREAMS', 320, 450);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 3;
  roundRect(ctx, 14, 14, 612, 452, 24);
  ctx.stroke();
  return canvas.toDataURL('image/png');
};
