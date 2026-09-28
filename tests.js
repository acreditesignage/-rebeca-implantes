const fs=require('fs');
const http=require('http');
const {spawn}=require('child_process');

function assert(condition,message){if(!condition)throw new Error(message)}
function request(port,path){return new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port,path},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject)})}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

(async()=>{
  const files=['index.html','implante-dentario-rio-das-ostras/index.html','quanto-custa-implante-dentario/index.html','assets/styles.css','server.js'];
  for(const f of files)assert(fs.existsSync(f),'Missing '+f);
  const home=fs.readFileSync('index.html','utf8');
  assert(home.includes('Agendar avaliação'),'CTA missing');
  assert(home.includes('noindex,nofollow'),'Staging must remain noindex');
  const price=fs.readFileSync('quanto-custa-implante-dentario/index.html','utf8');
  assert(price.includes('FAQPage'),'FAQ schema missing');

  const port=34567;
  const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
  try{
    await delay(300);
    assert(await request(port,'/health')===200,'Health endpoint failed');
    assert(await request(port,'/%')===400,'Malformed URL encoding must return 400');
    assert(child.exitCode===null,'Server crashed after malformed URL');
  } finally {
    child.kill();
  }
  console.log('OK - estrutura, CTA, schema e servidor validados');
})().catch(err=>{console.error(err);process.exit(1)});
