// gallery.mjs — staged screenshots on the dev page for the visual pass. Usage: node tools/gallery.mjs
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const srv=spawn(process.execPath,['tools/serve.cjs','8093'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,600));
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1100,height:640}});
const errors=[];page.on('console',m=>{if(m.type()=='error')errors.push(m.text())});page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
await page.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await page.goto('http://localhost:8093/');await page.waitForSelector('#b');await page.click('#b');await page.waitForTimeout(1000);
await page.evaluate(()=>{SF.newGame(5);SF.inject({t:1},null,null);SF.step();SF.inject({t:0},null,null);SF.step(200);SF.sim._q=[]});await page.waitForTimeout(300);
const shot=n=>page.screenshot({path:`test-results/gal-${n}.png`});
const ev=(k,p,b,d)=>page.evaluate(([k,p,b,d])=>{SF.sim._ev.push({k,p,b,d})},[k,p,b,d]);
// 1 lightning close by
await ev('bolt',[6,0,22],3);await page.waitForTimeout(60);await shot('bolt');
// 2 horde: stalkers at 3-6 m, a brute, a charger
await page.evaluate(()=>{const S=SF.sim;S._en=[];const sp=(v,b,r)=>{const e=S._spawn(v,b,r);e._st=3;e._sd=99;e._gal=1;return e};sp(0,-.4,3);sp(0,.1,4.5);sp(0,.45,3.5);sp(2,-.15,6);sp(1,.3,8);const e=sp(0,0,2);e._st=1;e._tm=.5;e._rear=.9});
await page.waitForTimeout(400);await shot('horde');
// 3 Sovereign at 7 m, charge telegraph, with minions
await page.evaluate(()=>{const S=SF.sim;S._en=[];const b=S._spawn(4,0,7);b._st=8;b._tm=.6;b._rear=.9;b._yaw=Math.PI;for(let i=0;i<3;i++){const e=S._spawn(0,(i-1)*.4,4);e._st=3;e._sd=99}S._ev.push({k:'charge',p:[0,4.6,7],b:2})});
await page.waitForTimeout(400);await shot('sovereign');
// 4 nova
await page.evaluate(()=>{SF.charge()});await page.keyboard.press('KeyN');await page.waitForTimeout(250);await shot('nova');
// 5 dawn
await page.evaluate(()=>{const S=SF.sim;S._en=[];S._ws=4;S._dawn=1;S._wt=99});await page.waitForTimeout(3500);await shot('dawn');
console.log('errors',errors);await browser.close();srv.kill();
