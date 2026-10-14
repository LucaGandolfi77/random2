import CONFIG from './config.js';
let canvas,ctx;
export function initRender(){canvas=document.getElementById('game-canvas');ctx=canvas.getContext('2d');canvas.width=CONFIG.canvas.width;canvas.height=CONFIG.canvas.height;ctx.imageSmoothingEnabled=true;}
export function clearScreen(scene='memory'){
  const g=ctx.createLinearGradient(0,0,0,canvas.height);
  if(scene==='memory'||scene==='madeleine'){
    g.addColorStop(0,'#16112a');g.addColorStop(0.5,'#1e1533');g.addColorStop(1,'#0d0912');
  }else if(scene==='guermantes'){
    g.addColorStop(0,'#1b1528');g.addColorStop(0.5,'#201530');g.addColorStop(1,'#140e1a');
  }else{
    g.addColorStop(0,'#0d0912');g.addColorStop(0.5,'#140e1a');g.addColorStop(1,'#0d0912');
  }
  ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
  // Proustian golden particles — like light through Combray windows
  for(let i=0;i<25;i++){
    const alpha=Math.random()*0.12+0.04;
    ctx.fillStyle=`rgba(218,190,150,${alpha})`;
    const x=Math.random()*canvas.width;
    const y=Math.random()*canvas.height;
    const r=Math.random()*2+1;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
}
export function updateUI(lang){
  document.getElementById('speaker').textContent='';
}
