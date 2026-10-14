import CONFIG from './config.js';
let canvas,ctx;
export function initRender(){canvas=document.getElementById('game-canvas');ctx=canvas.getContext('2d');canvas.width=CONFIG.canvas.width;canvas.height=CONFIG.canvas.height;ctx.imageSmoothingEnabled=true;}
export function clearScreen(scene='dark'){
  const gradient=ctx.createLinearGradient(0,0,0,canvas.height);
  if(scene==='murder'){
    gradient.addColorStop(0,'#0a0408');gradient.addColorStop(0.5,'#140b0e');gradient.addColorStop(1,'#0f080c');
  }else if(scene==='redemption'){
    gradient.addColorStop(0,'#1a1422');gradient.addColorStop(0.5,'#241830');gradient.addColorStop(1,'#2a1630');
  }else{
    gradient.addColorStop(0,'#0f0c15');gradient.addColorStop(0.5,'#140e1a');gradient.addColorStop(1,'#0f0c15');
  }
  ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
  // Melancholic rain/stardust particles
  for(let i=0;i<30;i++){
    ctx.fillStyle=`rgba(180,172,145,${Math.random()*0.15+0.03})`;
    ctx.fillRect(Math.random()*canvas.width,Math.random()*canvas.height,1,Math.random()*3+1);
  }
}
export function drawDialogueText(text){
  document.getElementById('dialogue-text').textContent=text;
}
export function drawSpeaker(name){
  document.getElementById('speaker').textContent=name;
}
export function showChoices(choices,onSelect){
  const container=document.getElementById('choices');
  container.innerHTML='';
  choices.forEach((c,i)=>{
    const btn=document.createElement('button');
    btn.textContent=c.text;
    btn.onclick=()=>{onSelect(c);};
    container.appendChild(btn);
  });
}
