import CONFIG from './config.js';
let canvas,ctx;
export function initRender(){canvas=document.getElementById('bg-canvas');ctx=canvas.getContext('2d');canvas.width=900;canvas.height=640;ctx.imageSmoothingEnabled=true;}
export function clearScreen(){const g=ctx.createLinearGradient(0,0,0,canvas.height);g.addColorStop(0,'#0a0508');g.addColorStop(0.4,'#0d060e');g.addColorStop(1,'#06040a');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
for(let i=0;i<20;i++){const alpha=Math.random()*0.08+0.02;ctx.fillStyle=`rgba(200,170,140,${alpha})`;const x=Math.random()*canvas.width;const y=Math.random()*canvas.height;const r=Math.random()*1.5+0.5;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
}
export function renderLibraryCards(){clearScreen();}
