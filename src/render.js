// render.js — Three.js scene: dead forest, ash, lightning, rim-lit shadow unicorns, the rainbow in all its modes, text.
// Reads sim state each frame; never changes it. No Three lights: one custom shader lights everything dark.
import {sin,cos,PI,min,max,atan2,hypot,add,sub,mul,norm,len,lerp} from './vec.js';
import {N,hd} from './sim.js';

export const COLS=[0xff2a3c,0xff8c1a,0xffe14a,0x3ee07a,0x2fa8ff,0x6a5cff,0xd054ff];
export const rdM={text:''};
let rdT,rdScene,rdCam,rdWorld,rdFog,rdU,rdCol,rdM4,rdV,rdQ,rdS,rdUp,rdCtx,rdTex,rdRope,rdGlow,rdEn,rdBolt,rdBoltT=0,rdFl=0,rdCue,rdCueT=0,rdRing,rdRingT=0,rdHurt=0,rdNova=0,rdBu,rdBi=0,rdBuA,rdLoop,rdHand=[],rdFogC,rdFar=36,rdDawn=0,rdBoss=0;
const rdC=c=>new rdT.Color(c),rdX=c=>new rdT.Color().setHex(c,'srgb-linear'); // rdX: raw display values for our own shaders (they write output space directly)
const sm=(vs,fs,u,o)=>new rdT.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:fs,...o});
const bas=(c,o=1,ad=0)=>new rdT.MeshBasicMaterial({color:c,transparent:o<1||!!ad,opacity:o,blending:ad?rdT.AdditiveBlending:rdT.NormalBlending,depthWrite:!ad,fog:false});
const mesh=(g,m,par,x=0,y=0,z=0)=>{const o=new rdT.Mesh(g,m);o.position.set(x,y,z);(par||rdWorld).add(o);return o};
// merge [geo,x,y,z,sx,sy,sz,rx,ry,rz,e] into one non-indexed geometry with an emissive flag attribute e (no addons)
const merge=L=>{const P=[],Nn=[],E=[],m=new rdT.Matrix4,eu=new rdT.Euler,q=new rdT.Quaternion,v=new rdT.Vector3,s=new rdT.Vector3;
  for(const[g,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,e=0]of L){const G=g.index?g.toNonIndexed():g;m.compose(v.set(x,y,z),q.setFromEuler(eu.set(rx,ry,rz)),s.set(sx,sy,sz));G.applyMatrix4(m);P.push(...G.attributes.position.array);Nn.push(...G.attributes.normal.array);for(let i=0;i<G.attributes.position.count;i++)E.push(e)}
  const o=new rdT.BufferGeometry;o.setAttribute('position',new rdT.Float32BufferAttribute(P,3));o.setAttribute('normal',new rdT.Float32BufferAttribute(Nn,3));o.setAttribute('e',new rdT.Float32BufferAttribute(E,1));return o};
const withE=g=>{g.setAttribute('e',new rdT.Float32BufferAttribute(new Float32Array(g.attributes.position.count),1));return g};
const withS=(g,f)=>{const p=g.attributes.position,u=g.attributes.uv;for(let i=0;i<p.count;i++)u.setX(i,f(p.getX(i),p.getY(i),p.getZ(i)));return g};
const inst=(g,m,n,par)=>{const o=new rdT.InstancedMesh(g,m,n);o.frustumCulled=false;(par||rdWorld).add(o);rdM4.makeScale(0,0,0);for(let i=0;i<n;i++){o.setMatrixAt(i,rdM4);o.setColorAt(i,rdC(0))}return o};
const place=(o,i,p,yaw,s,pitch)=>{rdM4.compose(rdV.set(p[0],p[1],p[2]),rdQ.setFromAxisAngle(rdUp,yaw||0),rdS.set(s,s,s));
  if(pitch){rdM4.multiply(new rdT.Matrix4().makeTranslation(0,0,-.32)).multiply(new rdT.Matrix4().makeRotationX(pitch)).multiply(new rdT.Matrix4().makeTranslation(0,0,.32))}o.setMatrixAt(i,rdM4)};
const flush=o=>{o.instanceMatrix.needsUpdate=true;o.instanceColor.needsUpdate=true};
const rnd=Math.random;
// ---- particles: GPU-aged bursts (position, velocity, birth/life, colour); the CPU only writes new ones
export const burst=(p,c,n,sp,up=0,life=.8)=>{const A=rdBuA,k=c<7?rdCol[c]:c==7?rdX(0xffffff):rdX(0x6a7080);for(let j=0;j<n;j++){const i=rdBi=(rdBi+1)%900;A.p.setXYZ(i,p[0],p[1],p[2]);A.v.setXYZ(i,(rnd()-.5)*sp,(rnd()-.5)*sp+up,(rnd()-.5)*sp);A.b.setXY(i,rdU.t.value,life*(.6+rnd()*.8));A.c.setXYZ(i,k.r,k.g,k.b)}for(const a in A)A[a].needsUpdate=true};
const bolt=(a,b,r)=>{const P=[];for(let i=0;i<=16;i++){const s=i/16,j=(1-s)*r;P.push(new rdT.Vector3(a[0]+(b[0]-a[0])*s+(rnd()-.5)*j,a[1]+(b[1]-a[1])*s,a[2]+(b[2]-a[2])*s+(rnd()-.5)*j))}
  const cp=new rdT.CurvePath;for(let i=0;i<16;i++)cp.add(new rdT.LineCurve3(P[i],P[i+1]));rdBolt.geometry.dispose();rdBolt.geometry=new rdT.TubeGeometry(cp,48,r*.03+.03,4);rdBolt.visible=true;rdBoltT=.22;rdFl=1;rdU.bd.value.set(b[0],14,b[2]).normalize()};
const rdSetText=(a,b)=>{const k=a+'\n'+(b||'');if(k==rdM.text)return;rdM.text=k;const c=rdCtx;c.clearRect(0,0,1024,256);c.fillStyle='#e8e2ff';c.textAlign='center';
  c.font='bold 100px serif';c.fillText(a,512,b?118:150);c.font='42px serif';if(b)c.fillText(b,512,205);rdTex.needsUpdate=true};

// ---- shaders
const FOG='uniform vec3 fogColor;uniform float fogNear,fogFar;';
const W_V=`uniform float t;attribute float e;varying vec3 vn,vw;varying float ve,vd,vb;
void main(){vec3 p=position,ic=instanceColor;float sc=length(instanceMatrix[0].xyz),ph=ic.g*6.28+t*12./sqrt(sc),a=ic.b;
if(a>0.){if(p.y<.72){float s=sin(ph+(p.z>0.?0.:3.14)+(p.x>0.?.5:0.))*.4*a;p.z+=(p.y-.75)*s;p.y+=abs(s)*.08;}p.y+=.03*sin(ph*2.)*a;}
vec4 w=modelMatrix*instanceMatrix*vec4(p,1.);vw=w.xyz;vn=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);ve=e;vb=ic.r;
vec4 mv=viewMatrix*w;vd=-mv.z;gl_Position=projectionMatrix*mv;}`;
const W_F=`uniform vec3 c[7],lp,bd,lc;uniform float fl,li,dawn;${FOG}varying vec3 vn,vw;varying float ve,vd,vb;
void main(){vec3 n=normalize(vn),v=normalize(cameraPosition-vw),L=lp-vw;float d=length(L),r=pow(1.-max(dot(n,v),0.),3.);
vec3 k=mix(vec3(.022,.024,.034),vec3(.1,.07,.08),dawn)+mix(vec3(.045,.05,.075),vec3(.42,.33,.32),dawn)*(.5+.5*n.y)+mix(vec3(.3,.34,.48),vec3(.9,.7,.6),dawn)*r*.38
+lc*li*max(dot(n,L/d),0.)/(1.+d*d)+fl*vec3(.5,.35,.6)*max(dot(n,bd),0.);
vec2 cc=floor(vw.xz*12.)+floor(vw.y*12.)*7.;vec3 hh=fract(vec3(cc.x,cc.y,cc.x)*.1031);hh+=dot(hh,hh.yzx+33.33);k*=.88+.2*fract((hh.x+hh.y)*hh.z);
int b=int(vb*7.);float f=fract(vb*7.);k=mix(k,c[b]*(1.2+f*3.)+f*.5,ve);
gl_FragColor=vec4(mix(k,fogColor,smoothstep(fogNear,fogFar,vd)),1.);}`;
const RB_V='varying float v;uniform float w;void main(){v=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*w,1.);}';
const RB_F=`uniform vec3 c[7];uniform float a,n,g,t;varying float v;void main(){float b=v*7.,f=fract(b);int i=int(min(b,6.));
vec3 k=(float(i)<n?c[i]:vec3(.3,.32,.36))*(.7+.3*min(1.,min(f,1.-f)*10.));k=mix(k,vec3(1.),g*(.35+.25*sin(t*9.)));gl_FragColor=vec4(k,a);}`;
const SK_V='varying vec3 vp;void main(){vp=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const SK_F=`uniform vec3 fogColor,bd;uniform float fl,dawn;varying vec3 vp;void main(){vec3 d=normalize(vp);float h=max(d.y,0.);
vec3 k=mix(mix(fogColor,vec3(.7,.45,.42),dawn),mix(vec3(.008,.01,.02),vec3(.35,.18,.3),dawn),pow(h,.5));
float m=dot(d,normalize(vec3(.25,.16,1.)));k+=mix(vec3(.45,.08,.12),vec3(1.,.8,.6),dawn)*(smoothstep(.993,.995,m)+pow(max(m,0.),30.)*.35);
k+=fl*vec3(.8,.45,.7)*pow(max(dot(d.xz,bd.xz),0.),4.)*(1.-h)*(1.-h);gl_FragColor=vec4(k,1.);}`;
const AS_V=`uniform float t,dawn,ps;varying float va;varying vec3 vc;void main(){vec3 p=position;p.y=mod(p.y-t*.45,14.);p.x+=sin(t*.4+p.z*.6)*1.3;p.z+=cos(t*.3+p.x*.5)*1.3;
vec4 mv=modelViewMatrix*vec4(p,1.);float z=-mv.z;gl_PointSize=min(ps*(.9+dawn*.6)/z,26.);gl_Position=projectionMatrix*mv;va=(1.-smoothstep(4.,28.,z))*smoothstep(.15,.8,z);
vc=mix(vec3(.46,.5,.6),.55+.45*cos(6.28*(position.x*.07+position.z*.05+vec3(0,.33,.67))),dawn);}`;
const AS_F='varying float va;varying vec3 vc;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vc,va*smoothstep(.5,.15,d)*.65);}';
const BU_V=`uniform float t,ps;attribute vec3 vel,col;attribute vec2 bl;varying vec4 vc;void main(){float a=t-bl.x,u=a/bl.y;vec3 p=position+vel*a-vec3(0,1.6,0)*a*a;
vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=u<1.?min(ps*.8*(1.-u*u)/-mv.z,22.):0.;gl_Position=projectionMatrix*mv;vc=vec4(col,1.-u);}`;
const BU_F='varying vec4 vc;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vc.rgb,vc.a*smoothstep(.5,.1,d));}';

export function rdInit(T_,R){
  rdT=T_;rdM4=new rdT.Matrix4;rdV=new rdT.Vector3;rdQ=new rdT.Quaternion;rdS=new rdT.Vector3;rdUp=new rdT.Vector3(0,1,0);rdCol=COLS.map(rdX);
  rdScene=new rdT.Scene;rdWorld=new rdT.Group;rdScene.add(rdWorld);rdFogC=rdC(0x0c1018);
  rdFog=rdScene.fog=new rdT.Fog(0x0c1018,5,36);
  rdCam=new rdT.PerspectiveCamera(90,innerWidth/innerHeight,.05,400);rdCam.position.set(0,1.6,0);rdCam.rotation.order='YXZ';rdCam.rotation.y=PI;
  const U=rdU={t:{value:0},fl:{value:0},bd:{value:new rdT.Vector3(0,1,0)},lp:{value:new rdT.Vector3(0,1.2,.3)},li:{value:.7},lc:{value:rdX(0xc8b8ff)},dawn:{value:0},n:{value:7},g:{value:0},c:{value:rdCol},fogColor:{value:new rdT.Color},fogNear:{value:5},fogFar:{value:36},ps:{value:12}};
  const W=sm(W_V,W_F,U,{fog:true}),G=rdT,sph=(r,a=10,b=7)=>new G.SphereGeometry(r,a,b),cyl=(a,b,h,s=6)=>new G.CylinderGeometry(a,b,h,s),cone=(r,h,s=5)=>new G.ConeGeometry(r,h,s);
  // ---- sky (procedural gradient, dead red moon, lightning glow)
  mesh(sph(180,24,12),sm(SK_V,SK_F,U,{side:rdT.BackSide,depthWrite:false,fog:false}),rdScene).renderOrder=-1;
  // ---- ground: displaced plane, flat within the circle
  const gr=new G.PlaneGeometry(170,170,60,60).rotateX(-PI/2);{const p=gr.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=hypot(x,z);p.setY(i,(sin(x*.37)*sin(z*.31)*.9+sin(x*1.3+z*.7)*.25+cos(x*.11-z*.19)*1.4)*min(1,max(0,(r-4.5)/6))-.02)}gr.computeVertexNormals()}
  const ground=inst(withE(gr),W,1);rdM4.identity();ground.setMatrixAt(0,rdM4);flush(ground);
  // ---- dead trees and standing stones
  const tree=merge([[cyl(.09,.42,7.5,5),0,3.7,0],[cyl(.02,.09,3,4),.7,4.2,0,1,1,1,0,0,-.95],[cyl(.02,.08,2.6,4),-.6,5.3,.2,1,1,1,.3,0,1],[cyl(.02,.07,2.2,4),0,6.2,-.6,1,1,1,-1.1,0,0],[cyl(.015,.05,1.8,4),.3,7,.3,1,1,1,.9,0,-.6]]);
  const trees=inst(tree,W,46);for(let i=0;i<46;i++){const a=i*.1366+rnd()*.12,r=7.5+rnd()*22,s=.7+rnd()*.7;rdM4.compose(rdV.set(sin(a)*r,-.2,cos(a)*r),rdQ.setFromAxisAngle(rdUp,rnd()*7),rdS.set(s,s*(.8+rnd()*.7),s));trees.setMatrixAt(i,rdM4)}flush(trees);
  const stones=inst(withE(new G.BoxGeometry(.7,2.4,.35)),W,8);for(let i=0;i<8;i++){const a=i*.785+.4,s=.6+rnd()*.7;rdM4.compose(rdV.set(sin(a)*4.4,s*1.1-.2,cos(a)*4.4),rdQ.setFromEuler(new rdT.Euler((rnd()-.5)*.3,a+rnd()*.4,(rnd()-.5)*.3)),rdS.set(.7+rnd()*.6,s,1));stones.setMatrixAt(i,rdM4)}flush(stones);
  // ---- shadow unicorns: one merged model, instanced; horn and eyes glow in the horn colour (e=1); legs gallop in the shader
  const uni=merge([[sph(1),0,.85,0,.27,.3,.55],[cyl(.12,.18,.65,7),0,1.15,.42,1,1,1,-.7],[sph(1,8,6),0,1.42,.72,.11,.13,.25],[cone(.045,.5),0,1.62,.85,1,1,1,.9,0,0,1],
    [sph(1,5,4),.07,1.45,.88,.03,.03,.03,0,0,0,1],[sph(1,5,4),-.07,1.45,.88,.03,.03,.03,0,0,0,1],[cone(.03,.14,4),.07,1.56,.66],[cone(.03,.14,4),-.07,1.56,.66],[cone(.05,.55,5),0,.95,-.62,1,1,1,-1.9],
    [cyl(.045,.035,.76),.15,.38,.32],[cyl(.045,.035,.76),-.15,.38,.32],[cyl(.045,.035,.76),.15,.38,-.3],[cyl(.045,.035,.76),-.15,.38,-.3]]);
  rdEn=inst(uni,W,40);
  // ---- the rainbow: rope tube rebuilt each frame (core + additive glow), lasso loop, nova ring, hands
  const rb=(w,a,ad)=>sm(RB_V,RB_F,{...U,w:{value:w},a:{value:a}},{transparent:a<1,blending:ad?rdT.AdditiveBlending:rdT.NormalBlending,depthWrite:!ad,side:rdT.DoubleSide});
  rdM._rb=rb(0,1);rdM._rg=rb(.045,.22,1);rdRope=mesh(sph(.01),rdM._rb);rdGlow=mesh(sph(.01),rdM._rg);rdRope.frustumCulled=rdGlow.frustumCulled=false;
  rdLoop=mesh(withS(new G.TorusGeometry(.24,.02,5,16),()=>.5),rdM._rb);rdLoop.visible=false;
  rdM._rr=rb(0,.9);rdRing=mesh(withS(new G.TorusGeometry(1,.06,6,48),(x,y)=>atan2(y,x)/(2*PI)+.5),rdM._rr);rdRing.visible=false;
  for(let i=0;i<2;i++)rdHand.push(mesh(new G.TorusGeometry(.045,.008,5,14),bas(0xffffff,.7,1)));
  // ---- ash (GPU) and bursts (GPU-aged)
  const ag=new G.BufferGeometry,ap=new Float32Array(5400);for(let i=0;i<5400;i++)ap[i]=(rnd()-.5)*36+(i%3==1?18:0);ag.setAttribute('position',new G.BufferAttribute(ap,3));
  const ash=new G.Points(ag,sm(AS_V,AS_F,U,{transparent:true,depthWrite:false}));ash.frustumCulled=false;rdWorld.add(ash);
  const bg=new G.BufferGeometry;rdBuA={p:new G.BufferAttribute(new Float32Array(2700),3),v:new G.BufferAttribute(new Float32Array(2700),3),b:new G.BufferAttribute(new Float32Array(1800).fill(-9),2),c:new G.BufferAttribute(new Float32Array(2700),3)};
  bg.setAttribute('position',rdBuA.p);bg.setAttribute('vel',rdBuA.v);bg.setAttribute('bl',rdBuA.b);bg.setAttribute('col',rdBuA.c);
  rdBu=new G.Points(bg,sm(BU_V,BU_F,U,{transparent:true,depthWrite:false,blending:rdT.AdditiveBlending}));rdBu.frustumCulled=false;rdWorld.add(rdBu);
  // ---- lightning, cue ring, text
  rdBolt=mesh(sph(.01),bas(0xe8d8ff,.9,1));rdBolt.visible=false;rdBolt.frustumCulled=false;
  rdCue=mesh(new G.RingGeometry(.45,.6,32).rotateX(-PI/2),bas(0xff3060,.9,1),0,0,.02,0);rdCue.visible=false;
  const cv=document.createElement('canvas');cv.width=1024;cv.height=256;rdCtx=cv.getContext('2d');rdTex=new G.CanvasTexture(cv);
  rdM._tp=mesh(new G.PlaneGeometry(3.2,.8),new G.MeshBasicMaterial({map:rdTex,transparent:true,fog:false}),0,0,1.75,3.2);rdM._tp.rotation.y=PI;
  rdSetText('SEVENFOLD','The last rainbow is in your hands. Pull a trigger.');
  rdM.U=U;rdM.W=W;rdM.S=rdScene;rdM.C=rdCam; //@test
  return{scene:rdScene,cam:rdCam,world:rdWorld};
}
const rdHints={1:'Hold both triggers. Swing. Let go.',2:"Match a horn's colour to shatter it.",3:'Hold both triggers to block a charge.',4:'One trigger: swing the lasso. Let go. Pull.',6:'Three colour hits: clap the rainbow.',7:'Chargers: block, then strike.'};
const setP=(o,p)=>o.position.set(p[0],p[1],p[2]);

export function rdSync(S,ev,dt,H){
  const U=rdU,L=S._L.p,R=S._R.p,t=U.t.value+=dt,boss=S._en.find(e=>e._boss&&e._st!=5);
  // ---- events → effects / text
  for(const e of ev){const k=e.k,p=e.p,b=e.b;
    if(k=='hit')burst(p,b,6,2.5);else if(k=='res')burst(p,b,20,4,.5);
    else if(k=='kill'){burst(p,b,30,3,1.5,1.2);burst(p,8,40,2,2.5,1.6)}
    else if(k=='crack')burst(p,b,5,3);else if(k=='catch')burst(p,7,6,1.5);else if(k=='caught')burst(p,b,10,2);else if(k=='yank')burst(p,b,30,5,1);
    else if(k=='block'||k=='stagger')burst(p,7,k=='block'?10:40,4,1);
    else if(k=='nova'){rdNova=.6;rdRing.visible=true;setP(rdRing,[p[0],.9,p[2]]);burst(p,7,30,9,2,1);for(let i=0;i<7;i++)burst(p,i,16,8,1.5,1.2)}
    else if(k=='hurt'){rdHurt=.35;burst(S._H.p,8,30,3,1)}
    else if(k=='ready')burst(p,7,30,2,1);
    else if(k=='spawn')burst(p,8,20,1.5,2,1.4);
    else if(k=='charge'){bolt(p,[p[0]+(rnd()-.5)*4,p[1]+5,p[2]+(rnd()-.5)*4],1.5);burst(p,b,25,4,1)}
    else if(k=='cue'){rdCueT=e.d;setP(rdCue,[p[0],.02,p[2]]);rdCue.visible=true}
    else if(k=='strike'){bolt([p[0]+(rnd()-.5)*3,22,p[2]+(rnd()-.5)*3],[p[0],0,p[2]],1);burst([p[0],.3,p[2]],7,40,5,3);rdCue.visible=false}
    else if(k=='bolt')bolt([p[0]+(rnd()-.5)*8,42,p[2]+(rnd()-.5)*8],p,4);
    else if(k=='wave')rdSetText(e.d==5?'THE HERALD':e.d==10?'THE SOVEREIGN':'Wave '+e.d,e.d==5?'Block the charge. Strike while it reels.':e.d==10?'Its horn wears every colour.':rdHints[e.d]||'');
    else if(k=='clear'||k=='start'||k=='restart')rdSetText('','');
    else if(k=='over')rdSetText('The last colour is gone','Wave '+S._wave+' · Score '+S._score+' · Trigger to retry');
    else if(k=='dawn')rdSetText('Dawn','Colour returns · Score '+S._score+' · '+(S._t|0)+' s · Trigger to play again');
  }
  // ---- atmosphere: flash, hurt, dawn, fog
  if(rdFl>0)rdFl-=dt*4;U.fl.value=max(0,rdFl)*(.6+.4*rnd());
  if(rdBoltT>0){rdBoltT-=dt;rdBolt.material.opacity=rnd()<.8?.9:.2;if(rdBoltT<=0)rdBolt.visible=false}
  if(rdHurt>0)rdHurt-=dt;if(rdNova>0)rdNova-=dt;
  rdDawn=S._dawn;U.dawn.value=rdDawn;
  const fc=rdC(0x0c1018).lerp(rdC(0x7a5a66),rdDawn);if(rdHurt>0)fc.lerp(rdC(0x4a0a16),rdHurt*2);fc.lerp(rdC(0x3a2a48),max(0,rdFl)*.5);
  rdFog.color.lerp(fc,min(1,dt*8));rdFar+=((rdDawn>0?36+rdDawn*100:36)-rdFar)*dt*.5;rdFog.far=U.fogFar.value=rdFar;
  // ---- the rainbow: light, colours-as-lives, charge glow
  const m=lerp(L,R,.5),bm=S._bm;U.lp.value.set(...(S._md==3?bm.p:m));U.li.value=(S._md==3?.9:.7)+rdNova*8+S._ch*.1;U.n.value=S._light;U.g.value=S._ch>=3?1:S._ch*.12;
  rdRope.visible=rdGlow.visible=S._md!=4||rdNova<=0;
  if(rdRope.visible){rdRope.geometry.dispose();rdRope.geometry=rdGlow.geometry=new rdT.TubeGeometry(new rdT.CatmullRomCurve3(S._rp.map(p=>new rdT.Vector3(...p))),N,S._md==3?.028:.022,6)}
  const ls=S._ls;rdLoop.visible=!!ls;if(ls){const q=ls.e?hd(ls.e):ls.out?ls.p:S._rp[N],a=S._rp[N-2];setP(rdLoop,q);rdLoop.lookAt(a[0],a[1],a[2]);rdLoop.material.uniforms.a.value=1;withS(rdLoop.geometry,()=>ls.b/7+.07);rdLoop.geometry.attributes.uv.needsUpdate=true}
  if(rdRing.visible){const u=1-rdNova/.6;rdRing.scale.setScalar(.2+u*6.5);rdM._rr.uniforms.a.value=1-u;if(rdNova<=0)rdRing.visible=false}
  [S._L,S._R].forEach((h,i)=>{const o=rdHand[i];setP(o,h.p);o.quaternion.set(h.q[0],h.q[1],h.q[2],h.q[3]);o.rotateX(PI/2);o.material.opacity=h.t?.95:.5});
  // ---- shadow unicorns
  const E=rdEn,IC=E.instanceColor;let n=0;
  for(const e of S._en){if(n>=40)break;const s=e._sc*(e._st==5?max(0,1-e._tm/.35):1)*(e._fl>0?1.06:1);
    const gal=e._gal||(e._st==4?.6:0),flare=min(.95,max(e._rear,e._fl>0?1:0,e._boss&&(e._st==8||e._st==10)?1:0,e._st==5?1:0));
    place(E,n,e._p,e._yaw,s,e._rear>0?-e._rear*.8:0);IC.setXYZ(n,(e._b+flare*.9)/7+.001,e._ph/6.28,gal);n++;
    if(gal>.5&&rnd()<.35)burst([e._p[0],.05,e._p[2]],8,1,.8,.5,.9);if(e._boss&&e._st!=5)burst(hd(e),e._b,2,1.2,.6,1.1)}
  for(;n<40;n++)place(E,n,[0,-9,0],0,0);flush(E);
  if(boss&&boss._st==8&&rnd()<dt*6)bolt(hd(boss),add(hd(boss),[(rnd()-.5)*5,3+rnd()*3,(rnd()-.5)*5]),1);
  // ---- cue ring
  if(rdCue.visible){rdCueT-=dt;rdCue.material.opacity=.3+.7*(1-max(0,rdCueT)/.9)*(.7+.3*sin(t*30));rdCue.scale.setScalar(1+max(0,rdCueT)*.6);if(rdCueT<-.3)rdCue.visible=false}
  U.ps.value=H*.021;
  rdM._tp.visible=!!rdM.text.replace('\n','');
}
