// main.js — boot: dynamic import of the hosted three.js, renderer, loop, SF hook.
import {createSim,DT} from './sim.js';
import {inpInit,inpPoll,inpKeys,inpO,inpReset} from './input.js';
import {xrInit,xrS,xrPulse} from './xr.js';
import {rdInit,rdSync,rdM} from './render.js';
import {auInit,auSync} from './audio.js';

const mU=document.getElementById('u'),mB=document.createElement('button'),mH=document.createElement('div');
mB.id='b';mH.id='h';mH.textContent='LMB/RMB triggers · B arch · V grips · Space throw · G lasso · N Nova · WASD/QE hands · R restart · M mute';
document.body.append(mB,mH);
let T;try{T=await import(U)}catch(e){} // U: hosted three.js URL, a plain global defined outside the packed script (build.js / index.html)
let R;try{R=new T.WebGLRenderer({antialias:true})}catch(e){}
if(!R){mB.remove();mH.remove();mU.textContent=T&&T.WebGLRenderer?'WebGL is needed.':'Could not load Three.js. Check the connection.'}
else{
  R.setPixelRatio(Math.min(devicePixelRatio,1.5));R.setSize(innerWidth,innerHeight);document.body.append(R.domElement);
  let seed=Date.now()>>>10,sim=createSim(seed),acc=0,last=0,evLog=[],started=0,mute=0;
  try{mute=localStorage.getItem('sevenfold_mute')=='1'}catch(e){}
  const {scene,cam,world}=rdInit(T,R);
  inpInit(R.domElement);
  onresize=()=>{if(xrS.on)return;cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight)};
  const save=()=>{try{if(sim._score>=+localStorage.getItem('sevenfold_best'))localStorage.setItem('sevenfold_best',sim._score)}catch(e){}};
  const recentre=()=>{const f=cam.getWorldDirection(new T.Vector3),y=Math.atan2(f.x,f.z);inpO.x=cam.position.x;inpO.z=cam.position.z;inpO.y=y;world.position.set(inpO.x,0,inpO.z);world.rotation.y=y};
  let SF={}; // test hooks (window.SF) exist only in the test build (build.js --test); the zip ships without them
  SF=window.SF={manual:0,rec:0,rd:rdM,R,get sim(){return sim},inject:(L,R_,H)=>sim.inject(L,R_,H),step:n=>sim.step(n),newGame:s=>{sim=createSim(s);evLog=[];started=1;mB.hidden=true;return sim},charge:()=>{sim._ch=3},reset:inpReset,wave:n=>{sim._ws=2;sim._wt=0;sim._wave=n-1;sim.step()},ev:k=>sim._ev.push({k,p:[0,1,0],b:0}),dawn:()=>{sim._ev.push({k:'dawn'});sim._ws=4;sim._wt=1},state:()=>({wave:sim._wave,ws:sim._ws,mode:sim._md,light:sim._light,xr:xrS.on,calls:R.info.render.calls,tris:R.info.render.triangles,events:evLog.slice(-300),text:rdM.text,mute})}; //@test
  xrInit(R,mB,()=>{started=1;mH.hidden=xrS.sup;auInit()},()=>{mH.hidden=false;inpO.x=inpO.z=inpO.y=0;world.position.set(0,0,0);world.rotation.y=0});
  R.setAnimationLoop(t=>{
    const dt=Math.min(.1,(t-last)/1000||0);last=t;
    if(inpKeys.r){inpKeys.r=0;sim._init();sim._ws=2;sim._wt=1.5;evLog=[]}
    if(inpKeys.m){inpKeys.m=0;mute=!mute;try{localStorage.setItem('sevenfold_mute',mute?'1':'0')}catch(e){}}
    if(started&&!SF.manual){acc+=dt;let n=0;
      while(acc>=DT&&n<6){const i=inpPoll(cam,DT);
        if(SF.rec)SF.rec.push(i); //@test
        if(xrS.on&&sim._ws==0&&(i.L.t||i.R.t))recentre();
        sim.inject(i.L,i.R,i.H);sim.step();acc-=DT;n++}
      if(n==6)acc=0}
    else if(!started)inpPoll(cam,0);
    const ev=sim.drain();for(const e of ev){const h={hit:.5,crack:.5,catch:.5,res:.9,block:.9,hurt:2}[e.k];if(h)xrPulse(h,h*100);if(e.k=='over'||e.k=='dawn')save()}
    for(const e of ev)evLog.push(e.k);if(evLog.length>600)evLog=evLog.slice(-300); //@test
    rdSync(sim,ev,dt,xrS.on?1700:R.domElement.height);auSync(sim,ev,mute);
    R.render(scene,cam);
  });
}
