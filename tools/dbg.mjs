import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const S=createSim(1);const b=makeBot(S);
while(S._t<70&&S._ws!=3){b.step();for(const e of S.drain()){if(e.k=='cue'||e.k=='strike'||e.k=='light'||e.k=='sweep')console.log(S._t.toFixed(2),e.k,e.p&&e.p.map(x=>x.toFixed(2)).join(','),'head',b.head.map(x=>x.toFixed(2)).join(','),'atk',JSON.stringify(S._en.find(x=>x._boss>=0)?._atk))}}
