// Verify: every InstancedMesh using the world shader has instanceColor blue == 0 for static scenery (trees, stones, ground).
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const srv=spawn(process.execPath,['tools/serve.cjs','8091'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,600));
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:900,height:500}});
const errors=[];page.on('console',m=>{if(m.type()=='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));
await page.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await page.goto('http://localhost:8091/');
await page.waitForSelector('#b',{timeout:15000});await page.waitForTimeout(1500);
const r=await page.evaluate(()=>{const out=[];SF.rd.S.traverse(o=>{if(o.isInstancedMesh){const a=o.instanceColor.array;let nz=0;for(let i=2;i<a.length;i+=3)if(a[i]!=0)nz++;out.push({count:o.count,blueNonZero:nz})}});return out});
console.log(JSON.stringify(r),'errors:',errors);
await browser.close();srv.kill();
process.exit(r.every(x=>x.blueNonZero==0)&&!errors.length?0:1);
