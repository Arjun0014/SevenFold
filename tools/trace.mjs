// trace.mjs — run a seed, dump state snapshots in a wave-time window. Usage: node tools/trace.mjs seed wave fromSec toSec [everySec]
import {createSim,DT,hd} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const [seed,wave,from,to,every]=process.argv.slice(2).map(Number);
const S=createSim(seed),b=makeBot(S);let t=0,next=from;
while(t<900){b.step();t+=DT;const ev=S.drain().filter(e=>['hurt','gore','block','stagger','charge','cue','strike','throw','catch','nova'].includes(e.k));
  if(S._wave==wave&&S._ws==1&&S._wtime>=from&&S._wtime<=to){if(ev.length)console.log(`   ev@${S._wtime.toFixed(2)}: ${ev.map(e=>e.k).join(',')} light=${S._light}`);
    if(S._wtime>=next){next+=every||1;
    console.log(`t=${S._wtime.toFixed(1)} md=${S._md} act=${b.act&&b.act.k} light=${S._light} ch=${S._ch} yaw=${b.yaw.toFixed(2)} hp=${b.hp.map(x=>x.toFixed(2))} hands=${S._L.p.map(x=>x.toFixed(2))}/${S._R.p.map(x=>x.toFixed(2))} tr=${b.lt}${b.rt}`);
    for(const e of S._en)if(e._boss||e._st<5)console.log(`   v${e._v} st${e._st} hp${e._hp} b${e._b} d=${Math.hypot(e._p[0]-S._H.p[0],e._p[2]-S._H.p[2]).toFixed(2)} yaw=${e._yaw.toFixed(2)} p=${e._p.map(x=>x.toFixed(1))} tm=${e._tm.toFixed(2)} cnt=${e._cnt}`)}}
  if(S._wave>wave||S._ws>=3)break}
