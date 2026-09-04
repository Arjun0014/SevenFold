import {chromium} from 'playwright';import {spawn} from 'node:child_process';
const srv=spawn(process.execPath,['tools/serve.cjs','8094'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,500));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:480,height:300}});
p.on('pageerror',e=>console.log('pageerror',e.message.slice(0,300)));
await p.goto('http://localhost:8094/');await p.waitForFunction(()=>window.SF,{timeout:20000});await p.click('#b');await p.waitForTimeout(800);
const list=await p.evaluate(async()=>{const m=await import('/src/render.js');const W=m.rdM._uni.parent;window.__W=W;return W.children.map((c,i)=>i+':'+c.type+':'+(c.geometry?c.geometry.type:'')+':'+(c.material?c.material.type:'')+'@'+c.position.toArray().map(x=>+x.toFixed(1)).join(',')+(c.visible?'':'(hidden)'))});
console.log(list.join('\n'));
for(let i=0;i<list.length;i++){await p.evaluate(i=>{__W.children.forEach((c,j)=>{c.userData.v=c.userData.v??c.visible;c.visible=j==i&&c.userData.v})},i);await p.waitForTimeout(80);await p.screenshot({path:`test-results/scene-${i}.png`})}
await p.evaluate(()=>__W.children.forEach(c=>c.visible=c.userData.v));
await b.close();srv.kill();
