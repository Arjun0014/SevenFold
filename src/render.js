// render.js — Three.js scene: arena, unicorn, instanced enemies, rainbow forms, bosses, effects, text.
// Reads sim state each frame; never changes it.
import {sin,cos,PI,min,max,floor,hypot,atan2,add,sub,mul,norm,cross,len} from './vec.js';
import {N,WN} from './sim.js';

export const COLS=[0xff3b4a,0xff8a2b,0xffe14a,0x3ee07a,0x3aa3ff,0x6a5cff,0xd054ff];
export const rdM={text:''};              // named objects (weapons, bosses, pools)
let rdT,rdScene,rdCam,rdWorld,rdFog,rdRope,rdGlow,rdPts,rdPP,rdPC,rdLife=[],rdVel=[],rdCtx,rdTex,rdDawn=-1,rdFlash=0,rdDes=0,rdLine,rdBolt=0,rdBar=0,rdCue=0,rdCueT=0,rdRing,rdCrack=0,rdCol=[],rdTmp;
const rdC=c=>new rdT.Color(c);
const mesh=(g,m,par,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const o=new rdT.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);(par||rdWorld).add(o);return o};
const lam=(c,o=1,e=0)=>new rdT.MeshLambertMaterial({color:c,emissive:e,transparent:o<1,opacity:o});
const bas=(c,o=1,ad=0)=>new rdT.MeshBasicMaterial({color:c,transparent:o<1||!!ad,opacity:o,blending:ad?rdT.AdditiveBlending:rdT.NormalBlending,depthWrite:!ad});
// merge [geo,x,y,z,sx,sy,sz,rx,ry,rz] into one non-indexed geometry (no addons)
const merge=L=>{const P=[],Nn=[],m=new rdT.Matrix4,e=new rdT.Euler,q=new rdT.Quaternion,v=new rdT.Vector3,s=new rdT.Vector3;
  for(const[g,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0]of L){const G=g.index?g.toNonIndexed():g;m.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz));G.applyMatrix4(m);P.push(...G.attributes.position.array);Nn.push(...G.attributes.normal.array)}
  const out=new rdT.BufferGeometry;out.setAttribute('position',new rdT.Float32BufferAttribute(P,3));out.setAttribute('normal',new rdT.Float32BufferAttribute(Nn,3));return out};
const withS=(g,f)=>{const p=g.attributes.position,u=g.attributes.uv;for(let i=0;i<p.count;i++)u.setX(i,f(p.getX(i),p.getY(i),p.getZ(i)));return g};
const rbMat=(w,a,ad)=>new rdT.ShaderMaterial({uniforms:{w:{value:w},a:{value:a},d:{value:0},c:{value:COLS.map(rdC)}},
  vertexShader:'varying float v;uniform float w;void main(){v=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*w,1.);}',
  fragmentShader:'uniform vec3 c[7];uniform float a,d;varying float v;void main(){float b=v*7.,f=fract(b);vec3 k=c[int(min(b,6.))]*(.6+.4*min(1.,min(f,1.-f)*12.));gl_FragColor=vec4(mix(k,vec3(.95),d),a);}',
  transparent:a<1||!!ad,blending:ad?rdT.AdditiveBlending:rdT.NormalBlending,depthWrite:!ad,side:rdT.DoubleSide});
const inst=(g,m,n,par)=>{const o=new rdT.InstancedMesh(g,m,n);o.count=n;(par||rdWorld).add(o);o.frustumCulled=false;for(let i=0;i<n;i++)o.setColorAt(i,rdC(0x2c3a70));rdTmp.makeScale(0,0,0);for(let i=0;i<n;i++)o.setMatrixAt(i,rdTmp);return o};
let rdV,rdQ,rdS,rdUp;
const place=(o,i,p,yaw,s,c)=>{rdTmp.compose(rdV.set(p[0],p[1],p[2]),rdQ.setFromAxisAngle(rdUp,yaw||0),s.length?rdS.set(...s):rdS.set(s,s,s));o.setMatrixAt(i,rdTmp);if(c!=null)o.setColorAt(i,rdCol[c])};
const flush=o=>{o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true};
const bp=(e,pt)=>{const o=pt._o;return e._boss>=0?add(e._p,add(mul(e._rt,o[0]),add([0,o[1],0],mul(e._fw,o[2])))):add(e._p,o)};
const rdSetText=(a,b)=>{const k=a+'\n'+(b||'');if(k==rdM.text)return;rdM.text=k;const c=rdCtx;c.clearRect(0,0,1024,256);c.fillStyle='#fff';c.textAlign='center';
  c.font='bold 110px sans-serif';c.fillText(a,512,b?120:160);c.font='48px sans-serif';if(b)c.fillText(b,512,215);rdTex.needsUpdate=true};
let burst=()=>{}; // particles are build-optional (node build.js --particles); no-op otherwise
burst=(p,b,n,sp,up=0)=>{for(let k=0;k<n;k++){const i=rdLife.findIndex(l=>l<=0);if(i<0)return;rdLife[i]=.5+Math.random()*.5;rdPP[i*3]=p[0];rdPP[i*3+1]=p[1];rdPP[i*3+2]=p[2];rdVel[i]=[(Math.random()-.5)*sp,(Math.random()-.5)*sp+up,(Math.random()-.5)*sp];const c=rdCol[b];rdPC[i*3]=c.r;rdPC[i*3+1]=c.g;rdPC[i*3+2]=c.b}}; //@particles
const ring=(p,b)=>{const r=rdRing;r.life=.3;r.position.set(p[0],p[1],p[2]);r.material.color.copy(rdCol[b]);r.visible=true};

export function rdInit(T,R){
  rdT=T;rdTmp=new T.Matrix4;rdV=new T.Vector3;rdQ=new T.Quaternion;rdS=new T.Vector3;rdUp=new T.Vector3(0,1,0);rdCol=COLS.map(rdC);
  rdScene=new T.Scene;rdWorld=new T.Group;rdScene.add(rdWorld);
  rdFog=rdScene.fog=new T.Fog(0x101830,8,45);rdScene.background=rdC(0x101830);
  rdCam=new T.PerspectiveCamera(90,innerWidth/innerHeight,.05,300);rdCam.position.set(0,1.6,0);rdCam.rotation.order='YXZ';rdCam.rotation.y=PI;
  rdScene.add(new T.AmbientLight(0x6878b0,1.6));const dl=new T.DirectionalLight(0xb0c0ff,2);dl.position.set(30,60,100);rdScene.add(dl);
  const G=T,sph=(r,a=10,b=7)=>new G.SphereGeometry(r,a,b),box=(x,y,z)=>new G.BoxGeometry(x,y,z),cyl=(a,b,h,s=8)=>new G.CylinderGeometry(a,b,h,s),rg=(a,b,s=32)=>new G.RingGeometry(a,b,s);
  const stone=lam(0x2a3048,1,0x0a0c18);
  // ---- arena: altar, rune rings, ruins, cloud-sea, sky, moon, dust
  mesh(cyl(3,3.2,.3,32),stone,0,0,-.15);
  rdM._runes=inst(rg(1,1.04,48),bas(0xffffff),7);rdM._runes.rotation.x=-PI/2;rdM._runes.position.y=.006;
  const ruins=[];for(let i=0;i<10;i++){const a=i*.628+.3,r=4.6+i%3,x=sin(a)*r,z=cos(a)*r,h=1.5+i*7%5;
    ruins.push([cyl(.22,.3,h,6),x,h/2-.3,z,1,1,1,0,0,i%2*.15]);if(i%3==0)ruins.push([box(.5,4,.5),x+.9,1.7,z],[box(.5,4,.5),x-.9,1.7,z],[box(2.4,.5,.5),x,3.9,z])}
  mesh(merge(ruins),stone);
  const sea=new G.PlaneGeometry(140,140,36,36);{const p=sea.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,sin(p.getX(i)*.6)*sin(p.getY(i)*.45)*.5)}sea.computeVertexNormals();
  mesh(sea,lam(0x141a30,1,0x060812),0,0,-.5,0).rotation.x=-PI/2;
  rdM._moon=mesh(sph(40,24,16),new G.MeshLambertMaterial({color:0x5a5c6e,fog:false}),0,70,80,120);
  // ---- unicorn (primitives), horn light, motes
  const um=lam(0xe8eeff,.75,0x506080),U=rdM._uni=new G.Group;U.position.set(0,0,-1.8);U.rotation.y=-PI*.5;rdWorld.add(U);
  const parts=[[box(1.2,.5,.42),0,1,0],[box(.3,.6,.3),.55,1.35,0,1,1,1,0,0,-.5],[box(.42,.24,.26),.8,1.62,0],[box(.22,.16,.2),1.05,1.58,0],[new G.ConeGeometry(.08,.6,6),-.68,.95,0,1,1,1,0,0,1.9]];
  for(const x of[-.42,.42])for(const z of[-.13,.13])parts.push([cyl(.06,.05,.75,6),x,.4,z]);
  for(let i=0;i<4;i++)parts.push([cyl(.04,.02,.3,5),.42+i*.12,1.5+i*.08,0,1,1,1,0,0,.7]);
  mesh(merge(parts),um,U);mesh(new G.ConeGeometry(.04,.4,6),bas(0xffffff),U,.85,1.9,0).rotation.z=-.5;
  rdM._horn=new G.PointLight(0xffffff,4,8,1.5);rdM._horn.position.set(.85,1.9,0);U.add(rdM._horn);
  rdM._motes=inst(sph(.06,6,4),bas(0xffffff,1,1),5,U);
  // ---- rainbow rope: tube rebuilt each frame, one geometry, core + glow copy
  rdM._rb=rbMat(0,1);rdM._rbg=rbMat(.035,.25,1);rdRope=mesh(sph(.01),rdM._rb);rdGlow=mesh(sph(.01),rdM._rbg);rdRope.frustumCulled=rdGlow.frustumCulled=false;
  rdM._hL=mesh(sph(.04,8,6),bas(0xffffff,.7));rdM._hR=mesh(sph(.04,8,6),bas(0xffffff,.7));
  // ---- forged weapons (share the rainbow material)
  const wg=g=>{g.rotateX(PI/2);return g};
  rdM.lance=mesh(withS(wg(cyl(.012,.03,2.2,6)),(x,y,z)=>(z+1.1)/2.2),rdM._rb);
  rdM.halo=mesh(withS(new G.TorusGeometry(.25,.03,6,24),(x,y)=>atan2(y,x)/(2*PI)+.5),rdM._rb);
  rdM.maul=new G.Group;rdWorld.add(rdM.maul);mesh(withS(wg(cyl(.02,.02,1.1,6)),(x,y,z)=>(z+.55)/1.1),rdM._rb,rdM.maul,0,0,.55);rdM._maulH=mesh(cyl(.17,.17,.3,6),bas(0xff3b4a),rdM.maul,0,0,1);rdM._maulH.rotation.z=PI/2;
  rdM.shards=new G.Group;rdWorld.add(rdM.shards);rdM._sh=[0,1].map(i=>mesh(withS(box(.05,.015,.45),(x,y,z)=>i*.5+(z+.225)/.45*.5),rdM._rb,rdM.shards));
  rdM.prism=new G.Group;rdWorld.add(rdM.prism);mesh(withS(new G.OctahedronGeometry(.12),(x,y)=>(y+.12)/.24),rdM._rb,rdM.prism);rdM._beam=mesh(wg(cyl(.05,.05,12,6)),bas(0xffffff,.6,1),rdM.prism,0,0,6);
  // ---- enemies: instanced bodies + cores; shell plates pool (also Gloam plates & Eclipse tentacles)
  const em=lam(0x505870,1,0x181c30),cm=bas(0xffffff);
  rdM._eb=inst(sph(1,10,7),em,52);rdM._ec=inst(sph(.1,12,8),cm,52);rdM._sw=inst(sph(.1,6,4),cm,40);
  rdM._plates=inst(cyl(.2,.2,.1,6),bas(0xffffff),48);
  // ---- bosses
  const th=rdM._th=new G.Group;rdWorld.add(th);th.visible=false;const cl=[];for(let i=0;i<12;i++)cl.push([sph(1.4+i*7%5*.3,10,7),sin(i*2.4)*3.2,cos(i*1.7)*1.6+1.5,cos(i*3.1)*2-1.5]);mesh(merge(cl),em,th);rdM._eye=mesh(sph(.8,16,12),bas(0x14141c),th);
  const gl=rdM._gl=new G.Group;rdWorld.add(gl);gl.visible=false;mesh(merge([[box(1.2,2.4,.8),0,1.6,0],[box(.5,.6,.5),0,3.3,0],[box(.6,.5,.6),-.9,2.8,0],[box(.6,.5,.6),.9,2.8,0],[box(.35,1.6,.35),-1.2,2,0],[box(.35,1.6,.35),1.2,2,0]]),em,gl);
  rdM._gcore=mesh(sph(.5,12,8),bas(0xff3b4a),gl,0,1.5,0);rdM._gcore.visible=false;
  const ec=rdM._ecl=new G.Group;rdWorld.add(ec);ec.visible=false;mesh(wg(cyl(10,10,.6,32)),em,ec); //@eclipse
  rdM._mouth=[1,2,3].map(r=>mesh(rg(r-.15,r+.15,24),bas(0x14141c),ec,0,0,.4));rdM._ecore=mesh(sph(.6,12,8),bas(0xff3b4a));rdM._ecore.visible=false; //@eclipse
  // ---- effects: particles, rings, crack flash, cue ring, lightning, sweep bar, forge trail, text
  rdPP=new Float32Array(600*3).fill(-99);rdPC=new Float32Array(600*3);rdLife=new Array(600).fill(0);const pg=new G.BufferGeometry;pg.setAttribute('position',new G.BufferAttribute(rdPP,3));pg.setAttribute('color',new G.BufferAttribute(rdPC,3)); //@particles
  rdPts=new G.Points(pg,new G.PointsMaterial({size:.03,vertexColors:true,transparent:true,blending:G.AdditiveBlending,depthWrite:false}));rdPts.frustumCulled=false;rdWorld.add(rdPts); //@particles
  rdRing=mesh(rg(.85,1,24),bas(0xffffff,.8,1));rdRing.life=0;rdRing.visible=false;
  rdM._crack=mesh(sph(.1,8,6),bas(0xffffff,.9,1));rdM._crack.visible=false;
  rdM._cue=mesh(rg(.45,.55),bas(0xffe14a,.9,1));rdM._cue.rotation.x=-PI/2;rdM._cue.visible=false;
  rdLine=mesh(cyl(.25,.5,14,6),bas(0xeaf4ff,.8,1),0,0,7,0);rdLine.visible=false;
  rdM._bar=mesh(box(6.4,.08,.08),bas(0xbfe3ff,.9,1));rdM._bar.visible=false;
  const cv=document.createElement('canvas');cv.width=1024;cv.height=256;rdCtx=cv.getContext('2d');rdTex=new G.CanvasTexture(cv);
  rdM._tp=mesh(new G.PlaneGeometry(3,.75),new G.MeshBasicMaterial({map:rdTex,transparent:true,fog:false}),0,0,1.7,3);rdM._tp.rotation.y=PI;
  rdSetText('SEVENFOLD','Guard the unicorn behind you. Pull a trigger.');
  return{scene:rdScene,cam:rdCam,world:rdWorld};
}
export const rdWeapons=()=>['lance','halo','maul','shards','prism'].filter(k=>rdM[k].visible); // unmangled keys: looked up by name
const rdHints={1:'Swing the rainbow at the lights.',5:'Hold both grips, stretch: Lance.',6:'Grips: raise, slam: Maul.',7:'Grips: circle: Halo.'};
rdHints[9]='Grips: cross, pull apart: Shards.';rdHints[10]='Grips: wring: Prism.'; //@eclipse
const rdBoss=['THUNDERHEAD','GLOAM','ECLIPSE'];
const setP=(o,p)=>o.position.set(p[0],p[1],p[2]);
const aimZ=(o,d)=>o.quaternion.setFromUnitVectors(rdS.set(0,0,1),rdV.set(d[0],d[1],d[2]).normalize());

export function rdSync(S,ev,dt,mute){
  const T=rdT,L=S._L.p,R=S._R.p,boss=S._en.find(e=>e._boss>=0);
  // ---- events → effects / text
  for(const e of ev){const k=e.k,p=e.p;
    if(k=='hit'||k=='res'){if(p){burst(p,e.b,k=='res'?14:6,3);if(k=='res')ring(p,e.b)}}
    else if(k=='kill'||k=='plate'){burst(p,e.b,k=='kill'?24:16,2.5,1.5)}
    else if(k=='crack'){setP(rdM._crack,p);rdM._crack.visible=true;rdCrack=.08}
    else if(k=='forged'){burst(S._rp[N>>1],e.d,40,3)}
    else if(k=='light'){rdFlash=.2}
    else if(k=='wave'){rdSetText('Wave '+e.d,rdHints[e.d]||'')}
    else if(k=='boss'){rdSetText(rdBoss[e.d],'')}
    else if(k=='clear'||k=='start'||k=='restart'||k=='endless'){rdSetText('','');if(k!='clear')rdDawn=-1}
    else if(k=='over'){rdSetText('The Light is gone','Wave '+S._wave+' · Score '+S._score+' · Trigger to retry')}
    else if(k=='dawn'){rdDawn=0;rdSetText('Dawn','Score '+S._score+'  ·  '+(S._t|0)+' s  ·  Trigger for endless night')}
    else if(k=='cue'){if(e.b==1){rdBar=e.d;rdM._bar.position.y=p[1];rdM._bar.visible=true}else{rdCue=rdCueT=e.d;setP(rdM._cue,[p[0],.01,p[2]]);if(e.b==3)setP(rdM._cue,[0,.01,-1.8]);rdM._cue.visible=true}}
    else if(k=='strike'){if(boss&&boss._boss==0){rdBolt=.3;setP(rdLine,[p[0],7,p[2]]);rdLine.visible=true}else{setP(rdM._crack,[p[0],.3,p[2]]);rdM._crack.scale.setScalar(3);rdM._crack.visible=true;rdCrack=.3}}
    else if(k=='pulse'){rdFlash=.3}
    else if(k=='absorb'){ring(p,e.b);burst(p,e.b,12,2)}
    else if(k=='block'||k=='clank'){burst(p,e.b,5,2)}
  }
  // ---- forge feedback: the rope turns white, fog darkens (slow-mo is in the sim)
  rdDes+=((S._fg.on?1:0)-rdDes)*min(1,dt*8);rdM._rb.uniforms.d.value=rdM._rbg.uniforms.d.value=rdDes;
  // ---- fog / flashes / dawn
  const fc=rdFlash>0?0:rdDes>.5?0x030408:S._dark?0x02030a:0x101830;rdFog.color.lerp(rdC(fc),min(1,dt*6));rdScene.background.copy(rdFog.color);
  rdFog.far+=((S._dark?4.5:rdDawn>=0?80:45)-rdFog.far)*min(1,dt*(rdDawn>=0?.3:3));if(rdFlash>0)rdFlash-=dt;
  if(rdDawn>=0){rdDawn+=dt;rdFog.color.lerp(rdC(0x2a1a2e),dt*.2)}
  // ---- unicorn: breathing, head bob, horn light, motes
  const U=rdM._uni,b=1+.02*sin(S._t*1.2);U.scale.set(b,b,b);U.position.y=S._light<2?-.15:0;rdM._horn.intensity=.6+S._light*.6;
  for(let i=0;i<5;i++){const a=S._t*1.5+i*1.257;place(rdM._motes,i,[.85+cos(a)*.35,1.95+sin(a*1.3)*.12,sin(a)*.35],0,i<S._light?1:0,6-i)}flush(rdM._motes);
  for(let i=0;i<7;i++)place(rdM._runes,i,[0,0,0],0,.6+i*.35,i<S._ring?i:null);if(S._ring==0)for(let i=0;i<7;i++)rdM._runes.setColorAt(i,rdC(0x2c3a70));flush(rdM._runes);
  // ---- rope tube
  rdRope.visible=rdGlow.visible=!S._wp||S._fg.on;
  if(rdRope.visible){rdRope.geometry.dispose();rdRope.geometry=rdGlow.geometry=new T.TubeGeometry(new T.CatmullRomCurve3(S._rp.map(p=>new T.Vector3(...p))),N,.02,6)}
  setP(rdM._hL,L);setP(rdM._hR,R);
  // ---- forged weapons
  const wp=S._fg.on?0:S._wp,dir=norm(sub(R,L)),mid=[(L[0]+R[0])/2,(L[1]+R[1])/2,(L[2]+R[2])/2];
  rdM.lance.visible=wp==1;rdM.halo.visible=wp==2;rdM.maul.visible=wp==3;rdM.shards.visible=wp==4;rdM.prism.visible=wp==5;
  if(wp==1){setP(rdM.lance,add(L,mul(dir,1.1)));aimZ(rdM.lance,dir)}
  if(wp==2){const H=S._halo;setP(rdM.halo,H.out?H.p:R);rdM.halo.rotation.set(H.out?PI/2:0,0,S._t*(H.out?20:2))}
  if(wp==3){setP(rdM.maul,L);aimZ(rdM.maul,dir);rdM._maulH.material.color.copy(rdCol[S._mb||0])}
  if(wp==4){[L,R].forEach((h,i)=>{const o=rdM._sh[i],t=S._sh[i],H=i?S._R:S._L;if(t){setP(o,t.p);o.rotation.set(0,S._t*25,0)}else{setP(o,h);o.quaternion.set(H.q[0],H.q[1],H.q[2],H.q[3]);o.rotateY(PI);o.translateZ(.225)}})}
  if(wp==5){setP(rdM.prism,mid);rdM.prism.rotation.y=S._t;const B=S._beam;rdM._beam.visible=!!B;if(B){rdM._beam.parent.rotation.set(0,0,0);aimZ(rdM.prism,sub(B[1],B[0]));rdM._beam.material.color.copy(rdCol[B[2]])}}
  // ---- enemies
  const eb=rdM._eb,ec=rdM._ec,sw=rdM._sw,bs=[[.2,.28,.2],[.3,1,.2],[.6,.35,.6],[.45,.3,.45]],by=[0,1,.35,.5],cy=[0,1.3,.55,.6],cz=[.12,.16,.5,0],cs=[1.2,1.4,1.8,2];let n=0,ns=0,pl=0;
  for(const e of S._en){if(e._hp<=0)continue;
    if(e._boss>=0){const g=[rdM._th,rdM._gl,rdM._ecl][e._boss];g.visible=true;setP(g,e._p);g.rotation.y=atan2(e._fw[0],e._fw[2]);
      if(e._boss==0){rdM._eye.material.color.copy(e._open>0?rdCol[e._parts[0]._b]:rdC(0x14141c))}
      if(e._boss==1){for(let i=0;i<6;i++){const q=e._parts[i];place(rdM._plates,pl++,bp(e,q),g.rotation.y,q._hp>0?1.4:0,q._b)}rdM._gcore.visible=e._ph==2;rdM._gcore.material.color.copy(rdCol[e._parts[6]._b])}
      if(e._boss==2){const op=e._ph==1&&e._open>0;for(const m of rdM._mouth)m.material.color.copy(op?rdCol[e._parts[0]._b]:rdC(0x14141c));rdM._ecore.visible=e._ph==3;if(e._ph==3){setP(rdM._ecore,e._p);rdM._ecore.material.color.copy(rdCol[e._parts[0]._b])}} //@eclipse
      continue}
    const t=e._t,yaw=atan2(-e._p[0],-1.8-e._p[2]),gp=[e._p[0],t?0:e._p[1],e._p[2]];
    if(t==4){for(const q of e._parts)if(ns<40)place(sw,ns++,bp(e,q),0,q._hp>0?1:0,q._b);continue}
    if(n>=52)continue;const f=e._flare>0?1.1:1;place(eb,n,[gp[0],gp[1]+by[t],gp[2]],yaw,bs[t].map(x=>x*f),e._b);place(ec,n++,add(gp,[sin(yaw)*cz[t],cy[t],cos(yaw)*cz[t]]),0,cs[t]*f,e._b);
    if(t==3)for(const q of e._parts)if(q._pl)place(rdM._plates,pl++,add(gp,[q._o[0],.62,q._o[2]]),0,q._hp>0?1:0,q._b);
  }
  for(;n<52;n++){place(eb,n,[0,-9,0],0,0);place(ec,n,[0,-9,0],0,0)}for(;ns<40;ns++)place(sw,ns,[0,-9,0],0,0);flush(eb);flush(ec);flush(sw);
  for(;pl<48;pl++)place(rdM._plates,pl,[0,-9,0],0,0);flush(rdM._plates);
  if(!boss||boss._boss!=0)rdM._th.visible=false;if(!boss||boss._boss!=1){rdM._gl.visible=false;rdM._gcore.visible=false}
  if(!boss||boss._boss!=2){rdM._ecl.visible=false;rdM._ecore.visible=false} //@eclipse
  // ---- boss cues: lightning bolt, sweep bar, cue ring
  if(rdBolt>0){rdBolt-=dt;rdLine.material.opacity=rdBolt*3;rdLine.scale.x=rdLine.scale.z=.6+Math.random()*.8}else rdLine.visible=false;
  if(rdBar>0){rdBar-=dt;rdM._bar.material.opacity=.3+.7*(1-rdBar/1.3)}else rdM._bar.visible=false;
  if(rdCue>0){rdCue-=dt;rdM._cue.material.opacity=1-rdCue/rdCueT}else rdM._cue.visible=false;
  if(rdCrack>0){rdCrack-=dt;if(rdCrack<=0){rdM._crack.visible=false;rdM._crack.scale.setScalar(1)}}
  {const r=rdRing;if(r.life>0){r.life-=dt;const s=(1-r.life/.3)*1.2+.05;r.scale.set(s,s,s);r.material.opacity=r.life/.3;r.lookAt(rdCam.position);r.visible=r.life>0}}
  // ---- particles (build-optional)
  for(let i=0;i<600;i++){if(rdLife[i]>0){rdLife[i]-=dt;const v=rdVel[i];v[1]-=2*dt;rdPP[i*3]+=v[0]*dt;rdPP[i*3+1]+=v[1]*dt;rdPP[i*3+2]+=v[2]*dt;if(rdLife[i]<=0)rdPP[i*3+1]=-99}} //@particles
  rdPts.geometry.attributes.position.needsUpdate=true;rdPts.geometry.attributes.color.needsUpdate=true; //@particles
  rdM._tp.visible=!!rdM.text.replace('\n','');
}
