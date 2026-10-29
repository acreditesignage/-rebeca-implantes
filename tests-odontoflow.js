const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const {once}=require('node:events');
(async()=>{
 let forwarded=[];
 const upstream=http.createServer(async(req,res)=>{
   if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"available":true}');return}
   let raw='';for await(const chunk of req)raw+=chunk;
   const body=JSON.parse(raw);forwarded.push({body,origin:req.headers.origin});
   res.writeHead(201,{'Content-Type':'application/json'});res.end(JSON.stringify({received:true,requestId:body.requestId}));
 });
 upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const reservation=http.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
 const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),
   ODONTOFLOW_API_URL:'http://127.0.0.1:'+upstream.address().port},stdio:['ignore','pipe','pipe']});
 let startup='';child.stdout.on('data',chunk=>startup+=chunk);
 try{
   for(let attempt=0;attempt<100&&!startup.includes('Rebeca Hub running');attempt++)await new Promise(resolve=>setTimeout(resolve,50));
   assert.ok(startup.includes('Rebeca Hub running'),'server starts');
   const base='http://127.0.0.1:'+port;
   const data={requestId:randomUUID(),name:'Visitante Teste',phone:'(22) 99999-1111',treatment:'Implante dentário',unit:'Centro',
     message:'Quero informações',page:'/',consent:true,company:''};
   const post=(body,origin='https://drarebecamaral.com.br')=>fetch(base+'/api/odontoflow/contact',{method:'POST',
     headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
   assert.equal((await fetch(base+'/api/odontoflow/contact')).status,200);
   assert.equal((await post(data)).status,200);
   assert.equal(forwarded.length,1);assert.equal(forwarded[0].body.phone,'5522999991111');
   assert.equal(forwarded[0].origin,'https://drarebecamaral.com.br');
   assert.equal((await post({...data,consent:false})).status,400);
   assert.equal((await post({...data,company:'spam'})).status,400);
   assert.equal((await post(data,'https://other.example')).status,403);
   assert.equal(forwarded.length,1);
   const tikTokLead={...data,requestId:randomUUID(),page:'/?utm_source=tiktok'};
   assert.equal((await post(tikTokLead)).status,200);
   assert.equal(forwarded.length,2);
   assert.equal(forwarded[1].body.page,'/?utm_source=tiktok');
   const pediatricLead={...data,requestId:randomUUID(),treatment:'Odontopediatria',
     message:'Quero informações sobre consulta infantil',page:'/odontopediatria-rio-das-ostras/'};
   assert.equal((await post(pediatricLead)).status,200,'Odontopediatria lead should be accepted');
   assert.equal(forwarded.length,3);
   assert.equal(forwarded[2].body.treatment,'Odontopediatria');
   assert.equal((await post({...data,message:'x'.repeat(9000)})).status,413);
   const javascript=fs.readFileSync('assets/app.js','utf8');
   assert.ok(javascript.includes('/api/odontoflow/contact'));
   assert.ok(javascript.includes('Pedido recebido!'));
   assert.ok(javascript.includes('form.reportValidity()'));
   assert.ok(javascript.includes('utm_source'), 'TikTok UTMs must be preserved when submitting a site form');
   assert.ok(!javascript.includes('api/v1/ingest'));
   assert.equal((await fetch(base+'/health')).status,200);
   console.log('OdontoFlow contact integration: origin, consent, proxy, validation and static widget passed');
 }finally{
   child.kill();await once(child,'exit');await new Promise(resolve=>upstream.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1});
