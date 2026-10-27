export type ShareCardOptions = {
  vaultName: string;
  timeMs: number;
  echoes: number;
  parEchoes: number;
  rank: string;
  daily?: { date: string; modifier: string };
  url?: string;
};

const COLORS = {
  ink: '#0B132B',
  deep: '#1C2541',
  slate: '#3A506B',
  bone: '#F4F1DE',
  gold: '#E9C46A',
  alarm: '#E63946',
  ghost: '#5BC0EB',
  green: '#8AC926',
};

export const rankedColor = (rank: string): string => {
  if (rank === 'S') return COLORS.gold;
  if (rank === 'A') return COLORS.green;
  if (rank === 'B') return COLORS.ghost;
  return '#8D99AE';
};

export const buildShareLines = (options: ShareCardOptions): string[] => {
  const seconds = (options.timeMs / 1000).toFixed(2);
  const lines = [
    `CREW OF ONE`,
    options.vaultName,
    `${options.rank} RANK`,
    `${seconds}s · ${options.echoes} echoes · par ${options.parEchoes}`,
  ];
  if (options.daily) {
    lines.push(`DAILY ${options.daily.date} · ${options.daily.modifier.toUpperCase()}`);
  }
  lines.push('THE CREW IS YOU');
  return lines;
};

const drawGhost = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  symbol: number,
): void => {
  ctx.fillStyle = `${color}22`;
  ctx.beginPath();
  ctx.arc(x, y, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = COLORS.ink;
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 4;
  if (symbol % 3 === 0) {
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();
  } else if (symbol % 3 === 1) {
    ctx.beginPath();
    ctx.moveTo(x, y - 17);
    ctx.lineTo(x + 16, y + 12);
    ctx.lineTo(x - 16, y + 12);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x - 13, y - 13, 26, 26);
  }
};

export const renderShareCard = async (options: ShareCardOptions): Promise<Blob | null> => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, 1080, 1080);

  const glow = ctx.createRadialGradient(540, 120, 20, 540, 120, 700);
  glow.addColorStop(0, 'rgba(91,192,235,0.22)');
  glow.addColorStop(1, 'rgba(91,192,235,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.strokeStyle = 'rgba(233,196,106,0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(42, 42, 996, 996);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.bone;
  ctx.font = 'bold 44px ui-monospace, monospace';
  ctx.fillText('CREW OF ONE', 540, 128);

  ctx.fillStyle = COLORS.ghost;
  ctx.font = '22px ui-monospace, monospace';
  ctx.fillText(options.daily ? 'DAILY HEIST COMPLETE' : 'HEIST COMPLETE', 540, 172);

  ctx.fillStyle = rankedColor(options.rank);
  ctx.font = 'bold 250px ui-monospace, monospace';
  ctx.fillText(options.rank, 540, 430);

  ctx.fillStyle = COLORS.bone;
  ctx.font = 'bold 54px ui-monospace, monospace';
  const name = options.vaultName.toUpperCase();
  ctx.fillText(name.length > 22 ? `${name.slice(0, 21)}…` : name, 540, 515);

  ctx.fillStyle = COLORS.deep;
  ctx.fillRect(150, 570, 780, 130);
  ctx.strokeStyle = 'rgba(244,241,222,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(150, 570, 780, 130);

  ctx.fillStyle = COLORS.bone;
  ctx.font = 'bold 46px ui-monospace, monospace';
  ctx.fillText(`${(options.timeMs / 1000).toFixed(2)}s`, 320, 645);
  ctx.fillText(`${options.echoes}E`, 540, 645);
  ctx.fillText(`PAR ${options.parEchoes}`, 760, 645);

  ctx.fillStyle = 'rgba(244,241,222,0.45)';
  ctx.font = '18px ui-monospace, monospace';
  ctx.fillText('TIME', 320, 680);
  ctx.fillText('ECHOES', 540, 680);
  ctx.fillText('PAR', 760, 680);

  for (let index = 0; index < 5; index += 1) {
    drawGhost(ctx, 300 + index * 120, 800, index < options.echoes ? COLORS.ghost : COLORS.slate, index);
  }

  ctx.fillStyle = COLORS.gold;
  ctx.font = '22px ui-monospace, monospace';
  ctx.fillText('THE CREW IS YOU', 540, 920);

  if (options.daily) {
    ctx.fillStyle = 'rgba(168,224,240,0.7)';
    ctx.font = '18px ui-monospace, monospace';
    ctx.fillText(
      `${options.daily.date} · ${options.daily.modifier.toUpperCase()}`,
      540,
      955,
    );
  } else {
    ctx.fillStyle = 'rgba(168,224,240,0.7)';
    ctx.font = '18px ui-monospace, monospace';
    ctx.fillText('A ONE-SCREEN TIME-LOOP HEIST', 540, 955);
  }

  ctx.fillStyle = 'rgba(244,241,222,0.4)';
  ctx.font = '16px ui-monospace, monospace';
  ctx.fillText(options.url ?? 'crew of one', 540, 1002);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
};
