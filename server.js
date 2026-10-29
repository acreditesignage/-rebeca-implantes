const http=require('http');
const fs=require('fs');
const path=require('path');

const {randomUUID}=require('crypto');
const contactLimits=new Map();
function contactJson(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body));
}
async function websiteContact(req,res){
  const upstream=process.env.ODONTOFLOW_API_URL;
  if(!upstream)return contactJson(res,503,{error:'unavailable'});
  const route=new URL('/api/v1/website/contact',upstream);
  if(req.method==='GET'){
    try{
      const response=await fetch(route,{signal:AbortSignal.timeout(10000)});
      const body=await response.json();
      return contactJson(res,response.ok&&body.available?200:503,{available:Boolean(response.ok&&body.available)});
    }catch{return contactJson(res,503,{available:false})}
  }
  if(req.method!=='POST')return contactJson(res,405,{error:'method_not_allowed'});
  const origin=req.headers.origin;
  if(origin!=='https://drarebecamaral.com.br'&&origin!=='https://www.drarebecamaral.com.br')
    return contactJson(res,403,{error:'invalid_origin'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return contactJson(res,415,{error:'invalid_content_type'});
  let size=0,raw='';
  try{
    for await(const chunk of req){
      size+=chunk.length;
      if(size>8192){contactJson(res,413,{error:'too_large'});req.resume();return}
      raw+=chunk.toString('utf8');
    }
  }catch{return contactJson(res,400,{error:'invalid_contact'})}
  let body;
  try{body=JSON.parse(raw)}catch{return contactJson(res,400,{error:'invalid_contact'})}
  if(!body||typeof body!=='object'||Array.isArray(body))return contactJson(res,400,{error:'invalid_contact'});
  const phone=typeof body.phone==='string'?body.phone.replace(/\D/g,''):'';
  const normalized=phone.length===10||phone.length===11?'55'+phone:phone;
  if(typeof body.name!=='string'||body.name.trim().length<2||body.name.length>100||
    !/^55[1-9]\d{9,10}$/.test(normalized)||!['Implante dentário','Cirurgia de siso','Odontopediatria','Outro atendimento'].includes(body.treatment)||
    !['Centro','Cidade Praiana','Ainda não sei'].includes(body.unit)||typeof body.message!=='string'||
    body.message.trim().length<2||body.message.length>1500||body.consent!==true||
    (body.company!==undefined&&body.company!=='')||typeof body.page!=='string'||body.page.length>250||
    !/^\/(?!\/)[^\r\n]*$/.test(body.page)||
    (body.requestId!==undefined&&(typeof body.requestId!=='string'||!/^([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.test(body.requestId))))
    return contactJson(res,400,{error:'invalid_contact'});
  const now=Date.now();
  for(const [key,value] of contactLimits)if(value.until<now)contactLimits.delete(key);
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim().slice(0,100);
  const quota=contactLimits.get(ip)||{until:now+3600000,count:0};
  if(quota.count>=20||(!contactLimits.has(ip)&&contactLimits.size>=10000))return contactJson(res,429,{error:'contact_limit'});
  quota.count++;contactLimits.set(ip,quota);
  const payload={requestId:body.requestId||randomUUID(),name:body.name.trim(),phone:normalized,
    treatment:body.treatment,unit:body.unit,message:body.message.trim(),page:body.page,consent:true,company:''};
  try{
    const response=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://drarebecamaral.com.br'},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(!response.ok||result.received!==true)return contactJson(res,response.status===429?429:503,{error:response.status===429?'contact_limit':'unavailable'});
    return contactJson(res,200,{received:true,requestId:payload.requestId});
  }catch{return contactJson(res,503,{error:'unavailable'})}
}

const root=path.resolve(__dirname);
const officialHost='drarebecamaral.com.br';
const mimes={
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.txt':'text/plain; charset=utf-8',
  '.xml':'application/xml; charset=utf-8',
  '.webp':'image/webp',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg'
};

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
  if(req.url.split('?')[0]==='/favicon.ico'){
    res.writeHead(301,{Location:'/favicon.svg','Cache-Control':'public, max-age=86400'});
    return res.end();
  }
  if(req.url.split('?')[0]==='/api/odontoflow/contact'){websiteContact(req,res).catch(()=>contactJson(res,503,{error:'unavailable'}));return;}
  const resolved=fileForRequest(req.url);
  if(resolved.status){res.writeHead(resolved.status);return res.end(resolved.status===400?'Bad request':'Forbidden')}
  fs.readFile(resolved.file,(error,data)=>{
    if(error){res.writeHead(404);return res.end('Not found')}
    const ext=path.extname(resolved.file).toLowerCase();
    const headers={
      'Content-Type':mimes[ext]||'application/octet-stream',
      'Cache-Control':['.html','.js','.css'].includes(ext)?'no-cache':'public, max-age=86400',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin'
    };
    if(host&&host!==officialHost)headers['X-Robots-Tag']='noindex, nofollow';
    res.writeHead(200,headers);
    res.end(data);
  });
}).listen(process.env.PORT||3000,()=>console.log('Rebeca Hub running'));
