// render.js — Three.js scene: arena, unicorn, instanced enemies, rainbow forms, bosses, effects, text.
// Reads sim state each frame; never changes it.
import {sin,cos,PI,min,max,floor,hypot,atan2,add,sub,mul,norm,cross,len} from './vec.js';
import {N,WN} from './sim.js';

export const COLS=[0xff3b4a,0xff8a2b,0xffe14a,0x3ee07a,0x3aa3ff,0x6a5cff,0xd054ff];
export const rdM={text:''};              // named objects (weapons, bosses, pools)
let rdT,rdScene,rdCam,rdWorld,rdFog,rdRope,rdGlow,rdRG,rdPts,rdPP,rdPC,rdLife=[],rdVel=[],rdCtx,rdTex,rdDawn=-1,rdFlash=0,rdDes=0,rdLine,rdTrail,rdTrailN=0,rdBolt=0,rdBoltT=0,rdSlam=0,rdBar=0,rdCue=0,rdCueT=0,rdRings=[],rdCrack=0,rdWaveTot=1,rdCol=[],rdTmp;
const rdC=c=>new rdT.Color(c);
const mesh=(g,m,par,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const o=new rdT.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);(par||rdWorld).add(o);return o};
const lam=(c,o=1,e=0)=>new rdT.MeshLambertMaterial({color:c,emissive:e,transparent:o<1,opacity:o});
const bas=(c,o=1,ad=0)=>new rdT.MeshBasicMaterial({color:c,transparent:o<1||!!ad,opacity:o,blending:ad?rdT.AdditiveBlending:rdT.NormalBlending,depthWrite:!ad});
// merge [geo,x,y,z,sx,sy,sz,rx,ry,rz] into one non-indexed geometry (no addons)
const merge=L=>{const P=[],Nn=[],m=new rdT.Matrix4,e=new rdT.Euler,q=new rdT.Quaternion,v=new rdT.Vector3,s=new rdT.Vector3;
  for(const[g,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0]of L){const G=g.index?g.toNonIndexed():g;m.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz));G.applyMatrix4(m);P.push(...G.attributes.position.array);Nn.push(...G.attributes.normal.array)}
  const out=new rdT.BufferGeometry;out.setAttribute('position',new rdT.Float32BufferAttribute(P,3));out.setAttribute('normal',new rdT.Float32BufferAttribute(Nn,3));return out};
const withS=(g,f)=>{const p=g.attributes.position,a=new Float32Array(p.count);for(let i=0;i<p.count;i++)a[i]=f(p.getX(i),p.getY(i),p.getZ(i));g.setAttribute('s',new rdT.BufferAttribute(a,1));return g};
const rbMat=(w,a,ad)=>new rdT.ShaderMaterial({uniforms:{w:{value:w},a:{value:a},d:{value:0},c:{value:COLS.map(rdC)}},
  vertexShader:'attribute float s;varying float v;uniform float w;void main(){v=s;gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*w,1.);}',
  fragmentShader:'uniform vec3 c[7];uniform float a,d;varying float v;void main(){float b=v*7.,f=fract(b);vec3 k=c[0];k=mix(k,c[1],step(1.,b));k=mix(k,c[2],step(2.,b));k=mix(k,c[3],step(3.,b));k=mix(k,c[4],step(4.,b));k=mix(k,c[5],step(5.,b));k=mix(k,c[6],step(6.,b));k*=.6+.4*min(1.,min(f,1.-f)*12.);gl_FragColor=vec4(mix(k,vec3(.95),d),a);}',
  transparent:a<1||!!ad,blending:ad?rdT.AdditiveBlending:rdT.NormalBlending,depthWrite:!ad,side:rdT.DoubleSide});
const inst=(g,m,n,par)=>{const o=new rdT.InstancedMesh(g,m,n);o.count=n;(par||rdWorld).add(o);o.frustumCulled=false;for(let i=0;i<n;i++)o.setColorAt(i,rdC(0x1a2140));rdTmp.makeScale(0,0,0);for(let i=0;i<n;i++)o.setMatrixAt(i,rdTmp);return o};
const place=(o,i,p,yaw,s,c)=>{rdTmp.compose(new rdT.Vector3(p[0],p[1],p[2]),new rdT.Quaternion().setFromAxisAngle(new rdT.Vector3(0,1,0),yaw||0),new rdT.Vector3(s,s,s));o.setMatrixAt(i,rdTmp);if(c!=null)o.setColorAt(i,rdCol[c])};
const flush=o=>{o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true};
const bp=(e,pt)=>{if(pt._w)return pt._w;const o=pt._o;return e._boss>=0?add(e._p,add(mul(e._rt,o[0]),add([0,o[1],0],mul(e._fw,o[2])))):add(e._p,o)};
const rdSetText=(a,b)=>{const k=a+'\n'+(b||'');if(k==rdM.text)return;rdM.text=k;const c=rdCtx;c.clearRect(0,0,1024,256);c.fillStyle='#fff';c.textAlign='center';c.shadowColor='#3aa3ff';c.shadowBlur=24;
  c.font='bold 110px sans-serif';c.fillText(a,512,b?120:160);c.font='48px sans-serif';if(b)c.fillText(b,512,215);rdTex.needsUpdate=true};
const burst=(p,b,n,sp,up=0)=>{for(let k=0;k<n;k++){const i=rdLife.findIndex(l=>l<=0);if(i<0)return;rdLife[i]=.5+Math.random()*.5;rdPP[i*3]=p[0];rdPP[i*3+1]=p[1];rdPP[i*3+2]=p[2];
  rdVel[i]=[(Math.random()-.5)*sp,(Math.random()-.5)*sp+up,(Math.random()-.5)*sp];const c=rdCol[b];rdPC[i*3]=c.r;rdPC[i*3+1]=c.g;rdPC[i*3+2]=c.b}};
const ring=(p,b)=>{const r=rdRings.find(r=>r.life<=0)||rdRings[0];r.life=.3;r.position.set(p[0],p[1],p[2]);r.material.color.copy(rdCol[b]);r.visible=true};

export function rdInit(T,R){
  rdT=T;rdTmp=new T.Matrix4;rdCol=COLS.map(rdC);
  rdScene=new T.Scene;rdWorld=new T.Group;rdScene.add(rdWorld);
  rdFog=rdScene.fog=new T.Fog(0x070a14,6,40);rdScene.background=rdC(0x070a14);
  rdCam=new T.PerspectiveCamera(90,innerWidth/innerHeight,.05,300);rdCam.position.set(0,1.6,0);rdCam.rotation.order='YXZ';rdCam.rotation.y=PI;
  rdScene.add(new T.AmbientLight(0x304060,.8));const dl=new T.DirectionalLight(0x8090c0,1.2);dl.position.set(-40,60,-80);rdScene.add(dl);
  const G=T,sph=(r,a=10,b=7)=>new G.SphereGeometry(r,a,b),box=(x,y,z)=>new G.BoxGeometry(x,y,z),cyl=(a,b,h,s=8)=>new G.CylinderGeometry(a,b,h,s),rg=(a,b,s=32)=>new G.RingGeometry(a,b,s);
  const stone=lam(0x12141c,1,0x07080f);
  // ---- arena: altar, rune rings, ruins, cloud-sea, sky, moon, dust
  mesh(cyl(3,3.2,.3,32),stone,0,0,-.15);
  rdM.runes=inst(rg(1,1.04,48),bas(0xffffff),7);rdM.runes.rotation.x=-PI/2;rdM.runes.position.y=.006;
  const ruins=[];for(let i=0;i<10;i++){const a=i*.628+.3,r=4.6+(i%3)*.9,x=sin(a)*r,z=cos(a)*r,h=1.5+(i*7%5)*.8;
    ruins.push([cyl(.22,.3,h,6),x,h/2-.3,z,1,1,1,0,0,(i%2)*.15]);if(i%3==0){ruins.push([box(.5,4,.5),x+.9,1.7,z],[box(.5,4,.5),x-.9,1.7,z],[box(2.4,.5,.5),x,3.9,z])}}
  mesh(merge(ruins),stone);
  const sea=new G.PlaneGeometry(140,140,36,36);{const p=sea.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,sin(p.getX(i)*.6)*sin(p.getY(i)*.45)*.5)}sea.computeVertexNormals();
  mesh(sea,lam(0x0b0e1a,1,0x04050a),0,0,-.5,0).rotation.x=-PI/2;
  const sky=sph(160,16,10),sc=[];{const p=sky.attributes.position;for(let i=0;i<p.count;i++){const t=Math.max(0,p.getY(i)/160);sc.push(.03+.02*(1-t),.04+.03*(1-t),.08+.06*(1-t))}}sky.setAttribute('color',new G.Float32BufferAttribute(sc,3));
  const skm=new G.MeshBasicMaterial({vertexColors:true,side:G.BackSide,fog:false});rdM.sky=mesh(sky,skm);
  rdM.moon=mesh(sph(40,24,16),new G.MeshLambertMaterial({color:0x23242c,fog:false}),0,-60,90,-100);
  const dp=[];for(let i=0;i<400;i++)dp.push((Math.random()-.5)*30,Math.random()*8,(Math.random()-.5)*30);
  const dg=new G.BufferGeometry;dg.setAttribute('position',new G.Float32BufferAttribute(dp,3));rdM.dust=new G.Points(dg,new G.PointsMaterial({color:0x3a3f5a,size:.05}));rdWorld.add(rdM.dust);
  // ---- unicorn (primitives), horn light, motes
  const um=lam(0xdfe6ff,.45,0x303848),U=rdM.uni=new G.Group;U.position.set(0,0,-1.8);U.rotation.y=-PI*.5;rdWorld.add(U);
  const parts=[[box(1.1,.5,.4),0,.9,0],[box(.4,.32,.28),.7,1.3,0],[cyl(.06,.06,.7,6),-.4,.35,.12],[cyl(.06,.06,.7,6),-.4,.35,-.12],[cyl(.06,.06,.7,6),.4,.35,.12],[cyl(.06,.06,.7,6),.4,.35,-.12],[box(.3,.28,.25),.5,1.05,0]];
  for(let i=0;i<5;i++)parts.push([cyl(.03,.02,.35,5),.15-i*.16,1.28,0,1,1,1,0,0,.6]);
  mesh(merge(parts),um,U);mesh(new G.ConeGeometry(.04,.35,6),bas(0xffffff),U,.78,1.6,0,1,1,1).rotation.z=-.4;
  rdM.horn=new G.PointLight(0xffffff,3,7,1.5);rdM.horn.position.set(.78,1.7,0);U.add(rdM.horn);
  rdM.motes=inst(sph(.045,6,4),bas(0xffffff,1,1),5,U);
  rdM.arc=mesh(withS(new G.TorusGeometry(2.6,.06,6,40,PI),(x,y)=>atan2(y,x)/PI),rbMat(0,1),U,0,.5,0,0,0,0);
  // ---- rainbow rope: tube rebuilt each frame, one geometry, core + glow copy
  rdRG=new G.BufferGeometry;const nv=(N+1)*8,idx=[];rdRG.setAttribute('position',new G.BufferAttribute(new Float32Array(nv*3),3));rdRG.setAttribute('normal',new G.BufferAttribute(new Float32Array(nv*3),3));
  rdRG.setAttribute('s',new G.BufferAttribute(new Float32Array(nv).map((_,i)=>floor(i/8)/N),1));
  for(let i=0;i<N;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8;idx.push(a,a+8,b,b,a+8,b+8)}rdRG.setIndex(idx);
  rdM.rb=rbMat(0,1);rdM.rbg=rbMat(.035,.25,1);rdRope=mesh(rdRG,rdM.rb);rdGlow=mesh(rdRG,rdM.rbg);rdRope.frustumCulled=rdGlow.frustumCulled=false;
  rdM.hL=mesh(sph(.04,8,6),bas(0xffffff,.7));rdM.hR=mesh(sph(.04,8,6),bas(0xffffff,.7));
  // ---- forged weapons (share the rainbow material)
  const wg=g=>{g.rotateX(PI/2);return g};
  rdM.lance=mesh(withS(wg(cyl(.012,.03,2.2,6)),(x,y,z)=>(z+1.1)/2.2),rdM.rb);
  rdM.halo=mesh(withS(new G.TorusGeometry(.25,.03,6,24),(x,y)=>atan2(y,x)/(2*PI)+.5),rdM.rb);
  rdM.maul=new G.Group;rdWorld.add(rdM.maul);mesh(withS(wg(cyl(.02,.02,1.1,6)),(x,y,z)=>(z+.55)/1.1),rdM.rb,rdM.maul,0,0,.55);rdM.maulH=mesh(cyl(.17,.17,.3,6),bas(0xff3b4a),rdM.maul,0,0,1);rdM.maulH.rotation.z=PI/2;
  rdM.shards=new G.Group;rdWorld.add(rdM.shards);rdM.sh=[0,1].map(i=>mesh(withS(box(.05,.015,.45),(x,y,z)=>i*.5+(z+.225)/.45*.5),rdM.rb,rdM.shards));
  rdM.prism=new G.Group;rdWorld.add(rdM.prism);mesh(withS(new G.OctahedronGeometry(.12),(x,y)=>(y+.12)/.24),rdM.rb,rdM.prism);rdM.beam=mesh(wg(cyl(.05,.05,12,6)),bas(0xffffff,.6,1),rdM.prism,0,0,6);
  // ---- enemies: instanced bodies + cores; shell plates pool (also Gloam plates & Eclipse tentacles)
  const em=lam(0x05060a,1,0x101422),cm=bas(0xffffff);
  const bodies=[merge([[sph(.2),0,0,0],[new G.ConeGeometry(.18,.4,8),0,-.3,0,1,1,1,PI]]),merge([[box(.5,.8,.3),0,1.3,0],[box(.3,.3,.3),0,1.85,0],[cyl(.05,.05,.9,6),-.35,1.05,0],[cyl(.05,.05,.9,6),.35,1.05,0]]),
    merge([[sph(.6,12,8),0,.35,0,1,.55,1],[cyl(.05,.05,.5,5),.4,.2,0],[cyl(.05,.05,.5,5),-.2,.2,.35],[cyl(.05,.05,.5,5),-.2,.2,-.35]]),merge([[sph(.45,12,8),0,.5,0,1,.65,1]]),sph(.1,6,4)];
  const cores=[sph(.08,6,4),sph(.1,6,4),sph(.13,6,4),sph(.15,6,4),sph(.05,4,3)],coreY=[0,1.3,.55,.6,0],coreZ=[.12,.16,.5,0,0],caps=[24,12,8,8,40];
  rdM.eb=bodies.map((g,i)=>inst(g,em,caps[i]));rdM.ec=cores.map((g,i)=>inst(g,cm,caps[i]));rdM.coreY=coreY;rdM.coreZ=coreZ;
  rdM.plates=inst(cyl(.2,.2,.1,6),bas(0xffffff),48);
  // ---- bosses
  const th=rdM.th=new G.Group;rdWorld.add(th);th.visible=false;const cl=[];for(let i=0;i<20;i++)cl.push([sph(1.2+(i*7%5)*.3,10,7),sin(i*2.4)*3.2,cos(i*1.7)*1.6+1.5,cos(i*3.1)*2-1.5]);mesh(merge(cl),em,th);rdM.eye=mesh(sph(.8,16,12),bas(0x14141c),th);
  const gl=rdM.gl=new G.Group;rdWorld.add(gl);gl.visible=false;mesh(merge([[box(1.2,1.6,.8),0,2.2,0],[box(.5,.6,.5),0,3.3,0],[box(.6,.5,.6),-.9,2.8,0],[box(.6,.5,.6),.9,2.8,0],[box(.35,1.6,.35),-1.2,2,0],[box(.35,1.6,.35),1.2,2,0],[box(.4,1.4,.4),-.4,.7,0],[box(.4,1.4,.4),.4,.7,0]]),em,gl);
  rdM.gcore=mesh(sph(.5,12,8),bas(0xff3b4a),gl,0,1.5,0);rdM.gcore.visible=false;
  const ec=rdM.ecl=new G.Group;rdWorld.add(ec);ec.visible=false;mesh(wg(cyl(10,10,.6,32)),em,ec);mesh(rg(10.2,13.5,12),new G.MeshBasicMaterial({color:0x2a1a40,wireframe:true,transparent:true,opacity:.5}),ec);
  rdM.mouth=[1,2,3].map(r=>mesh(rg(r-.15,r+.15,24),bas(0x14141c),ec,0,0,.4));rdM.ecore=mesh(sph(.6,12,8),bas(0xff3b4a));rdM.ecore.visible=false;
  // ---- effects: particles, rings, crack flash, cue ring, lightning, sweep bar, forge trail, text
  rdPP=new Float32Array(600*3).fill(-99);rdPC=new Float32Array(600*3);rdLife=new Array(600).fill(0);const pg=new G.BufferGeometry;pg.setAttribute('position',new G.BufferAttribute(rdPP,3));pg.setAttribute('color',new G.BufferAttribute(rdPC,3));
  rdPts=new G.Points(pg,new G.PointsMaterial({size:.06,vertexColors:true,transparent:true,blending:G.AdditiveBlending,depthWrite:false}));rdPts.frustumCulled=false;rdWorld.add(rdPts);
  for(let i=0;i<4;i++){const r=mesh(rg(.85,1,24),bas(0xffffff,.8,1));r.life=0;r.visible=false;rdRings.push(r)}
  rdM.crack=mesh(sph(.1,8,6),bas(0xffffff,.9,1));rdM.crack.visible=false;
  rdM.cue=mesh(rg(.45,.55),bas(0xffe14a,.9,1));rdM.cue.rotation.x=-PI/2;rdM.cue.visible=false;
  const lg=new G.BufferGeometry;lg.setAttribute('position',new G.BufferAttribute(new Float32Array(400*3),3));rdLine=new G.LineSegments(lg,new G.LineBasicMaterial({color:0xeaf4ff}));rdLine.frustumCulled=false;rdLine.visible=false;rdWorld.add(rdLine);
  rdM.bar=mesh(box(6.4,.08,.08),bas(0xbfe3ff,.9,1));rdM.bar.visible=false;
  const tg=new G.BufferGeometry;tg.setAttribute('position',new G.BufferAttribute(new Float32Array(200*3),3));rdTrail=new G.Line(tg,new G.LineBasicMaterial({color:0xffffff}));rdTrail.frustumCulled=false;rdTrail.visible=false;rdWorld.add(rdTrail);
  const cv=document.createElement('canvas');cv.width=1024;cv.height=256;rdCtx=cv.getContext('2d');rdTex=new G.CanvasTexture(cv);
  rdM.tp=mesh(new G.PlaneGeometry(3,.75),new G.MeshBasicMaterial({map:rdTex,transparent:true,fog:false}),0,0,1.7,3);rdM.tp.rotation.y=PI;
  rdSetText('SEVENFOLD','Hold the rainbow. Pull a trigger.');
  return{scene:rdScene,cam:rdCam,world:rdWorld};
}
export const rdWeapons=()=>['lance','halo','maul','shards','prism'].filter(k=>rdM[k].visible);
const rdHints={1:'Swing the rainbow.',2:'Stretch it taut. Strike.',3:'Hold it taut. Block the orbs.',5:'Hold both grips. Stretch.',6:'Hold grips. Raise, slam.',7:'Hold grips. Circle.',9:'Hold grips. Cross, pull apart.',10:'Hold grips. Wring.'};
const rdBoss=['THUNDERHEAD','GLOAM','ECLIPSE'];
const setP=(o,p)=>o.position.set(p[0],p[1],p[2]);
const aimZ=(o,d)=>o.quaternion.setFromUnitVectors(new rdT.Vector3(0,0,1),new rdT.Vector3(d[0],d[1],d[2]).normalize());

export function rdSync(S,ev,dt,mute){
  const T=rdT,L=S._L.p,R=S._R.p,boss=S._en.find(e=>e._boss>=0);
  // ---- events → effects / text
  for(const e of ev){const k=e.k,p=e.p;
    if(k=='hit'||k=='res'){if(p){burst(p,e.b,k=='res'?14:6,3);if(k=='res')ring(p,e.b)}}
    else if(k=='kill'||k=='plate'){burst(p,e.b,k=='kill'?24:16,2.5,1.5)}
    else if(k=='crack'){setP(rdM.crack,p);rdM.crack.visible=true;rdCrack=.08}
    else if(k=='forged'){burst(S._rp[N>>1],e.d,40,3)}
    else if(k=='light'){rdFlash=.2}
    else if(k=='wave'){rdSetText('Wave '+e.d,rdHints[e.d]||'');rdWaveTot=max(1,S._q.length)}
    else if(k=='boss'){rdSetText(rdBoss[e.d],'');rdWaveTot=1}
    else if(k=='clear'||k=='start'||k=='restart'||k=='endless'){rdSetText('','');if(k!='clear')rdDawn=-1}
    else if(k=='over'){rdSetText('The Light is gone','Wave '+S._wave+'  ·  Score '+S._score+'  ·  Trigger to try again')}
    else if(k=='dawn'){rdDawn=0;rdSetText('Dawn','Score '+S._score+'  ·  '+(S._t|0)+' s  ·  Trigger for endless night')}
    else if(k=='cue'){if(e.b==1){rdBar=e.d;rdM.bar.position.y=p[1];rdM.bar.visible=true}else{rdCue=rdCueT=e.d;setP(rdM.cue,[p[0],.01,p[2]]);if(e.b==3)setP(rdM.cue,[0,.01,-1.8]);rdM.cue.visible=true}}
    else if(k=='strike'){if(boss&&boss._boss==0){rdBolt=.3;rdBoltT=0;rdM.boltTo=p}else{setP(rdM.crack,[p[0],.3,p[2]]);rdM.crack.scale.setScalar(3);rdM.crack.visible=true;rdCrack=.3}}
    else if(k=='pulse'){rdFlash=.3}
    else if(k=='absorb'){ring(p,e.b);burst(p,e.b,12,2)}
    else if(k=='block'||k=='clank'){burst(p,e.b,5,2)}
  }
  // ---- forge feedback: desaturate, slow-mo trail
  rdDes+=((S._fg.on?1:0)-rdDes)*min(1,dt*8);rdM.rb.uniforms.d.value=rdM.rbg.uniforms.d.value=rdDes;
  if(S._fg.on){const M=S._fg.M,n=min(200,M.length),pa=rdTrail.geometry.attributes.position,y=Math.atan2(S._H.q[1],S._H.q[3])*2;
    for(let i=0;i<n;i++){const m=M[M.length-n+i];pa.setXYZ(i,S._H.p[0]-cos(y+PI)*m[0]+sin(y+PI)*m[2],S._H.p[1]+m[1],S._H.p[2]+sin(y+PI)*m[0]+cos(y+PI)*m[2])}
    pa.needsUpdate=true;rdTrail.geometry.setDrawRange(0,n);rdTrail.visible=n>1}else rdTrail.visible=false;
  // ---- fog / flashes / dawn
  const fc=rdFlash>0?0x000000:rdDes>.5?0x030408:S._dark?0x02030a:0x070a14;rdFog.color.lerp(rdC(fc),min(1,dt*6));rdScene.background.copy(rdFog.color);
  rdFog.far+=((S._dark?4.5:rdDawn>=0?80:40)-rdFog.far)*min(1,dt*(rdDawn>=0?.3:3));if(rdFlash>0)rdFlash-=dt;
  if(rdDawn>=0){rdDawn=min(6,rdDawn+dt);const u=rdDawn/6;rdFog.color.lerp(rdC(0x2a1a2e),u*.1);rdM.moon.material.color.lerp(rdC(0xffffff),dt*.3);rdM.arc.scale.setScalar(u);rdM.arc.material.uniforms.d.value=0}
  else rdM.arc.scale.setScalar(0);
  // ---- unicorn: breathing, head bob, horn light, motes
  const U=rdM.uni,b=1+.02*sin(S._t*1.2);U.scale.set(b,b,b);U.position.y=S._light<2?-.15:0;rdM.horn.intensity=.6+S._light*.6;
  for(let i=0;i<5;i++){const a=S._t*1.5+i*1.257;place(rdM.motes,i,[.78+cos(a)*.3,1.7+sin(a*1.3)*.1,sin(a)*.3],0,i<S._light?1:0,6-i)}flush(rdM.motes);
  for(let i=0;i<7;i++)place(rdM.runes,i,[0,0,0],0,.6+i*.35,i<S._ring?i:null);if(S._ring==0)for(let i=0;i<7;i++)rdM.runes.setColorAt(i,rdC(0x1a2140));flush(rdM.runes);
  rdM.dust.rotation.y+=dt*.01;
  // ---- rope tube
  {const P=S._rp,pa=rdRG.attributes.position,na=rdRG.attributes.normal,r=S._wp?0:.02;for(let i=0;i<=N;i++){const t=norm(sub(P[min(N,i+1)],P[max(0,i-1)]));let u=cross(t,Math.abs(t[1])<.9?[0,1,0]:[1,0,0]);u=norm(u);const v=cross(t,u);
      for(let j=0;j<8;j++){const a=j*PI/4,n=add(mul(u,cos(a)),mul(v,sin(a))),k=i*8+j;na.setXYZ(k,n[0],n[1],n[2]);pa.setXYZ(k,P[i][0]+n[0]*r,P[i][1]+n[1]*r,P[i][2]+n[2]*r)}}
    pa.needsUpdate=na.needsUpdate=true;rdRope.visible=rdGlow.visible=!S._wp||S._fg.on}
  setP(rdM.hL,L);setP(rdM.hR,R);
  // ---- forged weapons
  const wp=S._fg.on?0:S._wp,dir=norm(sub(R,L)),mid=[(L[0]+R[0])/2,(L[1]+R[1])/2,(L[2]+R[2])/2];
  rdM.lance.visible=wp==1;rdM.halo.visible=wp==2;rdM.maul.visible=wp==3;rdM.shards.visible=wp==4;rdM.prism.visible=wp==5;
  if(wp==1){setP(rdM.lance,add(L,mul(dir,1.1)));aimZ(rdM.lance,dir)}
  if(wp==2){const H=S._halo;setP(rdM.halo,H.out?H.p:R);rdM.halo.rotation.set(H.out?PI/2:0,0,S._t*(H.out?20:2))}
  if(wp==3){setP(rdM.maul,L);aimZ(rdM.maul,dir);rdM.maulH.material.color.copy(rdCol[S._mb||0])}
  if(wp==4){[L,R].forEach((h,i)=>{const o=rdM.sh[i],t=S._sh[i],H=i?S._R:S._L;if(t){setP(o,t.p);o.rotation.set(0,S._t*25,0)}else{setP(o,h);o.quaternion.set(H.q[0],H.q[1],H.q[2],H.q[3]);o.rotateY(PI);o.translateZ(.225)}})}
  if(wp==5){setP(rdM.prism,mid);rdM.prism.rotation.y=S._t;const B=S._beam;rdM.beam.visible=!!B;if(B){rdM.beam.parent.rotation.set(0,0,0);aimZ(rdM.prism,sub(B[1],B[0]));rdM.beam.material.color.copy(rdCol[B[2]])}}
  // ---- enemies
  const cnt=[0,0,0,0,0],eb=rdM.eb,ec=rdM.ec;let pl=0;
  for(const e of S._en){if(e._hp<=0)continue;
    if(e._boss>=0){const g=[rdM.th,rdM.gl,rdM.ecl][e._boss];g.visible=true;setP(g,e._p);g.rotation.y=atan2(e._fw[0],e._fw[2]);
      if(e._boss==0){rdM.eye.material.color.copy(e._open>0?rdCol[e._parts[0]._b]:rdC(0x14141c))}
      if(e._boss==1){for(let i=0;i<6;i++){const q=e._parts[i];place(rdM.plates,pl++,bp(e,q),g.rotation.y,q._hp>0?1.4:0,q._b)}rdM.gcore.visible=e._ph==2;rdM.gcore.material.color.copy(rdCol[e._parts[6]._b])}
      if(e._boss==2){const op=e._ph==1&&e._open>0;for(const m of rdM.mouth)m.material.color.copy(op?rdCol[e._parts[0]._b]:rdC(0x14141c));
        if(e._ph==2)for(const q of e._parts)place(rdM.plates,pl++,bp(e,q),0,q._hp>0?1.6:0,q._b);
        rdM.ecore.visible=e._ph==3;if(e._ph==3){setP(rdM.ecore,e._p);rdM.ecore.material.color.copy(rdCol[e._parts[0]._b])}}
      continue}
    const t=e._t,i=cnt[t]++;if(i>=eb[t].count)continue;const yaw=atan2(-e._p[0],-1.8-e._p[2]),gp=[e._p[0],t==0||t==4?e._p[1]:0,e._p[2]];
    if(t==4){for(const q of e._parts){if(i*10+e._parts.indexOf(q)<40)place(ec[4],i*10+e._parts.indexOf(q),bp(e,q),0,q._hp>0?1:0,q._b)}continue}
    place(eb[t],i,gp,yaw,e._flare>0||e._stg>0?1.08:1);place(ec[t],i,add(gp,[sin(yaw)*rdM.coreZ[t],rdM.coreY[t],cos(yaw)*rdM.coreZ[t]]),0,e._flare>0?1.8:1,e._b);
    if(t==3)for(const q of e._parts)if(q._pl)place(rdM.plates,pl++,add(gp,[q._o[0],.62,q._o[2]]),0,q._hp>0?1:0,q._b);
  }
  for(let t=0;t<4;t++){for(let i=cnt[t];i<eb[t].count;i++){place(eb[t],i,[0,-9,0],0,0);place(ec[t],i,[0,-9,0],0,0)}flush(eb[t]);flush(ec[t])}
  if(!cnt[4])for(let i=0;i<40;i++)place(ec[4],i,[0,-9,0],0,0);flush(ec[4]);
  for(;pl<48;pl++)place(rdM.plates,pl,[0,-9,0],0,0);flush(rdM.plates);
  if(!boss||boss._boss!=0)rdM.th.visible=false;if(!boss||boss._boss!=1){rdM.gl.visible=false;rdM.gcore.visible=false}if(!boss||boss._boss!=2){rdM.ecl.visible=false;rdM.ecore.visible=false}
  // ---- boss cues: lightning bolt, sweep bar, cue ring
  if(rdBolt>0){rdBolt-=dt;rdBoltT+=dt;if((rdBoltT*45|0)%2==0&&boss){const pa=rdLine.geometry.attributes.position,a=boss._p,b=rdM.boltTo;let q=a;for(let i=0;i<16;i++){const u=(i+1)/16,n=[a[0]+(b[0]-a[0])*u+(Math.random()-.5)*.8*(1-u),a[1]+(b[1]-a[1])*u+(Math.random()-.5)*.8,a[2]+(b[2]-a[2])*u+(Math.random()-.5)*.8*(1-u)];pa.setXYZ(i*2,q[0],q[1],q[2]);pa.setXYZ(i*2+1,n[0],n[1],n[2]);q=n}pa.needsUpdate=true;rdLine.geometry.setDrawRange(0,32)}rdLine.visible=true}else rdLine.visible=false;
  if(rdBar>0){rdBar-=dt;rdM.bar.material.opacity=.3+.7*(1-rdBar/1.3);rdM.bar.rotation.y+=dt*.5}else rdM.bar.visible=false;
  if(rdCue>0){rdCue-=dt;rdM.cue.material.opacity=1-rdCue/rdCueT;const s=1+rdCue/rdCueT;rdM.cue.scale.set(s,s,1)}else rdM.cue.visible=false;
  if(rdCrack>0){rdCrack-=dt;if(rdCrack<=0){rdM.crack.visible=false;rdM.crack.scale.setScalar(1)}}
  for(const r of rdRings){if(r.life>0){r.life-=dt;const s=(1-r.life/.3)*1.2+.05;r.scale.set(s,s,s);r.material.opacity=r.life/.3;r.lookAt(rdCam.position);r.visible=r.life>0}}
  // ---- particles
  for(let i=0;i<600;i++){if(rdLife[i]>0){rdLife[i]-=dt;const v=rdVel[i];v[1]-=2*dt;rdPP[i*3]+=v[0]*dt;rdPP[i*3+1]+=v[1]*dt;rdPP[i*3+2]+=v[2]*dt;if(rdLife[i]<=0)rdPP[i*3+1]=-99}}
  rdPts.geometry.attributes.position.needsUpdate=true;rdPts.geometry.attributes.color.needsUpdate=true;
  rdM.tp.visible=!!rdM.text.replace('\n','');
}
