const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.ogg':'audio/ogg','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.woff2':'font/woff2'};
function startServer(root,port=0,host='127.0.0.1'){
 root=path.resolve(root);
 return new Promise((resolve,reject)=>{
  const server=http.createServer((req,res)=>{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
   let file=path.resolve(root,'.'+name);const relative=path.relative(root,file);
   if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}
   try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const stat=fs.statSync(file);if(!stat.isFile())throw Error();res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end('Not found');}
  });server.once('error',reject);server.listen(port,host,()=>resolve(server));
 });
}
module.exports={startServer};
if(require.main===module){startServer(process.argv[2]||path.join(__dirname,'web'),Number(process.env.PORT||8080),process.env.HOST||'127.0.0.1').then(server=>{const url=`http://localhost:${server.address().port}`;console.log(`VEILBREAK: ${url}\nKeep this window open. Press Ctrl+C to stop.`);if(process.argv.includes('--open')){const cp=require('node:child_process');if(process.platform==='win32')cp.spawn('cmd',['/c','start','',url]);else if(process.platform==='darwin')cp.spawn('open',[url]);}}).catch(e=>{console.error(e.message);process.exitCode=1;});}
