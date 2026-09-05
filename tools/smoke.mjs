// smoke.mjs — Playwright look-and-boot check of the dev page (src/) or the built dist/. Usage: node tools/smoke.mjs [dev|dist] [firefox]
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const which=process.argv[2]||'dev',bn=process.argv[3]||'chromium';
const srv=spawn(process.execPath,['tools/serve.cjs','8089'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,600));
mkdirSync('test-results',{recursive:true});
const browser=await(bn=='firefox'?firefox:chromium).launch({args:bn=='firefox'?[]:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1100,height:640}});
const errors=[];page.on('console',m=>{if(m.type()=='error'||m.type()=='warning')errors.push(m.type()+': '+m.text())});page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
await page.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await page.goto(`http://localhost:8089/${which=='dist'?'dist/':''}`);
await page.waitForSelector('#b',{timeout:15000}).catch(()=>{});
console.log('button:',await page.textContent('#b').catch(()=>'(none)'));
await page.click('#b').catch(()=>{});
await page.waitForTimeout(2500);
const shot=n=>page.screenshot({path:`test-results/smoke-${which}-${n}.png`});
await shot('title');
await page.mouse.click(550,320);await page.waitForTimeout(300);
await page.mouse.down();await page.waitForTimeout(100);await page.mouse.up(); // trigger → start
const st=async()=>{const s=await page.evaluate(()=>{const s=SF.state();return{wave:s.wave,ws:s.ws,mode:s.mode,light:s.light,calls:s.calls,tris:s.tris,text:s.text.replace('\n',' | '),ev:s.events.slice(-12).join(',')}});console.log(JSON.stringify(s));return s};
for(let i=0;i<9;i++){await page.waitForTimeout(2000);await st();await shot('w'+i);if(i>=2&&i%2==0){await page.keyboard.press('Space')}}
await page.keyboard.down('KeyB');await page.waitForTimeout(700);await shot('arch');await page.keyboard.up('KeyB');
await page.keyboard.press('KeyG');await page.waitForTimeout(500);await shot('lasso1');await page.waitForTimeout(500);await shot('lasso2');await page.waitForTimeout(1500);await st();
console.log('errors:',errors.length);for(const e of errors.slice(0,12))console.log('  '+e.slice(0,400));
await browser.close();srv.kill();process.exit(errors.length?1:0);
