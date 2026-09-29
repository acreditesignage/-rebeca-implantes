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
