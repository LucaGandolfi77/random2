import CONFIG from './config.js';
let canvas,ctx;
export function initRender(){canvas=document.getElementById('game-canvas');ctx=canvas.getContext('2d');canvas.width=CONFIG.canvas.width;canvas.height=CONFIG.canvas.height;ctx.imageSmoothingEnabled=true;}
export function clearScreen(scene='scripture'){
  const g=ctx.createLinearGradient(0,0,0,canvas.height);
  if(scene==='scripture'||scene==='genesis'||scene==='gospels'){
    g.addColorStop(0,'#0e0808');g.addColorStop(0.5,'#120d14');g.addColorStop(1,'#0e0808');
  }else if(scene==='prophecy'||scene==='revelation'){
    g.addColorStop(0,'#180b1a');g.addColorStop(0.5,'#1f0f22');g.addColorStop(1,'#160a18');
  }else{
    g.addColorStop(0,'#0d070a');g.addColorStop(0.5,'#100a0e');g.addColorStop(1,'#0d070a');
  }
  ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<30;i++){
    const alpha=Math.random()*0.1+0.03;
    ctx.fillStyle=`rgba(200,170,130,${alpha})`;
    const x=Math.random()*canvas.width;const y=Math.random()*canvas.height;
    const r=Math.random()*2+0.5;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
}
export function renderText(text,x,y){ctx.font="italic 1rem 'Cormorant Garamond',Georgia,serif";ctx.fillStyle="#c8b6a0";ctx.fillText(text.substring(0,80),x||30,y||50);}
export function updateUI(){document.getElementById('dialogue-text').textContent='';document.getElementById('speaker').textContent='Scripture';}
