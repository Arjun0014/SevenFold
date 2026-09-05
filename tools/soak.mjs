// soak.mjs — full-game play-through in the browser: the Node bot drives the page's sim (dev page), the renderer draws,
// screenshots at each wave and any console error fails. Usage: node tools/soak.mjs [seed]
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const seed=+process.argv[2]||1;
const srv=spawn(process.execPath,['tools/serve.cjs','8096'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,600));
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1100,height:640}});
const errors=[];page.on('console',m=>{if(m.type()=='error')errors.push(m.text())});page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
await page.route('https://play.js13kgames.com/2026/webxr/three.js',r=>r.fulfill({path:'tools/three-hosted-r185.js',contentType:'text/javascript'}));
await page.goto('http://localhost:8096/');await page.waitForSelector('#b');await page.click('#b');await page.waitForTimeout(800);
await page.evaluate(async s=>{const m=await import('/test/bot.js');SF.manual=1;SF.newGame(s);window.__bot=m.makeBot(SF.sim);window.__steps=0;
  const tick=()=>{if(SF.sim._ws<3||SF.sim._ws==4&&SF.sim._dawn<1){for(let i=0;i<8;i++){__bot.step();__steps++}}requestAnimationFrame(tick)};tick()},seed);
let last=-1,t0=Date.now();
while(Date.now()-t0<420000){await page.waitForTimeout(700);const s=await page.evaluate(()=>{const S=SF.sim;return{wave:S._wave,ws:S._ws,light:S._light,t:S._t|0,dawn:S._dawn,calls:SF.R.info.render.calls,tris:SF.R.info.render.triangles,en:S._en.length,steps:__steps}});
  if(s.wave!=last){last=s.wave;console.log(JSON.stringify(s));await page.waitForTimeout(1500);await page.screenshot({path:`test-results/soak-w${s.wave}.png`})}
  if(s.ws==3){console.log('DIED',JSON.stringify(s));break}
  if(s.ws==4&&s.dawn>=1){console.log('DAWN',JSON.stringify(s));await page.screenshot({path:'test-results/soak-dawn.png'});break}}
// boss close-ups: wait for the next boss if any; otherwise done
console.log('errors:',errors.length);for(const e of errors.slice(0,8))console.log('  '+e.slice(0,300));
await browser.close();srv.kill();process.exit(errors.length?1:0);
