import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const seed=+process.argv[2],from=+process.argv[3],to=+process.argv[4],every=+process.argv[5]||9;
const S=createSim(seed);const b=makeBot(S);let n=0;
const pp=(e,pt)=>{if(pt._w)return pt._w;const o=pt._o;if(e._boss>=0){const r=e._rt,f=e._fw;return [e._p[0]+r[0]*o[0]+f[0]*o[2],e._p[1]+o[1],e._p[2]+r[2]*o[0]+f[2]*o[2]]}return [e._p[0]+o[0],e._p[1]+o[1],e._p[2]+o[2]]};
while(S._t<to&&S._ws!=3){b.step();const evs=S.drain();
 if(S._t>=from){for(const e of evs)if(!['spawn','draw','cue','arrow','res'].includes(e.k))console.log('  ev',S._t.toFixed(2),e.k,e.b,e.d);
  if(n++%every==0){const en=S._en.map(e=>`${e._t}:`+e._parts.filter(p=>p._hp>0).map(p=>'b'+p._b+'@'+pp(e,p).map(x=>x.toFixed(2)).join(',')+(p._cd>0?'cd':'')).join(' ')).join(' | ');
   console.log(S._t.toFixed(2),b.name,'wp',S._wp,'L',b.L.map(x=>x.toFixed(2)).join(','),'R',b.R.map(x=>x.toFixed(2)).join(','),'hd',b.head.map(x=>x.toFixed(2)).join(','),'tH',b.tH.map(x=>x.toFixed(2)).join(','),'|',en)}}}
