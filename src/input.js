// input.js — desktop controls and XR controller state → sim hand state in ARENA space.
// Arena: player origin, yaw 0 => forward +z. Head space: x right, y up, z forward.
import {sin,cos,PI,min,clamp,add,yawOf} from './vec.js';
import {xrS} from './xr.js';

export const inpO={x:0,z:0,y:0};      // arena origin in world space (x,z) and yaw (XR recentre)
const inpK={};let inpYaw=0,inpPit=0,inpMb=[0,0],inpMac=0,inpMacT=0,inpXo=[0,0,0];
const inpHL=[-.36,-.35,.6],inpHR=[.36,-.35,.6]; // desktop hand offsets in head space
// desktop macros: u∈[0,1] → [L,R,lt,rt] in head space. 1 throw (Space) 2 lasso (G) 3 clap (N)
const inpGens=[
  u=>{const z=u<.3?.2:.2+.75*((u-.3)/.7)**2,y=-.3+.1*sin(u*PI);return[[-.3,y,z],[.3,y,z],u<.97?1:0,u<.97?1:0]},
  u=>{const a=u*22,r=u<.85?.32:.32+(u-.85)*6,b=min(1,u/.15);return[[-.36,-.35,.6],[sin(a)*r*b+.36*(1-b),(.1+cos(a)*.1)*b-.25*(1-b),cos(a)*r*b+.6*(1-b)],0,u<.9?1:0]},
  u=>{const d=u<.4?.5:.5-(u-.4)*1.2;return[[-d/2,-.3,.6],[d/2,-.3,.6],1,1]}];
export const inpKeys={};             // one-shot keys read by main: r (restart) m (mute)
export const inpMacro=k=>{if(!inpMac&&k>=1&&k<=3){inpMac=k;inpMacT=0}};
const inpHS=(p,y,o)=>[o[0]-cos(y)*p[0]+sin(y)*p[2],o[1]+p[1],o[2]+sin(y)*p[0]+cos(y)*p[2]]; // head space → arena around head o with yaw y
const inpQm=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const inpQy=y=>[0,sin(y/2),0,cos(y/2)];
let inpLast={L:{p:[-.3,1.2,.3],q:[0,1,0,0],t:0,g:0},R:{p:[.3,1.2,.3],q:[0,1,0,0],t:0,g:0}}; // last XR hand poses (frozen on disconnect)

export function inpInit(cv){
  onkeydown=e=>{inpK[e.code]=1;const k=e.key.toLowerCase();if(k==' '){e.preventDefault();inpMacro(1)}if(k=='g')inpMacro(2);if(k=='n')inpMacro(3);if(k=='r'||k=='m')inpKeys[k]=1};
  onkeyup=e=>{inpK[e.code]=0};
  cv.onmousedown=e=>{inpMb[e.button==2?1:0]=1;if(cv.requestPointerLock)cv.requestPointerLock()};
  onmouseup=e=>{inpMb[e.button==2?1:0]=0};
  cv.oncontextmenu=e=>e.preventDefault();
  onmousemove=e=>{if(document.pointerLockElement==cv){inpYaw-=e.movementX*.003;inpPit=clamp(inpPit-e.movementY*.003,-1.4,1.4)}};
}
// Poll once per sim step. cam = the Three camera (XR-updated when presenting). dt = DT.
// Keyboard and mouse work in both modes: in VR they are an assist for emulators (WASD/QE nudge both hands in head
// space, B holds both triggers, mouse buttons are triggers, Space/G/N run the throw/lasso/clap macros around the head).
export function inpPoll(cam,dt){
  const v=5*dt,K=x=>inpK['Key'+x]?v:0;let H,L,R,yaw;
  if(xrS.on){
    const O=inpO,c=cos(O.y),s=sin(O.y),qo=inpQy(-O.y);
    const ta=p=>{const x=p.x-O.x,z=p.z-O.z;return[c*x-s*z,p.y,s*x+c*z]},qa=q=>inpQm(qo,[q.x,q.y,q.z,q.w]);
    H={p:ta(cam.position),q:qa(cam.quaternion)};yaw=yawOf(H.q);
    let n=0;for(const h of xrS.h){if(!h.on)continue;const k=h.hand=='left'?'L':h.hand=='right'?'R':n?'L':'R';n++;inpLast[k]={p:ta(h.g.position),q:qa(h.g.quaternion),t:h.t,g:h.q}}
    inpXo[0]+=K('D')-K('A');inpXo[2]+=K('W')-K('S');inpXo[1]+=K('E')-K('Q');const o=inpHS(inpXo,yaw,[0,0,0]);
    L={...inpLast.L,p:add(inpLast.L.p,o)};R={...inpLast.R,p:add(inpLast.R.p,o)};
  }else{
    for(const p of[inpHR,inpHL]){p[0]+=K('D')-K('A');p[2]+=K('W')-K('S');p[1]+=K('E')-K('Q');const l=Math.hypot(...p);if(l>1)for(let i=0;i<3;i++)p[i]/=l}
    cam.rotation.set(inpPit,PI+inpYaw,0);yaw=inpYaw;
    H={p:[0,1.6,0],q:[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w]};const q=inpQy(inpYaw+PI);
    L={p:inpHS(inpHL,yaw,H.p),q,t:0,g:0};R={p:inpHS(inpHR,yaw,H.p),q,t:0,g:0};
  }
  if(inpMb[1]||inpK.KeyB)L.t=1;if(inpMb[0]||inpK.KeyB)R.t=1;
  if(inpMac){inpMacT+=dt;const u=min(1,inpMacT/[.45,1.1,.35][inpMac-1]),[l,r,lt,rt]=inpGens[inpMac-1](u);L={...L,p:inpHS(l,yaw,H.p),t:lt};R={...R,p:inpHS(r,yaw,H.p),t:rt};
    if(u>=1){inpMac=0;inpHL.splice(0,3,-.36,-.35,.6);inpHR.splice(0,3,.36,-.35,.6);inpXo=[0,0,0]}}
  return{L,R,H};
}
