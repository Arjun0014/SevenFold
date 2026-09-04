// sim.js — PURE game simulation. No DOM, no Three. Fixed DT, seeded, deterministic.
// Arena space: player at origin, y up, unicorn at (0,0,-1.8); "front" at game start = +z.
import {sin,cos,abs,min,max,hypot,sqrt,PI,atan2,floor,add,sub,mul,dot,cross,len,dist,norm,lerp,clamp,qrot,yawOf,segd} from './vec.js';

export const DT=1/90,N=28,REST=.9,SEG=REST/N;
export const WN=['rope','lance','halo','maul','shards','prism'];
// enemy table: hp, speed, radius, half-height, hit-centre height
const ET=[[3,4.5,.25,0,1.5],[9,1.2,.35,.7,1.1],[6,.6,.6,0,.5],[6,.9,.45,0,.6],[1,3.5,.15,0,1.4]];
// waves: [interval, spread(deg), type,count, ...]; single number = boss id
const WAVES=[[3,40,0,5],[2.6,60,0,4,1,2],[2.6,90,2,2,0,4],[0],[1.8,120,0,6,1,3,2,1],[2.3,120,3,2,0,4],[3.2,180,4,1,2,2,1,2],[1],[2.4,180,4,2,3,2],[1.5,180,2,4,1,4,0,6],[3,180,3,3,4,1,2,3,1,4],[2]];
const UNI=[0,.9,-1.8]; // unicorn body centre
const F=[0,0,-1]; // controller forward in controller space
const bpos=(b,r,y)=>[sin(b)*r,y,cos(b)*r];
const hd=(a,b)=>hypot(a[0]-b[0],a[2]-b[2]); // horizontal distance
const bandOf=s=>clamp(floor(s*7),0,6);
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

// ---------- sigil recogniser (module level, pure) ----------
export const recognise=(M,D)=>{
  const n=M.length;if(n<2)return 0;
  let path=0,hp=0,rise=0,drop=0,ri=0,dmax=0,dmin=9,twist=0,crossed=0,y0=M[0][1],an=M[0];
  const dl=D.map(len);
  for(let i=0;i<n;i++){const l=dl[i];dmax=max(dmax,l);dmin=min(dmin,l);if(D[i][0]<-.05)crossed=1;
    if(i){const ad=dist(M[i],an);if(ad>.06){path+=ad;an=M[i]}const a=D[i-1],b=D[i],dm=sub(M[i],M[i-1]),dd=mul(sub(b,a),.5);hp+=len(sub(dm,dd))+len(add(dm,dd));const ang=atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]);if(hypot(a[0],a[1])>.03&&hypot(b[0],b[1])>.03)twist+=ang}
    const r=M[i][1]-y0;if(r>rise){rise=r;ri=i}}
  for(let i=ri;i<n;i++)drop=max(drop,M[ri][1]-M[i][1]);
  if(hp<.2)return 0;
  let loop=0;
  for(let j=3;j<n&&!loop;j++){let pl=0;for(let i=j-1;i>=0;i--){pl+=dist(M[i+1],M[i]);if(pl>=.6&&dist(M[i],M[j])<.12){let ar=[0,0,0];for(let k=i;k<j;k++)ar=add(ar,cross(sub(M[k],M[i]),sub(M[k+1],M[i])));if(len(ar)*.5>=.05){loop=1;break}}}}
  const d0=dl[0],d1=dl[n-1],cr=crossed&&D[n-1][0]>.15;twist=abs(twist)*180/PI;
  recognise.feat={path,hp,rise,drop,dmax,dmin,twist,cr,loop,d0,d1};
  return cr&&d1>.5?4:d1<.35&&rise>.35&&drop>.35&&!loop?3:d1<.4&&loop?2:dmax<.45&&twist>150?5:d1>1.1&&d0<.6&&path<.5?1:0;
};

export function createSim(seed){
const S={_seed:seed};
const hand=()=>({p:[0,1.2,0],q:[0,0,0,1],v:[0,0,0],t:0,g:0,pt:0,pg:0,pp:[0,1.2,0]});
const rnd=()=>S._rng();
const ev=(k,p,b,d)=>S._ev.push({k,p:p?[p[0],p[1],p[2]]:0,b:b|0,d});
const yaw=()=>yawOf(S._H.q);
const fwdOf=h=>qrot(h.q,F);

S._init=()=>{
  S._rng=mulberry(S._seed);
  S._L=hand();S._R=hand();S._L.p=[-.3,1.2,.3];S._R.p=[.3,1.2,.3];S._L.pp=[-.3,1.2,.3];S._R.pp=[.3,1.2,.3];
  S._H={p:[0,1.6,0],q:[0,1,0,0]}; // facing +z (yaw 0 => forward +z)
  S._ht=0; // hand-tracking mode (pinch forge)
  S._rp=[];S._rq=[];S._rv=[];
  for(let i=0;i<=N;i++){const p=lerp(S._L.p,S._R.p,i/N);S._rp.push(p);S._rq.push([...p]);S._rv.push([0,0,0])}
  S._ten=0;S._tip=0;S._tipI=N>>1;S._crk=0;
  S._wp=0;S._fg={on:0,t:0,M:[],D:[],cd:0,pin:0};
  S._bow=0;S._held=0;
  S._spec=0;S._light=5;S._inv=0;
  S._en=[];S._pr=[];S._ar=[];
  S._wave=0;S._ws=0;S._wt=0;S._q=[];S._st=0;S._wtime=0;S._front=0;S._log=[];
  S._t=0;S._wtot=0;S._score=0;S._combo=0;S._cbt=0;S._ring=0;S._ev=[];
  S._halo={out:0,p:[0,0,0],v:[0,0,0],t:0,id:0,b:0};S._sh=[0,0];S._lt=[0,0,0];S._mh=[0,0,0];S._slam=0;
  S._beam=0;S._dark=0;S._endless=0;
};
S._init();

// ---------- player damage ----------
const hurt=n=>{if(S._inv>0||S._ws!=1)return;S._light=max(0,S._light-n);S._inv=1;ev('light',S._H.p,0,S._light);if(S._light<=0){S._ws=3;S._wt=3;ev('over')}};
const addSpec=n=>{S._spec=min(3,S._spec+n)};

// ---------- enemies ----------
const partPos=(e,pt)=>{if(pt._w)return pt._w;const o=pt._o;if(e._boss>=0)return add(e._p,add(mul(e._rt,o[0]),add([0,o[1],0],mul(e._fw,o[2]))));return add(e._p,o)};
const alive=e=>e._hp>0;
const spawn=(t,b,r)=>{
  const T=ET[t],e={_t:t,_p:bpos(b,r||9+rnd()*3,T[4]),_hp:1,_spd:T[1]*(S._spm||1),_r:T[2],_hh:T[3],_b:floor(rnd()*7),_stg:0,_cd:0,_kv:[0,0,0],_ph:rnd()*6.28,_at:0,_st:0,_boss:-1,_parts:[],_flare:0,_alt:1};
  if(t==3){const n=3+floor(rnd()*3);for(let i=0;i<n;i++)e._parts.push({_o:bpos(i/n*6.28,.35,0),_hp:4,_b:floor(rnd()*7),_pl:1,_r:.3});e._parts.push({_o:[0,0,0],_hp:6,_b:e._b,_core:1})}
  else if(t==4){for(let i=0;i<10;i++)e._parts.push({_o:bpos(i*.628,.5,0),_hp:1,_b:e._b,_d:0})}
  else e._parts.push({_o:[0,0,0],_hp:T[0],_b:e._b});
  S._en.push(e);ev('spawn',e._p,e._b,t);return e};
const killE=e=>{e._hp=0;S._combo=S._t-S._cbt<2?S._combo+1:1;S._cbt=S._t;S._score+=10*S._combo*(e._boss>=0?50:1);ev('kill',e._p,e._b,e._t);if(e._boss>=0){S._ring++;S._light=min(5,S._light+2);ev('bossdead',e._p,0,e._boss);if(e._boss==2){S._log.push([S._wave,S._wtime]);S._ws=4;S._wt=6;ev('dawn')}}};
const partHit=(e,pt,src)=>{ // can this source hit this part now?
  if(pt._hp<=0||e._inv)return 0;
  if(pt._core&&e._parts.some(q=>q._pl&&q._hp>0))return 0;
  if(pt._far&&!(src==2||src==5||src==6))return 0;
  if(pt._melee&&!(src==1||src==3||src==4||src==7))return 0;
  return 1};
// damage(part) with band; src ids: 0 whip 1 arc 2 arrow 3 shards 4 maul 5 halo 6 prism 7 lance 8 thrown 9 slam
const damage=(e,pt,dmg,band,src,p,kb)=>{
  const res=band==pt._b;
  if(pt._pl&&!(res||src==4)){ev('clank',p,band);return 0}
  if(pt._pl)dmg=99;
  if(res){dmg*=3;if(src!=6)addSpec(.34);e._stg=max(e._stg,.4);ev('res',p,band);S._score+=5}
  pt._hp-=dmg;ev('hit',p,band,src);
  if(kb&&e._boss<0){const d=norm([e._p[0],0,e._p[2]]);e._kv=mul(d,kb);e._at=0;e._flare=0}
  if(pt._hp<=0){if(pt._pl)ev('plate',partPos(e,pt),pt._b);
    if(!e._parts.some(q=>q._hp>0)){if(e._boss>=0){bossPartDead(e)}else killE(e)}
    else if(e._boss>=0)bossPartDead(e)}
  return 1};
// generic hit query: point p with radius r vs all enemy parts; returns [e,pt,partpos] list
const near=(p,r,src)=>{const out=[];for(const e of S._en)if(alive(e)){let best=0,bd=1e9;for(const pt of e._parts)if(partHit(e,pt,src)){const c=partPos(e,pt),dy=max(0,abs(p[1]-c[1])-(pt._hh||e._hh)),d=hypot(p[0]-c[0],dy,p[2]-c[2])-(pt._r||e._r);if(d<r&&d<bd){bd=d;best=[e,pt,c,d]}}if(best)out.push(best)}return out};
// melee sweep: sample n points along a-b, band from s, damage with per-enemy cooldown
const sweep=(a,b,n,dmg,src,cd,bandFn,kb,maxHits)=>{const best=new Map;for(let i=0;i<=n;i++){const s=i/n,p=lerp(a,b,s);for(const[e,pt,c,d]of near(p,.05,src)){const o=best.get(pt);if(!o||d<o[0])best.set(pt,[d,s,e,c,p])}}
  let hits=0;for(const[pt,[d,s,e,c,p]]of[...best].sort((x,y)=>x[1][1]-y[1][1])){if(pt._cd>0){if(maxHits&&++hits>=maxHits)break;continue}if(damage(e,pt,dmg,bandFn(s,c),src,p,kb)){pt._cd=cd;hits++;if(src==7&&e._t==1)e._stg=.8;if(maxHits&&hits>=maxHits)break}}return hits};

// ---------- rope ----------
const rope=()=>{
  const L=S._L.p,R=S._R.p,P=S._rp,Q=S._rq,B=S._bow;
  if(dist(L,P[0])>.5||dist(R,P[N])>.5)for(let i=0;i<=N;i++){P[i]=lerp(L,R,i/N);Q[i]=[...P[i]]} // hand teleport (controller reconnect): reset rope
  const d=dist(L,R),ten=S._ten=B?0:clamp((d-.55)/.25,0,1),sl=SEG*(1-.15*ten);
  const prev=P.map(p=>[...p]);
  let p0=L,pN=R,k=-1,pk;
  if(B){const H=S[B.h],A=B.a;if(B.h=='_R'){p0=L;pN=A}else{p0=A;pN=R}
    const ax=sub(pN,p0),s=clamp(dot(sub(H.p,p0),ax)/(dot(ax,ax)||1e-9),.05,.95);B.s=s;k=floor(s*N);pk=H.p;B.d=min(.6,dist(H.p,A))}
  const sdt=DT/3;
  for(let ss=0;ss<3;ss++){
    for(let i=1;i<N;i++){const p=P[i],q=Q[i];const v=mul(sub(p,q),.98);Q[i]=[...p];p[0]+=v[0];p[1]+=v[1]-6*sdt*sdt;p[2]+=v[2]}
    for(let it=0;it<6;it++){
      P[0]=[...p0];P[N]=[...pN];if(k>0)P[k]=[...pk];
      for(let i=0;i<N;i++){const a=P[i],b=P[i+1],dv=sub(b,a),l=len(dv)||1e-6,c=mul(dv,(l-sl)/l*.5);
        if(i>0&&i!=k){a[0]+=c[0];a[1]+=c[1];a[2]+=c[2]}if(i+1<N&&i+1!=k){b[0]-=c[0];b[1]-=c[1];b[2]-=c[2]}}
      if(ten>0)for(let i=0;i<N-1;i+=2){const a=P[i],b=P[i+2],dv=sub(b,a),l=len(dv)||1e-6,c=mul(dv,(l-2*sl)/l*.5*ten);
        if(i>0){a[0]+=c[0];a[1]+=c[1];a[2]+=c[2]}if(i+2<N){b[0]-=c[0];b[1]-=c[1];b[2]-=c[2]}}
    }
    P[0]=[...p0];P[N]=[...pN];if(k>0)P[k]=[...pk];
  }
  let tip=0,ti=N>>1;
  for(let i=0;i<=N;i++){const v=S._rv[i]=mul(sub(P[i],prev[i]),1/DT);const s=len(v);if(i>=N/3&&i<=2*N/3&&s>tip){tip=s;ti=i}}
  S._tip=tip;S._tipI=ti;
};

// ---------- forge & recogniser ----------

const headSpace=p=>{const y=yaw(),h=S._H.p,d=sub(p,h);return [-cos(y)*d[0]+sin(y)*d[2],d[1],sin(y)*d[0]+cos(y)*d[2]]};
const forgeStep=()=>{
  const G=S._fg,L=S._L,R=S._R;
  if(G.cd>0)G.cd-=DT;
  const busy=S._halo.out||S._sh[0]||S._sh[1]||S._bow;
  let want,rel;
  if(S._ht){const close=dist(L.p,R.p)<.3;G.pin=L.t&&R.t&&close?G.pin+DT:0;want=G.pin>=.4;rel=!(L.t&&R.t)}
  else{want=L.g&&R.g;rel=!(L.g&&R.g)}
  if(!G.on){if(want&&G.cd<=0&&!busy&&S._ws!=0){G.on=1;G.t=0;G.M=[];G.D=[];G.pin=0;S._halo.out=0;S._sh=[0,0];ev('forge',lerp(L.p,R.p,.5),0,S._wp);S._wp=0}return}
  G.t+=DT;G.M.push(headSpace(lerp(L.p,R.p,.5)));G.D.push(sub(headSpace(R.p),headSpace(L.p)));
  if(rel||G.t>=2.5){G.on=0;G.cd=1;G.pin=0;const w=recognise(G.M,G.D);S._feat=recognise.feat;S._wp=w;S._halo.out=0;S._halo.id++;S._sh=[0,0];S._beam=0;S._lt=[0,0,0];
    ev(w?'forged':'unforge',lerp(L.p,R.p,.5),0,w)}
};

// ---------- weapons ----------
const trigEdge=h=>h.t&&!h.pt;
const weapons=w=>{
  const L=S._L,R=S._R,P=S._rp,wp=S._wp,mid=lerp(L.p,R.p,.5);
  if(S._crk>0)S._crk-=w;if(S._slam>0)S._slam-=w;
  for(const e of S._en)for(const pt of e._parts)if(pt._cd>0)pt._cd-=w;
  if(S._fg.on)return;
  if(wp==0){
    // bow
    for(const hn of['_L','_R']){const H=S[hn];
      if(trigEdge(H)&&!S._bow&&!S._held){if(S._ten>=.7){S._bow={h:hn,a:[...H.p],s:.5,d:0};ev('draw',H.p)}
        else{ // catch
          for(let i=N/3|0;i<=2*N/3;i++)for(const e of S._en)if(alive(e)&&e._t==0&&!e._held&&dist(P[i],e._p)<.35){S._held={e,i,h:hn};e._held=1;ev('catch',e._p,e._b);i=N;break}}}
      if(!H.t&&H.pt){if(S._bow&&S._bow.h==hn){const B=S._bow,dd=dist(H.p,B.a);
          if(dd>=.15){const D=min(.6,dd),dir=norm(sub(B.a,H.p)),s=B.s;S._ar.push({p:[...B.a],v:mul(dir,12+20*D/.6),d:2+4*D/.6,b:bandOf(s),hit:new Set});ev('arrow',B.a,bandOf(s),D)}
          S._bow=0}
        if(S._held&&S._held.h==hn){const e=S._held.e;e._held=0;e._thr=mul(S._rv[S._held.i],1);if(len(e._thr)<2)e._thr=mul(norm(e._thr),2);ev('throw',e._p,e._b);S._held=0}}}
    if(S._held){const e=S._held.e;e._p=[...P[S._held.i]]}
    // whip crack
    if(S._ten<.3&&S._tip>=6&&S._crk<=0&&!S._bow){const i=S._tipI,p=P[i];S._crk=.25;ev('crack',p,bandOf(i/N));
      for(const[e,pt]of near(p,.35,0))damage(e,pt,2,bandOf(i/N),0,p,4)}
    // arc strike
    if(S._ten>=.7&&S._rv.some(v=>len(v)>=3.5))sweep(P[0],P[N],N,3,1,.3,s=>bandOf(s),0,0);
  }else if(wp==1){ // lance
    const dir=norm(sub(R.p,L.p)),tip=add(L.p,mul(dir,2.2)),tv=mul(sub(tip,S._lt),1/DT);S._lt=tip;
    const sp=len(tv),th=dot(tv,dir);
    if((sp>=3||th>=2.5)&&sp<40)sweep(L.p,tip,22,4,7,.6,s=>bandOf(s),0,3);
  }else if(wp==2){ // halo
    const H=S._halo;
    if(!H.out&&trigEdge(R)){const sp=len(R.v);H.out=1;H.id++;H.t=0;H.p=[...R.p];H.v=mul(sp>.5?norm(R.v):fwdOf(R),max(8,sp));H.b=bandOf((S._t/1.5)%1);ev('throw',R.p,H.b,2)}
    if(H.out){H.t+=w;if(H.t<1.2&&len(H.p)<12){H.p=add(H.p,mul(H.v,w));
        for(const[e,pt]of near(H.p,.35,5))if(pt._hid!=H.id){pt._hid=H.id;damage(e,pt,3,H.b,5,H.p,0)}}
      else{H.t=max(H.t,1.2);const d=sub(R.p,H.p),l=len(d);if(l<.3){H.out=0;ev('catch',R.p,H.b,2)}else H.p=add(H.p,mul(d,min(1,12*w/l)))}}
  }else if(wp==3){ // maul
    const dir=norm(sub(R.p,L.p)),hp=add(R.p,mul(dir,.2)),hv=mul(sub(hp,S._mh),1/DT);S._mh=hp;const sp=len(hv);S._mb=bandOf((S._t/2)%1);
    if(sp>=3&&sp<40){for(const[e,pt]of near(hp,.3,4))if(!(pt._cd>0)&&damage(e,pt,6,S._mb,4,hp,6))pt._cd=.5;
      if(hp[1]<.15&&sp>=4&&S._spec>=1&&S._slam<=0){S._spec--;S._slam=.5;ev('slam',hp,S._mb);
        for(const e of S._en)if(alive(e)&&e._t!=0&&hd(e._p,hp)<4){const pt=e._parts.find(q=>q._hp>0&&partHit(e,q,9));if(e._boss>=0){e._stg=1;e._atk=0;ev('stagger',e._p);addSpec(1)}else if(pt)damage(e,pt,4,S._mb,9,e._p,3)}}}
  }else if(wp==4){ // shards
    [L,R].forEach((H,i)=>{const f=fwdOf(H),T=S._sh[i];
      if(T){T.t+=w;if(T.t<.8&&!T.back){T.p=add(T.p,mul(T.v,w));for(const[e,pt]of near(T.p,.2,3))if(pt._hid!=T.id){pt._hid=T.id;damage(e,pt,3,T.b,3,T.p,0);T.back=1}}
        else{const d=sub(H.p,T.p),l=len(d);if(l<.3)S._sh[i]=0;else T.p=add(T.p,mul(d,min(1,10*w/l)))}return}
      const bf=s=>bandOf(i?.5+s*.5:s*.5);
      if(trigEdge(H)){S._sh[i]={p:[...H.p],v:mul(f,10),t:0,id:++S._halo.id,b:bf(.5),back:0};ev('throw',H.p,bf(.5),4);return}
      if(len(H.v)>=2.5)sweep(H.p,add(H.p,mul(f,.45)),5,2,3,.15,bf,0,0)});
  }else if(wp==5){ // prism
    const f=norm(add(fwdOf(L),fwdOf(R))),fr=fwdOf(R),u=qrot(R.q,[0,1,0]);let rr=cross(fr,[0,1,0]);rr=len(rr)<1e-3?[1,0,0]:norm(rr);const roll=atan2(dot(u,rr),dot(u,cross(rr,fr))),b=min(6,floor(((roll+PI)/(2*PI))*7));S._pb=b;
    if(R.t||L.t){const a=mid,e2=add(a,mul(f,12)),pw=S._spec>0;S._beam=[a,e2,b];if(pw)S._spec=max(0,S._spec-w);
      for(const e of S._en)if(alive(e))for(const pt of e._parts)if(partHit(e,pt,6)){const c=partPos(e,pt);if(segd(c,a,e2)[0]<.4+(pt._r||e._r)){if(!(pt._cd>0)){pt._cd=.2;damage(e,pt,(pw?5:1)*.2,b,6,c,0)}}}}
    else S._beam=0;
  }
};

// ---------- projectiles ----------
const projectiles=w=>{
  const P=S._rp,L=S._L.p,R=S._R.p;
  S._pr=S._pr.filter(o=>{o.p=add(o.p,mul(o.v,w));
    if(o.p[1]<0||len(o.p)>25)return 0;
    if(S._wp==0&&S._ten>=.7&&!S._bow){let bi=-1,bd=.2;for(let i=0;i<=N;i++){const d=dist(P[i],o.p);if(d<bd){bd=d;bi=i}}if(bi>=0){if(bandOf(bi/N)==o.b){addSpec(1);ev('absorb',o.p,o.b)}else ev('block',o.p,o.b);return 0}}
    if(S._wp==1&&segd(o.p,L,add(L,mul(norm(sub(R,L)),2.2)))[0]<.2){ev('block',o.p,o.b);return 0}
    const oh=dist(o.p,S._H.p)<.3?1:dist(o.p,L)<.2||dist(o.p,R)<.2?2:dist(o.p,UNI)<.9?3:0;if(oh){hurt(1);ev('orbhit',o.p,o.b,oh);return 0}
    return 1});
  S._ar=S._ar.filter(a=>{a.p=add(a.p,mul(a.v,w));if(len(a.p)>40||a.p[1]<0)return 0;
    if(a.pull){a.v=add(a.v,mul(sub(a.pull,a.p),8*w));if(dist(a.p,a.pull)<1)return 0}
    for(const[e,pt]of near(a.p,.1,2))if(!a.hit.has(e)){a.hit.add(e);damage(e,pt,a.d,a.b,2,a.p,0);if(e._t!=0&&e._t!=4)return 0}
    return 1});
};

// ---------- enemy behaviour ----------
const enemies=w=>{
  const H=S._H.p,hx=[H[0],0,H[2]];
  for(const e of S._en){
    if(!alive(e))continue;
    if(e._held)continue;
    if(e._thr){e._p=add(e._p,mul(e._thr,w));e._thr[1]-=4*w;for(const[o,pt]of near(e._p,.2,8))if(o!=e){damage(o,pt,3,e._b,8,e._p,3);killE(e);break}if(e._p[1]<0||len(e._p)>15)killE(e);continue}
    if(e._boss>=0){boss(e,w);continue}
    if(e._stg>0){e._stg-=w;continue}
    if(len(e._kv)>.1){e._p=add(e._p,mul(e._kv,w));e._kv=mul(e._kv,1-6*w);e._p[1]=ET[e._t][4]}
    const T=ET[e._t],sp=e._spd,t=e._t;
    const tgt=t==4?hx:t==2?[0,e._p[1],0]:[0,e._p[1],-1.8];
    const d=sub(tgt,e._p),dl=hd(tgt,e._p),dir=norm([d[0],0,d[2]]);
    const walk=()=>{e._p=add(e._p,mul(dir,sp*w))};
    // player-blocking: ground enemies stop near the player and attack them instead
    if((t==1||t==3)&&hd(e._p,hx)<1&&e._st<2){e._flare+=w;if(e._flare>=2){e._flare=0;
        let blocked=S._ten>=.7&&S._wp==0&&S._rp.some(p=>dist(p,e._p)<.7)||S._wp==1;
        if(blocked)ev('block',e._p,e._b);else hurt(1);ev('swing',e._p,e._b)}
      else if(e._flare>1.5&&!e._fl){e._fl=1;ev('flare',e._p,e._b)}continue}
    e._fl=0;
    if(t==0){ // wisp
      if(e._st==0){if(dl<2){e._st=1;e._at=0;e._ph=atan2(e._p[0],e._p[2]+1.8)}else{e._ph+=w*4;const side=cross(dir,[0,1,0]);e._p=add(e._p,add(mul(dir,sp*w),mul(side,cos(e._ph)*3.2*w)))}}
      else{e._at+=w;e._ph+=sp/1.5*w;e._p=[sin(e._ph)*1.5,1.5,-1.8+cos(e._ph)*1.5];if(e._at>=2){hurt(1);ev('dive',e._p,e._b);killE(e)}}
    }else if(t==1){ // husk
      if(dl>1.5)walk();else{e._at+=w;if(e._at>=2){e._at=0;hurt(1);ev('swing',e._p,e._b)}else if(e._at>1.5&&!e._fl2){e._fl2=1;ev('flare',e._p,e._b)}if(e._at<1.5)e._fl2=0}
    }else if(t==2){ // spitter
      if(dl>5)walk();e._at+=w;if(e._at>=3.5){e._at=0;e._alt=!e._alt;const to=e._alt?UNI:S._H.p,v=norm(sub(to,e._p));S._pr.push({p:add(e._p,mul(v,.7)),v:mul(v,6),b:e._b});ev('spit',e._p,e._b)}
    }else if(t==3){ // shell
      if(dl>1.2)walk();else{if(!e._at)ev('flare',e._p,e._b);e._at+=w;if(e._at>=2.5){hurt(2);ev('dive',e._p,e._b);killE(e)}}
    }else{ // swarm
      if(e._st==0){if(dl<2.2){e._st=1;e._at=0}else walk()}
      else if(e._st==1){e._at+=w;e._ph+=w*1.2;e._p=[H[0]+sin(e._ph)*2,1.4,H[2]+cos(e._ph)*2];
        e._dt=(e._dt||0)+w;if(e._dt>.9){e._dt=0;const ps=e._parts.filter(p=>p._hp>0&&!p._d);if(ps.length){const p=ps[floor(rnd()*ps.length)];p._d=.001;p._h=rnd()<.5?'_L':'_R';p._o0=[...p._o]}}
        e._lands=(e._lands||[]).filter(x=>S._t-x<2);
        for(const p of e._parts)if(p._d){p._d+=w;const hp=S[p._h].p,tg=sub(hp,e._p);if(p._d<.4)p._o=lerp(p._o0,tg,p._d/.4);else if(p._d<.8){if(!p._l){p._l=1;e._lands.push(S._t);if(e._lands.length>=3){e._lands=[];hurt(1);ev('sting',hp,e._b)}}p._o=lerp(tg,p._o0,(p._d-.4)/.4)}else{p._d=0;p._l=0;p._o=p._o0}}
        if(e._at>=6){e._st=2}}
      else{const u=[0,1.4,-1.8],dd=sub(u,e._p),l=hd(u,e._p);if(l>.5)e._p=add(e._p,mul(norm([dd[0],0,dd[2]]),sp*w));else{hurt(1);ev('dive',e._p,e._b);killE(e)}}
    }
  }
};

// ---------- bosses ----------
const bossPartDead=e=>{
  if(e._boss==2){const ph=e._ph;
    if(ph==1&&!e._parts.some(p=>p._hp>0)){e._ph=2;e._p=add(mul(e._fw,-3),[0,3,0]);e._parts=[0,1,2].map(i=>({_o:[0,0,0],_hp:24,_b:floor(rnd()*7),_melee:1,_r:.35,_w:[sin(e._by+(i-1)*.7)*1.2,1.3,cos(e._by+(i-1)*.7)*1.2]}));e._atk=0;e._tm=[4,3];e._inv=0;ev('phase',e._p,0,2)}
    else if(ph==2&&!e._parts.some(p=>p._hp>0)){e._ph=3;e._p=[0,2,0];e._parts=[{_o:[0,0,0],_hp:180,_b:0,_r:.6}];e._tm=[3,0];e._inv=0;ev('phase',e._p,0,3)}
    else if(ph==3&&!e._parts.some(p=>p._hp>0))killE(e);
  }else if(e._boss==1){
    if(!e._parts.some(p=>p._hp>0))killE(e);
    else if(!e._parts.some(p=>p._pl&&p._hp>0)&&e._ph==1){e._ph=2;e._tm=[5,3];e._atk=0;e._p=mul(e._fw,-2.2);e._parts[6]._b=2+floor(rnd()*5);ev('phase',e._p,0,2)}
  }else if(!e._parts.some(p=>p._hp>0))killE(e);
};
const spawnBoss=id=>{
  const by=yaw(),fw=bpos(by,-1,0),rt=cross([0,1,0],fw);S._front=by; // fw = direction from boss toward centre
  const e={_t:5+id,_boss:id,_by:by,_fw:fw,_rt:rt,_hp:1,_r:.5,_hh:0,_b:floor(rnd()*7),_stg:0,_cd:0,_kv:[0,0,0],_parts:[],_atk:0,_ph:1,_tm:[],_open:0,_oc:0,_inv:0,_hid:0,_spd:0,_at:0,_st:0,_spawned:0};
  if(id==0){e._p=add(mul(fw,-6),[0,7,0]);e._parts=[{_o:[0,0,0],_hp:400,_b:e._b,_far:1,_r:.8}];e._tm=[3,8,6]}
  if(id==1){e._p=mul(fw,-3);e._parts=[[-.4,2.2,0],[.4,2.2,0],[-.9,2.8,0],[.9,2.8,0],[-1.2,1.4,0],[1.2,1.4,0]].map(o=>({_o:o,_hp:8,_b:floor(rnd()*7),_pl:1,_r:.35}));e._parts.push({_o:[0,1.5,0],_hp:650,_b:e._b,_core:1,_melee:1,_r:.5});e._tm=[5,4]}
  if(id==2){e._p=add(mul(fw,-6),[0,6,0]);e._parts=[{_o:[0,0,0],_hp:130,_b:e._b,_far:1,_r:.9}];e._inv=1;e._tm=[0,0];S._dark=1}
  S._en.push(e);ev('boss',e._p,e._b,id);return e};
const strike=(e,k,r,t)=>{e._atk={k,r,t:t||.8,p:[S._H.p[0],0,S._H.p[2]]};ev('cue',e._atk.p,k,e._atk.t)};
const resolveAtk=(e,w)=>{const A=e._atk;if(!A)return;A.t-=w;if(A.t>0)return;e._atk=0;const H=S._H.p;
  if(A.k==0){if(hd(H,A.p)<A.r+.18)hurt(1);ev('strike',A.p,0,A.k)} // column / slam / tentacle
  else if(A.k==1){if(H[1]>A.r-.2)hurt(1);ev('sweep',[0,A.r,0],0,1)} // horizontal sweep at height r
  else if(A.k==2){hurt(1);ev('lunge',e._p)} // lunge landed
  else if(A.k==3){ // light-eater pulse: need taut arc or lance across the unicorn
    const U=[0,1,-1.8];let sh=0;if(S._wp==0&&S._ten>=.7)sh=S._rp.some(p=>dist(p,U)<1);if(S._wp==1){const L=S._L.p,d=norm(sub(S._R.p,L));sh=segd(U,L,add(L,mul(d,2.2)))[0]<1}
    if(!sh)hurt(1);ev('pulse',U,0,sh)}
};
const boss=(e,w)=>{
  const T=e._tm;if(e._stg>0){e._stg-=w;return}
  resolveAtk(e,w);
  if(e._boss==0){const p2=e._parts[0]._hp<150;
    T[0]-=w;T[1]-=w;T[2]-=w;
    if(T[0]<=0&&!e._atk){T[0]=p2?2:3;strike(e,0,.5)}
    if(T[1]<=0&&!e._atk){T[1]=p2?5:8;e._atk={k:1,r:1.4,t:1.3};ev('cue',[0,1.4,0],1,1.3)}
    if(T[2]<=0){T[2]=6;e._open=p2?1.8:2.5;e._parts[0]._b=floor(rnd()*7);ev('eye',e._p,e._parts[0]._b,1)}
    if(e._open>0){e._open-=w;e._inv=0;if(e._open<=0)ev('eye',e._p,0,0)}else e._inv=1;
  }else if(e._boss==1){
    T[0]-=w;T[1]-=w;
    if(e._ph==1){
      if(T[0]<=0&&!e._atk){T[0]=5;e._atk={k:1,r:1.3,t:1.15};ev('cue',[0,1.3,0],1,1.15)}
      if(T[1]<=0&&!e._atk){T[1]=4;strike(e,0,.3)}
    }else{
      if(T[0]<=0&&!e._atk){T[0]=5;e._atk={k:1,r:1.3,t:1.15};ev('cue',[0,1.3,0],1,1.15)}
      if(T[1]<=0&&!e._atk){T[1]=3;e._atk={k:2,t:.5};e._lhp=e._parts[6]._hp;e._parts[6]._cd=0;ev('cue',e._p,2,.5)}
      if(e._atk&&e._atk.k==2&&e._parts[6]._hp<e._lhp){e._atk=0;e._stg=1;addSpec(1);ev('stagger',e._p)}
    }
  }else{ // eclipse
    if(e._ph==1){
      T[0]-=w;
      if(e._open>0){e._open-=w;e._inv=0;if(e._open<=0){e._inv=1;e._spawned=0;T[0]=0;ev('eye',e._p,0,0)}}
      else{e._inv=1;
        if(e._spawned<4&&T[0]<=0){T[0]=4;const b=e._by+(rnd()-.5)*3;const s=spawn(e._spawned%2?2:4,b,8);s._sum=1;e._spawned++}
        const sw=S._en.filter(x=>x._sum&&x._t==4);
        if(e._spawned>=3&&sw.every(x=>!alive(x))){e._open=4;e._parts[0]._b=floor(rnd()*7);ev('eye',e._p,e._parts[0]._b,1)}}
    }else if(e._ph==2){
      T[0]-=w;T[1]-=w;
      if(T[0]<=0){T[0]=4;ev('gravity',e._p);for(const a of S._ar)a.pull=e._p;if(S._halo.out)S._halo.t=1.2}
      if(T[1]<=0&&!e._atk){T[1]=3;strike(e,0,.4)}
    }else{
      T[0]-=w;e._parts[0]._b=floor((S._t/2)%7);
      if(T[0]<=0&&!e._atk){T[0]=3;e._atk={k:3,t:.8};ev('cue',[0,1,-1.8],3,.8)}
    }
  }
};

// ---------- waves ----------
const waveDef=n=>{if(n<=12)return WAVES[n-1];const b=WAVES[4+(n-13)%7];return b};
const beginWave=n=>{
  S._wave=n;S._ws=1;S._wtime=0;S._front=yaw();S._q=[];S._spm=n>12?1.05**(n-12):1;
  const d=waveDef(n);ev('wave',0,0,n);
  if(d.length==1){spawnBoss(d[0]);return}
  const m=n>12?1.3**(n-12):1;
  const cnt=[];for(let i=2;i<d.length;i+=2)cnt.push([d[i],Math.round(d[i+1]*m)]);
  for(let more=1;more;){more=0;for(const c of cnt)if(c[1]-->0){S._q.push(c[0]);more=1}}
  S._iv=d[0];S._spread=d[1]*PI/180;S._st=d[0];
};
const waves=w=>{
  const trig=trigEdge(S._L)||trigEdge(S._R);
  if(S._ws==0){if(trig){S._ws=2;S._wt=1;S._wave=0;ev('start')}return}
  if(S._ws==2){S._wt-=w;if(S._wt<=0)beginWave(S._wave+1);return}
  if(S._ws==3){S._wt-=w;if(S._wt<=0&&trig){S._init();S._ws=2;S._wt=1;ev('restart')}return}
  if(S._ws==4){S._en=[];S._pr=[];S._ar=[];S._wt-=w;if(S._wt<=0&&trig){S._endless=1;S._dark=0;S._ws=2;S._wt=1;ev('endless')}return}
  S._wtime+=w;
  if(S._q.length){S._st-=w;if(S._st<=0){S._st=S._iv;spawn(S._q.shift(),S._front+S._spread*(rnd()*2-1))}}
  else if(!S._en.some(alive)){S._log.push([S._wave,S._wtime]);S._score+=100*S._wave;S._ws=2;S._wt=3;S._en=[];S._pr=[];S._ar=[];S._dark=0;ev('clear',0,0,S._wave)}
};

// ---------- public API ----------
S.inject=(L,R,H)=>{ // L/R: {p,q,t,g}; H: {p,q}. Copies values in.
  for(const[h,s]of[[L,S._L],[R,S._R]])if(h){if(h.p)s.p=[...h.p];if(h.q)s.q=[...h.q];if(h.t!=null)s.t=+h.t;if(h.g!=null)s.g=+h.g}
  if(H){if(H.p)S._H.p=[...H.p];if(H.q)S._H.q=[...H.q]}
};
S.step=n=>{for(let i=0;i<(n||1);i++){
  S._t+=DT;const w=S._fg.on?DT*.15:DT;S._wtot+=w;
  for(const h of[S._L,S._R]){h.v=lerp(h.v,mul(sub(h.p,h.pp),1/DT),.5);h.pp=[...h.p]}
  if(S._inv>0)S._inv-=w;
  rope();forgeStep();weapons(w);projectiles(w);enemies(w);waves(w);
  S._en=S._en.filter(alive);
  S._L.pt=S._L.t;S._R.pt=S._R.t;
}};
S.hashState=()=>{let h=2166136261;const f=x=>{h=Math.imul(h^(x*1000|0),16777619)};
  f(S._light);f(S._spec*100);f(S._score);f(S._wave);f(S._ws);f(S._wp);f(S._t);f(S._ten);
  for(const p of S._rp){f(p[0]);f(p[1]);f(p[2])}
  for(const e of S._en){f(e._p[0]);f(e._p[2]);for(const p of e._parts)f(p._hp)}
  for(const o of S._pr){f(o.p[0]);f(o.p[2])}for(const a of S._ar){f(a.p[0]);f(a.p[2])}
  return h>>>0};
S.drain=()=>{const e=S._ev;S._ev=[];return e};
S._spawn=spawn;S._spawnBoss=spawnBoss;
return S;
}
