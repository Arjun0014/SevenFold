// input.js — desktop controls and XR controller state → sim hand state in ARENA space.
// Arena: player origin, yaw 0 => forward +z. Head space: x right, y up, z forward.
import {sin,cos,PI,min,clamp,add,qrot,atan2} from './vec.js';
import {xrS} from './xr.js';

export const inpO={x:0,z:0,y:0};      // arena origin in world space (x,z) and yaw (XR recentre)
const inpK={};let inpYaw=0,inpPit=0,inpMb=[0,0],inpMac=0,inpMacT=0,inpXo=[0,0,0];
const inpHL=[-.36,-.35,.6],inpHR=[.36,-.35,.6]; // desktop hand offsets in head space
// desktop sigil macros (both grips held, hands drawn in head space, released at the end): u∈[0,1] → [L,R,g]
// 1 circle (Space) → boomerang, 2 cross (G) → lasso, 3 raise-and-slam (N) → Nova when charged
const inpGens=[
  u=>{const a=u*6.6;return[[sin(a)*.2-.1,-.3+cos(a)*.2,.5],[sin(a)*.2+.1,-.3+cos(a)*.2,.5],u<.96?1:0]},
  u=>{const x=-.15+.5*u;return[[-x,-.3,.5],[x,-.3,.5],u<.96?1:0]},
  u=>{const y=-.3+(u<.5?u*2:2-u*2)*.5;return[[-.1,y,.5],[.1,y,.5],u<.96?1:0]}];
export const inpKeys={};             // one-shot keys read by main: r (restart) m (mute)
export const inpMacro=k=>{if(!inpMac&&k>=1&&k<=3){inpMac=k;inpMacT=0}};
const inpHS=(p,y,o)=>[o[0]-cos(y)*p[0]+sin(y)*p[2],o[1]+p[1],o[2]+sin(y)*p[0]+cos(y)*p[2]]; // head space → arena around head o with yaw y
const inpFw=q=>qrot([q.x,q.y,q.z,q.w],[0,0,-1]); // a Three quaternion's forward (-z)
let inpLast={L:{p:[-.3,1.2,.3],f:[0,0,1],t:0,g:0},R:{p:[.3,1.2,.3],f:[0,0,1],t:0,g:0}}; // last XR hand poses (frozen on disconnect)

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
// space, B holds both triggers, V both grips, mouse buttons are triggers, Space/G/N draw the three sigils around the head).
export function inpPoll(cam,dt){
  const v=5*dt,K=x=>inpK['Key'+x]?v:0;let H,L,R,yaw;
  if(xrS.on){
    const O=inpO,c=cos(O.y),s=sin(O.y);
    const ta=(p,o=O)=>{const x=p[0]-o.x,z=p[2]-o.z;return[c*x-s*z,p[1],s*x+c*z]},fa=q=>ta(inpFw(q),{x:0,z:0});
    H={p:ta(cam.position.toArray()),f:fa(cam.quaternion)};yaw=atan2(H.f[0],H.f[2]);
    let n=0;for(const h of xrS.h){if(!h.on)continue;const k=h.hand=='left'?'L':h.hand=='right'?'R':n?'L':'R';n++;inpLast[k]={p:ta(h.g.position.toArray()),f:fa(h.g.quaternion),t:h.t,g:h.q}}
    inpXo[0]+=K('D')-K('A');inpXo[2]+=K('W')-K('S');inpXo[1]+=K('E')-K('Q');const o=inpHS(inpXo,yaw,[0,0,0]);
    L={...inpLast.L,p:add(inpLast.L.p,o)};R={...inpLast.R,p:add(inpLast.R.p,o)};
  }else{
    for(const p of[inpHR,inpHL]){p[0]+=K('D')-K('A');p[2]+=K('W')-K('S');p[1]+=K('E')-K('Q');const l=Math.hypot(...p);if(l>1)for(let i=0;i<3;i++)p[i]/=l}
    cam.rotation.set(inpPit,PI+inpYaw,0);yaw=inpYaw;const f=inpFw(cam.quaternion);
    H={p:[0,1.6,0],f};L={p:inpHS(inpHL,yaw,H.p),f,t:0,g:0};R={p:inpHS(inpHR,yaw,H.p),f,t:0,g:0};
  }
  if(inpMb[1]||inpK.KeyB)L.t=1;if(inpMb[0]||inpK.KeyB)R.t=1;if(inpK.KeyV)L.g=R.g=1;
  if(inpMac){inpMacT+=dt;const u=min(1,inpMacT/[.9,.7,.7][inpMac-1]),[l,r,g]=inpGens[inpMac-1](u);L={...L,p:inpHS(l,yaw,H.p),t:0,g};R={...R,p:inpHS(r,yaw,H.p),t:0,g};
    if(u>=1){inpMac=0;inpHL.splice(0,3,-.36,-.35,.6);inpHR.splice(0,3,.36,-.35,.6);inpXo=[0,0,0]}}
  return{L,R,H};
}
