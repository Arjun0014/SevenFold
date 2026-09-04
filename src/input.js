// input.js — desktop controls and XR controller state → sim hand state in ARENA space.
// Arena: player origin, yaw 0 => forward +z. Head space: x right, y up, z forward (see sim headSpace()).
import {sin,cos,PI,min,max,clamp} from './vec.js';
import {xrS} from './xr.js';

export const inpO={x:0,z:0,y:0};      // arena origin in world space (x,z) and yaw (XR recentre)
const inpK={};let inpYaw=0,inpPit=0,inpMb=[0,0],inpSig=0,inpSigT=0,inpRoll=0;
const inpHL=[-.25,-.35,.45],inpHR=[.25,-.35,.45]; // desktop hand offsets in head space
const inpY=-.3,inpZ=.5;
// canned sigils 1..5 (Shards, Maul, Halo, Prism, Lance): u∈[0,1] → [L,R] in head space
const inpGens=[
  u=>{const x=-.15+.5*u;return[[-x,inpY,inpZ],[x,inpY,inpZ]]},
  u=>{const y=inpY+(u<.5?u*2:2-u*2)*.6;return[[-.1,y,inpZ],[.1,y,inpZ]]},
  u=>{const t=u*6.6,x=sin(t)*.22,y=inpY+(1-cos(t))*.22;return[[x-.1,y,inpZ],[x+.1,y,inpZ]]},
  u=>{const t=u*3.49,c=cos(t)*.15,s=sin(t)*.15;return[[-c,inpY-s,inpZ],[c,inpY+s,inpZ]]},
  u=>{const d=.05+1.25*u;return[[-d/2,inpY,inpZ],[d/2,inpY,inpZ]]}];
export const inpKeys={};             // one-shot keys read by main: r (restart) m (mute) f (fullscreen)
export const inpSigil=k=>{if(!inpSig&&k>=1&&k<=5){inpSig=k;inpSigT=0}};
const inpToA=(p,y)=>[-cos(y)*p[0]+sin(y)*p[2],1.6+p[1],sin(y)*p[0]+cos(y)*p[2]]; // head space → arena, desktop head at (0,1.6,0)
const inpQm=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const inpQy=y=>[0,sin(y/2),0,cos(y/2)];
let inpLast={L:{p:[-.3,1.2,.3],q:[0,1,0,0],t:0,g:0},R:{p:[.3,1.2,.3],q:[0,1,0,0],t:0,g:0}}; // last XR hand poses (frozen on disconnect)

export function inpInit(cv){
  onkeydown=e=>{inpK[e.code]=1;const k=e.key.toLowerCase();if(k>='1'&&k<='5')inpSigil(+k);if(k==' ')e.preventDefault();if(k=='r'||k=='m'||k=='f')inpKeys[k]=1};
  onkeyup=e=>{inpK[e.code]=0};
  cv.onmousedown=e=>{inpMb[e.button==2?1:0]=1;if(cv.requestPointerLock)cv.requestPointerLock()};
  onmouseup=e=>{inpMb[e.button==2?1:0]=0};
  cv.oncontextmenu=e=>e.preventDefault();
  onmousemove=e=>{if(document.pointerLockElement==cv){inpYaw-=e.movementX*.003;inpPit=clamp(inpPit-e.movementY*.003,-1.4,1.4)}};
  onwheel=e=>{inpRoll+=(e.deltaY>0?1:-1)*2*PI/7};
}
// Poll once per sim step. cam = the Three camera (XR-updated when presenting). dt = DT.
export function inpPoll(cam,dt){
  if(xrS.on){
    const O=inpO,c=cos(O.y),s=sin(O.y),qo=inpQy(-O.y),lift=xrS.lo?1.6:0;
    const ta=p=>{const x=p.x-O.x,z=p.z-O.z;return[c*x-s*z,p.y+lift,s*x+c*z]},qa=q=>inpQm(qo,[q.x,q.y,q.z,q.w]);
    const H={p:ta(cam.position),q:qa(cam.quaternion)};
    let n=0;for(const h of xrS.h){if(!h.on)continue;const k=h.hand=='left'?'L':h.hand=='right'?'R':n?'L':'R';n++;
      inpLast[k]={p:ta(h.g.position),q:qa(h.g.quaternion),t:h.t,g:h.q}}
    return{L:inpLast.L,R:inpLast.R,H};
  }
  // desktop
  const v=1.5*dt,K=x=>inpK['Key'+x]?v:0;
  for(const[p,k]of[[inpHR,'ADSWQE'],[inpHL,'JLKIUO']]){p[0]+=K(k[1])-K(k[0]);p[2]+=K(k[3])-K(k[2]);p[1]+=K(k[5])-K(k[4]);const l=Math.hypot(...p);if(l>1)for(let i=0;i<3;i++)p[i]/=l}
  cam.rotation.set(inpPit,PI+inpYaw,0);
  const H={p:[0,1.6,0],q:[cam.quaternion.x,cam.quaternion.y,cam.quaternion.z,cam.quaternion.w]};
  let l=inpHL,r=inpHR,g=K.Space?1:0;
  if(inpSig){inpSigT+=dt;const u=min(1,inpSigT/.6);[l,r]=inpGens[inpSig-1](u);g=1;if(u>=1){inpSig=0;inpHL.splice(0,3,...l);inpHR.splice(0,3,...r)}}
  const q=inpQy(inpYaw+PI),qr=inpQm(q,[0,0,sin(inpRoll/2),cos(inpRoll/2)]);
  return{L:{p:inpToA(l,inpYaw),q,t:inpMb[1],g},R:{p:inpToA(r,inpYaw),q:qr,t:inpMb[0],g},H};
}
