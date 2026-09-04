// audio.js — tiny Web Audio synth: drone, rope hum, event blips pitched by band. No files (ZzFX cut for size).
// Build-optional: included with `node build.js --audio` (see DECISIONS.md, priority 5).
let auC,auG,auLp,auDr,auHum;
const auW=['sine','square','sawtooth','triangle'];
const auO=(t,f,g,d)=>{const x=auC.createOscillator(),y=auC.createGain();x.type=auW[t];x.frequency.value=f;y.gain.value=g;x.connect(y);y.connect(d||auG);x.start();return[x,y]};
// event → [freq ×band-pitch, duration, wave, gain, glide ×] (0 = absolute pitch)
const auT={crack:[4,.08,1,.2,1],hit:[2,.06,3,.12],res:[4,.25,0,.2,6],arrow:[3,.1,2,.1,1],forge:[.5,.4,0,.15,2],forged:[4,.3,0,.2,8],unforge:[2,.3,0,.1,.5],kill:[1,.3,3,.2,.25],light:[1,.6,2,.25,.25],wave:[2,.5,0,.2,4],boss:[.5,.8,2,.25,.25],dawn:[2,2,0,.2,8],cue:[.4,.8,2,.12,2],block:[3,.1,1,.1],absorb:[3,.2,0,.15,6],clank:[3,.1,1,.1]};
export function auInit(){if(auC)return;try{auC=new AudioContext;auG=auC.createGain();auG.connect(auC.destination);auLp=auC.createBiquadFilter();auLp.frequency.value=300;auLp.connect(auG);
  auO(2,55,.05,auLp);auDr=auO(0,55.3,.05,auLp)[0];auHum=auO(0,110,0)}catch(e){}}
export function auSync(S,ev,mute){if(!auC)return;auG.gain.value=mute?0:.4;if(auC.state=='suspended')auC.resume();
  auHum[1].gain.value=S._wp?0:S._ten*.05;auHum[0].frequency.value=110+S._ten*220;
  auDr.frequency.value=S._en.some(e=>e._boss>=0)?58:55.3;auLp.frequency.value=S._fg.on?120:300;
  for(const e of ev){const a=auT[e.k];if(!a)continue;const f=220*1.06**(e.b-3)*a[0],n=auC.currentTime,d=a[1],[x,y]=auO(a[2],f,a[3]);
    if(a[4])x.frequency.exponentialRampToValueAtTime(f*a[4],n+d);y.gain.exponentialRampToValueAtTime(.001,n+d);x.stop(n+d)}}
