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
    if(!bool(p.promocao,false)||!Number(p.preco_promocional||0)) return false;
    const now=new Date();
    const a=p.promo_inicio?new Date(p.promo_inicio):null;
    const b=p.promo_fim?new Date(p.promo_fim):null;
    return (!a||isNaN(a)||now>=a)&&(!b||isNaN(b)||now<=b);
  }
  function decoratePromos(){
    document.querySelectorAll('.product-card').forEach(card=>{
      const name=card.querySelector('h3')?.textContent||'';
      const p=window.state?.products?.find?.(x=>x.nome===name)||state?.products?.find?.(x=>x.nome===name);
      if(!p||!p.promocao_ativa)return;
      card.classList.add('is-promo');
      const media=card.querySelector('.product-media');
      if(media&&!media.querySelector('.promo-live-badge')){
        const b=document.createElement('span');b.className='promo-live-badge';b.textContent='🔥 OFERTA DO DIA';media.appendChild(b);
      }
      const row=card.querySelector('.price-row'),price=card.querySelector('.price');
      if(row&&price&&!row.querySelector('.old-price')){
        const old=document.createElement('del');old.className='old-price';old.textContent=money(p.preco_original);row.insertBefore(old,price);
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
        p.preco=p.promocao_ativa?promo:normal;
        return p;
      });
      state.products=all.filter(p=>p.ativo);
      try{localStorage.setItem('opeitica:lastProducts',JSON.stringify(state.products));localStorage.setItem('opeitica:lastSync',new Date().toISOString());}catch(e){}
      if(typeof syncCartPrices==='function')syncCartPrices();
      if(typeof buildTabs==='function')buildTabs();
      if(typeof renderProducts==='function')renderProducts();
      decoratePromos();
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

    if(!document.querySelector('link[data-live-products]')){const l=document.createElement('link');l.rel='stylesheet';l.href='live-products.css?v=21';l.dataset.liveProducts='1';document.head.appendChild(l)}
    if(!document.querySelector('link[data-client-area]')){const l=document.createElement('link');l.rel='stylesheet';l.href='cliente-area.css?v=21';l.dataset.clientArea='1';document.head.appendChild(l)}
    if(!document.querySelector('script[data-client-area]')){const s=document.createElement('script');s.src='cliente-area.js?v=21';s.dataset.clientArea='1';document.body.appendChild(s)}

    setTimeout(syncCatalog,250);
    setInterval(()=>{if(!document.hidden)syncCatalog()},3000);
    window.addEventListener('focus',syncCatalog);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCatalog()});
    const refresh=document.getElementById('refreshBtn');if(refresh)refresh.addEventListener('click',syncCatalog);
    window.OPEITICA_SYNC_NOW=syncCatalog;

    if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.update())).catch(()=>{});}
  });
})();