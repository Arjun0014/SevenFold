import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
import {dist,sub,norm,add,mul} from '../src/vec.js';
const seed=+process.argv[2],from=+process.argv[3],to=+process.argv[4],every=+process.argv[5]||.1;
const S=createSim(seed);const b=makeBot(S);let next=from;const f=x=>x.toFixed(2);
while(S._t<to&&S._ws!=3){b.step();const evs=S.drain().filter(e=>['hit','res','clank','phase','cue','lunge','stagger','sweep','strike','light','block'].includes(e.k));
 if(S._t>=from&&(S._t>=next||evs.length)){if(S._t>=next)next+=every;const bo=S._en.find(e=>e._boss>=0);
  const core=bo&&bo._parts[6];const cp=core&&add(bo._p,core._o);const L=S._L.p,R=S._R.p,tip=add(L,mul(norm(sub(R,L)),2.2));
  console.log(f(S._t),b.name,'hd',b.head.map(f).join(','),'core',cp?cp.map(f).join(','):'-','b',core&&core._b,'hp',core&&core._hp,'cd',core&&f(core._cd||0),'L',L.map(f).join(','),'R',R.map(f).join(','),'|dLc',cp?f(dist(L,cp)):'-','dTipc',cp?f(dist(tip,cp)):'-','atk',bo&&bo._atk?bo._atk.k:'-','stg',bo&&f(bo._stg),'|',evs.map(e=>e.k+(e.d!=null?'('+e.d+')':'')+(e.b?'b'+e.b:'')).join(','))}}
