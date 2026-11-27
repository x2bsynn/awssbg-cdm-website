// Original snowfall: inspired by Fargo 404 and Kyoya Baba's randomized snowfall.
const canvas=document.querySelector('#snowCanvas'), ctx=canvas?.getContext('2d'), root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'), toggle=document.querySelector('#motionToggle');
let paused=false;try{paused=localStorage.getItem('awssbg-motion')==='paused'}catch{}
let w=0,h=0,dpr=1,flakes=[],frame=0,last=0,t=0;
const off=()=>paused||reduced.matches;
let seed=81;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function resize(){if(!ctx)return;w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);seed=81;flakes=Array.from({length:Math.min(210,Math.max(55,Math.round(w*h/5500)))},()=>({x:rnd(),y:rnd(),r:.6+rnd()**2*2.4,z:.3+rnd()*.7,phase:rnd()*6.28}));paint();}
function paint(){if(!ctx||!w)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const dark=root.dataset.theme==='dark';for(const f of flakes){const x=((f.x*w+Math.sin(t*.35+f.phase)*18+ t*4*f.z)%w+w)%w;const y=((f.y*h+t*(13+f.z*24))%h+h)%h;ctx.globalAlpha=(dark?.8:.64)*f.z;ctx.fillStyle=dark?'#e5f6ff':'#ffffff';ctx.beginPath();ctx.arc(x,y,f.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
function draw(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(!off())t+=dt;paint();if(!off()&&!document.hidden)frame=requestAnimationFrame(draw);}
function refresh(){root.dataset.motion=off()?'paused':'running';if(toggle){toggle.setAttribute('aria-pressed',String(off()));toggle.querySelector('span').textContent=reduced.matches?'Motion reduced':paused?'Resume motion':'Pause motion';toggle.disabled=reduced.matches;toggle.querySelector('path').setAttribute('d',off()?'M8 5l12 7-12 7z':'M9 5v14M15 5v14');}cancelAnimationFrame(frame);last=0;draw(performance.now());}
toggle?.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('awssbg-motion',paused?'paused':'running')}catch{}refresh()});reduced.addEventListener('change',refresh);addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',refresh);new MutationObserver(paint).observe(root,{attributes:true,attributeFilter:['data-theme']});resize();refresh();

// Hero depth layers: slow pointer drift, small scroll displacement, and a separate snowfall overlay.
const hero=document.querySelector('.hero'), art=hero?.querySelector('.winter-art');
if(hero&&art){
 const layers=[...art.querySelectorAll('[data-depth]')];
 const header=document.querySelector('.site-header');
 const syncHeight=()=>root.style.setProperty('--header-height',`${header?.getBoundingClientRect().height||86}px`);
 syncHeight(); if('ResizeObserver' in window&&header)new ResizeObserver(syncHeight).observe(header);
 const overlay=document.createElement('canvas'); overlay.className='hero-snow';overlay.setAttribute('aria-hidden','true');hero.append(overlay);
 const surface=overlay.getContext('2d'); let targetX=0,targetY=0,currentX=0,currentY=0,heroFrame=0;
 const update=()=>{heroFrame=0;const box=hero.getBoundingClientRect();if(box.bottom<=0||box.top>=innerHeight||document.hidden)return;
   const disabled=off(); currentX+=( (disabled?0:targetX)-currentX)*.075;currentY+=((disabled?0:targetY)-currentY)*.075;
   const scroll=disabled?0:Math.max(0,Math.min(box.height,-box.top));
   for(const layer of layers){const depth=Number(layer.dataset.depth);layer.style.setProperty('--layer-x',`${currentX*depth*28}px`);layer.style.setProperty('--layer-y',`${currentY*depth*17+scroll*(1-depth)*.035}px`);}
   if(surface&&canvas){const ratio=Math.min(devicePixelRatio||1,1.75);const ow=Math.round(box.width*ratio),oh=Math.round(box.height*ratio);if(overlay.width!==ow||overlay.height!==oh){overlay.width=ow;overlay.height=oh;}surface.clearRect(0,0,ow,oh);surface.drawImage(canvas,0,0,ow,oh);}
   if(!disabled)heroFrame=requestAnimationFrame(update);
 };
 const wake=()=>{if(!heroFrame)heroFrame=requestAnimationFrame(update)};
 hero.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||off())return;const b=hero.getBoundingClientRect();targetX=(e.clientX-b.left)/b.width*2-1;targetY=(e.clientY-b.top)/b.height*2-1;wake()},{passive:true});
 hero.addEventListener('pointerleave',()=>{targetX=targetY=0;wake()});
 addEventListener('scroll',wake,{passive:true});addEventListener('resize',()=>{syncHeight();wake()},{passive:true});document.addEventListener('visibilitychange',wake);new MutationObserver(wake).observe(root,{attributes:true,attributeFilter:['data-motion','data-theme']});wake();
}
