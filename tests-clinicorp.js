const fs=require('fs');

function assert(condition,message){if(!condition)throw new Error(message)}

const pages=[
  'index.html',
  'implante-dentario-rio-das-ostras/index.html',
  'quanto-custa-implante-dentario/index.html',
  'implante-dentario-doi/index.html',
  'enxerto-osseo-implante/index.html',
  'cirurgia-siso-rio-das-ostras/index.html'
];

for(const page of pages){
  const html=fs.readFileSync(page,'utf8');
  assert(html.includes('href="https://agenda.link/721958"'),`${page} missing Clinicorp public scheduling link`);
  assert(html.includes('data-track="cta_agendamento_clinicorp"'),`${page} missing Clinicorp tracking event`);
  assert(html.includes('Falar no WhatsApp'),`${page} missing secondary WhatsApp CTA`);
  assert(html.includes('data-track="cta_whatsapp"'),`${page} missing WhatsApp tracking event`);
}

console.log('OK - Clinicorp como CTA principal e WhatsApp como alternativa em todas as páginas');
