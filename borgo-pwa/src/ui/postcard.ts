import { t } from '../data/strings';
import type { Language } from '../data/types';

/**
 * Turns the current 3D view into a paper postcard. The game canvas itself is
 * already free of the DOM HUD, so this only adds the printed border and title.
 */
export function createPostcard(
  source: HTMLCanvasElement,
  title: string,
  lang: Language,
  takenAt = Date.now()
): string {
  const width = 960;
  const height = 640;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return source.toDataURL('image/jpeg', 0.85);

  ctx.fillStyle = '#f2e6ce';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#c9a66f';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  ctx.fillStyle = '#2b2118';
  ctx.fillRect(56, 56, 848, 484);

  const imageArea = { x: 64, y: 64, w: 832, h: 468 };
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  if (sourceWidth > 0 && sourceHeight > 0) {
    const scale = Math.max(imageArea.w / sourceWidth, imageArea.h / sourceHeight);
    const sw = imageArea.w / scale;
    const sh = imageArea.h / scale;
    const sx = (sourceWidth - sw) / 2;
    const sy = (sourceHeight - sh) / 2;
    ctx.drawImage(source, sx, sy, sw, sh, imageArea.x, imageArea.y, imageArea.w, imageArea.h);
  }

  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 3;
  ctx.strokeRect(imageArea.x, imageArea.y, imageArea.w, imageArea.h);

  let titleSize = 30;
  ctx.fillStyle = '#3a2f23';
  do {
    ctx.font = `italic ${titleSize}px Georgia, "Times New Roman", serif`;
    titleSize -= 1;
  } while (titleSize > 18 && ctx.measureText(title).width > 690);
  ctx.fillText(title, 64, 580);

  ctx.fillStyle = 'rgba(58,47,35,0.72)';
  ctx.font = '600 13px Georgia, "Times New Roman", serif';
  ctx.fillText(t('photoPostcardSubtitle', lang), 64, 608);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(58,47,35,0.7)';
  ctx.font = '700 12px Georgia, "Times New Roman", serif';
  ctx.fillText('BORGO SAN DONNINO', 896, 580);
  ctx.font = 'italic 12px Georgia, "Times New Roman", serif';
  ctx.fillText(
    new Date(takenAt).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB'),
    896,
    608
  );

  return canvas.toDataURL('image/jpeg', 0.86);
}
