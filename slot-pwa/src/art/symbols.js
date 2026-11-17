/*
 * Vector symbol art. Every machine symbol is drawn from paths so the look is
 * identical on every device and works offline — no emoji font dependency.
 */

const TAU = Math.PI * 2;

const ARCHETYPE = {
  cherry: 'fruit', lemon: 'lemon', orange: 'orange', grape: 'grape',
  candy: 'candy', gummy: 'gummy', icecream: 'icecream',
  coin: 'coin', silver: 'coin', gold: 'coin', pearl: 'coin',
  bell: 'bell', star: 'star', clover: 'clover',
  wild: 'wild', scatter: 'gift', mystery: 'mystery',
  bar: 'bar', seven: 'seven', diamond: 'gem', gem: 'gem',
  ankh: 'ankh', scarab: 'bug', eye: 'eye', pyramid: 'pyramid', crown: 'crown',
  pharaoh: 'crown', moon: 'moon', comet: 'comet', planet: 'planet',
  rocket: 'rocket', ufo: 'ufo', alien: 'alien', lollipop: 'lollipop',
  donut: 'donut', chocolate: 'chocolate', vault: 'vault', lock: 'lock',
  shell: 'shell', fish: 'fish', koi: 'fish', coral: 'coral', crab: 'crab',
  trident: 'trident', treasure: 'key', lantern: 'lantern', fan: 'fan',
  sword: 'sword', armor: 'shield', shrine: 'shrine', oni: 'oni',
  // new themed symbols
  drink: 'drink', olive: 'olive', ice: 'ice', bottle: 'bottle', neon: 'neon',
  bike: 'bike', beer: 'beer', sign: 'sign', ticket: 'ticket', map: 'map',
  ball: 'ball', hoop: 'hoop', jersey: 'jersey', flag: 'flag', sneaker: 'sneaker',
  bunny: 'bunny', carrot: 'carrot', egg: 'egg', tophat: 'tophat',
  lens: 'lens', flower: 'flower', camera: 'camera', mask: 'mask',
  wave: 'wave', sun: 'sun', umbrella: 'umbrella', leaf: 'leaf', key: 'key',
};

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function tile(ctx, x, y, s, color) {
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, color + '55');
  g.addColorStop(1, '#00000055');
  rr(ctx, x, y, s, s, s * 0.16);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = color + 'aa';
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.16, y + s * 0.16);
  ctx.lineTo(x + s * 0.84, y + s * 0.16);
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = s * 0.03;
  ctx.stroke();
}

function circle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function starPath(ctx, cx, cy, outer, inner, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function poly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

const white = '#fff8e8';

function drawArch(ctx, arch, cx, cy, s, color) {
  const u = s / 4;
  switch (arch) {
    case 'fruit': {
      circle(ctx, cx - u * 0.5, cy + u * 0.35, u * 0.72, color);
      circle(ctx, cx + u * 0.6, cy + u * 0.45, u * 0.62, color);
      ctx.strokeStyle = '#7bd66b'; ctx.lineWidth = u * 0.16;
      ctx.beginPath(); ctx.moveTo(cx - u * 0.5, cy - u * 0.3); ctx.quadraticCurveTo(cx, cy - u, cx + u * 0.6, cy - u * 0.2); ctx.stroke();
      circle(ctx, cx - u * 0.75, cy + u * 0.1, u * 0.14, white);
      break;
    }
    case 'lemon': {
      ctx.beginPath();
      ctx.ellipse(cx, cy, u * 1.1, u * 0.72, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy, u * 1.1, u * 0.72, -0.3, -0.5, 0.6);
      ctx.strokeStyle = white; ctx.lineWidth = u * 0.14; ctx.stroke();
      ctx.strokeStyle = '#7bd66b'; ctx.lineWidth = u * 0.16;
      ctx.beginPath(); ctx.moveTo(cx + u * 0.7, cy - u * 0.7); ctx.lineTo(cx + u * 1.2, cy - u * 1.1); ctx.stroke();
      break;
    }
    case 'orange': {
      circle(ctx, cx, cy, u * 0.95, color);
      ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = u * 0.1;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * u * 0.9, cy + Math.sin(a) * u * 0.9); ctx.stroke();
      }
      ctx.strokeStyle = '#7bd66b'; ctx.lineWidth = u * 0.14;
      ctx.beginPath(); ctx.moveTo(cx, cy - u * 0.9); ctx.lineTo(cx + u * 0.3, cy - u * 1.3); ctx.stroke();
      break;
    }
    case 'grape': {
      [[0,-0.5],[-0.55,0],[0.55,0],[0,0.6],[-0.6,0.7],[0.6,0.7],[0,1.05]].forEach(([dx,dy]) =>
        circle(ctx, cx + dx*u*0.55, cy + dy*u*0.65, u*0.42, color));
      ctx.strokeStyle = '#7bd66b'; ctx.lineWidth = u * 0.14;
      ctx.beginPath(); ctx.moveTo(cx, cy - u*0.9); ctx.quadraticCurveTo(cx+u*0.6, cy-u*1.3, cx+u*0.9, cy-u*0.9); ctx.stroke();
      break;
    }
    case 'candy': {
      rr(ctx, cx - u * 0.8, cy - u * 0.4, u * 1.6, u * 0.8, u * 0.2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = white; ctx.lineWidth = u * 0.1; ctx.stroke();
      poly(ctx, [[cx-u*0.8,cy-u*0.4],[cx-u*1.4,cy-u*0.8],[cx-u*1.2,cy],[cx-u*1.4,cy+u*0.8],[cx-u*0.8,cy+u*0.4]], color);
      poly(ctx, [[cx+u*0.8,cy-u*0.4],[cx+u*1.4,cy-u*0.8],[cx+u*1.2,cy],[cx+u*1.4,cy+u*0.8],[cx+u*0.8,cy+u*0.4]], color);
      break;
    }
    case 'gummy': {
      circle(ctx, cx - u*0.45, cy - u*0.5, u*0.45, color);
      circle(ctx, cx + u*0.45, cy - u*0.5, u*0.45, color);
      circle(ctx, cx, cy + u*0.15, u*0.75, color);
      circle(ctx, cx - u*0.25, cy, u*0.08, '#fff');
      circle(ctx, cx + u*0.25, cy, u*0.08, '#fff');
      break;
    }
    case 'coin': {
      circle(ctx, cx, cy, u * 1.15, '#a86b00', color);
      circle(ctx, cx, cy, u * 0.85, color);
      ctx.fillStyle = '#fff6c0'; ctx.font = `bold ${u * 1.1}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', cx, cy + u * 0.05);
      break;
    }
    case 'star': {
      starPath(ctx, cx, cy, u * 1.3, u * 0.6);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = u * 0.1; ctx.stroke();
      break;
    }
    case 'bell': {
      ctx.beginPath();
      ctx.moveTo(cx - u, cy + u * 0.8);
      ctx.quadraticCurveTo(cx - u * 0.9, cy - u * 0.9, cx, cy - u * 1.1);
      ctx.quadraticCurveTo(cx + u * 0.9, cy - u * 0.9, cx + u, cy + u * 0.8);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
      circle(ctx, cx, cy + u, u * 0.22, '#fff6c0');
      break;
    }
    case 'clover': {
      [[-0.5,-0.4],[0.5,-0.4],[-0.5,0.5],[0.5,0.5]].forEach(([dx,dy]) =>
        circle(ctx, cx + dx*u, cy + dy*u, u*0.55, color));
      ctx.strokeStyle = '#7bd66b'; ctx.lineWidth = u*0.16;
      ctx.beginPath(); ctx.moveTo(cx, cy + u*0.6); ctx.lineTo(cx + u*0.2, cy + u*1.3); ctx.stroke();
      break;
    }
    case 'gem': {
      poly(ctx, [[cx,cy-u*1.2],[cx+u*1.1,cy-u*0.2],[cx,cy+u*1.2],[cx-u*1.1,cy-u*0.2]], color, white, u*0.08);
      ctx.beginPath(); ctx.moveTo(cx-u*1.1,cy-u*0.2); ctx.lineTo(cx+u*1.1,cy-u*0.2); ctx.strokeStyle='#ffffff88'; ctx.stroke();
      break;
    }
    case 'wild': {
      rr(ctx, cx-u*0.85, cy-u*1.1, u*1.7, u*2.2, u*0.2);
      ctx.fillStyle = white; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = u*0.12; ctx.stroke();
      ctx.fillStyle = color; ctx.font = `bold ${u*1.5}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('W', cx, cy);
      break;
    }
    case 'gift': {
      rr(ctx, cx-u, cy-u*0.6, u*2, u*1.6, u*0.15);
      ctx.fillStyle = color; ctx.fill();
      rr(ctx, cx-u*1.15, cy-u*1.05, u*2.3, u*0.45, u*0.1);
      ctx.fillStyle = white; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = u*0.16;
      ctx.beginPath(); ctx.moveTo(cx, cy-u); ctx.lineTo(cx, cy+u);
      ctx.moveTo(cx-u*0.6, cy-u); ctx.quadraticCurveTo(cx-u*0.6, cy-u*1.6, cx, cy-u*1.1);
      ctx.quadraticCurveTo(cx+u*0.6, cy-u*1.6, cx+u*0.6, cy-u); ctx.stroke();
      break;
    }
    case 'seven': {
      ctx.fillStyle = color; ctx.font = `900 ${s*0.86}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('7', cx, cy+s*0.04);
      break;
    }
    case 'bar': {
      rr(ctx, cx-u*1.2, cy-u*0.7, u*2.4, u*1.4, u*0.16);
      ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = white; ctx.font = `bold ${u*0.9}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('BAR', cx, cy);
      break;
    }
    case 'crown': {
      poly(ctx, [[cx-u*1.2,cy+u*0.7],[cx-u,cy-u*0.9],[cx,cy-u*0.1],[cx+u,cy-u*0.9],[cx+u*1.2,cy+u*0.7]], color, '#fff6c0', u*0.08);
      break;
    }
    case 'ankh': {
      ctx.strokeStyle = color; ctx.lineWidth = u*0.28;
      ctx.beginPath(); ctx.ellipse(cx, cy-u*0.7, u*0.5, u*0.65, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy-u*0.05); ctx.lineTo(cx, cy+u*1.1);
      ctx.moveTo(cx-u*0.8, cy+u*0.25); ctx.lineTo(cx+u*0.8, cy+u*0.25); ctx.stroke();
      break;
    }
    case 'pyramid': {
      poly(ctx, [[cx,cy-u*1.2],[cx+u*1.2,cy+u*0.9],[cx-u*1.2,cy+u*0.9]], color, white, u*0.08);
      ctx.strokeStyle='#ffffff88'; ctx.beginPath(); ctx.moveTo(cx,cy-u*1.2); ctx.lineTo(cx,cy+u*0.9); ctx.stroke();
      break;
    }
    case 'eye': {
      ctx.beginPath(); ctx.ellipse(cx, cy, u*1.2, u*0.7, 0, 0, Math.PI*2);
      ctx.fillStyle = white; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth=u*0.12; ctx.stroke();
      circle(ctx, cx, cy, u*0.38, color); circle(ctx, cx, cy, u*0.16, '#000');
      break;
    }
    case 'bug': {
      circle(ctx, cx, cy, u*0.8, color);
      ctx.strokeStyle = white; ctx.lineWidth=u*0.1;
      ctx.beginPath(); ctx.moveTo(cx,cy-u*0.8); ctx.lineTo(cx,cy+u*0.8); ctx.stroke();
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.moveTo(cx+dx*u*0.5, cy+dy*u*0.4); ctx.lineTo(cx+dx*u*1.2, cy+dy*u*1.0); ctx.stroke();
      });
      break;
    }
    case 'mystery': {
      rr(ctx, cx-u*0.9, cy-u*1.05, u*1.8, u*2.1, u*0.18);
      ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = white; ctx.font = `900 ${u*1.5}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('?', cx, cy);
      break;
    }
    case 'moon': {
      ctx.beginPath(); ctx.arc(cx, cy, u, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx + u*0.45, cy - u*0.2, u*0.9, 0, Math.PI*2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'planet': {
      circle(ctx, cx, cy, u*0.85, color);
      ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = u*0.16;
      ctx.beginPath(); ctx.ellipse(cx, cy, u*1.35, u*0.4, -0.3, 0, Math.PI*2); ctx.stroke();
      break;
    }
    case 'rocket': {
      poly(ctx, [[cx,cy-u*1.3],[cx+u*0.6,cy+u*0.5],[cx-u*0.6,cy+u*0.5]], color, white, u*0.08);
      ctx.fillStyle = '#ff9f1c'; ctx.font = `${u*0.9}px Arial`; ctx.textAlign='center';
      ctx.fillText('▲', cx, cy+u*0.9);
      break;
    }
    case 'comet': {
      circle(ctx, cx+u*0.4, cy-u*0.4, u*0.5, color);
      ctx.strokeStyle = color; ctx.lineWidth = u*0.2;
      for (let i=-1;i<=1;i++) { ctx.beginPath(); ctx.moveTo(cx+u*0.2, cy-u*0.2); ctx.lineTo(cx-u*1.2, cy+i*u*0.5); ctx.stroke(); }
      break;
    }
    case 'ufo': {
      ctx.beginPath(); ctx.ellipse(cx, cy, u*1.3, u*0.5, 0, 0, Math.PI*2); ctx.fillStyle=color; ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy-u*0.4, u*0.6, u*0.45, 0, 0, Math.PI*2); ctx.fillStyle=white; ctx.fill();
      break;
    }
    case 'alien': {
      ctx.beginPath(); ctx.ellipse(cx, cy, u*0.75, u*1.0, 0, 0, Math.PI*2); ctx.fillStyle=color; ctx.fill();
      circle(ctx, cx-u*0.3, cy-u*0.1, u*0.22, '#000'); circle(ctx, cx+u*0.3, cy-u*0.1, u*0.22, '#000');
      break;
    }
    case 'fish': {
      poly(ctx, [[cx-u,cy],[cx+u*0.6,cy-u*0.7],[cx+u*0.6,cy+u*0.7]], color);
      ctx.beginPath(); ctx.ellipse(cx, cy, u*0.8, u*0.55, 0, 0, Math.PI*2); ctx.fillStyle=color; ctx.fill();
      circle(ctx, cx-u*0.45, cy-u*0.12, u*0.1, '#000');
      break;
    }
    case 'crab': {
      circle(ctx, cx, cy+u*0.2, u*0.8, color);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy]) => {
        ctx.strokeStyle=color; ctx.lineWidth=u*0.15; ctx.beginPath();
        ctx.moveTo(cx+dx*u*0.5, cy+u*0.2); ctx.lineTo(cx+dx*u*1.1, cy+dy*u*0.8); ctx.stroke();
        circle(ctx, cx+dx*u*1.1, cy+dy*u*0.8, u*0.16, color);
      });
      break;
    }
    case 'shell': {
      ctx.beginPath(); ctx.moveTo(cx, cy+u*0.8);
      for (let i=0;i<=8;i++){ const a=Math.PI + i*Math.PI/8; ctx.lineTo(cx+Math.cos(a)*u*1.0, cy+Math.sin(a)*u*1.0); }
      ctx.closePath(); ctx.fillStyle=color; ctx.fill();
      for (let i=1;i<8;i++){ const a=Math.PI + i*Math.PI/8; ctx.beginPath(); ctx.moveTo(cx,cy+u*0.8); ctx.lineTo(cx+Math.cos(a)*u*1.0, cy+Math.sin(a)*u*1.0); ctx.strokeStyle='#ffffff88'; ctx.stroke(); }
      break;
    }
    case 'trident': {
      ctx.strokeStyle=color; ctx.lineWidth=u*0.18;
      ctx.beginPath(); ctx.moveTo(cx,cy-u*1.2); ctx.lineTo(cx,cy+u*1.2); ctx.stroke();
      [-1,0,1].forEach(dx => { ctx.beginPath(); ctx.moveTo(cx+dx*u*0.7,cy-u*1.2); ctx.lineTo(cx+dx*u*0.7,cy-u*0.4); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(cx-u*0.7,cy-u*0.4); ctx.lineTo(cx+u*0.7,cy-u*0.4); ctx.stroke();
      break;
    }
    case 'key': {
      circle(ctx, cx-u*0.5, cy-u*0.5, u*0.5, null, color);
      ctx.strokeStyle=color; ctx.lineWidth=u*0.2;
      ctx.beginPath(); ctx.moveTo(cx-u*0.1,cy-u*0.1); ctx.lineTo(cx+u*0.9,cy+u*0.9);
      ctx.moveTo(cx+u*0.5,cy+u*0.5); ctx.lineTo(cx+u*0.8,cy+u*0.2); ctx.stroke();
      break;
    }
    case 'vault': {
      rr(ctx, cx-u, cy-u, u*2, u*2, u*0.2); ctx.fillStyle=color; ctx.fill();
      circle(ctx, cx, cy, u*0.6, '#111', white);
      ctx.fillStyle=white; ctx.font=`bold ${u*0.7}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('$', cx, cy);
      break;
    }
    case 'sword': {
      poly(ctx, [[cx-u*0.18,cy-u*1.2],[cx+u*0.18,cy-u*1.2],[cx+u*0.14,cy+u*0.4],[cx-u*0.14,cy+u*0.4]], color);
      ctx.strokeStyle=white; ctx.lineWidth=u*0.18;
      ctx.beginPath(); ctx.moveTo(cx-u*0.7,cy+u*0.5); ctx.lineTo(cx+u*0.7,cy+u*0.5); ctx.stroke();
      break;
    }
    case 'shield': {
      poly(ctx, [[cx,cy-u*1.1],[cx+u,cy-u*0.6],[cx+u*0.8,cy+u*0.8],[cx,cy+u*1.2],[cx-u*0.8,cy+u*0.8],[cx-u,cy-u*0.6]], color, white, u*0.08);
      break;
    }
    case 'lantern': {
      poly(ctx, [[cx-u*0.7,cy-u*0.4],[cx+u*0.7,cy-u*0.4],[cx+u*0.5,cy+u*0.9],[cx-u*0.5,cy+u*0.9]], color, white, u*0.08);
      ctx.strokeStyle=color; ctx.beginPath(); ctx.moveTo(cx,cy-u*1.2); ctx.lineTo(cx,cy-u*0.4); ctx.stroke();
      break;
    }
    case 'fan': {
      ctx.beginPath(); ctx.moveTo(cx, cy+u*0.8); ctx.arc(cx, cy+u*0.8, u*1.2, Math.PI*1.15, Math.PI*1.85); ctx.closePath();
      ctx.fillStyle=color; ctx.fill(); ctx.strokeStyle=white; ctx.stroke();
      break;
    }
    case 'shrine': {
      poly(ctx, [[cx-u*1.1,cy-u*0.2],[cx,cy-u*1.1],[cx+u*1.1,cy-u*0.2]], color);
      ctx.fillStyle=color; ctx.fillRect(cx-u*0.8, cy-u*0.2, u*1.6, u*1.1);
      break;
    }
    case 'oni': {
      circle(ctx, cx, cy, u*1.0, color);
      poly(ctx, [[cx-u*0.8,cy-u*0.9],[cx-u*0.4,cy-u*1.5],[cx,cy-u*0.9]], color);
      poly(ctx, [[cx+u*0.8,cy-u*0.9],[cx+u*0.4,cy-u*1.5],[cx,cy-u*0.9]], color);
      circle(ctx, cx-u*0.35, cy, u*0.18, '#000'); circle(ctx, cx+u*0.35, cy, u*0.18, '#000');
      break;
    }
    case 'donut': {
      circle(ctx, cx, cy, u*1.0, color);
      ctx.globalCompositeOperation='destination-out'; circle(ctx, cx, cy, u*0.35, '#000'); ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle='#fff8e8'; ctx.lineWidth=u*0.1;
      for(let i=0;i<8;i++){const a=i*Math.PI/4; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*u*0.6,cy+Math.sin(a)*u*0.6); ctx.lineTo(cx+Math.cos(a)*u*0.9,cy+Math.sin(a)*u*0.9); ctx.stroke();}
      break;
    }
    case 'lollipop': {
      circle(ctx, cx, cy-u*0.3, u*0.8, color);
      ctx.strokeStyle='#fff'; ctx.lineWidth=u*0.18;
      ctx.beginPath(); ctx.arc(cx,cy-u*0.3,u*0.45,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle=white; ctx.fillRect(cx-u*0.12, cy+u*0.4, u*0.24, u*0.9);
      break;
    }
    case 'chocolate': {
      rr(ctx, cx-u*0.9, cy-u*0.9, u*1.8, u*1.8, u*0.1); ctx.fillStyle=color; ctx.fill();
      ctx.strokeStyle='#ffffff66'; ctx.lineWidth=u*0.08;
      for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(cx-u*0.9+i*u*0.45,cy-u*0.9);ctx.lineTo(cx-u*0.9+i*u*0.45,cy+u*0.9);ctx.stroke();}
      break;
    }
    case 'icecream': {
      poly(ctx, [[cx-u*0.7,cy+u*0.2],[cx+u*0.7,cy+u*0.2],[cx,cy+u*1.2]], '#e8c98a');
      circle(ctx, cx-u*0.35, cy-u*0.2, u*0.55, color);
      circle(ctx, cx+u*0.35, cy-u*0.2, u*0.55, color);
      break;
    }
    case 'coral': {
      ctx.strokeStyle=color; ctx.lineWidth=u*0.25; ctx.lineCap='round';
      [[0,0],[-0.6,0.5],[0.6,0.5]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.moveTo(cx+dx*u, cy+u); ctx.quadraticCurveTo(cx+dx*u*1.4, cy, cx+dx*u*1.1, cy-u*0.8); ctx.stroke();
      });
      break;
    }
    case 'lock': {
      rr(ctx, cx-u*0.7, cy-u*0.15, u*1.4, u*1.0, u*0.12); ctx.fillStyle=color; ctx.fill();
      ctx.strokeStyle=white; ctx.lineWidth=u*0.18;
      ctx.beginPath(); ctx.arc(cx, cy-u*0.2, u*0.45, Math.PI, 0); ctx.stroke();
      break;
    }
    /* ── new themed symbols ── */
    case 'drink': {
      poly(ctx, [[cx-u*0.9,cy-u], [cx+u*0.9,cy-u], [cx,cy+u*0.5]], null, white, u*0.1);
      ctx.fillStyle = color; ctx.globalAlpha = 0.75;
      poly(ctx, [[cx-u*0.72,cy-u*0.75], [cx+u*0.72,cy-u*0.75], [cx,cy+u*0.28]], color);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = white; ctx.lineWidth = u*0.1;
      ctx.beginPath(); ctx.moveTo(cx, cy+u*0.5); ctx.lineTo(cx, cy+u*1.05);
      ctx.moveTo(cx-u*0.5, cy+u*1.05); ctx.lineTo(cx+u*0.5, cy+u*1.05); ctx.stroke();
      circle(ctx, cx+u*0.4, cy-u*0.6, u*0.16, '#ff5ec4');
      break;
    }
    case 'olive': {
      circle(ctx, cx, cy, u*0.75, color);
      circle(ctx, cx, cy, u*0.3, '#ff5c5c');
      ctx.strokeStyle = '#7bd66b'; ctx.lineWidth = u*0.16;
      ctx.beginPath(); ctx.moveTo(cx, cy-u*0.75); ctx.lineTo(cx+u*0.4, cy-u*1.2); ctx.stroke();
      break;
    }
    case 'ice': {
      rr(ctx, cx-u*0.7, cy-u*0.7, u*1.4, u*1.4, u*0.18);
      ctx.fillStyle = '#bfefff'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = u*0.12; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-u*0.5, cy+u*0.2); ctx.lineTo(cx+u*0.2, cy-u*0.5); ctx.stroke();
      break;
    }
    case 'bottle': {
      rr(ctx, cx-u*0.32, cy-u*0.2, u*0.64, u*1.2, u*0.1); ctx.fillStyle=color; ctx.fill();
      ctx.fillRect(cx-u*0.18, cy-u*0.9, u*0.36, u*0.7);
      ctx.fillStyle = white; ctx.fillRect(cx-u*0.34, cy+u*0.2, u*0.68, u*0.3);
      break;
    }
    case 'neon': {
      ctx.strokeStyle = color; ctx.lineWidth = u*0.18; ctx.shadowColor = color; ctx.shadowBlur = u*0.5;
      ctx.beginPath(); ctx.arc(cx, cy, u*0.8, 0.3, Math.PI*1.7); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = white; ctx.font = `bold ${u}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('!', cx, cy);
      break;
    }
    case 'bike': {
      ctx.strokeStyle = color; ctx.lineWidth = u*0.12;
      [[-0.8,0.45],[0.8,0.45]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.arc(cx+dx*u, cy+dy*u, u*0.42, 0, TAU); ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(cx-u*0.8, cy+u*0.45); ctx.lineTo(cx-u*0.2, cy-u*0.4);
      ctx.lineTo(cx+u*0.35, cy+u*0.45); ctx.lineTo(cx-u*0.8, cy+u*0.45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-u*0.2, cy-u*0.4); ctx.lineTo(cx+u*0.55, cy-u*0.5); ctx.stroke();
      break;
    }
    case 'beer': {
      rr(ctx, cx-u*0.7, cy-u*0.5, u*1.4, u*1.5, u*0.14); ctx.fillStyle=color; ctx.fill();
      ctx.strokeStyle=white; ctx.lineWidth=u*0.1; ctx.stroke();
      ctx.fillStyle='#fff3c0'; ctx.fillRect(cx-u*0.68, cy-u*0.45, u*1.36, u*0.22);
      ctx.strokeStyle=white; ctx.beginPath(); ctx.arc(cx+u*0.95, cy, u*0.4, -1.2, 1.2); ctx.stroke();
      break;
    }
    case 'sign': {
      rr(ctx, cx-u*1.0, cy-u*0.7, u*2.0, u*1.2, u*0.16); ctx.fillStyle=color; ctx.fill();
      ctx.fillStyle='#0a0612'; ctx.font=`bold ${u*0.7}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('BAR', cx, cy-u*0.08);
      ctx.fillStyle=color; ctx.fillRect(cx-u*0.06, cy+u*0.5, u*0.12, u*0.7);
      break;
    }
    case 'ticket': {
      rr(ctx, cx-u, cy-u*0.6, u*2, u*1.2, u*0.12); ctx.fillStyle=color; ctx.fill();
      ctx.strokeStyle='#0a0612'; ctx.lineWidth=u*0.1; ctx.setLineDash([u*0.16,u*0.12]);
      ctx.beginPath(); ctx.moveTo(cx+u*0.4, cy-u*0.6); ctx.lineTo(cx+u*0.4, cy+u*0.6); ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'map': {
      ctx.fillStyle='#f3e2b8'; ctx.beginPath();
      ctx.moveTo(cx-u, cy-u*0.7); ctx.lineTo(cx-u*0.2, cy-u*0.9); ctx.lineTo(cx+u*0.4, cy-u*0.6);
      ctx.lineTo(cx+u, cy-u*0.8); ctx.lineTo(cx+u, cy+u*0.8); ctx.lineTo(cx+u*0.3, cy+u*0.6);
      ctx.lineTo(cx-u*0.3, cy+u*0.9); ctx.lineTo(cx-u, cy+u*0.7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=color; ctx.lineWidth=u*0.1;
      ctx.beginPath(); ctx.moveTo(cx-u*0.2, cy-u*0.9); ctx.lineTo(cx-u*0.2, cy+u*0.9); ctx.stroke();
      break;
    }
    case 'ball': {
      circle(ctx, cx, cy, u*0.95, color);
      ctx.strokeStyle='#2a1400'; ctx.lineWidth=u*0.1;
      ctx.beginPath(); ctx.moveTo(cx-u*0.95,cy); ctx.lineTo(cx+u*0.95,cy);
      ctx.moveTo(cx,cy-u*0.95); ctx.lineTo(cx,cy+u*0.95);
      ctx.arc(cx, cy, u*0.5, 0, TAU); ctx.stroke();
      break;
    }
    case 'hoop': {
      ctx.strokeStyle=color; ctx.lineWidth=u*0.16;
      ctx.beginPath(); ctx.ellipse(cx, cy-u*0.3, u*0.9, u*0.4, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-u*0.7,cy-u*0.1); ctx.lineTo(cx-u*0.5,cy+u*1.1);
      ctx.moveTo(cx+u*0.7,cy-u*0.1); ctx.lineTo(cx+u*0.5,cy+u*1.1); ctx.stroke();
      ctx.fillStyle=white; ctx.beginPath(); ctx.arc(cx, cy+u*0.2, u*0.3, 0, TAU); ctx.fill();
      break;
    }
    case 'jersey': {
      poly(ctx, [[cx-u*0.7,cy-u*0.8],[cx-u*1.1,cy-u*0.4],[cx-u*0.6,cy],[cx-u*0.6,cy+u*1],
        [cx+u*0.6,cy+u*1],[cx+u*0.6,cy],[cx+u*1.1,cy-u*0.4],[cx+u*0.7,cy-u*0.8]], color, white, u*0.07);
      ctx.fillStyle='#0a0612'; ctx.font=`bold ${u*0.8}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('7', cx, cy+u*0.1);
      break;
    }
    case 'flag': {
      ctx.fillStyle=color; ctx.fillRect(cx-u*0.9, cy-u*1.0, u*0.16, u*2.0);
      ctx.beginPath(); ctx.moveTo(cx-u*0.74,cy-u*0.9); ctx.lineTo(cx+u*0.9,cy-u*0.6);
      ctx.lineTo(cx-u*0.74,cy-u*0.1); ctx.closePath(); ctx.fill();
      break;
    }
    case 'sneaker': {
      ctx.fillStyle=color; ctx.beginPath();
      ctx.moveTo(cx-u, cy+u*0.4); ctx.lineTo(cx-u*0.3, cy+u*0.4);
      ctx.lineTo(cx+u*0.2, cy-u*0.7); ctx.lineTo(cx+u*0.6, cy-u*0.3);
      ctx.lineTo(cx+u, cy+u*0.4); ctx.lineTo(cx+u, cy+u*0.8); ctx.lineTo(cx-u, cy+u*0.8);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=white; ctx.lineWidth=u*0.08; ctx.beginPath();
      ctx.moveTo(cx-u*0.2,cy-u*0.2); ctx.lineTo(cx+u*0.3,cy+u*0.2); ctx.stroke();
      break;
    }
    case 'bunny': {
      circle(ctx, cx-u*0.4, cy-u*0.9, u*0.42, color);
      circle(ctx, cx+u*0.4, cy-u*0.9, u*0.42, color);
      circle(ctx, cx, cy+u*0.15, u*0.8, color);
      circle(ctx, cx-u*0.28, cy, u*0.1, '#000'); circle(ctx, cx+u*0.28, cy, u*0.1, '#000');
      circle(ctx, cx, cy+u*0.35, u*0.1, '#ff9fc4');
      break;
    }
    case 'carrot': {
      poly(ctx, [[cx-u*0.4,cy-u*0.5],[cx+u*0.4,cy-u*0.5],[cx,cy+u*1.1]], color);
      ctx.strokeStyle='#4ade80'; ctx.lineWidth=u*0.14;
      ctx.beginPath(); ctx.moveTo(cx-u*0.2,cy-u*0.5); ctx.lineTo(cx-u*0.5,cy-u*1.1);
      ctx.moveTo(cx+u*0.2,cy-u*0.5); ctx.lineTo(cx+u*0.5,cy-u*1.1); ctx.stroke();
      break;
    }
    case 'egg': {
      ctx.beginPath(); ctx.ellipse(cx, cy, u*0.65, u*0.9, 0, 0, TAU); ctx.fillStyle=color; ctx.fill();
      ctx.fillStyle = '#ff9fc4'; ctx.beginPath(); ctx.arc(cx, cy+u*0.1, u*0.3, 0, TAU); ctx.fill();
      break;
    }
    case 'tophat': {
      ctx.fillStyle=color; ctx.fillRect(cx-u*0.6, cy-u*1.1, u*1.2, u*1.3);
      ctx.fillRect(cx-u*1.0, cy+u*0.2, u*2.0, u*0.22);
      ctx.fillStyle='#ff5ec4'; ctx.fillRect(cx-u*0.6, cy-u*0.25, u*1.2, u*0.2);
      break;
    }
    case 'lens': {
      ctx.strokeStyle=color; ctx.lineWidth=u*0.18;
      ctx.beginPath(); ctx.arc(cx-u*0.15, cy-u*0.15, u*0.65, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+u*0.35,cy+u*0.35); ctx.lineTo(cx+u*1.1,cy+u*1.1); ctx.stroke();
      ctx.fillStyle='#ffffff33'; ctx.beginPath(); ctx.arc(cx-u*0.3,cy-u*0.3,u*0.2,0,TAU); ctx.fill();
      break;
    }
    case 'flower': {
      for (let i=0;i<6;i++){ const a=i*TAU/6; circle(ctx, cx+Math.cos(a)*u*0.55, cy+Math.sin(a)*u*0.55, u*0.4, color); }
      circle(ctx, cx, cy, u*0.32, '#ffe066');
      break;
    }
    case 'camera': {
      rr(ctx, cx-u*0.95, cy-u*0.55, u*1.9, u*1.15, u*0.12); ctx.fillStyle=color; ctx.fill();
      circle(ctx, cx, cy, u*0.42, '#0a0612'); circle(ctx, cx, cy, u*0.22, white);
      rr(ctx, cx-u*0.5, cy-u*0.75, u*0.5, u*0.22, u*0.05); ctx.fillStyle=color; ctx.fill();
      break;
    }
    case 'mask': {
      ctx.fillStyle=color; ctx.beginPath();
      ctx.moveTo(cx-u, cy-u*0.4); ctx.quadraticCurveTo(cx, cy-u*1.1, cx+u, cy-u*0.4);
      ctx.quadraticCurveTo(cx+u*0.7, cy+u*0.8, cx, cy+u*0.9);
      ctx.quadraticCurveTo(cx-u*0.7, cy+u*0.8, cx-u, cy-u*0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#0a0612';
      ctx.beginPath(); ctx.ellipse(cx-u*0.4, cy-u*0.1, u*0.22, u*0.14, -0.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx+u*0.4, cy-u*0.1, u*0.22, u*0.14, 0.2, 0, TAU); ctx.fill();
      break;
    }
    case 'wave': {
      ctx.strokeStyle=color; ctx.lineWidth=u*0.2; ctx.lineCap='round';
      for (let i=-1;i<=1;i++){
        ctx.beginPath(); ctx.moveTo(cx-u, cy+i*u*0.5);
        ctx.quadraticCurveTo(cx-u*0.5, cy-u*0.5+i*u*0.5, cx, cy+i*u*0.5);
        ctx.quadraticCurveTo(cx+u*0.5, cy+u*0.5+i*u*0.5, cx+u, cy+i*u*0.5); ctx.stroke();
      }
      break;
    }
    case 'sun': {
      circle(ctx, cx, cy, u*0.55, color);
      ctx.strokeStyle=color; ctx.lineWidth=u*0.14;
      for(let i=0;i<8;i++){const a=i*TAU/8; ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*u*0.75, cy+Math.sin(a)*u*0.75);
        ctx.lineTo(cx+Math.cos(a)*u*1.1, cy+Math.sin(a)*u*1.1); ctx.stroke();}
      break;
    }
    case 'leaf': {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(cx-u*0.8, cy+u*0.8);
      ctx.quadraticCurveTo(cx-u*0.9, cy-u*0.8, cx+u*0.8, cy-u*0.8);
      ctx.quadraticCurveTo(cx+u*0.9, cy+u*0.8, cx-u*0.8, cy+u*0.8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0a3a1a'; ctx.lineWidth = u*0.08;
      ctx.beginPath(); ctx.moveTo(cx-u*0.7,cy+u*0.7); ctx.lineTo(cx+u*0.6,cy-u*0.6); ctx.stroke();
      break;
    }
    case 'umbrella': {
      ctx.fillStyle=color; ctx.beginPath();
      ctx.moveTo(cx-u, cy+u*0.1);
      ctx.quadraticCurveTo(cx-u*0.5, cy-u*1.1, cx, cy-u*1.0);
      ctx.quadraticCurveTo(cx+u*0.5, cy-u*1.1, cx+u, cy+u*0.1);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=white; ctx.lineWidth=u*0.1;
      ctx.beginPath(); ctx.moveTo(cx, cy-u*1.0); ctx.lineTo(cx, cy+u*1.1);
      ctx.quadraticCurveTo(cx+u*0.4, cy+u*1.3, cx+u*0.6, cy+u*0.9); ctx.stroke();
      break;
    }
    default: {
      circle(ctx, cx, cy, u*0.9, color);
      circle(ctx, cx, cy, u*0.4, white);
    }
  }
}

export function drawSymbol(ctx, key, x, y, size, color = '#ffcc00') {
  const s = size;
  ctx.save();
  ctx.translate(x - s / 2, y - s / 2);
  tile(ctx, 0, 0, s, color);
  drawArch(ctx, ARCHETYPE[key] || 'default', s / 2, s / 2, s, color);
  ctx.restore();
}

export const SYMBOL_KEYS = Object.keys(ARCHETYPE);
