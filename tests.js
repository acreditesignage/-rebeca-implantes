const fs=require('fs');
const http=require('http');
const {spawn}=require('child_process');

function assert(condition,message){if(!condition)throw new Error(message)}
function request(port,path){return new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port,path},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject)})}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

(async()=>{
  const files=['index.html','implante-dentario-rio-das-ostras/index.html','quanto-custa-implante-dentario/index.html','assets/styles.css','server.js'];
  for(const f of files)assert(fs.existsSync(f),'Missing '+f);

  const htmlFiles=files.filter(f=>f.endsWith('.html'));
  const expected=['CRO-RJ 55986','5522988187903','Cidade Praiana','Centro — Rio das Ostras, RJ'];
  for(const f of htmlFiles){
    const html=fs.readFileSync(f,'utf8');
    for(const value of expected)assert(html.includes(value),`${f} missing ${value}`);
    assert(!html.includes('[PREENCHER]'),`${f} still has placeholder`);
    assert(!html.includes('Conectar WhatsApp'),`${f} still has placeholder CTA`);
    assert(!html.includes('Agendar avaliação'),`${f} still has old CTA label`);
    assert(!html.includes('Agendar pelo WhatsApp'),`${f} still has old WhatsApp CTA label`);
    assert(html.includes('Agende uma consulta'),`${f} missing new CTA label`);
  }

  const home=fs.readFileSync('index.html','utf8');
  assert(home.includes('Rebeca Amaral | Centro de Implantes'),'New brand name missing');
  assert(home.includes('Cirurgia Oral e Planejamento Digital'),'Brand subtitle missing');
  assert(home.includes('/assets/hero-rebeca.webp'),'Hero portrait missing');
  assert(home.includes('/assets/dra-rebeca.webp'),'Professional portrait missing');
  assert(home.includes('/assets/planejamento-digital.webp'),'Planning image missing');
  assert(home.includes('/assets/cirurgia-oral.webp'),'Surgery image missing');
  assert(home.includes('Agende uma consulta'),'CTA missing');
  assert(home.includes('noindex,nofollow'),'Staging must remain noindex');

  for(const image of ['hero-rebeca.webp','dra-rebeca.webp','planejamento-digital.webp','cirurgia-oral.webp']){
    assert(fs.existsSync(`assets/${image}`),`Missing assets/${image}`);
  }

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
  console.log('OK - identidade, imagens, CTA, dados profissionais, schema e servidor validados');
})().catch(err=>{console.error(err);process.exit(1)});
