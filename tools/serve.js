// Tiny static dev server (no deps). Usage: node tools/serve.js [port] [root]
const http = require('http'), fs = require('fs'), path = require('path');
const port = +process.argv[2] || 8080, root = path.resolve(process.argv[3] || '.');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.zip': 'application/zip', '.css': 'text/css' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  });
}).listen(port, () => console.log('http://localhost:' + port + '/'));
