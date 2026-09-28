const http=require('http');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname);
const officialHost='drarebecamaral.com.br';
const mimes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};

function fileForRequest(rawUrl){
  let pathname;
  try{pathname=decodeURIComponent(rawUrl.split('?')[0])}catch{return {status:400}}
  if(pathname==='/')pathname='/index.html';
  let file=path.resolve(root,'.'+pathname);
  if(!path.extname(file))file=path.join(file,'index.html');
  if(file!==root&&!file.startsWith(root+path.sep))return {status:403};
  return {file};
}

http.createServer((req,res)=>{
  const host=(req.headers.host||'').split(':')[0].toLowerCase();
  if(host===`www.${officialHost}`){
    res.writeHead(301,{Location:`https://${officialHost}${req.url}`});
    return res.end();
  }
  if(req.url==='/health'){res.writeHead(200);return res.end('ok')}
  const resolved=fileForRequest(req.url);
  if(resolved.status){res.writeHead(resolved.status);return res.end(resolved.status===400?'Bad request':'Forbidden')}
  fs.readFile(resolved.file,(error,data)=>{
    if(error){res.writeHead(404);return res.end('Not found')}
    const ext=path.extname(resolved.file);
    const headers={'Content-Type':mimes[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=86400'};
    if(host&&host!==officialHost)headers['X-Robots-Tag']='noindex, nofollow';
    res.writeHead(200,headers);
    res.end(data);
  });
}).listen(process.env.PORT||3000,()=>console.log('Rebeca Hub running'));
