// bot.js — scripted players for the sim. Perfect bot, wrong-tool bot (no forging), idle bot.
// The bot is a "virtual body": head within 1 m of the arena centre (≤ 2 m/s), hands within
// ~1.1 m of the head (≤ 5 m/s). It reads sim state and drives S.inject(...) exactly like input.js.
import {sin,cos,abs,min,max,hypot,sqrt,PI,atan2,floor,add,sub,mul,dot,cross,len,dist,norm,lerp,clamp,qrot} from '../src/vec.js';
import {DT,N} from '../src/sim.js';
import {SIGILS,toArena} from './trajectories.js';

const UP=[0,1,0],UNI=[0,1,-1.8];
const HAND_SPD=5,HEAD_SPD=2,REACH=1.15,PLAY_R=1,AIM=24,THINK=14; // aim hold 0.27 s, reaction 0.16 s
// quaternion from orthonormal columns (x,y,z) of a rotation matrix
const mat2q=(x,y,z)=>{const t=x[0]+y[1]+z[2];let q;if(t>0){const s=sqrt(t+1)*2;q=[(y[2]-z[1])/s,(z[0]-x[2])/s,(x[1]-y[0])/s,.25*s]}
  else if(x[0]>y[1]&&x[0]>z[2]){const s=sqrt(1+x[0]-y[1]-z[2])*2;q=[.25*s,(x[1]+y[0])/s,(z[0]+x[2])/s,(y[2]-z[1])/s]}
  else if(y[1]>z[2]){const s=sqrt(1+y[1]-x[0]-z[2])*2;q=[(x[1]+y[0])/s,.25*s,(y[2]+z[1])/s,(z[0]-x[2])/s]}
  else{const s=sqrt(1+z[2]-x[0]-y[1])*2;q=[(z[0]+x[2])/s,(y[2]+z[1])/s,.25*s,(x[1]-y[0])/s]}return q};
// controller quaternion whose forward (0,0,-1) is dir, with sim-roll rho (see sim prism band rule)
export const lookQ=(dir,rho=0)=>{const z=mul(norm(dir),-1);let x=cross(UP,z);if(len(x)<1e-4)x=[1,0,0];x=norm(x);const y=cross(z,x);const r=-rho;
  const x2=add(mul(x,cos(r)),mul(y,sin(r))),y2=add(mul(x,-sin(r)),mul(y,cos(r)));return mat2q(x2,y2,z)};
// head quaternion facing yaw psi (yaw 0 => +z)
export const headQ=psi=>[0,sin((psi+PI)/2),0,cos((psi+PI)/2)];

export function makeBot(S,opts={}){
  const B={head:[0,1.6,0],yaw:0,L:[-.3,1.2,.3],R:[.3,1.2,.3],Lq:[0,0,0,1],Rq:[0,0,0,1],Lt:0,Rt:0,Lg:0,Rg:0,
    tL:[-.3,1.2,.3],tR:[.3,1.2,.3],tH:[0,1.6,0],task:null,name:'',fail:new Map,frames:[],log:[],vel:new Map,prev:new Map,idle:!!opts.idle,noForge:!!opts.noForge,rec:!!opts.record,t:0};
  const pos=e=>e._p, part=(e,pt)=>{if(pt._w)return pt._w;const o=pt._o;if(e._boss>=0)return add(e._p,add(mul(e._rt,o[0]),add([0,o[1],0],mul(e._fw,o[2]))));return add(e._p,o)};
  const velOf=e=>B.vel.get(e)||[0,0,0];
  const pred=(e,pt,t)=>add(part(e,pt),mul(velOf(e),t));
  const clampHead=h=>{const r=hypot(h[0],h[2]);const s=r>PLAY_R?PLAY_R/r:1;return [h[0]*s,clamp(h[1],.85,1.7),h[2]*s]};
  const inReach=(p,h)=>dist(p,h||B.head)<=REACH;
  const alive=e=>e._hp>0;
  const foes=()=>S._en.filter(e=>alive(e)&&e._boss<0);
  const bossOf=()=>S._en.find(e=>alive(e)&&e._boss>=0);
  const wp=()=>S._wp;
  const set=(L,R)=>{if(L)B.tL=L;if(R)B.tR=R};
  const stance=()=>{B.hy=1.6;const f=fwd();set(add(B.head,add(mul(f,.35),[-.3*cos(B.yaw),-.35,.3*sin(B.yaw)])),add(B.head,add(mul(f,.35),[.3*cos(B.yaw),-.35,-.3*sin(B.yaw)])))};
  const fwd=()=>[sin(B.yaw),0,cos(B.yaw)];
  const right=()=>[-cos(B.yaw),0,sin(B.yaw)];
  const face=p=>{B.yaw=atan2(p[0]-B.head[0],p[2]-B.head[2])};
  const settled=()=>dist(B.L,B.tL)<.02&&dist(B.R,B.tR)<.02;
  const hperp=d=>{let p=cross(UP,d);if(len(p)<1e-3)p=[1,0,0];return norm(p)};

  // ---------- primitives (generators; one yield = one sim step) ----------
  function* wait(n){for(let i=0;i<n;i++)yield}
  function* settle(extra=2){let k=0;while(!settled()&&k++<200)yield;yield* wait(extra)}
  function* forge(name){B.name='forge'; // play a canned sigil at ≤ 5 m/s, grips held
    if(B.noForge)return;
    const g=SIGILS[name];const dur=name=='lance'?.4:name=='prism'?.6:.5;const n=round(dur*90);
    const h=[...B.head];const tf=p=>{const y=B.yaw;return [h[0]-cos(y)*p[0]+sin(y)*p[2],h[1]+p[1],h[2]+sin(y)*p[0]+cos(y)*p[2]]};
    let [L,R]=g.gen(0,g.norm);set(tf(L),tf(R));yield* settle(2);
    B.Lg=B.Rg=1;yield;
    for(let i=1;i<=n;i++){[L,R]=g.gen(i/n,g.norm);set(tf(L),tf(R));yield}
    yield* wait(2);B.Lg=B.Rg=0;yield;yield;
  }
  function* unforge(){B.name='unforge';if(wp()==0)return;B.Lg=B.Rg=1;yield;yield;B.Lg=B.Rg=0;yield;yield}
  function* ensure(w){ // 0 rope,1 lance,3 maul,5 prism,2 halo
    if(wp()==w)return;if(B.noForge)return;B.lastSwitch=B.t;
    while(S._fg.cd>0)yield;
    if(w==0){yield* unforge();return}
    yield* forge(['rope','lance','halo','maul','shards','prism'][w]);
    let k=0;while(S._fg.on&&k++<300)yield;
  }
  const hpOf=e=>e._parts.reduce((a,p)=>a+max(0,p._hp),0);
  function* tracked(gen,e){const h0=hpOf(e);yield* gen;if(alive(e)&&hpOf(e)>=h0)B.fail.set(e,(B.fail.get(e)||0)+1);else B.fail.set(e,0)}
  const failed=e=>(B.fail.get(e)||0)>=2;
  // arc strike: horizontal taut rope chopped down through target part with band b at contact
  function* arc(e,pt,b){yield* tracked(arc0(e,pt,b),e)}
  // circling wisp: ambush a point ahead on its orbit (radius 1.5 around the unicorn, 1.5 m up)
  function* ambush(e,pt,b){B.name='ambush';
    const rate=e._spd/1.5,at=t=>{const ph=e._ph+rate*t;return [sin(ph)*1.5,1.5,-1.8+cos(ph)*1.5]};
    let tl=.5,T;for(;tl<1.7;tl+=.1){T=at(tl);if(nearestHeadDist(T)<=REACH-.15)break}
    const t0=S._t,sb=(b+.5)/7;let u=-1,k=0;
    face(T);B.hy=1.6;{const dh=[T[0]-B.head[0],0,T[2]-B.head[2]],l=hypot(dh[0],dh[2]);if(l>.7)B.tH=clampHead(add(B.head,mul(dh,(l-.55)/l)))}
    while(k++<220&&alive(e)&&pt._hp>0&&e._st==1){
      const line=right(),rem=tl-(S._t-t0);
      const off=u<0?.45:(.45-u*.9);
      const c=[T[0],T[1]+off,T[2]];set(sub(c,mul(line,sb*.9)),add(c,mul(line,(1-sb)*.9)));
      if(u<0){if(rem<=.1)u=0}else{u+=DT/.2;if(u>1)break}
      if(rem<-.5)break;
      yield;
    }
  }
  function* arc0(e,pt,b){B.name='arc';
    if(e._t==0&&e._st==1){yield* ambush(e,pt,b);return}
    const T0=part(e,pt);face(T0);
    if(!inReach(T0)){B.tH=clampHead(add(B.head,mul(norm(sub(T0,B.head)),dist(T0,B.head)-.9)))}
    const sb=(b+.5)/7;let u=-1,k=0;
    while(k++<120&&alive(e)&&pt._hp>0){
      if(k%15==0&&preempt(e))break;
      const T=pred(e,pt,.06),line=right();B.hy=clamp(T[1]+.5,.85,1.6);
      {const dh=[T[0]-B.head[0],0,T[2]-B.head[2]],l=hypot(dh[0],dh[2]);if(l>.75)B.tH=clampHead(add(B.head,mul(dh,(l-.65)/l)))}
      const off=u<0?.45:(.45-u*.9);
      const c=[T[0],max(.1,T[1]+off),T[2]];const L=sub(c,mul(line,sb*.9)),R=add(c,mul(line,(1-sb)*.9));
      set(L,R);
      if(u<0){if(settled()&&S._ten>=.7){yield* wait(2);u=0}}
      else{u+=DT/.2;if(u>1)break}
      yield;
    }
  }
  // bow shot at part with band b (or -1 = any)
  function* bow(e,pt,b){B.name='bow';
    const f=fwd(),r=right();face(part(e,pt));
    const A0=add(B.head,add(mul(fwd(),.45),[0,-.3,0]));
    set(sub(A0,mul(right(),.9)),A0);yield* settle(1);
    let k=0;while(S._ten<.7&&k++<60)yield;
    if(S._bow||S._wp!=0)return;
    B.Rt=1;yield;const A=[...B.R];
    if(!S._bow){B.Rt=0;yield;return}
    const D=.62,d=.3;let aim=0;
    for(k=0;k<140;k++){
      if(!alive(e)||pt._hp<=0){break}
      if(k%15==0&&preempt(e))break;
      const dd=dist(part(e,pt),A),tof=dd/32;const T=pred(e,pt,tof);
      const dir=norm(sub(T,A)),P=sub(A,mul(dir,D));
      let O;if(b<0||b>=6.5){O=add(A,mul(hperp(dir),d))}else{const s=(b+.5)/7,g=1-s;const ee=g<.02?0:(-D+sqrt(max(0,D*D-4*g*g*d*d)))/(2*g);O=add(add(A,mul(hperp(dir),d)),mul(dir,ee))}
      set(O,P);
      if(dist(B.R,P)<.015&&dist(B.L,O)<.015){if(++aim>=AIM)break}
      yield;
    }
    B.Rt=0;yield;yield;
  }
  // lance thrust: shaft from L through target part, band b at contact
  const LR=REACH-.55;
  const bestHead=(T,rc)=>{let best=null,bd=1e9;for(let r=0;r<=1;r+=.25)for(let a=0;a<12;a++){const h=[cos(a*PI/6)*r,B.hy||1.6,sin(a*PI/6)*r];const d=abs(dist(T,h)-rc);if(d<bd){bd=d;best=h}}return best};
  const lanceRc=(e,pt,b)=>{let rc=(b+.5)/7*2.2;const dh=dist(part(e,pt),B.head);if(abs(dh-rc)>LR)rc=clamp(dh-LR,.15,2.1);return rc};
  const nearestHeadDist=T=>{let bd=1e9;for(let r=0;r<=1;r+=.25)for(let a=0;a<12;a++){const h=[cos(a*PI/6)*r,clamp(T[1]+.5,.85,1.6),sin(a*PI/6)*r];bd=min(bd,dist(T,h))}return bd};
  const gripOk=(T,rc)=>{const dn=abs(dist(T,bestHead(T,rc))-rc)<=LR;const dr=rc<.8&&nearestHeadDist(T)<=REACH-rc-.08;return dn?1:dr?2:0};
  function* lance(e,pt,b){if(e._boss>=0){yield* lance0(e,pt,b);return}yield* tracked(lance0(e,pt,b),e)}
  function* lance0(e,pt,b){B.name='lance';
    let k=0,phase=0;
    while(k++<150&&alive(e)&&pt._hp>0){
      if(k%15==0&&phase==0&&preempt(e))break;
      const T=pred(e,pt,.03);face(T);B.hy=clamp(T[1]+.7,.85,1.6);
      const rc0=(b+.5)/7*2.2,dh=dist(T,B.head);
      const g=gripOk(T,rc0);let dir,L,R,rc;
      if(g==2){if(dh>REACH-rc0-.1)B.tH=bestHead(T,REACH-rc0-.25);rc=rc0;dir=norm(sub(B.head,T));L=sub(T,mul(dir,rc));R=add(L,mul(dir,.5))}
      else{if(abs(dh-rc0)>LR){B.tH=bestHead(T,rc0)}rc=lanceRc(e,pt,b);dir=norm(sub(T,B.head));L=sub(T,mul(dir,rc));R=add(L,mul(dir,.5))}
      const fast=len(velOf(e))>1.5;
      if(phase==0){set(L,R);if((dist(B.L,L)<.07&&dist(B.R,R)<.07&&(k>6))||(fast&&k>25&&dist(B.L,L)<.1)){phase=1;k=0}}
      else if(fast){const rt=hperp(dir),f=k<=4?k*.08:(8-k)*.08;set(L,add(R,mul(rt,f)));if(k>=8)break}
      else{const adv=min(.3,k*DT*4.5);set(add(L,mul(dir,adv)),add(R,mul(dir,adv)));if(adv>=.3)break}
      yield;
    }
    yield;
  }
  // Gloam phase 2: hold a ready pose on the core; thrust on lunge cue or whenever the core is off cooldown
  function* gloam2(bo){B.name='gloam2';
    const core=bo._parts[6];yield* ensure(1);if(wp()!=1){yield;return}
    let k=0,th=0,rest=0;
    while(alive(bo)&&k++<3000){
      const T=part(bo,core);face(T);B.hy=1.6;const rc0=(core._b+.5)/7*2.2;
      if(abs(dist(T,B.head)-rc0)>LR)B.tH=bestHead(T,rc0);
      const rc=lanceRc(bo,core,core._b),dir=norm(sub(T,B.head));const L=sub(T,mul(dir,rc)),R=add(L,mul(dir,.5));
      const A=bo._atk;
      if(th>0){const adv=min(.3,th*DT*4.5);set(add(L,mul(dir,adv)),add(R,mul(dir,adv)));th++;if(adv>=.3)th=0}
      else{set(L,R);rest++;if(settled()&&((A&&A.k==2)||(!(core._cd>0)&&rest>60))){th=1;rest=0}}
      yield;
    }
  }
  // maul swing through a part (lateral sweep of the hammer head)
  function* maul(e,pt){B.name='maul';
    let u=-1,k=0;
    while(k++<150&&alive(e)&&pt._hp>0){
      const T=pred(e,pt,.05);face(T);B.hy=clamp(T[1]+.4,.85,1.6);
      {const dh=[T[0]-B.head[0],0,T[2]-B.head[2]],l=hypot(dh[0],dh[2]);if(l>.9)B.tH=clampHead(add(B.head,mul(dh,(l-.8)/l)))}
      const line=hperp(sub(T,B.head)),dir=norm(sub(T,B.head));
      const off=u<0?-.5:(-.5+u);
      const hp=add(T,mul(line,off)),R=sub(hp,mul(dir,.2)),L=sub(R,mul(dir,.5));
      set(L,R);
      if(u<0){if(settled()){yield* wait(3);u=0}}else{u+=DT*4.5;if(u>1)break}
      yield;
    }
  }
  // prism beam at a part for `dur` seconds with band b
  function* prism(e,pt,b,dur){B.name='prism';
    let k=0;const n=round(dur*90);
    while(k++<n&&alive(e)&&pt._hp>0){
      const T=part(e,pt);face(T);const c=add(B.head,add(mul(fwd(),.35),[0,-.2,0]));
      const dir=norm(sub(T,c));const rho=((b+.5)/7)*2*PI-PI;
      set(sub(c,mul(right(),.08)),add(c,mul(right(),.08)));B.Lq=lookQ(dir,0);B.Rq=lookQ(dir,rho);
      if(k>8)B.Rt=1;
      yield;
    }
    B.Rt=0;B.Lq=B.Rq=[0,0,0,1];yield;
  }
  function* haloThrow(e,pt){B.name='haloThrow';
    const T=part(e,pt);face(T);const c=add(B.head,add(mul(fwd(),.2),[0,-.2,0]));const dir=norm(sub(T,c));
    set(sub(c,mul(right(),.4)),sub(c,mul(dir,.5)));yield* settle(2);
    for(let k=0;k<20;k++){set(null,add(c,mul(dir,.4)));if(len(S._R.v)>=4){B.Rt=1;yield;B.Rt=0;yield;break}yield}
    let k=0;while(S._halo.out&&k++<300)yield;
  }
  // hold taut rope (or lance) across the unicorn for the Eclipse pulse
  function* shield(){B.name='shield';
    let k=0;
    while(k++<120){const bo=bossOf();if(!bo||!bo._atk||bo._atk.k!=3)break;
      face(UNI);const h=B.head;
      if(wp()==1){set([h[0],1.3,h[2]-.2],add([h[0],1.3,h[2]-.2],mul(norm(sub([0,1,-1.8],[h[0],1.3,h[2]-.2])),.5)))}
      else{yield* ensure(0);set([h[0]-.45,1.2,h[2]-.5],[h[0]+.45,1.2,h[2]-.5])}
      yield}
  }
  // block an orb with the taut rope, matched band segment at the crossing
  // point on the orb path where it is intercepted: nearest to the head, but never past the
  // unicorn's 0.9 m damage sphere (the orb is consumed there) — stay ≥ 1.25 m from the unicorn
  const interceptPt=o=>{const d=norm(o.v),th=max(0,segT(o.p,d,B.head));const q=sub(o.p,UNI),b=dot(q,d),c=dot(q,q)-1.25*1.25,disc=b*b-c;let te=1e9;if(disc>=0){const r=-b-sqrt(disc);if(r>0)te=r}return add(o.p,mul(d,min(th,te)))};
  function* block(o){B.name='block';
    let k=0;const tt=dist(o.p,B.head)/6*90+15;
    while(k++<tt&&S._pr.includes(o)){
      const P=interceptPt(o);
      if(wp()==1){const dir=norm(sub(P,B.head));face(P);const L=add(B.head,add(mul(dir,.35),[0,-.1,0]));set(L,add(L,mul(dir,.5)));yield;continue}
      const d=norm(o.v),perp=hperp(d);
      // place the rope across the orb path at the intercept point, matched band at the crossing
      {const dh=sub(P,B.head),l=hypot(dh[0],dh[2]);if(l>.8)B.tH=clampHead(add(B.head,mul([dh[0],0,dh[2]],(l-.6)/l)))}
      face(o.p);const sb=(o.b+.5)/7;
      set(sub(P,mul(perp,sb*.9)),add(P,mul(perp,(1-sb)*.9)));
      yield;
    }
  }
  const segT=(p,d,h)=>dot(sub(h,p),d);
  const round=Math.round;

  // ---------- threat assessment ----------
  const orbThreat=B.orbThreat=()=>S._pr.find(o=>{const d=norm(o.v),t=segT(o.p,d,B.head);if(t<0)return 0;const c=add(o.p,mul(d,t));return dist(c,B.head)<.5&&t/6<1.2});
  const unicornOrb=()=>S._pr.find(o=>{const d=norm(o.v),t=segT(o.p,d,UNI);if(t<0)return 0;const c=add(o.p,mul(d,t));if(dist(c,UNI)>1)return 0;const tp=segT(o.p,d,B.head);const cp=add(o.p,mul(d,max(0,tp)));return dist(cp,B.head)<(wp()==1?2.3:1)&&tp>0});

  // ---------- policies ----------
  const eta=e=>{const t=e._t,d=hypot(e._p[0],e._p[2]+1.8);
    if((t==1||t==3)&&e._st<2&&hypot(e._p[0]-B.head[0],e._p[2]-B.head[2])<1)return max(.1,2-e._flare); // player-blocking: swings at the head in (2-flare) s
    if(t==0)return e._st?2-e._at:d/4.5+2;if(t==1)return max(0,d-1.5)/1.2+(2-e._at);if(t==2)return max(.2,3.5-e._at)*(e._alt?1:.4);if(t==3)return max(0,d-1.2)/.9+max(0,1.5-e._at);const dh=hypot(e._p[0]-B.head[0],e._p[2]-B.head[2]);return e._st==1?.3:e._st==2?1:max(.3,(dh-2.2)/3.5)};
  const work=e=>{const n=e._parts.filter(p=>p._hp>0).length;return e._t==3?n*1.3:e._t==4?n*.4:1};
  const score=e=>eta(e)/(1+work(e)*.3);
  const pickTarget=()=>{let best=null,bs=1e9;for(const e of foes()){const s=score(e);if(s<bs){bs=s;best=e}}return best};
  const preempt=e=>{if(unicornOrb())return 1;if(e._boss>=0)return 0;const b=pickTarget();return b&&b!==e&&score(b)<score(e)*.5};
  const alivePart=e=>e._parts.find(p=>p._hp>0&&!(p._core&&e._parts.some(q=>q._pl&&q._hp>0)))||e._parts.find(p=>p._hp>0);
  const platePart=e=>e._parts.find(p=>p._pl&&p._hp>0);
  const nearestPart=(e,filter)=>{let b=null,bd=1e9;for(const p of e._parts)if(p._hp>0&&(!filter||filter(p))){const d=dist(part(e,p),B.head);if(d<bd){bd=d;b=p}}return b};

  const feasiblePlate=x=>{let best=null,bd=1e9;for(const p of x._parts)if(p._hp>0&&p._pl){const T=part(x,p),rc0=(p._b+.5)/7*2.2;if(gripOk(T,rc0)&&dist(T,B.head)<bd){bd=dist(T,B.head);best=p}}return best};
  function* waveTask(){
    let e=pickTarget();if(!e){stance();yield;return}
    if(!B.noForge){ // perfect bot
      const all=foes();
      const hardPlate=x=>x._parts.find(p=>p._hp>0&&p._pl&&!gripOk(part(x,p),(p._b+.5)/7*2.2));
      const melee=all.filter(x=>x._t!=2&&!failed(x)&&(dist(x._p,B.head)<3.2||hypot(x._p[0],x._p[2])<4));
      const spit=all.filter(x=>x._t==2);
      const urgent=spit.find(x=>!x._alt&&x._at>1.2);
      const wisps=all.some(x=>x._t==0),swarm=all.find(x=>x._t==4);
      const lanceable=x=>x._t==4||x._t==1||(x._t==3&&(feasiblePlate(x)||!x._parts.some(p=>p._pl&&p._hp>0)));
      const wantLance=!!swarm||(!wisps&&melee.some(lanceable));
      const canSwitch=B.t-(B.lastSwitch||-9)>3;
      if(wp()==1&&!wantLance&&canSwitch){yield* ensure(0)}
      else if(wp()==0&&wantLance&&canSwitch&&!urgent){yield* ensure(1)}
      if(wp()==1){
        const cands=melee.filter(lanceable).sort((p,q)=>score(p)-score(q));
        for(const x of cands){let pt;
          if(x._t==3)pt=feasiblePlate(x)||alivePart(x);else if(x._t==4)pt=nearestPart(x,p=>!p._d)||nearestPart(x);else pt=alivePart(x);
          if(pt){yield* lance(x,pt,pt._b);return}}
        stance();yield;return;
      }
      if(wp()==0){
        const x=urgent||e;
        const pt=x._t==3?(nearestPart(x,p=>p._pl)||alivePart(x)):x._t==4?(nearestPart(x,p=>!p._d)||nearestPart(x)):alivePart(x);
        const P=part(x,pt);
        if(!failed(x)&&((x._t==0&&x._st==1)||(x._t!=2&&x._t!=0&&nearestHeadDist(P)<.95))){yield* arc(x,pt,pt._b);return}
        if(x._t==0&&dist(P,B.head)>6){stance();yield;return}
        yield* bow(x,pt,pt._b);return;
      }
      yield;return;
    }
    const t=e._t;
    if(t==3){ // shell: arrows on plates when far; else resonant arc
      const pl=nearestPart(e,p=>p._pl);const pt=pl||alivePart(e);const P=part(e,pt),dh=dist(P,[0,1.6,0]);
      if(dh>2){if(wp()==0){yield* bow(e,pt,pt._b);return}stance();yield;return}
      yield* arc(e,pt,pt._b);return;
    }
    if(t==4){const pt=nearestPart(e,p=>!p._d)||nearestPart(e);yield* bow(e,pt,pt._b);return}
    const pt=alivePart(e);const P=part(e,pt);
    if(wp()!=0){yield;return}
    const canReach=dist(P,[0,1.6,0])<REACH+PLAY_R-.1&&t!=2;
    if(canReach&&(t==0?e._st==1||dist(P,B.head)<1.4:dist(P,B.head)<2.2)){
      yield* arc(e,pt,pt._b);return}
    if(t==0&&dist(P,B.head)>6){stance();yield;return}
    yield* bow(e,pt,pt._b);
  }
  function* bossTask(bo){
    const id=bo._boss,A=bo._atk;
    if(id==0){ // Thunderhead: bow at the eye when open
      const pt=bo._parts[0];
      if(bo._open>0&&!bo._inv){yield* ensure(0);yield* bow(bo,pt,pt._b);return}
      // summons? none. Idle: keep taut in stance
      yield* ensure(0);stance();yield;return;
    }
    if(id==1){ // Gloam: arrows on plates (colour aim), lance on the melee-only core (reach)
      const core=bo._parts[6];
      if(bo._ph==2){yield* gloam2(bo);return}
      const pl=[4,5,0,1,2,3].map(i=>bo._parts[i]).find(p=>p._hp>0);
      if(!pl){yield;return}
      yield* ensure(0);if(wp()!=0){yield;return}
      yield* bow(bo,pl,pl._b);return;
    }
    // Eclipse
    if(A&&A.k==3){yield* shield();return}
    if(bo._ph==1){
      const pt=bo._parts[0];
      if(bo._open>0){yield* ensure(0);if(wp()==0){yield* bow(bo,pt,pt._b);return}}
      const e=pickTarget();if(!e){stance();yield;return}
      const ep=e._t==4?(nearestPart(e,p=>!p._d)||nearestPart(e)):alivePart(e);
      if(e._t==4){yield* ensure(1);if(wp()==1){yield* lance(e,ep,ep._b);return}}
      if(wp()==1&&dist(part(e,ep),B.head)<3){yield* lance(e,ep,ep._b);return}
      yield* ensure(0);yield* bow(e,ep,ep._b);return;
    }
    if(bo._ph==2){
      yield* ensure(3);if(wp()!=3){yield;return}
      const pt=nearestPart(bo);yield* maul(bo,pt);return;
    }
    // phase 3: lance the core between pulses
    yield* ensure(1);if(wp()!=1){yield;return}
    const core=bo._parts[0];const b=core._b;
    yield* lance(bo,core,b<=3?b:2);
  }
  function* mainTask(){
    if(S._ws==0){B.Rt=1;yield;B.Rt=0;yield;return}
    if(S._ws==2||S._ws==3||S._ws==4){if(S._ws==4&&S._wt<=0){B.Rt=1;yield;B.Rt=0;yield;return}stance();yield;return}
    const o=unicornOrb();
    if(o&&(wp()==0&&!S._bow||wp()==1)){yield* block(o);return}
    const bo=bossOf();
    if(bo){yield* bossTask(bo);return}
    yield* waveTask();
  }

  // ---------- per-step drive ----------
  B.step=()=>{
    // threat-driven head control
    const bo=bossOf();let headT=[B.tH[0],B.hy||1.6,B.tH[2]];
    if(bo&&bo._atk){const A=bo._atk;
      if(A.k==0){const d=hd(B.head,A.p);if(d<A.r+.35){if(!B.dodge){let best=null,bd=-1;for(let i=0;i<8;i++){const a=i*PI/4,t=clampHead(add(B.head,[cos(a)*.8,0,sin(a)*.8]));const dd=hd(t,A.p);if(dd>bd){bd=dd;best=t}}B.dodge=best}headT=B.dodge}}
      else{B.dodge=null;if(A.k==1)headT=clampHead([B.head[0],.85,B.head[2]])}
    }else{B.dodge=null;const o=orbThreat();if(o){if(!B.od||B.od.o!==o){const d=norm(o.v);let best=null,bs=-9;for(let i=0;i<8;i++){const a=i*PI/4,t=clampHead(add(B.head,[cos(a)*.75,0,sin(a)*.75]));const tt=segT(o.p,d,t),c=add(o.p,mul(d,tt));const s=min(.6,dist(c,t))-.15*dist(t,B.head);if(s>bs){bs=s;best=t}}B.od={o,t:best}}headT=B.od.t}else B.od=null}
    if(!B.idle){
      if(B.pause>0){B.pause--}else{if(!B.task)B.task=mainTask();const r=B.task.next();if(r.done){B.task=null;B.pause=THINK}}
    }
    // move head & hands with speed limits
    const mv=(p,t,s)=>{const d=sub(t,p),l=len(d),m=s*DT;return l<=m?[...t]:add(p,mul(d,m/l))};
    B.headT=headT;
    if(!B.idle){B.head=mv(B.head,headT,HEAD_SPD);
      // keep hands within reach of the head
      const lim=t=>{const d=sub(t,B.head),l=len(d);return l>REACH?add(B.head,mul(d,REACH/l)):t};
      B.L=mv(B.L,lim(B.tL),HAND_SPD);B.R=mv(B.R,lim(B.tR),HAND_SPD);}
    const frame={L:{p:[...B.L],q:[...B.Lq],t:B.Lt,g:B.Lg},R:{p:[...B.R],q:[...B.Rq],t:B.Rt,g:B.Rg},H:{p:[...B.head],q:headQ(B.yaw)}};
    if(B.rec)B.frames.push(frame);
    S.inject(frame.L,frame.R,frame.H);
    // velocity tracking
    for(const e of S._en){const p=e._p,q=B.prev.get(e);if(q)B.vel.set(e,mul(sub(p,q),1/DT));B.prev.set(e,[...p])}
    S.step();B.t+=DT;
  };
  const hd=(a,b)=>hypot(a[0]-b[0],a[2]-b[2]);
  return B;
}

// Run a full game with a bot; returns {waves:[[wave,time]], light, reached, t, events counts, bossPhases}
export function runGame(S,bot,opts={}){
  const maxT=opts.maxT||900,stopWave=opts.stopWave||99;const counts={},phases=[];let minLight=5;
  while(S._t<maxT){
    bot.step();
    for(const e of S.drain()){counts[e.k]=(counts[e.k]||0)+1;if(e.k=='phase'||e.k=='boss'||e.k=='bossdead'||e.k=='eye'){const bo=S._en.find(x=>x._boss>=0);phases.push([+S._t.toFixed(1),e.k,e.d,bo?bo._boss:-1])}if(e.k=='light')minLight=min(minLight,e.d)}
    if(S._ws==3)break;
    if(S._ws==4&&!opts.endless)break;
    if(S._wave>=stopWave&&S._ws==2)break;
    if(opts.until&&opts.until(S))break;
  }
  return {waves:S._log.map(x=>[x[0],+x[1].toFixed(1)]),light:S._light,minLight,reached:S._wave,t:+S._t.toFixed(1),counts,phases,ws:S._ws};
}
