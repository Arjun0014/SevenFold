import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const seed=+process.argv[2],from=+process.argv[3],to=+process.argv[4];
const S=createSim(seed);const b=makeBot(S);let last=-1;
while(S._t<to&&S._ws!=3){b.step();const evs=S.drain();
 if(S._t>=from){for(const e of evs)if(!['spawn','draw','cue','crack'].includes(e.k))console.log(S._t.toFixed(1),e.k,e.b,e.d,e.p&&e.p.map(x=>x.toFixed(1)).join(','));
  if(Math.floor(S._t)!=last){last=Math.floor(S._t);const en=S._en.map(e=>`${e._t}@${e._p.map(x=>x.toFixed(1)).join(',')}hp${e._parts.map(p=>p._hp).join('/')}`).join(' | ');console.log('t',last,'wave',S._wave,'ws',S._ws,'wp',S._wp,'light',S._light,'head',b.head.map(x=>x.toFixed(2)).join(','),'L',b.L.map(x=>x.toFixed(2)).join(','),'R',b.R.map(x=>x.toFixed(2)).join(','),'fg',S._fg.on,S._fg.cd.toFixed(1),'|',en)}}}
