import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const S=createSim(1);const b=makeBot(S);
let n=0;
while(S._t<48&&S._ws!=3){b.step();const bo=S._en.find(x=>x._boss>=0);if(bo&&bo._atk&&n++<40)console.log(S._t.toFixed(2),'head',b.head.map(x=>x.toFixed(3)).join(','),'tH',b.tH.map(x=>x.toFixed(3)).join(','),'pause',b.pause,'task',!!b.task)}
