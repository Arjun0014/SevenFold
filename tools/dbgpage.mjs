import {chromium} from 'playwright';import {spawn} from 'node:child_process';
const srv=spawn(process.execPath,['tools/serve.cjs','8089'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,600));
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:600}});const errors=[];page.on('console',m=>{if(m.type()=='error')errors.push(m.text())});page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
await page.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await page.goto('http://localhost:8089/');await page.waitForSelector('#b');await page.click('#b');await page.waitForTimeout(800);
await page.mouse.click(480,300);await page.mouse.down();await page.waitForTimeout(80);await page.mouse.up();await page.waitForTimeout(500);
console.log(await page.evaluate(()=>{const s=SF.sim;return JSON.stringify({ws:s._ws,L:s._L,R:s._R,H:s._H})}));
await page.evaluate(()=>SF.sigil(5));
for(let i=0;i<10;i++){await page.waitForTimeout(120);console.log(await page.evaluate(()=>{const s=SF.sim;return JSON.stringify({t:+s._t.toFixed(2),fg:s._fg.on,cd:+s._fg.cd.toFixed(2),M:s._fg.M.length,wp:s._wp,Lg:s._L.g,Rg:s._R.g,Lp:s._L.p.map(x=>+x.toFixed(2)),Rp:s._R.p.map(x=>+x.toFixed(2)),feat:s._feat&&Object.fromEntries(Object.entries(s._feat).map(([k,v])=>[k,+(+v).toFixed(2)]))})}))}
console.log('errors',errors);await browser.close();srv.kill();
