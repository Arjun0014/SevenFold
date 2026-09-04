import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
import {segd,norm,sub,add,mul} from '../src/vec.js';
const seed=+process.argv[2],from=+process.argv[3],to=+process.argv[4];
const S=createSim(seed);const b=makeBot(S);let n=0;const f=x=>x.toFixed(2);
while(S._t<to&&S._ws!=3){b.step();const evs=S.drain();
 if(S._t>=from&&(n++%3==0||evs.some(e=>e.k=='orbhit'||e.k=='block'))){const L=S._L.p,R=S._R.p,tip=add(L,mul(norm(sub(R,L)),2.2));
  console.log(f(S._t),b.name,'wp'+S._wp,'hd',b.head.map(f).join(','),'L',L.map(f).join(','),'R',R.map(f).join(','),'tip',tip.map(f).join(','),'|',S._pr.map(o=>'orb'+o.p.map(f).join(',')+' d2lance='+f(segd(o.p,L,tip)[0])).join(' '),evs.filter(e=>e.k=='orbhit'||e.k=='block'||e.k=='light').map(e=>e.k+e.d).join(','))}}
