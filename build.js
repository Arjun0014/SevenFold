// build.js — concat → terser (property mangle) → roadroller → inline into index.html → zip → gate.
// Usage: node build.js [--level 0|1|2] [--no-roll] [--iter N]
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {minify} from 'terser';
import {Packer} from 'roadroller';
import {deflateAsync} from '@gfx/zopfli';
import {deflateRawSync} from 'node:zlib';
import {execSync} from 'node:child_process';

const argv=process.argv.slice(2),opt=(k,d)=>{const i=argv.indexOf(k);return i<0?d:argv[i+1]};
const LEVEL=+opt('--level',1),ROLL=!argv.includes('--no-roll'),ITER=+opt('--iter',60),LIMIT=13312,TARGET=12900;
const OPT=['audio','particles'].filter(f=>argv.includes('--'+f)); // build-optional features (CLAUDE.md priority 5–6); lines tagged //@name
const ORDER=['vec','sim','input','xr','audio','render','main'].filter(m=>existsSync(`src/${m}.js`)&&(m!='audio'||OPT.includes('audio')));
mkdirSync('dist',{recursive:true});

// 1. concat, strip import/export
const strip=s=>s.split('\n').filter(l=>{const m=l.match(/\/\/@(\w+)\s*$/);return!/^import\s/.test(l)&&!(m&&!OPT.includes(m[1]))}).map(l=>l.replace(/^export\s+(default\s+)?/,'')).join('\n'); // //@test lines are test hooks; //@audio //@particles are optional features
const mods=ORDER.map(m=>[m,strip(readFileSync(`src/${m}.js`,'utf8'))]);
const raw='(async()=>{'+mods.map(x=>x[1]).join('\n')+'\n})()';
if(/three\/addons|\/jsm\//.test(raw)){console.error('FAIL: addons/jsm reference in source');process.exit(1)}
writeFileSync('dist/bundle.raw.js',raw);

// 2. terser
const tOpts={compress:{passes:5,unsafe:true,unsafe_math:true,unsafe_arrows:true,unsafe_methods:true,unsafe_proto:true,toplevel:true,drop_console:true,pure_getters:true,hoist_funs:true,ecma:2020}, // no booleans_as_integers: Three tests `=== false`/`=== true`
  mangle:{toplevel:true,properties:{regex:/^_/}},format:{comments:false,ecma:2020},module:false};
const min=(await minify(raw,tOpts)).code;
writeFileSync('dist/bundle.min.js',min);
// per-module sizes (each minified alone, informative only)
const table=[];for(const[m,s]of mods){const c=(await minify(s,{compress:{...tOpts.compress,toplevel:false,unused:false},mangle:{properties:{regex:/^_/}},format:tOpts.format,module:true})).code;table.push([m,s.length,c.length])}

// 3. roadroller
let rolled=min;
if(ROLL){const packer=new Packer([{data:min,type:'js',action:'eval'}],{});await packer.optimize(LEVEL);const{firstLine,secondLine}=packer.makeDecoder();rolled=firstLine+secondLine}
writeFileSync('dist/bundle.rolled.js',rolled);

// 4. inline
const css='body{margin:0;background:#070a14;color:#dfe6ff;font:14px sans-serif;overflow:hidden}canvas{display:block}#b{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font:bold 28px sans-serif;padding:18px 40px;background:#12141c;color:#fff;border:2px solid #6a5cff}#h{position:fixed;left:8px;bottom:8px;font-size:12px;opacity:.6}#u{position:fixed;left:0;right:0;top:40%;text-align:center;font-size:20px}';
const html=`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Sevenfold</title><style>${css}</style><div id=u></div><script>U="https://play.js13kgames.com/2026/webxr/three.js";${rolled}</script>`;
writeFileSync('dist/index.html',html);
const urls=html.match(/https?:\/\/[^"' ]*/g)||[];
if(urls.length!=1||!urls[0].startsWith('https://play.js13kgames.com/2026/webxr/three.js')){console.error('FAIL: unexpected URLs',urls);process.exit(1)}
if(/localStorage\.clear|console\./.test(html)){console.error('FAIL: localStorage.clear or console. in build');process.exit(1)}

// 5. zip (single entry, hand-rolled container; zopfli deflate, zlib fallback)
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c});
const crc32=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return(c^-1)>>>0};
const data=Buffer.from(html,'utf8');
let def;try{def=Buffer.from(await deflateAsync(data,{numiterations:ITER}))}catch(e){def=deflateRawSync(data,{level:9})}
const z9=deflateRawSync(data,{level:9});if(z9.length<def.length)def=z9;
const name=Buffer.from('index.html'),u16=n=>{const b=Buffer.alloc(2);b.writeUInt16LE(n);return b},u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b};
const crc=crc32(data);
const local=Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(8),u16(0),u16(0x21),u32(crc),u32(def.length),u32(data.length),u16(name.length),u16(0),name]);
const central=Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(8),u16(0),u16(0x21),u32(crc),u32(def.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(0),name]);
const eocd=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(1),u16(1),u32(central.length),u32(local.length+def.length),u16(0)]);
const zip=Buffer.concat([local,def,central,eocd]);
writeFileSync('dist/sevenfold.zip',zip);

// 6. report
let unz='';try{unz=execSync('unzip -t dist/sevenfold.zip',{encoding:'utf8'}).trim().split('\n').pop()}catch(e){unz='(unzip not available: '+e.message.split('\n')[0]+')'}
const lines=[`raw ${raw.length}  min ${min.length}  rolled ${rolled.length}  html ${html.length}  zip ${zip.length}  (limit ${LIMIT}, target ${TARGET})`,
  'module        raw     min','',...table.map(([m,a,b])=>m.padEnd(10)+String(a).padStart(7)+String(b).padStart(8)),`roadroller level ${ROLL?LEVEL:'off'}, zopfli iterations ${ITER}, optional features: ${OPT.join(',')||'none'}`,`unzip -t: ${unz}`];
lines.splice(2,1);
console.log(lines.join('\n'));writeFileSync('dist/size.txt',lines.join('\n')+'\n');
if(zip.length>LIMIT){console.error(`FAIL: zip ${zip.length} > ${LIMIT}`);process.exit(1)}
if(zip.length>TARGET)console.warn(`WARN: zip ${zip.length} > working target ${TARGET}`);
