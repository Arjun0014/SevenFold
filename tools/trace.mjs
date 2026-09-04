import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const seed=+process.argv[2],from=+process.argv[3],to=+process.argv[4],every=+process.argv[5]||.25;
const S=createSim(seed);const b=makeBot(S);let next=from;
const f=x=>x.toFixed(2);
while(S._t<to&&S._ws!=3){b.step();const evs=S.drain().filter(e=>!['hit','res','clank','crack','spawn'].includes(e.k));
 if(S._t>=from&&(S._t>=next||evs.length)){if(S._t>=next)next+=every;
  const en=S._en.filter(e=>e._hp>0).map(e=>`${'WHSPZ'[e._t]||'B'}${e._boss>=0?e._ph:''}:d${Math.hypot(e._p[0],e._p[2]+1.8).toFixed(1)}/h${Math.hypot(e._p[0]-b.head[0],e._p[2]-b.head[2]).toFixed(1)} st${e._st} at${(e._at||0).toFixed(1)} hp${e._parts.filter(p=>p._hp>0).length}`).join(' ');
  console.log(f(S._t),b.name.padEnd(9),'wp'+S._wp,'L'+S._light,'hd',b.head.map(f).join(','),'|',en,'|',evs.map(e=>e.k+(e.d!=null?'('+e.d+')':'')).join(','))}}
