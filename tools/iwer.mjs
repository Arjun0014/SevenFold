// iwer.mjs — drive the built game through Meta's Immersive Web Emulation Runtime (the runtime inside the Immersive
// Web Emulator extension): real WebXR API surface, Meta Quest 3 profile, controllers with gamepads, hand tracking.
// Usage: node tools/iwer.mjs [dist|dev]
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
const which=process.argv[2]||'dist';
const srv=spawn(process.execPath,['tools/serve.cjs','8097'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,600));
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1000,height:560}});
const errors=[],warns=[];page.on('console',m=>{if(m.type()=='error')errors.push(m.text());if(m.type()=='warning')warns.push(m.text())});page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
await page.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await page.addInitScript({content:readFileSync('node_modules/iwer/build/iwer.js','utf8')+`
;(()=>{const d=new IWER.XRDevice(IWER.metaQuest3);d.installRuntime({forceInstall:true});window.__dev=d;
d.position.set(0,1.6,0);d.controllers.left.position.set(-.25,1.2,-.4);d.controllers.right.position.set(.25,1.2,-.4);
window.__anim=(fn,dur)=>new Promise(res=>{const t0=performance.now();const f=()=>{const u=Math.min(1,(performance.now()-t0)/dur);fn(u);if(u<1)requestAnimationFrame(f);else res()};f()});
window.__btn=(h,id,v)=>d.controllers[h].updateButtonValue(id,v);})();`});
await page.goto(`http://localhost:8097/${which=='dist'?'dist/':''}`);await page.waitForFunction(()=>window.SF,{timeout:20000});
const log=(...a)=>console.log(...a);const st=()=>page.evaluate(()=>{const s=SF.state();return{xr:s.xr,ws:s.ws,wave:s.wave,mode:s.mode,light:s.light,calls:s.calls,tris:s.tris,ev:s.events.slice(-14).join(',')}});
const shot=n=>page.screenshot({path:`test-results/iwer-${n}.png`});
log('button:',await page.textContent('#b'));
await page.click('#b');await page.waitForTimeout(1500);log('after ENTER VR',JSON.stringify(await st()));await shot('enter');
// start the game: pull the right trigger
await page.evaluate(()=>__btn('right','trigger',1));await page.waitForTimeout(150);await page.evaluate(()=>__btn('right','trigger',0));await page.waitForTimeout(2500);
log('after trigger',JSON.stringify(await st()));await shot('started');
// arch: both triggers
await page.evaluate(()=>{__btn('left','trigger',1);__btn('right','trigger',1)});await page.waitForTimeout(400);log('both triggers',JSON.stringify(await st()));await shot('arch');
// throw: swing forward over 250 ms, release both
await page.evaluate(()=>__anim(u=>{const z=-.4-.9*u*u,y=1.2+.15*Math.sin(u*Math.PI);__dev.controllers.left.position.set(-.25,y,z);__dev.controllers.right.position.set(.25,y,z);if(u>=.8){__btn('left','trigger',0);__btn('right','trigger',0)}},260));
await page.waitForTimeout(300);log('after swing',JSON.stringify(await st()));await shot('thrown');await page.waitForTimeout(2000);log('after flight',JSON.stringify(await st()));
await page.evaluate(()=>{__dev.controllers.left.position.set(-.25,1.2,-.4);__dev.controllers.right.position.set(.25,1.2,-.4)});await page.waitForTimeout(300);
// lasso: right trigger held, spin, release
await page.evaluate(()=>__btn('right','trigger',1));await page.waitForTimeout(500);log('one trigger held',JSON.stringify(await st()));
await page.evaluate(()=>__anim(u=>{const a=u*20;__dev.controllers.right.position.set(Math.sin(a)*.35,1.7+Math.cos(a)*.1,-.2-Math.cos(a)*.35);if(u>=.9)__btn('right','trigger',0)},900));
await page.waitForTimeout(1500);log('after lasso swing',JSON.stringify(await st()));await shot('lasso');
await page.evaluate(()=>__dev.controllers.right.position.set(.25,1.2,-.4));await page.waitForTimeout(500);
// sigils: both grips, draw a circle, release → the boomerang launches; a cross → the lasso; raise-and-slam → Nova when charged
await page.waitForFunction(()=>SF.state().mode==0,null,{timeout:6000}).catch(()=>{});await page.waitForTimeout(600);
await page.evaluate(()=>{__btn('left','squeeze',1);__btn('right','squeeze',1)});await page.waitForTimeout(150);
await page.evaluate(()=>__anim(u=>{const a=u*6.6;__dev.controllers.left.position.set(-.1+Math.sin(a)*.2,1.3+Math.cos(a)*.2,-.5);__dev.controllers.right.position.set(.1+Math.sin(a)*.2,1.3+Math.cos(a)*.2,-.5)},900));
await page.evaluate(()=>{__btn('left','squeeze',0);__btn('right','squeeze',0)});await page.waitForTimeout(400);log('circle sigil',JSON.stringify(await st()));await shot('sigil');await page.waitForTimeout(2500);
await page.evaluate(()=>{__dev.controllers.left.position.set(-.25,1.2,-.4);__dev.controllers.right.position.set(.25,1.2,-.4)});await page.waitForTimeout(500);
// hand tracking: pinch
await page.evaluate(()=>{__dev.primaryInputMode='hand';__dev.hands.left.position.set(-.25,1.2,-.4);__dev.hands.right.position.set(.25,1.2,-.4)});await page.waitForTimeout(800);log('hands mode',JSON.stringify(await st()));
await page.evaluate(()=>{__dev.hands.right.updatePinchValue(1)});await page.waitForTimeout(600);log('right pinch',JSON.stringify(await st()));
await page.evaluate(()=>{__dev.hands.left.updatePinchValue(1)});await page.waitForTimeout(400);log('both pinches',JSON.stringify(await st()));await shot('hands');
await page.evaluate(()=>{__dev.hands.left.updatePinchValue(0);__dev.hands.right.updatePinchValue(0);__dev.primaryInputMode='controller'});await page.waitForTimeout(800);
// let the game run a while with the controllers still (wave 1 arrives), then end the session
await page.waitForTimeout(6000);log('later',JSON.stringify(await st()));await shot('wave1');
await page.evaluate(()=>__dev.activeSession.end());await page.waitForTimeout(1200);log('after end',JSON.stringify(await st()),'button:',await page.textContent('#b'));await shot('exit');
log('errors:',errors.length);for(const e of errors.slice(0,10))log('  '+e.slice(0,400));log('warnings:',warns.length);for(const w of warns.slice(0,6))log('  '+w.slice(0,300));
await browser.close();srv.kill();process.exit(errors.length?1:0);
