// quick.mjs — ad-hoc sim harness
import {createSim,DT,N,hd} from '../src/sim.js';
const H={p:[0,1.6,0],f:[0,0,1]};
const mk=()=>{const S=createSim(1);const inj=(L,R,lt=0,rt=0)=>{S.inject({p:L,f:[0,0,1],t:lt,g:0},{p:R,f:[0,0,1],t:rt,g:0},H);S.step()};
  const L0=[-.25,1.2,.45],R0=[.25,1.2,.45];inj(L0,R0,1,0);inj(L0,R0,0,0);for(let i=0;i<200;i++)inj(L0,R0);S.drain();return{S,inj,L0,R0}};
const ks=S=>S.drain().map(e=>e.k+(e.b?':'+e.b:'')).filter(k=>!k.startsWith('bolt')).join(',');
// ---- lasso: hold R trigger, spin hand overhead, release → loop flies at enemy
{const{S,inj,L0,R0}=mk();const e=S._spawn(0,0,2.5);e._st=3;e._sd=99; // stagger so it stands still
  for(let i=0;i<40;i++)inj(L0,R0,0,1);console.log('lasso mode',S._md,ks(S));
  let t=0;for(let i=0;i<90;i++){t+=DT;const a=t*12;inj(L0,[Math.sin(a)*.35,1.7+Math.cos(a)*.1,Math.cos(a)*.35],0,1)}
  console.log('tip speed',S._tip.toFixed(1),'tipI',S._tipI,'tip pos',S._rp[N].map(x=>x.toFixed(2)));
  // release when the tip moves toward +z (enemy at z=2.5)
  let rel=0;for(let i=0;i<60&&!rel;i++){t+=DT;const a=t*12;const v=S._rv[N];if(v[2]>3&&Math.abs(v[0])<v[2]*.4){inj(L0,[Math.sin(a)*.35,1.7+Math.cos(a)*.1,Math.cos(a)*.35],0,0);rel=1}else inj(L0,[Math.sin(a)*.35,1.7+Math.cos(a)*.1,Math.cos(a)*.35],0,1)}
  console.log('released',rel,'ls',S._ls&&S._ls.out,'v',S._ls&&S._ls.v.map(x=>x.toFixed(1)),ks(S));
  for(let i=0;i<120&&!(S._ls&&S._ls.e);i++)inj(L0,R0);console.log('caught',!!(S._ls&&S._ls.e),'ls.p',S._ls&&S._ls.p.map(x=>x.toFixed(2)),ks(S),'e st',e._st);
  // yank: move R hand back fast
  let z=R0[2];for(let i=0;i<20;i++){z-=5*DT;inj(L0,[.25,1.2,z])}console.log('yank →',ks(S),'e hp',e._hp,'st',e._st,'mode',S._md);}
// ---- block: stalker rears, arch held in front
{const{S,inj,L0,R0}=mk();const e=S._spawn(0,0,1.3);
  for(let i=0;i<120;i++)inj([-.25,1.1,.5],[.25,1.1,.5],1,1);console.log('block →',ks(S),'light',S._light,'e st',e._st);
  for(let i=0;i<400;i++)inj([-.25,1.1,.5],[.25,1.1,.5]);console.log('no arch →',ks(S),'light',S._light);}
// ---- whip crack: slack rope, flick
{const{S,inj,L0,R0}=mk();const e=S._spawn(0,0,1.2);e._st=3;e._sd=99;
  for(let i=0;i<30;i++)inj([-.2,1,-.2],[.2,1,-.2]);
  for(let i=0;i<120;i++){const t=i*DT;let z,y;if(t<.25){const u=t/.25;z=-.2+.9*u;y=1+.6*Math.sin(u*Math.PI)}else{z=.7;y=1}inj([-.2,y,z],[.2,y,z])}
  console.log('whip →',ks(S),'e hp',e._hp);}
// ---- nova: charge 3 then clap
{const{S,inj,L0,R0}=mk();S._ch=3;for(let i=0;i<5;i++)S._spawn(0,i,3);
  for(let i=0;i<20;i++)inj(L0,R0,1,1);let d=.5;for(let i=0;i<10;i++){d-=4*DT;inj([-d/2,1.2,.45],[d/2,1.2,.45],1,1)}
  console.log('nova →',ks(S),'ch',S._ch,'md',S._md,'alive',S._en.filter(e=>e._st!=5).length);
  for(let i=0;i<90;i++)inj(L0,R0);console.log('after',S._md,S._en.length);}
// ---- idle: how long to die
{const S=createSim(2);const inj=(lt)=>{S.inject({p:[-.3,1.2,.3],f:[0,0,1],t:lt,g:0},{p:[.3,1.2,.3],f:[0,0,1],t:0,g:0},H);S.step()};inj(1);inj(0);
  let t=0;while(S._ws!=3&&t<300){inj(0);t+=DT}console.log('idle died at',t.toFixed(1),'wave',S._wave,'light',S._light);}
