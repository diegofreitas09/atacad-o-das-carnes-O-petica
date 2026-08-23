/* Hotfix cliente: sincronização direta com O Peitica Gestão. */
(function(){
  const CART_KEY='opeitica:carrinho-v1';
  try{localStorage.removeItem(CART_KEY);sessionStorage.removeItem(CART_KEY);}catch(e){}

  function bool(v,def=true){
    if(v===null||v===undefined||v==='') return def;
    if(typeof v==='boolean') return v;
    return !['false','0','não','nao','inativo','off','indisponível','indisponivel'].includes(String(v).trim().toLowerCase());
  }
  function promoActive(p){
    const normal=Number(p.preco_original??p.preco??0)||0;
    const promo=Number(p.preco_promocional||0)||0;
    return bool(p.promocao,false) && promo>0 && normal>0 && promo<normal;
  }
  function effectivePrice(p){return promoActive(p)?Number(p.preco_promocional):Number(p.preco_original??p.preco??0)}
  function decoratePromos(){
    document.querySelectorAll('.product-card').forEach(card=>{
      const name=card.querySelector('h3')?.textContent||'';
      const source=(typeof state!=='undefined'&&state.products)||[];
      const p=source.find(x=>x.nome===name);
      if(!p)return;
      const finalPrice=effectivePrice(p);
      const row=card.querySelector('.price-row'),price=card.querySelector('.price');
      card.classList.toggle('is-promo',!!p.promocao_ativa);
      card.querySelectorAll('.promo-live-badge,.old-price').forEach(x=>x.remove());
      if(price)price.textContent=money(finalPrice);
      if(p.promocao_ativa){
        const media=card.querySelector('.product-media');
        if(media){const b=document.createElement('span');b.className='promo-live-badge';b.textContent='🔥 OFERTA DO DIA';media.appendChild(b)}
        if(row&&price){const old=document.createElement('del');old.className='old-price';old.textContent=money(p.preco_original);row.insertBefore(old,price)}
      }
      const calc=card.querySelector('.live-calc strong');
      if(calc){
        const active=card.querySelector('[data-weight].active');
        const custom=card.querySelector('.custom-weight');
        let grams=active?Number(active.dataset.weight):Number(custom?.value||1000);
        if(!grams||grams<=0)grams=1000;
        calc.textContent=money(p.unidade==='kit'?finalPrice:finalPrice*(grams/1000));
      }
    });
  }
  async function syncCatalog(){
    const cfg=window.APP_CONFIG||{};
    const endpoint=String(cfg.ORDER_WEBAPP_URL||'').trim();
    if(!endpoint||typeof state==='undefined'||typeof normalizeProduct!=='function')return;
    try{
      const u=new URL(endpoint);u.searchParams.set('action','products');u.searchParams.set('_t',Date.now());
      const r=await fetch(u.toString(),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const j=await r.json();
      if(!j.ok||!Array.isArray(j.products))throw new Error(j.error||'Resposta inválida');
      const all=j.products.map((raw,i)=>{
        const p=normalizeProduct(raw,i);
        const normal=Number(raw.preco??raw.price??p.preco)||0;
        const promo=Number(raw.preco_promocional??raw.preco_promo??0)||0;
        p.ativo=bool(raw.ativo,true);
        p.preco_original=normal;
        p.promocao=bool(raw.promocao,false);
        p.preco_promocional=promo;
        p.promo_inicio=raw.promo_inicio||'';
        p.promo_fim=raw.promo_fim||'';
        p.promocao_ativa=promoActive(p);
        p.preco=effectivePrice(p);
        return p;
      });
      state.products=all.filter(p=>p.ativo);
      try{localStorage.setItem('opeitica:lastProducts',JSON.stringify(state.products));localStorage.setItem('opeitica:lastSync',new Date().toISOString());}catch(e){}
      if(typeof syncCartPrices==='function')syncCartPrices();
      if(typeof buildTabs==='function')buildTabs();
      if(typeof renderProducts==='function')renderProducts();
      setTimeout(decoratePromos,0);
      if(typeof setSync==='function')setSync('ok','Catálogo atualizado',new Date().toLocaleTimeString('pt-BR'));
    }catch(e){
      console.warn('[O Peitica Gestão → Cliente]',e);
      if(typeof setSync==='function')setSync('error','Catálogo disponível','Tentando sincronizar novamente');
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const wa=document.getElementById('whatsappTop');if(wa)wa.innerHTML='<span>🟢</span><span>WhatsApp</span>';
    const maps=document.getElementById('mapsLink');if(maps)maps.innerHTML='<span>📍</span><span>Como chegar</span>';
    const ig=document.getElementById('instagramLink');if(ig)ig.innerHTML='<span>📷</span><span>Instagram</span>';

    if(!document.querySelector('link[data-live-products]')){const l=document.createElement('link');l.rel='stylesheet';l.href='live-products.css?v=24';l.dataset.liveProducts='1';document.head.appendChild(l)}
    if(!document.querySelector('link[data-client-area]')){const l=document.createElement('link');l.rel='stylesheet';l.href='cliente-area.css?v=24';l.dataset.clientArea='1';document.head.appendChild(l)}
    if(!document.querySelector('script[data-client-area]')){const s=document.createElement('script');s.src='cliente-area.js?v=24';s.dataset.clientArea='1';document.body.appendChild(s)}
    if(!document.querySelector('link[data-promocoes]')){const l=document.createElement('link');l.rel='stylesheet';l.href='promocoes-v22.css?v=24';l.dataset.promocoes='1';document.head.appendChild(l)}
    if(!document.querySelector('script[data-promocoes]')){const s=document.createElement('script');s.src='promocoes-v22.js?v=24';s.dataset.promocoes='1';document.body.appendChild(s)}

    setTimeout(syncCatalog,250);
    setInterval(()=>{if(!document.hidden)syncCatalog()},3000);
    window.addEventListener('focus',syncCatalog);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCatalog()});
    const refresh=document.getElementById('refreshBtn');if(refresh)refresh.addEventListener('click',syncCatalog);
    window.OPEITICA_SYNC_NOW=syncCatalog;

    if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.update())).catch(()=>{});}
  });
})();