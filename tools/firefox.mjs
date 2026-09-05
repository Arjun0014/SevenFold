// firefox.mjs — real Firefox check over WebDriver BiDi (no Playwright: its patched Firefox cannot spawn on this machine).
// Uses the system Firefox headless. Part 1: the shipped dist/index.html boots, starts, plays 6 s with the keys — zero
// console errors, zero page errors. Part 2: dist/test.html (hooks) — Space/B/G/N produce throw, arch, lasso, Nova.
// Usage: node tools/firefox.mjs [path to firefox.exe]
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const FF=process.argv[2]||'C:/Program Files/Mozilla Firefox/firefox.exe',PORT=9333,WEB=8097;
const srv=spawn(process.execPath,['tools/serve.cjs',''+WEB],{stdio:'ignore'});
const prof=mkdtempSync(join(tmpdir(),'sf-ff-'));
const ff=spawn(FF,['--headless','--no-remote','--profile',prof,'--remote-debugging-port='+PORT,'about:blank'],{stdio:'ignore'});
const bye=code=>{try{ff.kill()}catch(e){}try{srv.kill()}catch(e){}setTimeout(()=>{try{rmSync(prof,{recursive:true,force:true})}catch(e){}process.exit(code)},500)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws;for(let i=0;i<60&&!ws;i++){await sleep(500);try{ws=await new Promise((res,rej)=>{const w=new WebSocket(`ws://127.0.0.1:${PORT}/session`);w.onopen=()=>res(w);w.onerror=()=>rej()})}catch(e){}}
if(!ws){console.log('FAIL: Firefox BiDi endpoint did not come up');bye(1)}
let id=0;const pend=new Map,logs=[];
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const[res,rej]=pend.get(d.id);pend.delete(d.id);d.type=='error'?rej(new Error(d.message)):res(d.result)}
  else if(d.method=='log.entryAdded'){const e=d.params;if(e.level=='error'||e.level=='warn'||e.type=='javascript')logs.push(`${e.level} ${e.type}: ${e.text}`)}};
const send=(method,params={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,[res,rej]);ws.send(JSON.stringify({id:i,method,params}))});
let fails=0;const check=(name,ok,detail='')=>{if(!ok)fails++;console.log(`${ok?'ok  ':'FAIL'} ${name}${detail?' — '+detail:''}`)};
try{
  await send('session.new',{capabilities:{}});
  await send('session.subscribe',{events:['log.entryAdded']});
  const tree=await send('browsingContext.getTree');const ctx=tree.contexts[0].context;
  const ev=async(expression,ms=0)=>{if(ms)await sleep(ms);const r=await send('script.evaluate',{expression,target:{context:ctx},awaitPromise:true,resultOwnership:'none'});if(r.type=='exception')throw new Error('page exception: '+JSON.stringify(r.exceptionDetails.text||r.exceptionDetails));return r.result&&r.result.value};
  const go=async(url)=>{await send('browsingContext.navigate',{context:ctx,url,wait:'complete'});let btn='';for(let i=0;i<30&&btn=='';i++){await sleep(500);btn=await ev(`(document.getElementById('b')||{}).textContent||''`)}return btn};
  const key=(k,down)=>ev(`dispatchEvent(new KeyboardEvent('${down?'keydown':'keyup'}',{key:'${k}',code:'${k==' '?'Space':'Key'+k.toUpperCase()}'}))`);
  const tap=async(k,ms=120)=>{await key(k,1);await sleep(ms);await key(k,0)};
  console.log('ua:',await ev('navigator.userAgent'));
  // ---- part 1: the shipped file
  let btn=await go(`http://localhost:${WEB}/dist/`);check('zip boot: PLAY ON DESKTOP button, canvas, no hooks',btn=='PLAY ON DESKTOP'&&await ev(`!!document.querySelector('canvas')&&!('SF'in window)`),btn);
  await ev(`document.getElementById('b').click()`,300);await tap('b',150);await sleep(2000); // B = both triggers → first trigger starts the game
  check('zip play: button hidden after PLAY',await ev(`document.getElementById('b').hidden`));
  for(const k of[' ','w','g','b','a','n','s','d']){await tap(k,350);await sleep(450)}
  await tap('m');await tap('r');await sleep(600);await tap('m');
  const e1=logs.length;check('zip play: 6 s with Space/W/G/B/A/N/S/D, M, R — zero console errors',e1==0,logs.slice(0,3).join(' | '));
  // ---- part 2: the test build, verbs by key
  btn=await go(`http://localhost:${WEB}/dist/test.html`);check('test build boots with hooks',btn=='PLAY ON DESKTOP'&&await ev(`'SF'in window`));
  await ev(`document.getElementById('b').click()`,300);await ev(`SF.newGame(3)`,300);await tap('b',150);
  await ev(`new Promise(r=>{const t=setInterval(()=>{if(SF.state().ws==1){clearInterval(t);r()}},100)})`);
  const st=async()=>JSON.parse(await ev(`JSON.stringify(SF.state())`));
  const until=async(pred,ms)=>{const t0=Date.now();let s;while(Date.now()-t0<ms){s=await st();if(pred(s))return s;await sleep(150)}return s};
  let s=await until(s=>s.wave==1&&s.text.includes('Both triggers'),3000);check('wave 1 hint shown',s.text.includes('Both triggers'),s.text.replace(/\n/g,' | '));
  await tap(' ');s=await until(s=>s.events.includes('catch'),5000);check('Space: circle sigil → forge, sigil, throw, catch',['forge','sigil','throw','catch'].every(k=>s.events.includes(k)),s.events.slice(-8).join(','));
  await key('b',1);s=await until(s=>s.mode==1,1500);check('B held: arch (mode 1)',s.mode==1,'mode '+s.mode);await key('b',0);await until(s=>s.mode==0,2000);
  await tap('g');s=await until(s=>s.events.includes('lasso'),4000);check('G: cross sigil → lasso cast',s.events.includes('lasso'),s.events.slice(-6).join(','));await until(s=>s.mode==0,6000);
  await ev('SF.charge()');await tap('n');s=await until(s=>s.events.includes('nova'),3000);check('N (charged): slam sigil → Nova',s.events.includes('nova'),s.events.slice(-6).join(','));
  await sleep(2000);s=await st();check(`render: ${s.calls} draw calls, ${s.tris} triangles within budget`,s.calls<=60&&s.tris<80000);
  check('console: zero errors or page errors in Firefox',logs.length==0,logs.slice(0,5).join(' | '));
  console.log(`\n${fails?'FAILED':'PASSED'} (${fails} failures)`);bye(fails?1:0);
}catch(e){console.log('FAIL:',e.message);for(const l of logs.slice(0,20))console.log('  '+l.slice(0,300));bye(1)}
