/* Sincronização direta do catálogo com o Google Apps Script. */
(function(){
  const VERSION='20';
  function bool(v,def=true){
    if(v===null||v===undefined||v==='') return def;
    if(typeof v==='boolean') return v;
    return !['false','0','não','nao','inativo','off','indisponível','indisponivel'].includes(String(v).trim().toLowerCase());
  }
  function promoActive(p){
    if(!bool(p.promocao,false) || !Number(p.preco_promocional||0)) return false;
    const now=new Date();
    const a=p.promo_inicio?new Date(p.promo_inicio):null;
    const b=p.promo_fim?new Date(p.promo_fim):null;
    return (!a||isNaN(a)||now>=a) && (!b||isNaN(b)||now<=b);
  }
  function normalizeLive(p,i){
    const base=normalizeProduct(p,i);
    const normal=Number(p.preco??p.price??base.preco)||0;
    const promo=Number(p.preco_promocional??p.preco_promo??0)||0;
    base.ativo=bool(p.ativo,true);
    base.preco_original=normal;
    base.promocao=bool(p.promocao,false);
    base.preco_promocional=promo;
    base.promo_inicio=p.promo_inicio||'';
    base.promo_fim=p.promo_fim||'';
    base.promocao_ativa=promoActive(base);
    base.preco=base.promocao_ativa?promo:normal;
    return base;
  }
  async function pull(){
    const url=String((window.APP_CONFIG||{}).ORDER_WEBAPP_URL||'').trim();
    if(!url) return;
    try{
      const u=new URL(url);
      u.searchParams.set('action','products');
      u.searchParams.set('_t',Date.now());
      const r=await fetch(u.toString(),{cache:'no-store',headers:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'}});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const j=await r.json();
      if(!j.ok||!Array.isArray(j.products)) throw new Error(j.error||'Resposta inválida');
      const all=j.products.map(normalizeLive);
      const active=all.filter(p=>p.ativo);
      state.products=active;
      try{
        localStorage.setItem('opeitica:lastProducts',JSON.stringify(active));
        localStorage.setItem('opeitica:lastSync',new Date().toISOString());
      }catch(e){}
      if(typeof syncCartPrices==='function') syncCartPrices();
      if(typeof buildTabs==='function') buildTabs();
      if(typeof renderProducts==='function') renderProducts();
      document.querySelectorAll('.product-card').forEach(card=>{
        const name=card.querySelector('h3')?.textContent||'';
        const p=active.find(x=>x.nome===name);
        if(!p) return;
        card.classList.toggle('is-promo',!!p.promocao_ativa);
        const media=card.querySelector('.product-media');
        if(p.promocao_ativa&&media&&!media.querySelector('.promo-live-badge')){
          const b=document.createElement('span'); b.className='promo-live-badge'; b.textContent='🔥 OFERTA DO DIA'; media.appendChild(b);
        }
        if(p.promocao_ativa){
          const row=card.querySelector('.price-row'), price=card.querySelector('.price');
          if(row&&price&&!row.querySelector('.old-price')){
            const old=document.createElement('del'); old.className='old-price'; old.textContent=money(p.preco_original); row.insertBefore(old,price);
          }
        }
      });
      if(typeof setSync==='function') setSync('ok','Catálogo atualizado',`Agora • ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);
    }catch(e){
      console.warn('[O Peitica sync v'+VERSION+']',e);
      if(typeof setSync==='function') setSync('error','Catálogo disponível','Falha ao sincronizar; tentando novamente');
    }
  }
  function start(){
    pull();
    setInterval(()=>{if(!document.hidden)pull()},3000);
    window.addEventListener('focus',pull);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()});
    window.OPEITICA_SYNC_NOW=pull;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();