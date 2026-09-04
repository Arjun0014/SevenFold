def sub(p,pairs):
    s=open(p,encoding='utf8').read()
    for a,b in pairs:
        assert s.count(a)==1,(p,a[:90])
        s=s.replace(a,b)
    open(p,'w',encoding='utf8').write(s)
# ---- audio: compact event table
open('src/audio.js','w',encoding='utf8').write("""// audio.js — tiny Web Audio synth: drone, rope hum, event blips pitched by band. No files (ZzFX cut for size).
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
""")
sub('src/main.js',[
("import {auInit,auSync} from './audio.js';","import {auInit,auSync} from './audio.js';\nlet mAu=()=>{},mAuS=()=>{}; // audio hooks (build-optional)\nmAu=auInit;mAuS=auSync; //@audio"),
("  xrInit(R,mB,()=>{started=1;mH.hidden=xrS.sup;auInit()},","  xrInit(R,mB,()=>{started=1;mH.hidden=xrS.sup;mAu()},"),
("    rdSync(sim,ev,dt);auSync(sim,ev,mute);","    rdSync(sim,ev,dt);mAuS(sim,ev,mute);"),
])
# ---- particles build-optional
sub('src/render.js',[
("const burst=(p,b,n,sp,up=0)=>{for(let k=0;k<n;k++){const i=rdLife.findIndex(l=>l<=0);if(i<0)return;rdLife[i]=.5+Math.random()*.5;rdPP[i*3]=p[0];rdPP[i*3+1]=p[1];rdPP[i*3+2]=p[2];\n  rdVel[i]=[(Math.random()-.5)*sp,(Math.random()-.5)*sp+up,(Math.random()-.5)*sp];const c=rdCol[b];rdPC[i*3]=c.r;rdPC[i*3+1]=c.g;rdPC[i*3+2]=c.b}};",
 "let burst=()=>{}; // particles are build-optional (node build.js --particles); no-op otherwise\nburst=(p,b,n,sp,up=0)=>{for(let k=0;k<n;k++){const i=rdLife.findIndex(l=>l<=0);if(i<0)return;rdLife[i]=.5+Math.random()*.5;rdPP[i*3]=p[0];rdPP[i*3+1]=p[1];rdPP[i*3+2]=p[2];rdVel[i]=[(Math.random()-.5)*sp,(Math.random()-.5)*sp+up,(Math.random()-.5)*sp];const c=rdCol[b];rdPC[i*3]=c.r;rdPC[i*3+1]=c.g;rdPC[i*3+2]=c.b}}; //@particles"),
("""  rdPP=new Float32Array(600*3).fill(-99);rdPC=new Float32Array(600*3);rdLife=new Array(600).fill(0);const pg=new G.BufferGeometry;pg.setAttribute('position',new G.BufferAttribute(rdPP,3));pg.setAttribute('color',new G.BufferAttribute(rdPC,3));
  rdPts=new G.Points(pg,new G.PointsMaterial({size:.06,vertexColors:true,transparent:true,blending:G.AdditiveBlending,depthWrite:false}));rdPts.frustumCulled=false;rdWorld.add(rdPts);""",
"""  rdPP=new Float32Array(600*3).fill(-99);rdPC=new Float32Array(600*3);rdLife=new Array(600).fill(0);const pg=new G.BufferGeometry;pg.setAttribute('position',new G.BufferAttribute(rdPP,3));pg.setAttribute('color',new G.BufferAttribute(rdPC,3)); //@particles
  rdPts=new G.Points(pg,new G.PointsMaterial({size:.06,vertexColors:true,transparent:true,blending:G.AdditiveBlending,depthWrite:false}));rdPts.frustumCulled=false;rdWorld.add(rdPts); //@particles"""),
("""  // ---- particles
  for(let i=0;i<600;i++){if(rdLife[i]>0){rdLife[i]-=dt;const v=rdVel[i];v[1]-=2*dt;rdPP[i*3]+=v[0]*dt;rdPP[i*3+1]+=v[1]*dt;rdPP[i*3+2]+=v[2]*dt;if(rdLife[i]<=0)rdPP[i*3+1]=-99}}
  rdPts.geometry.attributes.position.needsUpdate=true;rdPts.geometry.attributes.color.needsUpdate=true;""",
"""  // ---- particles (build-optional)
  for(let i=0;i<600;i++){if(rdLife[i]>0){rdLife[i]-=dt;const v=rdVel[i];v[1]-=2*dt;rdPP[i*3]+=v[0]*dt;rdPP[i*3+1]+=v[1]*dt;rdPP[i*3+2]+=v[2]*dt;if(rdLife[i]<=0)rdPP[i*3+1]=-99}} //@particles
  rdPts.geometry.attributes.position.needsUpdate=true;rdPts.geometry.attributes.color.needsUpdate=true; //@particles"""),
# thunderhead: 12 spheres
("for(let i=0;i<20;i++)cl.push([sph(1.2+(i*7%5)*.3,10,7),sin(i*2.4)*3.2,cos(i*1.7)*1.6+1.5,cos(i*3.1)*2-1.5]);","for(let i=0;i<12;i++)cl.push([sph(1.4+i*7%5*.3,10,7),sin(i*2.4)*3.2,cos(i*1.7)*1.6+1.5,cos(i*3.1)*2-1.5]);"),
])
# ---- sim: inject via Object.assign; ev copies with spread; halo returns without the curve
sub('src/sim.js',[
("""S.inject=(L,R,H)=>{ // L/R: {p,q,t,g}; H: {p,q}. Copies values in.
  for(const[h,s]of[[L,S._L],[R,S._R]])if(h){if(h.p)s.p=[...h.p];if(h.q)s.q=[...h.q];if(h.t!=null)s.t=+h.t;if(h.g!=null)s.g=+h.g}
  if(H){if(H.p)S._H.p=[...H.p];if(H.q)S._H.q=[...H.q]}
};""",
"""S.inject=(L,R,H)=>{L&&Object.assign(S._L,L);R&&Object.assign(S._R,R);H&&Object.assign(S._H,H)}; // {p,q,t,g}, {p,q}; arrays are never mutated by the sim"""),
("const ev=(k,p,b,d)=>S._ev.push({k,p:p?[p[0],p[1],p[2]]:0,b:b|0,d});","const ev=(k,p,b,d)=>S._ev.push({k,p:p?[...p]:0,b:b|0,d});"),
])
# ---- input: table-driven hand keys
sub('src/input.js',[
("""  const v=1.5*dt,K=inpK,mv=(p,a,d,w,s,u,o)=>{p[0]+=v*((K[d]?1:0)-(K[a]?1:0));p[2]+=v*((K[w]?1:0)-(K[s]?1:0));p[1]+=v*((K[o]?1:0)-(K[u]?1:0));const l=Math.hypot(p[0],p[1],p[2]);if(l>1){p[0]/=l;p[1]/=l;p[2]/=l}};
  mv(inpHR,'KeyA','KeyD','KeyW','KeyS','KeyQ','KeyE');mv(inpHL,'KeyJ','KeyL','KeyI','KeyK','KeyU','KeyO');""",
"""  const v=1.5*dt,K=x=>inpK['Key'+x]?v:0;
  for(const[p,k]of[[inpHR,'ADSWQE'],[inpHL,'JLKIUO']]){p[0]+=K(k[1])-K(k[0]);p[2]+=K(k[3])-K(k[2]);p[1]+=K(k[5])-K(k[4]);const l=Math.hypot(...p);if(l>1)for(let i=0;i<3;i++)p[i]/=l}"""),
])
# ---- build: optional feature flags
sub('build.js',[
("const LEVEL=+opt('--level',1),ROLL=!argv.includes('--no-roll'),ITER=+opt('--iter',60),LIMIT=13312,TARGET=12900;\nconst ORDER=['vec','sim','input','xr','audio','render','main'].filter(m=>existsSync(`src/${m}.js`));",
 "const LEVEL=+opt('--level',1),ROLL=!argv.includes('--no-roll'),ITER=+opt('--iter',60),LIMIT=13312,TARGET=12900;\nconst OPT=['audio','particles'].filter(f=>argv.includes('--'+f)); // build-optional features (CLAUDE.md priority 5–6); lines tagged //@name\nconst ORDER=['vec','sim','input','xr','audio','render','main'].filter(m=>existsSync(`src/${m}.js`)&&(m!='audio'||OPT.includes('audio')));"),
("const strip=s=>s.split('\\n').filter(l=>!/^import\\s/.test(l)&&!/\\/\\/@test\\s*$/.test(l)).map(l=>l.replace(/^export\\s+(default\\s+)?/,'')).join('\\n'); // lines ending in //@test are test hooks, not shipped",
 "const strip=s=>s.split('\\n').filter(l=>{const m=l.match(/\\/\\/@(\\w+)\\s*$/);return!/^import\\s/.test(l)&&!(m&&!OPT.includes(m[1]))}).map(l=>l.replace(/^export\\s+(default\\s+)?/,'')).join('\\n'); // //@test lines are test hooks; //@audio //@particles are optional features"),
("`roadroller level ${ROLL?LEVEL:'off'}, zopfli iterations ${ITER}`","`roadroller level ${ROLL?LEVEL:'off'}, zopfli iterations ${ITER}, optional features: ${OPT.join(',')||'none'}`"),
])
print('ok')
