def sub(p,pairs):
    s=open(p,encoding='utf8').read()
    for a,b in pairs:
        assert s.count(a)==1,(p,a[:90])
        s=s.replace(a,b)
    open(p,'w',encoding='utf8').write(s)
sub('src/render.js',[
("""  const tg=new G.BufferGeometry;tg.setAttribute('position',new G.BufferAttribute(new Float32Array(200*3),3));rdTrail=new G.Line(tg,new G.LineBasicMaterial({color:0xffffff}));rdTrail.frustumCulled=false;rdTrail.visible=false;rdWorld.add(rdTrail);
""",""),
("""  // ---- forge feedback: desaturate, slow-mo trail
  rdDes+=((S._fg.on?1:0)-rdDes)*min(1,dt*8);rdM._rb.uniforms.d.value=rdM._rbg.uniforms.d.value=rdDes;
  if(S._fg.on){const M=S._fg.M,n=min(200,M.length),pa=rdTrail.geometry.attributes.position,y=Math.atan2(S._H.q[1],S._H.q[3])*2;
    for(let i=0;i<n;i++){const m=M[M.length-n+i];pa.setXYZ(i,S._H.p[0]-cos(y+PI)*m[0]+sin(y+PI)*m[2],S._H.p[1]+m[1],S._H.p[2]+sin(y+PI)*m[0]+cos(y+PI)*m[2])}
    pa.needsUpdate=true;rdTrail.geometry.setDrawRange(0,n);rdTrail.visible=n>1}else rdTrail.visible=false;""",
"""  // ---- forge feedback: the rope turns white, fog darkens (slow-mo is in the sim)
  rdDes+=((S._fg.on?1:0)-rdDes)*min(1,dt*8);rdM._rb.uniforms.d.value=rdM._rbg.uniforms.d.value=rdDes;"""),
("""  rdM._arc=mesh(withS(new G.TorusGeometry(2.6,.06,6,40,PI),(x,y)=>atan2(y,x)/PI),rbMat(0,1),U,0,.5,0,0,0,0);
""",""),
("""  if(rdDawn>=0){rdDawn=min(6,rdDawn+dt);const u=rdDawn/6;rdFog.color.lerp(rdC(0x2a1a2e),u*.1);rdM._moon.material.color.lerp(rdC(0xffffff),dt*.3);rdM._arc.scale.setScalar(u);rdM._arc.material.uniforms.d.value=0}
  else rdM._arc.scale.setScalar(0);""",
"""  if(rdDawn>=0){rdDawn+=dt;rdFog.color.lerp(rdC(0x2a1a2e),dt*.2)}"""),
("""  const lg=new G.BufferGeometry;lg.setAttribute('position',new G.BufferAttribute(new Float32Array(72),3));rdLine=new G.LineSegments(lg,new G.LineBasicMaterial({color:0xeaf4ff}));rdLine.frustumCulled=false;rdLine.visible=false;rdWorld.add(rdLine);
""","""  rdLine=mesh(cyl(.25,.5,14,6),bas(0xeaf4ff,.8,1),0,0,7,0);rdLine.visible=false;
"""),
("""    else if(k=='strike'){if(boss&&boss._boss==0){rdBolt=.3;rdM._boltTo=p}else{setP(rdM._crack,[p[0],.3,p[2]]);rdM._crack.scale.setScalar(3);rdM._crack.visible=true;rdCrack=.3}}""",
"""    else if(k=='strike'){if(boss&&boss._boss==0){rdBolt=.3;setP(rdLine,[p[0],7,p[2]]);rdLine.visible=true}else{setP(rdM._crack,[p[0],.3,p[2]]);rdM._crack.scale.setScalar(3);rdM._crack.visible=true;rdCrack=.3}}"""),
("""  if(rdBolt>0){rdBolt-=dt;if(boss){const pa=rdLine.geometry.attributes.position,a=boss._p,b=rdM._boltTo;let q=a;for(let i=0;i<12;i++){const u=(i+1)/12,n=[0,1,2].map(j=>a[j]+(b[j]-a[j])*u+(Math.random()-.5)*(1-u));pa.setXYZ(i*2,...q);pa.setXYZ(i*2+1,...n);q=n}pa.needsUpdate=true;rdLine.geometry.setDrawRange(0,24)}rdLine.visible=true}else rdLine.visible=false;""",
"""  if(rdBolt>0){rdBolt-=dt;rdLine.material.opacity=rdBolt*3;rdLine.scale.x=rdLine.scale.z=.6+Math.random()*.8}else rdLine.visible=false;"""),
("const rdHints={1:'Swing the rainbow.',2:'Pull it taut. Strike.',3:'Taut blocks orbs.',5:'Hold both grips. Stretch.',6:'Hold grips. Raise, slam.',7:'Hold grips. Circle.',9:'Hold grips. Cross, pull apart.',10:'Hold grips. Wring.'};",
 "const rdHints={1:'Swing the rainbow.',3:'Taut blocks orbs.',5:'Hold both grips. Stretch.',6:'Grips. Raise, slam.',7:'Grips. Circle.',9:'Grips. Cross, pull apart.',10:'Grips. Wring.'};"),
("c.clearRect(0,0,1024,256);c.fillStyle='#fff';c.textAlign='center';c.shadowColor='#3aa3ff';c.shadowBlur=24;","c.clearRect(0,0,1024,256);c.fillStyle='#fff';c.textAlign='center';"),
("let rdT,rdScene,rdCam,rdWorld,rdFog,rdRope,rdGlow,rdPts,rdPP,rdPC,rdLife=[],rdVel=[],rdCtx,rdTex,rdDawn=-1,rdFlash=0,rdDes=0,rdLine,rdTrail,rdBolt=0,",
 "let rdT,rdScene,rdCam,rdWorld,rdFog,rdRope,rdGlow,rdPts,rdPP,rdPC,rdLife=[],rdVel=[],rdCtx,rdTex,rdDawn=-1,rdFlash=0,rdDes=0,rdLine,rdBolt=0,"),
])
sub('build.js',[
("const css='body{margin:0;background:#070a14;color:#dfe6ff;font-family:sans-serif;overflow:hidden}canvas{display:block}#b{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font:bold 28px sans-serif;padding:18px 40px;background:#12141c;color:#fff;border:2px solid #6a5cff;border-radius:8px;cursor:pointer}#h{position:fixed;left:8px;bottom:8px;font-size:12px;opacity:.6}#u{position:fixed;left:0;right:0;top:40%;text-align:center;font-size:20px;padding:20px}';",
 "const css='body{margin:0;background:#070a14;color:#dfe6ff;font:14px sans-serif;overflow:hidden}canvas{display:block}#b{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font:bold 28px sans-serif;padding:18px 40px;background:#12141c;color:#fff;border:2px solid #6a5cff}#h{position:fixed;left:8px;bottom:8px;font-size:12px;opacity:.6}#u{position:fixed;left:0;right:0;top:40%;text-align:center;font-size:20px}';"),
])
sub('src/main.js',[
("import {rdInit,rdSync,rdM,rdWeapons} from './render.js';","import {rdInit,rdSync,rdM,rdWeapons} from './render.js';\nimport {auInit,auSync} from './audio.js';"),
("  xrInit(R,mB,()=>{started=1;mH.hidden=xrS.sup},","  xrInit(R,mB,()=>{started=1;mH.hidden=xrS.sup;auInit()},"),
("    rdSync(sim,ev,dt,mute);","    rdSync(sim,ev,dt);auSync(sim,ev,mute);"),
])
print('ok')
