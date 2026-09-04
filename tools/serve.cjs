// Tiny static dev server (no deps). Usage: node tools/serve.cjs [port] [root]
// Dev-only convenience: the hosted three.js has no CORS header, so pages served from localhost cannot import it
// cross-origin. This server rewrites that URL in any served .html to a local byte-identical copy
// (tools/three-hosted-r185.js, downloaded on first start). The files on disk — and the zip — are never modified.
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path');
const port = +process.argv[2] || 8080, root = path.resolve(process.argv[3] || '.');
const HOSTED = 'https://play.js13kgames.com/2026/webxr/three.js', LOCAL = path.resolve(__dirname, 'three-hosted-r185.js');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.zip': 'application/zip', '.css': 'text/css' };
if (!fs.existsSync(LOCAL)) https.get(HOSTED, r => { const f = fs.createWriteStream(LOCAL); r.pipe(f); f.on('finish', () => console.log('downloaded ' + HOSTED)); }).on('error', e => console.log('could not download three.js: ' + e.message));
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  if (p === '/__three.js') return fs.readFile(LOCAL, (e, d) => { res.writeHead(e ? 404 : 200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); res.end(e ? '404' : d); });
  const f = path.join(root, p);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    if (f.endsWith('.html') && !process.env.NO_REWRITE) d = Buffer.from(d.toString('utf8').split(HOSTED).join('/__three.js'));
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  });
}).listen(port, () => console.log('http://localhost:' + port + '/'));
