import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const seed=+process.argv[2],from=+process.argv[3],to=+process.argv[4],every=+process.argv[5]||9;
const S=createSim(seed);const b=makeBot(S);let n=0;
while(S._t<to&&S._ws!=3){b.step();const evs=S.drain();
 if(S._t>=from){for(const e of evs)if(!['spawn','draw','cue','crack','arrow','res','hit'].includes(e.k))console.log('  ev',S._t.toFixed(2),e.k,e.b,e.d);
  if(n++%every==0){const bo=S._en.find(x=>x._boss>=0);const en=S._en.filter(x=>x._boss<0).map(e=>`${e._t}@${e._p.map(x=>x.toFixed(1)).join(',')}st${e._st}hp${e._parts.map(p=>p._hp).join('/')}`).join(' | ');
   console.log(S._t.toFixed(2),b.name,'wp',S._wp,'L',b.L.map(x=>x.toFixed(2)).join(','),'R',b.R.map(x=>x.toFixed(2)).join(','),'hd',b.head.map(x=>x.toFixed(2)).join(','),'tH',b.tH.map(x=>x.toFixed(2)).join(','),'atk',bo&&bo._atk?bo._atk.k+':'+bo._atk.t.toFixed(2):'-',bo?'core'+bo._parts[bo._parts.length-1]._hp+' cd'+(bo._parts[bo._parts.length-1]._cd||0).toFixed(2):'',en.slice(0,120))}}}
