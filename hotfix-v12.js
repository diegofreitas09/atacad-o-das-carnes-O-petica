/* Hotfix cliente: sincronização direta com O Peitica Gestão. */
(function(){
  const CART_KEY='opeitica:carrinho-v1';
  try{localStorage.removeItem(CART_KEY);sessionStorage.removeItem(CART_KEY);}catch(e){}

  function bool(v,def=true){
    if(v===null||v===undefined||v==='') return def;
    if(typeof v==='boolean') return v;
    return !['false','0','não','nao','inativo','off','indisponível','indisponivel'].includes(String(v).trim().toLowerCase());
  }
  function fortalezaDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function normalizeDay(v){if(!v)return'';const s=String(v).trim();const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);if(br)return`${br[3]}-${br[2]}-${br[1]}`;const d=new Date(s);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
  function inPromoPeriod(p){const today=fortalezaDay(),start=normalizeDay(p.promo_inicio||p.promocao_inicio||''),end=normalizeDay(p.promo_fim||p.promocao_fim||'');if(start&&today<start)return false;if(end&&today>end)return false;return true}
  function promoActive(p){
    const normal=Number(p.preco_original??p.preco??0)||0;
    const promo=Number(p.preco_promocional||0)||0;
    return bool(p.promocao,false) && promo>0 && normal>0 && promo<normal && inPromoPeriod(p);
  }
  function effectivePrice(p){return promoActive(p)?Number(p.preco_promocional):Number(p.preco_original??p.preco??0)}

  let promoCorePatched=false;
  function patchCorePromoCategory(){
    if(promoCorePatched||typeof window.buildTabs!=='function'||typeof window.renderProducts!=='function'||typeof state==='undefined')return;
    promoCorePatched=true;
    const originalBuildTabs=window.buildTabs;
    const originalRenderProducts=window.renderProducts;
    window.buildTabs=function(){
      const wantedPromo=state.category==='Promoções';
      if(wantedPromo)state.category='Todos';
      originalBuildTabs();
      if(wantedPromo)state.category='Promoções';
      ensurePromoCategoryButton();
    };
    window.renderProducts=function(){
      if(state.category!=='Promoções'){originalRenderProducts();return;}
      const saved=state.category;state.category='Todos';originalRenderProducts();state.category=saved;
      const promoNames=new Set((state.products||[]).filter(p=>p.promocao_ativa||promoActive(p)).map(p=>String(p.nome||'')));
      document.querySelectorAll('.product-card').forEach(card=>{const name=card.querySelector('h3')?.textContent||'';card.style.display=promoNames.has(name)?'':'none'});
      const grid=document.getElementById('productGrid');if(grid&&!promoNames.size)grid.innerHTML='<p class="empty">Nenhuma promoção ativa no momento.</p>';
      ensurePromoCategoryButton();setTimeout(decoratePromos,0);
    };
  }
  function ensurePromoCategoryButton(){
    const tabs=document.getElementById('categoryTabs');if(!tabs||typeof state==='undefined')return;
    const promos=(state.products||[]).filter(p=>p.promocao_ativa||promoActive(p));
    let btn=tabs.querySelector('[data-fixed-promo-tab="1"]');
    if(!promos.length){btn?.remove();if(state.category==='Promoções'){state.category='Todos';window.buildTabs?.();window.renderProducts?.()}return}
    if(!btn){btn=document.createElement('button');btn.type='button';btn.dataset.fixedPromoTab='1';btn.className='promo-category-tab';tabs.appendChild(btn)}
    btn.innerHTML=`🔥 Promoções <b>${promos.length}</b>`;
    btn.classList.toggle('active',state.category==='Promoções');
    btn.onclick=()=>{state.category='Promoções';window.buildTabs();window.renderProducts();if(typeof window.OPEITICA_PROMO_SYNC==='function')setTimeout(window.OPEITICA_PROMO_SYNC,20)};
    if(!document.getElementById('fixed-promo-tab-style')){const st=document.createElement('style');st.id='fixed-promo-tab-style';st.textContent='.promo-category-tab{background:linear-gradient(135deg,#ffcf4a,#ffad24)!important;color:#5f1900!important;border-color:#f0a800!important;font-weight:900!important;box-shadow:0 6px 18px rgba(218,137,0,.18)}.promo-category-tab.active{background:linear-gradient(135deg,#b71919,#d52c20)!important;color:#fff!important}.promo-category-tab b{display:inline-grid;place-items:center;min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:#fff;color:#a51414;font-size:11px;margin-left:3px}';document.head.appendChild(st)}
  }

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
        p.promo_inicio=raw.promo_inicio||raw.promocao_inicio||'';
        p.promo_fim=raw.promo_fim||raw.promocao_fim||'';
        p.promocao_ativa=promoActive(p);
        p.preco=effectivePrice(p);
        return p;
      });
      state.products=all.filter(p=>p.ativo);
      try{localStorage.setItem('opeitica:lastProducts',JSON.stringify(state.products));localStorage.setItem('opeitica:lastSync',new Date().toISOString());}catch(e){}
      patchCorePromoCategory();
      if(typeof syncCartPrices==='function')syncCartPrices();
      if(typeof window.buildTabs==='function')window.buildTabs();
      if(typeof window.renderProducts==='function')window.renderProducts();
      ensurePromoCategoryButton();
      setTimeout(decoratePromos,0);
      if(typeof window.OPEITICA_PROMO_SYNC==='function')setTimeout(window.OPEITICA_PROMO_SYNC,20);
      if(typeof setSync==='function')setSync('ok','Catálogo atualizado',new Date().toLocaleTimeString('pt-BR'));
    }catch(e){
      console.warn('[O Peitica Gestão → Cliente]',e);
      if(typeof setSync==='function')setSync('error','Catálogo disponível','Tentando sincronizar novamente');
    }
  }

  const ICONS={
    whatsapp:`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#25D366"/><path fill="#fff" d="M23.2 18.8c-.4-.2-2.3-1.1-2.7-1.2-.4-.1-.6-.2-.9.2-.3.4-1 1.2-1.2 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.5-.2-.4 0-.6.2-.8.2-.2.4-.4.6-.7.2-.2.3-.4.4-.6.1-.2.1-.5 0-.7-.1-.2-.9-2.1-1.2-2.9-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.4.4-1.4 1.4-1.4 3.4s1.5 4 1.7 4.3c.2.3 2.9 4.4 7 6.1 1 .4 1.8.7 2.4.9 1 .3 1.9.3 2.6.2.8-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.8-.1-.2-.4-.3-.8-.5z"/></svg>`,
    instagram:`<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="igG" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#FFD600"/><stop offset=".35" stop-color="#FF7A00"/><stop offset=".62" stop-color="#FF0169"/><stop offset="1" stop-color="#D300C5"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#igG)"/><circle cx="16" cy="16" r="6.3" fill="none" stroke="#fff" stroke-width="2.3"/><circle cx="23.5" cy="8.8" r="1.8" fill="#fff"/><rect x="6.8" y="6.8" width="18.4" height="18.4" rx="5.5" fill="none" stroke="#fff" stroke-width="2.1"/></svg>`,
    maps:`<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#34A853" d="M16 1.5A10.5 10.5 0 0 0 5.5 12c0 7.9 10.5 18.5 10.5 18.5S26.5 19.9 26.5 12A10.5 10.5 0 0 0 16 1.5z"/><path fill="#4285F4" d="M16 1.5A10.5 10.5 0 0 0 5.5 12c0 2.5 1.1 5.4 2.6 8.2L16 12V1.5z"/><path fill="#FBBC04" d="M16 12l-7.9 8.2c2.8 5 7.9 10.3 7.9 10.3V12z"/><path fill="#EA4335" d="M16 1.5V12h10.5A10.5 10.5 0 0 0 16 1.5z"/><circle cx="16" cy="12" r="4.2" fill="#fff"/></svg>`
  };
  function restoreOfficialIcons(){
    const wa=document.getElementById('whatsappTop');if(wa)wa.innerHTML=`<span class="brand-social-icon">${ICONS.whatsapp}</span><span>WhatsApp</span>`;
    const maps=document.getElementById('mapsLink');if(maps)maps.innerHTML=`<span class="brand-social-icon">${ICONS.maps}</span><span>Como chegar</span>`;
    const ig=document.getElementById('instagramLink');if(ig)ig.innerHTML=`<span class="brand-social-icon">${ICONS.instagram}</span><span>Instagram</span>`;
    if(!document.getElementById('official-icon-style')){const st=document.createElement('style');st.id='official-icon-style';st.textContent='.brand-social-icon{width:26px;height:26px;display:inline-grid;place-items:center;flex:0 0 26px}.brand-social-icon svg{display:block;width:26px;height:26px}.quick-link{display:flex!important;align-items:center;justify-content:center;gap:9px}';document.head.appendChild(st)}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    restoreOfficialIcons();
    patchCorePromoCategory();

    if(!document.querySelector('link[data-live-products]')){const l=document.createElement('link');l.rel='stylesheet';l.href='live-products.css?v=27';l.dataset.liveProducts='1';document.head.appendChild(l)}
    if(!document.querySelector('link[data-client-area]')){const l=document.createElement('link');l.rel='stylesheet';l.href='cliente-area.css?v=27';l.dataset.clientArea='1';document.head.appendChild(l)}
    if(!document.querySelector('script[data-client-area]')){const s=document.createElement('script');s.src='cliente-area.js?v=27';s.dataset.clientArea='1';document.body.appendChild(s)}
    if(!document.querySelector('link[data-promocoes]')){const l=document.createElement('link');l.rel='stylesheet';l.href='promocoes-v22.css?v=27';l.dataset.promocoes='1';document.head.appendChild(l)}
    if(!document.querySelector('script[data-promocoes]')){const s=document.createElement('script');s.src='promocoes-v22.js?v=27';s.dataset.promocoes='1';document.body.appendChild(s)}

    setTimeout(syncCatalog,250);
    setInterval(()=>{if(!document.hidden)syncCatalog()},3000);
    window.addEventListener('focus',syncCatalog);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCatalog()});
    const refresh=document.getElementById('refreshBtn');if(refresh)refresh.addEventListener('click',syncCatalog);
    window.OPEITICA_SYNC_NOW=syncCatalog;

    if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.update())).catch(()=>{});}
  });
})();