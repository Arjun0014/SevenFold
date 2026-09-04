import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
for(const seed of process.argv.slice(2).map(Number)){
const S=createSim(seed);const b=makeBot(S);const out=[];
while(S._t<700&&S._ws!=3&&S._ws!=4){b.step();const evs=S.drain();if(evs.some(e=>e.k=='light')){const c=evs.filter(e=>['strike','sweep','lunge','dive','swing','orbhit','sting','pulse'].includes(e.k)).map(e=>e.k+(e.k=='orbhit'?'('+e.d+')':'')).join('+');out.push(`w${S._wave}@${S._t.toFixed(0)}:${c}`)}}
console.log('seed',seed,'wave',S._wave,'ws',S._ws,'light',S._light,'|',out.join(' '));}
