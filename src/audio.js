// audio.js — tiny Web Audio synth: drone, rope hum, event blips pitched by band (build flag --audio).
let auC,auG,auHum,auDr;
const auO=(t,f,g)=>{const x=auC.createOscillator(),y=auC.createGain();x.type=t;x.frequency.value=f;y.gain.value=g;x.connect(y);y.connect(auG);x.start();return[x,y]};
// event → [pitch × band, seconds, wave, gain, glide ×]
const auT={crack:[4,.08,'square',.2,.5],hit:[2,.06,'triangle',.15],res:[4,.25,'sine',.2,6],forge:[.5,.4,'sine',.15,2],forged:[4,.3,'sine',.2,8],kill:[1,.3,'triangle',.2,.25],light:[1,.6,'sawtooth',.25,.25],wave:[2,.5,'sine',.2,4],cue:[.4,.8,'sawtooth',.12,2]};
export function auInit(){if(auC)return;try{auC=new AudioContext;auG=auC.createGain();auG.connect(auC.destination);auO('sawtooth',55,.04);auDr=auO('sine',55.3,.05)[0];auHum=auO('sine',110,0)}catch(e){}}
export function auSync(S,ev,mute){if(!auC)return;auG.gain.value=mute?0:.4;if(auC.state=='suspended')auC.resume();
  auHum[1].gain.value=S._wp?0:S._ten*.05;auHum[0].frequency.value=110+S._ten*220;auDr.frequency.value=S._en.some(e=>e._boss>=0)?58:55.3;
  for(const e of ev){const a=auT[e.k];if(!a)continue;const f=220*1.06**(e.b-3)*a[0],n=auC.currentTime,[x,y]=auO(a[2],f,a[3]);
    if(a[4])x.frequency.exponentialRampToValueAtTime(f*a[4],n+a[1]);y.gain.exponentialRampToValueAtTime(.001,n+a[1]);x.stop(n+a[1])}}
