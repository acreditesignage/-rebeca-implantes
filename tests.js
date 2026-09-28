const fs=require('fs');
const http=require('http');
const {spawn}=require('child_process');

function assert(condition,message){if(!condition)throw new Error(message)}
function request(port,path,headers={}){return new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port,path,headers},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers}))});req.on('error',reject)})}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

(async()=>{
  const domain='https://drarebecamaral.com.br';
  const pages=[
    ['index.html',domain+'/'],
    ['implante-dentario-rio-das-ostras/index.html',domain+'/implante-dentario-rio-das-ostras/'],
    ['quanto-custa-implante-dentario/index.html',domain+'/quanto-custa-implante-dentario/'],
    ['implante-dentario-doi/index.html',domain+'/implante-dentario-doi/'],
    ['enxerto-osseo-implante/index.html',domain+'/enxerto-osseo-implante/'],
    ['cirurgia-siso-rio-das-ostras/index.html',domain+'/cirurgia-siso-rio-das-ostras/']
  ];
  const files=[...pages.map(([f])=>f),'assets/styles.css','server.js','robots.txt','sitemap.xml'];
  for(const f of files)assert(fs.existsSync(f),'Missing '+f);

  const expected=['CRO-RJ 55986','5522988187903','Cidade Praiana','Centro — Rio das Ostras, RJ'];
  for(const [f,canonical] of pages){
    const html=fs.readFileSync(f,'utf8');
    for(const value of expected)assert(html.includes(value),`${f} missing ${value}`);
    assert(!html.includes('[PREENCHER]'),`${f} still has placeholder`);
    assert(!html.includes('Conectar WhatsApp'),`${f} still has placeholder CTA`);
    assert(!html.includes('Agendar avaliação'),`${f} still has old CTA label`);
    assert(!html.includes('Agendar pelo WhatsApp'),`${f} still has old WhatsApp CTA label`);
    assert(html.includes('Agende uma consulta'),`${f} missing new CTA label`);
    assert(!html.includes('noindex,nofollow'),`${f} must be indexable on official domain`);
    assert(html.includes('index,follow'),`${f} missing index directive`);
    assert(html.includes(`<link rel="canonical" href="${canonical}">`),`${f} missing canonical ${canonical}`);
  }

  const robots=fs.readFileSync('robots.txt','utf8');
  assert(robots.includes('Allow: /'),'robots must allow crawling');
  assert(robots.includes('Sitemap: https://drarebecamaral.com.br/sitemap.xml'),'robots missing sitemap');
  const sitemap=fs.readFileSync('sitemap.xml','utf8');
  for(const [,canonical] of pages)assert(sitemap.includes(`<loc>${canonical}</loc>`),`sitemap missing ${canonical}`);

  const home=fs.readFileSync('index.html','utf8');
  assert(home.includes('Rebeca Amaral | Centro de Implantes'),'New brand name missing');
  assert(home.includes('Cirurgia Oral e Planejamento Digital'),'Brand subtitle missing');
  assert(home.includes('Implantes') && home.includes('Cirurgia de Siso'),'Home must position implants and wisdom tooth surgery');
  assert(home.includes('/cirurgia-siso-rio-das-ostras/'),'Wisdom tooth surgery article link missing');
  assert(home.includes('sisos inclusos') || home.includes('siso incluso'),'Home must mention included/impacted wisdom teeth');
  assert(home.includes('/assets/hero-rebeca.webp'),'Hero portrait missing');
  assert(home.includes('/assets/dra-rebeca.webp'),'Professional portrait missing');
  assert(home.includes('/assets/planejamento-digital.webp'),'Planning image missing');
  assert(home.includes('/assets/cirurgia-oral.webp'),'Surgery image missing');
  assert(home.includes('"@type":"Dentist"') || home.includes('"@type": "Dentist"'),'Dentist schema missing');
  assert(home.includes('"@type":"Person"') || home.includes('"@type": "Person"'),'Person schema missing');
  assert(home.includes('https://drarebecamaral.com.br/#centro'),'Schema official URL missing');
  assert(home.includes('/implante-dentario-doi/'),'Pain article link missing');
  assert(home.includes('/enxerto-osseo-implante/'),'Bone graft article link missing');
  assert(home.includes('CardioMed'),'CardioMed unit missing');
  assert(home.includes('Rua Santa Catarina, 619'),'CardioMed address missing');
  assert(home.includes('2º andar'),'CardioMed floor missing');
  assert(home.includes('Forte Farma'),'CardioMed location reference missing');
  assert(home.includes('(22) 99923-4261'),'CardioMed phone missing');

  for(const image of ['hero-rebeca.webp','dra-rebeca.webp','planejamento-digital.webp','cirurgia-oral.webp'])assert(fs.existsSync(`assets/${image}`),`Missing assets/${image}`);

  const price=fs.readFileSync('quanto-custa-implante-dentario/index.html','utf8');
  assert(price.includes('FAQPage'),'FAQ schema missing');
  const pain=fs.readFileSync('implante-dentario-doi/index.html','utf8');
  assert(pain.includes('Implante dentário dói?'),'Pain article title missing');
  const graft=fs.readFileSync('enxerto-osseo-implante/index.html','utf8');
  assert(graft.includes('enxerto ósseo'),'Bone graft content missing');
  const siso=fs.readFileSync('cirurgia-siso-rio-das-ostras/index.html','utf8');
  assert(siso.includes('Cirurgia de siso em Rio das Ostras'),'Wisdom tooth surgery SEO title missing');
  assert(siso.includes('inclusos') || siso.includes('impactados'),'Wisdom tooth surgery page must cover included or impacted cases');
  assert(siso.includes('avaliação clínica'),'Wisdom tooth surgery page must preserve individualized evaluation language');

  const port=34567;
  const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
  try{
    await delay(300);
    assert((await request(port,'/health')).status===200,'Health endpoint failed');
    assert((await request(port,'/%')).status===400,'Malformed URL encoding must return 400');
    const staging=await request(port,'/',{Host:'rebeca-implantes-app-production.up.railway.app'});
    assert(staging.headers['x-robots-tag']==='noindex, nofollow','Railway hostname must remain noindex');
    const official=await request(port,'/',{Host:'drarebecamaral.com.br'});
    assert(!official.headers['x-robots-tag'],'Official domain must not receive noindex header');
    assert(child.exitCode===null,'Server crashed after malformed URL');
  } finally { child.kill(); }
  console.log('OK - domínio oficial, implantes, cirurgia de siso, indexação, sitemap, CTA, schema e servidor validados');
})().catch(err=>{console.error(err);process.exit(1)});
