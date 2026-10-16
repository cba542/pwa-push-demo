const http=require('http'),fs=require('fs'),path=require('path'),L=require('./lib');
const T={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/manifest+json','.png':'image/png'};
const body=r=>new Promise(o=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>o(d))});
http.createServer(async(q,r)=>{const u=new URL(q.url,'http://x');try{
if(u.pathname==='/vapid'){r.writeHead(200,{'content-type':'application/json'});return r.end(JSON.stringify({publicKey:L.publicKey}))}
if(u.pathname==='/subscribe'&&q.method==='POST'){const s=JSON.parse(await body(q));if(!s.endpoint)throw 0;const l=L.load().filter(x=>x.endpoint!==s.endpoint);l.push(s);L.save(l);r.writeHead(201);return r.end('ok')}
if(u.pathname==='/send'&&q.method==='POST'){if(!L.token||q.headers['x-token']!==L.token){r.writeHead(403);return r.end('forbidden')}const b=JSON.parse(await body(q)||'{}');r.writeHead(200,{'content-type':'application/json'});return r.end(JSON.stringify(await L.sendAll(b.title||'新預約',b.body||'測試通知')))}
let f=u.pathname==='/'?'/index.html':u.pathname;f=path.join(__dirname,'public',path.normalize(f).replace(/^(\.\.[\/\\])+/,''));
if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
const h={'content-type':T[path.extname(f)]||'application/octet-stream'};if(f.endsWith('sw.js'))h['cache-control']='no-cache';r.writeHead(200,h);fs.createReadStream(f).pipe(r)}catch(e){r.writeHead(400);r.end('bad')}}).listen(process.env.PORT||8787,()=>console.log('listening',process.env.PORT||8787));
