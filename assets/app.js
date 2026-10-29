document.addEventListener('click',e=>{const a=e.target.closest('[data-track]');if(!a)return;try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:a.dataset.track,page:location.pathname});}catch(_){}});

(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items=[...document.querySelectorAll('.reveal')];
  if(!items.length)return;
  if(reduced||!('IntersectionObserver' in window)){
    items.forEach(item=>item.classList.add('is-visible'));
    return;
  }
  document.documentElement.classList.add('motion-ready');
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
  items.forEach(item=>observer.observe(item));
})();

(()=> {
  const section=document.createElement('section');
  section.id='contato';
  section.className='odontoflow-contact';
  section.innerHTML=`<div class="odontoflow-contact-inner">
    <div><p class="odontoflow-eyebrow">Atendimento da clínica</p><h2>Conte como podemos ajudar</h2>
      <p>Envie seu pedido à equipe da Dra. Rebeca Amaral. Retornaremos pelo telefone informado.</p>
      <p class="odontoflow-contact-note">Para escolher um horário, use o <a href="https://agenda.link/721958" data-track="cta_agendamento_clinicorp">agendamento online</a>. Este formulário não confirma uma consulta.</p></div>
    <form id="odontoflow-contact-form">
      <label for="contact-name">Seu nome</label><input id="contact-name" name="name" autocomplete="name" required minlength="2" maxlength="100">
      <label for="contact-phone">Telefone com DDD</label><input id="contact-phone" name="phone" type="tel" autocomplete="tel" placeholder="(22) 99999-9999" required maxlength="30">
      <div class="odontoflow-contact-options"><div><label for="contact-treatment">Interesse</label><select id="contact-treatment" name="treatment"><option>Implante dentário</option><option>Cirurgia de siso</option><option>Odontopediatria</option><option>Outro atendimento</option></select></div>
      <div><label for="contact-unit">Unidade</label><select id="contact-unit" name="unit"><option>Ainda não sei</option><option>Centro</option><option>Cidade Praiana</option></select></div></div>
      <label for="contact-message">Sua mensagem</label><textarea id="contact-message" name="message" rows="3" required minlength="2" maxlength="1500" placeholder="Como podemos ajudar?"></textarea>
      <div class="odontoflow-honeypot" aria-hidden="true"><label for="contact-company">Empresa</label><input id="contact-company" name="company" tabindex="-1" autocomplete="off"></div>
      <label class="odontoflow-consent"><input name="consent" type="checkbox" required> Autorizo a clínica a usar estes dados para retornar meu pedido de contato.</label>
      <button type="submit">Enviar pedido à equipe</button><p class="odontoflow-contact-result" role="status" aria-live="polite"></p>
    </form></div>`;
  if(location.pathname.startsWith('/odontopediatria-rio-das-ostras/'))section.querySelector('#contact-treatment').value='Odontopediatria';
  const footer=document.querySelector('footer');
  if(footer)footer.before(section);else document.body.append(section);
  const shortcut=document.createElement('a');
  shortcut.href='#contato';shortcut.className='odontoflow-contact-shortcut';shortcut.textContent='Solicitar contato';
  shortcut.setAttribute('aria-label','Abrir formulário de contato da clínica');
  document.body.append(shortcut);
  const form=section.querySelector('form'),result=section.querySelector('[role="status"]'),button=form.querySelector('button');
  let requestId=crypto.randomUUID(),pending=false,previousPayload='';
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(pending||!form.reportValidity())return;
    const fields=new FormData(form);
    const data={name:fields.get('name'),phone:fields.get('phone'),treatment:fields.get('treatment'),unit:fields.get('unit'),
      message:fields.get('message'),company:fields.get('company'),consent:fields.get('consent')==='on',
      page:location.pathname.slice(0,225)+
        (new URLSearchParams(location.search).get('utm_source')?.toLowerCase()==='tiktok'?'?utm_source=tiktok':'')};
    const payload=JSON.stringify(data);
    if(previousPayload&&previousPayload!==payload)requestId=crypto.randomUUID();
    previousPayload=payload;
    pending=true;button.disabled=true;button.textContent='Enviando…';result.textContent='';
    try{
      const response=await fetch('/api/odontoflow/contact',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...data,requestId})});
      const body=await response.json();
      if(!response.ok||body.received!==true)throw new Error(response.status===429?'limit':'failed');
      result.textContent='Pedido recebido! Nossa equipe retornará pelo telefone informado.';
      window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'contato_site_recebido',page:location.pathname});
      form.reset();requestId=crypto.randomUUID();previousPayload='';
    }catch(error){
      result.textContent=error.message==='limit'?'Você já enviou alguns pedidos. Aguarde antes de tentar novamente.':
        'Não foi possível enviar agora. Tente novamente ou use o WhatsApp da clínica.';
    }finally{pending=false;button.disabled=false;button.textContent='Enviar pedido à equipe';}
  });
})();
