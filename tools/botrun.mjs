import {createSim} from '../src/sim.js';
import {makeBot,runGame} from '../test/bot.js';
const seed=+process.argv[2]||1,stop=+process.argv[3]||4,no=process.argv[4]=='no';
const S=createSim(seed);const b=makeBot(S,{noForge:no});
const t0=Date.now();const r=runGame(S,b,{stopWave:stop,maxT:600});
console.log(JSON.stringify({waves:r.waves,light:r.light,minLight:r.minLight,reached:r.reached,t:r.t,ws:r.ws,ms:Date.now()-t0}));
console.log(JSON.stringify(r.counts));console.log(JSON.stringify(r.phases));
