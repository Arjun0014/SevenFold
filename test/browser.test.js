// browser.test.js — Playwright (chromium + firefox) against the UNZIPPED dist/sevenfold.zip (docs/07 B).
// Run: node test/browser.test.js [chromium|firefox] [--xr]
import {chromium,firefox} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const THREE='https://play.js13kgames.com/2026/webxr/three.js',PORT=8090;
const only=process.argv.slice(2).filter(a=>!a.startsWith('--'))[0];
const browsers=only?[only]:['chromium','firefox'];
const results=[];let fails=0;

// ---- unzip dist/sevenfold.zip (single entry, raw deflate) into a temp dir and serve it
const zip=readFileSync('dist/sevenfold.zip');
if(zip.readUInt32LE(0)!==0x04034b50)throw new Error('not a zip');
const nameLen=zip.readUInt16LE(26),extraLen=zip.readUInt16LE(28),csize=zip.readUInt32LE(18),method=zip.readUInt16LE(8);
const name=zip.toString('utf8',30,30+nameLen);if(name!=='index.html')throw new Error('zip entry is '+name);
const start=30+nameLen+extraLen,body=zip.subarray(start,start+csize);
const html=method===8?inflateRawSync(body):body;
const dir=join(tmpdir(),'sevenfold-dist');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'index.html'),html);
mkdirSync('test-results',{recursive:true});
const srv=spawn(process.execPath,['tools/serve.cjs',String(PORT),dir],{stdio:'ignore',env:{...process.env,NO_REWRITE:'1'}}); // serve the dist byte-for-byte (no dev URL rewrite)
await new Promise(r=>setTimeout(r,500));

// ---- hosted three.js: the host sends no Access-Control-Allow-Origin header, so a cross-origin module import from
// localhost is blocked by CORS in every browser (the entry is same-origin on play.js13kgames.com). Tests therefore
// route that exact URL to the byte-identical local copy (tools/three-hosted-r185.js); the shipped HTML is untouched.
const useLocal=true;if(!existsSync('tools/three-hosted-r185.js'))throw new Error('missing tools/three-hosted-r185.js — run: node tools/serve.cjs once (it downloads the hosted file)');
console.log('three.js source: local copy of '+THREE+' via page.route (CORS: no ACAO header on the host)');

const replay=JSON.parse(readFileSync('test/replays/w1-2.json','utf8'));

async function runBrowser(bn){
  const browser=await(bn=='firefox'?firefox:chromium).launch({args:bn=='firefox'?[]:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await browser.newContext({viewport:{width:960,height:600}});
  const errors=[];let pass=0;const log=[];
  const attach=p=>{p.on('console',m=>{if(m.type()=='error')errors.push(m.text())});p.on('pageerror',e=>errors.push('PAGEERROR '+e.message));if(useLocal)p.route(THREE,r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}))};
  const test=async(name,fn)=>{const e0=errors.length;try{await fn();if(errors.length>e0)throw new Error('console errors: '+errors.slice(e0).join(' | ').slice(0,400));pass++;log.push([name,'ok']);console.log(`  [${bn}] ok   ${name}`)}catch(e){fails++;log.push([name,'FAIL']);console.log(`  [${bn}] FAIL ${name}\n         ${String(e.message).slice(0,600)}`)}};
  const page=await ctx.newPage();attach(page);
  const state=()=>page.evaluate(()=>SF.state());
  const shot=n=>page.screenshot({path:`test-results/${bn}-${n}.png`});
  const stepFrames=async(from,to)=>{for(let i=from;i<to;i+=450)await page.evaluate(([fr])=>{for(const f of fr){SF.inject({p:f[0],q:f[1],t:f[2],g:f[3]},{p:f[4],q:f[5],t:f[6],g:f[7]},{p:f[8],q:f[9]});SF.step()}},[replay.frames.slice(i,Math.min(to,i+450))])};
  let webgl=true,maxCalls=0,maxTris=0;

  await test('boot: title, PLAY ON DESKTOP, zero errors',async()=>{
    await page.goto(`http://localhost:${PORT}/`);await page.waitForFunction(()=>window.SF||document.getElementById('u').textContent,{timeout:20000});
    if(!(await page.evaluate(()=>!!window.SF))){webgl=false;const msg=await page.textContent('#u');throw new Error('no renderer: '+msg)}
    const b=await page.textContent('#b');if(b!='PLAY ON DESKTOP')throw new Error('button: '+b);
    const s=await state();if(!s.text.includes('SEVENFOLD'))throw new Error('title text missing: '+s.text);await shot('boot')});
  if(!webgl){console.log(`  [${bn}] WebGL unavailable in headless; remaining tests skipped (boot message test passed only if no console errors)`);
    results.push({browser:bn,pass,total:1,log,errors:errors.length});await browser.close();return}

  await test('desktop play: replay of the perfect bot reaches wave 3, budget within limits',async()=>{
    await page.click('#b');await page.waitForTimeout(500);
    await page.evaluate(s=>{SF.manual=1;SF.newGame(s)},replay.seed);
    const n=replay.frames.length;for(let i=0;i<n;i+=900){await stepFrames(i,Math.min(n,i+900));await page.waitForTimeout(50);const s=await state();maxCalls=Math.max(maxCalls,s.calls);maxTris=Math.max(maxTris,s.tris);if(i==1800)await shot('wave1')}
    const s=await state();if(s.wave<3)throw new Error('reached wave '+s.wave+' ws '+s.ws+' light '+s.light);await shot('wave3');
    console.log(`         waves 1-2 replayed: wave ${s.wave}, light ${s.light}, max draw calls ${maxCalls}, max tris ${maxTris}`)});
  await test('render budget: draw calls < 70, triangles < 120k',async()=>{if(!(maxCalls>0&&maxCalls<70&&maxTris<120000))throw new Error(`calls ${maxCalls} tris ${maxTris}`)});

  for(const[k,w]of[['5','lance'],['3','halo'],['2','maul'],['4','prism'],['1','shards']])await test(`forge key ${k} → ${w} mesh`,async()=>{
    await page.evaluate(()=>{SF.manual=0});await page.keyboard.press(k);await page.waitForTimeout(1400);
    const s=await state();if(s.weapon!=w||!s.meshes.includes(w))throw new Error(`weapon ${s.weapon} meshes ${s.meshes}`);await shot('forge-'+w)});

  await test('raw forms via injection: crack, arrow, block/absorb events',async()=>{
    await page.evaluate(()=>{SF.manual=1;SF.newGame(7);SF.inject({t:1},null,null);SF.step();SF.inject({t:0},null,null);SF.step(100)}); // start, wave 1 begins
    await page.evaluate(()=>{const H={p:[0,1.6,0],q:[0,1,0,0]},inj=(L,R,f={})=>{SF.inject({p:L,q:[0,1,0,0],t:f.Lt|0,g:0},{p:R,q:[0,1,0,0],t:f.Rt|0,g:0},H);SF.step()};
      const DT=1/90;for(let i=0;i<30;i++)inj([-.2,1,-.2],[.2,1,-.2]);
      for(let i=0;i<120;i++){const t=i*DT;let z,y;if(t<.25){const u=t/.25;z=-.2+.9*u;y=1+.6*Math.sin(u*Math.PI)}else{z=.7;y=1}inj([-.2,y,z],[.2,y,z])}
      const L=[-.45,1.2,.5],R=[.45,1.2,.5];for(let i=0;i<40;i++)inj(L,R);
      SF.orb([0,1.2,3],[0,0,-6],3);for(let i=0;i<60;i++)inj(L,R);
      inj(L,R,{Rt:1});const P=[.45,1.2,.1];for(let i=1;i<=20;i++)inj(L,[.45,1.2,.5-.4*i/20],{Rt:1});for(let i=0;i<3;i++)inj(L,P,{Rt:1});inj(L,P);for(let i=0;i<5;i++)inj(L,P)});
    await page.waitForTimeout(200);const ev=(await state()).events; // events are drained by the animation loop
    for(const k of['crack','arrow'])if(!ev.includes(k))throw new Error('missing '+k+' in '+ev);
    if(!ev.includes('block')&&!ev.includes('absorb'))throw new Error('missing block/absorb in '+ev)});

  await test('game over: idle until Light 0, text shown; R restarts at wave 1',async()=>{
    await page.evaluate(()=>{SF.manual=1;SF.newGame(3);SF.inject({t:1},null,null);SF.step();SF.inject({t:0},null,null)});
    let s;for(let i=0;i<40&&!(s=await state()).text.includes('Light is gone');i++)await page.evaluate(()=>SF.step(90));
    if(!s.text.includes('The Light is gone')||s.ws!=3)throw new Error(`ws ${s.ws} light ${s.light} text ${s.text}`);await shot('gameover');
    await page.evaluate(()=>{SF.manual=0});await page.keyboard.press('r');await page.waitForTimeout(1800);s=await state();
    if(s.wave!=1||s.ws!=1)throw new Error(`after R: wave ${s.wave} ws ${s.ws}`)});

  await test('resize + fullscreen toggle: no errors',async()=>{await page.setViewportSize({width:700,height:900});await page.waitForTimeout(200);await page.setViewportSize({width:960,height:600});await page.waitForTimeout(200);await page.keyboard.press('f');await page.waitForTimeout(400);await page.keyboard.press('f');await page.waitForTimeout(600)});

  await test('mute persists across reload; best score saved',async()=>{
    const m0=(await state()).mute;await page.keyboard.press('m');await page.waitForTimeout(100);const m1=(await state()).mute;if(m1==m0)throw new Error('mute did not toggle');
    const best=await page.evaluate(()=>localStorage.getItem('sevenfold_best'));if(!best||!JSON.parse(best).wave)throw new Error('best score not saved: '+best);
    await page.reload();await page.waitForFunction(()=>window.SF,{timeout:20000});if((await state()).mute!=m1)throw new Error('mute not persisted');await page.keyboard.press('m')});

  await test('offline: three.js unreachable → friendly message, no console errors',async()=>{
    const p2=await ctx.newPage();const e2=[];p2.on('pageerror',e=>e2.push(e.message));p2.on('console',m=>{if(m.type()=='error'&&!/net::|Failed to load|NetworkError|CORS|Loading failed|blocked|MIME/i.test(m.text()))e2.push(m.text())});
    await p2.route(THREE,r=>r.abort());await p2.goto(`http://localhost:${PORT}/`);await p2.waitForFunction(()=>document.getElementById('u').textContent.length>10,{timeout:15000});
    const t=await p2.textContent('#u');if(!/Three\.js/.test(t))throw new Error('message: '+t);if(e2.length)throw new Error('errors: '+e2.join('|'));await p2.screenshot({path:`test-results/${bn}-offline.png`});await p2.close()});

  if(bn=='chromium'&&existsSync('test/xr-shim.js')&&process.argv.includes('--xr')){
    await test('XR shim: enter immersive-vr, 300 frames, Lance sigil via fake grips, exit',async()=>{
      const p3=await ctx.newPage();attach(p3);await p3.addInitScript({path:'test/xr-shim.js'});
      await p3.goto(`http://localhost:${PORT}/`);await p3.waitForFunction(()=>window.SF,{timeout:20000});
      const b=await p3.textContent('#b');if(b!='ENTER VR')throw new Error('button: '+b);
      await p3.click('#b');await p3.waitForFunction(()=>SF.state().xr,{timeout:10000});
      await p3.evaluate(()=>__xr.frames(300));await p3.waitForTimeout(300);
      await p3.evaluate(()=>__xr.press('right','select'));await p3.waitForTimeout(100);await p3.evaluate(()=>__xr.release('right','select'));await p3.waitForTimeout(1200);
      const r=await p3.evaluate(async()=>{await __xr.sigil('lance');return SF.state()});if(r.weapon!='lance')throw new Error('weapon after sigil: '+r.weapon);
      await p3.screenshot({path:`test-results/${bn}-xr.png`});await p3.evaluate(()=>__xr.end());await p3.waitForFunction(()=>!SF.state().xr,{timeout:5000});
      await p3.waitForTimeout(500);const s=await p3.evaluate(()=>SF.state());if(s.xr)throw new Error('still in XR');await p3.close()});
  }
  results.push({browser:bn,pass,total:log.length,log,errors:errors.length});
  if(errors.length)console.log(`  [${bn}] console errors seen: `+errors.slice(0,5).join(' | ').slice(0,500));
  await browser.close();
}
for(const bn of browsers){try{await runBrowser(bn)}catch(e){fails++;console.log(`  [${bn}] launch/run failed: ${e.message.split('\n')[0]}`);results.push({browser:bn,pass:0,total:0,log:[['launch','FAIL']],errors:0})}}
srv.kill();
console.log('\nbrowser × test');
const names=[...new Set(results.flatMap(r=>r.log.map(l=>l[0])))];
console.log('test'.padEnd(64)+results.map(r=>r.browser.padEnd(10)).join(''));
for(const n of names)console.log(n.slice(0,62).padEnd(64)+results.map(r=>((r.log.find(l=>l[0]==n)||[0,'-'])[1]).padEnd(10)).join(''));
console.log(results.map(r=>`${r.browser}: ${r.pass}/${r.total}`).join('  '));
process.exit(fails?1:0);
