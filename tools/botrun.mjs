// botrun.mjs — run the perfect bot over seeds and print per-wave clear times. Usage: node tools/botrun.mjs [seedFrom] [seedTo] [--idle|--noblock]
import {runBot} from '../test/bot.js';
const a=process.argv.slice(2),from=+a[0]||1,to=+a[1]||from,o={idle:a.includes('--idle'),noBlock:a.includes('--noblock')};
for(let s=from;s<=to;s++){const r=runBot(s,o);
  console.log(`seed ${s}: ${r.done?'DAWN':r.over?'DIED':'timeout'} wave ${r.wave} light ${r.light} t ${r.t}s thrown ${r.thrown} | waves ${r.waves.map(w=>w[0]+':'+w[1].toFixed(0)+'s').join(' ')} | hurt ${JSON.stringify(r.hurt)} | ev ${['throw','catch','hit','res','block','nova','gore','stagger','kill'].map(k=>k+'='+(r.ev[k]||0)).join(' ')}`)}
