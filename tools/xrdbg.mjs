import {chromium} from 'playwright';import {spawn} from 'node:child_process';
const srv=spawn(process.execPath,['tools/serve.cjs','8093','dist'],{stdio:'ignore',env:{...process.env,NO_REWRITE:'1'}});await new Promise(r=>setTimeout(r,500));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:960,height:600}});
p.on('console',m=>console.log('console',m.type(),m.text().slice(0,300)));p.on('pageerror',e=>console.log('pageerror',e.message.slice(0,300)));
await p.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await p.addInitScript({path:'test/xr-shim.js'});
await p.goto('http://localhost:8093/');await p.waitForFunction(()=>window.SF,{timeout:20000});
console.log('button',await p.textContent('#b'));
await p.click('#b');
for(let i=0;i<6;i++){await p.waitForTimeout(500);console.log(await p.evaluate(()=>JSON.stringify({xr:SF.state().xr,shim:__xr.state(),ws:SF.state().ws,hidden:document.getElementById('b').hidden})))}
await p.evaluate(()=>{__xr.press('right','select');__xr.release('right','select')});await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>JSON.stringify({ws:SF.state().ws,wave:SF.state().wave,xr:SF.state().xr})));
await p.evaluate(()=>__xr.sigil('lance'));await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>JSON.stringify({wp:SF.state().weapon,ev:SF.state().events.slice(-12)})));
await p.screenshot({path:'test-results/xrdbg.png'});
await p.evaluate(()=>__xr.end());await p.waitForTimeout(800);console.log(await p.evaluate(()=>JSON.stringify({xr:SF.state().xr,b:document.getElementById('b').hidden})));
await b.close();srv.kill();
