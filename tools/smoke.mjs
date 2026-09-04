// smoke.mjs — quick Playwright check of the dev page (src/) or the built dist/ in chromium.
// Usage: node tools/smoke.mjs [dev|dist] [firefox]
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const which=process.argv[2]||'dev',bn=process.argv[3]||'chromium';
const srv=spawn(process.execPath,['tools/serve.cjs','8089'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,600));
mkdirSync('test-results',{recursive:true});
const browser=await(bn=='firefox'?firefox:chromium).launch({args:bn=='firefox'?[]:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:600}});
const errors=[];page.on('console',m=>{if(m.type()=='error')errors.push(m.text())});page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
await page.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await page.goto(`http://localhost:8089/${which=='dist'?'dist/':''}`);
await page.waitForSelector('#b',{timeout:15000}).catch(()=>{});
console.log('button:',await page.textContent('#b').catch(()=>'(none)'));
await page.click('#b').catch(()=>{});
await page.waitForTimeout(1500);
await page.mouse.click(480,300);await page.waitForTimeout(300);
await page.mouse.down();await page.waitForTimeout(100);await page.mouse.up(); // trigger → start
await page.waitForTimeout(3000);
console.log('state:',JSON.stringify(await page.evaluate(()=>{const s=SF.state();return{wave:s.wave,ws:s.ws,weapon:s.weapon,light:s.light,calls:s.calls,tris:s.tris,text:s.text,ev:s.events.length}})));
await page.screenshot({path:`test-results/smoke-${which}-${bn}-1.png`});
for(const k of['5','3','2','4','1']){await page.keyboard.press(k);await page.waitForTimeout(1300);const s=await page.evaluate(()=>{const s=SF.state();return[s.weapon,s.meshes.join('+'),s.calls,s.tris]});console.log('key',k,'→',JSON.stringify(s));await page.screenshot({path:`test-results/smoke-${which}-${bn}-w${k}.png`})}
await page.waitForTimeout(8000);
console.log('state:',JSON.stringify(await page.evaluate(()=>{const s=SF.state();return{wave:s.wave,ws:s.ws,light:s.light,calls:s.calls,tris:s.tris,text:s.text}})));
await page.screenshot({path:`test-results/smoke-${which}-${bn}-2.png`});
console.log('errors:',errors.length);for(const e of errors.slice(0,10))console.log('  '+e.slice(0,300));
await browser.close();srv.kill();process.exit(errors.length?1:0);
