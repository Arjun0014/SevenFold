import {createSim} from '../src/sim.js';
import {makeBot} from '../test/bot.js';
const seed=+process.argv[2],wave=+process.argv[3];
const S=createSim(seed);const b=makeBot(S);let last=-1,tasks={};
while(S._ws!=3&&S._t<700){b.step();const evs=S.drain();
 if(S._wave==wave&&S._ws==1){tasks[b.name]=(tasks[b.name]||0)+1;
  for(const e of evs)if(['plate','kill','light','dive','swing','sting','clank','arrow','forged','unforge','block','absorb'].includes(e.k))console.log('   ',S._t.toFixed(2),e.k,'band',e.b,'d',e.d);
  if(Math.floor(S._t*2)!=last){last=Math.floor(S._t*2);const en=S._en.map(e=>`${e._t}:${Math.hypot(e._p[0],e._p[2]+1.8).toFixed(1)}m/${e._parts.filter(p=>p._hp>0).length}p${e._t==0?'s'+e._st:''}`).join(' ');console.log(S._t.toFixed(1),b.name.padEnd(6),'L'+S._light,'hd',b.head.map(x=>x.toFixed(1)).join(','),'|',en)}}
 if(S._wave>wave)break}
console.log('task steps',JSON.stringify(tasks));
