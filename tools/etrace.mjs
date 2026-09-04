import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const seed=+process.argv[2],from=+process.argv[3],to=+process.argv[4];
const S=createSim(seed);const b=makeBot(S);const f=x=>x.toFixed(2);
while(S._t<to&&S._ws!=3){b.step();const evs=S.drain().filter(e=>['hit','res','eye','phase','arrow','pulse','gravity'].includes(e.k));
 if(S._t>=from&&evs.length){const bo=S._en.find(e=>e._boss>=0);console.log(f(S._t),b.name,'eyeb',bo&&bo._parts[0]._b,'hp',bo&&bo._parts[0]._hp,'open',bo&&f(bo._open),'|',evs.map(e=>e.k+'(d'+e.d+',b'+e.b+')').join(','))}}
