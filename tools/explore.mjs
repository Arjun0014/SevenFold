import {createSim,DT,N} from '../src/sim.js';
const S=createSim(1);S._ws=1;
const inj=(L,R,t)=>{S.inject({p:L,t:t||0,g:0},{p:R,t:0,g:0},{p:[0,1.6,0],q:[0,1,0,0]});S.step()};
// whip: slack hands 0.4 apart at chest, both swing forward fast then stop
let cracks=[],maxTip=0;
const e=S._spawn(1,0,1.6); // husk 1.6 m in front? bpos(b,r)-> [sin b*r, y, cos b*r]; b=0 -> +z
console.log('enemy at',e._p);
for(let i=0;i<270;i++){const t=i*DT;
  // swing: hands move along an arc from behind (z=-0.2) to front (z=+0.6) in 0.25 s then hold
  let z,y;if(t<.3){z=-.2;y=1.0}else if(t<.55){const u=(t-.3)/.25;z=-.2+.9*u;y=1.0+.6*Math.sin(u*Math.PI)}else{z=.7;y=1.0}
  inj([-.2,y,z],[.2,y,z]);
  maxTip=Math.max(maxTip,S._tip);
  for(const ev of S.drain())if(ev.k=='crack'||ev.k=='hit')cracks.push([+t.toFixed(2),ev.k,ev.b,ev.d]);
}
console.log('whip maxTip',maxTip.toFixed(1),'events',JSON.stringify(cracks));
// arc: hands 0.9 apart, sweep sideways through enemy
const S2=createSim(1);S2._ws=1;const e2=S2._spawn(1,0,1.0);let hits=[],maxV=0;
const inj2=(L,R)=>{S2.inject({p:L,t:0,g:0},{p:R,t:0,g:0},{p:[0,1.6,0],q:[0,1,0,0]});S2.step()};
for(let i=0;i<180;i++){const t=i*DT;let x;if(t<.5)x=-1;else if(t<.9)x=-1+2*(t-.5)/.4;else x=1;
  inj2([x-.45,1.1,.8],[x+.45,1.1,.8]);maxV=Math.max(maxV,Math.max(...S2._rv.map(v=>Math.hypot(...v))));
  for(const ev of S2.drain())if(ev.k=='hit'||ev.k=='res')hits.push([+t.toFixed(2),ev.k,ev.b,ev.d,e2._parts[0]._hp])}
console.log('arc ten',S2._ten.toFixed(2),'maxV',maxV.toFixed(1),'hits',JSON.stringify(hits),'enemy hp',e2._parts[0]._hp,'band',e2._b);
