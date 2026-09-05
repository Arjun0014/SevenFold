import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const srv=spawn(process.execPath,['tools/serve.cjs','8099'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,600));
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:900,height:520}});
await page.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await page.goto('http://localhost:8099/');await page.waitForFunction(()=>window.SF);await page.click('#b');await page.waitForTimeout(500);
await page.mouse.click(450,260);await page.mouse.down();await page.waitForTimeout(80);await page.mouse.up();await page.waitForTimeout(1500);
await page.evaluate(()=>{const s=SF.sim;s._en=[];s._q=[];const e=s._spawn(0,0,1.1);e._st=3;e._sd=99;e._yaw=Math.atan2(s._H.p[0]-e._p[0],s._H.p[2]-e._p[2]);window.__e=e});
const dump=async(tag)=>console.log(tag,await page.evaluate(()=>{const s=SF.sim,e=__e,f=a=>a.map(x=>+x.toFixed(2));const hd=[e._p[0]+Math.sin(e._yaw)*.75,1.35,e._p[2]+Math.cos(e._yaw)*.75];
  let best=9;for(const p of s._rp){const d=Math.hypot(p[0]-hd[0],p[1]-hd[1],p[2]-hd[2])-.3,b=Math.hypot(p[0]-e._p[0],p[1]-.8,p[2]-e._p[2])-.5;best=Math.min(best,d,b)}
  return JSON.stringify({md:s._md,ws:s._ws,L:f(s._L.p),R:f(s._R.p),Lv:+Math.hypot(...s._L.v).toFixed(1),Rv:+Math.hypot(...s._R.v).toFixed(1),ep:f(e._p),hd:f(hd),best:+best.toFixed(2),hp:e._hp,st:e._st,ev:SF.state().events.slice(-5).join(',')})}));
await dump('start');
await page.keyboard.down('KeyB');await page.waitForTimeout(150);await dump('B');
await page.keyboard.down('KeyA');for(let i=0;i<8;i++){await page.waitForTimeout(60);await dump('A'+i)}await page.keyboard.up('KeyA');
await page.keyboard.down('KeyD');for(let i=0;i<10;i++){await page.waitForTimeout(60);await dump('D'+i)}await page.keyboard.up('KeyD');
await page.waitForTimeout(500);await page.keyboard.up('KeyB');await dump('end');
await browser.close();srv.kill();
