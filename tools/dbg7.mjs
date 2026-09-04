import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const seed=+process.argv[2],from=+process.argv[3],to=+process.argv[4];
const S=createSim(seed);const b=makeBot(S);let n=0;
while(S._t<to&&S._ws!=3){b.step();const evs=S.drain();
 if(S._t>=from&&n++%4==0){console.log(S._t.toFixed(2),b.name,'wp',S._wp,'bow',!!S._bow,'hd',b.head.map(x=>x.toFixed(2)).join(','),'hT',(b.headT||[0,0,0]).map(x=>x.toFixed(2)).join(','),'od',b.od?b.od.t.map(x=>x.toFixed(2)).join(','):'-','thr',!!b.orbThreat(),'boss',!!S._en.find(e=>e._boss>=0),'orbs',S._pr.map(o=>o.p.map(x=>x.toFixed(2)).join(',')+'>'+o.v.map(x=>x.toFixed(1)).join(',')).join(' | '),evs.filter(e=>e.k=='orbhit'||e.k=='light'||e.k=='spit').map(e=>e.k+e.d).join(','))}}
