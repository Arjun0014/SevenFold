import {chromium} from 'playwright';import {spawn} from 'node:child_process';
const srv=spawn(process.execPath,['tools/serve.cjs','8094'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,500));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:960,height:600}});
p.on('pageerror',e=>console.log('pageerror',e.message.slice(0,300)));
await p.goto('http://localhost:8094/');await p.waitForFunction(()=>window.SF,{timeout:20000});await p.click('#b');await p.waitForTimeout(800);
await p.mouse.click(480,300);await p.mouse.down();await p.waitForTimeout(80);await p.mouse.up();await p.waitForTimeout(500);
await p.keyboard.press('5');await p.waitForTimeout(1500);
console.log(await p.evaluate(async()=>{const m=await import('/src/render.js');const l=m.rdM.lance;const s=SF.sim;return JSON.stringify({wp:s._wp,vis:l.visible,pos:l.position.toArray().map(x=>+x.toFixed(2)),q:l.quaternion.toArray().map(x=>+x.toFixed(2)),L:s._L.p.map(x=>+x.toFixed(2)),R:s._R.p.map(x=>+x.toFixed(2)),bb:(()=>{l.geometry.computeBoundingBox();return l.geometry.boundingBox.min.toArray().concat(l.geometry.boundingBox.max.toArray()).map(x=>+x.toFixed(2))})(),uv:[...l.geometry.attributes.uv.array.slice(0,8)].map(x=>+x.toFixed(2)),d:l.material.uniforms.d.value})}));
await p.screenshot({path:'test-results/lancedbg.png'});await b.close();srv.kill();
