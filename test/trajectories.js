// trajectories.js — synthetic hand trajectories for the five sigils (+ negatives).
// A trajectory is {name, want, frames:[{L:[x,y,z],R:[x,y,z]}]} in ARENA space, sampled at 90 Hz,
// generated in head space (x=right, y=up rel. to head, z=forward) then rotated by head yaw.
import {sin,cos,PI} from '../src/vec.js';
const HEAD=[0,1.6,0];
// head-space -> arena for a head facing yaw psi (yaw 0 => +z), see sim.js headSpace()
export const toArena=(p,psi)=>[HEAD[0]-cos(psi)*p[0]+sin(psi)*p[2],HEAD[1]+p[1],HEAD[2]+sin(psi)*p[0]+cos(psi)*p[2]];
export const headQ=psi=>[0,sin((psi+PI)/2),0,cos((psi+PI)/2)]; // quaternion whose forward (0,0,-1) maps to yaw psi
const rng=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};

// Each sigil: (u in [0,1], amp) => [Lhead, Rhead] (head space). Hands ~0.4 m in front, 0.4 below eyes.
const Y=-.4,Z=.4;
export const SIGILS={
  lance:{want:1,gen:(u,a)=>{const d=.05+(a-.05)*u;return [[-d/2,Y,Z],[d/2,Y,Z]]},small:1.15,large:1.5,norm:1.3},
  shards:{want:4,gen:(u,a)=>{const x=-.15+(.15+a/2)*u;return [[ -x,Y,Z],[x,Y,Z]]},small:.55,large:.9,norm:.7},
  maul:{want:3,gen:(u,a)=>{const y=Y+(u<.5?u*2:2-u*2)*a;return [[-.1,y,Z],[.1,y,Z]]},small:.4,large:.8,norm:.6},
  halo:{want:2,gen:(u,a)=>{const t=u*2*PI*1.05,x=sin(t)*a,y=Y+(1-cos(t))*a;return [[x-.1,y,Z],[x+.1,y,Z]]},small:.15,large:.3,norm:.22},
  prism:{want:5,gen:(u,a)=>{const t=u*a*PI/180,c=cos(t)*.15,s=sin(t)*.15;return [[-c,Y-s,Z],[c,Y+s,Z]]},small:160,large:300,norm:200},
};
export function make(name,opts={}){
  const g=SIGILS[name],dur=opts.dur||1,amp=opts.amp||g.norm,psi=opts.yaw||0,n=Math.round(dur*90),J=opts.jitter||0,r=rng(7),frames=[];
  for(let i=0;i<=n;i++){let [L,R]=g.gen(i/n,amp);
    if(opts.mirror){const m=p=>[-p[0],p[1],p[2]];[L,R]=[m(R),m(L)]}
    if(J){L=L.map(v=>v+(r()*2-1)*J);R=R.map(v=>v+(r()*2-1)*J)}
    frames.push({L:toArena(L,psi),R:toArena(R,psi)})}
  return {name,want:g.want,frames,yaw:psi,label:name+':'+(opts.label||'clean')};
}
export function variants(name){
  return [make(name),make(name,{jitter:.03,label:'jitter'}),make(name,{dur:2.4,label:'slow'}),make(name,{dur:.5,label:'fast'}),make(name,{mirror:1,label:'mirror'}),
    make(name,{yaw:PI/2,label:'yaw90'}),make(name,{yaw:PI,label:'yaw180'}),make(name,{yaw:-PI/2,label:'yaw270'}),
    make(name,{amp:SIGILS[name].small,label:'small'}),make(name,{amp:SIGILS[name].large,label:'large'})];
}
// negatives: must resolve to rope (0)
export function negatives(){
  const out=[],r=rng(3);
  const custom=(label,f,n=90)=>{const frames=[];for(let i=0;i<=n;i++){const[L,R]=f(i/n);frames.push({L:toArena(L,0),R:toArena(R,0)})}out.push({name:'none',want:0,frames,yaw:0,label:'neg:'+label})};
  custom('straight small',u=>[[-.15,Y,Z+u*.3],[.15,Y,Z+u*.3]]);
  custom('straight small up',u=>[[-.15,Y+u*.25,Z],[.15,Y+u*.25,Z]]);
  custom('sideways',u=>[[-.15+u*.4,Y,Z],[.15+u*.4,Y,Z]]);
  for(let k=0;k<4;k++){let L=[-.15,Y,Z],R=[.15,Y,Z];custom('wander'+k,u=>{L=L.map(v=>v+(r()-.5)*.02);R=R.map(v=>v+(r()-.5)*.02);return[L,R]},120)}
  custom('half circle',u=>{const t=u*PI,x=sin(t)*.25,y=Y+(1-cos(t))*.25;return[[x-.1,y,Z],[x+.1,y,Z]]});
  custom('stretch 0.9',u=>{const d=.1+.8*u;return[[-d/2,Y,Z],[d/2,Y,Z]]});
  custom('stretch 1.0',u=>{const d=.1+.9*u;return[[-d/2,Y,Z],[d/2,Y,Z]]});
  custom('raise only',u=>[[-.1,Y+u*.6,Z],[.1,Y+u*.6,Z]]);
  custom('drop only',u=>[[-.1,Y+.3-u*.6,Z],[.1,Y+.3-u*.6,Z]]);
  custom('raise small drop',u=>{const y=Y+(u<.5?u*2:1-(u-.5)*.6)*.5;return[[-.1,y,Z],[.1,y,Z]]});
  custom('cross no pull',u=>{const x=-.15+.3*u;return[[-x,Y,Z],[x,Y,Z]]});
  custom('uncross wide start',u=>{const x=.4+.2*u;return[[-x,Y,Z],[x,Y,Z]]});
  custom('twist 90',u=>{const t=u*PI/2,c=cos(t)*.15,s=sin(t)*.15;return[[-c,Y-s,Z],[c,Y+s,Z]]});
  custom('twist wide 200',u=>{const t=u*200*PI/180,c=cos(t)*.3,s=sin(t)*.3;return[[-c,Y-s,Z],[c,Y+s,Z]]});
  custom('apart wander',u=>[[-.35+sin(u*6)*.1,Y+cos(u*5)*.1,Z],[.35+cos(u*7)*.1,Y+sin(u*4)*.1,Z]]);
  custom('loop wide hands',u=>{const t=u*2*PI*1.05,x=sin(t)*.25,y=Y+(1-cos(t))*.25;return[[x-.3,y,Z],[x+.3,y,Z]]});
  custom('stretch with big path',u=>{const d=.2+1.2*u;return[[-d/2,Y+u*.7,Z],[d/2,Y+u*.7,Z]]});
  return out;
}
