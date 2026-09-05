// bot.js — scripted players for the sim (docs/07 A6). The bot is the headset: it reads sim state and drives
// the same inject(L,R,H) API as the XR input, with a human-ish body: head turns ≤ 4 rad/s and moves ≤ 2 m/s inside a
// 1 m circle, hands move ≤ 5 m/s. Policies: face the nearest threat; hold the arch (both triggers) when a unicorn is
// about to gore or a charge is incoming; otherwise wind up and throw the boomerang aimed so the matching colour band
// meets the target; clap for a Nova when charged and crowded; sidestep the boss's lightning rune.
import {createSim,DT,N,hd} from '../src/sim.js';
import {sin,cos,PI,atan2,hypot,add,sub,mul,norm,len,dist,lerp,clamp,qyaw} from '../src/vec.js';

const VT4=[.75,0,1,1.2,1]; // rear times by variant (mirror of sim VT[v][4])
export function makeBot(S,o={}){
  const b={yaw:0,hp:[0,0],L:[-.3,1.2,.45],R:[.3,1.2,.45],lt:0,rt:0,act:0,t:0,rec:o.rec?[]:0,idle:o.idle,noBlock:o.noBlock,thrown:0};
  const toA=p=>[b.hp[0]-cos(b.yaw)*p[0]+sin(b.yaw)*p[2],1.6+p[1],b.hp[1]+sin(b.yaw)*p[0]+cos(b.yaw)*p[2]];
  const right=()=>[-cos(b.yaw),0,sin(b.yaw)];
  const moveTo=(h,tgt,sp)=>{const d=sub(tgt,h),l=len(d),m=sp*DT;return l<=m?tgt:add(h,mul(d,m/l))};
  const alive=()=>S._en.filter(e=>e._st!=5);
  const yawTo=p=>atan2(p[0]-b.hp[0],p[2]-b.hp[1]);
  const turn=y=>{let d=y-b.yaw;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;b.yaw+=clamp(d,-4*DT,4*DT);return Math.abs(d)<.25};
  b.step=()=>{
    let L=b.L,R=b.R,lt=0,rt=0,hs=5;const H=[b.hp[0],1.6,b.hp[1]];
    if(S._ws==0||S._ws>=3){lt=S._t%1<DT*2?1:0} // pull a trigger on the title / retry screens
    else if(!b.idle){{
        const en=alive(),dd=e=>dist(e._p,H);
        // threats
        const rearing=en.find(e=>!e._boss&&e._st==1&&dd(e)<2.3),goring=rearing&&rearing._tm>VT4[rearing._v]-.4?rearing:0;
        const charger=en.find(e=>e._v==1&&e._st==0&&dd(e)<12),chargerNear=charger&&dd(charger)<3.5?charger:0,closing=en.find(e=>!e._boss&&e._st==0&&dd(e)<3.5);
        const boss=en.find(e=>e._boss),bossCharge=boss&&(boss._st==9||boss._st==8&&boss._tm>.5)&&dd(boss)<12;
        const urgent=goring||chargerNear||(bossCharge?boss:0),danger=rearing||charger||closing||boss&&(boss._st==8||boss._st==7&&boss._tm>(boss._v==4?2.2:3.2));
        // lightning dodge: head away from the rune
        let hpT=[0,0];if(boss&&boss._st==10&&boss._cue){const c=boss._cue,d=sub([b.hp[0],0,b.hp[1]],c);const dir=len(d)<.05?[1,0,0]:norm(d);hpT=[clamp(c[0]+dir[0]*1.1,-1,1),clamp(c[2]+dir[2]*1.1,-1,1)]}
        b.hp=[b.hp[0]+clamp(hpT[0]-b.hp[0],-2*DT,2*DT),b.hp[1]+clamp(hpT[1]-b.hp[1],-2*DT,2*DT)];
        const nearN=en.filter(e=>dd(e)<6).length;
        const pri=e=>dd(e)<3?dd(e)-20:e._boss&&e._st==3?-9:dd(e),target=[...en].sort((x,y)=>pri(x)-pri(y))[0];
        const rest=()=>{L=toA([-.3,-.35,.4]);R=toA([.3,-.35,.4])};
        if(S._md==3||S._md==2){b.act=0;lt=rt=1;rest()} // wait for the boomerang (arch re-forms on catch)
        else if(urgent&&!b.noBlock){b.act=0;turn(yawTo(urgent._p));lt=rt=1;L=toA([-.3,-.4,.5]);R=toA([.3,-.4,.5])} // BLOCK
        else if(S._ch>=3&&(nearN>=3||boss&&dd(boss)<6&&S._nv<=0)&&S._md!=4){ // NOVA: clap
          if(!b.act||b.act.k!='nova')b.act={k:'nova',t:0};b.act.t+=DT;lt=rt=1;const d=b.act.t<.12?.5:Math.max(.05,.5-(b.act.t-.12)*4.5);L=toA([-d/2,-.35,.4]);R=toA([d/2,-.35,.4]);if(b.act.t>.5)b.act=0}
        else if(target&&S._md!=4){
          const E=[target._p[0],.8*target._sc,target._p[2]],far=dd(target),ok=turn(yawTo(target._p));
          if(b.act&&b.act.k=='swing'){const a=b.act;a.t+=DT;lt=rt=1;const x=a.dir*(.5-a.t*5),y=E[1]-1.7;L=toA([x-.3,y,.55]);R=toA([x+.3,y,.55]);hs=9;if(a.t>.2)b.act=0}
          else if(b.act&&b.act.k=='throw'&&(urgent||boss&&boss._st==8||danger&&b.act.t<.14)){b.act=0;lt=rt=1;rest()} // abort: keep the arch
          else if(b.act&&b.act.k=='throw'){const a=b.act;a.t+=DT;lt=rt=1;
            if(a.t<.14){L=toA([-.3,-.35,.15]);R=toA([.3,-.35,.15])} // wind-up
            else{if(!a.d){const bb=target._b<S._light?target._b:3,s=(bb+.5)/7,off=(s-.5)*.6,c=lerp(S._L.p,S._R.p,.5),aim=sub(sub(E,mul(right(),off)),[0,sin(s*PI)*.3,0]);a.d=norm(sub(aim,c))}
              L=add(S._L.p,mul(a.d,5*DT));R=add(S._R.p,mul(a.d,5*DT));hs=9;
              if(a.t>.14+.2){lt=rt=0;b.act=0;b.thrown++}}}
          else if(ok&&far<2.1&&(b.sw|0)<6){b.act={k:'swing',t:0,dir:b.sd=-(b.sd||1)};b.sw=(b.sw|0)+1;lt=rt=1;L=toA([.2,E[1]-1.7,.55]);R=toA([.8,E[1]-1.7,.55])} // SWING the arch through it (six tries, then throw)
          else if(ok&&far<9.5&&(!danger||far<2.1)){b.act={k:'throw',t:0,d:0};b.sw=0}
          else{lt=rt=danger?1:0;rest()}
        }else{rest();if(target)turn(yawTo(target._p))}

      }
    }
    b.L=moveTo(b.L,L,hs);b.R=moveTo(b.R,R,hs);
    const q=qyaw(b.yaw+PI),Hq=[q[0],q[1],q[2],q[3]],Hp=[b.hp[0],1.6,b.hp[1]];
    const fr=[b.L,Hq,lt,0,b.R,Hq,rt,0,Hp,Hq];if(b.rec)b.rec.push(o.exact?fr.map(x=>Array.isArray(x)?[...x]:x):fr.map(x=>Array.isArray(x)?x.map(v=>+v.toFixed(4)):x));
    S.inject({p:b.L,q:Hq,t:lt,g:0},{p:b.R,q:Hq,t:rt,g:0},{p:Hp,q:Hq});S.step();b.lt=lt;b.rt=rt;
  };
  return b;
}
// run a full game; returns {done, wave, light, waves:[[wave,secs]], t, events count by kind, rec}
export function runBot(seed,o={}){
  const S=createSim(seed),b=makeBot(S,o),maxT=o.maxT||900,ev={};let t=0,hurt=[];
  while(t<maxT){b.step();t+=DT;for(const e of S.drain()){ev[e.k]=(ev[e.k]||0)+1;if(e.k=='hurt')hurt.push([S._wave,+S._wtime.toFixed(1)])}
    if(S._ws>=3)break;if(o.stopWave&&S._wave>o.stopWave)break}
  return{done:S._ws==4,over:S._ws==3,wave:S._wave,light:S._light,waves:S._log,t:+t.toFixed(1),ev,hurt,score:S._score,thrown:b.thrown,rec:b.rec,S};
}
