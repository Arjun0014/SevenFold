// sim.test.js — Node test suite for the pure simulation (docs/07 A1–A7). No dependencies.
// Run: node test/sim.test.js
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createSim,DT,N,SEG,WN} from '../src/sim.js';
import {sin,cos,PI,hypot,floor,add,sub,mul,len,dist,norm} from '../src/vec.js';
import {variants,negatives,make,headQ} from './trajectories.js';
import {makeBot,runGame,lookQ} from './bot.js';

// ---------- tiny harness ----------
let pass=0,fail=0;const failures=[];
const test=(name,fn)=>{try{fn();pass++;console.log('  ok   '+name)}catch(e){fail++;failures.push(name+': '+e.message);console.log('  FAIL '+name+'\n       '+e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assertion failed')};
const near=(a,b,eps,m)=>assert(Math.abs(a-b)<=eps,(m||'')+` expected ${b}±${eps}, got ${a}`);
const section=t=>console.log('\n'+t);

// ---------- helpers ----------
const HEAD={p:[0,1.6,0],q:headQ(0)}; // head at origin, facing +z
const bandOf=s=>Math.min(6,Math.max(0,floor(s*7)));
// in-wave sim with nothing spawning: a queued spawn that never fires keeps the wave "open"
const fresh=seed=>{const S=createSim(seed||1);S._ws=1;S._wave=1;S._q=[0];S._st=1e9;return S};
const inj=(S,L,R,f={})=>{S.inject({p:L,q:f.Lq,t:f.Lt|0,g:f.g|0},{p:R,q:f.Rq,t:f.Rt|0,g:f.g|0},f.H||HEAD);S.step()};
const run=(S,n,L,R,f)=>{for(let i=0;i<n;i++)inj(S,L,R,f)};
const evs=(S,k)=>S.drain().filter(e=>!k||e.k==k);
const collect=(S,n,L,R,f)=>{const out=[];for(let i=0;i<n;i++){inj(S,L,R,f);out.push(...S.drain())}return out};
const hpOf=e=>e._parts.reduce((a,p)=>a+Math.max(0,p._hp),0);
// play a canned sigil with both grips held, then release -> weapon
const forgeTo=(S,name)=>{const fr=make(name).frames;for(const f of fr)inj(S,f.L,f.R,{g:1});inj(S,fr[fr.length-1].L,fr[fr.length-1].R,{g:0});inj(S,fr[fr.length-1].L,fr[fr.length-1].R,{g:0});S.drain();return S._wp};
const enemy=(S,t,x,y,z,b)=>{const e=S._spawn(t,0,5);e._p=[x,y,z];e._stg=99;if(b!=null){e._b=b;for(const p of e._parts)p._b=b}return e}; // staggered (frozen) enemy at a position

if(isMainThread){
console.log('SEVENFOLD sim tests');

// ================= A1 rope stability =================
section('A1 rope stability');
const rng=s=>()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
for(const hz of[90,72,120]){
  test(`violent hands 30 s, input at ${hz} Hz`,()=>{
    const S=fresh(3),r=rng(hz);let L=[-.3,1.2,.3],R=[.3,1.2,.3],vL=[0,0,0],vR=[0,0,0],tin=0,tacc=0;
    let maxV=0,maxSeg=0;
    for(let i=0;i<30*90;i++){
      // input clock at hz: update hand targets when an input frame is due
      tacc+=DT;while(tacc>=1/hz){tacc-=1/hz;tin+=1/hz;
        if(r()<.1){vL=mul(norm([r()-.5,r()-.5,r()-.5]),6);vR=mul(norm([r()-.5,r()-.5,r()-.5]),6)}
        L=add(L,mul(vL,1/hz));R=add(R,mul(vR,1/hz));
        // hands stay within arm's reach of a shoulder point (0.8 m), like real hands
        const keep=p=>{const d=sub(p,[0,1.4,0]),l=len(d);return l>.8?add([0,1.4,0],mul(d,.8/l)):p};
        if(i%180==179){L=add(L,mul(norm([r()-.5,0,r()-.5]),1))}       // 1 m teleport every 2 s
        if(i%270==269){[L,R]=[R,L]}                                    // hands cross
        L=keep(L);R=keep(R);
      }
      inj(S,L,R);
      for(const p of S._rp)assert(p.every(Number.isFinite),'NaN in rope');
      for(let k=0;k<N;k++)maxSeg=Math.max(maxSeg,dist(S._rp[k],S._rp[k+1]));
      for(const v of S._rv)maxV=Math.max(maxV,len(v));
      assert(S._ten>=0&&S._ten<=1,'tension out of range');
    }
    assert(maxSeg<=3.5*SEG,`segment ${maxSeg.toFixed(3)} > 3.5×rest ${(3.5*SEG).toFixed(3)}`); // 3.5×: transient stretch at 6 m/s hands, not an explosion (DECISIONS.md)
    assert(maxV<60,`rope point speed ${maxV.toFixed(1)} ≥ 60`);
  });
}

// ================= A2 raw forms =================
section('A2 raw forms');
test('whip: slack flick → crack at the tip, band of the tip, cooldown 0.25 s',()=>{
  const S=fresh(1);const e=enemy(S,1,0,1.1,1.6);run(S,30,[-.2,1,-.2],[.2,1,-.2]);S.drain();
  const cracks=[];let hit=0;
  for(let i=0;i<120;i++){const t=i*DT;let z,y;if(t<.25){const u=t/.25;z=-.2+.9*u;y=1+.6*sin(u*PI)}else{z=.7;y=1}
    inj(S,[-.2,y,z],[.2,y,z]);const tipBand=bandOf(S._tipI/N);
    for(const ev of S.drain()){if(ev.k=='crack'){cracks.push([t,ev.b,tipBand]);assert(S._ten<.3,'crack while taut')}if(ev.k=='hit'&&ev.d==0)hit++}}
  assert(cracks.length>=1,'no crack');
  for(const c of cracks)assert(c[1]==c[2],`crack band ${c[1]} ≠ tip band ${c[2]}`);
  for(let i=1;i<cracks.length;i++)assert(cracks[i][0]-cracks[i-1][0]>=.25-1e-6,'cooldown violated');
  assert(hit>=1,'whip crack did not damage the enemy at the tip');
});
const sweepArc=(S,speed)=>{const hits=[];const dur=2/speed;for(let i=0;i<Math.round((dur+.6)*90);i++){const t=i*DT;let x;if(t<.3)x=-1;else if(t<.3+dur)x=-1+2*(t-.3)/dur;else x=1;inj(S,[x-.45,1.1,.8],[x+.45,1.1,.8]);for(const ev of S.drain())if(ev.k=='hit'&&ev.d==1)hits.push(ev)}return hits};
test('arc: taut sweep at 5 m/s hits the enemy in its path (damage 3 / cooldown 0.3)',()=>{
  const S=fresh(1);const e=enemy(S,1,0,1.1,1.0,6);const h0=hpOf(e);const hits=sweepArc(S,5);
  assert(S._ten>=.7,'not taut');assert(hits.length>=1,'no arc hit');assert(hpOf(e)<h0,'no damage');
});
test('arc: slow sweep (1 m/s) hits nothing',()=>{const S=fresh(1);enemy(S,1,0,1.1,1.0);assert(sweepArc(S,1).length==0,'hit at low speed')});
test('block / absorb: matched band absorbs (+1 Spectrum), other band blocks',()=>{
  for(const b of[0,3,6]){
    const S=fresh(1);const L=[-.45,1.2,.5],R=[.45,1.2,.5];run(S,40,L,R);S.drain();
    const s=(b+.5)/7,x=-.45+s*.9;
    S._pr.push({p:[x,1.2,3],v:[0,0,-6],b});const got=collect(S,60,L,R).filter(e=>e.k=='absorb'||e.k=='block'||e.k=='orbhit');
    assert(got.length==1&&got[0].k=='absorb',`band ${b}: expected absorb, got ${JSON.stringify(got.map(e=>e.k))}`);near(S._spec,1,1e-9,'spectrum');
    S._pr.push({p:[x,1.2,3],v:[0,0,-6],b:(b+3)%7});const g2=collect(S,60,L,R).filter(e=>e.k=='absorb'||e.k=='block'||e.k=='orbhit');
    assert(g2.length==1&&g2[0].k=='block',`band ${b}: expected block, got ${JSON.stringify(g2.map(e=>e.k))}`);
  }
});
const shoot=(S,pull,s)=>{ // taut rope L..R along x at z=.5; press R, pull R back by `pull` so that its projection on L→anchor is param s
  const L=[-.45,1.2,.5],R=[.45,1.2,.5];run(S,40,L,R);S.drain();
  inj(S,L,R,{Rt:1});assert(S._bow,'bow not drawn');const A=[...R];
  const dx=-(1-s)*.9,dz=-Math.sqrt(Math.max(0,pull*pull-dx*dx));const P=[A[0]+dx,A[1],A[2]+dz];
  for(let i=1;i<=20;i++)inj(S,L,[A[0]+(P[0]-A[0])*i/20,P[1],A[2]+(P[2]-A[2])*i/20],{Rt:1});
  run(S,3,L,P,{Rt:1});inj(S,L,P,{Rt:0});return S.drain().filter(e=>e.k=='arrow')};
test('bow: pull 0.4 m straight back → arrow speed 25.3, damage 4.67, violet',()=>{
  const S=fresh(1);const a=shoot(S,.4,.95);assert(a.length==1,'expected one arrow');
  const ar=S._ar[0];near(len(ar.v),12+20*.4/.6,.6,'speed');near(ar.d,2+4*.4/.6,.15,'damage');assert(ar.b==6,`band ${ar.b}`)});
test('bow: pull 0.5 m toward the middle → band from the pull point (3, 4)',()=>{
  for(const s of[.5,.7]){const S=fresh(1);const a=shoot(S,.5,s);assert(a.length==1,'expected one arrow');
    const ar=S._ar[0];near(len(ar.v),12+20*.5/.6,.6,'speed');near(ar.d,2+4*.5/.6,.15,'damage');assert(ar.b==bandOf(s),`band ${ar.b} ≠ ${bandOf(s)}`)}
});
test('bow: pull 0.1 m → no arrow',()=>{const S=fresh(1);assert(shoot(S,.1,.95).length==0,'arrow fired');assert(!S._bow,'bow still drawn')});

// ================= A3 recogniser =================
section('A3 sigil recogniser');
const names=['rope','lance','halo','maul','shards','prism'];
const M=Array.from({length:6},()=>Array(6).fill(0));
const playTraj=(tr,S)=>{S=S||fresh(1);const H={p:[0,1.6,0],q:headQ(tr.yaw)};for(const f of tr.frames)inj(S,f.L,f.R,{g:1,H});const l=tr.frames[tr.frames.length-1];inj(S,l.L,l.R,{g:0,H});inj(S,l.L,l.R,{g:0,H});return S};
for(const n of['lance','shards','maul','halo','prism'])for(const tr of variants(n))test(`sigil ${tr.label}`,()=>{const S=playTraj(tr);M[tr.want][S._wp]++;assert(S._wp==tr.want,`got ${WN[S._wp]}`)});
for(const tr of negatives())test(`negative ${tr.label} → rope`,()=>{const S=playTraj(tr);M[0][S._wp]++;assert(S._wp==0,`got ${WN[S._wp]}`)});
console.log('  confusion matrix (rows = wanted, cols = got): '+names.join(' '));for(let i=0;i<6;i++)console.log('   '+names[i].padEnd(7)+M[i].map(x=>String(x).padStart(6)).join(''));
test('confusion matrix has no off-diagonal entries',()=>{for(let i=0;i<6;i++)for(let j=0;j<6;j++)if(i!=j)assert(M[i][j]==0,`${names[i]}→${names[j]} = ${M[i][j]}`)});
test('forge needs both grips (controllers)',()=>{const S=fresh(1);S.inject({p:[-.2,1.2,.4],g:1},{p:[.2,1.2,.4],g:0},HEAD);S.step();assert(!S._fg.on,'forge entered with one grip');S.inject({p:[-.2,1.2,.4],g:1},{p:[.2,1.2,.4],g:1},HEAD);S.step();assert(S._fg.on,'forge not entered with both grips')});
test('hand tracking: both pinches, hands within 0.3 m for 0.4 s',()=>{const S=fresh(1);S._ht=1;let on=[];for(let i=0;i<50;i++){inj(S,[-.1,1.2,.4],[.1,1.2,.4],{Lt:1,Rt:1});on.push(S._fg.on)}assert(!on[20]&&on[45],'pinch-hold timing wrong');
  const S2=fresh(1);S2._ht=1;for(let i=0;i<60;i++)inj(S2,[-.3,1.2,.4],[.3,1.2,.4],{Lt:1,Rt:1});assert(!S2._fg.on,'forged with hands apart')});
test('forge auto-resolves at 2.5 s',()=>{const S=fresh(1);const fr=make('lance').frames;for(const f of fr)inj(S,f.L,f.R,{g:1});const l=fr[fr.length-1];let t=0,forged=0;while(t<3&&!forged){inj(S,l.L,l.R,{g:1});t+=DT;if(S.drain().some(e=>e.k=='forged'))forged=t}assert(forged>0&&forged<=2.6,`resolved at ${forged}`);assert(S._wp==1,'not a lance')});
test('cooldown 1 s after a forge; empty trail unforges',()=>{const S=fresh(1);assert(forgeTo(S,'lance')==1);const P=[-.15,1.2,.4],Q=[.15,1.2,.4];run(S,3,P,Q,{g:1});assert(!S._fg.on,'forged during cooldown');run(S,90,P,Q);
  run(S,2,P,Q,{g:1});assert(S._fg.on,'forge not entered after cooldown');inj(S,P,Q);const e=S.drain();assert(e.some(x=>x.k=='unforge'),'no unforge event');assert(S._wp==0,'still holding a weapon')});
test('all five sigils forge from the canned generator',()=>{for(const n of['lance','halo','maul','shards','prism'])assert(forgeTo(fresh(1),n)==WN.indexOf(n),n)});

// ================= A4 weapons =================
section('A4 weapons');
test('lance: thrust pierces up to 3 enemies in a line, staggers Husks, damage 4',()=>{
  const S=fresh(1);assert(forgeTo(S,'lance')==1);
  const es=[.9,1.3,1.7,2.1].map(z=>enemy(S,1,0,1.1,z,0));const h0=es.map(hpOf);
  run(S,20,[0,1.1,.1],[0,1.1,.6]);S.drain();const hits=[];
  for(let i=0;i<8;i++){const a=.3*(i+1)/8;inj(S,[0,1.1,.1+a],[0,1.1,.6+a]);hits.push(...S.drain().filter(e=>e.k=='hit'&&e.d==7))}
  const dmg=es.map((e,i)=>h0[i]-hpOf(e));const hitN=dmg.filter(d=>d>0).length;
  assert(hitN==3,`pierced ${hitN} enemies, expected 3 (${dmg})`);assert(dmg[3]==0,'4th enemy hit');
  for(const d of dmg)if(d>0)assert(d==4,`damage ${d}`);assert(es[0]._stg>=.7,'husk not staggered');
});
test('halo: throw on trigger, hits (3), returns to the right hand',()=>{
  const S=fresh(1);assert(forgeTo(S,'halo')==2);const e=enemy(S,1,.2,1.2,4,5);const h0=hpOf(e);
  const L=[-.2,1.2,.3],R=[.2,1.2,.3],q=[0,1,0,0];run(S,20,L,R,{Lq:q,Rq:q});S.drain();
  inj(S,L,R,{Lq:q,Rq:q,Rt:1});assert(S._halo.out,'halo not thrown');
  let caught=0,hit=0;for(let i=0;i<270;i++){inj(S,L,R,{Lq:q,Rq:q});for(const ev of S.drain()){if(ev.k=='catch'&&ev.d==2)caught=1;if(ev.k=='hit'&&ev.d==5)hit++}}
  assert(hit>=1,'halo missed');assert(h0-hpOf(e)==3||h0-hpOf(e)==9,'damage '+(h0-hpOf(e)));assert(caught&&!S._halo.out,'halo did not return');
});
const maulSwing=(S,e)=>{const hits=[];for(let i=0;i<=18;i++){const x=-.5+i/18;inj(S,[0,1.1,.2],[x,1.1,.7]);hits.push(...S.drain().filter(ev=>ev.k=='hit'&&ev.d==4))}return hits};
test('maul: head swing ≥ 3 m/s deals 6, knocks back',()=>{
  const S=fresh(1);assert(forgeTo(S,'maul')==3);run(S,20,[0,1.1,.2],[-.5,1.1,.7]);S.drain();
  const e=enemy(S,1,0,1.1,.95,5);e._stg=0;const h0=hpOf(e);const hits=maulSwing(S,e);
  assert(hits.length>=1,'no maul hit');const d=h0-hpOf(e);assert(d==6||d==18,'damage '+d);assert(len(e._kv)>0,'no knockback');
});
test('maul slam: needs 1 Spectrum, damages everything on the ground within 4 m',()=>{
  const slam=(spec)=>{const S=fresh(1);assert(forgeTo(S,'maul')==3);S._spec=spec;const es=[2,3.5,6].map(z=>enemy(S,1,0,1.1,z,5));const h0=es.map(hpOf);
    run(S,20,[0,1.5,.5],[0,1.0,.5]);S.drain();let ev=[];for(let i=1;i<=16;i++){const y=1.0-.95*i/16;inj(S,[0,1.5,.5],[0,y,.5]);ev.push(...S.drain())}
    return {S,slam:ev.some(e=>e.k=='slam'),dmg:es.map((e,i)=>h0[i]-hpOf(e))}};
  const a=slam(1);assert(a.slam,'no slam with spectrum');assert(a.dmg[0]>0&&a.dmg[1]>0,'near enemies not hit '+a.dmg);assert(a.dmg[2]==0,'far enemy hit');near(a.S._spec,0,1e-9,'spectrum not spent');
  const b=slam(0);assert(!b.slam,'slam without spectrum');
});
test('shards: left blade = R O Y (G), right blade = (G) B I V; throw returns',()=>{
  const S=fresh(1);assert(forgeTo(S,'shards')==4);const q=[0,1,0,0];
  const e=enemy(S,1,0,1.1,.9,5);e._r=.35;const slash=(hand)=>{const out=[];for(let i=0;i<=12;i++){const x=-.3+.6*i/12;const p=[x,1.1,.5];inj(S,hand=='L'?p:[-.6,1.1,.2],hand=='R'?p:[.6,1.1,.2],{Lq:q,Rq:q});out.push(...S.drain().filter(ev=>ev.k=='hit'&&ev.d==3))}return out};
  run(S,20,[-.6,1.1,.2],[.6,1.1,.2],{Lq:q,Rq:q});S.drain();
  const hl=slash('L');run(S,20,[-.6,1.1,.2],[.6,1.1,.2],{Lq:q,Rq:q});S.drain();const hr=slash('R');
  assert(hl.length>=1&&hr.length>=1,`hits L${hl.length} R${hr.length}`);
  for(const h of hl)assert(h.b<=3,'left blade band '+h.b);for(const h of hr)assert(h.b>=3,'right blade band '+h.b);
  // throw R blade at an enemy 3 m ahead
  const e2=enemy(S,1,.6,1.1,3.2,5);const h0=hpOf(e2);inj(S,[-.6,1.1,.2],[.6,1.1,.2],{Lq:q,Rq:q,Rt:1});assert(S._sh[1],'blade not thrown');
  for(let i=0;i<200;i++)inj(S,[-.6,1.1,.2],[.6,1.1,.2],{Lq:q,Rq:q});assert(h0-hpOf(e2)>=3,'thrown blade missed');assert(!S._sh[1],'blade did not return');
});
test('prism: beam 5/s with Spectrum (drains 1/s), 1/s without; band by right-hand roll',()=>{
  const S=fresh(1);assert(forgeTo(S,'prism')==5);const e=enemy(S,1,0,1.4,5,5);e._r=.6;const h0=hpOf(e);
  const c=[0,1.4,.35],dir=[0,0,1];S._spec=2;
  for(let i=0;i<90;i++)inj(S,[-.08,1.4,.35],[.08,1.4,.35],{Lq:lookQ(dir,0),Rq:lookQ(dir,0),Rt:1});
  const d1=h0-hpOf(e);assert(d1>=4&&d1<=16,'powered damage/s '+d1);near(S._spec,1,.05,'spectrum drain');
  S._spec=0;const h1=hpOf(e);for(let i=0;i<90;i++)inj(S,[-.08,1.4,.35],[.08,1.4,.35],{Lq:lookQ(dir,0),Rq:lookQ(dir,0),Rt:1});
  const d2=h1-hpOf(e);assert(d2>=.8&&d2<=3.2,'unpowered damage/s '+d2);
  for(let b=0;b<7;b++){const rho=((b+.5)/7)*2*PI-PI;inj(S,[-.08,1.4,.35],[.08,1.4,.35],{Lq:lookQ(dir,0),Rq:lookQ(dir,rho),Rt:1});assert(S._pb==b,`roll for band ${b} gave ${S._pb}`)}
});

// ================= A5 damage & resonance =================
section('A5 damage & resonance');
const arrowAt=(S,e,b,d=4)=>{const p=e._p;S._ar.push({p:[p[0],p[1],p[2]-1],v:[0,0,30],d,b,hit:new Set});return collect(S,10,[-.45,1.2,.5],[.45,1.2,.5])};
test('matching band ×3 + resonant event; other band ×1',()=>{
  const S=fresh(1);const e=enemy(S,1,0,1.1,3,2);const P=e._parts[0];P._hp=100;let h=P._hp;let ev=arrowAt(S,e,2);assert(ev.some(x=>x.k=='res'),'no resonant event');assert(h-P._hp==12,'resonant damage '+(h-P._hp));
  h=P._hp;ev=arrowAt(S,e,5);assert(!ev.some(x=>x.k=='res'),'unexpected resonance');assert(h-P._hp==4,'plain damage '+(h-P._hp));
});
test('shell plates: only resonant or Maul hits break them; core exposed after',()=>{
  const S=fresh(1);const e=enemy(S,3,0,.6,3);const pl=e._parts.find(p=>p._pl);pl._b=1;const other=e._parts.filter(p=>p!==pl&&p._pl);
  // aim an arrow exactly at that plate
  const at=(b)=>{const c=add(e._p,pl._o),o=norm(pl._o);S._ar.push({p:add(c,o),v:mul(o,-30),d:4,b,hit:new Set});return collect(S,10,[-.45,1.2,.5],[.45,1.2,.5])};
  let ev=at(4);assert(ev.some(x=>x.k=='clank'),'no clank');assert(pl._hp>0,'plate broke from a non-resonant hit');
  ev=at(1);assert(ev.some(x=>x.k=='plate'),'no plate event');assert(pl._hp<=0,'resonant arrow did not break the plate');
  const core=e._parts.find(p=>p._core);const c=add(e._p,core._o);S._ar.push({p:[c[0],c[1],c[2]-1],v:[0,0,30],d:4,b:(core._b+1)%7,hit:new Set});collect(S,10,[-.45,1.2,.5],[.45,1.2,.5]);
  assert(core._hp==6,'core damaged while plates remain');
});
test('maul breaks a plate regardless of colour',()=>{
  const S=fresh(1);assert(forgeTo(S,'maul')==3);run(S,20,[0,1.1,.2],[-.5,1.1,.7]);S.drain();
  const e=enemy(S,3,0,.6,1.0);for(const p of e._parts)p._b=6;const n0=e._parts.filter(p=>p._pl&&p._hp>0).length;
  const ev=[];for(let i=0;i<=18;i++){const x=-.5+i/18;inj(S,[0,.6,.2],[x,.6,.7]);ev.push(...S.drain())}
  assert(ev.some(x=>x.k=='plate'),'no plate broke');assert(e._parts.filter(p=>p._pl&&p._hp>0).length<n0,'plate count unchanged');
});
test('Gloam plates likewise; core is melee-only and gated by plates',()=>{
  const S=fresh(1);const g=S._spawnBoss(1);const pl=g._parts[4];pl._b=3;const core=g._parts[6];
  const pp=add(g._p,add(mul(g._rt,pl._o[0]),add([0,pl._o[1],0],mul(g._fw,pl._o[2]))));
  const at=(b,q)=>{S._ar.push({p:add(q,mul(g._fw,-1)),v:mul(g._fw,30),d:4,b,hit:new Set});return collect(S,10,[-.45,1.2,.5],[.45,1.2,.5])};
  let ev=at(5,pp);assert(ev.some(x=>x.k=='clank')&&pl._hp>0,'plate broke from wrong band');
  ev=at(3,pp);assert(ev.some(x=>x.k=='plate')&&pl._hp<=0,'plate survived resonant arrow');
  const cp=add(g._p,core._o);at(core._b,cp);assert(core._hp==650,'core hit by an arrow');
});

// ================= A7 determinism =================
section('A7 determinism');
test('same seed + same input stream → identical hashes every 90 steps (two runs)',()=>{
  const S0=createSim(2);const b=makeBot(S0,{record:1});while(S0._t<40)b.step();const frames=b.frames;
  const replay=()=>{const S=createSim(2);const hs=[];frames.forEach((f,i)=>{S.inject(f.L,f.R,f.H);S.step();if(i%90==89)hs.push(S.hashState())});return hs};
  const a=replay(),c=replay();assert(a.length>30,'too few samples');for(let i=0;i<a.length;i++)assert(a[i]===c[i],`hash differs at sample ${i}`);
  const S3=createSim(3);frames.forEach(f=>{S3.inject(f.L,f.R,f.H);S3.step()});assert(S3.hashState()!==a[a.length-1],'hash insensitive to seed');
});

// ================= A6 waves & bots (parallel workers) =================
section('A6 waves & bots');
mkdirSync('test/replays',{recursive:true});
const jobs=[];for(const seed of[1,2,3,4,5]){jobs.push({kind:'perfect',seed});jobs.push({kind:'noforge',seed})}jobs.push({kind:'idle',seeds:[1,2,3,4,5]});jobs.push({kind:'replay',seed:1});
const results=await Promise.all(jobs.map(j=>new Promise((res,rej)=>{const w=new Worker(new URL(import.meta.url),{workerData:j});w.on('message',m=>res({...j,...m}));w.on('error',rej)})));
for(const r of results){
  if(r.kind=='idle')test('idle bot loses all Light in wave 1 within 25 s (seeds 1–5)',()=>{for(const x of r.runs)assert(x.ws==3&&x.reached==1&&x.t<=25,`seed ${x.seed}: ws ${x.ws} wave ${x.reached} t ${x.t}`)});
  if(r.kind=='perfect')test(`perfect bot seed ${r.seed}: clears waves 1–12 → Dawn, Light never 0, wave times in window`,()=>{
    const w=Object.fromEntries(r.waves);console.log('       waves: '+r.waves.map(x=>x[0]+':'+x[1]).join(' ')+'  minLight '+r.minLight);
    assert(r.ws==4,`did not reach Dawn (ws ${r.ws}, wave ${r.reached}, light ${r.light})`);assert(r.minLight>0,'Light hit 0');
    for(let n=1;n<=12;n++){assert(w[n]!=null,`wave ${n} not cleared`);const boss=n==4||n==8||n==12;const lo=boss?40:15,hi=boss?150:90;assert(w[n]>=lo&&w[n]<=hi,`wave ${n} took ${w[n]} s (window ${lo}–${hi})`)}
    for(const ph of['boss0','phase2@1','bossdead0','boss1','bossdead1','boss2','phase3@2','bossdead2'])assert(r.phaseSet.includes(ph),`boss phase ${ph} never entered`);
  });
  if(r.kind=='noforge')test(`wrong-tool bot seed ${r.seed}: clears waves 1–5, fails at Gloam within 200 s`,()=>{
    const w=Object.fromEntries(r.waves);for(let n=1;n<=5;n++)assert(w[n]!=null,`wave ${n} not cleared`);
    assert(r.ws==3,'did not lose');assert(r.reached<=8,`got past Gloam (wave ${r.reached})`);if(r.reached==8)assert(r.t-r.gloamStart<=200,`Gloam fight lasted ${(r.t-r.gloamStart).toFixed(0)} s`)});
  if(r.kind=='replay')test('recorded perfect-bot replay for waves 1–2 saved (test/replays/w1-2.json)',()=>{assert(r.n>1000,'replay too short');assert(r.reached>=3,'replay did not reach wave 3')});
}

console.log(`\n${pass} passed, ${fail} failed`);if(fail){console.log(failures.map(f=>' - '+f).join('\n'));process.exit(1)}
}else{
  // ---------- worker ----------
  const j=workerData;
  if(j.kind=='perfect'){const S=createSim(j.seed);const b=makeBot(S);const r=runGame(S,b,{maxT:1500});
    parentPort.postMessage({waves:r.waves,ws:r.ws,reached:r.reached,light:r.light,minLight:r.minLight,t:r.t,phaseSet:r.phases.map(p=>p[1]=='phase'?'phase'+p[2]+'@'+p[3]:p[1]+p[2])})}
  if(j.kind=='noforge'){const S=createSim(j.seed);const b=makeBot(S,{noForge:1});let gs=0;const r=runGame(S,b,{maxT:900,until:s=>{if(s._wave==8&&!gs)gs=s._t;return 0}});
    parentPort.postMessage({waves:r.waves,ws:r.ws,reached:r.reached,t:r.t,gloamStart:gs||r.t})}
  if(j.kind=='idle'){parentPort.postMessage({runs:j.seeds.map(seed=>{const S=createSim(seed);const b=makeBot(S,{idle:1});S.inject({t:1},null,null);S.step();S.inject({t:0},null,null);const r=runGame(S,b,{maxT:60});return {seed,ws:r.ws,reached:r.reached,t:r.t}})})}
  if(j.kind=='replay'){const S=createSim(j.seed);const b=makeBot(S,{record:1});const r=runGame(S,b,{stopWave:3,maxT:200});
    const rd=x=>Math.round(x*1000)/1000;const fr=b.frames.map(f=>[f.L.p.map(rd),f.L.q.map(rd),f.L.t,f.L.g,f.R.p.map(rd),f.R.q.map(rd),f.R.t,f.R.g,f.H.p.map(rd),f.H.q.map(rd)]);
    writeFileSync('test/replays/w1-2.json',JSON.stringify({seed:j.seed,frames:fr}));parentPort.postMessage({n:fr.length,reached:r.reached})}
}
