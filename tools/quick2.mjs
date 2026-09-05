import {createSim,DT,N} from '../src/sim.js';
const H={p:[0,1.6,0],f:[0,0,1]};const S=createSim(1);
const inj=(L,R,lt=0,rt=0,g=0)=>{S.inject({p:L,f:[0,0,1],t:lt,g},{p:R,f:[0,0,1],t:rt,g},H);S.step()};
const L0=[.36,1.25,.6],R0=[-.36,1.25,.6];inj(L0,R0,1,0);inj(L0,R0);for(let i=0;i<200;i++)inj(L0,R0);S._q=[];S._en=[];S.drain();
const e=S._spawn(0,0,1.1);e._st=3;e._sd=99;e._yaw=Math.atan2(-e._p[0],-e._p[2]);
console.log('enemy',e._p.map(x=>x.toFixed(2)),'yaw',e._yaw.toFixed(2));
for(let i=0;i<15;i++)inj(L0,R0,1,1);
let x=0;for(let i=0;i<30;i++){x+=5*DT;inj([.36+x,1.25,.6],[-.36+x,1.25,.6],1,1)}  // A: hands move +x
for(let i=0;i<40;i++){x-=5*DT;inj([.36+x,1.25,.6],[-.36+x,1.25,.6],1,1)}         // D: back
console.log(S.drain().map(e=>e.k).join(','),'hp',e._hp);
